const express = require('express');
const router = express.Router();
const {
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
} = require('../controllers/announcementController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Protect all routes under /api/announcements
router.use(protect);

router.get('/', getAnnouncements);
router.post('/', authorize('admin', 'hr', 'manager'), createAnnouncement);
router.delete('/:id', authorize('admin', 'hr', 'manager'), deleteAnnouncement);

module.exports = router;
