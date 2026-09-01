const mongoose = require('mongoose');

const SkillEntrySchema = new mongoose.Schema({
  skillName: {
    type: String,
    required: true,
    trim: true,
  },
  level: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Expert'],
    default: 'Beginner',
  },
  endorsedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  endorsedAt: {
    type: Date,
    default: null,
  },
});

const SkillMatrixSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      unique: true,
    },
    skills: [SkillEntrySchema],
    trainingRecommendations: {
      type: [String],
      default: [],
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SkillMatrix', SkillMatrixSchema);
