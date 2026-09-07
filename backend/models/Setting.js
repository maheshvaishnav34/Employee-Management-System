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
    employeeIdPrefix: {
      type: String,
      default: 'EMP',
      trim: true,
    },
    employeeIdDigits: {
      type: Number,
      default: 3,
    },
    employeeIdNextNumber: {
      type: Number,
      default: 107,
    },
    employeeIdSeparator: {
      type: String,
      default: 'None',
      trim: true,
    },
    autoGenerateEmployeeId: {
      type: Boolean,
      default: true,
    },
    allowCustomEmployeeId: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Setting', SettingSchema);
