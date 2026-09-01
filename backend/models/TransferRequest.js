const mongoose = require('mongoose');

const TransferRequestSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    fromDepartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },
    toDepartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },
    reason: {
      type: String,
      required: [true, 'Reason for transfer is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    recommendedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    comments: {
      type: String,
      default: '',
      trim: true,
    },
    effectiveDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TransferRequest', TransferRequestSchema);
