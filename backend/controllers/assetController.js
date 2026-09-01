const Asset = require('../models/Asset');
const AssetRequest = require('../models/AssetRequest');
const Employee = require('../models/Employee');

// @desc    Get assets list
// @route   GET /api/assets
// @access  Private
const getAssets = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === 'employee') {
      const emp = await Employee.findOne({ email: req.user.email });
      if (!emp) return res.status(200).json({ success: true, count: 0, assets: [] });
      query = { assignedTo: emp._id };
    }

    const assets = await Asset.find(query)
      .populate('assignedTo', 'firstName lastName employeeId designation')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: assets.length, assets });
  } catch (error) {
    next(error);
  }
};

// @desc    Create an asset record
// @route   POST /api/assets
// @access  Private (Admin/HR)
const createAsset = async (req, res, next) => {
  try {
    const { name, serialNumber, category, value, condition, status, assignedTo } = req.body;
    if (!name || !serialNumber || !category) {
      return res.status(400).json({ success: false, message: 'Name, serial number, and category are required' });
    }

    const exists = await Asset.findOne({ serialNumber });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Asset with this serial number already exists' });
    }

    const asset = await Asset.create({
      name,
      serialNumber,
      category,
      value: value || 0,
      condition: condition || 'Good',
      status: status || 'Available',
      assignedTo: assignedTo || null,
      assignedDate: assignedTo ? new Date() : null,
    });

    const populated = await Asset.findById(asset._id).populate('assignedTo', 'firstName lastName employeeId');
    res.status(201).json({ success: true, asset: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Update asset details
// @route   PUT /api/assets/:id
// @access  Private (Admin/HR)
const updateAsset = async (req, res, next) => {
  try {
    let asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });

    if (req.body.assignedTo !== undefined) {
      if (req.body.assignedTo === '' || req.body.assignedTo === null) {
        req.body.assignedTo = null;
        req.body.assignedDate = null;
        if (asset.status === 'Assigned') {
          req.body.status = 'Available';
        }
      } else {
        req.body.assignedDate = new Date();
        req.body.status = 'Assigned';
      }
    }

    asset = await Asset.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('assignedTo', 'firstName lastName employeeId');

    res.status(200).json({ success: true, asset });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete asset
// @route   DELETE /api/assets/:id
// @access  Private (Admin/HR)
const deleteAsset = async (req, res, next) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });
    await Asset.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Asset record deleted' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get equipment requests list
// @route   GET /api/assets/requests
// @access  Private
const getAssetRequests = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === 'employee') {
      const emp = await Employee.findOne({ email: req.user.email });
      if (!emp) return res.status(200).json({ success: true, count: 0, requests: [] });
      query = { employee: emp._id };
    }

    const requests = await AssetRequest.find(query)
      .populate('employee', 'firstName lastName employeeId designation department')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: requests.length, requests });
  } catch (error) {
    next(error);
  }
};

// @desc    Create equipment request
// @route   POST /api/assets/requests
// @access  Private
const createAssetRequest = async (req, res, next) => {
  try {
    const { assetCategory, reason, urgency } = req.body;
    if (!assetCategory || !reason) {
      return res.status(400).json({ success: false, message: 'Asset category and reason are required' });
    }

    const emp = await Employee.findOne({ email: req.user.email });
    if (!emp) return res.status(400).json({ success: false, message: 'No employee record linked to this user session' });

    const request = await AssetRequest.create({
      employee: emp._id,
      assetCategory,
      reason,
      urgency: urgency || 'Medium',
    });

    const populated = await AssetRequest.findById(request._id).populate('employee', 'firstName lastName employeeId');
    res.status(201).json({ success: true, request: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve/reject equipment request
// @route   PUT /api/assets/requests/:id
// @access  Private (Admin/HR)
const updateAssetRequest = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    if (!status) return res.status(400).json({ success: false, message: 'Status is required' });

    let request = await AssetRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Asset request not found' });

    request = await AssetRequest.findByIdAndUpdate(
      req.params.id,
      { status, notes: notes || '' },
      { new: true, runValidators: true }
    ).populate('employee', 'firstName lastName employeeId');

    res.status(200).json({ success: true, request });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAssets,
  createAsset,
  updateAsset,
  deleteAsset,
  getAssetRequests,
  createAssetRequest,
  updateAssetRequest,
};
