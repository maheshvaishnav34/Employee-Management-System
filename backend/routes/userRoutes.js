const express = require('express');
const router = express.Router();
const { addUser } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/users', protect, authorize('admin'), addUser);

module.exports = router;
