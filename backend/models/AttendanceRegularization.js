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
      default: null,
    },
    clockOut: {
      type: Date,
      required: true,
    },
    originalClockIn: {
      type: Date,
      default: null,
    },
    originalClockOut: {
      type: Date,
      default: null,
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
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AttendanceSession',
      default: null,
    },
    sessionNumber: {
      type: Number,
      default: null,
    },
    requestType: {
      type: String,
      enum: ['Correction', 'MissedPunch', 'AddSession'],
      default: 'Correction',
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate pending correction requests per employee, date, and session
AttendanceRegularizationSchema.index(
  { employee: 1, date: 1, sessionNumber: 1 },
  {
    name: 'uniq_pending_regularization_session',
    unique: true,
    partialFilterExpression: { status: 'Pending' },
  }
);

module.exports = mongoose.model('AttendanceRegularization', AttendanceRegularizationSchema);
