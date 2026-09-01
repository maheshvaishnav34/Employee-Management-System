const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { getEmployeeSkills, getTeamSkillMatrix, updateSkillMatrix, addSkill } = require('../controllers/skillMatrixController');

router.get('/team', protect, authorize('admin', 'hr', 'manager'), getTeamSkillMatrix);
router.get('/:employeeId', protect, authorize('admin', 'hr', 'manager'), getEmployeeSkills);
router.put('/:employeeId', protect, authorize('admin', 'hr', 'manager'), updateSkillMatrix);
router.post('/:employeeId/add', protect, authorize('admin', 'hr', 'manager'), addSkill);

module.exports = router;
