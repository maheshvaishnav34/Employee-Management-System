const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const Department = require('../models/Department');

// @desc    Generate employee report
// @route   GET /api/reports/employees
// @access  Private (Admin, HR, Manager)
const getEmployeeReport = async (req, res, next) => {
  try {
    const { department, status, startDate, endDate } = req.query;
    
    let filter = {};
    if (department) filter.department = department;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.joiningDate = {};
      if (startDate) filter.joiningDate.$gte = new Date(startDate);
      if (endDate) filter.joiningDate.$lte = new Date(endDate);
    }

    const employees = await Employee.find(filter)
      .populate('department', 'name')
      .sort({ joiningDate: -1 });

    const summary = {
      totalEmployees: employees.length,
      activeEmployees: employees.filter(e => e.status === 'Active').length,
      inactiveEmployees: employees.filter(e => e.status === 'Inactive').length,
      averageSalary: employees.reduce((sum, e) => sum + e.salary, 0) / employees.length || 0,
    };

    res.status(200).json({
      success: true,
      summary,
      employees,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get attendance report
// @route   GET /api/reports/attendance
// @access  Private (Admin, HR, Manager)
const getAttendanceReport = async (req, res, next) => {
  try {
    const { department, employeeId, startDate, endDate } = req.query;
    
    let filter = {};
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    } else {
      // Default to current month
      const now = new Date();
      filter.date = {
        $gte: new Date(now.getFullYear(), now.getMonth(), 1),
        $lte: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      };
    }

    const attendanceRecords = await Attendance.find(filter)
      .populate({
        path: 'employee',
        populate: { path: 'department', select: 'name' }
      })
      .sort({ date: -1 });

    let filteredRecords = attendanceRecords;
    if (department) {
      filteredRecords = attendanceRecords.filter(
        a => a.employee?.department?._id.toString() === department
      );
    }
    if (employeeId) {
      filteredRecords = attendanceRecords.filter(
        a => a.employee?._id.toString() === employeeId
      );
    }

    const summary = {
      totalRecords: filteredRecords.length,
      present: filteredRecords.filter(a => a.status === 'Present').length,
      absent: filteredRecords.filter(a => a.status === 'Absent').length,
      halfDay: filteredRecords.filter(a => a.status === 'Half Day').length,
      late: filteredRecords.filter(a => a.isLate).length,
      attendanceRate: filteredRecords.length > 0 
        ? ((filteredRecords.filter(a => a.status === 'Present').length / filteredRecords.length) * 100).toFixed(2)
        : 0,
    };

    res.status(200).json({
      success: true,
      summary,
      records: filteredRecords,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get leave report
// @route   GET /api/reports/leaves
// @access  Private (Admin, HR, Manager)
const getLeaveReport = async (req, res, next) => {
  try {
    const { department, employeeId, status, startDate, endDate } = req.query;
    
    let filter = {};
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.startDate = {};
      if (startDate) filter.startDate.$gte = new Date(startDate);
      if (endDate) filter.startDate.$lte = new Date(endDate);
    }

    const leaveRequests = await LeaveRequest.find(filter)
      .populate({
        path: 'employee',
        populate: { path: 'department', select: 'name' }
      })
      .sort({ startDate: -1 });

    let filteredRequests = leaveRequests;
    if (department) {
      filteredRequests = leaveRequests.filter(
        l => l.employee?.department?._id.toString() === department
      );
    }
    if (employeeId) {
      filteredRequests = leaveRequests.filter(
        l => l.employee?._id.toString() === employeeId
      );
    }

    const summary = {
      totalRequests: filteredRequests.length,
      approved: filteredRequests.filter(l => l.status === 'Approved').length,
      pending: filteredRequests.filter(l => l.status === 'Pending').length,
      rejected: filteredRequests.filter(l => l.status === 'Rejected').length,
      totalDays: filteredRequests.reduce((sum, l) => {
        const days = Math.ceil((new Date(l.endDate) - new Date(l.startDate)) / (1000 * 60 * 60 * 24)) + 1;
        return sum + (l.status === 'Approved' ? days : 0);
      }, 0),
    };

    const leaveTypeBreakdown = filteredRequests.reduce((acc, l) => {
      acc[l.leaveType] = (acc[l.leaveType] || 0) + 1;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      summary,
      leaveTypeBreakdown,
      requests: filteredRequests,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get department-wise statistics
// @route   GET /api/reports/departments
// @access  Private (Admin, HR, Manager)
const getDepartmentStatistics = async (req, res, next) => {
  try {
    const departments = await Department.find();
    
    const statistics = await Promise.all(
      departments.map(async (dept) => {
        const employees = await Employee.find({ department: dept._id });
        const activeEmployees = employees.filter(e => e.status === 'Active');
        
        // Attendance stats for current month
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        const attendanceRecords = await Attendance.find({
          employee: { $in: employees.map(e => e._id) },
          date: { $gte: monthStart, $lte: monthEnd }
        });

        const leaveRequests = await LeaveRequest.find({
          employee: { $in: employees.map(e => e._id) },
          status: 'Approved',
          startDate: { $gte: monthStart, $lte: monthEnd }
        });

        return {
          department: {
            id: dept._id,
            name: dept.name,
            description: dept.description,
          },
          employeeCount: employees.length,
          activeEmployees: activeEmployees.length,
          inactiveEmployees: employees.length - activeEmployees.length,
          averageSalary: employees.length > 0 
            ? (employees.reduce((sum, e) => sum + e.salary, 0) / employees.length).toFixed(2)
            : 0,
          attendance: {
            totalRecords: attendanceRecords.length,
            present: attendanceRecords.filter(a => a.status === 'Present').length,
            absent: attendanceRecords.filter(a => a.status === 'Absent').length,
            rate: attendanceRecords.length > 0
              ? ((attendanceRecords.filter(a => a.status === 'Present').length / attendanceRecords.length) * 100).toFixed(2)
              : 0,
          },
          leaves: {
            totalApproved: leaveRequests.length,
            totalDays: leaveRequests.reduce((sum, l) => {
              const days = Math.ceil((new Date(l.endDate) - new Date(l.startDate)) / (1000 * 60 * 60 * 24)) + 1;
              return sum + days;
            }, 0),
          },
        };
      })
    );

    res.status(200).json({
      success: true,
      statistics,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get overall dashboard statistics
// @route   GET /api/reports/dashboard
// @access  Private (Admin, HR, Manager)
const getDashboardStatistics = async (req, res, next) => {
  try {
    const totalEmployees = await Employee.countDocuments();
    const activeEmployees = await Employee.countDocuments({ status: 'Active' });
    const totalDepartments = await Department.countDocuments();

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const attendanceThisMonth = await Attendance.countDocuments({
      date: { $gte: monthStart, $lte: monthEnd }
    });

    const presentThisMonth = await Attendance.countDocuments({
      date: { $gte: monthStart, $lte: monthEnd },
      status: 'Present'
    });

    const pendingLeaves = await LeaveRequest.countDocuments({ status: 'Pending' });
    const approvedLeavesThisMonth = await LeaveRequest.countDocuments({
      status: 'Approved',
      startDate: { $gte: monthStart, $lte: monthEnd }
    });

    res.status(200).json({
      success: true,
      statistics: {
        employees: {
          total: totalEmployees,
          active: activeEmployees,
          inactive: totalEmployees - activeEmployees,
        },
        departments: totalDepartments,
        attendance: {
          recordsThisMonth: attendanceThisMonth,
          presentThisMonth,
          rate: attendanceThisMonth > 0 
            ? ((presentThisMonth / attendanceThisMonth) * 100).toFixed(2)
            : 0,
        },
        leaves: {
          pending: pendingLeaves,
          approvedThisMonth: approvedLeavesThisMonth,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEmployeeReport,
  getAttendanceReport,
  getLeaveReport,
  getDepartmentStatistics,
  getDashboardStatistics,
};
