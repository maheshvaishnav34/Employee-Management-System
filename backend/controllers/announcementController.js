const Announcement = require('../models/Announcement');

// @desc    Get announcements
// @route   GET /api/announcements
// @access  Private
const getAnnouncements = async (req, res, next) => {
  try {
    let query = { isActive: true };
    
    // Admin/HR can see all announcements (active and inactive)
    if (req.user.role === 'admin' || req.user.role === 'hr') {
      query = {};
    }

    const announcements = await Announcement.find(query)
      .populate('createdBy', 'username email role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: announcements.length,
      announcements,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create an announcement
// @route   POST /api/announcements
// @access  Private (Admin/HR)
const createAnnouncement = async (req, res, next) => {
  try {
    const { title, content, priority, expiryDate } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required',
      });
    }

    const announcement = await Announcement.create({
      title,
      content,
      priority: priority || 'medium',
      createdBy: req.user._id,
      expiryDate: expiryDate || null,
    });

    const populated = await Announcement.findById(announcement._id)
      .populate('createdBy', 'username email role');

    res.status(201).json({
      success: true,
      announcement: populated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete an announcement
// @route   DELETE /api/announcements/:id
// @access  Private (Admin/HR)
const deleteAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found',
      });
    }

    await Announcement.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Announcement deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
};
