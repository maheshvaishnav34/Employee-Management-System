const LeaveRequest = require('../models/LeaveRequest');
const Employee = require('../models/Employee');

// Helper to calculate total days between two dates inclusive
const calculateDays = (start, end) => {
  const diffMs = new Date(end) - new Date(start);
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;
};

// Default leave limits per calendar year
const LEAVE_LIMITS = {
  Sick: 10,
  Casual: 12,
  Maternity: 30,
  Paternity: 15,
  Unpaid: 99, // practically unlimited unpaid leaves
};

// @desc    Apply for leave
// @route   POST /api/leaves/apply
// @access  Private (Employee, HR, Admin)
const applyLeave = async (req, res, next) => {
  try {
    if (!req.user.employee) {
      return res.status(400).json({ success: false, message: 'Only accounts linked to an employee profile can apply for leaves' });
    }

    const { leaveType, startDate, endDate, reason } = req.body;

    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      return res.status(400).json({ success: false, message: 'Start date cannot be after end date' });
    }

    const days = calculateDays(start, end);

    // Dynamic balance validation
    const employeeId = req.user.employee;
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31);

    // Sum up approved leave days for this type in the current year
    const approvedLeaves = await LeaveRequest.find({
      employee: employeeId,
      leaveType,
      status: 'Approved',
      startDate: { $gte: startOfYear, $lte: endOfYear },
    });

    let usedDays = 0;
    approvedLeaves.forEach((leave) => {
      usedDays += calculateDays(leave.startDate, leave.endDate);
    });

    const limit = LEAVE_LIMITS[leaveType] || 0;
    const balance = limit - usedDays;

    if (leaveType !== 'Unpaid' && days > balance) {
      return res.status(400).json({
        success: false,
        message: `Insufficient leave balance. Requested: ${days} days, Available Balance: ${balance} days.`,
      });
    }

    const leaveRequest = await LeaveRequest.create({
      employee: employeeId,
      leaveType,
      startDate: start,
      endDate: end,
      reason,
      status: 'Pending',
    });

    res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully',
      leaveRequest,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged in user's leave requests
// @route   GET /api/leaves/my-leaves
// @access  Private
const getMyLeaves = async (req, res, next) => {
  try {
    if (!req.user.employee) {
      return res.status(200).json({ success: true, count: 0, leaves: [] });
    }

    const leaves = await LeaveRequest.find({ employee: req.user.employee }).sort({ appliedDate: -1 });

    res.status(200).json({
      success: true,
      count: leaves.length,
      leaves,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all leave requests
// @route   GET /api/leaves
// @access  Private (Admin & HR)
const getAllLeaves = async (req, res, next) => {
  try {
    const { status } = req.query;
    let query = {};

    if (status) {
      query.status = status;
    }

    // Department restrictions for managers
    if (req.user.role === 'manager') {
      const mgrEmp = await Employee.findOne({ email: req.user.email });
      if (!mgrEmp) {
        return res.status(200).json({ success: true, count: 0, leaves: [] });
      }
      const teamEmployees = await Employee.find({ department: mgrEmp.department }).select('_id');
      const teamEmployeeIds = teamEmployees.map(e => e._id);
      query.employee = { $in: teamEmployeeIds };
    }

    const leaves = await LeaveRequest.find(query)
      .populate('employee', 'firstName lastName employeeId designation')
      .sort({ appliedDate: -1 });

    res.status(200).json({
      success: true,
      count: leaves.length,
      leaves,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve or Reject leave request
// @route   PUT /api/leaves/:id/status
// @access  Private (Admin & HR)
const updateLeaveStatus = async (req, res, next) => {
  try {
    const { status, comments } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Must be Approved or Rejected' });
    }

    const leaveRequest = await LeaveRequest.findById(req.params.id);

    if (!leaveRequest) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    // Department restrictions for managers
    if (req.user.role === 'manager') {
      const mgrEmp = await Employee.findOne({ email: req.user.email });
      const targetEmp = await Employee.findById(leaveRequest.employee);
      if (!mgrEmp || !targetEmp || mgrEmp.department.toString() !== targetEmp.department.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to update leave request outside your department' });
      }
    }

    if (leaveRequest.status !== 'Pending') {
      return res.status(400).json({ success: false, message: `Leave request has already been ${leaveRequest.status.toLowerCase()}` });
    }

    leaveRequest.status = status;
    leaveRequest.approvedBy = req.user._id;
    if (comments !== undefined) {
      leaveRequest.comments = comments;
    }
    await leaveRequest.save();

    res.status(200).json({
      success: true,
      message: `Leave request status updated to ${status}`,
      leaveRequest,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get leave balance stats
// @route   GET /api/leaves/balances
// @access  Private
const getLeaveBalances = async (req, res, next) => {
  try {
    // If admin is viewing profile of specific employee, get ID from query
    const targetEmployeeId = req.query.employeeId || req.user.employee;

    if (!targetEmployeeId) {
      return res.status(400).json({ success: false, message: 'No employee record linked' });
    }

    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31);

    // Find all approved leave requests for the target employee in current year
    const approvedLeaves = await LeaveRequest.find({
      employee: targetEmployeeId,
      status: 'Approved',
      startDate: { $gte: startOfYear, $lte: endOfYear },
    });

    // Initialize statistics
    const balances = {};
    Object.keys(LEAVE_LIMITS).forEach((type) => {
      balances[type] = {
        limit: LEAVE_LIMITS[type],
        used: 0,
        balance: LEAVE_LIMITS[type],
      };
    });

    // Compute used days
    approvedLeaves.forEach((leave) => {
      const type = leave.leaveType;
      const days = calculateDays(leave.startDate, leave.endDate);
      if (balances[type]) {
        balances[type].used += days;
        if (type !== 'Unpaid') {
          balances[type].balance = balances[type].limit - balances[type].used;
        }
      }
    });

    res.status(200).json({
      success: true,
      balances,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  applyLeave,
  getMyLeaves,
  getAllLeaves,
  updateLeaveStatus,
  getLeaveBalances,
};
