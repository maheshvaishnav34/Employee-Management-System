const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  enrolledAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['Enrolled', 'In Progress', 'Completed', 'Dropped'],
    default: 'Enrolled',
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  completionDate: {
    type: Date,
  },
  notes: {
    type: String,
    default: '',
  },
});

const trainingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a training title'],
      trim: true,
    },
    category: {
      type: String,
      enum: ['Technical', 'Leadership', 'Compliance', 'Soft Skills', 'Safety', 'HR Onboarding'],
      default: 'Technical',
    },
    description: {
      type: String,
      required: [true, 'Please provide a description of the program'],
    },
    instructor: {
      type: String,
      default: 'Internal L&D Team',
    },
    duration: {
      type: String,
      default: '2 Weeks',
    },
    mode: {
      type: String,
      enum: ['Online', 'Classroom', 'Hybrid'],
      default: 'Online',
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    capacity: {
      type: Number,
      default: 50,
    },
    enrollments: [enrollmentSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Training', trainingSchema);
