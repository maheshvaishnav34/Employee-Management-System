const express = require('express');
const router = express.Router();
const { getNotificationData, streamNotifications } = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/authMiddleware');

// REST: get current notification snapshot
// GET /api/notifications/data
router.get('/data', protect, getNotificationData);

// SSE: subscribe to real-time notification stream
// GET /api/notifications/stream
// Note: EventSource can't send custom headers, so we read token from query param
router.get('/stream', (req, res, next) => {
  // Accept token via query param for SSE (browsers can't set headers on EventSource)
  const jwt = require('jsonwebtoken');
  const User = require('../models/User');
  const token = req.query.token;

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecret_ems_key_2026');
    User.findById(decoded.id).select('-password').then((user) => {
      if (!user) {
        return res.status(401).json({ success: false, message: 'User not found' });
      }
      req.user = user;
      streamNotifications(req, res);
    }).catch(next);
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

module.exports = router;
