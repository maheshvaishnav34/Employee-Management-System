const express = require('express');
const router = express.Router();
const {
  getAssets,
  createAsset,
  updateAsset,
  deleteAsset,
  getAssetRequests,
  createAssetRequest,
  updateAssetRequest,
} = require('../controllers/assetController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getAssets);
router.post('/', authorize('admin', 'hr'), createAsset);
router.put('/:id', authorize('admin', 'hr'), updateAsset);
router.delete('/:id', authorize('admin', 'hr'), deleteAsset);

router.get('/requests', getAssetRequests);
router.post('/requests', createAssetRequest);
router.put('/requests/:id', authorize('admin', 'hr', 'manager'), updateAssetRequest);

module.exports = router;
