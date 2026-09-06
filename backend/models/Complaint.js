const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Please provide a title or subject for your complaint'],
      trim: true,
    },
    category: {
      type: String,
      enum: ['Workplace Issue', 'Harassment', 'Salary/Payroll Issue', 'Manager Conflict', 'Facility/IT', 'Other'],
      default: 'Workplace Issue',
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium',
    },
    description: {
      type: String,
      required: [true, 'Please describe the issue in detail'],
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['Pending', 'In Review', 'Resolved', 'Dismissed'],
      default: 'Pending',
    },
    resolutionNotes: {
      type: String,
      default: '',
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Complaint', complaintSchema);
