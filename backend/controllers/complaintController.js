const Complaint = require('../models/Complaint');
const Employee = require('../models/Employee');

// @desc    Submit a complaint or workplace support request
// @route   POST /api/complaints
// @access  Private (Employee, all authenticated users)
const createComplaint = async (req, res, next) => {
  try {
    let employeeId = req.user.employee ? req.user.employee._id : null;
    if (!employeeId) {
      const emp = await Employee.findOne({ email: req.user.email });
      if (emp) employeeId = emp._id;
    }

    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'Your account is not linked to an employee profile' });
    }

    const { title, category, priority, description, isAnonymous } = req.body;

    if (!title || !description) {
      return res.status(400).json({ success: false, message: 'Please provide both title and description' });
    }

    const complaint = await Complaint.create({
      employee: employeeId,
      submittedBy: req.user._id,
      title,
      category: category || 'Workplace Issue',
      priority: priority || 'Medium',
      description,
      isAnonymous: !!isAnonymous,
    });

    res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully',
      complaint,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged in user's complaints
// @route   GET /api/complaints/my
// @access  Private (Employee)
const getMyComplaints = async (req, res, next) => {
  try {
    let employeeId = req.user.employee ? req.user.employee._id : null;
    if (!employeeId) {
      const emp = await Employee.findOne({ email: req.user.email });
      if (emp) employeeId = emp._id;
    }

    const complaints = await Complaint.find({
      $or: [
        { submittedBy: req.user._id },
        ...(employeeId ? [{ employee: employeeId }] : []),
      ],
    })
      .populate('resolvedBy', 'username email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: complaints.length,
      complaints,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all complaints (HR, Admin, Manager)
// @route   GET /api/complaints
// @access  Private (Admin, HR, Manager)
const getAllComplaints = async (req, res, next) => {
  try {
    let query = {};

    if (req.user.role === 'manager') {
      const mgrEmp = await Employee.findOne({ email: req.user.email });
      if (!mgrEmp) return res.status(200).json({ success: true, complaints: [] });
      const deptEmployees = await Employee.find({ department: mgrEmp.department }).select('_id');
      const empIds = deptEmployees.map(e => e._id);
      query.employee = { $in: empIds };
    }

    const rawComplaints = await Complaint.find(query)
      .populate('employee', 'firstName lastName employeeId designation email')
      .populate('submittedBy', 'username email')
      .populate('resolvedBy', 'username email')
      .sort({ createdAt: -1 });

    // Mask employee name if anonymous
    const complaints = rawComplaints.map(c => {
      const item = c.toObject();
      if (item.isAnonymous) {
        item.employee = { firstName: 'Anonymous', lastName: 'Employee', designation: 'Confidential' };
      }
      return item;
    });

    res.status(200).json({
      success: true,
      count: complaints.length,
      complaints,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update complaint status & resolution
// @route   PUT /api/complaints/:id/status
// @access  Private (Admin, HR, Manager)
const updateComplaintStatus = async (req, res, next) => {
  try {
    const { status, resolutionNotes } = req.body;

    if (!['Pending', 'In Review', 'Resolved', 'Dismissed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    complaint.status = status;
    if (resolutionNotes) complaint.resolutionNotes = resolutionNotes;
    if (status === 'Resolved' || status === 'Dismissed') {
      complaint.resolvedBy = req.user._id;
      complaint.resolvedAt = new Date();
    }
    await complaint.save();

    res.status(200).json({
      success: true,
      message: `Complaint marked as ${status}`,
      complaint,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createComplaint,
  getMyComplaints,
  getAllComplaints,
  updateComplaintStatus,
};
