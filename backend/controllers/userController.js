const User = require('../models/User');
const Employee = require('../models/Employee');
const Department = require('../models/Department');
const AuditLog = require('../models/AuditLog');

// @desc    Add a new employee and their user account
// @route   POST /api/users
// @access  Private (Admin only)
const addUser = async (req, res, next) => {
  try {
    const {
      username,
      email,
      password,
      role,
      firstName,
      lastName,
      phone,
      gender,
      dateOfBirth,
      department,
      designation,
      salary,
      skills,
      address,
      emergencyContact,
      employeeId,
    } = req.body;

    // 1. Validation check for mandatory fields
    if (
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !role ||
      !department ||
      !designation ||
      !salary ||
      !gender
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields (firstName, lastName, email, password, role, department, designation, salary, gender).',
      });
    }

    // Password length check
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    // 2. Check duplicate email in User or Employee collection
    const userExists = await User.findOne({ email: email.toLowerCase() });
    const empExists = await Employee.findOne({ email: email.toLowerCase() });

    if (userExists || empExists) {
      return res.status(409).json({
        success: false,
        message: 'Email address is already in use by another account or employee record.',
      });
    }

    // Check duplicate username if provided
    const targetUsername = username || `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
    const usernameExists = await User.findOne({ username: targetUsername.toLowerCase() });

    if (usernameExists) {
      return res.status(409).json({
        success: false,
        message: `Username '${targetUsername}' is already taken. Please provide a unique username.`,
      });
    }

    // 3. Verify and resolve Department
    let targetDeptId;
    if (department.match(/^[0-9a-fA-F]{24}$/)) {
      const deptExists = await Department.findById(department);
      if (!deptExists) {
        return res.status(400).json({ success: false, message: 'Selected Department not found.' });
      }
      targetDeptId = department;
    } else {
      let dept = await Department.findOne({ name: { $regex: new RegExp(`^${department}$`, 'i') } });
      if (!dept) {
        dept = await Department.create({
          name: department,
          description: `${department} Department`,
        });
      }
      targetDeptId = dept._id;
    }

    // 4. Resolve Employee ID uniqueness
    let empId = employeeId;
    if (!empId) {
      // Auto-generate employee ID
      const count = await Employee.countDocuments();
      empId = `EMP${100 + count + 1}`;
      const idExists = await Employee.findOne({ employeeId: empId });
      if (idExists) {
        empId = `EMP${Date.now().toString().slice(-6)}`;
      }
    } else {
      const idExists = await Employee.findOne({ employeeId: empId });
      if (idExists) {
        return res.status(409).json({ success: false, message: `Employee ID ${empId} is already in use.` });
      }
    }

    // 5. Create Employee profile
    const employee = await Employee.create({
      employeeId: empId,
      firstName,
      lastName,
      email: email.toLowerCase(),
      phone: phone || '',
      gender,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      department: targetDeptId,
      designation,
      salary: Number(salary),
      skills: Array.isArray(skills) ? skills : (skills ? skills.split(',').map(s => s.trim()) : []),
      address: address || {},
      emergencyContact: emergencyContact || {},
      status: 'Active',
    });

    // 6. Create matching User account (Mongoose pre-save hook handles hashing password)
    const user = await User.create({
      username: targetUsername.toLowerCase(),
      email: email.toLowerCase(),
      password,
      role: role || 'employee',
      employee: employee._id,
    });

    // 7. Audit log creation
    await AuditLog.create({
      action: 'CREATE_EMPLOYEE',
      entity: 'Employee',
      entityId: employee._id,
      performedBy: req.user._id,
      details: `Created profile & user credentials for employee: ${firstName} ${lastName} (${empId}) with role: ${role}.`,
    });

    res.status(201).json({
      success: true,
      message: 'User account and Employee profile created successfully.',
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      employee,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { addUser };
