const LeaveRequest = require('../models/LeaveRequest');
const Attendance = require('../models/Attendance');
const AttendanceSession = require('../models/AttendanceSession');
const AttendanceRegularization = require('../models/AttendanceRegularization');
const Employee = require('../models/Employee');
const AuditLog = require('../models/AuditLog');
const {
  HttpError,
  getAttendancePolicy,
  isFirstPunchLate,
  recalculateAttendanceSummary,
  resolveAuthorizedEmployees,
} = require('../utils/attendanceHelper');
const { resolveManagerContext, isTargetEmployeeInManagerScope } = require('../utils/orgHelper');

// Helper: get team employee IDs for manager
const getTeamIds = async (user) => {
  if (user.role === 'manager') {
    const ctx = await resolveManagerContext(user);
    return (ctx.teamEmployees || [])
      .filter((e) => e.status === 'Active')
      .map((e) => e._id);
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
      const targetEmp = leave.employee;
      const inScope = targetEmp ? await isTargetEmployeeInManagerScope(req.user, targetEmp) : false;
      if (!inScope) {
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

    // Verify manager scope via shared RBAC helper
    await resolveAuthorizedEmployees(req.user, { employeeId: request.employee });

    if (request.status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'Request has already been processed' });
    }

    const targetAtt = await Attendance.findOne({ employee: request.employee, date: request.date });
    if (status === 'Approved' && targetAtt?.isFinalized && req.user.role === 'manager') {
      return res.status(403).json({
        success: false,
        message: 'This day has been finalized by HR/Admin and cannot be modified by a Manager.',
      });
    }

    request.status = status;
    request.remarks = remarks || '';
    request.approvedBy = req.user._id;
    await request.save();

    if (status === 'Approved') {
      const policy = await getAttendancePolicy();
      let attendance = targetAtt;
      if (!attendance) {
        attendance = await Attendance.create({
          employee: request.employee,
          date: request.date,
          clockIn: request.clockIn,
          clockOut: request.clockOut,
          status: isFirstPunchLate(request.clockIn, request.date, policy) ? 'Late' : 'Present',
          dailyStatus: 'Between Sessions',
        });
      }

      const diffMs = Math.max(0, new Date(request.clockOut) - new Date(request.clockIn));
      const durationMinutes = Math.round((diffMs / 60000) * 100) / 100;
      const durationHours = Math.round((diffMs / 3600000) * 100) / 100;

      let targetSession = null;
      if (request.session) {
        targetSession = await AttendanceSession.findById(request.session);
      } else if (request.sessionNumber) {
        targetSession = await AttendanceSession.findOne({
          attendance: attendance._id,
          sessionNumber: request.sessionNumber,
        });
      } else {
        targetSession = await AttendanceSession.findOne({
          attendance: attendance._id,
          clockOutTime: null,
        }).sort({ sessionNumber: 1 });
        if (!targetSession && request.requestType !== 'AddSession') {
          const count = await AttendanceSession.countDocuments({ attendance: attendance._id });
          if (count === 1) {
            targetSession = await AttendanceSession.findOne({ attendance: attendance._id });
          }
        }
      }

      if (targetSession) {
        targetSession.clockInTime = request.clockIn;
        targetSession.clockOutTime = request.clockOut;
        targetSession.durationMinutes = durationMinutes;
        targetSession.durationHours = durationHours;
        targetSession.status = 'Adjusted';
        targetSession.isManual = true;
        targetSession.adjustedBy = req.user._id;
        targetSession.notes = remarks || request.reason;
        await targetSession.save();
      } else {
        const lastSess = await AttendanceSession.findOne({ attendance: attendance._id }).sort({
          sessionNumber: -1,
        });
        const nextNum = lastSess ? lastSess.sessionNumber + 1 : 1;
        await AttendanceSession.create({
          employee: request.employee,
          attendance: attendance._id,
          attendanceDate: request.date,
          sessionNumber: nextNum,
          clockInTime: request.clockIn,
          clockOutTime: request.clockOut,
          durationMinutes,
          durationHours,
          workMode: attendance.workMode || 'Office',
          status: 'Adjusted',
          isManual: true,
          adjustedBy: req.user._id,
          notes: remarks || request.reason,
        });
      }

      attendance.lastModifiedBy = req.user._id;
      await attendance.save();
      await recalculateAttendanceSummary(attendance._id, policy);
    }

    await AuditLog.create({ action: 'UPDATE_ATTENDANCE', entity: 'Attendance', entityId: targetAtt?._id || null, performedBy: req.user._id, details: `${status} regularization request for employee on ${new Date(request.date).toLocaleDateString()}` });

    res.status(200).json({ success: true, message: `Regularization ${status.toLowerCase()}`, request });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

module.exports = { getPendingApprovals, approveLeave, approveCorrection };
