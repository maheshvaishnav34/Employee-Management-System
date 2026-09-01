const mongoose = require('mongoose');

const AttendanceRegularizationSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    clockIn: {
      type: Date,
      required: true,
    },
    clockOut: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      required: [true, 'Reason for correction is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    remarks: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate correction requests per employee per day
AttendanceRegularizationSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('AttendanceRegularization', AttendanceRegularizationSchema);
