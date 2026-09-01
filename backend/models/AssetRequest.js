const mongoose = require('mongoose');

const AssetRequestSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee is required'],
    },
    assetCategory: {
      type: String,
      enum: ['Laptop', 'Monitor', 'Keyboard', 'Mouse', 'Phone', 'Headset', 'License', 'Other'],
      required: [true, 'Asset category is required'],
    },
    reason: {
      type: String,
      required: [true, 'Reason is required'],
      trim: true,
    },
    urgency: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium',
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    requestDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AssetRequest', AssetRequestSchema);
