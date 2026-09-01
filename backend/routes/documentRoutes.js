const express = require('express');
const router = express.Router();
const {
  getDocuments,
  createDocument,
  deleteDocument,
} = require('../controllers/documentController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getDocuments);
router.post('/', authorize('admin', 'hr', 'manager'), createDocument);
router.delete('/:id', authorize('admin', 'hr', 'manager'), deleteDocument);

module.exports = router;
