const mongoose = require('mongoose');

const VoteSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  optionIndex: {
    type: Number,
    required: true,
  },
  votedAt: {
    type: Date,
    default: Date.now,
  },
});

const PollSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, 'Poll question is required'],
      trim: true,
    },
    options: {
      type: [String],
      validate: {
        validator: function (val) {
          return val && val.length >= 2;
        },
        message: 'A poll must have at least 2 options',
      },
      required: [true, 'Poll options are required'],
    },
    votes: [VoteSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator reference is required'],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Poll', PollSchema);
