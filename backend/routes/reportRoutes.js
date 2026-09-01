const express = require('express');
const router = express.Router();
const {
  getEmployeeReport,
  getAttendanceReport,
  getLeaveReport,
  getDepartmentStatistics,
  getDashboardStatistics,
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes require authentication and manager/hr/admin role
router.use(protect);
router.use(authorize('admin', 'hr', 'manager'));

router.get('/employees', getEmployeeReport);
router.get('/attendance', getAttendanceReport);
router.get('/leaves', getLeaveReport);
router.get('/departments', getDepartmentStatistics);
router.get('/dashboard', getDashboardStatistics);

module.exports = router;
