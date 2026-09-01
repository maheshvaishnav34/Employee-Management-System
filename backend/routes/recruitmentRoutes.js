const express = require('express');
const router = express.Router();
const { getCandidates, createCandidate, updateCandidate } = require('../controllers/recruitmentController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('admin', 'hr', 'manager'));

router.route('/')
  .get(getCandidates)
  .post(createCandidate);

router.route('/:id')
  .put(updateCandidate);

module.exports = router;
