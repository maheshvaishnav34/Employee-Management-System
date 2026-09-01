const Candidate = require('../models/Candidate');
const AuditLog = require('../models/AuditLog');

// @desc    Get all candidates
// @route   GET /api/recruitment
// @access  Private (Admin, HR)
const getCandidates = async (req, res, next) => {
  try {
    const candidates = await Candidate.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: candidates.length, data: candidates });
  } catch (error) {
    next(error);
  }
};

// @desc    Add new candidate
// @route   POST /api/recruitment
// @access  Private (Admin, HR)
const createCandidate = async (req, res, next) => {
  try {
    const { name, email, phone, designation, notes } = req.body;
    if (!name || !email || !designation) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and designation' });
    }

    const candidate = await Candidate.create({ name, email, phone, designation, notes });

    await AuditLog.create({
      action: 'ADD_CANDIDATE',
      entity: 'Candidate',
      entityId: candidate._id,
      performedBy: req.user._id,
      details: `Added recruitment candidate ${name} for ${designation}`,
    });

    res.status(201).json({ success: true, data: candidate });
  } catch (error) {
    next(error);
  }
};

// @desc    Update candidate status / schedule interview
// @route   PUT /api/recruitment/:id
// @access  Private (Admin, HR)
const updateCandidate = async (req, res, next) => {
  try {
    const { status, interviewDate, notes } = req.body;
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ success: false, message: 'Candidate not found' });

    if (status) candidate.status = status;
    if (interviewDate) candidate.interviewDate = new Date(interviewDate);
    if (notes) candidate.notes = notes;

    await candidate.save();

    await AuditLog.create({
      action: 'UPDATE_CANDIDATE',
      entity: 'Candidate',
      entityId: candidate._id,
      performedBy: req.user._id,
      details: `Updated candidate ${candidate.name} status to ${status || candidate.status}`,
    });

    res.status(200).json({ success: true, data: candidate });
  } catch (error) {
    next(error);
  }
};

module.exports = { getCandidates, createCandidate, updateCandidate };
