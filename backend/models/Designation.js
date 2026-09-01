const mongoose = require('mongoose');

const DesignationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Designation name is required'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    level: {
      type: Number,
      default: 5,
      min: 1,
      max: 10,
    },
    category: {
      type: String,
      default: 'General',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Designation', DesignationSchema);
