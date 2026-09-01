const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Assigned employee is required'],
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    dueDate: {
      type: Date,
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
    },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed', 'Cancelled'],
      default: 'Pending',
    },
    completedAt: {
      type: Date,
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Task', TaskSchema);
