const express = require('express');
const router = express.Router();
const {
  clockIn,
  clockOut,
  getTodayStatus,
  getMyAttendanceLogs,
  getMySessions,
  getMyAttendanceSummary,
  getAllAttendanceLogs,
  getAttendanceSummary,
  getEmployeeAttendance,
  requestRegularization,
  getMyRegularizations,
  getAllRegularizations,
  processRegularization,
  manualPunchAdjustment,
  finalizeAttendanceDay,
  getMyHistorySummary,
  getWeeklySummary,
  getAllHistory,
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect); // All routes require auth

// Employee & authenticated punch portal routes
router.post('/clockin', clockIn);
router.post('/clockout', clockOut);
router.get('/today-status', getTodayStatus);
router.get('/my-logs', getMyAttendanceLogs);
router.get('/sessions', getMySessions);
router.get('/my-summary', getMyAttendanceSummary);
router.get('/my-history', getMyHistorySummary);
router.get('/weekly-summary', getWeeklySummary);

// Attendance Regularization routes
router.post('/regularize', requestRegularization);
router.get('/regularize/my', getMyRegularizations);
router.get('/regularize/all', authorize('admin', 'hr', 'manager'), getAllRegularizations);
router.put('/regularize/:id', authorize('admin', 'hr', 'manager'), processRegularization);

// Manager / HR / Admin Attendance Management routes
router.get('/summary', authorize('admin', 'hr', 'manager'), getAttendanceSummary);
router.get('/all-history', authorize('admin', 'hr', 'manager'), getAllHistory);
router.get('/logs', authorize('admin', 'hr', 'manager'), getAllAttendanceLogs);
router.get('/employee/:employeeId', authorize('admin', 'hr', 'manager'), getEmployeeAttendance);

// HR / Admin only controls (Manual adjustment & Daily finalization)
router.post('/manual-punch', authorize('admin', 'hr'), manualPunchAdjustment);
router.put('/:id/finalize', authorize('admin', 'hr'), finalizeAttendanceDay);

module.exports = router;
