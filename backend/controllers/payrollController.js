const Payroll = require('../models/Payroll');
const Employee = require('../models/Employee');

// @desc    Get payroll history
// @route   GET /api/payroll
// @access  Private (HR & Admin can see all, Employee sees own)
const getPayrolls = async (req, res, next) => {
  try {
    const { month, employeeId } = req.query;
    let query = {};

    if (req.user.role === 'employee') {
      if (!req.user.employee) {
        return res.status(200).json({ success: true, count: 0, payrolls: [] });
      }
      query.employee = req.user.employee;
    } else {
      // HR/Admin filters
      if (employeeId) {
        query.employee = employeeId;
      }
      if (month) {
        query.month = month;
      }
    }

    const payrolls = await Payroll.find(query)
      .populate({
        path: 'employee',
        select: 'firstName lastName employeeId designation email',
        populate: { path: 'department', select: 'name' }
      })
      .sort({ month: -1 });

    res.status(200).json({
      success: true,
      count: payrolls.length,
      payrolls,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate payroll records for a month
// @route   POST /api/payroll/generate
// @access  Private (HR & Admin)
const generatePayroll = async (req, res, next) => {
  try {
    const { month } = req.body; // format: "YYYY-MM"

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid month in YYYY-MM format' });
    }

    // Get all active employees
    const employees = await Employee.find({ status: 'Active' });

    if (employees.length === 0) {
      return res.status(400).json({ success: false, message: 'No active employees found to generate payroll' });
    }

    let createdCount = 0;
    let skippedCount = 0;

    for (const emp of employees) {
      // Check if payroll already exists for this month
      const existing = await Payroll.findOne({ employee: emp._id, month });

      if (existing) {
        skippedCount++;
        continue;
      }

      // Generate initial payroll entry
      await Payroll.create({
        employee: emp._id,
        month,
        baseSalary: emp.salary,
        bonuses: 0,
        deductions: 0,
        netSalary: emp.salary, // Initially equal to base salary
        status: 'Unpaid',
      });
      createdCount++;
    }

    res.status(201).json({
      success: true,
      message: `Payroll run complete. Generated: ${createdCount} records, Skipped (already existed): ${skippedCount} records.`,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update payroll details (edit bonuses, deductions, and pay status)
// @route   PUT /api/payroll/:id
// @access  Private (HR & Admin)
const updatePayroll = async (req, res, next) => {
  try {
    const { bonuses, deductions, status } = req.body;
    let payroll = await Payroll.findById(req.params.id);

    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Payroll record not found' });
    }

    // Update fields if provided
    if (bonuses !== undefined) payroll.bonuses = Number(bonuses);
    if (deductions !== undefined) payroll.deductions = Number(deductions);
    
    // Recalculate net salary
    payroll.netSalary = payroll.baseSalary + payroll.bonuses - payroll.deductions;

    if (status) {
      payroll.status = status;
      if (status === 'Paid') {
        payroll.paymentDate = new Date();
      } else {
        payroll.paymentDate = null;
      }
    }

    await payroll.save();

    const updatedPayroll = await Payroll.findById(req.params.id).populate('employee', 'firstName lastName employeeId');

    res.status(200).json({
      success: true,
      message: 'Payroll record updated successfully',
      payroll: updatedPayroll,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single payroll record (Payslip view)
// @route   GET /api/payroll/:id
// @access  Private
const getPayrollById = async (req, res, next) => {
  try {
    const payroll = await Payroll.findById(req.params.id).populate({
      path: 'employee',
      select: 'firstName lastName employeeId designation joiningDate email phone',
      populate: { path: 'department', select: 'name' }
    });

    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Payroll record not found' });
    }

    // Enforce security: employee can only see their own payslip
    if (req.user.role === 'employee' && (!req.user.employee || payroll.employee._id.toString() !== req.user.employee.toString())) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this payslip' });
    }

    res.status(200).json({
      success: true,
      payroll,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged in employee's payroll history
// @route   GET /api/payroll/my
// @access  Private
const getMyPayrolls = async (req, res, next) => {
  try {
    if (!req.user.employee) {
      return res.status(200).json({
        success: true,
        count: 0,
        payrolls: [],
      });
    }

    const payrolls = await Payroll.find({ employee: req.user.employee })
      .populate({
        path: 'employee',
        select: 'firstName lastName employeeId designation email',
        populate: { path: 'department', select: 'name' }
      })
      .sort({ month: -1 });

    res.status(200).json({
      success: true,
      count: payrolls.length,
      payrolls,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPayrolls,
  generatePayroll,
  updatePayroll,
  getPayrollById,
  getMyPayrolls,
};
