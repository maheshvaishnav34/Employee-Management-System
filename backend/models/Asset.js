const mongoose = require('mongoose');

const AssetSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Asset name is required'],
      trim: true,
    },
    serialNumber: {
      type: String,
      required: [true, 'Serial number is required'],
      unique: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['Laptop', 'Monitor', 'Keyboard', 'Mouse', 'Phone', 'Headset', 'License', 'Other'],
      required: [true, 'Category is required'],
    },
    status: {
      type: String,
      enum: ['Available', 'Assigned', 'Under Repair', 'Retired'],
      default: 'Available',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    assignedDate: {
      type: Date,
      default: null,
    },
    value: {
      type: Number,
      default: 0,
    },
    condition: {
      type: String,
      enum: ['New', 'Good', 'Fair', 'Poor'],
      default: 'Good',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Asset', AssetSchema);
