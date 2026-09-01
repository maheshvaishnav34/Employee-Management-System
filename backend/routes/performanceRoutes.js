const express = require('express');
const router = express.Router();
const { getReviews, createReview } = require('../controllers/performanceController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getReviews)
  .post(authorize('admin', 'hr', 'manager'), createReview);

module.exports = router;
