const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee is required'],
    },
    title: {
      type: String,
      required: [true, 'Expense title is required'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    category: {
      type: String,
      enum: ['Travel', 'Office Supplies', 'Meals', 'Client Entertainment', 'Software/Subscriptions', 'Other'],
      required: [true, 'Category is required'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    date: {
      type: Date,
      required: [true, 'Expense date is required'],
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedDate: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Expense', ExpenseSchema);
