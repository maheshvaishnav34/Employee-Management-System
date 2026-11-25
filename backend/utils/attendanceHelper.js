const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const AttendanceSession = require('../models/AttendanceSession');
const Employee = require('../models/Employee');
const Department = require('../models/Department');
const Setting = require('../models/Setting');
const LeaveRequest = require('../models/LeaveRequest');
const AttendanceRegularization = require('../models/AttendanceRegularization');

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Normalize a Date or YYYY-MM-DD string to local midnight (00:00:00.000).
 * Parsing YYYY-MM-DD strings explicitly prevents UTC-to-local date shift bugs.
 */
const getMidnightDate = (input = new Date()) => {
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.trim())) {
    const [y, m, d] = input.trim().split('-').map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }
  const d = new Date(input);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Fetch active attendance policy rules from Setting collection with safe defaults.
 */
const getAttendancePolicy = async () => {
  const s = await Setting.findOne().lean();
  return {
    dailyTargetHours: Number(s?.dailyTargetHours) || 8,
    officeStartTime: s?.officeStartTime || '09:30',
    lateGraceMinutes: s?.lateGraceMinutes !== undefined ? Number(s.lateGraceMinutes) : 15,
    halfDayThresholdHours: Number(s?.halfDayThresholdHours) || 4.5,
    overtimeThresholdHours: Number(s?.overtimeThresholdHours) || 8,
    autoClockOutMidnight: Boolean(s?.autoClockOutMidnight),
    businessHours: s?.businessHours || '09:00 AM - 06:00 PM',
  };
};

/**
 * Determine whether the day's first Clock In exceeds officeStartTime + lateGraceMinutes.
 */
const isFirstPunchLate = (firstClockIn, attendanceDate, policy) => {
  if (!firstClockIn) return false;
  const [hh, mm] = (policy.officeStartTime || '09:30').split(':').map((n) => parseInt(n, 10));
  const startHours = Number.isFinite(hh) ? hh : 9;
  const startMinutes = Number.isFinite(mm) ? mm : 30;
  const grace = Number.isFinite(policy.lateGraceMinutes) ? policy.lateGraceMinutes : 15;

  const cutoff = getMidnightDate(attendanceDate);
  cutoff.setHours(startHours, startMinutes + grace, 0, 0);
  return new Date(firstClockIn) > cutoff;
};

/**
 * Run a database operation inside a MongoDB transaction when connected to a replica set
 * or sharded cluster, falling back to direct execution on standalone instances.
 */
const runWithTransactionFallback = async (workFn) => {
  const topologyType = mongoose.connection?.client?.topology?.description?.type;
  const supportsTransactions =
    topologyType === 'ReplicaSetWithPrimary' || topologyType === 'Sharded';

  if (!supportsTransactions) {
    return workFn(null);
  }

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await workFn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
};

/**
 * Compute worked duration, break duration, active session, and target progress from sessions.
 */
