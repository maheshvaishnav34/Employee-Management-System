const Expense = require('../models/Expense');
const Employee = require('../models/Employee');

// @desc    Get expenses list
// @route   GET /api/expenses
// @access  Private
const getExpenses = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === 'employee') {
      const emp = await Employee.findOne({ email: req.user.email });
      if (!emp) return res.status(200).json({ success: true, count: 0, expenses: [] });
      query = { employee: emp._id };
    }

    const expenses = await Expense.find(query)
      .populate('employee', 'firstName lastName employeeId designation department')
      .populate('approvedBy', 'username email')
      .sort({ date: -1, createdAt: -1 });

    res.status(200).json({ success: true, count: expenses.length, expenses });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit an expense claim
// @route   POST /api/expenses
// @access  Private
const createExpense = async (req, res, next) => {
  try {
    const { title, amount, category, description, date } = req.body;
    if (!title || !amount || !category) {
      return res.status(400).json({ success: false, message: 'Title, amount, and category are required' });
    }

    const emp = await Employee.findOne({ email: req.user.email });
    if (!emp) return res.status(400).json({ success: false, message: 'No employee record linked to this session' });

    const expense = await Expense.create({
      employee: emp._id,
      title,
      amount,
      category,
      description: description || '',
      date: date || new Date(),
    });

    const populated = await Expense.findById(expense._id).populate('employee', 'firstName lastName employeeId');
    res.status(201).json({ success: true, expense: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve or Reject an expense claim
// @route   PUT /api/expenses/:id
// @access  Private (Admin/HR)
const updateExpense = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    if (!status) return res.status(400).json({ success: false, message: 'Status is required' });

    let expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense claim not found' });

    expense = await Expense.findByIdAndUpdate(
      req.params.id,
      {
        status,
        notes: notes || '',
        approvedBy: req.user._id,
        approvedDate: new Date(),
      },
      { new: true, runValidators: true }
    )
      .populate('employee', 'firstName lastName employeeId designation')
      .populate('approvedBy', 'username email');

    res.status(200).json({ success: true, expense });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete/Cancel an expense claim
// @route   DELETE /api/expenses/:id
// @access  Private
const deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense claim not found' });

    // Employee can only delete their own claims and only if they are still Pending
    if (req.user.role === 'employee') {
      const emp = await Employee.findOne({ email: req.user.email });
      if (!emp || expense.employee.toString() !== emp._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to delete this claim' });
      }
      if (expense.status !== 'Pending') {
        return res.status(400).json({ success: false, message: 'Cannot delete a claim that has already been processed' });
      }
    }

    await Expense.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Expense claim deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
};
