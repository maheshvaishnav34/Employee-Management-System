const express = require('express');
const router = express.Router();
const {
  getShifts,
  createShift,
  updateShift,
  deleteShift,
} = require('../controllers/shiftController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getShifts);
router.post('/', authorize('admin', 'hr', 'manager'), createShift);
router.put('/:id', authorize('admin', 'hr', 'manager'), updateShift);
router.delete('/:id', authorize('admin', 'hr', 'manager'), deleteShift);

module.exports = router;
