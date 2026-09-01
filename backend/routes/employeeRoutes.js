const express = require('express');
const router = express.Router();
const {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getMyProfile,
  updateMyProfile,
  getDirectory,
} = require('../controllers/employeeController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect); // All routes require auth

// Self-profile routes (all authenticated users can access their own record)
router.get('/me', getMyProfile);
router.put('/me', updateMyProfile);

// Public employee directory (all authenticated roles)
router.get('/directory', getDirectory);

router
  .route('/')
  .get(authorize('admin', 'hr', 'manager'), getEmployees)
  .post(authorize('admin', 'hr'), createEmployee);

router
  .route('/:id')
  .get(authorize('admin', 'hr', 'manager'), getEmployeeById)
  .put(authorize('admin', 'hr'), updateEmployee)
  .delete(authorize('admin'), deleteEmployee);

module.exports = router;
