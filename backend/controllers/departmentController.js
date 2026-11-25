const Department = require('../models/Department');
const Employee = require('../models/Employee');
const User = require('../models/User');
const TransferRequest = require('../models/TransferRequest');
const AuditLog = require('../models/AuditLog');
const { escapeRegex } = require('../utils/orgHelper');

/**
 * Enforce consistent Department Head ownership:
 * - Validates selected manager exists and is Active
 * - Clears manager from any other department they previously headed (fixed 1-dept ownership)
 * - Moves the manager Employee record into this department
 * - Promotes User.role from 'employee' to 'manager' (preserves 'admin'/'hr')
 */
const applyDepartmentHeadSync = async (departmentId, managerId) => {
  if (!managerId) return null;

  const mgrEmp = await Employee.findById(managerId);
  if (!mgrEmp) {
    const err = new Error('Selected Department Head employee was not found');
    err.statusCode = 404;
    throw err;
  }
  if (mgrEmp.status === 'Inactive') {
    const err = new Error('Inactive employees cannot be assigned as Department Head');
    err.statusCode = 400;
    throw err;
  }

  // Ensure a single fixed base: remove this person as head of any other department
  await Department.updateMany(
    { _id: { $ne: departmentId }, manager: mgrEmp._id },
    { manager: null }
  );

  // Sync employee's own department to match the department they lead
  if (String(mgrEmp.department || '') !== String(departmentId)) {
    await Employee.findByIdAndUpdate(mgrEmp._id, { department: departmentId });
  }

  // Grant manager permissions if currently a standard employee
  const mgrUser = await User.findOne({ employee: mgrEmp._id });
  if (mgrUser && mgrUser.role === 'employee') {
    mgrUser.role = 'manager';
    await mgrUser.save();
  }

  return mgrEmp;
};

const formatPopulatedDepartment = async (deptId) => {
  const dept = await Department.findById(deptId)
    .populate('manager', 'firstName lastName employeeId email designation status');
  if (!dept) return null;
  const [employeeCount, activeCount] = await Promise.all([
    Employee.countDocuments({ department: dept._id }),
    Employee.countDocuments({ department: dept._id, status: 'Active' }),
  ]);
  return {
    ...dept.toObject(),
    employeeCount,
    activeCount,
  };
};

