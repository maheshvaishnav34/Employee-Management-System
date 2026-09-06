const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getTrainings,
  createTraining,
  enrollTraining,
  updateProgress,
  deleteTraining,
} = require('../controllers/trainingController');

router.use(protect);

router.get('/', getTrainings);
router.post('/', authorize('admin', 'hr'), createTraining);
router.delete('/:id', authorize('admin', 'hr'), deleteTraining);
router.post('/:id/enroll', enrollTraining);
router.put('/:id/progress', updateProgress);

module.exports = router;
