const Attendance = require('../models/Attendance');
const AttendanceSession = require('../models/AttendanceSession');
const AttendanceRegularization = require('../models/AttendanceRegularization');
const Employee = require('../models/Employee');
const AuditLog = require('../models/AuditLog');
const LeaveRequest = require('../models/LeaveRequest');
const {
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
} = require('../utils/attendanceHelper');

/**
 * Helper to attach ordered AttendanceSession arrays to an array of Attendance records.
 */
const attachSessionsToRecords = async (records) => {
  if (!records || records.length === 0) return [];
  const attIds = records.map((r) => r._id);
  const sessions = await AttendanceSession.find({ attendance: { $in: attIds } })
    .sort({ sessionNumber: 1, clockInTime: 1 })
    .lean();

  const sessMap = new Map();
  for (const s of sessions) {
    const key = String(s.attendance);
    if (!sessMap.has(key)) sessMap.set(key, []);
    sessMap.get(key).push(s);
  }

  return records.map((rec) => {
    const plain = typeof rec.toObject === 'function' ? rec.toObject() : { ...rec };
    plain.sessions = sessMap.get(String(rec._id)) || [];
    return plain;
  });
};

// @desc    Clock in (supports multiple sessions per day)
// @route   POST /api/attendance/clockin
// @access  Private (Authenticated user with linked Employee)
const clockIn = async (req, res, next) => {
  try {
    const employeeId = req.user.employee?._id || req.user.employee;
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Only accounts linked to an employee profile can clock in',
      });
    }

    const workMode = ['Office', 'WFH', 'Hybrid'].includes(req.body?.workMode)
      ? req.body.workMode
      : 'Office';

    // Guard against duplicate active session (matches partial unique index status === 'Active')
    const existingActive = await AttendanceSession.findOne({
      employee: employeeId,
      status: 'Active',
    }).sort({ clockInTime: -1 });

    if (existingActive) {
      return res.status(409).json({
        success: false,
        message: `You already have an active Clock In started at ${new Date(existingActive.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Please clock out first.`,
      });
    }

    const now = new Date();
    const todayMidnight = getMidnightDate(now);
    const policy = await getAttendancePolicy();

    const existingAttendance = await Attendance.findOne({
      employee: employeeId,
      date: todayMidnight,
    });

    if (existingAttendance?.isFinalized) {
      return res.status(403).json({
        success: false,
        message: 'Today’s attendance has been finalized and cannot accept new punches.',
      });
    }

    const result = await runWithTransactionFallback(async (dbSession) => {
      let attendance = existingAttendance;

      if (!attendance) {
        const status = isFirstPunchLate(now, todayMidnight, policy) ? 'Late' : 'Present';
        const created = await Attendance.create(
          [
            {
              employee: employeeId,
              date: todayMidnight,
              clockIn: now,
              clockOut: null,
              status,
              workMode,
              dailyStatus: 'Currently Working',
            },
          ],
          dbSession ? { session: dbSession } : undefined
        );
        attendance = created[0];
      } else {
        // Re-fetch inside transaction if applicable
        const q = Attendance.findById(attendance._id);
        if (dbSession) q.session(dbSession);
        attendance = await q;
      }

      const lastSessionQuery = AttendanceSession.findOne({
        employee: employeeId,
        attendanceDate: todayMidnight,
      }).sort({ sessionNumber: -1 });
      if (dbSession) lastSessionQuery.session(dbSession);
      const lastSession = await lastSessionQuery;

      const nextSessionNumber = lastSession ? lastSession.sessionNumber + 1 : 1;

      const createdSessions = await AttendanceSession.create(
        [
          {
            employee: employeeId,
            attendance: attendance._id,
            attendanceDate: todayMidnight,
            sessionNumber: nextSessionNumber,
            clockInTime: now,
            clockOutTime: null,
            workMode,
            status: 'Active',
          },
        ],
        dbSession ? { session: dbSession } : undefined
      );

      const recalculated = await recalculateAttendanceSummary(
        attendance._id,
        policy,
        dbSession
      );

      return {
        session: createdSessions[0],
        ...recalculated,
      };
    });

    res.status(201).json({
      success: true,
      message: `Clocked in successfully at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}.`,
      attendance: result.attendance,
      session: result.session,
      sessions: result.sessions,
      summary: result.metrics,
    });
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Concurrent punch detected: you are already clocked in.',
      });
    }
    next(error);
  }
};