// @desc    Get all departments
// @route   GET /api/departments
// @access  Private
const getDepartments = async (req, res, next) => {
  try {
    const [departments, allEmployees] = await Promise.all([
      Department.find().populate('manager', 'firstName lastName employeeId email designation status'),
      Employee.find().select('department status').lean(),
    ]);

    const countsMap = new Map();
    for (const emp of allEmployees) {
      const k = String(emp.department || '');
      if (!countsMap.has(k)) countsMap.set(k, { total: 0, active: 0 });
      const entry = countsMap.get(k);
      entry.total += 1;
      if (emp.status === 'Active') entry.active += 1;
    }

    const departmentsWithCounts = departments.map((dept) => {
      const counts = countsMap.get(String(dept._id)) || { total: 0, active: 0 };
      return {
        ...dept.toObject(),
        employeeCount: counts.total,
        activeCount: counts.active,
      };
    });

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
    const formatted = await formatPopulatedDepartment(req.params.id);

    if (!formatted) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    res.status(200).json({
      success: true,
      department: formatted,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create department
// @route   POST /api/departments
// @access  Private (Admin)
const createDepartment = async (req, res, next) => {
  try {
    const trimmedName = (req.body.name || '').trim();
    const { description, manager } = req.body;

    if (!trimmedName) {
      return res.status(400).json({ success: false, message: 'Department name is required' });
    }

    const nameExists = await Department.findOne({
      name: { $regex: new RegExp(`^${escapeRegex(trimmedName)}$`, 'i') },
    });
    if (nameExists) {
      return res.status(400).json({ success: false, message: 'Department name already exists' });
    }

    let validManagerEmp = null;
    if (manager) {
      validManagerEmp = await Employee.findById(manager);
      if (!validManagerEmp) {
        return res.status(404).json({ success: false, message: 'Selected Department Head employee was not found' });
      }
      if (validManagerEmp.status === 'Inactive') {
        return res.status(400).json({ success: false, message: 'Inactive employees cannot be assigned as Department Head' });
      }
    }

    const department = await Department.create({
      name: trimmedName,
      description: description || '',
      manager: manager || null,
    });

    if (validManagerEmp) {
      await applyDepartmentHeadSync(department._id, validManagerEmp._id);
    }

    if (req.user?._id) {
      await AuditLog.create({
        action: 'CREATE_DEPARTMENT',
        entity: 'Department',
        entityId: department._id,
        performedBy: req.user._id,
        details: validManagerEmp
          ? `Created department '${department.name}' with head ${validManagerEmp.firstName} ${validManagerEmp.lastName}.`
          : `Created department '${department.name}'.`,
      });
    }

    const populated = await formatPopulatedDepartment(department._id);
    res.status(201).json({
      success: true,
      department: populated,
    });
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Update department
// @route   PUT /api/departments/:id
// @access  Private (Admin)
const updateDepartment = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id);

    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    const updatePayload = {};
    if (req.body.name !== undefined) {
      const trimmedName = String(req.body.name || '').trim();
      if (!trimmedName) {
        return res.status(400).json({ success: false, message: 'Department name cannot be empty' });
      }
      const dup = await Department.findOne({
        _id: { $ne: department._id },
        name: { $regex: new RegExp(`^${escapeRegex(trimmedName)}$`, 'i') },
      });
      if (dup) {
        return res.status(400).json({ success: false, message: 'Department name already exists' });
      }
      updatePayload.name = trimmedName;
    }
    if (req.body.description !== undefined) {
      updatePayload.description = req.body.description;
    }

    let syncedManager = null;
    if (req.body.manager !== undefined) {
      const nextManagerId = req.body.manager || null;
      if (nextManagerId) {
        syncedManager = await applyDepartmentHeadSync(department._id, nextManagerId);
        updatePayload.manager = syncedManager._id;
      } else {
        updatePayload.manager = null;
      }
    }

    await Department.findByIdAndUpdate(req.params.id, updatePayload, {
      new: true,
      runValidators: true,
    });

    if (req.user?._id) {
      await AuditLog.create({
        action: 'UPDATE_DEPARTMENT',
        entity: 'Department',
        entityId: department._id,
        performedBy: req.user._id,
        details: syncedManager
          ? `Updated department '${updatePayload.name || department.name}' (Head: ${syncedManager.firstName} ${syncedManager.lastName}).`
          : `Updated department '${updatePayload.name || department.name}'.`,
      });
    }

    const populated = await formatPopulatedDepartment(department._id);
    res.status(200).json({
      success: true,
      department: populated,
    });
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Delete department (supports ?reassignTo=<deptId> or ?force=true)
// @route   DELETE /api/departments/:id
// @access  Private (Admin)
const deleteDepartment = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id);

    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    const employeeCount = await Employee.countDocuments({ department: department._id });
    const reassignTo = req.query.reassignTo || req.body?.reassignTo || '';
    const force = req.query.force === 'true' || req.body?.force === true;

    let targetDept = null;
    let reassignedCount = 0;

    if (employeeCount > 0) {
      if (reassignTo) {
        if (String(reassignTo) === String(department._id)) {
          return res.status(400).json({
            success: false,
            message: 'Please select a different department to reassign members.',
          });
        }
        targetDept = await Department.findById(reassignTo);
        if (!targetDept) {
          return res.status(404).json({
            success: false,
            message: 'Selected target department for reassignment was not found.',
          });
        }
      } else if (force) {
        if (department.name.toLowerCase() === 'unassigned') {
          return res.status(400).json({
            success: false,
            message: `Cannot force-delete 'Unassigned' while ${employeeCount} member(s) remain in it. Please select another department.`,
          });
        }
        targetDept = await Department.findOne({ name: { $regex: /^unassigned$/i } });
        if (!targetDept) {
          targetDept = await Department.create({
            name: 'Unassigned',
            description: 'Default holding unit for employees from removed departments.',
            manager: null,
          });
        }
      } else {
        return res.status(400).json({
          success: false,
          employeeCount,
          message: `Cannot delete department '${department.name}' directly because it contains ${employeeCount} employee(s). Reassign members first.`,
        });
      }

      const updateRes = await Employee.updateMany(
        { department: department._id },
        { department: targetDept._id }
      );
      reassignedCount = updateRes.modifiedCount || employeeCount;

      await TransferRequest.updateMany(
        { toDepartment: department._id },
        { toDepartment: targetDept._id }
      );
      await TransferRequest.updateMany(
        { fromDepartment: department._id },
        { fromDepartment: targetDept._id }
      );
    }

    await Department.findByIdAndDelete(req.params.id);

    if (req.user?._id) {
      await AuditLog.create({
        action: 'DELETE_DEPARTMENT',
        entity: 'Department',
        entityId: department._id,
        performedBy: req.user._id,
        details: targetDept
          ? `Deleted department '${department.name}' and reassigned ${reassignedCount} member(s) to '${targetDept.name}'.`
          : `Deleted empty department '${department.name}'.`,
      });
    }

    res.status(200).json({
      success: true,
      reassignedCount,
      reassignedTo: targetDept ? { _id: targetDept._id, name: targetDept.name } : null,
      message: targetDept
        ? `Department '${department.name}' deleted and ${reassignedCount} member(s) moved to '${targetDept.name}'.`
        : `Department '${department.name}' deleted successfully.`,
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
