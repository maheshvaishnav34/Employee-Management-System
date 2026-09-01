const Department = require('../models/Department');
const Employee = require('../models/Employee');

// @desc    Get all departments
// @route   GET /api/departments
// @access  Private
const getDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find().populate('manager', 'firstName lastName employeeId email');
    
    // Dynamically fetch employee count for each department
    const departmentsWithCounts = await Promise.all(
      departments.map(async (dept) => {
        const employeeCount = await Employee.countDocuments({ department: dept._id });
        return {
          ...dept.toObject(),
          employeeCount,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: departmentsWithCounts.length,
      departments: departmentsWithCounts,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single department
// @route   GET /api/departments/:id
// @access  Private
const getDepartmentById = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id).populate('manager', 'firstName lastName');

    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    const employeeCount = await Employee.countDocuments({ department: department._id });

    res.status(200).json({
      success: true,
      department: {
        ...department.toObject(),
        employeeCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create department
// @route   POST /api/departments
// @access  Private (Admin & HR)
const createDepartment = async (req, res, next) => {
  try {
    const { name, description, manager } = req.body;

    const nameExists = await Department.findOne({ name });
    if (nameExists) {
      return res.status(400).json({ success: false, message: 'Department name already exists' });
    }

    const department = await Department.create({
      name,
      description,
      manager: manager || null,
    });

    res.status(201).json({
      success: true,
      department,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update department
// @route   PUT /api/departments/:id
// @access  Private (Admin & HR)
const updateDepartment = async (req, res, next) => {
  try {
    let department = await Department.findById(req.params.id);

    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    department = await Department.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      department,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete department
// @route   DELETE /api/departments/:id
// @access  Private (Admin & HR)
const deleteDepartment = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id);

    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    // Check if department has active employees
    const employeeCount = await Employee.countDocuments({ department: department._id });
    if (employeeCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete department '${department.name}'. It contains ${employeeCount} active employees. Please reassign them first.`,
      });
    }

    await Department.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Department deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
};
