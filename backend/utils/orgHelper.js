const Employee = require('../models/Employee');
const Department = require('../models/Department');
const Designation = require('../models/Designation');

const escapeRegex = (val = '') => String(val).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Default category & hierarchy level heuristics when auto-registering employee designations.
 */
const DEFAULT_DESIGNATION_META = {
  'system administrator': { category: 'Administration', level: 8, description: 'Manages core enterprise systems and user access' },
  'tech lead': { category: 'Engineering', level: 7, description: 'Leads technical architecture and software engineering squads' },
  'senior developer': { category: 'Engineering', level: 6, description: 'Senior full-stack or platform software developer' },
  'junior developer': { category: 'Engineering', level: 3, description: 'Entry-to-mid level software engineer' },
  'mern stack developer': { category: 'Engineering', level: 5, description: 'Full-stack MongoDB, Express, React, and Node.js developer' },
  'department manager': { category: 'Management', level: 7, description: 'Manages department operations, team delivery, and approvals' },
  'marketing executive': { category: 'Marketing', level: 4, description: 'Executes marketing campaigns and brand initiatives' },
  'marketing lead': { category: 'Marketing', level: 6, description: 'Leads marketing strategy and campaign execution' },
  'sales lead': { category: 'Sales', level: 6, description: 'Leads sales pipeline and revenue targets' },
  'sales agent': { category: 'Sales', level: 4, description: 'Manages client outreach and sales conversions' },
  'software intern': { category: 'Entry Level', level: 1, description: 'Engineering intern supporting development workflows' },
  'hr associate': { category: 'HR', level: 4, description: 'Supports HR operations, onboarding, and employee queries' },
  staff: { category: 'General', level: 3, description: 'General team member' },
};

const inferDesignationMeta = (name) => {
  const clean = String(name || '').trim();
  const lower = clean.toLowerCase();
  if (DEFAULT_DESIGNATION_META[lower]) {
    return DEFAULT_DESIGNATION_META[lower];
  }
  if (lower.includes('chief') || lower.includes('vp') || lower.includes('vice president')) {
    return { category: 'Executive', level: 10, description: `${clean} executive leadership role` };
  }
  if (lower.includes('director')) {
    return { category: 'Senior Management', level: 8, description: `${clean} strategic leadership role` };
  }
  if (lower.includes('manager') || lower.includes('lead') || lower.includes('head')) {
    return { category: 'Management', level: 6, description: `${clean} team leadership role` };
  }
  if (lower.includes('engineer') || lower.includes('developer') || lower.includes('qa') || lower.includes('devops')) {
    return { category: 'Engineering', level: 5, description: `${clean} technical engineering role` };
  }
  if (lower.includes('design') || lower.includes('ui/ux')) {
    return { category: 'Design', level: 5, description: `${clean} product & visual design role` };
  }
  if (lower.includes('hr') || lower.includes('recruit')) {
    return { category: 'HR', level: 5, description: `${clean} human resources role` };
  }
  if (lower.includes('marketing')) {
    return { category: 'Marketing', level: 5, description: `${clean} marketing & growth role` };
  }
  if (lower.includes('sales')) {
    return { category: 'Sales', level: 5, description: `${clean} sales & accounts role` };
  }
  if (lower.includes('finance') || lower.includes('account')) {
    return { category: 'Finance', level: 5, description: `${clean} finance & accounting role` };
  }
  if (lower.includes('intern') || lower.includes('trainee')) {
    return { category: 'Entry Level', level: 1, description: `${clean} trainee role` };
  }
  return { category: 'General', level: 5, description: `${clean} organizational role` };
};

/**
 * Resolve employee profile linked to the authenticated User (by ObjectId first, then email fallback).
 */
const resolveLinkedEmployee = async (user) => {
  if (!user) return null;
  const empId = user.employee?._id || user.employee;
  if (empId) {
    const byId = await Employee.findById(empId);
    if (byId) return byId;
  }
  if (user.email) {
    return Employee.findOne({
      email: { $regex: new RegExp(`^${escapeRegex(user.email.trim())}$`, 'i') },
    });
  }
  return null;
};

