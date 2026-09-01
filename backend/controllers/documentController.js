const CompanyDocument = require('../models/CompanyDocument');

// @desc    Get company documents
// @route   GET /api/documents
// @access  Private
const getDocuments = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === 'employee') {
      query.isGlobal = true;
    }

    const documents = await CompanyDocument.find(query)
      .populate('uploadedBy', 'username email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: documents.length, documents });
  } catch (error) {
    next(error);
  }
};

// @desc    Publish a company document/policy
// @route   POST /api/documents
// @access  Private (Admin/HR)
const createDocument = async (req, res, next) => {
  try {
    const { title, description, category, content, isGlobal } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required' });
    }

    const document = await CompanyDocument.create({
      title,
      description: description || '',
      category: category || 'Policy',
      content,
      isGlobal: isGlobal !== undefined ? isGlobal : true,
      uploadedBy: req.user._id,
    });

    const populated = await CompanyDocument.findById(document._id).populate('uploadedBy', 'username email');
    res.status(201).json({ success: true, document: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a company document
// @route   DELETE /api/documents/:id
// @access  Private (Admin/HR)
const deleteDocument = async (req, res, next) => {
  try {
    const document = await CompanyDocument.findById(req.params.id);
    if (!document) return res.status(404).json({ success: false, message: 'Document not found' });
    await CompanyDocument.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Document deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDocuments,
  createDocument,
  deleteDocument,
};
