const Shift = require('../models/Shift');
const Employee = require('../models/Employee');

// @desc    Get shifts schedule
// @route   GET /api/shifts
// @access  Private
const getShifts = async (req, res, next) => {
  try {
    let query = {};
    
    // If employee or requesting own shifts
    if (req.user.role === 'employee' || req.query.view === 'my') {
      let emp = null;
      if (req.user.employee) {
        emp = await Employee.findById(req.user.employee);
      }
      if (!emp && req.user.email) {
        emp = await Employee.findOne({ email: { $regex: new RegExp(`^${req.user.email.trim()}$`, 'i') } });
      }
      if (!emp) return res.status(200).json({ success: true, count: 0, shifts: [] });
      query.employee = emp._id;
    } else if (req.query.employee) {
      query.employee = req.query.employee;
    }

    if (req.query.type) {
      query.type = req.query.type;
    }

    if (req.query.date) {
      const d = new Date(req.query.date);
      d.setHours(0, 0, 0, 0);
      const nextDay = new Date(d);
      nextDay.setDate(d.getDate() + 1);
      query.date = { $gte: d, $lt: nextDay };
    }

    const shifts = await Shift.find(query)
      .populate('employee', 'firstName lastName employeeId designation department avatar email')
      .populate('scheduledBy', 'username email')
      .sort({ date: 1, startTime: 1 });

    res.status(200).json({ success: true, count: shifts.length, shifts });
  } catch (error) {
    next(error);
  }
};

// @desc    Schedule a shift
// @route   POST /api/shifts
// @access  Private (Admin/HR)
const createShift = async (req, res, next) => {
  try {
    const { employee, date, startTime, endTime, type, notes } = req.body;
    if (!employee || !date || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'Employee, date, startTime, and endTime are required' });
    }

    const shift = await Shift.create({
      employee,
      date,
      startTime,
      endTime,
      type: type || 'Morning',
      notes: notes || '',
      scheduledBy: req.user._id,
    });

    const populated = await Shift.findById(shift._id)
      .populate('employee', 'firstName lastName employeeId')
      .populate('scheduledBy', 'username');

    res.status(201).json({ success: true, shift: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a scheduled shift
// @route   PUT /api/shifts/:id
// @access  Private (Admin/HR)
const updateShift = async (req, res, next) => {
  try {
    let shift = await Shift.findById(req.params.id);
    if (!shift) return res.status(404).json({ success: false, message: 'Shift assignment not found' });

    shift = await Shift.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('employee', 'firstName lastName employeeId')
      .populate('scheduledBy', 'username');

    res.status(200).json({ success: true, shift });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a scheduled shift
// @route   DELETE /api/shifts/:id
// @access  Private (Admin/HR)
const deleteShift = async (req, res, next) => {
  try {
    const shift = await Shift.findById(req.params.id);
    if (!shift) return res.status(404).json({ success: false, message: 'Shift assignment not found' });
    await Shift.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Shift assignment deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getShifts,
  createShift,
  updateShift,
  deleteShift,
};
