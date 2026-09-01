const express = require('express');
const router = express.Router();
const {
  getPayrolls,
  generatePayroll,
  updatePayroll,
  getPayrollById,
  getMyPayrolls,
} = require('../controllers/payrollController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect); // All routes require auth

router.get('/', getPayrolls);
router.get('/my', getMyPayrolls);
router.get('/:id', getPayrollById);

// HR/Admin routes
router.post('/generate', authorize('admin'), generatePayroll);
router.put('/:id', authorize('admin'), updatePayroll);

module.exports = router;
