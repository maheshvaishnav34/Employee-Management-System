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

// @desc    Change current logged-in user password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide both current and new password' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password does not match' });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Auth user with Google / Gmail
// @route   POST /api/auth/google
// @access  Public
const googleLogin = async (req, res, next) => {
  try {
    const { credential, email, name, picture } = req.body;

    let userEmail = '';
    let userName = '';
    let avatarUrl = '';

    // If Google ID Token credential was provided from GIS
    if (credential) {
      try {
        const base64Url = credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          Buffer.from(base64, 'base64')
            .toString('utf-8')
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const payload = JSON.parse(jsonPayload);
        userEmail = payload.email;
        userName = payload.name || `${payload.given_name || ''} ${payload.family_name || ''}`.trim();
        avatarUrl = payload.picture || '';
      } catch (decodeErr) {
        return res.status(400).json({ success: false, message: 'Invalid Google credential token' });
      }
    } else if (email) {
      userEmail = email;
      userName = name || email.split('@')[0];
    } else {
      return res.status(400).json({ success: false, message: 'Gmail address or Google credential is required' });
    }

    if (!userEmail) {
      return res.status(400).json({ success: false, message: 'Could not extract valid email from Google account' });
    }

    userEmail = userEmail.toLowerCase().trim();

    // Check if user already exists
    let user = await User.findOne({ email: userEmail }).populate('employee');

    if (!user) {
      // Find or create default department
      let defaultDept = (await Department.findOne({ name: 'Engineering' })) ||
        (await Department.findOne()) ||
        (await Department.create({
          name: 'General',
          description: 'General Operations',
        }));

      // Generate names
      const nameParts = userName ? userName.trim().split(' ') : ['Google', 'User'];
      const firstName = nameParts[0] || 'Google';
      const lastName = nameParts.slice(1).join(' ') || 'User';

      // Create Employee record
      const empId = `EMP${Date.now().toString().slice(-6)}`;
      const employee = await Employee.create({
        employeeId: empId,
        firstName,
        lastName,
        email: userEmail,
        phone: '',
        gender: 'Other',
        department: defaultDept._id,
        designation: 'Software Associate',
        salary: 4500,
        profileImage: avatarUrl || '',
      });

      // Generate random strong password for social login account
      const randomPassword = 'Ggl_' + Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);

      // Create User record
      user = await User.create({
        username: userEmail.split('@')[0],
        email: userEmail,
        password: randomPassword,
        role: 'employee',
        employee: employee._id,
      });

      user = await User.findById(user._id).populate('employee');
    }

    // Check if employee is inactive
    if (user.employee && user.employee.status === 'Inactive') {
      return res.status(403).json({ success: false, message: 'Your account is inactive. Please contact your HR or administrator.' });
    }

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        username: user.username || user.email.split('@')[0],
        email: user.email,
        role: user.role,
        employee: user.employee,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot Password - request reset instructions
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide your email address' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email address' });
    }

    res.status(200).json({
      success: true,
      message: 'Reset instructions verified. Please set your new password.',
      email: user.email,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset Password - set new password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and new password' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found' });
    }

    user.password = password;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully! You can now log in.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  loginUser,
  registerUser,
  getMe,
  changePassword,
  googleLogin,
  forgotPassword,
  resetPassword,
};


