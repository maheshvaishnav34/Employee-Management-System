const mongoose = require('mongoose');

const CompanyDocumentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Document title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    category: {
      type: String,
      enum: ['Handbook', 'Policy', 'Contract', 'Benefit', 'Other'],
      default: 'Policy',
    },
    content: {
      type: String,
      required: [true, 'Document content is required'],
      trim: true,
    },
    isGlobal: {
      type: Boolean,
      default: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Uploader user reference is required'],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CompanyDocument', CompanyDocumentSchema);
