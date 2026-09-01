const mongoose = require('mongoose');

const MoodSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee reference is required'],
    },
    dateString: {
      type: String,
      required: [true, 'Date string is required'],
    },
    mood: {
      type: String,
      enum: ['excellent', 'good', 'neutral', 'tired', 'stressed'],
      required: [true, 'Mood value is required'],
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

// Enforce unique mood submission per employee per day
MoodSchema.index({ employee: 1, dateString: 1 }, { unique: true });

module.exports = mongoose.model('Mood', MoodSchema);
