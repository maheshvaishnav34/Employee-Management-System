const User = require('../models/User');
const Employee = require('../models/Employee');
const AuditLog = require('../models/AuditLog');
const Payroll = require('../models/Payroll');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const Department = require('../models/Department');
const Candidate = require('../models/Candidate');
const PerformanceReview = require('../models/PerformanceReview');
const Reward = require('../models/Reward');
const Task = require('../models/Task');
const Designation = require('../models/Designation');
const Setting = require('../models/Setting');

// ─── Audit Log List ──────────────────────────────────────────────────────────
// @route GET /api/admin/audit-logs
const getAuditLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const skip = (page - 1) * limit;

    const logs = await AuditLog.find()
      .populate('performedBy', 'username email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await AuditLog.countDocuments();

    res.status(200).json({ success: true, logs, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
};

// ─── All Users with roles ────────────────────────────────────────────────────
// @route GET /api/admin/users
const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find()
      .populate('employee', 'firstName lastName employeeId designation department')
      .select('-password')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, users });
  } catch (error) {
    next(error);
  }
};

// ─── Change User Role ────────────────────────────────────────────────────────
// @route PUT /api/admin/users/:id/role
const changeUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['admin', 'hr', 'manager', 'employee'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

    // Enforce role restrictions
    if (req.user.role === 'admin') {
    // Admins cannot touch other admins
      if (targetUser.role === 'admin') {
        return res.status(403).json({ success: false, message: 'Admins cannot modify other Admin accounts' });
      }
      // Admins cannot promote users to admin
      if (role === 'admin') {
        return res.status(403).json({ success: false, message: 'Admins cannot assign Admin role' });
      }
    }

    const oldRole = targetUser.role;
    targetUser.role = role;
    await targetUser.save();

    await AuditLog.create({
      action: 'CHANGE_ROLE',
      entity: 'User',
      entityId: targetUser._id,
      performedBy: req.user._id,
      details: `Changed ${targetUser.email} role from ${oldRole} to ${role}`,
    });

    res.status(200).json({ success: true, message: `Role updated to ${role}`, user: targetUser });
  } catch (error) {
    next(error);
  }
};

// ─── Reports Export ──────────────────────────────────────────────────────────
// @route GET /api/admin/reports/:type  (type: employees | attendance | payroll | leaves)
const getReport = async (req, res, next) => {
  try {
    const { type } = req.params;
    let data = [];

    if (req.user.role === 'manager') {
      const mgrEmp = await Employee.findOne({ email: req.user.email });
      if (!mgrEmp) {
        return res.status(200).json({ success: true, type, count: 0, data: [] });
      }
      
      const teamEmployees = await Employee.find({ department: mgrEmp.department }).select('_id');
      const teamEmployeeIds = teamEmployees.map(e => e._id);

      if (type === 'employees') {
        data = await Employee.find({ department: mgrEmp.department }).populate('department', 'name').lean();
      } else if (type === 'attendance') {
        const from = req.query.from ? new Date(req.query.from) : new Date(new Date().setDate(1));
        const to = req.query.to ? new Date(req.query.to) : new Date();
        data = await Attendance.find({ employee: { $in: teamEmployeeIds }, date: { $gte: from, $lte: to } })
          .populate('employee', 'firstName lastName employeeId')
          .lean();
      } else if (type === 'payroll') {
        data = await Payroll.find({ employee: { $in: teamEmployeeIds } })
          .populate('employee', 'firstName lastName employeeId department')
          .lean();
      } else if (type === 'leaves') {
        data = await LeaveRequest.find({ employee: { $in: teamEmployeeIds } })
          .populate('employee', 'firstName lastName employeeId')
          .lean();
      } else if (type === 'productivity') {
        data = await Task.find({ assignedTo: { $in: teamEmployeeIds } })
          .populate('assignedTo', 'firstName lastName employeeId designation')
          .populate('assignedBy', 'username email')
          .lean();
      } else {
        return res.status(400).json({ success: false, message: 'Invalid report type' });
      }
    } else {
      if (type === 'employees') {
        data = await Employee.find().populate('department', 'name').lean();
      } else if (type === 'attendance') {
        const from = req.query.from ? new Date(req.query.from) : new Date(new Date().setDate(1));
        const to = req.query.to ? new Date(req.query.to) : new Date();
        data = await Attendance.find({ date: { $gte: from, $lte: to } })
          .populate('employee', 'firstName lastName employeeId')
          .lean();
      } else if (type === 'payroll') {
        data = await Payroll.find()
          .populate('employee', 'firstName lastName employeeId department')
          .lean();
      } else if (type === 'leaves') {
        data = await LeaveRequest.find()
          .populate('employee', 'firstName lastName employeeId')
          .lean();
      } else if (type === 'productivity') {
        data = await Task.find()
          .populate('assignedTo', 'firstName lastName employeeId designation')
          .populate('assignedBy', 'username email')
          .lean();
      } else {
        return res.status(400).json({ success: false, message: 'Invalid report type' });
      }
    }

    await AuditLog.create({
      action: 'EXPORT_REPORT',
      entity: type,
      performedBy: req.user._id,
      details: `Exported ${type} report (${data.length} records)`,
    });

    res.status(200).json({ success: true, type, count: data.length, data });
  } catch (error) {
    next(error);
  }
};

