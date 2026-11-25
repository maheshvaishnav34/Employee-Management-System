const mongoose = require('mongoose');

const AttendanceSessionSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    attendance: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Attendance',
      required: true,
      index: true,
    },
    attendanceDate: {
      type: Date,
      required: true,
      index: true,
    },
    sessionNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    clockInTime: {
      type: Date,
      required: true,
    },
    clockOutTime: {
      type: Date,
      default: null,
    },
    durationMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    durationHours: {
      type: Number,
      default: 0,
      min: 0,
    },
    workMode: {
      type: String,
      enum: ['Office', 'WFH', 'Hybrid'],
      default: 'Office',
    },
    status: {
      type: String,
      enum: ['Active', 'Completed', 'Incomplete', 'Adjusted'],
      default: 'Active',
    },
    isManual: {
      type: Boolean,
      default: false,
    },
    adjustedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate session numbers for the same employee on the same attendance date
AttendanceSessionSchema.index(
  { employee: 1, attendanceDate: 1, sessionNumber: 1 },
  { unique: true }
);

// Concurrency guard: guarantee at most one Active session per employee at any moment
AttendanceSessionSchema.index(
  { employee: 1 },
  {
    name: 'uniq_active_session_per_employee',
    unique: true,
    partialFilterExpression: { status: 'Active' },
  }
);

AttendanceSessionSchema.index({ attendance: 1, sessionNumber: 1 });
AttendanceSessionSchema.index({ attendanceDate: -1, employee: 1 });

module.exports = mongoose.model('AttendanceSession', AttendanceSessionSchema);
