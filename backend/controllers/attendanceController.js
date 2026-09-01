const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const AttendanceRegularization = require('../models/AttendanceRegularization');
const AuditLog = require('../models/AuditLog');


// Helper to get local date at midnight (to group attendance per day)
const getMidnightDate = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

// @desc    Clock in
// @route   POST /api/attendance/clockin
// @access  Private (Employee, HR, Admin)
const clockIn = async (req, res, next) => {
  try {
    if (!req.user.employee) {
      return res.status(400).json({ success: false, message: 'Only accounts linked to an employee profile can clock in' });
    }

    const employeeId = req.user.employee;
    const todayMidnight = getMidnightDate();

    // Check if already clocked in today
    const existingRecord = await Attendance.findOne({
      employee: employeeId,
      date: todayMidnight,
    });

    if (existingRecord) {
      return res.status(400).json({ success: false, message: 'You have already clocked in for today' });
    }

    const now = new Date();
    // Auto-detect if Late: office start is 09:30 AM local time
    const officeStartTime = new Date();
    officeStartTime.setHours(9, 30, 0, 0);

    let status = 'Present';
    if (now > officeStartTime) {
      status = 'Late';
    }

    const { workMode } = req.body;

    const attendance = await Attendance.create({
      employee: employeeId,
      date: todayMidnight,
      clockIn: now,
      status,
      workMode: workMode || 'Office',
    });


    res.status(201).json({
      success: true,
      message: `Clocked in successfully at ${now.toLocaleTimeString()}. Status: ${status}`,
      attendance,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Clock out
// @route   POST /api/attendance/clockout
// @access  Private (Employee, HR, Admin)
const clockOut = async (req, res, next) => {
  try {
    if (!req.user.employee) {
      return res.status(400).json({ success: false, message: 'Only accounts linked to an employee profile can clock out' });
    }

    const employeeId = req.user.employee;
    const todayMidnight = getMidnightDate();

    // Find attendance record for today
    const attendance = await Attendance.findOne({
      employee: employeeId,
      date: todayMidnight,
      clockOut: null, // Only clock out if not clocked out already
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'No active clock-in session found for today. You might have already clocked out or did not clock in.',
      });
    }

    const now = new Date();
    attendance.clockOut = now;

    // Calculate total hours
    const diffMs = now - attendance.clockIn;
    const diffHours = diffMs / (1000 * 60 * 60);
    const totalHours = Math.round(diffHours * 100) / 100; // round to 2 decimals
    attendance.totalHours = totalHours;

    // Calculate overtime (anything beyond standard 8.0 hours)
    if (totalHours > 8.0) {
      attendance.overtimeHours = Math.round((totalHours - 8.0) * 100) / 100;
    } else {
      attendance.overtimeHours = 0;
    }


    await attendance.save();

    res.status(200).json({
      success: true,
      message: `Clocked out successfully at ${now.toLocaleTimeString()}. Total working hours: ${attendance.totalHours} hrs`,
      attendance,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get clock status for today
// @route   GET /api/attendance/today-status
// @access  Private
const getTodayStatus = async (req, res, next) => {
  try {
    if (!req.user.employee) {
      return res.status(200).json({
        success: true,
        clockedIn: false,
        clockedOut: false,
        record: null,
      });
    }

    const employeeId = req.user.employee;
    const todayMidnight = getMidnightDate();

    const record = await Attendance.findOne({
      employee: employeeId,
      date: todayMidnight,
    });

    res.status(200).json({
      success: true,
      clockedIn: !!record,
      clockedOut: record ? !!record.clockOut : false,
      record,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged in user's attendance history
// @route   GET /api/attendance/my-logs
// @access  Private
const getMyAttendanceLogs = async (req, res, next) => {
  try {
    if (!req.user.employee) {
      return res.status(200).json({ success: true, count: 0, logs: [] });
    }

    const logs = await Attendance.find({ employee: req.user.employee }).sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all employees attendance history
// @route   GET /api/attendance/logs
// @access  Private (Admin & HR)
const getAllAttendanceLogs = async (req, res, next) => {
  try {
    const { date, department, employeeId } = req.query;
    let query = {};

    if (date) {
      query.date = getMidnightDate(new Date(date));
    }

    // If searching by employeeId or department, we first fetch employee matches
    let employeeQuery = {};
    let filterByEmployee = false;

    if (req.user.role === 'manager') {
      const mgrEmp = await Employee.findOne({ email: req.user.email });
      if (!mgrEmp) {
        return res.status(200).json({ success: true, count: 0, logs: [] });
      }
      employeeQuery.department = mgrEmp.department;
      filterByEmployee = true;
      if (employeeId) {
        employeeQuery._id = employeeId;
      }
    } else {
      if (employeeId) {
        employeeQuery._id = employeeId;
        filterByEmployee = true;
      }
      if (department) {
        employeeQuery.department = department;
        filterByEmployee = true;
      }
    }

    if (filterByEmployee) {
      const employees = await Employee.find(employeeQuery).select('_id');
      const employeeIds = employees.map((emp) => emp._id);
      query.employee = { $in: employeeIds };
    }

    const logs = await Attendance.find(query)
      .populate({
        path: 'employee',
        select: 'firstName lastName employeeId designation',
        populate: { path: 'department', select: 'name' },
      })
      .sort({ date: -1, clockIn: -1 });

    res.status(200).json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    next(error);
  }
};


// @desc    Submit attendance regularization request
// @route   POST /api/attendance/regularize
// @access  Private (Employee)
const requestRegularization = async (req, res, next) => {
  try {
    if (!req.user.employee) {
      return res.status(400).json({ success: false, message: 'Only accounts linked to an employee profile can request regularization' });
    }

    const { date, clockIn, clockOut, reason } = req.body;

    if (!date || !clockIn || !clockOut || !reason) {
      return res.status(400).json({ success: false, message: 'Please provide all fields (date, clockIn, clockOut, reason)' });
    }

    const targetDate = getMidnightDate(new Date(date));
    const employeeId = req.user.employee;

    // Check if duplicate request exists
    const existingRequest = await AttendanceRegularization.findOne({
      employee: employeeId,
      date: targetDate,
    });

    if (existingRequest) {
      return res.status(400).json({ success: false, message: 'Regularization request already submitted for this date' });
    }

    const regularization = await AttendanceRegularization.create({
      employee: employeeId,
      date: targetDate,
      clockIn: new Date(clockIn),
      clockOut: new Date(clockOut),
      reason,
    });

    res.status(201).json({
      success: true,
      message: 'Regularization request submitted successfully',
      regularization,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current employee's regularization requests
// @route   GET /api/attendance/regularize/my
// @access  Private (Employee)
const getMyRegularizations = async (req, res, next) => {
  try {
    if (!req.user.employee) {
      return res.status(200).json({ success: true, count: 0, regularizations: [] });
    }

    const regularizations = await AttendanceRegularization.find({ employee: req.user.employee })
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: regularizations.length,
      regularizations,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all regularization requests
// @route   GET /api/attendance/regularize/all
// @access  Private (Admin & HR)
const getAllRegularizations = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === 'manager') {
      const mgrEmp = await Employee.findOne({ email: req.user.email });
      if (!mgrEmp) {
        return res.status(200).json({ success: true, count: 0, regularizations: [] });
      }
      const teamEmployees = await Employee.find({ department: mgrEmp.department }).select('_id');
      const teamEmployeeIds = teamEmployees.map(e => e._id);
      query.employee = { $in: teamEmployeeIds };
    }

    const regularizations = await AttendanceRegularization.find(query)
      .populate({
        path: 'employee',
        select: 'firstName lastName employeeId designation',
        populate: { path: 'department', select: 'name' },
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: regularizations.length,
      regularizations,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve or reject regularization request
// @route   PUT /api/attendance/regularize/:id
// @access  Private (Admin & HR)
const processRegularization = async (req, res, next) => {
  try {
    const { status, remarks } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Must be Approved or Rejected' });
    }

    const request = await AttendanceRegularization.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Regularization request not found' });
    }

    // Department restrictions for managers
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
      // Find or create attendance record for this date
      let attendance = await Attendance.findOne({
        employee: request.employee,
        date: request.date,
      });

      // Calculate working hours
      const diffMs = new Date(request.clockOut) - new Date(request.clockIn);
      const totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;

      // Determine late status: standard is 09:30 AM
      const inTime = new Date(request.clockIn);
      const limitTime = new Date(request.clockIn);
      limitTime.setHours(9, 30, 0, 0);
      const attendanceStatus = inTime > limitTime ? 'Late' : 'Present';

      const overtimeHours = totalHours > 8.0 ? Math.round((totalHours - 8.0) * 100) / 100 : 0;

      if (!attendance) {
        // Create fresh attendance record
        attendance = await Attendance.create({
          employee: request.employee,
          date: request.date,
          clockIn: request.clockIn,
          clockOut: request.clockOut,
          totalHours,
          overtimeHours,
          status: attendanceStatus,
        });
      } else {
        // Update existing attendance record
        attendance.clockIn = request.clockIn;
        attendance.clockOut = request.clockOut;
        attendance.totalHours = totalHours;
        attendance.overtimeHours = overtimeHours;
        attendance.status = attendanceStatus;
        await attendance.save();
      }
    }

    await AuditLog.create({
      action: 'UPDATE_ATTENDANCE',
      entity: 'Attendance',
      performedBy: req.user._id,
      details: `${status} regularization request for employee on date ${new Date(request.date).toLocaleDateString()}`,
    });

    res.status(200).json({
      success: true,
      message: `Regularization request successfully ${status.toLowerCase()}`,
      request,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  clockIn,
  clockOut,
  getTodayStatus,
  getMyAttendanceLogs,
  getAllAttendanceLogs,
  requestRegularization,
  getMyRegularizations,
  getAllRegularizations,
  processRegularization,
};

