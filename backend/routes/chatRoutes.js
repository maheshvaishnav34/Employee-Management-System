const express = require('express');
const router = express.Router();
const {
  getChatUsers,
  getChatMessages,
  sendChatMessage,
} = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/users', getChatUsers);
router.get('/messages', getChatMessages);
router.post('/messages', sendChatMessage);

module.exports = router;
