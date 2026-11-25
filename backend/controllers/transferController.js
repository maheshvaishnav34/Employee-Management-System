const TransferRequest = require('../models/TransferRequest');
const Employee = require('../models/Employee');
const Department = require('../models/Department');
const { resolveManagerContext, isTargetEmployeeInManagerScope } = require('../utils/orgHelper');

// @desc    Create a transfer request (manager recommends)
// @route   POST /api/transfers
// @access  Private (Manager, HR, Admin)
const createTransferRequest = async (req, res, next) => {
  try {
    const { employeeId, toDepartmentId, reason, effectiveDate } = req.body;

    if (!employeeId || !toDepartmentId || !reason) {
      return res.status(400).json({ success: false, message: 'Employee, target department, and reason are required' });
    }

    const employee = await Employee.findById(employeeId).populate('department');
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    const toDept = await Department.findById(toDepartmentId);
    if (!toDept) return res.status(404).json({ success: false, message: 'Target department not found' });

    if (employee.department._id.toString() === toDepartmentId) {
      return res.status(400).json({ success: false, message: 'Employee is already in the target department' });
    }

    // Manager can only transfer their team members
    if (req.user.role === 'manager') {
      const inScope = await isTargetEmployeeInManagerScope(req.user, employee);
      if (!inScope) {
        return res.status(403).json({ success: false, message: 'Not authorized to transfer employees outside your department' });
      }
    }

    const transfer = await TransferRequest.create({
      employee: employeeId,
      fromDepartment: employee.department._id,
      toDepartment: toDepartmentId,
      reason,
      effectiveDate: effectiveDate || null,
      recommendedBy: req.user._id,
    });

    const populated = await TransferRequest.findById(transfer._id)
      .populate('employee', 'firstName lastName employeeId designation')
      .populate('fromDepartment', 'name')
      .populate('toDepartment', 'name')
      .populate('recommendedBy', 'username email');

    res.status(201).json({ success: true, message: 'Transfer request submitted successfully', transfer: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all transfer requests
// @route   GET /api/transfers
// @access  Private (Manager, HR, Admin)
const getAllTransfers = async (req, res, next) => {
  try {
    let query = {};

    if (req.user.role === 'manager') {
      const ctx = await resolveManagerContext(req.user);
      if (!ctx.mgrEmp || ctx.employeeIds.length === 0) {
        return res.status(200).json({ success: true, count: 0, transfers: [] });
      }
      query.employee = { $in: ctx.employeeIds };
    }

    const transfers = await TransferRequest.find(query)
      .populate('employee', 'firstName lastName employeeId designation profileImage')
      .populate('fromDepartment', 'name')
      .populate('toDepartment', 'name')
      .populate('recommendedBy', 'username email')
      .populate('approvedBy', 'username email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: transfers.length, transfers });
  } catch (error) {
    next(error);
  }
};

// @desc    Update transfer request status (approve/reject)
// @route   PUT /api/transfers/:id/status
// @access  Private (Admin, HR)
const updateTransferStatus = async (req, res, next) => {
  try {
    const { status, comments } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be Approved or Rejected' });
    }

    const transfer = await TransferRequest.findById(req.params.id).populate('employee');
    if (!transfer) return res.status(404).json({ success: false, message: 'Transfer request not found' });

    if (transfer.status !== 'Pending') {
      return res.status(400).json({ success: false, message: `Transfer has already been ${transfer.status.toLowerCase()}` });
    }

    transfer.status = status;
    transfer.approvedBy = req.user._id;
    transfer.comments = comments || '';
    await transfer.save();

    // If approved, update employee's department and clear old department head slot if they led it
    if (status === 'Approved') {
      await Employee.findByIdAndUpdate(transfer.employee._id, { department: transfer.toDepartment });
      await Department.updateMany(
        { manager: transfer.employee._id, _id: { $ne: transfer.toDepartment } },
        { manager: null }
      );
    }

    const populated = await TransferRequest.findById(transfer._id)
      .populate('employee', 'firstName lastName employeeId designation')
      .populate('fromDepartment', 'name')
      .populate('toDepartment', 'name');

    res.status(200).json({ success: true, message: `Transfer request ${status.toLowerCase()}`, transfer: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single transfer request
// @route   GET /api/transfers/:id
// @access  Private
const getTransferById = async (req, res, next) => {
  try {
    const transfer = await TransferRequest.findById(req.params.id)
      .populate('employee', 'firstName lastName employeeId designation')
      .populate('fromDepartment', 'name')
      .populate('toDepartment', 'name')
      .populate('recommendedBy', 'username email')
      .populate('approvedBy', 'username email');

    if (!transfer) return res.status(404).json({ success: false, message: 'Transfer request not found' });

    res.status(200).json({ success: true, transfer });
  } catch (error) {
    next(error);
  }
};

module.exports = { createTransferRequest, getAllTransfers, updateTransferStatus, getTransferById };
