const mongoose = require('mongoose');

const RewardSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    givenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    type: {
      type: String,
      enum: ['Badge', 'Points', 'Employee of Month', 'Certificate'],
      default: 'Points',
    },
    title: {
      type: String,
      required: [true, 'Reward title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    points: {
      type: Number,
      default: 0,
    },
    badge: {
      type: String,
      enum: ['Star Performer', 'Team Player', 'Innovation Award', 'Customer Champion', 'Leadership', 'Punctuality'],
      default: null,
    },
    month: {
      type: Number, // 1-12
    },
    year: {
      type: Number,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Reward', RewardSchema);
