const express = require('express');
const router = express.Router();
const {
  getDesignations,
  getDesignationById,
  createDesignation,
  updateDesignation,
  deleteDesignation,
  getDesignationsByCategory,
} = require('../controllers/designationController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect); // All routes require authentication

router
  .route('/')
  .get(getDesignations)
  .post(authorize('admin'), createDesignation);

router.get('/hierarchy/categories', getDesignationsByCategory);

router
  .route('/:id')
  .get(getDesignationById)
  .put(authorize('admin'), updateDesignation)
  .delete(authorize('admin'), deleteDesignation);

module.exports = router;
