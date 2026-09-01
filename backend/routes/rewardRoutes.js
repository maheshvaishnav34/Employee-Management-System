const express = require('express');
const router = express.Router();
const { getRewards, getMyRewards, getLeaderboard, giveReward, deleteReward } = require('../controllers/rewardController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getRewards);
router.get('/my', getMyRewards);
router.get('/leaderboard', getLeaderboard);
router.post('/', authorize('admin', 'hr', 'manager'), giveReward);
router.delete('/:id', authorize('admin', 'hr', 'manager'), deleteReward);

module.exports = router;
