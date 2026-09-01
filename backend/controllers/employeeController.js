const Employee = require('../models/Employee');
const User = require('../models/User');
const Department = require('../models/Department');

// @desc    Get all employees
// @route   GET /api/employees
// @access  Private (Admin & HR)
const getEmployees = async (req, res, next) => {
  try {
    const { department, search } = req.query;
    let query = {};

    if (req.user.role === 'manager') {
      const mgrEmp = await Employee.findOne({ email: req.user.email });
      if (!mgrEmp) {
        return res.status(200).json({ success: true, count: 0, employees: [] });
      }
      query.department = mgrEmp.department;
    } else if (department) {
      query.department = department;
    }

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { designation: { $regex: search, $options: 'i' } },
      ];
    }

    const employees = await Employee.find(query).populate('department', 'name');

    // Dynamically append User roles to employee records
    const employeesWithRoles = await Promise.all(
      employees.map(async (emp) => {
        const user = await User.findOne({ employee: emp._id });
        const empObj = emp.toObject();
        if (req.user.role === 'employee') {
          delete empObj.salary;
        }
        return {
          ...empObj,
          role: user ? user.role : 'employee',
        };
      })
    );

    res.status(200).json({
      success: true,
      count: employeesWithRoles.length,
      employees: employeesWithRoles,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single employee by ID
// @route   GET /api/employees/:id
// @access  Private
const getEmployeeById = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id).populate('department');

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const user = await User.findOne({ employee: employee._id });

    const empObj = employee.toObject();
    if (req.user.role === 'employee' && (!req.user.employee || req.user.employee.toString() !== employee._id.toString())) {
      delete empObj.salary;
    }

    res.status(200).json({
      success: true,
      employee: {
        ...empObj,
        role: user ? user.role : 'employee',
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new employee
// @route   POST /api/employees
// @access  Private (Admin & HR)
const createEmployee = async (req, res, next) => {
  try {
    const {
      employeeId,
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      joiningDate,
      department,
      designation,
      salary,
      role, // System Role selected during registration
    } = req.body;

    // Check if Employee ID already exists
    const empIdExists = await Employee.findOne({ employeeId });
    if (empIdExists) {
      return res.status(400).json({ success: false, message: `Employee ID ${employeeId} already exists` });
    }

    // Check if email already exists
    const emailExists = await Employee.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ success: false, message: `Email ${email} is already in use` });
    }

    // Verify Department exists
    const dept = await Department.findById(department);
    if (!dept) {
      return res.status(400).json({ success: false, message: 'Invalid Department selected' });
    }

    // Create Employee
    const employee = await Employee.create({
      employeeId,
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      joiningDate: joiningDate || undefined,
      department,
      designation,
      salary,
    });

    // Create matching User Account for employee with designated system role
    const defaultPassword = employeeId; // Use Employee ID as default password
    await User.create({
      username: `${firstName.toLowerCase()}.${lastName.toLowerCase()}`,
      email: email.toLowerCase(),
      password: defaultPassword,
      role: role || 'employee',
      employee: employee._id,
    });

    res.status(201).json({
      success: true,
      employee: {
        ...employee.toObject(),
        role: role || 'employee',
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update employee details
// @route   PUT /api/employees/:id
// @access  Private (Admin & HR)
const updateEmployee = async (req, res, next) => {
  try {
    let employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const originalEmail = employee.email;

    // Update Employee
    employee = await Employee.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('department', 'name');

    // Sync User Account credentials
    const userUpdate = {};
    if (req.body.email && req.body.email.toLowerCase() !== originalEmail.toLowerCase()) {
      userUpdate.email = req.body.email.toLowerCase();
    }
    if (req.body.role) {
      userUpdate.role = req.body.role;
    }

    if (Object.keys(userUpdate).length > 0) {
      await User.findOneAndUpdate({ employee: employee._id }, userUpdate);
    }

    // Retrieve fresh user role to return
    const user = await User.findOne({ employee: employee._id });

    res.status(200).json({
      success: true,
      employee: {
        ...employee.toObject(),
        role: user ? user.role : 'employee',
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete employee
// @route   DELETE /api/employees/:id
// @access  Private (Admin & HR)
const deleteEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Delete corresponding user account
    await User.findOneAndDelete({ employee: employee._id });

    // Remove employee record
    await Employee.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Employee and associated user credentials deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get public directory (name, designation, dept, email, phone) - for all employees
// @route   GET /api/employees/directory
// @access  Private (All)
const getDirectory = async (req, res, next) => {
  try {
    const { search, department } = req.query;
    let query = { status: 'Active' };

    if (department) {
      query.department = department;
    }
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { designation: { $regex: search, $options: 'i' } },
      ];
    }

    const employees = await Employee.find(query)
      .select('firstName lastName employeeId designation department email phone profileImage skills')
      .populate('department', 'name')
      .sort({ firstName: 1 });

    res.status(200).json({ success: true, count: employees.length, employees });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/employees/me
// @access  Private (All)
const getMyProfile = async (req, res, next) => {
  try {
    if (!req.user.employee) {
      return res.status(200).json({ success: true, employee: null });
    }
    const employee = await Employee.findById(req.user.employee).populate('department', 'name');
    if (!employee) {
      return res.status(200).json({ success: true, employee: null });
    }

    // Load related items
    const Asset = require('../models/Asset');
    const PerformanceReview = require('../models/PerformanceReview');
    const LeaveRequest = require('../models/LeaveRequest');
    const Expense = require('../models/Expense');

    const assets = await Asset.find({ assignedTo: req.user.employee });
    const performanceReviews = await PerformanceReview.find({ employee: req.user.employee })
      .populate('reviewer', 'firstName lastName')
      .sort({ createdAt: -1 });
    const leaveRequests = await LeaveRequest.find({ employee: req.user.employee }).sort({ createdAt: -1 });
    const expenses = await Expense.find({ employee: req.user.employee }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      employee: { ...employee.toObject(), role: req.user.role },
      assets,
      performanceReviews,
      leaveRequests,
      expenses,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update logged-in user's own profile
// @route   PUT /api/employees/me
// @access  Private (All)
const updateMyProfile = async (req, res, next) => {
  try {
    if (!req.user.employee) {
      return res.status(400).json({ success: false, message: 'No employee record linked to this account' });
    }

    // Employees can update: phone, dateOfBirth, gender, emergencyContact, address, skills, profileImage, socialLinks, bio, coverImage
    const allowedFields = ['phone', 'dateOfBirth', 'gender', 'emergencyContact', 'address', 'skills', 'profileImage', 'socialLinks', 'bio', 'coverImage'];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const employee = await Employee.findByIdAndUpdate(
      req.user.employee,
      updates,
      { new: true, runValidators: true }
    ).populate('department', 'name');

    res.status(200).json({
      success: true,
      employee: { ...employee.toObject(), role: req.user.role },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getMyProfile,
  updateMyProfile,
  getDirectory,
};