// @desc    Clock out of the current active session (keeps day open for further sessions)
// @route   POST /api/attendance/clockout
// @access  Private (Authenticated user with linked Employee)
const clockOut = async (req, res, next) => {
  try {
    const employeeId = req.user.employee?._id || req.user.employee;
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Only accounts linked to an employee profile can clock out',
      });
    }

    // Locate active open session (supports midnight-crossing shifts with status: 'Active')
    const activeSession = await AttendanceSession.findOne({
      employee: employeeId,
      status: 'Active',
    }).sort({ clockInTime: -1 });

    if (!activeSession) {
      return res.status(404).json({
        success: false,
        message: 'No active Clock In found. Please clock in first.',
      });
    }

    const parentAtt = await Attendance.findById(activeSession.attendance);
    if (parentAtt?.isFinalized) {
      return res.status(403).json({
        success: false,
        message: 'This day’s attendance has been finalized and cannot be modified.',
      });
    }

    const now = new Date();
    const policy = await getAttendancePolicy();

    const result = await runWithTransactionFallback(async (dbSession) => {
      const sQuery = AttendanceSession.findById(activeSession._id);
      if (dbSession) sQuery.session(dbSession);
      const sess = await sQuery;

      if (!sess || sess.clockOutTime) {
        throw new HttpError(409, 'This punch has already been clocked out.');
      }

      const diffMs = Math.max(0, now - new Date(sess.clockInTime));
      sess.clockOutTime = now;
      sess.durationMinutes = Math.round((diffMs / 60000) * 100) / 100;
      sess.durationHours = Math.round((diffMs / 3600000) * 100) / 100;
      sess.status = 'Completed';
      await sess.save(dbSession ? { session: dbSession } : undefined);

      const recalculated = await recalculateAttendanceSummary(
        sess.attendance,
        policy,
        dbSession
      );

      return { session: sess, ...recalculated };
    });

    res.status(200).json({
      success: true,
      message: `Clocked out successfully at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}. Worked: ${result.session.durationHours} hrs · Total today: ${result.attendance.totalHours} hrs`,
      attendance: result.attendance,
      session: result.session,
      sessions: result.sessions,
      summary: result.metrics,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Get current punch status, active session, today's sessions & live metrics
// @route   GET /api/attendance/today-status
// @access  Private
const getTodayStatus = async (req, res, next) => {
  try {
    const policy = await getAttendancePolicy();
    const employeeId = req.user.employee?._id || req.user.employee;

    if (!employeeId) {
      return res.status(200).json({
        success: true,
        clockedIn: false,
        clockedOut: false,
        isWorking: false,
        canClockIn: false,
        canClockOut: false,
        dailyStatus: 'Not Started',
        activeSession: null,
        sessions: [],
        todaySessions: [],
        record: null,
        policy,
        summary: {
          totalMinutes: 0,
          totalHours: 0,
          liveTotalMinutes: 0,
          liveTotalHours: 0,
          breakMinutes: 0,
          currentBreakMinutes: 0,
          completedSessions: 0,
          totalSessions: 0,
          activeMinutes: 0,
          targetHours: policy.dailyTargetHours,
          remainingHours: policy.dailyTargetHours,
          overtimeHours: 0,
          firstClockIn: null,
          lastClockOut: null,
          isFinalized: false,
          status: null,
        },
      });
    }

    const now = new Date();
    const todayMidnight = getMidnightDate(now);

    const [openSession, todayRecord, todaySessions, incompleteCount] = await Promise.all([
      AttendanceSession.findOne({ employee: employeeId, status: 'Active' })
        .sort({ clockInTime: -1 })
        .lean(),
      Attendance.findOne({ employee: employeeId, date: todayMidnight }).lean(),
      AttendanceSession.find({ employee: employeeId, attendanceDate: todayMidnight })
        .sort({ sessionNumber: 1, clockInTime: 1 })
        .lean(),
      AttendanceSession.countDocuments({ employee: employeeId, status: 'Incomplete' }),
    ]);

    // If an active session belongs to a prior calendar date (midnight-crossing or unclosed), load that day's sessions
    const isPreviousDayActive =
      !!openSession && getMidnightDate(openSession.attendanceDate).getTime() !== todayMidnight.getTime();

    const activeDayRecord = isPreviousDayActive
      ? await Attendance.findById(openSession.attendance).lean()
      : todayRecord;

    const activeDaySessions = isPreviousDayActive
      ? await AttendanceSession.find({ attendance: openSession.attendance })
          .sort({ sessionNumber: 1, clockInTime: 1 })
          .lean()
      : todaySessions;

    const metrics = computeDayMetricsFromSessions(activeDaySessions, now, policy);
    const todayMetrics = isPreviousDayActive
      ? computeDayMetricsFromSessions(todaySessions, now, policy)
      : metrics;

    let dailyStatus = 'Not Started';
    if (todayRecord?.isFinalized) {
      dailyStatus = 'Daily Attendance Finalized';
    } else if (openSession) {
      const openAgeHours = (now - new Date(openSession.clockInTime)) / 3600000;
      dailyStatus = isPreviousDayActive && openAgeHours >= 16
        ? 'Attendance Incomplete'
        : 'Currently Working';
    } else if (todaySessions.length > 0) {
      dailyStatus =
        todayMetrics.completedHours >= policy.dailyTargetHours
          ? 'Daily Target Completed'
          : 'Between Sessions';
    }

    const completedSessions = activeDaySessions.filter((s) => Boolean(s.clockOutTime)).length;

    res.status(200).json({
      success: true,
      clockedIn: todaySessions.length > 0 || Boolean(openSession),
      clockedOut: !openSession && todaySessions.length > 0,
      isWorking: Boolean(openSession),
      isPreviousDayActive,
      canClockIn: !openSession && !todayRecord?.isFinalized,
      canClockOut: Boolean(openSession) && !activeDayRecord?.isFinalized,
      dailyStatus,
      incompleteCount,
      activeSession: openSession || null,
      sessions: activeDaySessions,
      todaySessions,
      record: activeDayRecord || null,
      policy,
      summary: {
        totalMinutes: metrics.completedMinutes,
        totalHours: metrics.completedHours,
        liveTotalMinutes: metrics.liveTotalMinutes,
        liveTotalHours: metrics.liveTotalHours,
        breakMinutes: metrics.breakMinutes,
        currentBreakMinutes: metrics.currentBreakMinutes,
        completedSessions,
        totalSessions: activeDaySessions.length,
        activeMinutes: metrics.activeMinutes,
        targetHours: policy.dailyTargetHours,
        remainingHours: metrics.remainingHours,
        overtimeHours: metrics.overtimeHours,
        firstClockIn: metrics.firstClockIn,
        lastClockOut: metrics.lastClockOut,
        isFinalized: Boolean(activeDayRecord?.isFinalized),
        status: activeDayRecord?.status || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged in user's attendance history (daily records + individual sessions + optional status/mode filters)
// @route   GET /api/attendance/my-logs
// @access  Private
const getMyAttendanceLogs = async (req, res, next) => {
  try {
    const employeeId = req.user.employee?._id || req.user.employee;
    if (!employeeId) {
      return res.status(200).json({ success: true, count: 0, totalUnfiltered: 0, logs: [] });
    }

    const { date, startDate, endDate, range, workMode, status, includeCalendarGaps } = req.query;
    const now = new Date();
    const todayMidnight = getMidnightDate(now);
    const query = { employee: employeeId };

    let gapWindowStart = null;
    let gapWindowEnd = null;

    if (date) {
      const target = getMidnightDate(date);
      query.date = target;
      gapWindowStart = target;
      gapWindowEnd = new Date(target);
      gapWindowEnd.setHours(23, 59, 59, 999);
    } else if (startDate || endDate || (range && range !== 'all')) {
      const resolved = resolvePersonalPeriodRange(
        {
          range: startDate || endDate ? 'custom' : range,
          startDate,
          endDate,
        },
        now
      );
      query.date = { $gte: resolved.periodStart, $lte: resolved.periodEnd };
      gapWindowStart = resolved.periodStart;
      gapWindowEnd = resolved.elapsedEnd;
    } else if (includeCalendarGaps === 'true') {
      const resolved = resolvePersonalPeriodRange({ range: 'month' }, now);
      gapWindowStart = resolved.periodStart;
      gapWindowEnd = resolved.elapsedEnd;
    }

    const [empDoc, records] = await Promise.all([
      Employee.findById(employeeId)
        .select('firstName lastName employeeId designation joiningDate department')
        .populate('department', 'name')
        .lean(),
      Attendance.find(query)
        .populate({
          path: 'employee',
          select: 'firstName lastName employeeId designation',
          populate: { path: 'department', select: 'name' },
        })
        .sort({ date: -1 }),
    ]);

    const attached = await attachSessionsToRecords(records);
    const attDateKeys = new Set();

    let enrichedLogs = attached.map((rec) => {
      const recSessions = rec.sessions || [];
      const recMidnight = getMidnightDate(rec.date);
      attDateKeys.add(toLocalDateKey(recMidnight));

      const openPunch = recSessions.find((s) => !s.clockOutTime);
      const isTodayRec = recMidnight.getTime() === todayMidnight.getTime();
      const isPastUnclosed = Boolean(openPunch) && recMidnight < todayMidnight;
      const hasIncompletePunch = recSessions.some((s) => s.status === 'Incomplete');
      const isIncomplete =
        rec.dailyStatus === 'Attendance Incomplete' || isPastUnclosed || hasIncompletePunch;

      const baseMinutes = rec.totalMinutes ?? Math.round((rec.totalHours || 0) * 60 * 100) / 100;
      const activeMinutes =
        openPunch && isTodayRec && rec.dailyStatus === 'Currently Working'
          ? Math.max(0, Math.round(((now - new Date(openPunch.clockInTime)) / 60000) * 100) / 100)
          : 0;

      const workModes = Array.from(new Set(recSessions.map((s) => s.workMode).filter(Boolean)));
      if (workModes.length === 0 && rec.workMode) workModes.push(rec.workMode);

      return {
        ...rec,
        workModes,
        hasOpenPunch: Boolean(openPunch),
        isIncomplete,
        liveMinutes: Math.round((baseMinutes + activeMinutes) * 100) / 100,
        liveHours: Math.round(((baseMinutes + activeMinutes) / 60) * 100) / 100,
      };
    });

    if (includeCalendarGaps === 'true' && gapWindowStart && gapWindowEnd && gapWindowEnd >= gapWindowStart) {
      const approvedLeaves = await LeaveRequest.find({
        employee: employeeId,
        status: 'Approved',
        startDate: { $lte: gapWindowEnd },
        endDate: { $gte: gapWindowStart },
      }).lean();

      const leaveMap = new Map();
      for (const lv of approvedLeaves) {
        const cur = getMidnightDate(lv.startDate);
        const end = getMidnightDate(lv.endDate);
        while (cur <= end) {
          if (cur >= gapWindowStart && cur <= gapWindowEnd && cur.getDay() !== 0) {
            leaveMap.set(toLocalDateKey(cur), lv);
          }
          cur.setDate(cur.getDate() + 1);
        }
      }

      const joinMidnight = empDoc?.joiningDate ? getMidnightDate(empDoc.joiningDate) : null;
      const effectiveStart =
        joinMidnight && joinMidnight > gapWindowStart ? joinMidnight : gapWindowStart;

      const cur = getMidnightDate(effectiveStart);
      const endDay = getMidnightDate(gapWindowEnd);
      while (cur <= endDay) {
        if (cur.getDay() !== 0) {
          const key = toLocalDateKey(cur);
          if (!attDateKeys.has(key)) {
            const leaveDoc = leaveMap.get(key);
            if (leaveDoc) {
              enrichedLogs.push({
                _id: `leave-${key}`,
                isVirtual: true,
                employee: empDoc,
                date: new Date(cur),
                clockIn: null,
                clockOut: null,
                sessions: [],
                sessionCount: 0,
                totalHours: 0,
                totalMinutes: 0,
                liveMinutes: 0,
                liveHours: 0,
                breakMinutes: 0,
                overtimeHours: 0,
                workMode: null,
                workModes: [],
                status: 'On Leave',
                dailyStatus: 'On Leave',
                leaveType: leaveDoc.leaveType,
                isIncomplete: false,
                hasOpenPunch: false,
              });
            } else if (cur < todayMidnight) {
              enrichedLogs.push({
                _id: `absent-${key}`,
                isVirtual: true,
                employee: empDoc,
                date: new Date(cur),
                clockIn: null,
                clockOut: null,
                sessions: [],
                sessionCount: 0,
                totalHours: 0,
                totalMinutes: 0,
                liveMinutes: 0,
                liveHours: 0,
                breakMinutes: 0,
                overtimeHours: 0,
                workMode: null,
                workModes: [],
                status: 'Absent',
                dailyStatus: 'Absent',
                isIncomplete: false,
                hasOpenPunch: false,
              });
            }
          }
        }
        cur.setDate(cur.getDate() + 1);
      }
    }

    enrichedLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
    const totalUnfiltered = enrichedLogs.length;

    if (workMode && workMode !== 'All') {
      enrichedLogs = enrichedLogs.filter(
        (rec) => !rec.isVirtual && (rec.workMode === workMode || rec.workModes?.includes(workMode))
      );
    }

    if (status && status !== 'All') {
      enrichedLogs = enrichedLogs.filter((rec) => {
        if (status === 'Incomplete') return Boolean(rec.isIncomplete);
        if (status === 'Currently Working') return rec.dailyStatus === 'Currently Working';
        return rec.status === status || rec.dailyStatus === status;
      });
    }

    res.status(200).json({
      success: true,
      count: enrichedLogs.length,
      totalUnfiltered,
      logs: enrichedLogs,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged-in employee's session-level punch history
// @route   GET /api/attendance/sessions
// @access  Private
const getMySessions = async (req, res, next) => {
  try {
    const employeeId = req.user.employee?._id || req.user.employee;
    if (!employeeId) {
      return res.status(200).json({ success: true, count: 0, sessions: [] });
    }

    const { date, startDate, endDate, month, year } = req.query;
    const query = { employee: employeeId };

    if (date) {
      query.attendanceDate = getMidnightDate(date);
    } else if (startDate || endDate) {
      query.attendanceDate = {};
      if (startDate) query.attendanceDate.$gte = getMidnightDate(startDate);
      if (endDate) {
        const end = getMidnightDate(endDate);
        end.setHours(23, 59, 59, 999);
        query.attendanceDate.$lte = end;
      }
    } else if (month && year) {
      const m = parseInt(month, 10);
      const y = parseInt(year, 10);
      query.attendanceDate = {
        $gte: new Date(y, m - 1, 1),
        $lte: new Date(y, m, 0, 23, 59, 59, 999),
      };
    }

    const sessions = await AttendanceSession.find(query)
      .populate({
        path: 'employee',
        select: 'firstName lastName employeeId designation',
        populate: { path: 'department', select: 'name' },
      })
      .sort({ attendanceDate: -1, sessionNumber: 1 });

    res.status(200).json({
      success: true,
      count: sessions.length,
      sessions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged-in employee's aggregated attendance summary (supports Today / Week / Month / Custom Range)
// @route   GET /api/attendance/my-summary
// @access  Private
const getMyAttendanceSummary = async (req, res, next) => {
  try {
    const employeeId = req.user.employee?._id || req.user.employee;
    const policy = await getAttendancePolicy();

    if (!employeeId) {
      return res.status(200).json({ success: true, summary: {}, policy });
    }

    const now = new Date();
    const periodInfo = resolvePersonalPeriodRange(req.query, now);
    const { summary } = await computePersonalOverviewStats({
      employeeId,
      periodInfo,
      policy,
      now,
    });

    res.status(200).json({
      success: true,
      policy,
      summary: {
        year: periodInfo.periodStart.getFullYear(),
        month: periodInfo.periodStart.getMonth() + 1,
        ...summary,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all employees attendance logs (Admin / HR / Manager scoped)
// @route   GET /api/attendance/logs
// @access  Private (Admin, HR, Manager)
const getAllAttendanceLogs = async (req, res, next) => {
  try {
    const { date, startDate, endDate, department, employeeId, managerId, status, dailyStatus, exceptionsOnly } = req.query;

    const scope = await resolveAuthorizedEmployees(req.user, {
      department,
      employeeId,
      managerId,
    });

    const query = {
      employee: { $in: scope.employeeIds },
    };

    if (date) {
      query.date = getMidnightDate(date);
    } else if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = getMidnightDate(startDate);
      if (endDate) {
        const end = getMidnightDate(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    if (status) query.status = status;
    if (dailyStatus) query.dailyStatus = dailyStatus;

    if (exceptionsOnly === 'true') {
      const todayMidnight = getMidnightDate(new Date());
      query.$or = [
        { status: 'Late' },
        { dailyStatus: 'Attendance Incomplete' },
        { clockOut: null, date: { $lt: todayMidnight } },
      ];
    }

    const records = await Attendance.find(query)
      .populate({
        path: 'employee',
        select: 'firstName lastName employeeId designation status',
        populate: { path: 'department', select: 'name' },
      })
      .sort({ date: -1, clockIn: -1 });

    const logs = await attachSessionsToRecords(records);

    res.status(200).json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Get team / organization daily attendance summary cards & employee table
// @route   GET /api/attendance/summary
// @access  Private (Admin, HR, Manager)
const getAttendanceSummary = async (req, res, next) => {
  try {
    const { date, department, employeeId, managerId, status, dailyStatus, exceptionsOnly } = req.query;
    const targetDate = date ? getMidnightDate(date) : getMidnightDate(new Date());
    const policy = await getAttendancePolicy();

    const scope = await resolveAuthorizedEmployees(req.user, {
      department,
      employeeId,
      managerId,
    });

    const activeEmployees = scope.employees.filter((e) => e.status === 'Active');
    const allScopedIds = scope.employees.map((e) => e._id);

    const dayRecords = await Attendance.find({
      employee: { $in: allScopedIds },
      date: targetDate,
    }).lean();

    const recordByEmp = new Map(dayRecords.map((r) => [String(r.employee), r]));
    const attIds = dayRecords.map((r) => r._id);
    const daySessions = attIds.length
      ? await AttendanceSession.find({ attendance: { $in: attIds } })
          .sort({ sessionNumber: 1, clockInTime: 1 })
          .lean()
      : [];

    const sessionsByAtt = new Map();
    for (const s of daySessions) {
      const key = String(s.attendance);
      if (!sessionsByAtt.has(key)) sessionsByAtt.set(key, []);
      sessionsByAtt.get(key).push(s);
    }

    // Also include inactive employees only if they actually have a record on targetDate
    const employeesToDisplay = scope.employees.filter(
      (e) => e.status === 'Active' || recordByEmp.has(String(e._id))
    );

    const now = new Date();
    const isToday = targetDate.getTime() === getMidnightDate(now).getTime();

    let totalTeamMembers = activeEmployees.length;
    let presentToday = 0;
    let currentlyWorking = 0;
    let notClockedIn = 0;
    let clockedOut = 0;
    let lateArrivals = 0;
    let incompleteAttendance = 0;
    let totalWorkingHoursSum = 0;

    const allRows = employeesToDisplay.map((emp) => {
      const rec = recordByEmp.get(String(emp._id));
      const sessions = rec ? sessionsByAtt.get(String(rec._id)) || [] : [];

      if (!rec) {
        if (emp.status === 'Active') notClockedIn += 1;
        return {
          employee: {
            _id: emp._id,
            firstName: emp.firstName,
            lastName: emp.lastName,
            employeeId: emp.employeeId,
            designation: emp.designation,
            department: emp.department,
          },
          attendanceId: null,
          date: targetDate,
          clockIn: null,
          clockOut: null,
          sessionsCount: 0,
          sessions: [],
          totalMinutes: 0,
          totalHours: 0,
          breakMinutes: 0,
          overtimeHours: 0,
          workMode: '–',
          status: 'Not Clocked In',
          dailyStatus: 'Not Started',
          isLate: false,
          hasMissingClockOut: false,
          isFinalized: false,
        };
      }

      const metrics = computeDayMetricsFromSessions(sessions, now, policy);
      const hasOpenSession = Boolean(metrics.activeSession);
      const totalHours = isToday && hasOpenSession ? metrics.liveTotalHours : rec.totalHours || metrics.completedHours;
      const totalMinutes = isToday && hasOpenSession ? metrics.liveTotalMinutes : rec.totalMinutes || metrics.completedMinutes;
      const isLate = rec.status === 'Late';
      const hasMissingClockOut =
        (!isToday && hasOpenSession) || rec.dailyStatus === 'Attendance Incomplete';

      presentToday += 1;
      if (hasOpenSession && !hasMissingClockOut) {
        currentlyWorking += 1;
      } else if (!hasOpenSession && sessions.length > 0) {
        clockedOut += 1;
      }
      if (isLate) lateArrivals += 1;
      if (hasMissingClockOut) incompleteAttendance += 1;
      totalWorkingHoursSum += Number(totalHours) || 0;

      return {
        employee: {
          _id: emp._id,
          firstName: emp.firstName,
          lastName: emp.lastName,
          employeeId: emp.employeeId,
          designation: emp.designation,
          department: emp.department,
        },
        attendanceId: rec._id,
        date: rec.date,
        clockIn: rec.clockIn || metrics.firstClockIn,
        clockOut: hasOpenSession ? null : rec.clockOut || metrics.lastClockOut,
        sessionsCount: sessions.length || rec.sessionCount || 1,
        sessions,
        totalMinutes: Math.round(totalMinutes * 100) / 100,
        totalHours: Math.round(totalHours * 100) / 100,
        breakMinutes: rec.breakMinutes ?? metrics.breakMinutes,
        overtimeHours: rec.overtimeHours || 0,
        workMode: rec.workMode || 'Office',
        status: rec.status,
        dailyStatus: rec.dailyStatus || (hasOpenSession ? 'Currently Working' : 'Between Sessions'),
        isLate,
        hasMissingClockOut,
        isFinalized: Boolean(rec.isFinalized),
      };
    });

    let rows = allRows;
    if (status) {
      rows = rows.filter((r) => r.status === status);
    }
    if (dailyStatus) {
      rows = rows.filter((r) => r.dailyStatus === dailyStatus);
    }
    if (exceptionsOnly === 'true') {
      rows = rows.filter((r) => r.isLate || r.hasMissingClockOut || r.status === 'Not Clocked In');
    }

    res.status(200).json({
      success: true,
      date: targetDate,
      policy,
      cards: {
        totalTeamMembers,
        presentToday,
        currentlyWorking,
        notClockedIn,
        clockedOut,
        lateArrivals,
        incompleteAttendance,
        totalWorkingHours: Math.round(totalWorkingHoursSum * 100) / 100,
      },
      count: rows.length,
      rows,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Get single employee attendance & session breakdown (Admin / HR / Manager scoped)
// @route   GET /api/attendance/employee/:employeeId
// @access  Private (Admin, HR, Manager)
const getEmployeeAttendance = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const scope = await resolveAuthorizedEmployees(req.user, {
      employeeId: req.params.employeeId,
    });

    if (!scope.employees.length) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const query = { employee: req.params.employeeId };
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = getMidnightDate(startDate);
      if (endDate) {
        const end = getMidnightDate(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const records = await Attendance.find(query).sort({ date: -1 });
    const logs = await attachSessionsToRecords(records);

    res.status(200).json({
      success: true,
      employee: scope.employees[0],
      count: logs.length,
      logs,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Submit attendance regularization / missed punch correction request
// @route   POST /api/attendance/regularize
// @access  Private (Employee / Linked User)
const requestRegularization = async (req, res, next) => {
  try {
    const employeeId = req.user.employee?._id || req.user.employee;
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Only accounts linked to an employee profile can request regularization',
      });
    }

    const { date, clockIn, clockOut, reason, sessionId, sessionNumber, requestType } = req.body;
    const resolvedType = ['Correction', 'MissedPunch', 'AddSession'].includes(requestType)
      ? requestType
      : sessionId
        ? 'Correction'
        : 'AddSession';

    if (!date || !clockOut || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Please provide date, clockOut, and reason',
      });
    }

    const targetDate = getMidnightDate(date);

    // Block employee modification when day is already finalized
    const existingAtt = await Attendance.findOne({ employee: employeeId, date: targetDate });
    if (existingAtt?.isFinalized) {
      return res.status(403).json({
        success: false,
        message: 'Attendance for this date is finalized. Contact HR/Admin to unlock it first.',
      });
    }

    let targetSession = null;
    if (sessionId) {
      targetSession = await AttendanceSession.findOne({ _id: sessionId, employee: employeeId });
    } else if (sessionNumber && existingAtt) {
      targetSession = await AttendanceSession.findOne({
        attendance: existingAtt._id,
        sessionNumber: Number(sessionNumber),
      });
    } else if (resolvedType === 'MissedPunch' && existingAtt) {
      targetSession = await AttendanceSession.findOne({
        attendance: existingAtt._id,
        clockOutTime: null,
      }).sort({ sessionNumber: 1 });
    }

    const originalClockIn = targetSession?.clockInTime || existingAtt?.clockIn || null;
    const originalClockOut = targetSession
      ? targetSession.clockOutTime || null
      : existingAtt?.clockOut || null;

    const effectiveClockIn = clockIn
      ? new Date(clockIn)
      : resolvedType === 'MissedPunch' && originalClockIn
        ? new Date(originalClockIn)
        : null;

    if (!effectiveClockIn || Number.isNaN(effectiveClockIn.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid Clock In time',
      });
    }

    const effectiveClockOut = new Date(clockOut);
    if (Number.isNaN(effectiveClockOut.getTime()) || effectiveClockOut <= effectiveClockIn) {
      return res.status(400).json({
        success: false,
        message: 'Clock Out time must be after Clock In time',
      });
    }

    const targetSessionNum =
      targetSession?.sessionNumber || (sessionNumber ? Number(sessionNumber) : null);
    const existingPending = await AttendanceRegularization.findOne({
      employee: employeeId,
      date: targetDate,
      sessionNumber: targetSessionNum,
      status: 'Pending',
    });

    if (existingPending) {
      return res.status(400).json({
        success: false,
        message: 'A pending correction request already exists for this date/punch.',
      });
    }

    const regularization = await AttendanceRegularization.create({
      employee: employeeId,
      date: targetDate,
      clockIn: effectiveClockIn,
      clockOut: effectiveClockOut,
      originalClockIn,
      originalClockOut,
      reason,
      session: targetSession?._id || sessionId || null,
      sessionNumber: targetSessionNum,
      requestType: resolvedType,
    });

    res.status(201).json({
      success: true,
      message: 'Regularization request submitted successfully',
      regularization,
    });
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A pending correction request already exists for this date/punch.',
      });
    }
    next(error);
  }
};

// @desc    Get current employee's regularization requests
// @route   GET /api/attendance/regularize/my
// @access  Private
const getMyRegularizations = async (req, res, next) => {
  try {
    const employeeId = req.user.employee?._id || req.user.employee;
    if (!employeeId) {
      return res.status(200).json({
        success: true,
        count: 0,
        counts: { total: 0, pending: 0, approved: 0, rejected: 0 },
        regularizations: [],
      });
    }

    const { status } = req.query;
    const allForCounts = await AttendanceRegularization.find({ employee: employeeId })
      .select('status')
      .lean();

    const counts = {
      total: allForCounts.length,
      pending: allForCounts.filter((r) => r.status === 'Pending').length,
      approved: allForCounts.filter((r) => r.status === 'Approved').length,
      rejected: allForCounts.filter((r) => r.status === 'Rejected').length,
    };

    const query = { employee: employeeId };
    if (status && ['Pending', 'Approved', 'Rejected'].includes(status)) {
      query.status = status;
    }

    const regularizations = await AttendanceRegularization.find(query)
      .populate('approvedBy', 'username email role')
      .populate('session', 'sessionNumber clockInTime clockOutTime workMode status')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: regularizations.length,
      counts,
      regularizations,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all regularization requests (Admin / HR / Manager scoped)
// @route   GET /api/attendance/regularize/all
// @access  Private (Admin, HR, Manager)
const getAllRegularizations = async (req, res, next) => {
  try {
    const scope = await resolveAuthorizedEmployees(req.user);

    const regularizations = await AttendanceRegularization.find({
      employee: { $in: scope.employeeIds },
    })
      .populate({
        path: 'employee',
        select: 'firstName lastName employeeId designation',
        populate: { path: 'department', select: 'name' },
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: regularizations.length,
      regularizations,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve or reject regularization request (updates AttendanceSession + recalculates summary)
// @route   PUT /api/attendance/regularize/:id
// @access  Private (Admin, HR, Manager)
const processRegularization = async (req, res, next) => {
  try {
    const { status, remarks } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be Approved or Rejected',
      });
    }

    const request = await AttendanceRegularization.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Regularization request not found' });
    }

    // Verify manager scope via shared RBAC resolver
    await resolveAuthorizedEmployees(req.user, { employeeId: request.employee });

    if (request.status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'Request has already been processed' });
    }

    const targetAtt = await Attendance.findOne({ employee: request.employee, date: request.date });
    if (status === 'Approved' && targetAtt?.isFinalized && req.user.role === 'manager') {
      return res.status(403).json({
        success: false,
        message: 'This day has been finalized by HR/Admin and cannot be modified by a Manager.',
      });
    }

    request.status = status;
    request.remarks = remarks || '';
    request.approvedBy = req.user._id;
    await request.save();

    if (status === 'Approved') {
      const policy = await getAttendancePolicy();
      let attendance = targetAtt;
      if (!attendance) {
        attendance = await Attendance.create({
          employee: request.employee,
          date: request.date,
          clockIn: request.clockIn,
          clockOut: request.clockOut,
          status: isFirstPunchLate(request.clockIn, request.date, policy) ? 'Late' : 'Present',
          dailyStatus: 'Between Sessions',
        });
      }

      const diffMs = Math.max(0, new Date(request.clockOut) - new Date(request.clockIn));
      const durationMinutes = Math.round((diffMs / 60000) * 100) / 100;
      const durationHours = Math.round((diffMs / 3600000) * 100) / 100;

      let targetSession = null;
      if (request.session) {
        targetSession = await AttendanceSession.findById(request.session);
      } else if (request.sessionNumber) {
        targetSession = await AttendanceSession.findOne({
          attendance: attendance._id,
          sessionNumber: request.sessionNumber,
        });
      } else {
        // Fallback: update any incomplete/unclosed session on that day, or session 1 if only 1 exists
        targetSession = await AttendanceSession.findOne({
          attendance: attendance._id,
          clockOutTime: null,
        }).sort({ sessionNumber: 1 });
        if (!targetSession && request.requestType !== 'AddSession') {
          const count = await AttendanceSession.countDocuments({ attendance: attendance._id });
          if (count === 1) {
            targetSession = await AttendanceSession.findOne({ attendance: attendance._id });
          }
        }
      }

      if (targetSession) {
        targetSession.clockInTime = request.clockIn;
        targetSession.clockOutTime = request.clockOut;
        targetSession.durationMinutes = durationMinutes;
        targetSession.durationHours = durationHours;
        targetSession.status = 'Adjusted';
        targetSession.isManual = true;
        targetSession.adjustedBy = req.user._id;
        targetSession.notes = remarks || request.reason;
        await targetSession.save();
      } else {
        const lastSess = await AttendanceSession.findOne({ attendance: attendance._id }).sort({
          sessionNumber: -1,
        });
        const nextNum = lastSess ? lastSess.sessionNumber + 1 : 1;
        await AttendanceSession.create({
          employee: request.employee,
          attendance: attendance._id,
          attendanceDate: request.date,
          sessionNumber: nextNum,
          clockInTime: request.clockIn,
          clockOutTime: request.clockOut,
          durationMinutes,
          durationHours,
          workMode: attendance.workMode || 'Office',
          status: 'Adjusted',
          isManual: true,
          adjustedBy: req.user._id,
          notes: remarks || request.reason,
        });
      }

      attendance.lastModifiedBy = req.user._id;
      await attendance.save();
      await recalculateAttendanceSummary(attendance._id, policy);
    }

    await AuditLog.create({
      action: 'UPDATE_ATTENDANCE',
      entity: 'Attendance',
      entityId: targetAtt?._id || null,
      performedBy: req.user._id,
      details: `${status} regularization request for employee on ${new Date(request.date).toLocaleDateString()}`,
    });

    res.status(200).json({
      success: true,
      message: `Regularization request successfully ${status.toLowerCase()}`,
      request,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Manual punch add/update by Admin or HR (with audit trail)
// @route   POST /api/attendance/manual-punch
// @access  Private (Admin, HR)
const manualPunchAdjustment = async (req, res, next) => {
  try {
    const { employeeId, date, sessionId, clockInTime, clockOutTime, workMode, reason } = req.body;
    if (!employeeId || !date || !clockInTime || !reason) {
      return res.status(400).json({
        success: false,
        message: 'employeeId, date, clockInTime, and reason are required',
      });
    }

    const emp = await Employee.findById(employeeId);
    if (!emp) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const inDate = new Date(clockInTime);
    const outDate = clockOutTime ? new Date(clockOutTime) : null;
    if (outDate && outDate <= inDate) {
      return res.status(400).json({
        success: false,
        message: 'Clock Out time must be after Clock In time',
      });
    }

    const targetDate = getMidnightDate(date);
    const policy = await getAttendancePolicy();

    let attendance = await Attendance.findOne({ employee: employeeId, date: targetDate });
    if (attendance?.isFinalized) {
      return res.status(403).json({
        success: false,
        message: 'Attendance day is finalized. Reopen it before editing punches.',
      });
    }

    if (!attendance) {
      attendance = await Attendance.create({
        employee: employeeId,
        date: targetDate,
        clockIn: inDate,
        clockOut: outDate,
        status: isFirstPunchLate(inDate, targetDate, policy) ? 'Late' : 'Present',
        workMode: workMode || 'Office',
        dailyStatus: outDate ? 'Between Sessions' : 'Currently Working',
      });
    }

    const diffMs = outDate ? Math.max(0, outDate - inDate) : 0;
    const durationMinutes = outDate ? Math.round((diffMs / 60000) * 100) / 100 : 0;
    const durationHours = outDate ? Math.round((diffMs / 3600000) * 100) / 100 : 0;

    let sessionDoc;
    if (sessionId) {
      sessionDoc = await AttendanceSession.findById(sessionId);
      if (!sessionDoc || String(sessionDoc.employee) !== String(employeeId)) {
        return res.status(404).json({ success: false, message: 'Target session not found' });
      }
      sessionDoc.clockInTime = inDate;
      sessionDoc.clockOutTime = outDate;
      sessionDoc.durationMinutes = durationMinutes;
      sessionDoc.durationHours = durationHours;
      if (workMode) sessionDoc.workMode = workMode;
      sessionDoc.status = outDate ? 'Adjusted' : 'Active';
      sessionDoc.isManual = true;
      sessionDoc.adjustedBy = req.user._id;
      sessionDoc.notes = reason;
      await sessionDoc.save();
    } else {
      if (!outDate) {
        const activeOpen = await AttendanceSession.findOne({
          employee: employeeId,
          status: 'Active',
        });
        if (activeOpen) {
          return res.status(409).json({
            success: false,
            message: 'Employee already has an open active session. Provide clockOutTime or close the open session first.',
          });
        }
      }
      const lastSess = await AttendanceSession.findOne({ attendance: attendance._id }).sort({
        sessionNumber: -1,
      });
      const nextNum = lastSess ? lastSess.sessionNumber + 1 : 1;
      sessionDoc = await AttendanceSession.create({
        employee: employeeId,
        attendance: attendance._id,
        attendanceDate: targetDate,
        sessionNumber: nextNum,
        clockInTime: inDate,
        clockOutTime: outDate,
        durationMinutes,
        durationHours,
        workMode: workMode || attendance.workMode || 'Office',
        status: outDate ? 'Adjusted' : 'Active',
        isManual: true,
        adjustedBy: req.user._id,
        notes: reason,
      });
    }

    attendance.lastModifiedBy = req.user._id;
    await attendance.save();
    const updated = await recalculateAttendanceSummary(attendance._id, policy);

    await AuditLog.create({
      action: 'MANUAL_PUNCH_ATTENDANCE',
      entity: 'Attendance',
      entityId: attendance._id,
      performedBy: req.user._id,
      details: `${sessionId ? 'Updated' : 'Added'} Session #${sessionDoc.sessionNumber} for ${emp.firstName} ${emp.lastName} (${emp.employeeId}) on ${targetDate.toLocaleDateString()}. Reason: ${reason}`,
    });

    res.status(200).json({
      success: true,
      message: 'Manual attendance punch saved successfully',
      attendance: updated.attendance,
      session: sessionDoc,
      sessions: updated.sessions,
    });
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Employee already has an active open session.',
      });
    }
    next(error);
  }
};

// @desc    Finalize or reopen a daily attendance record (Admin / HR only)
// @route   PUT /api/attendance/:id/finalize
// @access  Private (Admin, HR)
const finalizeAttendanceDay = async (req, res, next) => {
  try {
    const attendance = await Attendance.findById(req.params.id).populate(
      'employee',
      'firstName lastName employeeId'
    );
    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }

    const finalize = req.body?.isFinalized !== undefined ? Boolean(req.body.isFinalized) : true;

    if (finalize) {
      const openSession = await AttendanceSession.findOne({
        attendance: attendance._id,
        status: 'Active',
      });
      if (openSession) {
        return res.status(400).json({
          success: false,
          message: `Cannot finalize day while Punch #${openSession.sessionNumber} is still open. Close or adjust the active punch first.`,
        });
      }
    }

    attendance.isFinalized = finalize;
    attendance.finalizedBy = finalize ? req.user._id : null;
    attendance.finalizedAt = finalize ? new Date() : null;
    attendance.lastModifiedBy = req.user._id;
    await attendance.save();

    const policy = await getAttendancePolicy();
    const updated = await recalculateAttendanceSummary(attendance._id, policy);

    await AuditLog.create({
      action: 'FINALIZE_ATTENDANCE',
      entity: 'Attendance',
      entityId: attendance._id,
      performedBy: req.user._id,
      details: `${finalize ? 'Finalized' : 'Reopened'} daily attendance for ${attendance.employee?.firstName || ''} ${attendance.employee?.lastName || ''} on ${new Date(attendance.date).toLocaleDateString()}`,
    });

    res.status(200).json({
      success: true,
      message: finalize ? 'Daily attendance finalized' : 'Daily attendance reopened',
      attendance: updated.attendance,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged-in employee monthly/period history + summary stats (with multi-punch detail)
// @route   GET /api/attendance/my-history?range=month&year=2026&month=11
// @access  Private
const getMyHistorySummary = async (req, res, next) => {
  try {
    const employeeId = req.user.employee?._id || req.user.employee;
    if (!employeeId) {
      return res.status(200).json({ success: true, records: [], summary: {} });
    }

    const policy = await getAttendancePolicy();
    const now = new Date();
    const periodInfo = resolvePersonalPeriodRange(req.query, now);
    const { records, summary } = await computePersonalOverviewStats({
      employeeId,
      periodInfo,
      policy,
      now,
    });

    res.status(200).json({
      success: true,
      policy,
      records,
      summary,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged-in employee's last 7 days attendance
// @route   GET /api/attendance/weekly-summary
// @access  Private
const getWeeklySummary = async (req, res, next) => {
  try {
    const employeeId = req.user.employee?._id || req.user.employee;
    if (!employeeId) {
      return res.status(200).json({ success: true, days: [] });
    }

    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const records = await Attendance.find({
      employee: employeeId,
      date: { $gte: sevenDaysAgo },
    })
      .sort({ date: 1 })
      .lean();

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const days = [];

    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      d.setHours(0, 0, 0, 0);

      const found = records.find((r) => getMidnightDate(r.date).getTime() === d.getTime());
      days.push({
        date: d.toISOString(),
        dayName: dayNames[d.getDay()],
        dayNum: d.getDate(),
        hours: found ? found.totalHours : null,
        breakMinutes: found ? found.breakMinutes || 0 : 0,
        sessionsCount: found ? found.sessionCount || 1 : 0,
        dailyStatus: found ? found.dailyStatus : null,
        status: found ? found.status : d.getDay() === 0 ? 'Weekend' : null,
        clockIn: found ? found.clockIn : null,
        clockOut: found ? found.clockOut : null,
        isToday: i === 0,
      });
    }

    const weekTotal = records.reduce((sum, r) => sum + (r.totalHours || 0), 0);

    res.status(200).json({
      success: true,
      days,
      weekTotal: Math.round(weekTotal * 100) / 100,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all employees attendance history (Admin / HR / Manager scoped) with date range filter
// @route   GET /api/attendance/all-history
// @access  Private (Admin, HR, Manager)
const getAllHistory = async (req, res, next) => {
  try {
    const {
      startDate,
      endDate,
      employeeId,
      department,
      managerId,
      status,
      dailyStatus,
      exceptionsOnly,
      page = 1,
      limit = 50,
    } = req.query;

    const scope = await resolveAuthorizedEmployees(req.user, {
      department,
      employeeId,
      managerId,
    });

    const query = {
      employee: { $in: scope.employeeIds },
    };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = getMidnightDate(startDate);
      if (endDate) {
        const end = getMidnightDate(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    if (status) query.status = status;
    if (dailyStatus) query.dailyStatus = dailyStatus;

    if (exceptionsOnly === 'true') {
      const todayMidnight = getMidnightDate(new Date());
      query.$or = [
        { status: 'Late' },
        { dailyStatus: 'Attendance Incomplete' },
        { clockOut: null, date: { $lt: todayMidnight } },
      ];
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const total = await Attendance.countDocuments(query);
    const rawRecords = await Attendance.find(query)
      .populate({
        path: 'employee',
        select: 'firstName lastName employeeId designation',
        populate: { path: 'department', select: 'name' },
      })
      .sort({ date: -1, clockIn: -1 })
      .skip(skip)
      .limit(limitNum);

    const records = await attachSessionsToRecords(rawRecords);

    res.status(200).json({
      success: true,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      records,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

module.exports = {
  clockIn,
  clockOut,
  getTodayStatus,
  getMyAttendanceLogs,
  getMySessions,
  getMyAttendanceSummary,
  getAllAttendanceLogs,
  getAttendanceSummary,
  getEmployeeAttendance,
  requestRegularization,
  getMyRegularizations,
  getAllRegularizations,
  processRegularization,
  manualPunchAdjustment,
  finalizeAttendanceDay,
  getMyHistorySummary,
  getWeeklySummary,
  getAllHistory,
};
