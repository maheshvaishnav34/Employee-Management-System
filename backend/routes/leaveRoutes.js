const express = require('express');
const router = express.Router();
const {
  applyLeave,
  getMyLeaves,
  getAllLeaves,
  updateLeaveStatus,
  getLeaveBalances,
} = require('../controllers/leaveController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect); // All routes require auth

router.post('/apply', applyLeave);
router.get('/my-leaves', getMyLeaves);
router.get('/balances', getLeaveBalances);

// HR/Admin/Manager routes
router.get('/', authorize('admin', 'hr', 'manager'), getAllLeaves);
router.put('/:id/status', authorize('admin', 'hr', 'manager'), updateLeaveStatus);

module.exports = router;
