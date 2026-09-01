const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getAuditLogs,
  getAllUsers,
  changeUserRole,
  getReport,
  getAdminOverview,
  getSystemSettings,
  updateSystemSettings,
  exportBackup,
  importBackup,
} = require('../controllers/adminController');


// Admin only guard
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  res.status(403).json({ success: false, message: 'Admin access required' });
};

// HR or Admin or Manager access
const isHRorAdminOrManager = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'hr' || req.user.role === 'manager')) return next();
  res.status(403).json({ success: false, message: 'Unauthorized access' });
};

router.get('/overview', protect, isAdmin, getAdminOverview);
router.get('/audit-logs', protect, isAdmin, getAuditLogs);
router.get('/users', protect, isAdmin, getAllUsers);
router.put('/users/:id/role', protect, isAdmin, changeUserRole);
router.get('/reports/:type', protect, isHRorAdminOrManager, getReport);
router.get('/settings', protect, isAdmin, getSystemSettings);
router.put('/settings', protect, isAdmin, updateSystemSettings);
router.get('/backup', protect, isAdmin, exportBackup);
router.post('/restore', protect, isAdmin, importBackup);

module.exports = router;
