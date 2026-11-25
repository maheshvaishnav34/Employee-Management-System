const SkillMatrix = require('../models/SkillMatrix');
const Employee = require('../models/Employee');
const { resolveManagerContext, isTargetEmployeeInManagerScope } = require('../utils/orgHelper');

// @desc    Get skill matrix for a specific employee
// @route   GET /api/skills/:employeeId
// @access  Private (Manager, HR, Admin)
const getEmployeeSkills = async (req, res, next) => {
  try {
    const { employeeId } = req.params;

    let skillMatrix = await SkillMatrix.findOne({ employee: employeeId })
      .populate('employee', 'firstName lastName employeeId designation')
      .populate('skills.endorsedBy', 'username email');

    if (!skillMatrix) {
      // Return empty matrix
      const employee = await Employee.findById(employeeId).select('firstName lastName employeeId designation');
      if (!employee) {
        return res.status(404).json({ success: false, message: 'Employee not found' });
      }
      return res.status(200).json({ success: true, skillMatrix: { employee, skills: [], trainingRecommendations: [] } });
    }

    res.status(200).json({ success: true, skillMatrix });
  } catch (error) {
    next(error);
  }
};

// @desc    Get skill matrix for the manager's entire team
// @route   GET /api/skills/team
// @access  Private (Manager, HR, Admin)
const getTeamSkillMatrix = async (req, res, next) => {
  try {
    let employeeFilter = {};

    if (req.user.role === 'manager') {
      const ctx = await resolveManagerContext(req.user);
      if (!ctx.mgrEmp || ctx.employeeIds.length === 0) {
        return res.status(200).json({ success: true, teamSkills: [] });
      }
      const teamEmployees = ctx.teamEmployees;
      const teamIds = ctx.employeeIds;
      employeeFilter = { employee: { $in: teamIds } };

      // Return all team employees with their skill data (even if no entry yet)
      const skillMatrices = await SkillMatrix.find(employeeFilter).populate('employee', 'firstName lastName employeeId designation');
      const existingIds = skillMatrices.map(sm => sm.employee._id.toString());
      const missingEmployees = teamEmployees.filter(e => !existingIds.includes(e._id.toString()));
      const emptyMatrices = missingEmployees.map(e => ({ employee: e, skills: [], trainingRecommendations: [] }));

      return res.status(200).json({ success: true, teamSkills: [...skillMatrices, ...emptyMatrices] });
    }

    // Admin / HR: all employees
    const allEmployees = await Employee.find({ status: 'Active' }).select('_id firstName lastName employeeId designation');
    const skillMatrices = await SkillMatrix.find({}).populate('employee', 'firstName lastName employeeId designation');
    const existingIds = skillMatrices.map(sm => sm.employee._id.toString());
    const missingEmployees = allEmployees.filter(e => !existingIds.includes(e._id.toString()));
    const emptyMatrices = missingEmployees.map(e => ({ employee: e, skills: [], trainingRecommendations: [] }));

    res.status(200).json({ success: true, teamSkills: [...skillMatrices, ...emptyMatrices] });
  } catch (error) {
    next(error);
  }
};

// @desc    Update skill matrix for an employee
// @route   PUT /api/skills/:employeeId
// @access  Private (Manager, HR, Admin)
const updateSkillMatrix = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const { skills, trainingRecommendations } = req.body;

    // Validate employee exists
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Manager can only update their own team
    if (req.user.role === 'manager') {
      const inScope = await isTargetEmployeeInManagerScope(req.user, employee);
      if (!inScope) {
        return res.status(403).json({ success: false, message: 'Not authorized to update skills outside your department' });
      }
    }

    // Attach endorsement info to each skill
    const skillsWithEndorsement = (skills || []).map(skill => ({
      skillName: skill.skillName,
      level: skill.level,
      endorsedBy: req.user._id,
      endorsedAt: new Date(),
    }));

    const skillMatrix = await SkillMatrix.findOneAndUpdate(
      { employee: employeeId },
      {
        employee: employeeId,
        skills: skillsWithEndorsement,
        trainingRecommendations: trainingRecommendations || [],
        lastUpdatedBy: req.user._id,
      },
      { new: true, upsert: true }
    ).populate('employee', 'firstName lastName employeeId designation');

    res.status(200).json({ success: true, message: 'Skill matrix updated successfully', skillMatrix });
  } catch (error) {
    next(error);
  }
};

// @desc    Add a single skill to employee
// @route   POST /api/skills/:employeeId/add
// @access  Private (Manager, HR, Admin)
const addSkill = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const { skillName, level } = req.body;

    if (!skillName || !level) {
      return res.status(400).json({ success: false, message: 'Skill name and level are required' });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    let skillMatrix = await SkillMatrix.findOne({ employee: employeeId });
    if (!skillMatrix) {
      skillMatrix = await SkillMatrix.create({ employee: employeeId, skills: [], lastUpdatedBy: req.user._id });
    }

    // Check if skill already exists
    const existingIdx = skillMatrix.skills.findIndex(s => s.skillName.toLowerCase() === skillName.toLowerCase());
    if (existingIdx >= 0) {
      skillMatrix.skills[existingIdx].level = level;
      skillMatrix.skills[existingIdx].endorsedBy = req.user._id;
      skillMatrix.skills[existingIdx].endorsedAt = new Date();
    } else {
      skillMatrix.skills.push({ skillName, level, endorsedBy: req.user._id, endorsedAt: new Date() });
    }

    skillMatrix.lastUpdatedBy = req.user._id;
    await skillMatrix.save();

    res.status(200).json({ success: true, message: 'Skill added/updated successfully', skillMatrix });
  } catch (error) {
    next(error);
  }
};

module.exports = { getEmployeeSkills, getTeamSkillMatrix, updateSkillMatrix, addSkill };