const computeDayMetricsFromSessions = (sessions, now = new Date(), policy = {}) => {
  const dailyTargetHours = Number(policy.dailyTargetHours) || 8;
  const overtimeThresholdHours = Number(policy.overtimeThresholdHours) || 8;

  const sorted = [...(sessions || [])].sort(
    (a, b) => (a.sessionNumber || 0) - (b.sessionNumber || 0) || new Date(a.clockInTime) - new Date(b.clockInTime)
  );

  let completedMs = 0;
  let breakMs = 0;
  let activeSession = null;
  let lastClosedSession = null;

  for (let i = 0; i < sorted.length; i += 1) {
    const s = sorted[i];
    if (s.clockOutTime) {
      const diff = Math.max(0, new Date(s.clockOutTime) - new Date(s.clockInTime));
      completedMs += diff;
      lastClosedSession = s;
    } else if (!activeSession) {
      activeSession = s;
    }

    if (i > 0 && sorted[i - 1].clockOutTime) {
      const gap = new Date(s.clockInTime) - new Date(sorted[i - 1].clockOutTime);
      if (gap > 0) breakMs += gap;
    }
  }

  const activeElapsedMs = activeSession
    ? Math.max(0, now - new Date(activeSession.clockInTime))
    : 0;

  const completedMinutes = Math.round((completedMs / 60000) * 100) / 100;
  const completedHours = Math.round((completedMs / 3600000) * 100) / 100;
  const breakMinutes = Math.round((breakMs / 60000) * 100) / 100;
  const activeMinutes = Math.round((activeElapsedMs / 60000) * 100) / 100;
  const liveTotalMs = completedMs + activeElapsedMs;
  const liveTotalMinutes = Math.round((liveTotalMs / 60000) * 100) / 100;
  const liveTotalHours = Math.round((liveTotalMs / 3600000) * 100) / 100;

  const currentBreakMinutes =
    !activeSession && lastClosedSession?.clockOutTime
      ? Math.max(0, Math.round(((now - new Date(lastClosedSession.clockOutTime)) / 60000) * 100) / 100)
      : 0;

  const overtimeHours =
    completedHours > overtimeThresholdHours
      ? Math.round((completedHours - overtimeThresholdHours) * 100) / 100
      : 0;
  const remainingHours = Math.max(
    0,
    Math.round((dailyTargetHours - liveTotalHours) * 100) / 100
  );

  return {
    sortedSessions: sorted,
    activeSession,
    lastClosedSession,
    completedMs,
    completedMinutes,
    completedHours,
    breakMs,
    breakMinutes,
    currentBreakMinutes,
    activeElapsedMs,
    activeMinutes,
    liveTotalMinutes,
    liveTotalHours,
    overtimeHours,
    remainingHours,
    targetHours: dailyTargetHours,
    firstClockIn: sorted[0]?.clockInTime || null,
    lastClockOut: activeSession ? null : lastClosedSession?.clockOutTime || null,
  };
};

/**
 * Recalculate and persist the parent daily Attendance summary from its AttendanceSessions.
 */
const recalculateAttendanceSummary = async (attendanceId, policyOverride = null, dbSession = null) => {
  const policy = policyOverride || (await getAttendancePolicy());
  const attQuery = Attendance.findById(attendanceId);
  if (dbSession) attQuery.session(dbSession);
  const attendance = await attQuery;
  if (!attendance) return null;

  const sessQuery = AttendanceSession.find({ attendance: attendance._id }).sort({ sessionNumber: 1, clockInTime: 1 });
  if (dbSession) sessQuery.session(dbSession);
  const sessions = await sessQuery;

  const now = new Date();
  const metrics = computeDayMetricsFromSessions(sessions, now, policy);
  const todayMidnight = getMidnightDate(now);
  const attDayMidnight = getMidnightDate(attendance.date);
  const isPastDay = attDayMidnight < todayMidnight;

  attendance.sessionCount = sessions.length;
  attendance.totalMinutes = metrics.completedMinutes;
  attendance.totalHours = metrics.completedHours;
  attendance.breakMinutes = metrics.breakMinutes;
  attendance.overtimeHours = metrics.overtimeHours;

  if (metrics.firstClockIn) {
    attendance.clockIn = metrics.firstClockIn;
  }
  attendance.clockOut = metrics.activeSession ? null : metrics.lastClockOut;

  if (metrics.activeSession?.workMode) {
    attendance.workMode = metrics.activeSession.workMode;
  } else if (metrics.lastClosedSession?.workMode) {
    attendance.workMode = metrics.lastClosedSession.workMode;
  }

  if (sessions.length > 0) {
    const late = isFirstPunchLate(metrics.firstClockIn, attDayMidnight, policy);
    if (attendance.isFinalized && !metrics.activeSession && metrics.completedHours > 0 && metrics.completedHours < policy.halfDayThresholdHours) {
      attendance.status = 'Half Day';
    } else {
      attendance.status = late ? 'Late' : 'Present';
    }
  }

  if (attendance.isFinalized) {
    attendance.dailyStatus = 'Daily Attendance Finalized';
  } else if (metrics.activeSession) {
    const ageHours = metrics.activeElapsedMs / 3600000;
    attendance.dailyStatus = isPastDay && ageHours >= 16 ? 'Attendance Incomplete' : 'Currently Working';
  } else if (sessions.length === 0) {
    attendance.dailyStatus = 'Not Started';
  } else if (metrics.completedHours >= policy.dailyTargetHours) {
    attendance.dailyStatus = 'Daily Target Completed';
  } else if (isPastDay) {
    attendance.dailyStatus =
      metrics.completedHours < policy.halfDayThresholdHours ? 'Attendance Incomplete' : 'Completed Session';
  } else {
    attendance.dailyStatus = 'Between Sessions';
  }

  await attendance.save(dbSession ? { session: dbSession } : undefined);
  return { attendance, sessions, metrics, policy };
};

