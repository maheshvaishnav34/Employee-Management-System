const Designation = require('../models/Designation');
const Employee = require('../models/Employee');

// @desc    Get all designations
// @route   GET /api/designations
// @access  Private
const getDesignations = async (req, res, next) => {
  try {
    const designations = await Designation.find().sort({ level: -1, name: 1 });
    
    // Dynamically fetch employee count for each designation
    const designationsWithCounts = await Promise.all(
      designations.map(async (desg) => {
        const employeeCount = await Employee.countDocuments({ designation: desg.name });
        return {
          ...desg.toObject(),
          employeeCount,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: designationsWithCounts.length,
      designations: designationsWithCounts,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single designation
// @route   GET /api/designations/:id
// @access  Private
const getDesignationById = async (req, res, next) => {
  try {
    const designation = await Designation.findById(req.params.id);

    if (!designation) {
      return res.status(404).json({ success: false, message: 'Designation not found' });
    }

    const employeeCount = await Employee.countDocuments({ designation: designation.name });

    res.status(200).json({
      success: true,
      designation: {
        ...designation.toObject(),
        employeeCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create designation
// @route   POST /api/designations
// @access  Private (Admin & HR)
const createDesignation = async (req, res, next) => {
  try {
    const { name, description, level, category } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Designation name is required' });
    }

    const nameExists = await Designation.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (nameExists) {
      return res.status(400).json({ success: false, message: 'Designation name already exists' });
    }

    const designation = await Designation.create({
      name,
      description,
      level,
      category,
    });

    res.status(201).json({
      success: true,
      designation,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update designation
// @route   PUT /api/designations/:id
// @access  Private (Admin & HR)
const updateDesignation = async (req, res, next) => {
  try {
    const { name, description, level, category } = req.body;
    let designation = await Designation.findById(req.params.id);

    if (!designation) {
      return res.status(404).json({ success: false, message: 'Designation not found' });
    }

    if (name && name !== designation.name) {
      const nameExists = await Designation.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
      if (nameExists) {
        return res.status(400).json({ success: false, message: 'Designation name already exists' });
      }

      // Sync active employee records with the new designation name
      await Employee.updateMany({ designation: designation.name }, { designation: name });
    }

    designation = await Designation.findByIdAndUpdate(
      req.params.id,
      { name, description, level, category },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      designation,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete designation
// @route   DELETE /api/designations/:id
// @access  Private (Admin & HR)
const deleteDesignation = async (req, res, next) => {
  try {
    const designation = await Designation.findById(req.params.id);

    if (!designation) {
      return res.status(404).json({ success: false, message: 'Designation not found' });
    }

    // Check if designation is used by any active employee
    const employeeCount = await Employee.countDocuments({ designation: designation.name });
    if (employeeCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete designation '${designation.name}'. It is assigned to ${employeeCount} employee(s).`,
      });
    }

    await Designation.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Designation deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get designations by category
// @route   GET /api/designations/hierarchy/categories
// @access  Private
const getDesignationsByCategory = async (req, res, next) => {
  try {
    const designations = await Designation.find().sort({ level: -1, name: 1 });
    
    const grouped = designations.reduce((acc, desg) => {
      const category = desg.category || 'General';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(desg);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      categories: grouped,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDesignations,
  getDesignationById,
  createDesignation,
  updateDesignation,
  deleteDesignation,
  getDesignationsByCategory,
};