// ─── System Overview Stats ───────────────────────────────────────────────────
// @route GET /api/admin/overview
const getAdminOverview = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const adminUsers = await User.countDocuments({ role: 'admin' });
    const hrUsers = await User.countDocuments({ role: 'hr' });
    const managerUsers = await User.countDocuments({ role: 'manager' });
    const employeeUsers = await User.countDocuments({ role: 'employee' });

    const totalAuditLogs = await AuditLog.countDocuments();
    const recentLogs = await AuditLog.find()
      .populate('performedBy', 'username email role')
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      overview: {
        users: { total: totalUsers, admin: adminUsers, hr: hrUsers, manager: managerUsers, employee: employeeUsers },
        totalAuditLogs,
        recentLogs,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── System Settings ──────────────────────────────────────────────────────────
// @route GET /api/admin/settings
const getSystemSettings = async (req, res, next) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create({});
    }
    res.status(200).json({ success: true, settings });
  } catch (error) {
    next(error);
  }
};

// @route PUT /api/admin/settings
const updateSystemSettings = async (req, res, next) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create(req.body);
    } else {
      settings = await Setting.findByIdAndUpdate(settings._id, req.body, {
        new: true,
        runValidators: true,
      });
    }

    await AuditLog.create({
      action: 'UPDATE_SETTINGS',
      entity: 'System',
      performedBy: req.user._id,
      details: 'Updated global system settings configuration',
    });

    res.status(200).json({ success: true, settings, message: 'Settings saved successfully' });
  } catch (error) {
    next(error);
  }
};

// ─── Database Backup & Restore ───────────────────────────────────────────────
// @route GET /api/admin/backup
const exportBackup = async (req, res, next) => {
  try {
    const backupDate = new Date();
    const data = {
      users: await User.find().lean(),
      employees: await Employee.find().lean(),
      departments: await Department.find().lean(),
      attendances: await Attendance.find().lean(),
      leaveRequests: await LeaveRequest.find().lean(),
      payrolls: await Payroll.find().lean(),
      auditLogs: await AuditLog.find().lean(),
      candidates: await Candidate.find().lean(),
      performanceReviews: await PerformanceReview.find().lean(),
      rewards: await Reward.find().lean(),
      tasks: await Task.find().lean(),
      designations: await Designation.find().lean(),
      settings: await Setting.find().lean(),
    };

    await AuditLog.create({
      action: 'DATABASE_BACKUP',
      entity: 'System',
      performedBy: req.user._id,
      details: 'Generated full system database backup JSON',
    });

    res.status(200).json({
      success: true,
      backupDate,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/admin/restore
const importBackup = async (req, res, next) => {
  try {
    const { data } = req.body;
    if (!data) {
      return res.status(400).json({ success: false, message: 'Invalid backup structure. Missing "data" node.' });
    }

    // Clear existing data
    await User.deleteMany({});
    await Employee.deleteMany({});
    await Department.deleteMany({});
    await Attendance.deleteMany({});
    await LeaveRequest.deleteMany({});
    await Payroll.deleteMany({});
    await AuditLog.deleteMany({});
    await Candidate.deleteMany({});
    await PerformanceReview.deleteMany({});
    await Reward.deleteMany({});
    await Task.deleteMany({});
    await Designation.deleteMany({});
    await Setting.deleteMany({});

    // Import documents
    if (data.users && data.users.length > 0) await User.insertMany(data.users);
    if (data.employees && data.employees.length > 0) await Employee.insertMany(data.employees);
    if (data.departments && data.departments.length > 0) await Department.insertMany(data.departments);
    if (data.attendances && data.attendances.length > 0) await Attendance.insertMany(data.attendances);
    if (data.leaveRequests && data.leaveRequests.length > 0) await LeaveRequest.insertMany(data.leaveRequests);
    if (data.payrolls && data.payrolls.length > 0) await Payroll.insertMany(data.payrolls);
    if (data.candidates && data.candidates.length > 0) await Candidate.insertMany(data.candidates);
    if (data.performanceReviews && data.performanceReviews.length > 0) await PerformanceReview.insertMany(data.performanceReviews);
    if (data.rewards && data.rewards.length > 0) await Reward.insertMany(data.rewards);
    if (data.tasks && data.tasks.length > 0) await Task.insertMany(data.tasks);
    if (data.designations && data.designations.length > 0) await Designation.insertMany(data.designations);
    if (data.settings && data.settings.length > 0) await Setting.insertMany(data.settings);
    
    // For AuditLog, write a new entry recording this restore
    if (data.auditLogs && data.auditLogs.length > 0) {
      await AuditLog.insertMany(data.auditLogs);
    }
    
    await AuditLog.create({
      action: 'DATABASE_RESTORE',
      entity: 'System',
      performedBy: req.user._id,
      details: 'Restored system database state from backup file',
    });

    res.status(200).json({
      success: true,
      message: 'System backup restored successfully. All databases synchronized.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAuditLogs,
  getAllUsers,
  changeUserRole,
  getReport,
  getAdminOverview,
  getSystemSettings,
  updateSystemSettings,
  exportBackup,
  importBackup,
};