/**
 * Resolve department and employee scope according to the authenticated user's RBAC role.
 * Throws HttpError(403) when a manager or employee requests out-of-scope data.
 */
const resolveAuthorizedEmployees = async (user, filters = {}) => {
  const { department, employeeId, managerId } = filters;

  if (user.role === 'employee') {
    const ownEmpId = user.employee?._id || user.employee;
    if (!ownEmpId) return { employeeIds: [], employees: [], scopedDepartments: [] };
    if (employeeId && String(employeeId) !== String(ownEmpId)) {
      throw new HttpError(403, 'Employees can only access their own attendance records');
    }
    const emp = await Employee.findById(ownEmpId).populate('department', 'name');
    return {
      employeeIds: emp ? [emp._id] : [],
      employees: emp ? [emp] : [],
      scopedDepartments: emp?.department ? [emp.department._id] : [],
    };
  }

  if (user.role === 'manager') {
    const mgrEmp = user.employee?._id
      ? await Employee.findById(user.employee._id)
      : await Employee.findOne({ email: user.email });

    if (!mgrEmp) {
      return { employeeIds: [], employees: [], scopedDepartments: [] };
    }

    // Departments where this manager belongs or is explicitly assigned as Department.manager
    const managedDepts = await Department.find({ manager: mgrEmp._id }).select('_id');
    const deptSet = new Set(
      [mgrEmp.department, ...managedDepts.map((d) => d._id)]
        .filter(Boolean)
        .map((id) => String(id))
    );

    if (department && !deptSet.has(String(department))) {
      throw new HttpError(403, 'Not authorized to view attendance outside your assigned team or department');
    }

    const deptIds = department ? [department] : Array.from(deptSet);
    const teamQuery = { department: { $in: deptIds } };
    const teamEmployees = await Employee.find(teamQuery)
      .populate('department', 'name')
      .sort({ firstName: 1 });

    if (employeeId) {
      const target = teamEmployees.find((e) => String(e._id) === String(employeeId));
      if (!target) {
        throw new HttpError(403, 'Not authorized to access attendance for an employee outside your team');
      }
      return {
        employeeIds: [target._id],
        employees: [target],
        scopedDepartments: deptIds,
      };
    }

    return {
      employeeIds: teamEmployees.map((e) => e._id),
      employees: teamEmployees,
      scopedDepartments: deptIds,
    };
  }

  // Admin / HR organizational scope
  const empQuery = {};
  if (department) {
    empQuery.department = department;
  } else if (managerId) {
    const mgrEmp = await Employee.findById(managerId);
    const managedDepts = mgrEmp
      ? await Department.find({ manager: mgrEmp._id }).select('_id')
      : [];
    const mgrDeptIds = [
      ...(mgrEmp?.department ? [mgrEmp.department] : []),
      ...managedDepts.map((d) => d._id),
    ];
    empQuery.department = { $in: mgrDeptIds };
  }
  if (employeeId) {
    empQuery._id = employeeId;
  }

  const employees = await Employee.find(empQuery)
    .populate('department', 'name')
    .sort({ firstName: 1 });

  return {
    employeeIds: employees.map((e) => e._id),
    employees,
    scopedDepartments: department ? [department] : [],
  };
};

