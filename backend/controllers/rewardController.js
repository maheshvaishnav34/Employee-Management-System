const Reward = require('../models/Reward');
const Employee = require('../models/Employee');

// @desc    Get all rewards (employee sees own)
// @route   GET /api/rewards
// @access  Private
const getRewards = async (req, res, next) => {
  try {
    let query = {};

    if (req.user.role === 'employee') {
      const emp = await Employee.findOne({ email: req.user.email });
      if (!emp) return res.status(200).json({ success: true, count: 0, rewards: [] });
      query = { employee: emp._id };
    }

    const rewards = await Reward.find(query)
      .populate('employee', 'firstName lastName employeeId designation department')
      .populate('givenBy', 'username email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: rewards.length, rewards });
  } catch (error) {
    next(error);
  }
};

// @desc    Get my rewards
// @route   GET /api/rewards/my
// @access  Private (All)
const getMyRewards = async (req, res, next) => {
  try {
    const emp = await Employee.findOne({ email: req.user.email });
    if (!emp) return res.status(200).json({ success: true, totalPoints: 0, rewards: [] });

    const rewards = await Reward.find({ employee: emp._id })
      .populate('givenBy', 'username email')
      .sort({ createdAt: -1 });

    const totalPoints = rewards.reduce((sum, r) => sum + (r.points || 0), 0);

    res.status(200).json({ success: true, totalPoints, rewards });
  } catch (error) {
    next(error);
  }
};

// @desc    Get leaderboard (top reward earners)
// @route   GET /api/rewards/leaderboard
// @access  Private (All)
const getLeaderboard = async (req, res, next) => {
  try {
    const leaderboard = await Reward.aggregate([
      { $group: { _id: '$employee', totalPoints: { $sum: '$points' }, count: { $sum: 1 } } },
      { $sort: { totalPoints: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'employees',
          localField: '_id',
          foreignField: '_id',
          as: 'employee',
        },
      },
      { $unwind: { path: '$employee', preserveNullAndEmptyArrays: false } },
      {
        $project: {
          totalPoints: 1,
          count: 1,
          'employee.firstName': 1,
          'employee.lastName': 1,
          'employee.employeeId': 1,
          'employee.designation': 1,
        },
      },
    ]);

    res.status(200).json({ success: true, leaderboard });
  } catch (error) {
    next(error);
  }
};

// @desc    Give a reward to an employee
// @route   POST /api/rewards
// @access  Private (HR+)
const giveReward = async (req, res, next) => {
  try {
    const { employee, type, title, description, points, badge, month, year } = req.body;

    if (!employee || !title) {
      return res.status(400).json({ success: false, message: 'Employee and title are required' });
    }

    const reward = await Reward.create({
      employee,
      givenBy: req.user._id,
      type: type || 'Points',
      title,
      description: description || '',
      points: points || 0,
      badge: badge || undefined,
      month: month || new Date().getMonth() + 1,
      year: year || new Date().getFullYear(),
    });

    const populated = await Reward.findById(reward._id)
      .populate('employee', 'firstName lastName employeeId designation')
      .populate('givenBy', 'username email');

    res.status(201).json({ success: true, reward: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete reward
// @route   DELETE /api/rewards/:id
// @access  Private (Admin+)
const deleteReward = async (req, res, next) => {
  try {
    await Reward.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Reward deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getRewards, getMyRewards, getLeaderboard, giveReward, deleteReward };
