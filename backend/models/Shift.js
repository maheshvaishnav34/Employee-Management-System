const mongoose = require('mongoose');

const ShiftSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee is required'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      trim: true,
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['Morning', 'Evening', 'Night', 'On-Call'],
      default: 'Morning',
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    scheduledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Scheduler is required'],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Shift', ShiftSchema);
