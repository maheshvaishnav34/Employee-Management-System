const mongoose = require('mongoose');

const PayrollSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    month: {
      type: String, // format: YYYY-MM (e.g. "2026-06")
      required: true,
    },
    baseSalary: {
      type: Number,
      required: true,
    },
    bonuses: {
      type: Number,
      default: 0,
    },
    deductions: {
      type: Number,
      default: 0,
    },
    netSalary: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['Paid', 'Unpaid'],
      default: 'Unpaid',
    },
    paymentDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate payroll entries for same employee in same month
PayrollSchema.index({ employee: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Payroll', PayrollSchema);
