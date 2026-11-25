const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema(
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
    },
    status: {
      type: String,
      enum: ['Present', 'Absent', 'Late', 'Half Day'],
      default: 'Present',
    },
    totalHours: {
      type: Number,
      default: 0,
    },
    workMode: {
      type: String,
      enum: ['Office', 'WFH', 'Hybrid'],
      default: 'Office',
    },
    overtimeHours: {
      type: Number,
      default: 0,
    },
    sessionCount: {
      type: Number,
      default: 0,
    },
    totalMinutes: {
      type: Number,
      default: 0,
    },
    breakMinutes: {
      type: Number,
      default: 0,
    },
    dailyStatus: {
      type: String,
      enum: [
        'Not Started',
        'Currently Working',
        'Between Sessions',
        'Completed Session',
        'Daily Target Completed',
        'Attendance Incomplete',
        'Daily Attendance Finalized',
      ],
      default: 'Not Started',
    },
    isFinalized: {
      type: Boolean,
      default: false,
    },
    finalizedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    finalizedAt: {
      type: Date,
      default: null,
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compounding index to prevent duplicate attendance logs per employee per day
AttendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
