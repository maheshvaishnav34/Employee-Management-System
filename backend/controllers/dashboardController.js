const Employee = require('../models/Employee');
const Department = require('../models/Department');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const Payroll = require('../models/Payroll');
const AuditLog = require('../models/AuditLog');
const Task = require('../models/Task');

// Helper: start of today
const todayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// Helper: start of current month
const monthStart = () => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

// @desc    Get dashboard metrics & statistics
// @route   GET /api/dashboard/stats
// @access  Private
const getDashboardStats = async (req, res, next) => {
  try {
    const role = req.user.role;

    if (role === 'admin' || role === 'hr') {
      // ── 1. Employee Counts ───────────────────────────────────────────────
      const totalEmployees   = await Employee.countDocuments();
      const activeEmployees  = await Employee.countDocuments({ status: 'Active' });
      const inactiveEmployees = await Employee.countDocuments({ status: 'Inactive' });
      const newThisMonth = await Employee.countDocuments({
        createdAt: { $gte: monthStart() },
      });
      const totalDepartments = await Department.countDocuments();

      // ── 2. Attendance Today ──────────────────────────────────────────────
      const today = todayStart();
      const todayPresentCount = await Attendance.countDocuments({ date: today });
      const todayLateCount    = await Attendance.countDocuments({ date: today, status: 'Late' });
      const todayAbsentCount  = Math.max(0, activeEmployees - todayPresentCount);
      const attendanceRate    = activeEmployees > 0
        ? Math.round((todayPresentCount / activeEmployees) * 100) : 0;

      // ── 3. Leave Stats ───────────────────────────────────────────────────
      const pendingLeaves  = await LeaveRequest.countDocuments({ status: 'Pending' });
      const approvedLeaves = await LeaveRequest.countDocuments({ status: 'Approved' });
      const rejectedLeaves = await LeaveRequest.countDocuments({ status: 'Rejected' });

      // ── 4. Payroll Summary ───────────────────────────────────────────────
      const now = new Date();
      const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const payrollAgg = await Payroll.aggregate([
        { $match: { month: currentMonthStr } },
        {
          $group: {
            _id: null,
            totalNet: { $sum: '$netSalary' },
            totalBonus: { $sum: '$bonuses' },
            totalDeductions: { $sum: '$deductions' },
            totalGross: { $sum: '$baseSalary' },
            count: { $sum: 1 },
          },
        },
      ]);
      const payrollData = payrollAgg[0] || { totalNet: 0, totalBonus: 0, totalDeductions: 0, totalGross: 0, count: 0 };

      // ── 5. Top Performers (by attendance rate this month) ────────────────
      const allActiveEmps = await Employee.find({ status: 'Active' })
        .populate('department', 'name')
        .lean();

      const workingDays = now.getDate(); // approximate working days = days elapsed in month
      const empAttendance = await Promise.all(
        allActiveEmps.map(async (emp) => {
          const presentDays = await Attendance.countDocuments({
            employee: emp._id,
            date: { $gte: monthStart() },
            status: { $in: ['Present', 'Late'] },
          });
          const rate = workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0;
          return { ...emp, presentDays, attendanceRate: rate };
        })
      );
      const topPerformers = empAttendance
        .sort((a, b) => b.attendanceRate - a.attendanceRate)
        .slice(0, 5);

      // ── 6. Upcoming Birthdays (next 7 days) ──────────────────────────────
      const todayMonth = now.getMonth() + 1;
      const todayDay   = now.getDate();
      const allEmps = await Employee.find({ dateOfBirth: { $exists: true, $ne: null } })
        .select('firstName lastName dateOfBirth department designation')
        .populate('department', 'name')
        .lean();

      const upcomingBirthdays = allEmps.filter((emp) => {
        const dob = new Date(emp.dateOfBirth);
        const bMonth = dob.getMonth() + 1;
        const bDay   = dob.getDate();
        // Check if birthday falls within next 7 days
        const upcoming = new Date(now.getFullYear(), bMonth - 1, bDay);
        if (upcoming < now) upcoming.setFullYear(now.getFullYear() + 1);
        const diff = (upcoming - now) / (1000 * 60 * 60 * 24);
        return diff >= 0 && diff <= 7;
      }).map(emp => ({
        ...emp,
        birthdayDate: new Date(emp.dateOfBirth).toLocaleDateString(undefined, { month: 'long', day: 'numeric' }),
        isToday: new Date(emp.dateOfBirth).getMonth() + 1 === todayMonth &&
                 new Date(emp.dateOfBirth).getDate() === todayDay,
      }));

      // ── 7. Work Anniversaries This Month ─────────────────────────────────
      const workAnniversaries = allActiveEmps.filter((emp) => {
        if (!emp.joiningDate) return false;
        const jd = new Date(emp.joiningDate);
        return jd.getMonth() + 1 === todayMonth && jd.getDate() >= todayDay;
      }).map(emp => {
        const years = now.getFullYear() - new Date(emp.joiningDate).getFullYear();
        return { ...emp, yearsCompleted: years };
      }).slice(0, 5);

      // ── 8. Department Distribution + Attendance Performance ─────────────
      const departments = await Department.find();
      const today2 = todayStart();
      const departmentDistribution = await Promise.all(
        departments.map(async (dept) => {
          const count = await Employee.countDocuments({ department: dept._id, status: 'Active' });
          const presentToday = await Attendance.countDocuments({ date: today2,
            employee: { $in: (await Employee.find({ department: dept._id, status: 'Active' }).select('_id')).map(e => e._id) },
          });
          const attendanceRate = count > 0 ? Math.round((presentToday / count) * 100) : 0;
          return { name: dept.name, count, presentToday, attendanceRate };
        })
      );

      // ── 8b. Gender Distribution ───────────────────────────────────────────
      const genderRaw = await Employee.aggregate([
        { $match: { status: 'Active' } },
        { $group: { _id: '$gender', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);
      const genderDistribution = genderRaw.map(g => ({ name: g._id || 'Unknown', count: g.count }));

      // ── 8c. Headcount Trend (last 6 months joining dates) ─────────────────
      const headcountTrend = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const mEnd   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
        const count2 = await Employee.countDocuments({ joiningDate: { $lte: mEnd }, createdAt: { $lte: mEnd } });
        headcountTrend.push({ month: label, count: count2 });
      }

      // ── 9. Monthly Payroll Trend (last 6 months) ──────────────────────────
      const payrollTrendRaw = await Payroll.aggregate([
        { $group: { _id: '$month', totalExpense: { $sum: '$netSalary' } } },
        { $sort: { _id: 1 } },
        { $limit: 6 },
      ]);
      const monthlyPayrollTrend = payrollTrendRaw.map((item) => ({
        month: item._id,
        amount: item.totalExpense,
      }));

      // ── 10. Recent Activity Lists ─────────────────────────────────────────
      const recentLeaves = await LeaveRequest.find({ status: 'Pending' })
        .populate('employee', 'firstName lastName employeeId')
        .sort({ appliedDate: -1 })
        .limit(6);

      const recentAttendance = await Attendance.find()
        .populate('employee', 'firstName lastName employeeId designation')
        .sort({ clockIn: -1 })
        .limit(6);

      const newEmployees = await Employee.find({ status: 'Active' })
        .populate('department', 'name')
        .sort({ createdAt: -1 })
        .limit(5);

      // ── 11. Recent Audit Logs ─────────────────────────────────────────────
      const recentAuditLogs = await AuditLog.find()
        .populate('performedBy', 'username email role')
        .sort({ createdAt: -1 })
        .limit(8);

      return res.status(200).json({
        success: true,
        stats: {
          cards: {
            totalEmployees,
            activeEmployees,
            inactiveEmployees,
            newThisMonth,
            totalDepartments,
            pendingLeaves,
            approvedLeaves,
            rejectedLeaves,
            attendanceRate,
            todayPresent: todayPresentCount,
            todayLate: todayLateCount,
            todayAbsent: todayAbsentCount,
          },
          payroll: {
            monthlyPayrollCost: payrollData.totalNet,
            bonusTotal: payrollData.totalBonus,
            deductionTotal: payrollData.totalDeductions,
            processedCount: payrollData.count,
          },
          charts: {
            departmentDistribution,
            monthlyPayrollTrend,
            genderDistribution,
            headcountTrend,
          },
          lists: {
            recentLeaves,
            recentAttendance,
            newEmployees,
            topPerformers,
            upcomingBirthdays,
            workAnniversaries,
            recentAuditLogs,
          },
        },
      });
    } else if (role === 'manager') {
      // ── MANAGER TEAM VIEW ────────────────────────────────────────────────
      if (!req.user.employee || !req.user.employee.department) {
        return res.status(400).json({ success: false, message: 'Manager account is not linked to any department/employee' });
      }

      const managerDeptId = req.user.employee.department;

      // 1. Team Members Counts
      const teamEmployees = await Employee.find({ department: managerDeptId });
      const teamEmployeeIds = teamEmployees.map(e => e._id);
      
      const totalEmployees = teamEmployees.length;
      const activeEmployees = teamEmployees.filter(e => e.status === 'Active').length;
      const inactiveEmployees = teamEmployees.filter(e => e.status === 'Inactive').length;

      // 2. Attendance Today
      const today = todayStart();
      const todayPresentCount = await Attendance.countDocuments({ date: today, employee: { $in: teamEmployeeIds } });
      const todayLateCount    = await Attendance.countDocuments({ date: today, status: 'Late', employee: { $in: teamEmployeeIds } });
      const todayAbsentCount  = Math.max(0, activeEmployees - todayPresentCount);
      const attendanceRate    = activeEmployees > 0 ? Math.round((todayPresentCount / activeEmployees) * 100) : 0;

      // 3. Leave Stats
      const pendingLeaves  = await LeaveRequest.countDocuments({ employee: { $in: teamEmployeeIds }, status: 'Pending' });
      const approvedLeaves = await LeaveRequest.countDocuments({ employee: { $in: teamEmployeeIds }, status: 'Approved' });
      const rejectedLeaves = await LeaveRequest.countDocuments({ employee: { $in: teamEmployeeIds }, status: 'Rejected' });

      // 4. Task Stats
      const pendingTasks   = await Task.countDocuments({ assignedTo: { $in: teamEmployeeIds }, status: { $in: ['Pending', 'In Progress'] } });
      const completedTasks = await Task.countDocuments({ assignedTo: { $in: teamEmployeeIds }, status: 'Completed' });

      // 6. Upcoming Birthdays (next 7 days)
      const now = new Date();
      const todayMonth = now.getMonth() + 1;
      const todayDay   = now.getDate();
      const teamBirthdays = teamEmployees.filter(emp => emp.dateOfBirth).map(emp => {
        const dob = new Date(emp.dateOfBirth);
        const bMonth = dob.getMonth() + 1;
        const bDay   = dob.getDate();
        const upcoming = new Date(now.getFullYear(), bMonth - 1, bDay);
        if (upcoming < now) upcoming.setFullYear(now.getFullYear() + 1);
        const diff = (upcoming - now) / (1000 * 60 * 60 * 24);
        if (diff >= 0 && diff <= 7) {
          return {
            ...emp.toObject(),
            birthdayDate: dob.toLocaleDateString(undefined, { month: 'long', day: 'numeric' }),
            isToday: bMonth === todayMonth && bDay === todayDay,
          };
        }
        return null;
      }).filter(Boolean);

      // 7. Work Anniversaries This Month
      const workAnniversaries = teamEmployees.filter(emp => {
        if (!emp.joiningDate || emp.status !== 'Active') return false;
        const jd = new Date(emp.joiningDate);
        return jd.getMonth() + 1 === todayMonth && jd.getDate() >= todayDay;
      }).map(emp => {
        const years = now.getFullYear() - new Date(emp.joiningDate).getFullYear();
        return { ...emp.toObject(), yearsCompleted: years };
      }).slice(0, 5);

      // 10. Recent Activity Lists
      const recentLeaves = await LeaveRequest.find({ employee: { $in: teamEmployeeIds }, status: 'Pending' })
        .populate('employee', 'firstName lastName employeeId')
        .sort({ appliedDate: -1 })
        .limit(6);

      const recentAttendance = await Attendance.find({ employee: { $in: teamEmployeeIds } })
        .populate('employee', 'firstName lastName employeeId designation')
        .sort({ clockIn: -1 })
        .limit(6);

      // Get top performers from team
      const workingDays = now.getDate();
      const empAttendance = await Promise.all(
        teamEmployees.filter(e => e.status === 'Active').map(async (emp) => {
          const presentDays = await Attendance.countDocuments({
            employee: emp._id,
            date: { $gte: monthStart() },
            status: { $in: ['Present', 'Late'] },
          });
          const rate = workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0;
          return { ...emp.toObject(), presentDays, attendanceRate: rate };
        })
      );
      const topPerformers = empAttendance
        .sort((a, b) => b.attendanceRate - a.attendanceRate)
        .slice(0, 5);

      return res.status(200).json({
        success: true,
        stats: {
          cards: {
            totalEmployees,
            activeEmployees,
            inactiveEmployees,
            newThisMonth: 0,
            totalDepartments: 1,
            pendingLeaves,
            approvedLeaves,
            rejectedLeaves,
            attendanceRate,
            todayPresent: todayPresentCount,
            todayLate: todayLateCount,
            todayAbsent: todayAbsentCount,
            pendingTasks,
            completedTasks,
          },
          lists: {
            recentLeaves,
            recentAttendance,
            topPerformers,
            upcomingBirthdays: teamBirthdays,
            workAnniversaries,
          },
        },
      });
    } else {
      // ── EMPLOYEE VIEW ────────────────────────────────────────────────────
      const employeeId = req.user.employee;
      if (!employeeId) {
        return res.status(400).json({ success: false, message: 'No employee record linked' });
      }

      const currentYear = new Date().getFullYear();
      const startOfYear = new Date(currentYear, 0, 1);

      const monthPresent = await Attendance.countDocuments({
        employee: employeeId,
        date: { $gte: monthStart() },
        status: { $in: ['Present', 'Late'] },
      });
      const monthLate = await Attendance.countDocuments({
        employee: employeeId,
        date: { $gte: monthStart() },
        status: 'Late',
      });
      const attendanceLogs = await Attendance.find({
        employee: employeeId,
        date: { $gte: monthStart() },
      });
      const monthTotalHours = attendanceLogs.reduce((sum, l) => sum + (l.totalHours || 0), 0);

      const leavesPending  = await LeaveRequest.countDocuments({ employee: employeeId, status: 'Pending' });
      const leavesApproved = await LeaveRequest.countDocuments({
        employee: employeeId, status: 'Approved',
        startDate: { $gte: startOfYear },
      });
      const leavesRejected = await LeaveRequest.countDocuments({ employee: employeeId, status: 'Rejected' });

      const recentPayslip = await Payroll.findOne({ employee: employeeId }).sort({ month: -1 });

      // Attendance trend last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const weekAttendance = await Attendance.find({
        employee: employeeId,
        date: { $gte: sevenDaysAgo },
      }).sort({ date: 1 });

      // Celebrations lists for employee view
      const now = new Date();
      const todayMonth = now.getMonth() + 1;
      const todayDay   = now.getDate();
      const allEmps = await Employee.find({ dateOfBirth: { $exists: true, $ne: null } })
        .select('firstName lastName dateOfBirth department designation')
        .populate('department', 'name')
        .lean();

      const upcomingBirthdays = allEmps.filter((emp) => {
        const dob = new Date(emp.dateOfBirth);
        const bMonth = dob.getMonth() + 1;
        const bDay   = dob.getDate();
        const upcoming = new Date(now.getFullYear(), bMonth - 1, bDay);
        if (upcoming < now) upcoming.setFullYear(now.getFullYear() + 1);
        const diff = (upcoming - now) / (1000 * 60 * 60 * 24);
        return diff >= 0 && diff <= 7;
      }).map(emp => ({
        ...emp,
        birthdayDate: new Date(emp.dateOfBirth).toLocaleDateString(undefined, { month: 'long', day: 'numeric' }),
        isToday: new Date(emp.dateOfBirth).getMonth() + 1 === todayMonth &&
                 new Date(emp.dateOfBirth).getDate() === todayDay,
      }));

      const allActiveEmps = await Employee.find({ status: 'Active' })
        .populate('department', 'name')
        .lean();
      const workAnniversaries = allActiveEmps.filter((emp) => {
        if (!emp.joiningDate) return false;
        const jd = new Date(emp.joiningDate);
        return jd.getMonth() + 1 === todayMonth && jd.getDate() >= todayDay;
      }).map(emp => {
        const years = now.getFullYear() - new Date(emp.joiningDate).getFullYear();
        return { ...emp, yearsCompleted: years };
      }).slice(0, 5);

      return res.status(200).json({
        success: true,
        stats: {
          cards: {
            monthPresent,
            monthLate,
            monthTotalHours: Math.round(monthTotalHours * 10) / 10,
            leavesPending,
            leavesApproved,
            leavesRejected,
          },
          lists: {
            upcomingBirthdays,
            workAnniversaries,
          },
          recentPayslip,
          weekAttendance,
        },
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboardStats };
