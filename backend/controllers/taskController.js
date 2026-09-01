const Task = require('../models/Task');
const Employee = require('../models/Employee');

// @desc    Get tasks (employee sees own, HR/Admin sees all)
// @route   GET /api/tasks
// @access  Private
const getTasks = async (req, res, next) => {
  try {
    let query = {};

    if (req.user.role === 'employee') {
      const emp = await Employee.findOne({ email: req.user.email });
      if (!emp) return res.status(200).json({ success: true, count: 0, tasks: [] });
      query = { assignedTo: emp._id };
    } else if (req.user.role === 'manager') {
      const mgrEmp = await Employee.findOne({ email: req.user.email });
      if (!mgrEmp) return res.status(200).json({ success: true, count: 0, tasks: [] });
      
      const teamEmployees = await Employee.find({ department: mgrEmp.department }).select('_id');
      const teamEmployeeIds = teamEmployees.map(emp => emp._id);
      
      query = {
        $or: [
          { assignedTo: { $in: teamEmployeeIds } },
          { assignedBy: req.user._id }
        ]
      };
    }

    // Optional filters
    if (req.query.status) query.status = req.query.status;
    if (req.query.priority) query.priority = req.query.priority;

    const tasks = await Task.find(query)
      .populate('assignedTo', 'firstName lastName employeeId designation')
      .populate('assignedBy', 'username email')
      .sort({ dueDate: 1, createdAt: -1 });

    res.status(200).json({ success: true, count: tasks.length, tasks });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a task
// @route   POST /api/tasks
// @access  Private (HR+)
const createTask = async (req, res, next) => {
  try {
    const { title, description, assignedTo, dueDate, priority } = req.body;

    if (!title || !assignedTo) {
      return res.status(400).json({ success: false, message: 'Title and assignedTo are required' });
    }

    // Department restrictions for managers
    if (req.user.role === 'manager') {
      const mgrEmp = await Employee.findOne({ email: req.user.email });
      const targetEmp = await Employee.findById(assignedTo);
      if (!mgrEmp || !targetEmp || mgrEmp.department.toString() !== targetEmp.department.toString()) {
        return res.status(403).json({ success: false, message: 'You can only assign tasks to employees in your department' });
      }
    }

    const task = await Task.create({
      title,
      description: description || '',
      assignedTo,
      assignedBy: req.user._id,
      dueDate: dueDate || undefined,
      priority: priority || 'Medium',
    });

    const populated = await Task.findById(task._id)
      .populate('assignedTo', 'firstName lastName employeeId designation')
      .populate('assignedBy', 'username email');

    res.status(201).json({ success: true, task: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Update task (employee updates status/progress on own; HR/Admin updates all)
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = async (req, res, next) => {
  try {
    let task = await Task.findById(req.params.id).populate('assignedTo');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    // Employees can only update their own task's status and progress
    if (req.user.role === 'employee') {
      const emp = await Employee.findOne({ email: req.user.email });
      if (!emp || task.assignedTo._id.toString() !== emp._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to update this task' });
      }
      const { status, progress } = req.body;
      const updates = {};
      if (status) updates.status = status;
      if (progress !== undefined) updates.progress = progress;
      if (status === 'Completed') updates.completedAt = new Date();

      task = await Task.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
        .populate('assignedTo', 'firstName lastName employeeId designation')
        .populate('assignedBy', 'username email');
    } else {
      // Managers can only update tasks of employees in their department
      if (req.user.role === 'manager') {
        const mgrEmp = await Employee.findOne({ email: req.user.email });
        if (!mgrEmp || !task.assignedTo || task.assignedTo.department.toString() !== mgrEmp.department.toString()) {
          return res.status(403).json({ success: false, message: 'Not authorized to manage tasks outside your department' });
        }
        
        // Also verify the new assignee if it's being changed
        if (req.body.assignedTo) {
          const targetEmp = await Employee.findById(req.body.assignedTo);
          if (!targetEmp || targetEmp.department.toString() !== mgrEmp.department.toString()) {
            return res.status(403).json({ success: false, message: 'You can only assign tasks to employees in your department' });
          }
        }
      }

      // HR/Admin/Manager can update all fields
      if (req.body.status === 'Completed' && !req.body.completedAt) {
        req.body.completedAt = new Date();
      }
      task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
        .populate('assignedTo', 'firstName lastName employeeId designation')
        .populate('assignedBy', 'username email');
    }

    res.status(200).json({ success: true, task });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private (Admin+)
const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id).populate('assignedTo');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    // Managers can only delete tasks of employees in their department
    if (req.user.role === 'manager') {
      const mgrEmp = await Employee.findOne({ email: req.user.email });
      if (!mgrEmp || !task.assignedTo || task.assignedTo.department.toString() !== mgrEmp.department.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to delete tasks outside your department' });
      }
    }

    await Task.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Task deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getTasks, createTask, updateTask, deleteTask };
