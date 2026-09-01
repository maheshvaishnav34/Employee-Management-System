const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { createTransferRequest, getAllTransfers, updateTransferStatus, getTransferById } = require('../controllers/transferController');

router.post('/', protect, authorize('admin', 'hr', 'manager'), createTransferRequest);
router.get('/', protect, authorize('admin', 'hr', 'manager'), getAllTransfers);
router.get('/:id', protect, authorize('admin', 'hr', 'manager'), getTransferById);
router.put('/:id/status', protect, authorize('admin', 'hr'), updateTransferStatus);

module.exports = router;