/**
 * Resolve all departments and employees managed by the authenticated Manager user.
 * Combines their assigned Employee.department AND any Department where they are set as Department.manager.
 */
const resolveManagerContext = async (user) => {
  const mgrEmp = await resolveLinkedEmployee(user);
  if (!mgrEmp) {
    return { mgrEmp: null, deptIds: [], deptIdStrings: [], teamEmployees: [], employeeIds: [] };
  }

  const managedDepts = await Department.find({ manager: mgrEmp._id }).select('_id').lean();
  const deptIdStrings = Array.from(
    new Set(
      [mgrEmp.department, ...managedDepts.map((d) => d._id)]
        .filter(Boolean)
        .map((id) => String(id))
    )
  );

  if (deptIdStrings.length === 0) {
    return { mgrEmp, deptIds: [], deptIdStrings: [], teamEmployees: [], employeeIds: [] };
  }

  const teamEmployees = await Employee.find({ department: { $in: deptIdStrings } })
    .select('_id firstName lastName employeeId designation department status')
    .lean();

  return {
    mgrEmp,
    deptIds: deptIdStrings,
    deptIdStrings,
    teamEmployees,
    employeeIds: teamEmployees.map((e) => e._id),
  };
};

/**
 * Check whether a target employee document or department ID falls within a manager's scoped departments.
 */
const isTargetEmployeeInManagerScope = async (user, targetEmployeeOrId) => {
  const ctx = await resolveManagerContext(user);
  if (!ctx.mgrEmp || ctx.deptIdStrings.length === 0) return false;
  let targetEmp = targetEmployeeOrId;
  if (targetEmployeeOrId && !targetEmployeeOrId.department) {
    targetEmp = await Employee.findById(targetEmployeeOrId).select('department').lean();
  }
  const targetDeptId = targetEmp?.department?._id || targetEmp?.department;
  if (!targetDeptId) return false;
  return ctx.deptIdStrings.includes(String(targetDeptId));
};

/**
 * Ensure a Designation document exists for a given designation string (case-insensitive)
 * and return its canonical name.
 */
const ensureDesignationExists = async (rawName) => {
  const clean = String(rawName || '').trim();
  if (!clean) return '';

  const existing = await Designation.findOne({
    name: { $regex: new RegExp(`^${escapeRegex(clean)}$`, 'i') },
  });
  if (existing) return existing.name;

  const meta = inferDesignationMeta(clean);
  const created = await Designation.create({
    name: clean,
    category: meta.category,
    level: meta.level,
    description: meta.description,
  });
  return created.name;
};

/**
 * Sync any Employee.designation strings missing from the Designation collection.
 */
const syncMissingDesignationsFromEmployees = async () => {
  const [employees, existingDesgs] = await Promise.all([
    Employee.find().select('designation').lean(),
    Designation.find().select('name').lean(),
  ]);

  const existingLower = new Set(existingDesgs.map((d) => String(d.name || '').trim().toLowerCase()));
  const created = [];

  for (const emp of employees) {
    const clean = String(emp.designation || '').trim();
    if (!clean) continue;
    const lower = clean.toLowerCase();
    if (existingLower.has(lower)) continue;

    existingLower.add(lower);
    const meta = inferDesignationMeta(clean);
    try {
      const doc = await Designation.create({
        name: clean,
        category: meta.category,
        level: meta.level,
        description: meta.description,
      });
      created.push(doc);
    } catch (err) {
      if (err?.code !== 11000) throw err;
    }
  }

  return created;
};

module.exports = {
  escapeRegex,
  inferDesignationMeta,
  resolveLinkedEmployee,
  resolveManagerContext,
  isTargetEmployeeInManagerScope,
  ensureDesignationExists,
  syncMissingDesignationsFromEmployees,
};
