const ChatMessage = require('../models/ChatMessage');
const User = require('../models/User');

// @desc    Get active chat contacts list
// @route   GET /api/chat/users
// @access  Private
const getChatUsers = async (req, res, next) => {
  try {
    // Return all users except the currently logged-in user
    const users = await User.find({ _id: { $ne: req.user._id } })
      .select('username email role employee')
      .populate('employee', 'firstName lastName employeeId designation department status');

    res.status(200).json({ success: true, count: users.length, users });
  } catch (error) {
    next(error);
  }
};

// @desc    Get chat messages (Direct messages or Global channel)
// @route   GET /api/chat/messages
// @access  Private
const getChatMessages = async (req, res, next) => {
  try {
    const { recipientId, isGlobal } = req.query;

    let query = {};
    if (isGlobal === 'true') {
      query = { isGlobalChannel: true };
    } else {
      if (!recipientId) {
        return res.status(400).json({ success: false, message: 'recipientId or isGlobal is required' });
      }
      // Direct message query: sender -> recipient OR recipient -> sender
      query = {
        $or: [
          { sender: req.user._id, recipient: recipientId, isGlobalChannel: false },
          { sender: recipientId, recipient: req.user._id, isGlobalChannel: false }
        ]
      };
    }

    const messages = await ChatMessage.find(query)
      .populate('sender', 'username email role')
      .populate('recipient', 'username email role')
      .sort({ createdAt: 1 });

    res.status(200).json({ success: true, count: messages.length, messages });
  } catch (error) {
    next(error);
  }
};

// @desc    Send a chat message
// @route   POST /api/chat/messages
// @access  Private
const sendChatMessage = async (req, res, next) => {
  try {
    const { message, recipientId, isGlobal } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    let chatMsgData = {
      sender: req.user._id,
      message,
    };

    if (isGlobal === true) {
      chatMsgData.isGlobalChannel = true;
      chatMsgData.recipient = null;
    } else {
      if (!recipientId) {
        return res.status(400).json({ success: false, message: 'Recipient is required for direct messages' });
      }
      chatMsgData.recipient = recipientId;
      chatMsgData.isGlobalChannel = false;
    }

    const chatMessage = await ChatMessage.create(chatMsgData);

    const populated = await ChatMessage.findById(chatMessage._id)
      .populate('sender', 'username email role')
      .populate('recipient', 'username email role');

    res.status(201).json({ success: true, message: populated });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getChatUsers,
  getChatMessages,
  sendChatMessage,
};
