const mongoose = require('mongoose');

const SettingSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      default: 'EMS Hub Technologies',
      trim: true,
    },
    contactEmail: {
      type: String,
      default: 'support@emshub.io',
      trim: true,
    },
    businessHours: {
      type: String,
      default: '09:00 AM - 06:00 PM',
      trim: true,
    },
    holidayPolicy: {
      type: String,
      default: 'Standard 12 Paid Holidays',
      trim: true,
    },
    enableBackups: {
      type: Boolean,
      default: true,
    },
    authLevel: {
      type: String,
      default: 'JWT + Role Rules',
      trim: true,
    },
    salaryRuleMin: {
      type: Number,
      default: 1000,
    },
    emailNotifications: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Setting', SettingSchema);
