const Mood = require('../models/Mood');
const Poll = require('../models/Poll');
const Employee = require('../models/Employee');

// Helper to get local date string YYYY-MM-DD
const getLocalDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// @desc    Log daily mood
// @route   POST /api/engagement/mood
// @access  Private
const logMood = async (req, res, next) => {
  try {
    const { mood, notes } = req.body;
    if (!mood) {
      return res.status(400).json({ success: false, message: 'Mood value is required' });
    }

    const emp = await Employee.findOne({ email: req.user.email });
    if (!emp) {
      return res.status(400).json({ success: false, message: 'No employee profile linked to user session' });
    }

    const dateString = getLocalDateString();

    // Check if employee already logged mood today
    const existing = await Mood.findOne({ employee: emp._id, dateString });
    if (existing) {
      return res.status(400).json({ success: false, message: 'You have already logged your mood for today' });
    }

    const moodLog = await Mood.create({
      employee: emp._id,
      dateString,
      mood,
      notes: notes || '',
    });

    res.status(201).json({ success: true, moodLog });
  } catch (error) {
    next(error);
  }
};

// @desc    Check today's mood check-in status
// @route   GET /api/engagement/mood/today
// @access  Private
const getMoodToday = async (req, res, next) => {
  try {
    const emp = await Employee.findOne({ email: req.user.email });
    if (!emp) {
      return res.status(400).json({ success: false, message: 'No employee profile linked to user session' });
    }

    const dateString = getLocalDateString();
    const existing = await Mood.findOne({ employee: emp._id, dateString });

    res.status(200).json({
      success: true,
      loggedToday: !!existing,
      mood: existing ? existing.mood : null,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get mood analytics (morale aggregates for past 30 days)
// @route   GET /api/engagement/mood/analytics
// @access  Private (Admin/HR only)
const getMoodAnalytics = async (req, res, next) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    // Get all mood logs in last 30 days
    const moods = await Mood.find({ createdAt: { $gte: startDate } })
      .populate({
        path: 'employee',
        select: 'firstName lastName department',
        populate: { path: 'department', select: 'name' }
      })
      .sort({ createdAt: -1 });

    // Calculate totals of each mood
    const counts = { excellent: 0, good: 0, neutral: 0, tired: 0, stressed: 0 };
    const notesFeed = [];

    moods.forEach(m => {
      if (counts[m.mood] !== undefined) {
        counts[m.mood]++;
      }
      if (m.notes && m.notes.trim()) {
        notesFeed.push({
          _id: m._id,
          mood: m.mood,
          notes: m.notes,
          department: m.employee?.department?.name || 'General',
          createdAt: m.createdAt,
        });
      }
    });

    const totalLogs = moods.length;

    res.status(200).json({
      success: true,
      analytics: {
        counts,
        totalLogs,
        notesFeed: notesFeed.slice(0, 10), // Return last 10 comments
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new engagement poll
// @route   POST /api/engagement/polls
// @access  Private (Admin/HR only)
const createPoll = async (req, res, next) => {
  try {
    const { question, options, closeOthers } = req.body;
    if (!question || !options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ success: false, message: 'Question and at least 2 options are required' });
    }

    if (closeOthers) {
      // Deactivate all previous polls
      await Poll.updateMany({ isActive: true }, { isActive: false });
    }

    const poll = await Poll.create({
      question,
      options,
      createdBy: req.user._id,
      isActive: true,
    });

    res.status(201).json({ success: true, poll });
  } catch (error) {
    next(error);
  }
};

// @desc    Get the latest active poll & user's status
// @route   GET /api/engagement/polls/active
// @access  Private
const getActivePoll = async (req, res, next) => {
  try {
    const poll = await Poll.findOne({ isActive: true }).sort({ createdAt: -1 });
    if (!poll) {
      return res.status(200).json({ success: true, poll: null });
    }

    const emp = await Employee.findOne({ email: req.user.email });
    const empId = emp ? emp._id.toString() : null;

    const myVote = empId ? poll.votes.find(v => v.employee.toString() === empId) : null;
    const hasVoted = !!myVote;
    const votedOptionIndex = myVote ? myVote.optionIndex : null;

    // Compile results counts
    const results = poll.options.map((opt, idx) => {
      const votesCount = poll.votes.filter(v => v.optionIndex === idx).length;
      return {
        option: opt,
        count: votesCount,
        percentage: poll.votes.length > 0 ? Math.round((votesCount / poll.votes.length) * 100) : 0,
      };
    });

    res.status(200).json({
      success: true,
      poll: {
        _id: poll._id,
        question: poll.question,
        options: poll.options,
        isActive: poll.isActive,
        createdAt: poll.createdAt,
        hasVoted,
        votedOptionIndex,
        results,
        totalVotes: poll.votes.length,
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cast a vote on a poll
// @route   POST /api/engagement/polls/:id/vote
// @access  Private
const votePoll = async (req, res, next) => {
  try {
    const { optionIndex } = req.body;
    if (optionIndex === undefined || optionIndex === null) {
      return res.status(400).json({ success: false, message: 'Option index is required to vote' });
    }

    const poll = await Poll.findById(req.params.id);
    if (!poll) {
      return res.status(404).json({ success: false, message: 'Poll not found' });
    }

    if (!poll.isActive) {
      return res.status(400).json({ success: false, message: 'This poll has been closed' });
    }

    const emp = await Employee.findOne({ email: req.user.email });
    if (!emp) {
      return res.status(400).json({ success: false, message: 'No employee profile linked to user session' });
    }

    const hasVoted = poll.votes.some(v => v.employee.toString() === emp._id.toString());
    if (hasVoted) {
      return res.status(400).json({ success: false, message: 'You have already voted in this poll' });
    }

    if (optionIndex < 0 || optionIndex >= poll.options.length) {
      return res.status(400).json({ success: false, message: 'Invalid option selected' });
    }

    poll.votes.push({
      employee: emp._id,
      optionIndex,
    });

    await poll.save();

    // Calculate new results to send back
    const results = poll.options.map((opt, idx) => {
      const votesCount = poll.votes.filter(v => v.optionIndex === idx).length;
      return {
        option: opt,
        count: votesCount,
        percentage: Math.round((votesCount / poll.votes.length) * 100),
      };
    });

    res.status(200).json({
      success: true,
      poll: {
        _id: poll._id,
        question: poll.question,
        options: poll.options,
        isActive: poll.isActive,
        hasVoted: true,
        votedOptionIndex: optionIndex,
        results,
        totalVotes: poll.votes.length,
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all polls (Admin history view)
// @route   GET /api/engagement/polls/all
// @access  Private (Admin/HR only)
const getAllPolls = async (req, res, next) => {
  try {
    const polls = await Poll.find().sort({ createdAt: -1 });

    const formattedPolls = polls.map(p => {
      const results = p.options.map((opt, idx) => {
        const votesCount = p.votes.filter(v => v.optionIndex === idx).length;
        return {
          option: opt,
          count: votesCount,
          percentage: p.votes.length > 0 ? Math.round((votesCount / p.votes.length) * 100) : 0,
        };
      });

      return {
        _id: p._id,
        question: p.question,
        options: p.options,
        isActive: p.isActive,
        createdAt: p.createdAt,
        results,
        totalVotes: p.votes.length,
      };
    });

    res.status(200).json({ success: true, polls: formattedPolls });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle poll active status (open/close)
// @route   PUT /api/engagement/polls/:id/toggle
// @access  Private (Admin/HR only)
const togglePoll = async (req, res, next) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) {
      return res.status(404).json({ success: false, message: 'Poll not found' });
    }

    poll.isActive = !poll.isActive;
    await poll.save();

    res.status(200).json({ success: true, poll });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  logMood,
  getMoodToday,
  getMoodAnalytics,
  createPoll,
  getActivePoll,
  votePoll,
  getAllPolls,
  togglePoll,
};
