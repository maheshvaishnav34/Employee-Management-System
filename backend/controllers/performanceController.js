const PerformanceReview = require('../models/PerformanceReview');
const Employee = require('../models/Employee');
const AuditLog = require('../models/AuditLog');

// @desc    Get performance reviews
// @route   GET /api/performance
// @access  Private (Employee sees own, Admin/HR sees all)
const getReviews = async (req, res, next) => {
  try {
    let query = {};
    
    // If the logged-in user is an employee, only show reviews where they are the subject
    if (req.user.role === 'employee') {
      const emp = await Employee.findOne({ email: req.user.email });
      if (!emp) return res.status(200).json({ success: true, count: 0, data: [] });
      query = { employee: emp._id };
    }

    const reviews = await PerformanceReview.find(query)
      .populate('employee', 'firstName lastName employeeId designation department')
      .populate('reviewer', 'firstName lastName designation')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: reviews.length, data: reviews });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a performance review
// @route   POST /api/performance
// @access  Private (Admin, HR)
const createReview = async (req, res, next) => {
  try {
    const { employeeId, rating, feedback, reviewPeriod } = req.body;
    if (!employeeId || !rating || !feedback || !reviewPeriod) {
      return res.status(400).json({ success: false, message: 'Please provide employeeId, rating, feedback, and reviewPeriod' });
    }

    // Find reviewer employee record (the logged-in user)
    const reviewerEmp = await Employee.findOne({ email: req.user.email });
    if (!reviewerEmp) {
      return res.status(400).json({ success: false, message: 'Reviewer must have an active employee profile' });
    }

    // No department restrictions for managers

    const review = await PerformanceReview.create({
      employee: employeeId,
      reviewer: reviewerEmp._id,
      rating,
      feedback,
      reviewPeriod,
    });

    const subjectEmp = await Employee.findById(employeeId);
    await AuditLog.create({
      action: 'CREATE_PERFORMANCE_REVIEW',
      entity: 'PerformanceReview',
      entityId: review._id,
      performedBy: req.user._id,
      details: `Created performance review for employee ${subjectEmp ? subjectEmp.firstName + ' ' + subjectEmp.lastName : employeeId} with rating ${rating}`,
    });

    res.status(201).json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
};

module.exports = { getReviews, createReview };
