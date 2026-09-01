const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { getTeamInsights, getEmployeeInsight } = require('../controllers/performanceInsightController');

router.get('/team', protect, authorize('admin', 'hr', 'manager'), getTeamInsights);
router.get('/employee/:employeeId', protect, authorize('admin', 'hr', 'manager'), getEmployeeInsight);

module.exports = router;
