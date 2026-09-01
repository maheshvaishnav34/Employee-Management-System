const mongoose = require('mongoose');

const PerformanceReviewSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: [true, 'Rating (1-5) is required'],
    },
    feedback: {
      type: String,
      required: [true, 'Feedback text is required'],
      trim: true,
    },
    reviewPeriod: {
      type: String,
      required: [true, 'Review period (e.g. Q1 2026) is required'],
      trim: true,
    },
    reviewDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('PerformanceReview', PerformanceReviewSchema);
