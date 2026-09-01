const Resignation = require('../models/Resignation');
const Employee = require('../models/Employee');

// @desc    Submit resignation
// @route   POST /api/resignations
// @access  Private (Employee, all roles)
const submitResignation = async (req, res, next) => {
  try {
    if (!req.user.employee) {
      return res.status(400).json({ success: false, message: 'Only accounts linked to an employee profile can resign' });
    }

    const { lastWorkingDay, reason } = req.body;
    if (!lastWorkingDay || !reason) {
      return res.status(400).json({ success: false, message: 'Last working day and reason are required' });
    }

    // Check for existing active resignation
    const existing = await Resignation.findOne({ employee: req.user.employee, status: { $in: ['Pending', 'Approved'] } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'You already have an active resignation request' });
    }

    const resignation = await Resignation.create({
      employee: req.user.employee,
      lastWorkingDay: new Date(lastWorkingDay),
      reason,
      submittedBy: req.user._id,
    });

    const populated = await Resignation.findById(resignation._id)
      .populate('employee', 'firstName lastName employeeId designation')
      .populate('submittedBy', 'username email');

    res.status(201).json({ success: true, message: 'Resignation submitted successfully', resignation: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged-in user's resignation
// @route   GET /api/resignations/my
// @access  Private
const getMyResignation = async (req, res, next) => {
  try {
    if (!req.user.employee) {
      return res.status(200).json({ success: true, resignation: null });
    }

    const resignation = await Resignation.findOne({ employee: req.user.employee })
      .sort({ createdAt: -1 })
      .populate('employee', 'firstName lastName employeeId designation')
      .populate('approvedBy', 'username email');

    res.status(200).json({ success: true, resignation });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all resignations (manager sees team, HR/Admin sees all)
// @route   GET /api/resignations
// @access  Private (Manager, HR, Admin)
const getAllResignations = async (req, res, next) => {
  try {
    let query = {};

    if (req.user.role === 'manager') {
      const mgrEmp = await Employee.findOne({ email: req.user.email });
      if (!mgrEmp) return res.status(200).json({ success: true, resignations: [] });
      const teamEmployees = await Employee.find({ department: mgrEmp.department }).select('_id');
      const teamIds = teamEmployees.map(e => e._id);
      query.employee = { $in: teamIds };
    }

    const resignations = await Resignation.find(query)
      .populate('employee', 'firstName lastName employeeId designation profileImage')
      .populate('submittedBy', 'username email')
      .populate('approvedBy', 'username email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: resignations.length, resignations });
  } catch (error) {
    next(error);
  }
};

// @desc    Update resignation status + manager feedback
// @route   PUT /api/resignations/:id/status
// @access  Private (Manager, HR, Admin)
const updateResignationStatus = async (req, res, next) => {
  try {
    const { status, managerFeedback } = req.body;

    if (!['Approved', 'Rejected', 'Withdrawn'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const resignation = await Resignation.findById(req.params.id).populate('employee');
    if (!resignation) return res.status(404).json({ success: false, message: 'Resignation not found' });

    // Manager department check
    if (req.user.role === 'manager') {
      const mgrEmp = await Employee.findOne({ email: req.user.email });
      if (!mgrEmp || mgrEmp.department.toString() !== resignation.employee.department.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to process resignations outside your department' });
      }
    }

    resignation.status = status;
    resignation.managerFeedback = managerFeedback || resignation.managerFeedback;
    resignation.approvedBy = req.user._id;
    resignation.approvedAt = new Date();
    await resignation.save();

    // If approved, mark employee as inactive
    if (status === 'Approved') {
      await Employee.findByIdAndUpdate(resignation.employee._id, { status: 'Inactive' });
    }

    res.status(200).json({ success: true, message: `Resignation ${status.toLowerCase()}`, resignation });
  } catch (error) {
    next(error);
  }
};

// @desc    Update handover checklist item
// @route   PUT /api/resignations/:id/checklist/:itemId
// @access  Private
const updateHandoverItem = async (req, res, next) => {
  try {
    const { completed } = req.body;
    const resignation = await Resignation.findById(req.params.id);
    if (!resignation) return res.status(404).json({ success: false, message: 'Resignation not found' });

    const item = resignation.handoverChecklist.id(req.params.itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Checklist item not found' });

    item.completed = completed;
    item.completedAt = completed ? new Date() : null;
    await resignation.save();

    res.status(200).json({ success: true, message: 'Checklist item updated', resignation });
  } catch (error) {
    next(error);
  }
};

module.exports = { submitResignation, getMyResignation, getAllResignations, updateResignationStatus, updateHandoverItem };
