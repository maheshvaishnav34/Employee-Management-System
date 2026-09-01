const express = require('express');
const router = express.Router();
const {
  logMood,
  getMoodToday,
  getMoodAnalytics,
  createPoll,
  getActivePoll,
  votePoll,
  getAllPolls,
  togglePoll,
} = require('../controllers/engagementController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes are protected
router.use(protect);

// Mood Routes
router.post('/mood', logMood);
router.get('/mood/today', getMoodToday);
router.get('/mood/analytics', authorize('admin', 'hr', 'manager'), getMoodAnalytics);

// Poll Routes
router.post('/polls', authorize('admin', 'hr', 'manager'), createPoll);
router.get('/polls/active', getActivePoll);
router.post('/polls/:id/vote', votePoll);
router.get('/polls/all', authorize('admin', 'hr', 'manager'), getAllPolls);
router.put('/polls/:id/toggle', authorize('admin', 'hr', 'manager'), togglePoll);

module.exports = router;
