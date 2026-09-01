const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { getPendingApprovals, approveLeave, approveCorrection } = require('../controllers/managerApprovalController');

router.get('/', protect, authorize('admin', 'hr', 'manager'), getPendingApprovals);
router.put('/leave/:id', protect, authorize('admin', 'hr', 'manager'), approveLeave);
router.put('/correction/:id', protect, authorize('admin', 'hr', 'manager'), approveCorrection);

module.exports = router;
