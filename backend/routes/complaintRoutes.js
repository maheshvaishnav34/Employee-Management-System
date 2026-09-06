const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  createComplaint,
  getMyComplaints,
  getAllComplaints,
  updateComplaintStatus,
} = require('../controllers/complaintController');

router.use(protect);

router.post('/', createComplaint);
router.get('/my', getMyComplaints);
router.get('/', authorize('admin', 'hr', 'manager'), getAllComplaints);
router.put('/:id/status', authorize('admin', 'hr', 'manager'), updateComplaintStatus);

module.exports = router;
