const LeaveRequest = require('../models/LeaveRequest');
const Attendance = require('../models/Attendance');
const AttendanceRegularization = require('../models/AttendanceRegularization');
const Employee = require('../models/Employee');
const AuditLog = require('../models/AuditLog');

// Helper: get team employee IDs for manager
const getTeamIds = async (user) => {
  if (user.role === 'manager') {
    const mgrEmp = await Employee.findOne({ email: user.email });
    if (!mgrEmp) return [];
    const teamEmployees = await Employee.find({ department: mgrEmp.department, status: 'Active' }).select('_id');
    return teamEmployees.map(e => e._id);
  }
  // Admin / HR: all employees
  const allEmployees = await Employee.find({ status: 'Active' }).select('_id');
  return allEmployees.map(e => e._id);
};

// @desc    Get all pending approvals grouped by type
// @route   GET /api/manager/approvals
// @access  Private (Manager, HR, Admin)
const getPendingApprovals = async (req, res, next) => {
  try {
    const teamIds = await getTeamIds(req.user);
    if (!teamIds.length) {
      return res.status(200).json({ success: true, leaves: [], wfhRequests: [], overtimeRequests: [], attendanceCorrections: [] });
    }

    const employeeFilter = { $in: teamIds };

    // 1. Pending leave requests
    const leaves = await LeaveRequest.find({ employee: employeeFilter, status: 'Pending' })
      .populate('employee', 'firstName lastName employeeId designation profileImage')
      .sort({ appliedDate: -1 });

    // 2. WFH "requests" = attendance records with workMode WFH that were submitted today
    //    (simplified: show last 7 days WFH attendance logs)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const wfhRequests = await Attendance.find({
      employee: employeeFilter,
      workMode: 'WFH',
      date: { $gte: sevenDaysAgo },
    })
      .populate('employee', 'firstName lastName employeeId designation profileImage')
      .sort({ date: -1 });

    // 3. Overtime requests = attendance records where overtimeHours > 0
    const overtimeRequests = await Attendance.find({
      employee: employeeFilter,
      overtimeHours: { $gt: 0 },
      date: { $gte: sevenDaysAgo },
    })
      .populate('employee', 'firstName lastName employeeId designation profileImage')
      .sort({ date: -1 });

    // 4. Attendance correction requests (regularizations)
    const attendanceCorrections = await AttendanceRegularization.find({
      employee: employeeFilter,
      status: 'Pending',
    })
      .populate('employee', 'firstName lastName employeeId designation profileImage')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      leaves,
      wfhRequests,
      overtimeRequests,
      attendanceCorrections,
      stats: {
        pendingLeaves: leaves.length,
        wfhCount: wfhRequests.length,
        overtimeCount: overtimeRequests.length,
        pendingCorrections: attendanceCorrections.length,
        total: leaves.length + attendanceCorrections.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Quick approve/reject a leave from the approval center
// @route   PUT /api/manager/approvals/leave/:id
// @access  Private (Manager, HR, Admin)
const approveLeave = async (req, res, next) => {
  try {
    const { status, comments } = req.body;
    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be Approved or Rejected' });
    }

    const leave = await LeaveRequest.findById(req.params.id).populate('employee');
    if (!leave) return res.status(404).json({ success: false, message: 'Leave request not found' });

    if (req.user.role === 'manager') {
      const mgrEmp = await Employee.findOne({ email: req.user.email });
      const targetEmp = leave.employee;
      if (!mgrEmp || !targetEmp || mgrEmp.department.toString() !== targetEmp.department.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }
    }

    leave.status = status;
    leave.approvedBy = req.user._id;
    leave.comments = comments || '';
    await leave.save();

    res.status(200).json({ success: true, message: `Leave ${status.toLowerCase()} successfully`, leave });
  } catch (error) {
    next(error);
  }
};

// @desc    Quick approve/reject an attendance correction
// @route   PUT /api/manager/approvals/correction/:id
// @access  Private (Manager, HR, Admin)
const approveCorrection = async (req, res, next) => {
  try {
    const { status, remarks } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be Approved or Rejected' });
    }

    const request = await AttendanceRegularization.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Regularization request not found' });

    if (req.user.role === 'manager') {
      const mgrEmp = await Employee.findOne({ email: req.user.email });
      const targetEmp = await Employee.findById(request.employee);
      if (!mgrEmp || !targetEmp || mgrEmp.department.toString() !== targetEmp.department.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to process regularization outside your department' });
      }
    }

    if (request.status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'Request has already been processed' });
    }

    request.status = status;
    request.remarks = remarks || '';
    request.approvedBy = req.user._id;
    await request.save();

    if (status === 'Approved') {
      const diffMs = new Date(request.clockOut) - new Date(request.clockIn);
      const totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
      const inTime = new Date(request.clockIn);
      const limitTime = new Date(request.clockIn);
      limitTime.setHours(9, 30, 0, 0);
      const attendanceStatus = inTime > limitTime ? 'Late' : 'Present';
      const overtimeHours = totalHours > 8.0 ? Math.round((totalHours - 8.0) * 100) / 100 : 0;

      let attendance = await Attendance.findOne({ employee: request.employee, date: request.date });
      if (!attendance) {
        await Attendance.create({ employee: request.employee, date: request.date, clockIn: request.clockIn, clockOut: request.clockOut, totalHours, overtimeHours, status: attendanceStatus });
      } else {
        attendance.clockIn = request.clockIn; attendance.clockOut = request.clockOut;
        attendance.totalHours = totalHours; attendance.overtimeHours = overtimeHours;
        attendance.status = attendanceStatus;
        await attendance.save();
      }
    }

    await AuditLog.create({ action: 'UPDATE_ATTENDANCE', entity: 'Attendance', performedBy: req.user._id, details: `${status} regularization request for employee on ${new Date(request.date).toLocaleDateString()}` });

    res.status(200).json({ success: true, message: `Regularization ${status.toLowerCase()}`, request });
  } catch (error) {
    next(error);
  }
};

module.exports = { getPendingApprovals, approveLeave, approveCorrection };
