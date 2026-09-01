const mongoose = require('mongoose');

const HandoverItemSchema = new mongoose.Schema({
  item: {
    type: String,
    required: true,
    trim: true,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  completedAt: {
    type: Date,
    default: null,
  },
});

const ResignationSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    resignationDate: {
      type: Date,
      default: Date.now,
    },
    lastWorkingDay: {
      type: Date,
      required: [true, 'Last working day is required'],
    },
    reason: {
      type: String,
      required: [true, 'Resignation reason is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Withdrawn'],
      default: 'Pending',
    },
    managerFeedback: {
      type: String,
      default: '',
      trim: true,
    },
    handoverChecklist: {
      type: [HandoverItemSchema],
      default: [
        { item: 'Complete all pending tasks and document status' },
        { item: 'Handover project files and documentation' },
        { item: 'Return company assets (laptop, ID card, etc.)' },
        { item: 'Knowledge transfer session with replacement/team' },
        { item: 'Clear email and communication channels' },
        { item: 'Complete exit interview with HR' },
      ],
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Resignation', ResignationSchema);
