const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender is required'],
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null means global channel
    },
    message: {
      type: String,
      required: [true, 'Message text is required'],
      trim: true,
    },
    isGlobalChannel: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ChatMessage', ChatMessageSchema);