const countWorkingDays = (startDate, endDate) => {
  const cur = getMidnightDate(startDate);
  const end = getMidnightDate(endDate);
  if (cur > end) return 0;
  let count = 0;
  while (cur <= end) {
    if (cur.getDay() !== 0) count += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
};

/**
 * Resolve date boundaries for Today, This Week, This Month, or Custom Range.
 */
const resolvePersonalPeriodRange = (
  { range = 'month', month, year, startDate, endDate } = {},
  now = new Date()
) => {
  const todayMidnight = getMidnightDate(now);
  const todayEnd = new Date(todayMidnight);
  todayEnd.setHours(23, 59, 59, 999);

  const normalizedRange = ['today', 'week', 'month', 'custom'].includes(range) ? range : 'month';
  let periodStart;
  let periodEnd;
  let prevStart;
  let prevEnd;

  if (normalizedRange === 'today') {
    periodStart = new Date(todayMidnight);
    periodEnd = new Date(todayEnd);
    prevStart = new Date(todayMidnight);
    prevStart.setDate(prevStart.getDate() - 1);
    prevEnd = new Date(prevStart);
    prevEnd.setHours(23, 59, 59, 999);
  } else if (normalizedRange === 'week') {
    const day = todayMidnight.getDay();
    const diffToMon = day === 0 ? -6 : 1 - day;
    periodStart = new Date(todayMidnight);
    periodStart.setDate(todayMidnight.getDate() + diffToMon);
    periodEnd = new Date(periodStart);
    periodEnd.setDate(periodStart.getDate() + 6);
    periodEnd.setHours(23, 59, 59, 999);

    prevStart = new Date(periodStart);
    prevStart.setDate(prevStart.getDate() - 7);
    prevEnd = new Date(periodEnd);
    prevEnd.setDate(prevEnd.getDate() - 7);
  } else if (normalizedRange === 'custom' && (startDate || endDate)) {
    periodStart = startDate ? getMidnightDate(startDate) : getMidnightDate(endDate);
    const rawEnd = endDate ? getMidnightDate(endDate) : new Date(periodStart);
    periodEnd = new Date(rawEnd);
    periodEnd.setHours(23, 59, 59, 999);
    if (periodEnd < periodStart) {
      periodEnd = new Date(periodStart);
      periodEnd.setHours(23, 59, 59, 999);
    }

    const spanDays = Math.max(1, Math.round((getMidnightDate(periodEnd) - periodStart) / 86400000) + 1);
    prevEnd = new Date(periodStart);
    prevEnd.setMilliseconds(-1);
    prevStart = new Date(periodStart);
    prevStart.setDate(prevStart.getDate() - spanDays);
  } else {
    const y = parseInt(year, 10) || now.getFullYear();
    const m = parseInt(month, 10) || now.getMonth() + 1;
    periodStart = new Date(y, m - 1, 1, 0, 0, 0, 0);
    periodEnd = new Date(y, m, 0, 23, 59, 59, 999);

    prevStart = new Date(y, m - 2, 1, 0, 0, 0, 0);
    prevEnd = new Date(y, m - 1, 0, 23, 59, 59, 999);
  }

  const elapsedEnd = periodEnd < todayEnd ? new Date(periodEnd) : new Date(todayEnd);
  const totalPeriodWorkingDays = countWorkingDays(periodStart, periodEnd);
  const elapsedWorkingDays = elapsedEnd >= periodStart ? countWorkingDays(periodStart, elapsedEnd) : 0;

  return {
    rangeType: normalizedRange,
    periodStart,
    periodEnd,
    elapsedEnd,
    prevStart,
    prevEnd,
    totalPeriodWorkingDays,
    elapsedWorkingDays,
    todayMidnight,
    todayEnd,
  };
};

/**
 * Format local YYYY-MM-DD key from Date.
 */
const toLocalDateKey = (dateVal) => {
  const d = getMidnightDate(dateVal);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Compute comprehensive overview KPIs for a single employee across any resolved period.
 */
const computePersonalOverviewStats = async ({ employeeId, periodInfo, policy, now = new Date() }) => {
  const {
    rangeType,
    periodStart,
    periodEnd,
    elapsedEnd,
    prevStart,
    prevEnd,
    totalPeriodWorkingDays,
    elapsedWorkingDays,
    todayMidnight,
  } = periodInfo;

  const [empDoc, records, prevRecords, approvedLeaves, allRegs] = await Promise.all([
    Employee.findById(employeeId).select('joiningDate').lean(),
    Attendance.find({
      employee: employeeId,
      date: { $gte: periodStart, $lte: periodEnd },
    })
      .populate({
        path: 'employee',
        select: 'firstName lastName employeeId designation joiningDate',
        populate: { path: 'department', select: 'name' },
      })
      .sort({ date: -1 })
      .lean(),
    Attendance.find({
      employee: employeeId,
      date: { $gte: prevStart, $lte: prevEnd },
    })
      .select('totalHours totalMinutes')
      .lean(),
    LeaveRequest.find({
      employee: employeeId,
      status: 'Approved',
      startDate: { $lte: periodEnd },
      endDate: { $gte: periodStart },
    }).lean(),
    AttendanceRegularization.find({ employee: employeeId })
      .select('status date')
      .lean(),
  ]);

  const attIds = records.map((r) => r._id);
  const sessions = attIds.length
    ? await AttendanceSession.find({ attendance: { $in: attIds } })
        .sort({ sessionNumber: 1, clockInTime: 1 })
        .lean()
    : [];

  const sessMap = new Map();
  for (const s of sessions) {
    const k = String(s.attendance);
    if (!sessMap.has(k)) sessMap.set(k, []);
    sessMap.get(k).push(s);
  }

  let totalMinutes = 0;
  let liveAdditionalMinutes = 0;
  let totalBreakMinutes = 0;
  let totalOvertime = 0;
  let totalSessions = 0;
  let incompleteDays = 0;

  const attDateKeys = new Set();
  const enrichedRecords = records.map((rec) => {
    const recSessions = sessMap.get(String(rec._id)) || [];
    const recMidnight = getMidnightDate(rec.date);
    attDateKeys.add(toLocalDateKey(recMidnight));

    const openPunch = recSessions.find((s) => !s.clockOutTime);
    const isTodayRec = recMidnight.getTime() === todayMidnight.getTime();
    const isPastUnclosed = Boolean(openPunch) && recMidnight < todayMidnight;
    const hasIncompletePunch = recSessions.some((s) => s.status === 'Incomplete');
    const isIncomplete =
      rec.dailyStatus === 'Attendance Incomplete' || isPastUnclosed || hasIncompletePunch;

    let activeMinutes = 0;
    if (openPunch && isTodayRec && rec.dailyStatus === 'Currently Working') {
      activeMinutes = Math.max(
        0,
        Math.round(((now - new Date(openPunch.clockInTime)) / 60000) * 100) / 100
      );
      liveAdditionalMinutes += activeMinutes;
    }

    if (isIncomplete) incompleteDays += 1;

    const baseMinutes = rec.totalMinutes ?? Math.round((rec.totalHours || 0) * 60 * 100) / 100;
    totalMinutes += baseMinutes;
    totalBreakMinutes += Number(rec.breakMinutes || 0);
    totalOvertime += Number(rec.overtimeHours || 0);
    totalSessions += recSessions.length || rec.sessionCount || 1;

    const workModes = Array.from(
      new Set(recSessions.map((s) => s.workMode).filter(Boolean))
    );
    if (workModes.length === 0 && rec.workMode) workModes.push(rec.workMode);

    return {
      ...rec,
      sessions: recSessions,
      workModes,
      isIncomplete,
      hasOpenPunch: Boolean(openPunch),
      liveMinutes: Math.round((baseMinutes + activeMinutes) * 100) / 100,
      liveHours: Math.round(((baseMinutes + activeMinutes) / 60) * 100) / 100,
    };
  });

  // Collect approved leave date keys within period
  const leaveDateKeys = new Set();
  for (const lv of approvedLeaves) {
    const cur = getMidnightDate(lv.startDate);
    const end = getMidnightDate(lv.endDate);
    while (cur <= end) {
      if (cur >= periodStart && cur <= periodEnd && cur.getDay() !== 0) {
        leaveDateKeys.add(toLocalDateKey(cur));
      }
      cur.setDate(cur.getDate() + 1);
    }
  }

  // Count past missed working days (up to yesterday) respecting joiningDate
  const joinMidnight = empDoc?.joiningDate ? getMidnightDate(empDoc.joiningDate) : null;
  const effectiveStart = joinMidnight && joinMidnight > periodStart ? joinMidnight : periodStart;
  const absentCutoff =
    rangeType === 'today'
      ? new Date(todayMidnight.getTime() - 1)
      : elapsedEnd >= todayMidnight
        ? new Date(todayMidnight.getTime() - 1)
        : elapsedEnd;

  let missedAbsentDays = 0;
  let adjustedExpectedWorkingDays = elapsedWorkingDays;
  if (joinMidnight && joinMidnight > periodStart) {
    adjustedExpectedWorkingDays =
      elapsedEnd >= joinMidnight ? countWorkingDays(joinMidnight, elapsedEnd) : 0;
  }

  if (absentCutoff >= effectiveStart) {
    const cur = getMidnightDate(effectiveStart);
    const endDay = getMidnightDate(absentCutoff);
    while (cur <= endDay) {
      if (cur.getDay() !== 0) {
        const key = toLocalDateKey(cur);
        if (!attDateKeys.has(key) && !leaveDateKeys.has(key)) {
          missedAbsentDays += 1;
        }
      }
      cur.setDate(cur.getDate() + 1);
    }
  }

  const explicitAbsentDays = enrichedRecords.filter((r) => r.status === 'Absent').length;
  const absentDays = explicitAbsentDays + missedAbsentDays;
  const presentDays = enrichedRecords.filter((r) =>
    ['Present', 'Late', 'Half Day'].includes(r.status)
  ).length;
  const lateDays = enrichedRecords.filter((r) => r.status === 'Late').length;
  const onLeaveDays = Array.from(leaveDateKeys).filter((k) => !attDateKeys.has(k)).length;

  const liveTotalMinutes = Math.round((totalMinutes + liveAdditionalMinutes) * 100) / 100;
  const totalHours = Math.round((totalMinutes / 60) * 100) / 100;
  const liveTotalHours = Math.round((liveTotalMinutes / 60) * 100) / 100;
  const prevTotalHours = prevRecords.reduce((sum, r) => sum + (Number(r.totalHours) || 0), 0);
  const trendVsPreviousPct =
    prevTotalHours > 0
      ? Math.round(((liveTotalHours - prevTotalHours) / prevTotalHours) * 100)
      : null;

  const dailyTarget = Number(policy.dailyTargetHours) || 8;
  const effectivePeriodDays =
    rangeType === 'today'
      ? 1
      : totalPeriodWorkingDays;
  const targetHours = Math.round(effectivePeriodDays * dailyTarget * 100) / 100;
  const targetAchievedPct =
    targetHours > 0 ? Math.min(100, Math.round((liveTotalHours / targetHours) * 100)) : 0;

  const totalWorkingDays = enrichedRecords.length;
  const avgDailyHours = totalWorkingDays > 0 ? Math.round((totalHours / totalWorkingDays) * 100) / 100 : 0;

  const sortedDesc = [...enrichedRecords].sort((a, b) => new Date(b.date) - new Date(a.date));
  let streak = 0;
  for (const r of sortedDesc) {
    if (r.status === 'Present') streak += 1;
    else break;
  }

  const corrections = {
    total: allRegs.length,
    pending: allRegs.filter((r) => r.status === 'Pending').length,
    approved: allRegs.filter((r) => r.status === 'Approved').length,
    rejected: allRegs.filter((r) => r.status === 'Rejected').length,
  };

  return {
    records: enrichedRecords,
    summary: {
      rangeType,
      periodStart,
      periodEnd,
      daysLogged: totalWorkingDays,
      totalWorkingDays,
      expectedWorkingDays: Math.max(adjustedExpectedWorkingDays, presentDays + absentDays),
      totalPeriodWorkingDays: effectivePeriodDays,
      weekdays: effectivePeriodDays,
      presentDays,
      absentDays,
      onLeaveDays,
      lateDays,
      incompleteDays,
      totalMinutes: Math.round(totalMinutes * 100) / 100,
      liveTotalMinutes,
      totalHours,
      liveTotalHours,
      prevTotalHours: Math.round(prevTotalHours * 100) / 100,
      trendVsPreviousPct,
      totalBreakMinutes: Math.round(totalBreakMinutes * 100) / 100,
      totalOvertime: Math.round(totalOvertime * 100) / 100,
      totalSessions,
      avgDailyHours,
      dailyTargetHours: dailyTarget,
      targetHours,
      monthlyTarget: targetHours,
      targetAchievedPct,
      streak,
      corrections,
    },
  };
};

module.exports = {
  HttpError,
  getMidnightDate,
  getAttendancePolicy,
  isFirstPunchLate,
  runWithTransactionFallback,
  computeDayMetricsFromSessions,
  recalculateAttendanceSummary,
  resolveAuthorizedEmployees,
  resolvePersonalPeriodRange,
  toLocalDateKey,
  computePersonalOverviewStats,
};
