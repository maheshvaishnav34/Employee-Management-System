const User = require('../models/User');
const Employee = require('../models/Employee');
const Department = require('../models/Department');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecret_ems_key_2026', {
    expiresIn: '30d',
  });
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password').populate('employee');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if employee is inactive
    if (user.employee && user.employee.status === 'Inactive') {
      return res.status(403).json({ success: false, message: 'Your account is inactive. Please contact your HR or administrator.' });
    }

    // Create token
    const token = generateToken(user._id);

    // Format response user details
    const userData = {
      _id: user._id,
      username: user.username || user.email.split('@')[0],
      email: user.email,
      role: user.role,
      employee: user.employee,
    };

    res.status(200).json({
      success: true,
      token,
      user: userData,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Register a new user & employee
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, phone, designation, department, role, gender } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please fill in all required fields' });
    }

    // Check if email already exists in users or employees
    const userExists = await User.findOne({ email });
    const empExists = await Employee.findOne({ email });
    if (userExists || empExists) {
      return res.status(400).json({ success: false, message: 'Email address is already in use' });
    }

    // Fetch department
    let targetDeptId;
    if (department && department.match(/^[0-9a-fA-F]{24}$/)) {
      targetDeptId = department;
    } else {
      const deptName = department || 'Human Resources';
      let dept = await Department.findOne({ name: { $regex: new RegExp(`^${deptName}$`, 'i') } });
      if (!dept) {
        dept = await Department.create({
          name: deptName,
          description: `${deptName} Department`,
        });
      }
      targetDeptId = dept._id;
    }

    // Create Employee record — use timestamp suffix for uniqueness
    const empId = `EMP${Date.now().toString().slice(-6)}`;
    const employee = await Employee.create({
      employeeId: empId,
      firstName,
      lastName,
      email: email.toLowerCase(),
      phone: phone || '',
      gender: gender || 'Other', // Use provided gender or default Other
      department: targetDeptId,
      designation: designation || 'Software Engineer',
      salary: 4000, // Default base salary
    });

    // Create User record
    const user = await User.create({
      username: `${firstName.toLowerCase()}.${lastName.toLowerCase()}`,
      email: email.toLowerCase(),
      password,
      role: role || 'employee',
      employee: employee._id,
    });

    // Create token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        employee,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user details
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'employee',
      populate: { path: 'department', select: 'name' }
    });
    
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  loginUser,
  registerUser,
  getMe,
};
