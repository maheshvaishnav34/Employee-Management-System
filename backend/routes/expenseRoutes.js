const express = require('express');
const router = express.Router();
const {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} = require('../controllers/expenseController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getExpenses);
router.post('/', createExpense);
router.put('/:id', authorize('admin', 'hr', 'manager'), updateExpense);
router.delete('/:id', deleteExpense);

module.exports = router;
