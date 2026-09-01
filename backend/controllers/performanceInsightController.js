const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const Task = require('../models/Task');

// Performance Score Algorithm:
// Attendance Score  = (Present Days / Working Days) * 100  → weight 40%
// Task Score        = (Completed Tasks / Total Assigned)   → weight 35%
// Leave Pattern     = 1 - (leave days taken / 30) capped 0-1 → weight 25%
// Final Score = (attendanceScore * 0.40) + (taskScore * 0.35) + (leaveScore * 0.25)

const calculateScore = (attendancePct, taskCompletionPct, leaveDaysTaken) => {
  const attendanceScore = Math.min(attendancePct, 100);
  const taskScore = Math.min(taskCompletionPct, 100);
  const leaveScore = Math.max(0, Math.min(100, (1 - leaveDaysTaken / 30) * 100));

  const final = attendanceScore * 0.40 + taskScore * 0.35 + leaveScore * 0.25;
  return Math.round(final * 10) / 10;
};

// @desc    Get AI performance insights for the manager's team
// @route   GET /api/insights/team
// @access  Private (Manager, HR, Admin)
const getTeamInsights = async (req, res, next) => {
  try {
    let employees = [];

    if (req.user.role === 'manager') {
      const mgrEmp = await Employee.findOne({ email: req.user.email });
      if (!mgrEmp) return res.status(200).json({ success: true, insights: [], alerts: {} });
      employees = await Employee.find({ department: mgrEmp.department, status: 'Active' });
    } else {
      employees = await Employee.find({ status: 'Active' }).populate('department', 'name');
    }

    if (!employees.length) {
      return res.status(200).json({ success: true, insights: [], alerts: { highPerformers: [], atRisk: [], frequentAbsentees: [] } });
    }

    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const startOfYear = new Date(today.getFullYear(), 0, 1);

    const insights = [];

    for (const emp of employees) {
      // 1. Attendance in last 30 days
      const attendanceLogs = await Attendance.find({
        employee: emp._id,
        date: { $gte: thirtyDaysAgo },
      });

      // Calculate working days (Mon-Sat, exclude Sundays) in last 30 days
      let workingDays = 0;
      for (let d = new Date(thirtyDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
        if (d.getDay() !== 0) workingDays++;
      }

      const presentDays = attendanceLogs.filter(a => a.status === 'Present' || a.status === 'Late').length;
      const absentDays = workingDays - presentDays;
      const attendancePct = workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0;
      const lateDays = attendanceLogs.filter(a => a.status === 'Late').length;
      const totalOvertimeHours = attendanceLogs.reduce((sum, a) => sum + (a.overtimeHours || 0), 0);

      // 2. Task completion
      const allTasks = await Task.find({ assignedTo: emp._id });
      const completedTasks = allTasks.filter(t => t.status === 'Completed').length;
      const pendingTasks = allTasks.filter(t => t.status === 'Pending' || t.status === 'In Progress').length;
      const taskCompletionPct = allTasks.length > 0 ? Math.round((completedTasks / allTasks.length) * 100) : 100;

      // 3. Leave days taken this year
      const leavesThisYear = await LeaveRequest.find({
        employee: emp._id,
        status: 'Approved',
        startDate: { $gte: startOfYear },
      });

      let leaveDaysTaken = 0;
      leavesThisYear.forEach(leave => {
        const diff = Math.ceil((new Date(leave.endDate) - new Date(leave.startDate)) / (1000 * 60 * 60 * 24)) + 1;
        leaveDaysTaken += diff;
      });

      const performanceScore = calculateScore(attendancePct, taskCompletionPct, leaveDaysTaken);

      // Determine alert type
      let alertType = null;
      if (performanceScore >= 80) alertType = 'high_performer';
      else if (attendancePct < 60 || absentDays >= 10) alertType = 'frequent_absentee';
      else if (performanceScore < 50) alertType = 'at_risk';

      insights.push({
        employee: {
          _id: emp._id,
          firstName: emp.firstName,
          lastName: emp.lastName,
          employeeId: emp.employeeId,
          designation: emp.designation,
          profileImage: emp.profileImage,
          department: emp.department,
        },
        attendancePct,
        presentDays,
        absentDays,
        lateDays,
        workingDays,
        totalOvertimeHours: Math.round(totalOvertimeHours * 10) / 10,
        taskCompletionPct,
        completedTasks,
        pendingTasks,
        totalTasks: allTasks.length,
        leaveDaysTaken,
        performanceScore,
        alertType,
      });
    }

    // Sort by score descending
    insights.sort((a, b) => b.performanceScore - a.performanceScore);

    const alerts = {
      highPerformers: insights.filter(i => i.alertType === 'high_performer'),
      atRisk: insights.filter(i => i.alertType === 'at_risk'),
      frequentAbsentees: insights.filter(i => i.alertType === 'frequent_absentee'),
    };

    res.status(200).json({ success: true, insights, alerts, totalEmployees: employees.length });
  } catch (error) {
    next(error);
  }
};

// @desc    Get insights for a single employee
// @route   GET /api/insights/employee/:employeeId
// @access  Private (Manager, HR, Admin)
const getEmployeeInsight = async (req, res, next) => {
  try {
    const emp = await Employee.findById(req.params.employeeId);
    if (!emp) return res.status(404).json({ success: false, message: 'Employee not found' });

    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    const attendanceLogs = await Attendance.find({ employee: emp._id, date: { $gte: thirtyDaysAgo } });
    let workingDays = 0;
    for (let d = new Date(thirtyDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
      if (d.getDay() !== 0) workingDays++;
    }
    const presentDays = attendanceLogs.filter(a => a.status === 'Present' || a.status === 'Late').length;
    const attendancePct = workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0;

    const allTasks = await Task.find({ assignedTo: emp._id });
    const completedTasks = allTasks.filter(t => t.status === 'Completed').length;
    const taskCompletionPct = allTasks.length > 0 ? Math.round((completedTasks / allTasks.length) * 100) : 100;

    const leavesThisYear = await LeaveRequest.find({ employee: emp._id, status: 'Approved', startDate: { $gte: startOfYear } });
    let leaveDaysTaken = 0;
    leavesThisYear.forEach(leave => {
      leaveDaysTaken += Math.ceil((new Date(leave.endDate) - new Date(leave.startDate)) / (1000 * 60 * 60 * 24)) + 1;
    });

    const performanceScore = calculateScore(attendancePct, taskCompletionPct, leaveDaysTaken);

    res.status(200).json({
      success: true,
      insight: { employee: emp, attendancePct, presentDays, workingDays, taskCompletionPct, completedTasks, totalTasks: allTasks.length, leaveDaysTaken, performanceScore },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getTeamInsights, getEmployeeInsight };
