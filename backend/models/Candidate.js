const mongoose = require('mongoose');

const CandidateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Candidate name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Candidate email is required'],
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    designation: {
      type: String,
      required: [true, 'Designation is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['Applied', 'Interview Scheduled', 'Hired', 'Rejected'],
      default: 'Applied',
    },
    interviewDate: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: '',
    },
    appliedDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Candidate', CandidateSchema);
