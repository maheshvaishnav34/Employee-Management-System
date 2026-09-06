const Training = require('../models/Training');
const Employee = require('../models/Employee');

// Initial seed training programs
const DEFAULT_TRAININGS = [
  {
    title: 'Enterprise Cyber Security & Data Privacy 2026',
    category: 'Compliance',
    description: 'Mandatory information security protocols, phishing prevention, secure credential hygiene, and GDPR compliance standards.',
    instructor: 'SecOps Global Academy',
    duration: '2 Weeks',
    mode: 'Online',
    capacity: 100,
  },
  {
    title: 'Full Stack Modern Web & Microservices',
    category: 'Technical',
    description: 'Master React 19, Node.js microservices architecture, MongoDB performance tuning, and CI/CD pipelines.',
    instructor: 'StackCode Engineering Labs',
    duration: '6 Weeks',
    mode: 'Hybrid',
    capacity: 40,
  },
  {
    title: 'High-Performance Team Leadership & EQ',
    category: 'Leadership',
    description: 'Strategic conflict resolution, effective 1-on-1 feedback, empathetic management, and goal-setting frameworks (OKRs).',
    instructor: 'Executive Coaching Institute',
    duration: '3 Weeks',
    mode: 'Classroom',
    capacity: 25,
  },
  {
    title: 'Workplace Ergonomics & Mental Wellness',
    category: 'Safety',
    description: 'Desk posture best practices, eye strain mitigation, work-life balance routines, and stress management at scale.',
    instructor: 'Health & Wellness Committee',
    duration: '1 Week',
    mode: 'Online',
    capacity: 150,
  },
];

// Ensure initial trainings exist
const ensureDefaultTrainings = async () => {
  try {
    const count = await Training.countDocuments();
    if (count === 0) {
      await Training.insertMany(DEFAULT_TRAININGS);
    }
  } catch (err) {
    console.error('Error auto-seeding training programs:', err.message);
  }
};
ensureDefaultTrainings();

// @desc    Get all training programs
// @route   GET /api/training
// @access  Private (All authenticated roles)
const getTrainings = async (req, res, next) => {
  try {
    let empId = req.user.employee ? req.user.employee._id.toString() : null;
    if (!empId) {
      const emp = await Employee.findOne({ email: req.user.email });
      if (emp) empId = emp._id.toString();
    }

    const trainings = await Training.find().sort({ createdAt: -1 });

    const formatted = trainings.map(t => {
      const obj = t.toObject();
      const myEnr = empId ? obj.enrollments.find(e => e.employee.toString() === empId) : null;
      return {
        ...obj,
        enrolledCount: obj.enrollments.length,
        isEnrolled: !!myEnr,
        myEnrollment: myEnr || null,
      };
    });

    res.status(200).json({
      success: true,
      count: formatted.length,
      trainings: formatted,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new training program
// @route   POST /api/training
// @access  Private (Admin, HR)
const createTraining = async (req, res, next) => {
  try {
    const { title, category, description, instructor, duration, mode, startDate, endDate, capacity } = req.body;

    if (!title || !description) {
      return res.status(400).json({ success: false, message: 'Title and description are required' });
    }

    const training = await Training.create({
      title,
      category: category || 'Technical',
      description,
      instructor: instructor || 'L&D Team',
      duration: duration || '2 Weeks',
      mode: mode || 'Online',
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
      capacity: capacity ? Number(capacity) : 50,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Training program created successfully',
      training,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Enroll in training program
// @route   POST /api/training/:id/enroll
// @access  Private (Employee)
const enrollTraining = async (req, res, next) => {
  try {
    let empId = req.user.employee ? req.user.employee._id : null;
    if (!empId) {
      const emp = await Employee.findOne({ email: req.user.email });
      if (emp) empId = emp._id;
    }

    if (!empId) {
      return res.status(400).json({ success: false, message: 'You must have an employee profile to enroll in training' });
    }

    const training = await Training.findById(req.params.id);
    if (!training) {
      return res.status(404).json({ success: false, message: 'Training program not found' });
    }

    // Check if already enrolled
    const exists = training.enrollments.some(e => e.employee.toString() === empId.toString());
    if (exists) {
      return res.status(400).json({ success: false, message: 'You are already enrolled in this training program' });
    }

    // Check capacity
    if (training.enrollments.length >= training.capacity) {
      return res.status(400).json({ success: false, message: 'This training program has reached full capacity' });
    }

    training.enrollments.push({
      employee: empId,
      enrolledAt: new Date(),
      status: 'Enrolled',
      progress: 0,
    });

    await training.save();

    res.status(200).json({
      success: true,
      message: 'Successfully enrolled in training program',
      training,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update employee training progress
// @route   PUT /api/training/:id/progress
// @access  Private (Employee)
const updateProgress = async (req, res, next) => {
  try {
    let empId = req.user.employee ? req.user.employee._id : null;
    if (!empId) {
      const emp = await Employee.findOne({ email: req.user.email });
      if (emp) empId = emp._id;
    }

    if (!empId) {
      return res.status(400).json({ success: false, message: 'Employee profile not found' });
    }

    const { progress, notes } = req.body;
    const training = await Training.findById(req.params.id);
    if (!training) {
      return res.status(404).json({ success: false, message: 'Training program not found' });
    }

    const enrollment = training.enrollments.find(e => e.employee.toString() === empId.toString());
    if (!enrollment) {
      return res.status(400).json({ success: false, message: 'You are not enrolled in this training program' });
    }

    const newProgress = Math.min(100, Math.max(0, Number(progress) || 0));
    enrollment.progress = newProgress;
    if (notes) enrollment.notes = notes;

    if (newProgress >= 100) {
      enrollment.status = 'Completed';
      enrollment.completionDate = new Date();
    } else if (newProgress > 0) {
      enrollment.status = 'In Progress';
    }

    await training.save();

    res.status(200).json({
      success: true,
      message: 'Training progress updated successfully',
      enrollment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete training program
// @route   DELETE /api/training/:id
// @access  Private (Admin, HR)
const deleteTraining = async (req, res, next) => {
  try {
    const training = await Training.findByIdAndDelete(req.params.id);
    if (!training) {
      return res.status(404).json({ success: false, message: 'Training not found' });
    }
    res.status(200).json({ success: true, message: 'Training program deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTrainings,
  createTraining,
  enrollTraining,
  updateProgress,
  deleteTraining,
};
