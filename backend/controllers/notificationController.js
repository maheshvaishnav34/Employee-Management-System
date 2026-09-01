const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');

// ── helpers ─────────────────────────────────────────────────────────────────
const todayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// Compute the notification payload (shared by REST + SSE)
const buildNotificationPayload = async () => {
  const now = new Date();
  const todayMonth = now.getMonth() + 1;
  const todayDay   = now.getDate();

  // 1. Pending leaves
  const pendingLeaves = await LeaveRequest.countDocuments({ status: 'Pending' });

  // 2. Recently submitted leaves (last 24h) for "new" alert trigger
  const since24h = new Date(now - 24 * 60 * 60 * 1000);
  const newLeaveRequests = await LeaveRequest.find({
    status: 'Pending',
    appliedDate: { $gte: since24h },
  })
    .populate('employee', 'firstName lastName employeeId designation')
    .sort({ appliedDate: -1 })
    .limit(5)
    .lean();

  // 3. Attendance today
  const activeEmployees = await Employee.countDocuments({ status: 'Active' });
  const todayPresentCount = await Attendance.countDocuments({ date: todayStart() });
  const attendanceRate = activeEmployees > 0
    ? Math.round((todayPresentCount / activeEmployees) * 100) : 0;
  const todayAbsent = Math.max(0, activeEmployees - todayPresentCount);

  // 4. Upcoming birthdays (next 7 days)
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
    _id: emp._id,
    firstName: emp.firstName,
    lastName: emp.lastName,
    department: emp.department,
    birthdayDate: new Date(emp.dateOfBirth).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
    isToday:
      new Date(emp.dateOfBirth).getMonth() + 1 === todayMonth &&
      new Date(emp.dateOfBirth).getDate() === todayDay,
  }));

  // 5. Work anniversaries this month
  const allActive = await Employee.find({ status: 'Active', joiningDate: { $exists: true } })
    .select('firstName lastName joiningDate department')
    .populate('department', 'name')
    .lean();

  const workAnniversaries = allActive
    .filter((emp) => {
      const jd = new Date(emp.joiningDate);
      return jd.getMonth() + 1 === todayMonth && jd.getDate() >= todayDay;
    })
    .map((emp) => ({
      _id: emp._id,
      firstName: emp.firstName,
      lastName: emp.lastName,
      department: emp.department,
      yearsCompleted: now.getFullYear() - new Date(emp.joiningDate).getFullYear(),
    }))
    .slice(0, 5);

  // 6. Total employees
  const totalEmployees = await Employee.countDocuments();

  return {
    pendingLeaves,
    newLeaveRequests,
    attendanceRate,
    todayPresent: todayPresentCount,
    todayAbsent,
    totalEmployees,
    activeEmployees,
    upcomingBirthdays,
    workAnniversaries,
    timestamp: now.toISOString(),
  };
};

// ── REST endpoint ────────────────────────────────────────────────────────────
// GET /api/notifications/data
const getNotificationData = async (req, res, next) => {
  try {
    const payload = await buildNotificationPayload();
    res.json({ success: true, data: payload });
  } catch (err) {
    next(err);
  }
};

// ── SSE endpoint ─────────────────────────────────────────────────────────────
// GET /api/notifications/stream
// Keeps connection alive and pushes updates every 10 seconds
const streamNotifications = async (req, res) => {
  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable Nginx buffering if any
  res.flushHeaders();

  const send = (eventName, data) => {
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Send initial data immediately
  try {
    const payload = await buildNotificationPayload();
    send('notification', payload);
  } catch (err) {
    console.error('[SSE] Initial payload error:', err.message);
  }

  // Send heartbeat every 15s to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 15000);

  // Push fresh data every 10 seconds
  const dataInterval = setInterval(async () => {
    try {
      const payload = await buildNotificationPayload();
      send('notification', payload);
    } catch (err) {
      console.error('[SSE] Interval payload error:', err.message);
    }
  }, 10000);

  // Cleanup on client disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    clearInterval(dataInterval);
  });
};

module.exports = { getNotificationData, streamNotifications };
