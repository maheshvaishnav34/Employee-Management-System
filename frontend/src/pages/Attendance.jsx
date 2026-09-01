import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import AttendanceWidget from '../components/AttendanceWidget';
import {
  Clock, CalendarCheck, Search, Users, AlertCircle,
  Calendar, Award, TrendingUp, HelpCircle, ArrowUpRight
} from 'lucide-react';

const Attendance = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Admin filters
  const [dateFilter, setDateFilter] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employees, setEmployees] = useState([]); // list for employee selection dropdown
  
  // Calendar states
  const [currentDate, setCurrentDate] = useState(new Date());

  const isAdminOrHR = ['admin', 'hr', 'manager'].includes(user?.role);

  // Regularization states
  const [regularizations, setRegularizations] = useState([]);
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [regFormData, setRegFormData] = useState({
    date: '',
    clockIn: '09:30',
    clockOut: '18:30',
    reason: ''
  });
  const [adminTab, setAdminTab] = useState('logs'); // 'logs' or 'requests'
  const [processingRemarks, setProcessingRemarks] = useState({});
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');

  const fetchAttendanceLogs = async () => {
    try {
      setLoading(true);
      setError('');
      if (isAdminOrHR) {
        // Admin log query builder
        const params = [];
        if (dateFilter) params.push(`date=${dateFilter}`);
        if (employeeSearch) params.push(`employeeId=${employeeSearch}`);
        const queryStr = params.length > 0 ? `?${params.join('&')}` : '';
        
        const data = await api.get(`/attendance/logs${queryStr}`);
        if (data.success) {
          setLogs(data.logs);
        }
      } else {
        // Employee logs fetch
        const data = await api.get('/attendance/my-logs');
        if (data.success) {
          setLogs(data.logs);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load attendance logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeesList = async () => {
    try {
      if (isAdminOrHR) {
        const data = await api.get('/employees');
        if (data.success) {
          setEmployees(data.employees);
        }
      }
    } catch (err) {
      console.error('Failed to load employees list', err.message);
    }
  };

  const fetchRegularizations = async () => {
    try {
      const endpoint = isAdminOrHR ? '/attendance/regularize/all' : '/attendance/regularize/my';
      const data = await api.get(endpoint);
      if (data.success) {
        setRegularizations(data.regularizations);
      }
    } catch (err) {
      console.error('Failed to load regularization requests', err.message);
    }
  };

  const handleRegFormSubmit = async (e) => {
    e.preventDefault();
    setRegSubmitting(true);
    setRegError('');
    setRegSuccess('');

    try {
      const { date, clockIn, clockOut, reason } = regFormData;
      const clockInDate = new Date(`${date}T${clockIn}:00`);
      const clockOutDate = new Date(`${date}T${clockOut}:00`);

      if (isNaN(clockInDate.getTime()) || isNaN(clockOutDate.getTime())) {
        throw new Error('Invalid date or time input');
      }

      if (clockOutDate <= clockInDate) {
        throw new Error('Clock Out time must be after Clock In time');
      }

      const res = await api.post('/attendance/regularize', {
        date,
        clockIn: clockInDate.toISOString(),
        clockOut: clockOutDate.toISOString(),
        reason
      });

      if (res.success) {
        setRegSuccess('Correction request submitted successfully!');
        setRegFormData({
          date: '',
          clockIn: '09:30',
          clockOut: '18:30',
          reason: ''
        });
        fetchRegularizations();
        setTimeout(() => {
          setIsRegModalOpen(false);
          setRegSuccess('');
        }, 1500);
      } else {
        setRegError(res.message || 'Failed to submit request');
      }
    } catch (err) {
      setRegError(err.message || 'Failed to submit request');
    } finally {
      setRegSubmitting(false);
    }
  };

  const handleProcessRegularization = async (id, status) => {
    try {
      const remarksText = processingRemarks[id] || '';
      const res = await api.put(`/attendance/regularize/${id}`, {
        status,
        remarks: remarksText
      });
      if (res.success) {
        fetchAttendanceLogs();
        fetchRegularizations();
        setProcessingRemarks(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      } else {
        alert(res.message || `Failed to ${status.toLowerCase()} request`);
      }
    } catch (err) {
      alert(err.message || `Failed to ${status.toLowerCase()} request`);
    }
  };

  useEffect(() => {
    fetchAttendanceLogs();
    fetchEmployeesList();
    fetchRegularizations();
  }, [dateFilter, employeeSearch, user]);

  // Compute Stats for Employees
  const totalDays = logs.length;
  const presentDays = logs.filter(l => l.status === 'Present' || l.status === 'Late' || l.status === 'Half Day').length;
  const lateDays = logs.filter(l => l.status === 'Late').length;
  const averageHours = totalDays > 0 
    ? (logs.reduce((acc, log) => acc + (log.totalHours || 0), 0) / totalDays).toFixed(1) 
    : '0.0';
  const attendanceRate = totalDays > 0 
    ? Math.round((presentDays / totalDays) * 100) 
    : 100;
  const onTimeRate = presentDays > 0 
    ? Math.round(((presentDays - lateDays) / presentDays) * 100) 
    : 100;

  // Compute Stats for Admin/HR
  const totalPresentToday = logs.length;
  const totalLateToday = logs.filter(l => l.status === 'Late').length;
  const totalHalfDayToday = logs.filter(l => l.status === 'Half Day').length;

  // Calendar render helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const getDaysInMonth = (m, y) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (m, y) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(month, year);
  const firstDayIndex = getFirstDayOfMonth(month, year);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Find log for a specific date in month calendar
  const getLogForDate = (day) => {
    const target = new Date(year, month, day);
    target.setHours(0,0,0,0);
    return logs.find((l) => {
      const logDate = new Date(l.date);
      logDate.setHours(0,0,0,0);
      return logDate.getTime() === target.getTime();
    });
  };

  const getWeeklyTrend = () => {
    const activeLogs = [...logs]
      .filter(l => new Date(l.date).getDay() !== 0)
      .slice(0, 6)
      .reverse();

    if (activeLogs.length > 0) {
      return activeLogs.map(log => ({
        label: new Date(log.date).toLocaleDateString([], { weekday: 'short', day: 'numeric' }),
        hours: log.totalHours || 0,
        overtime: log.overtimeHours || 0
      }));
    }

    // Default mock data if no logs exist yet
    return [
      { label: 'Mon 8', hours: 8.2, overtime: 0.2 },
      { label: 'Tue 9', hours: 7.5, overtime: 0 },
      { label: 'Wed 10', hours: 9.0, overtime: 1.0 },
      { label: 'Thu 11', hours: 8.0, overtime: 0 },
      { label: 'Fri 12', hours: 8.5, overtime: 0.5 },
      { label: 'Sat 13', hours: 6.8, overtime: 0 }
    ];
  };


  return (
    <div className="page-container">
      {/* Header Summary */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '14px',
          background: 'linear-gradient(135deg, #2ebd7f 0%, #1a9e65 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 15px rgba(46,189,127,0.3)',
        }}>
          <CalendarCheck size={22} color="white" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Attendance Dashboard</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            {isAdminOrHR ? 'Monitor company-wide employee logs and work hours' : 'Manage your punch status, work shifts and timesheet'}
          </p>
        </div>
      </div>

      {/* STATS ROW */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        {isAdminOrHR ? (
          <>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(46,189,127,0.1)', color: 'var(--success)' }}>
                <Users size={22} />
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Active Clock-ins</span>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0.2rem 0' }}>{totalPresentToday}</h2>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Logged present in timesheet</span>
              </div>
            </div>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(255,177,25,0.1)', color: 'var(--warning)' }}>
                <Clock size={22} />
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Late Arrivals</span>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0.2rem 0' }}>{totalLateToday}</h2>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Clocked in after 09:30 AM</span>
              </div>
            </div>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(103,119,239,0.1)', color: 'var(--primary-accent)' }}>
                <TrendingUp size={22} />
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Half-Day Sessions</span>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0.2rem 0' }}>{totalHalfDayToday}</h2>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Partial working sessions</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(46,189,127,0.1)', color: 'var(--success)' }}>
                <TrendingUp size={22} />
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Attendance Rate</span>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0.2rem 0' }}>{attendanceRate}%</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--success)', fontSize: '0.7rem', fontWeight: 700 }}>
                  <ArrowUpRight size={12} /> Present: {presentDays} days
                </div>
              </div>
            </div>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(103,119,239,0.1)', color: 'var(--primary-accent)' }}>
                <Award size={22} />
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>On-Time Arrival</span>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0.2rem 0' }}>{onTimeRate}%</h2>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Late marks: {lateDays}</span>
              </div>
            </div>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(255,177,25,0.1)', color: 'var(--warning)' }}>
                <Clock size={22} />
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Avg. Shift Hours</span>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0.2rem 0' }}>{averageHours} hrs</h2>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Calculated over history logs</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* WORKSPACE CONTENT BODY */}
      {!isAdminOrHR ? (
        <>
          {/* EMPLOYEE VIEW - Portal + Interactive Calendar Sheet */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'start', marginBottom: '2rem' }} className="attendance-layout">
          
          {/* Left Column: Punch Portal Console */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <AttendanceWidget onActionComplete={fetchAttendanceLogs} />
            
            <button
              onClick={() => setIsRegModalOpen(true)}
              className="btn btn-primary"
              style={{
                padding: '0.8rem 1.5rem',
                borderRadius: '10px',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #6777ef 0%, #3f51b5 100%)',
                boxShadow: '0 4px 15px rgba(103,119,239,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                cursor: 'pointer'
              }}
            >
              <Clock size={16} /> Request Correction
            </button>
            
            <div className="card" style={{ padding: '1.25rem' }}>
              <span className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <HelpCircle size={15} style={{ color: 'var(--primary-accent)' }} />
                Shift Policy Info
              </span>
              <ul style={{ paddingLeft: '1.15rem', fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.4rem', lineHeight: 1.4 }}>
                <li>Standard Shift: <strong>09:30 AM - 06:30 PM</strong></li>
                <li>Grace Period: <strong>15 minutes</strong> (Late marked after 9:45 AM)</li>
                <li>Working Days: <strong>Monday to Saturday</strong></li>
                <li>Overtime starts after <strong>9.0 hours</strong> of work</li>
              </ul>
            </div>
          </div>

          {/* Right Column: Premium Calendar Sheet */}
          <div className="card" style={{ padding: '1.5rem' }}>
            
            {/* Calendar Header with Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={18} style={{ color: 'var(--primary-accent)' }} />
                {monthNames[month]} {year}
              </h3>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button onClick={handlePrevMonth} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>Prev</button>
                <button onClick={handleNextMonth} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>Next</button>
              </div>
            </div>

            {/* Calendar Grid Sheet */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', textAlign: 'center' }} className="week-grid">
              
              {/* Day Titles */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', padding: '0.25rem 0' }}>
                  {d}
                </div>
              ))}

              {/* Blank spacers before first day */}
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div key={`blank-${i}`} style={{ height: '55px', opacity: 0.1 }} />
              ))}

              {/* Days numbers with attendance status bindings */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const log = getLogForDate(day);
                const isSunday = new Date(year, month, day).getDay() === 0;
                
                let dayBg = 'var(--bg-primary)';
                let dayBorder = '1px solid var(--border-color)';
                let dotColor = 'transparent';
                let tooltip = 'No Record';

                if (isSunday) {
                  dayBg = 'rgba(255,255,255,0.01)';
                  tooltip = 'Sunday Weekend';
                }

                if (log) {
                  if (log.status === 'Present') {
                    dayBorder = '1px solid rgba(46,189,127,0.3)';
                    dayBg = 'rgba(46,189,127,0.04)';
                    dotColor = 'var(--success)';
                    tooltip = `Present (${log.totalHours} hrs worked) · In: ${new Date(log.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                  } else if (log.status === 'Late') {
                    dayBorder = '1px solid rgba(255,177,25,0.3)';
                    dayBg = 'rgba(255,177,25,0.04)';
                    dotColor = 'var(--warning)';
                    tooltip = `Late arrival · In: ${new Date(log.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · Mode: ${log.workMode || 'Office'}`;
                  } else if (log.status === 'Half Day') {
                    dayBorder = '1px solid rgba(103,119,239,0.3)';
                    dayBg = 'rgba(103,119,239,0.04)';
                    dotColor = 'var(--primary-accent)';
                    tooltip = `Half Day (${log.totalHours} hrs)`;
                  } else if (log.status === 'Absent') {
                    dayBorder = '1px solid rgba(255,91,91,0.3)';
                    dayBg = 'rgba(255,91,91,0.04)';
                    dotColor = 'var(--danger)';
                    tooltip = 'Absent';
                  }
                }

                return (
                  <div
                    key={`day-${day}`}
                    title={tooltip}
                    style={{
                      height: '55px',
                      background: dayBg,
                      border: dayBorder,
                      borderRadius: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.4rem',
                      cursor: 'default',
                      position: 'relative',
                    }}
                  >
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isSunday ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                      {day}
                    </span>
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: dotColor,
                        display: 'block',
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Calendar Legend Indicators */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem', flexWrap: 'wrap', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              {[
                { label: 'On-Time (Present)', color: 'var(--success)' },
                { label: 'Late Clock-in', color: 'var(--warning)' },
                { label: 'Half Day', color: 'var(--primary-accent)' },
                { label: 'Absent', color: 'var(--danger)' }
              ].map((item) => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }} />
                  {item.label}
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* Work Hours & Overtime Analytics Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 2fr', gap: '2rem', marginTop: '2rem', marginBottom: '2rem' }} className="attendance-layout">
          {/* Analytics Summary Stats Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.5rem' }}>
            <span className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <TrendingUp size={15} style={{ color: 'var(--primary-accent)' }} />
              Overtime & Warning Summary
            </span>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, justifyContent: 'center' }}>
              
              {/* Total Overtime */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                <div style={{ textAlign: 'left' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Total Overtime Worked</span>
                  <h4 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0.1rem 0', color: 'var(--success)' }}>
                    {logs.reduce((acc, log) => acc + (log.overtimeHours || 0), 0).toFixed(1)} hrs
                  </h4>
                </div>
              </div>

              {/* Under Hours Warnings */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                <div style={{ textAlign: 'left' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Under-Hours Warnings
                    {logs.filter(log => (log.totalHours || 0) < 8.0 && log.totalHours > 0).length > 0 && (
                      <AlertCircle size={12} style={{ color: 'var(--danger)' }} />
                    )}
                  </span>
                  <h4 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0.1rem 0', color: logs.filter(log => (log.totalHours || 0) < 8.0 && log.totalHours > 0).length > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>
                    {logs.filter(log => (log.totalHours || 0) < 8.0 && log.totalHours > 0).length} Day(s)
                  </h4>
                </div>
              </div>

              {/* Average Overtime Session */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ textAlign: 'left' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Avg Overtime Session</span>
                  <h4 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0.1rem 0', color: 'var(--primary-accent)' }}>
                    {(logs.filter(log => (log.overtimeHours || 0) > 0).reduce((acc, log) => acc + (log.overtimeHours || 0), 0) / (logs.filter(log => (log.overtimeHours || 0) > 0).length || 1)).toFixed(1)} hrs
                  </h4>
                </div>
              </div>

            </div>
          </div>

          {/* Weekly Trend Bar Chart (SVG) */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <span className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Clock size={15} style={{ color: 'var(--primary-accent)' }} />
              Weekly Work Hours Trend
            </span>
            
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
              <svg viewBox="0 0 500 200" style={{ width: '100%', height: '180px', overflow: 'visible' }}>
                {/* Grid lines */}
                <line x1="40" y1="20" x2="480" y2="20" stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="3,3" />
                <text x="35" y="24" fill="var(--text-secondary)" fontSize="10" textAnchor="end">12h</text>
                
                {/* 8-hour line (dashed threshold) */}
                <line x1="40" y1="70" x2="480" y2="70" stroke="rgba(255,91,91,0.6)" strokeWidth="1" strokeDasharray="4,4" />
                <text x="35" y="74" fill="var(--danger)" fontSize="10" fontWeight="bold" textAnchor="end">8h (Req)</text>
                
                <line x1="40" y1="120" x2="480" y2="120" stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="3,3" />
                <text x="35" y="124" fill="var(--text-secondary)" fontSize="10" textAnchor="end">4h</text>
                
                <line x1="40" y1="170" x2="480" y2="170" stroke="var(--border-color)" strokeWidth="1" />
                <text x="35" y="174" fill="var(--text-secondary)" fontSize="10" textAnchor="end">0h</text>

                {/* Bars */}
                {getWeeklyTrend().map((item, index) => {
                  const barWidth = 36;
                  const colWidth = 440 / 6;
                  const x = 40 + index * colWidth + (colWidth - barWidth) / 2;
                  const maxVal = 12;
                  const graphHeight = 150;
                  const barHeight = (Math.min(item.hours, maxVal) / maxVal) * graphHeight;
                  const y = 170 - barHeight;
                  
                  const isUnderHours = item.hours < 8.0;
                  const svgColor = isUnderHours ? '#ffb119' : '#2ebd7f';

                  return (
                    <g key={index}>
                      {/* Main bar */}
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={Math.max(barHeight, 2)}
                        rx="4"
                        fill={svgColor}
                        opacity="0.85"
                      />
                      
                      {/* Label value */}
                      <text
                        x={x + barWidth / 2}
                        y={y - 6}
                        fill="var(--text-primary)"
                        fontSize="9"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {item.hours.toFixed(1)}h
                      </text>
                      
                      {/* X label */}
                      <text
                        x={x + barWidth / 2}
                        y="188"
                        fill="var(--text-secondary)"
                        fontSize="9"
                        textAnchor="middle"
                      >
                        {item.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>

        {/* My Correction Requests (Employee view only) */}
        <div className="card" style={{ marginTop: '2rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <CalendarCheck size={18} style={{ color: 'var(--primary-accent)' }} />
              My Correction Requests
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Total requested: {regularizations.length}
            </span>
          </div>
          
          <div className="data-table-wrapper" style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {regularizations.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                No correction requests submitted yet.
              </p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Requested Date</th>
                    <th>Requested In</th>
                    <th>Requested Out</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>HR Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {regularizations.map((reg) => (
                    <tr key={reg._id}>
                      <td>
                        <strong>{new Date(reg.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                      </td>
                      <td>{new Date(reg.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td>{new Date(reg.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td style={{ fontSize: '0.8rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={reg.reason}>
                        {reg.reason}
                      </td>
                      <td>
                        <span className={`badge badge-${reg.status.toLowerCase()}`} style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                          {reg.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>
                        {reg.remarks ? (
                          <span style={{ color: 'var(--text-primary)', fontStyle: 'italic' }}>"{reg.remarks}"</span>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)' }}>No remarks</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        </>
      ) : (
        <>
          {/* Admin Tab Navigation */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <button
              onClick={() => setAdminTab('logs')}
              className={`btn ${adminTab === 'logs' ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                padding: '0.6rem 1.5rem',
                borderRadius: '8px',
                fontWeight: 700,
                boxShadow: adminTab === 'logs' ? '0 4px 15px rgba(103,119,239,0.2)' : 'none',
                cursor: 'pointer'
              }}
            >
              Timesheet Logs
            </button>
            <button
              onClick={() => setAdminTab('requests')}
              className={`btn ${adminTab === 'requests' ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                padding: '0.6rem 1.5rem',
                borderRadius: '8px',
                fontWeight: 700,
                boxShadow: adminTab === 'requests' ? '0 4px 15px rgba(103,119,239,0.2)' : 'none',
                position: 'relative',
                cursor: 'pointer'
              }}
            >
              Correction Requests
              {regularizations.filter(r => r.status === 'Pending').length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-5px',
                  right: '-5px',
                  background: 'var(--danger)',
                  color: 'white',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  fontSize: '0.7rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  border: '2px solid var(--bg-primary)'
                }}>
                  {regularizations.filter(r => r.status === 'Pending').length}
                </span>
              )}
            </button>
          </div>

          {adminTab === 'logs' && (
            /* ADMIN/HR CONTROLS & FILTER BAR */
            <div className="card" style={{ marginBottom: '2rem', padding: '1.25rem 1.5rem' }}>
              <span className="chart-title" style={{ marginBottom: '1rem' }}>Timesheet Filters & Search Console</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
                
                {/* Date Picker Filter */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Activity Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    style={{ width: '180px' }}
                  />
                </div>

                {/* Employee Dropdown Selection */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Target Employee</label>
                  <select
                    className="form-control"
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    style={{ width: '230px' }}
                  >
                    <option value="">All Employees</option>
                    {employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.firstName} {emp.lastName} ({emp.employeeId})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Clear filters trigger */}
                {(dateFilter || employeeSearch) && (
                  <button
                    onClick={() => {
                      setDateFilter('');
                      setEmployeeSearch('');
                    }}
                    className="btn btn-secondary"
                    style={{ marginTop: 'auto', padding: '0.65rem 1.15rem', fontSize: '0.85rem' }}
                  >
                    Reset Search
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* TIMESHEET TABLE REPORT SECTION */}
      {(!isAdminOrHR || (isAdminOrHR && adminTab === 'logs')) && (
        <div className="table-container">
          <div className="table-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="table-title">
              {isAdminOrHR ? 'Global Company Timesheet' : 'Personal Punch History Log'}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Total logs: {logs.length} entries
            </span>
          </div>
          <div className="data-table-wrapper">
            {error && <div className="alert alert-danger">{error}</div>}
            {loading ? (
              <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Retrieving logs list...</p>
            ) : logs.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No attendance logs recorded matching parameters.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    {isAdminOrHR && <th>Employee Details</th>}
                    {isAdminOrHR && <th>Department &amp; Title</th>}
                    <th>Work Mode</th>
                    <th>Clock In</th>
                    <th>Clock Out</th>
                    <th>Status</th>
                    <th>Shift Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const clockOutTime = log.clockOut ? new Date(log.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
                    const clockInTime = new Date(log.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    
                    return (
                      <tr key={log._id}>
                        <td>
                          <strong>{new Date(log.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                        </td>
                        {isAdminOrHR && (
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div className="sidebar-footer-avatar" style={{ width: '28px', height: '28px', fontSize: '0.7rem' }}>
                                {log.employee?.firstName?.[0]}{log.employee?.lastName?.[0]}
                              </div>
                              <div>
                                <strong style={{ fontSize: '0.85rem' }}>{log.employee ? `${log.employee.firstName} ${log.employee.lastName}` : 'N/A'}</strong>
                                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>ID: {log.employee?.employeeId}</span>
                              </div>
                            </div>
                          </td>
                        )}
                        {isAdminOrHR && (
                          <td>
                            <span style={{ fontSize: '0.85rem' }}>{log.employee?.department?.name || 'Unassigned'}</span>
                            <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{log.employee?.designation}</span>
                          </td>
                        )}
                        <td>
                          <span style={{
                            padding: '0.2rem 0.5rem', borderRadius: '4px',
                            background: 'rgba(255,255,255,0.04)',
                            fontSize: '0.75rem', fontWeight: 600,
                          }}>
                            {log.workMode || 'Office'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.88rem' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)' }} />
                            {clockInTime}
                          </div>
                        </td>
                        <td>
                          {log.clockOut ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.88rem' }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-secondary)' }} />
                              {clockOutTime}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--primary-accent)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              In Progress
                            </span>
                          )}
                        </td>
                        <td>
                          <span className={`badge badge-${log.status.toLowerCase()}`} style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                            {log.status}
                          </span>
                        </td>
                        <td>
                          {log.clockOut ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <strong style={{ fontSize: '0.88rem' }}>{log.totalHours} hrs</strong>
                              {/* Visual indicator bar */}
                              <div style={{ width: '50px', height: '5px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{
                                  width: `${Math.min((log.totalHours / 9) * 100, 100)}%`,
                                  height: '100%',
                                  background: log.totalHours >= 8 ? 'var(--success)' : 'var(--warning)'
                                }} />
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)' }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* HR/ADMIN CORRECTION REQUESTS SECTION */}
      {isAdminOrHR && adminTab === 'requests' && (
        <div className="table-container">
          <div className="table-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="table-title">Correction & Regularization Requests</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Total requests: {regularizations.length} entries
            </span>
          </div>

          <div className="data-table-wrapper">
            {regularizations.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                No attendance correction requests found.
              </p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee Details</th>
                    <th>Requested Date</th>
                    <th>Requested Clock In</th>
                    <th>Requested Clock Out</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Actions & Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {regularizations.map((reg) => {
                    const reqIn = new Date(reg.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const reqOut = new Date(reg.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const isPending = reg.status === 'Pending';

                    return (
                      <tr key={reg._id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div className="sidebar-footer-avatar" style={{ width: '28px', height: '28px', fontSize: '0.7rem' }}>
                              {reg.employee?.firstName?.[0] || 'E'}{reg.employee?.lastName?.[0] || 'M'}
                            </div>
                            <div>
                              <strong style={{ fontSize: '0.85rem' }}>
                                {reg.employee ? `${reg.employee.firstName} ${reg.employee.lastName}` : 'N/A'}
                              </strong>
                              <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                ID: {reg.employee?.employeeId} · {reg.employee?.designation}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <strong>{new Date(reg.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.88rem' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)' }} />
                            {reqIn}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.88rem' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-secondary)' }} />
                            {reqOut}
                          </div>
                        </td>
                        <td style={{ fontSize: '0.82rem', maxWidth: '180px', wordBreak: 'break-word' }}>
                          {reg.reason}
                        </td>
                        <td>
                          <span className={`badge badge-${reg.status.toLowerCase()}`} style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                            {reg.status}
                          </span>
                        </td>
                        <td>
                          {isPending ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: '220px' }}>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Add review remarks..."
                                value={processingRemarks[reg._id] || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setProcessingRemarks(prev => ({ ...prev, [reg._id]: val }));
                                }}
                                style={{ fontSize: '0.78rem', padding: '0.3rem 0.5rem', borderRadius: '6px', width: '100%' }}
                              />
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                  onClick={() => handleProcessRegularization(reg._id, 'Approved')}
                                  className="btn btn-primary"
                                  style={{
                                    padding: '0.3rem 0.8rem',
                                    fontSize: '0.75rem',
                                    background: 'var(--success)',
                                    borderColor: 'var(--success)',
                                    fontWeight: 700,
                                    flex: 1,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleProcessRegularization(reg._id, 'Rejected')}
                                  className="btn btn-secondary"
                                  style={{
                                    padding: '0.3rem 0.8rem',
                                    fontSize: '0.75rem',
                                    background: 'var(--danger)',
                                    borderColor: 'var(--danger)',
                                    color: 'white',
                                    fontWeight: 700,
                                    flex: 1,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                              {reg.remarks ? (
                                <span>Remarks: <em style={{ color: 'var(--text-primary)' }}>"{reg.remarks}"</em></span>
                              ) : (
                                <span>No remarks logged.</span>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Regularization Request Modal */}
      {isRegModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '500px',
            padding: '2rem',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Request Attendance Correction
            </h3>

            {regError && <div className="alert alert-danger" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>{regError}</div>}
            {regSuccess && <div className="alert alert-success" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>{regSuccess}</div>}

            <form onSubmit={handleRegFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Target Date</label>
                <input
                  type="date"
                  className="form-control"
                  required
                  value={regFormData.date}
                  onChange={(e) => setRegFormData(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Clock In Time</label>
                  <input
                    type="time"
                    className="form-control"
                    required
                    value={regFormData.clockIn}
                    onChange={(e) => setRegFormData(prev => ({ ...prev, clockIn: e.target.value }))}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Clock Out Time</label>
                  <input
                    type="time"
                    className="form-control"
                    required
                    value={regFormData.clockOut}
                    onChange={(e) => setRegFormData(prev => ({ ...prev, clockOut: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Reason / Remarks</label>
                <textarea
                  className="form-control"
                  rows="3"
                  required
                  placeholder="Explain why this correction is requested (e.g. forgot to punch, system issue, field visit)..."
                  value={regFormData.reason}
                  onChange={(e) => setRegFormData(prev => ({ ...prev, reason: e.target.value }))}
                  style={{ resize: 'vertical', minHeight: '80px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsRegModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={regSubmitting}
                  style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={regSubmitting}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '8px',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #6777ef 0%, #3f51b5 100%)',
                    cursor: 'pointer'
                  }}
                >
                  {regSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
