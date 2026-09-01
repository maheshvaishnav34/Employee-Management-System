const express = require('express');
const router = express.Router();
const {
  clockIn,
  clockOut,
  getTodayStatus,
  getMyAttendanceLogs,
  getAllAttendanceLogs,
  requestRegularization,
  getMyRegularizations,
  getAllRegularizations,
  processRegularization,
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect); // All routes require auth

router.post('/clockin', clockIn);
router.post('/clockout', clockOut);
router.get('/today-status', getTodayStatus);
router.get('/my-logs', getMyAttendanceLogs);

// Attendance Regularization routes
router.post('/regularize', requestRegularization);
router.get('/regularize/my', getMyRegularizations);
router.get('/regularize/all', authorize('admin', 'hr', 'manager'), getAllRegularizations);
router.put('/regularize/:id', authorize('admin', 'hr', 'manager'), processRegularization);

// Only Admin/HR/Manager can see all attendance records
router.get('/logs', authorize('admin', 'hr', 'manager'), getAllAttendanceLogs);

module.exports = router;
