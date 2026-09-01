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
router.post('/', authorize('admin', 'hr'), createAnnouncement);
router.delete('/:id', authorize('admin', 'hr'), deleteAnnouncement);

module.exports = router;
