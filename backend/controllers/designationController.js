const Designation = require('../models/Designation');
const Employee = require('../models/Employee');
const { escapeRegex, syncMissingDesignationsFromEmployees } = require('../utils/orgHelper');

// @desc    Get all designations (case-insensitive & trimmed employee counts + unlinked metadata)
// @route   GET /api/designations
// @access  Private
const getDesignations = async (req, res, next) => {
  try {
    const [designations, allEmployees] = await Promise.all([
      Designation.find().sort({ level: -1, name: 1 }),
      Employee.find().select('designation status').lean(),
    ]);

    const empCountMap = new Map();
    for (const emp of allEmployees) {
      const clean = String(emp.designation || '').trim();
      if (!clean) continue;
      const lower = clean.toLowerCase();
      if (!empCountMap.has(lower)) {
        empCountMap.set(lower, { rawName: clean, total: 0, active: 0 });
      }
      const entry = empCountMap.get(lower);
      entry.total += 1;
      if (emp.status === 'Active') entry.active += 1;
    }

    const matchedKeys = new Set();
    const designationsWithCounts = designations.map((desg) => {
      const lower = String(desg.name || '').trim().toLowerCase();
      matchedKeys.add(lower);
      const match = empCountMap.get(lower);
      return {
        ...desg.toObject(),
        employeeCount: match ? match.total : 0,
        activeCount: match ? match.active : 0,
      };
    });

    const unlinkedDesignations = [];
    for (const [lower, info] of empCountMap.entries()) {
      if (!matchedKeys.has(lower)) {
        unlinkedDesignations.push({ name: info.rawName, employeeCount: info.total, activeCount: info.active });
      }
    }

    res.status(200).json({
      success: true,
      count: designationsWithCounts.length,
      designations: designationsWithCounts,
      unlinkedDesignations,
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

    const nameRegex = new RegExp(`^\\s*${escapeRegex(designation.name.trim())}\\s*$`, 'i');
    const [employeeCount, activeCount] = await Promise.all([
      Employee.countDocuments({ designation: nameRegex }),
      Employee.countDocuments({ designation: nameRegex, status: 'Active' }),
    ]);

    res.status(200).json({
      success: true,
      designation: {
        ...designation.toObject(),
        employeeCount,
        activeCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Sync employee designation strings missing from Designation catalog
// @route   POST /api/designations/sync
// @access  Private (Admin)
const syncDesignations = async (req, res, next) => {
  try {
    const created = await syncMissingDesignationsFromEmployees();
    res.status(200).json({
      success: true,
      createdCount: created.length,
      created,
      message:
        created.length > 0
          ? `Synced ${created.length} unlinked employee designation(s) into the catalog.`
          : 'All employee designations are already synced with the catalog.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create designation
// @route   POST /api/designations
// @access  Private (Admin)
const createDesignation = async (req, res, next) => {
  try {
    const { description, level, category } = req.body;
    const name = (req.body.name || '').trim();

    if (!name) {
      return res.status(400).json({ success: false, message: 'Designation name is required' });
    }

    const nameExists = await Designation.findOne({ name: { $regex: new RegExp(`^${escapeRegex(name)}$`, 'i') } });
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
// @access  Private (Admin)
const updateDesignation = async (req, res, next) => {
  try {
    const { description, level, category } = req.body;
    const name = req.body.name !== undefined ? String(req.body.name || '').trim() : undefined;
    let designation = await Designation.findById(req.params.id);

    if (!designation) {
      return res.status(404).json({ success: false, message: 'Designation not found' });
    }

    if (name !== undefined && !name) {
      return res.status(400).json({ success: false, message: 'Designation name cannot be empty' });
    }

    if (name && name.toLowerCase() !== designation.name.toLowerCase()) {
      const nameExists = await Designation.findOne({
        _id: { $ne: designation._id },
        name: { $regex: new RegExp(`^${escapeRegex(name)}$`, 'i') },
      });
      if (nameExists) {
        return res.status(400).json({ success: false, message: 'Designation name already exists' });
      }
    }

    if (name && name !== designation.name) {
      const oldRegex = new RegExp(`^\\s*${escapeRegex(designation.name.trim())}\\s*$`, 'i');
      await Employee.updateMany({ designation: oldRegex }, { designation: name });
    }

    designation = await Designation.findByIdAndUpdate(
      req.params.id,
      {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(level !== undefined && level !== '' ? { level: Number(level) } : {}),
        ...(category !== undefined && category !== '' ? { category } : {}),
      },
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

// @desc    Delete designation (supports ?reassignTo=<desgId> or ?force=true)
// @route   DELETE /api/designations/:id
// @access  Private (Admin)
const deleteDesignation = async (req, res, next) => {
  try {
    const designation = await Designation.findById(req.params.id);

    if (!designation) {
      return res.status(404).json({ success: false, message: 'Designation not found' });
    }

    const nameRegex = new RegExp(`^\\s*${escapeRegex(designation.name.trim())}\\s*$`, 'i');
    const employeeCount = await Employee.countDocuments({ designation: nameRegex });
    const reassignTo = req.query.reassignTo || req.body?.reassignTo || '';
    const force = req.query.force === 'true' || req.body?.force === true;

    let targetName = null;
    let reassignedCount = 0;

    if (employeeCount > 0) {
      if (reassignTo) {
        if (String(reassignTo) === String(designation._id)) {
          return res.status(400).json({
            success: false,
            message: 'Please select a different designation to reassign employees.',
          });
        }
        const targetDesg = await Designation.findById(reassignTo);
        if (!targetDesg) {
          return res.status(404).json({
            success: false,
            message: 'Target designation for reassignment was not found.',
          });
        }
        targetName = targetDesg.name;
      } else if (force) {
        targetName = 'Unassigned';
      } else {
        return res.status(400).json({
          success: false,
          employeeCount,
          message: `Cannot delete designation '${designation.name}' directly because it is assigned to ${employeeCount} employee(s). Reassign them first.`,
        });
      }

      const updateRes = await Employee.updateMany(
        { designation: nameRegex },
        { designation: targetName }
      );
      reassignedCount = updateRes.modifiedCount || employeeCount;
    }

    await Designation.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      reassignedCount,
      reassignedTo: targetName,
      message: targetName
        ? `Designation '${designation.name}' deleted and ${reassignedCount} employee(s) reassigned to '${targetName}'.`
        : `Designation '${designation.name}' deleted successfully.`,
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
  syncDesignations,
};
