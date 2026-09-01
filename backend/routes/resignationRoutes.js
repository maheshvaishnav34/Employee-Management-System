const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { submitResignation, getMyResignation, getAllResignations, updateResignationStatus, updateHandoverItem } = require('../controllers/resignationController');

router.post('/', protect, submitResignation);
router.get('/my', protect, getMyResignation);
router.get('/', protect, authorize('admin', 'hr', 'manager'), getAllResignations);
router.put('/:id/status', protect, authorize('admin', 'hr', 'manager'), updateResignationStatus);
router.put('/:id/checklist/:itemId', protect, updateHandoverItem);

module.exports = router;
