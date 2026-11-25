import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import PersonalAttendancePanel from '../components/PersonalAttendancePanel';
import SessionBreakdownTable from '../components/SessionBreakdownTable';
import {
  formatClockTime,
  formatClockTimeWithSec,
  formatMinutesDuration,
  getDailyStatusTheme,
  formatDailyStatusLabel,
  formatDateInputValue,
  formatTimeInputValue,
  computeRecordDisplayMetrics,
  downloadCsvFile,
} from '../utils/attendanceFormat';
import {
  Clock, CalendarCheck, Search, Users,
  BarChart2, Download, ChevronLeft, ChevronRight, ChevronDown,
  Lock, Unlock, Plus
} from 'lucide-react';

// Safe sessionStorage helpers for instant initial UI hydration
const readSessionCache = (key, fallback) => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeSessionCache = (key, value) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
};

const Attendance = () => {
  const { user } = useAuth();
  const userRole = user?.role;
  
  // Instant initial cache state
  const [logs, setLogs] = useState(() => readSessionCache(`ems_cached_att_${userRole}`, []));
  const [loading, setLoading] = useState(() => !sessionStorage.getItem(`ems_cached_att_${userRole}`));
  
  const [error, setError] = useState('');
  
  // Admin / HR / Manager filters
  const [dateFilter, setDateFilter] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [managerFilter, setManagerFilter] = useState('');
  const [exceptionsOnly, setExceptionsOnly] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [summaryData, setSummaryData] = useState({ cards: {}, rows: [] });
  const [policyInfo, setPolicyInfo] = useState({ dailyTargetHours: 8, officeStartTime: '09:30', lateGraceMinutes: 15, overtimeThresholdHours: 8, businessHours: '09:30 AM - 06:30 PM' });
  const [expandedSummaryRow, setExpandedSummaryRow] = useState(null);
  const [expandedLogRow, setExpandedLogRow] = useState(null);
  const [expandedHistRow, setExpandedHistRow] = useState(null);
  const [employees, setEmployees] = useState(() => readSessionCache('ems_cached_att_emps', []));

  const isAdminOrHR = ['admin', 'hr', 'manager'].includes(userRole);
  const canManagePoliciesOrManual = ['admin', 'hr'].includes(userRole);
  const isManagerOnly = userRole === 'manager';
  const [viewMode, setViewMode] = useState(isAdminOrHR ? 'company' : 'personal');

  // Manual punch modal (HR/Admin only)
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualError, setManualError] = useState('');
  const [manualForm, setManualForm] = useState({
    employeeId: '',
    sessionId: null,
    date: new Date().toISOString().split('T')[0],
    clockInTime: '09:30',
    clockOutTime: '18:30',
    workMode: 'Office',
    reason: '',
  });

  // Regularization states
  const [regularizations, setRegularizations] = useState(() => readSessionCache(`ems_cached_reg_${userRole}`, []));
  const [regCounts, setRegCounts] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [regFormData, setRegFormData] = useState({
    date: '',
    clockIn: '09:30',
    clockOut: '18:30',
    sessionId: '',
    sessionNumber: '',
    requestType: 'Correction',
    reason: ''
  });
  const [adminTab, setAdminTab] = useState('logs'); // 'logs', 'requests', 'history'
  const [processingRemarks, setProcessingRemarks] = useState({});
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');

  // ── Personal Attendance Overview & Unified Punch History state ──
  const [overviewRange, setOverviewRange] = useState('month');
  const [customRange, setCustomRange] = useState(() => {
    const today = new Date();
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    return {
      startDate: formatDateInputValue(first),
      endDate: formatDateInputValue(today),
    };
  });
  const [overviewSummary, setOverviewSummary] = useState({});
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [historyFilters, setHistoryFilters] = useState({
    status: 'All',
    workMode: 'All',
    startDate: '',
    endDate: '',
  });
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  // Admin all-history
  const [allHistRecords, setAllHistRecords] = useState([]);
  const [allHistLoading, setAllHistLoading] = useState(false);
  const [allHistFilters, setAllHistFilters] = useState({ startDate: '', endDate: '', employeeId: '', department: '', status: '', exceptionsOnly: '' });
  const [allHistPage, setAllHistPage] = useState(1);
  const [allHistTotal, setAllHistTotal] = useState(0);
  const [allHistPages, setAllHistPages] = useState(1);

  const fetchAttendanceLogs = useCallback(async (forceSpinner = false) => {
    try {
      if (forceSpinner) setLoading(true);
      setError('');
      if (isAdminOrHR && viewMode === 'company') {
        const params = [];
        if (dateFilter) params.push(`date=${dateFilter}`);
        if (employeeSearch) params.push(`employeeId=${employeeSearch}`);
        if (deptFilter && canManagePoliciesOrManual) params.push(`department=${deptFilter}`);
        if (managerFilter && canManagePoliciesOrManual) params.push(`managerId=${managerFilter}`);
        if (exceptionsOnly) params.push('exceptionsOnly=true');
        const queryStr = params.length > 0 ? `?${params.join('&')}` : '';

        const [logsData, summaryRes] = await Promise.all([
          api.get(`/attendance/logs${queryStr}`),
          api.get(`/attendance/summary${queryStr}`).catch(() => null),
        ]);
        if (logsData.success) {
          setLogs(logsData.logs);
          if (!dateFilter && !employeeSearch && !deptFilter && !managerFilter && !exceptionsOnly) {
            writeSessionCache(`ems_cached_att_${userRole}`, logsData.logs);
          }
        }
        if (summaryRes?.success) {
          setSummaryData({ cards: summaryRes.cards || {}, rows: summaryRes.rows || [] });
          if (summaryRes.policy) setPolicyInfo(summaryRes.policy);
        }
      } else {
        const [data, statusRes] = await Promise.all([
          api.get('/attendance/my-logs'),
          api.get('/attendance/today-status').catch(() => null),
        ]);
        if (data.success) {
          setLogs(data.logs);
          writeSessionCache(`ems_cached_att_${userRole}`, data.logs);
        }
        if (statusRes?.policy) setPolicyInfo(statusRes.policy);
      }
    } catch (err) {
      setError(err.message || 'Failed to load attendance logs');
    } finally {
      setLoading(false);
    }
  }, [isAdminOrHR, viewMode, dateFilter, employeeSearch, deptFilter, managerFilter, exceptionsOnly, canManagePoliciesOrManual, userRole]);

  const fetchEmployeesList = useCallback(async () => {
    try {
      if (isAdminOrHR) {
        const [empRes, deptRes] = await Promise.all([
          api.get('/employees'),
          canManagePoliciesOrManual ? api.get('/departments').catch(() => null) : Promise.resolve(null),
        ]);
        if (empRes.success) {
          setEmployees(empRes.employees);
          writeSessionCache('ems_cached_att_emps', empRes.employees);
        }
        if (deptRes?.success) {
          setDepartments(deptRes.departments || []);
        }
      }
    } catch (err) {
      console.error('Failed to load employees list', err.message);
    }
  }, [isAdminOrHR, canManagePoliciesOrManual]);

  const fetchRegularizations = useCallback(async () => {
    try {
      const endpoint = (isAdminOrHR && viewMode === 'company') ? '/attendance/regularize/all' : '/attendance/regularize/my';
      const data = await api.get(endpoint);
      if (data.success) {
        const list = data.regularizations || [];
        setRegularizations(list);
        if (data.counts) {
          setRegCounts(data.counts);
        } else {
          setRegCounts({
            total: list.length,
            pending: list.filter((r) => r.status === 'Pending').length,
            approved: list.filter((r) => r.status === 'Approved').length,
            rejected: list.filter((r) => r.status === 'Rejected').length,
          });
        }
        writeSessionCache(`ems_cached_reg_${userRole}`, list);
      }
    } catch (err) {
      console.error('Failed to load regularization requests', err.message);
    }
  }, [isAdminOrHR, viewMode, userRole]);

  // ── Fetch unified Attendance Overview KPIs ──
  const fetchOverview = useCallback(async (range, custom) => {
    try {
      setOverviewLoading(true);
      const params = new URLSearchParams({ range });
      if (range === 'custom' && custom) {
        if (custom.startDate) params.set('startDate', custom.startDate);
        if (custom.endDate) params.set('endDate', custom.endDate);
      }
      const data = await api.get(`/attendance/my-summary?${params.toString()}`);
      if (data.success) {
        setOverviewSummary(data.summary || {});
        if (data.policy) setPolicyInfo(data.policy);
      }
    } catch (err) {
      console.error('Overview fetch failed', err.message);
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  // ── Fetch unified Personal Punch History Log ──
  const fetchPersonalHistoryLogs = useCallback(async (filters) => {
    try {
      setHistoryLoading(true);
      const params = new URLSearchParams({ includeCalendarGaps: 'true' });
      if (filters?.startDate) params.set('startDate', filters.startDate);
      if (filters?.endDate) params.set('endDate', filters.endDate);
      if (filters?.workMode && filters.workMode !== 'All') params.set('workMode', filters.workMode);
      if (filters?.status && filters.status !== 'All') params.set('status', filters.status);
      const data = await api.get(`/attendance/my-logs?${params.toString()}`);
      if (data.success) {
        setHistoryLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Personal history logs fetch failed', err.message);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const fetchAllHistory = useCallback(async (filters, page = 1) => {
    try {
      setAllHistLoading(true);
      const params = new URLSearchParams({ page, limit: 30, ...Object.fromEntries(Object.entries(filters || {}).filter(([, v]) => v)) });
      const data = await api.get(`/attendance/all-history?${params}`);
      if (data.success) {
        setAllHistRecords(data.records || []);
        setAllHistTotal(data.total || 0);
        setAllHistPages(data.pages || 1);
      }
    } catch (err) { console.error('All history fetch failed', err.message); }
    finally { setAllHistLoading(false); }
  }, []);

  const formatCsvPunchBreakdown = (rec) => {
    if (!rec.sessions || !rec.sessions.length) return '-';
    return rec.sessions
      .map((s) => {
        const inT = s.clockInTime ? formatClockTimeWithSec(s.clockInTime) : '-';
        const outT = s.clockOutTime ? formatClockTimeWithSec(s.clockOutTime) : 'Running';
        const dur = s.clockOutTime ? formatMinutesDuration(s.durationMinutes) : 'Live';
        return `#${s.sessionNumber}: ${inT} - ${outT} (${dur})`;
      })
      .join(' | ');
  };

  const resolveCsvOutLabel = (rec) => {
    if (rec.isVirtual) return '-';
    const m = computeRecordDisplayMetrics(rec);
    if (m.isTodayOpen) return 'Running';
    if (m.isPastUnclosed) return 'Missing Out';
    return rec.clockOut ? formatClockTimeWithSec(rec.clockOut) : '-';
  };

  const exportHistoryCSV = (recordsToExport = historyLogs) => {
    if (!recordsToExport || !recordsToExport.length) return;
    const headers = [
      'Date',
      'Day',
      'Employee',
      'Employee ID',
      'Department',
      'Punches',
      'First Clock In',
      'Last Clock Out',
      'Working Duration',
      'Working Hours',
      'Break Duration',
      'Status',
      'Daily Status',
      'Work Mode',
      'Overtime (hrs)',
      'Punch Breakdown',
    ];
    const rows = recordsToExport.map((r) => {
      const m = computeRecordDisplayMetrics(r);
      return [
        new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        new Date(r.date).toLocaleDateString('en-IN', { weekday: 'short' }),
        r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : (user?.username || '-'),
        r.employee?.employeeId || '-',
        r.employee?.department?.name || '-',
        m.punchesCount,
        r.clockIn ? formatClockTimeWithSec(r.clockIn) : '-',
        resolveCsvOutLabel(r),
        r.isVirtual ? '0m' : formatMinutesDuration(m.totalWorkingMinutes),
        r.isVirtual ? '0.00' : Number(m.totalWorkingMinutes / 60).toFixed(2),
        r.isVirtual ? '0m' : formatMinutesDuration(m.breakMinutes),
        m.displayStatus || r.status || '-',
        formatDailyStatusLabel(r.dailyStatus),
        m.workModeText || '-',
        Number(r.overtimeHours || 0).toFixed(2),
        formatCsvPunchBreakdown(r),
      ];
    });
    downloadCsvFile(`personal_punch_history_${formatDateInputValue(new Date())}.csv`, headers, rows);
  };

  const exportAllHistoryCSV = () => {
    if (!allHistRecords.length) return;
    const headers = [
      'Employee',
      'Employee ID',
      'Department',
      'Date',
      'Punches',
      'First Clock In',
      'Last Clock Out',
      'Working Duration',
      'Working Hours',
      'Break Duration',
      'Status',
      'Daily Status',
      'Work Mode',
      'Overtime (hrs)',
      'Punch Breakdown',
    ];
    const rows = allHistRecords.map((r) => [
      r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : '-',
      r.employee?.employeeId || '-',
      r.employee?.department?.name || '-',
      new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      r.sessions?.length || r.sessionCount || 1,
      r.clockIn ? formatClockTimeWithSec(r.clockIn) : '-',
      resolveCsvOutLabel(r),
      formatMinutesDuration(r.totalMinutes ?? ((r.totalHours || 0) * 60)),
      Number(r.totalHours || 0).toFixed(2),
      formatMinutesDuration(r.breakMinutes || 0),
      r.status || '-',
      formatDailyStatusLabel(r.dailyStatus),
      r.workMode || 'Office',
      Number(r.overtimeHours || 0).toFixed(2),
      formatCsvPunchBreakdown(r),
    ]);
    downloadCsvFile(`all_attendance_history_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  const getStatusBadgeStyle = (status) => {
    const base = { fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.65rem', borderRadius: '20px', display: 'inline-block' };
    if (status === 'Present') return { ...base, background: 'rgba(16,185,129,0.15)', color: '#10b981' };
    if (status === 'Late') return { ...base, background: 'rgba(245,158,11,0.15)', color: '#f59e0b' };
    if (status === 'Half Day') return { ...base, background: 'rgba(249,115,22,0.15)', color: '#f97316' };
    if (status === 'Absent') return { ...base, background: 'rgba(239,68,68,0.15)', color: '#ef4444' };
    return { ...base, background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' };
  };

  const getRowAccent = (status) => {
    if (status === 'Present') return 'rgba(16,185,129,0.04)';
    if (status === 'Late') return 'rgba(245,158,11,0.04)';
    if (status === 'Half Day') return 'rgba(249,115,22,0.05)';
    if (status === 'Absent') return 'rgba(239,68,68,0.05)';
    return 'transparent';
  };

  const openCorrectionModal = (targetRecord = null) => {
    setRegError('');
    setRegSuccess('');
    if (targetRecord) {
      const targetSessions = targetRecord.sessions || [];
      const openOrIncomplete = targetSessions.find((s) => !s.clockOutTime || s.status === 'Incomplete');
      const targetPunch = openOrIncomplete || targetSessions[targetSessions.length - 1] || null;
      const resolvedType = openOrIncomplete
        ? 'MissedPunch'
        : targetRecord.isVirtual
          ? 'AddSession'
          : 'Correction';

      setRegFormData({
        date: formatDateInputValue(targetRecord.date),
        clockIn: targetPunch?.clockInTime ? formatTimeInputValue(targetPunch.clockInTime) : '09:30',
        clockOut: targetPunch?.clockOutTime ? formatTimeInputValue(targetPunch.clockOutTime) : '18:30',
        sessionId: targetPunch?._id || '',
        sessionNumber: targetPunch?.sessionNumber ? String(targetPunch.sessionNumber) : '',
        requestType: resolvedType,
        reason: '',
      });
    } else {
      setRegFormData({
        date: formatDateInputValue(new Date()),
        clockIn: '09:30',
        clockOut: '18:30',
        sessionId: '',
        sessionNumber: '',
        requestType: 'Correction',
        reason: '',
      });
    }
    setIsRegModalOpen(true);
  };

  const refreshPersonalAll = () => {
    fetchAttendanceLogs();
    fetchOverview(overviewRange, customRange);
    fetchPersonalHistoryLogs(historyFilters);
    fetchRegularizations();
  };

  const handleRegFormSubmit = async (e) => {
    e.preventDefault();
    setRegSubmitting(true);
    setRegError('');
    setRegSuccess('');

    try {
      const { date, clockIn, clockOut, reason, sessionId, sessionNumber, requestType } = regFormData;
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
        sessionId: sessionId || undefined,
        sessionNumber: sessionNumber ? Number(sessionNumber) : undefined,
        requestType: requestType || 'Correction',
        reason
      });

      if (res.success) {
        setRegSuccess('Correction request submitted successfully!');
        setRegFormData({
          date: '',
          clockIn: '09:30',
          clockOut: '18:30',
          sessionId: '',
          sessionNumber: '',
          requestType: 'Correction',
          reason: ''
        });
        refreshPersonalAll();
        setTimeout(() => {
          setIsRegModalOpen(false);
          setRegSuccess('');
        }, 1400);
      } else {
        setRegError(res.message || 'Failed to submit request');
      }
    } catch (err) {
      setRegError(err.message || 'Failed to submit request');
    } finally {
      setRegSubmitting(false);
    }
  };

  const handleManualPunchSubmit = async (e) => {
    e.preventDefault();
    setManualSubmitting(true);
    setManualError('');
    try {
      const { employeeId, sessionId, date, clockInTime, clockOutTime, workMode, reason } = manualForm;
      const inDt = new Date(`${date}T${clockInTime}:00`);
      const outDt = clockOutTime ? new Date(`${date}T${clockOutTime}:00`) : null;
      if (isNaN(inDt.getTime())) throw new Error('Invalid Clock In date/time');
      if (outDt && outDt <= inDt) throw new Error('Clock Out must be after Clock In');

      const res = await api.post('/attendance/manual-punch', {
        employeeId,
        sessionId: sessionId || undefined,
        date,
        clockInTime: inDt.toISOString(),
        clockOutTime: outDt ? outDt.toISOString() : null,
        workMode,
        reason,
      });
      if (res.success) {
        setManualModalOpen(false);
        fetchAttendanceLogs(true);
      }
    } catch (err) {
      setManualError(err.message || 'Failed to save manual punch');
    } finally {
      setManualSubmitting(false);
    }
  };

  const handleToggleFinalize = async (attendanceId, currentFinalized) => {
    try {
      const res = await api.put(`/attendance/${attendanceId}/finalize`, { isFinalized: !currentFinalized });
      if (res.success) {
        fetchAttendanceLogs(true);
      }
    } catch (err) {
      alert(err.message || 'Failed to update finalization status');
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
    const id = setTimeout(() => {
      fetchAttendanceLogs();
      fetchEmployeesList();
      fetchRegularizations();
    }, 0);
    return () => clearTimeout(id);
  }, [fetchAttendanceLogs, fetchEmployeesList, fetchRegularizations]);

  useEffect(() => {
    if (isAdminOrHR && viewMode !== 'personal') return undefined;
    if (overviewRange === 'custom') return undefined;
    const id = setTimeout(() => {
      fetchOverview(overviewRange);
    }, 0);
    return () => clearTimeout(id);
  }, [isAdminOrHR, viewMode, overviewRange, fetchOverview]);

  useEffect(() => {
    if (isAdminOrHR && viewMode !== 'personal') return undefined;
    const id = setTimeout(() => {
      fetchPersonalHistoryLogs();
    }, 0);
    return () => clearTimeout(id);
  }, [isAdminOrHR, viewMode, fetchPersonalHistoryLogs]);

  useEffect(() => {
    if (!(isAdminOrHR && viewMode === 'company' && adminTab === 'history')) return undefined;
    const id = setTimeout(() => {
      fetchAllHistory(allHistFilters, allHistPage);
    }, 0);
    return () => clearTimeout(id);
  }, [isAdminOrHR, viewMode, adminTab, allHistPage, allHistFilters, fetchAllHistory]);

  // Compute Stats for Admin/HR fallback
  const totalPresentToday = logs.length;
  const totalLateToday = logs.filter(l => l.status === 'Late').length;


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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>
            {isManagerOnly && viewMode === 'company' ? 'Team Attendance Management' : 'Attendance Dashboard'}
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            {isManagerOnly && viewMode === 'company'
              ? 'Monitor assigned team members, daily punch logs, and work hours'
              : isAdminOrHR && viewMode === 'company'
                ? 'Monitor company-wide employee punch logs, exceptions, and work hours'
                : 'Manage your punch status, multiple punches, and timesheet'}
          </p>
        </div>
      </div>

      {/* Role Navigation Toggle for Admin/HR/Manager */}
      {isAdminOrHR && (
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          background: 'var(--bg-card)',
          padding: '0.5rem',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          width: 'fit-content'
        }}>
          <button
            className={`btn ${viewMode === 'company' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('company')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.25rem',
              borderRadius: '9px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            <Users size={16} /> {isManagerOnly ? 'Team Attendance & Logs' : 'Company Timesheets & Logs'}
          </button>
          <button
            className={`btn ${viewMode === 'personal' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('personal')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.25rem',
              borderRadius: '9px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            <Clock size={16} /> My Punch Portal & Work Hours
          </button>
        </div>
      )}

      {/* STATS ROW (Company / Team Admin View Only) */}
      {isAdminOrHR && viewMode === 'company' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(195px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
          {[
            { label: isManagerOnly ? 'Total Team Members' : 'Total Employees', value: summaryData.cards?.totalTeamMembers ?? 0, sub: isManagerOnly ? 'Assigned team' : 'Active headcount', color: '#2563eb', bg: 'rgba(37,99,235,0.1)' },
            { label: 'Present Today', value: summaryData.cards?.presentToday ?? totalPresentToday, sub: 'Clocked in at least once', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
            { label: 'Currently Working', value: summaryData.cards?.currentlyWorking ?? 0, sub: 'Clocked in now', color: '#059669', bg: 'rgba(5,150,105,0.1)' },
            { label: 'Not Clocked In', value: summaryData.cards?.notClockedIn ?? 0, sub: 'No punch recorded', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
            { label: 'Clocked Out', value: summaryData.cards?.clockedOut ?? 0, sub: 'Completed / on break', color: '#0284c7', bg: 'rgba(2,132,199,0.1)' },
            { label: 'Late Arrivals', value: summaryData.cards?.lateArrivals ?? totalLateToday, sub: `After ${policyInfo.officeStartTime} (+${policyInfo.lateGraceMinutes}m)`, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
            { label: 'Incomplete Attendance', value: summaryData.cards?.incompleteAttendance ?? 0, sub: 'Missing clock-out / short', color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
            { label: isManagerOnly ? 'Total Team Hours' : 'Total Working Hours', value: formatMinutesDuration((summaryData.cards?.totalWorkingHours || 0) * 60), sub: dateFilter ? `On ${dateFilter}` : 'Logged today', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
          ].map((stat) => (
            <div key={stat.label} className="card" style={{ padding: '1.15rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{stat.label}</span>
                <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '0.15rem 0', color: 'var(--text-primary)' }}>{stat.value}</h2>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{stat.sub}</span>
              </div>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: stat.bg, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Clock size={18} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* WORKSPACE CONTENT BODY */}
      {(!isAdminOrHR || viewMode === 'personal') ? (
        <PersonalAttendancePanel
          policyInfo={policyInfo}
          logs={logs}
          overviewSummary={overviewSummary}
          overviewLoading={overviewLoading}
          overviewRange={overviewRange}
          customRange={customRange}
          onChangeOverviewRange={(nextRange) => {
            setOverviewRange(nextRange);
            if (nextRange === 'custom') {
              fetchOverview('custom', customRange);
            }
          }}
          onChangeCustomRange={(nextCustom) => setCustomRange(nextCustom)}
          onApplyCustomRange={() => fetchOverview('custom', customRange)}
          historyLogs={historyLogs}
          historyLoading={historyLoading}
          historyFilters={historyFilters}
          onChangeHistoryFilters={(nextFilters) => setHistoryFilters(nextFilters)}
          onApplyHistoryFilters={(filtersToApply) => fetchPersonalHistoryLogs(filtersToApply)}
          onResetHistoryFilters={() => {
            const clean = { status: 'All', workMode: 'All', startDate: '', endDate: '' };
            setHistoryFilters(clean);
            fetchPersonalHistoryLogs(clean);
          }}
          onExportHistoryCSV={exportHistoryCSV}
          regularizations={regularizations}
          regCounts={regCounts}
          onOpenCorrectionModal={openCorrectionModal}
          onRefreshAll={refreshPersonalAll}
        />
      ) : (
        <>
          {/* Admin Tab Navigation */}
          <div className="attendance-admin-tabs" style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            {[
              { key: 'logs', label: 'Timesheet Logs' },
              { key: 'requests', label: 'Correction Requests', badge: regularizations.filter(r => r.status === 'Pending').length },
              { key: 'history', label: '📊 Hours History' },
            ].map(tab => (
              <button key={tab.key} onClick={() => setAdminTab(tab.key)} className={`btn ${adminTab === tab.key ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.55rem 1.25rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.83rem', boxShadow: adminTab === tab.key ? '0 4px 15px rgba(103,119,239,0.2)' : 'none', position: 'relative', cursor: 'pointer' }}>
                {tab.label}
                {tab.badge > 0 && (
                  <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'var(--danger)', color: 'white', borderRadius: '50%', width: '18px', height: '18px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, border: '2px solid var(--bg-primary)' }}>{tab.badge}</span>
                )}
              </button>
            ))}
          </div>

          {adminTab === 'logs' && (
            /* ADMIN/HR/MANAGER CONTROLS & FILTER BAR */
            <div className="card" style={{ marginBottom: '1.25rem', padding: '1.15rem 1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span className="chart-title" style={{ margin: 0 }}>
                  {isManagerOnly ? 'Team Attendance Filters' : 'Timesheet Filters & Search Console'}
                </span>
                {canManagePoliciesOrManual && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setManualError('');
                      setManualForm({
                        employeeId: employeeSearch || employees[0]?._id || '',
                        sessionId: null,
                        date: dateFilter || new Date().toISOString().split('T')[0],
                        clockInTime: '09:30',
                        clockOutTime: '18:30',
                        workMode: 'Office',
                        reason: '',
                      });
                      setManualModalOpen(true);
                    }}
                    style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}
                  >
                    <Plus size={14} /> Manual Punch
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem', alignItems: 'flex-end' }}>
                {/* Date Picker Filter */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: '1 1 150px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Activity Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Department Filter (HR / Admin only) */}
                {canManagePoliciesOrManual && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: '1 1 170px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Department</label>
                    <select
                      className="form-control"
                      value={deptFilter}
                      onChange={(e) => setDeptFilter(e.target.value)}
                      style={{ width: '100%' }}
                    >
                      <option value="">All Departments</option>
                      {departments.map((d) => (
                        <option key={d._id} value={d._id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Manager Filter (HR / Admin only) */}
                {canManagePoliciesOrManual && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: '1 1 170px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Manager</label>
                    <select
                      className="form-control"
                      value={managerFilter}
                      onChange={(e) => setManagerFilter(e.target.value)}
                      style={{ width: '100%' }}
                    >
                      <option value="">All Managers</option>
                      {employees.filter((e) => e.role === 'manager').map((m) => (
                        <option key={m._id} value={m._id}>{m.firstName} {m.lastName}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Employee Dropdown Selection */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: '1 1 190px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Target Employee</label>
                  <select
                    className="form-control"
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="">All {isManagerOnly ? 'Team Members' : 'Employees'}</option>
                    {employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.firstName} {emp.lastName} ({emp.employeeId})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Exceptions Toggle */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', cursor: 'pointer', paddingBottom: '0.55rem' }}>
                  <input
                    type="checkbox"
                    checked={exceptionsOnly}
                    onChange={(e) => setExceptionsOnly(e.target.checked)}
                  />
                  Exceptions Only (Late / Incomplete)
                </label>

                {/* Clear filters trigger */}
                {(dateFilter || employeeSearch || deptFilter || managerFilter || exceptionsOnly) && (
                  <button
                    onClick={() => {
                      setDateFilter('');
                      setEmployeeSearch('');
                      setDeptFilter('');
                      setManagerFilter('');
                      setExceptionsOnly(false);
                    }}
                    className="btn btn-secondary"
                    style={{ padding: '0.65rem 1.15rem', fontSize: '0.85rem' }}
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          )}

          {/* LIVE DAILY ATTENDANCE SUMMARY TABLE (Admin / HR / Manager) */}
          {adminTab === 'logs' && summaryData.rows && summaryData.rows.length > 0 && (
            <div className="table-container table-responsive-wrapper" style={{ marginBottom: '1.5rem' }}>
              <div className="table-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="table-title">
                  {isManagerOnly ? 'Team Daily Attendance Overview' : 'Daily Attendance & Punch Logs'} ({dateFilter || 'Today'})
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Click row to expand punches · {summaryData.rows.length} member(s)
                </span>
              </div>
              <div className="data-table-wrapper" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 28 }}></th>
                      <th>Employee Name</th>
                      <th>Employee ID</th>
                      <th>Department</th>
                      <th>Clock In</th>
                      <th>Clock Out</th>
                      <th>Punches</th>
                      <th>Total Hours</th>
                      <th>Break</th>
                      <th>Status</th>
                      {canManagePoliciesOrManual && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {summaryData.rows.map((row) => {
                      const rowKey = row.employee?._id;
                      const isExp = expandedSummaryRow === rowKey;
                      const theme = getDailyStatusTheme(row.dailyStatus);
                      return (
                        <React.Fragment key={rowKey}>
                          <tr
                            onClick={() => row.sessions?.length && setExpandedSummaryRow(isExp ? null : rowKey)}
                            style={{ cursor: row.sessions?.length ? 'pointer' : 'default' }}
                          >
                            <td>{row.sessions?.length > 0 && (isExp ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}</td>
                            <td>
                              <strong>{row.employee?.firstName} {row.employee?.lastName}</strong>
                              <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{row.employee?.designation}</span>
                            </td>
                            <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{row.employee?.employeeId}</td>
                            <td style={{ fontSize: '0.82rem' }}>{row.employee?.department?.name || '–'}</td>
                            <td>{formatClockTime(row.clockIn)}</td>
                            <td>
                              {row.clockOut
                                ? formatClockTime(row.clockOut)
                                : row.dailyStatus === 'Currently Working'
                                  ? <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.75rem' }}>Working</span>
                                  : row.hasMissingClockOut
                                    ? <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.75rem' }}>Missing Out</span>
                                    : '–'}
                            </td>
                            <td style={{ fontWeight: 800, color: 'var(--primary-accent)' }}>{row.sessionsCount}</td>
                            <td style={{ fontWeight: 700 }}>{formatMinutesDuration(row.totalMinutes)}</td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{formatMinutesDuration(row.breakMinutes)}</td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
                                <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 12, background: theme.bg, color: theme.color, border: `1px solid ${theme.border}`, whiteSpace: 'nowrap' }}>
                                  {formatDailyStatusLabel(row.dailyStatus)}
                                </span>
                                {row.isLate && (
                                  <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#f59e0b' }}>Late Arrival</span>
                                )}
                              </div>
                            </td>
                            {canManagePoliciesOrManual && (
                              <td onClick={(e) => e.stopPropagation()}>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button
                                    type="button"
                                    className="btn btn-secondary"
                                    title="Add Manual Punch"
                                    onClick={() => {
                                      setManualError('');
                                      setManualForm({
                                        employeeId: row.employee._id,
                                        sessionId: null,
                                        date: dateFilter || new Date().toISOString().split('T')[0],
                                        clockInTime: '09:30',
                                        clockOutTime: '18:30',
                                        workMode: 'Office',
                                        reason: '',
                                      });
                                      setManualModalOpen(true);
                                    }}
                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem', cursor: 'pointer' }}
                                  >
                                    + Punch
                                  </button>
                                  {row.attendanceId && (
                                    <button
                                      type="button"
                                      className="btn btn-secondary"
                                      title={row.isFinalized ? 'Reopen Attendance Day' : 'Finalize Attendance Day'}
                                      onClick={() => handleToggleFinalize(row.attendanceId, row.isFinalized)}
                                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer', color: row.isFinalized ? '#6366f1' : 'var(--text-primary)' }}
                                    >
                                      {row.isFinalized ? <Unlock size={12} /> : <Lock size={12} />}
                                      {row.isFinalized ? 'Reopen' : 'Finalize'}
                                    </button>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                          {isExp && (
                            <tr>
                              <td colSpan={canManagePoliciesOrManual ? 11 : 10} style={{ padding: '0.4rem 0.85rem', background: 'var(--bg-primary)' }}>
                                <SessionBreakdownTable
                                  sessions={row.sessions}
                                  record={row}
                                  canEdit={canManagePoliciesOrManual && !row.isFinalized}
                                  onEditSession={(sess) => {
                                    const inD = new Date(sess.clockInTime);
                                    const outD = sess.clockOutTime ? new Date(sess.clockOutTime) : null;
                                    const pad = (n) => String(n).padStart(2, '0');
                                    setManualError('');
                                    setManualForm({
                                      employeeId: row.employee._id,
                                      sessionId: sess._id,
                                      date: new Date(sess.attendanceDate).toISOString().split('T')[0],
                                      clockInTime: `${pad(inD.getHours())}:${pad(inD.getMinutes())}`,
                                      clockOutTime: outD ? `${pad(outD.getHours())}:${pad(outD.getMinutes())}` : '',
                                      workMode: sess.workMode || 'Office',
                                      reason: '',
                                    });
                                    setManualModalOpen(true);
                                  }}
                                />
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* TIMESHEET TABLE REPORT SECTION */}
      {isAdminOrHR && viewMode === 'company' && adminTab === 'logs' && (
        <div className="table-container table-responsive-wrapper">
          <div className="table-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="table-title">
              Global Company Timesheet
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
                    <th style={{ width: 28 }}></th>
                    <th>Date</th>
                    {isAdminOrHR && <th>Employee Details</th>}
                    {isAdminOrHR && <th>Department &amp; Title</th>}
                    <th>Punches</th>
                    <th>Work Mode</th>
                    <th>First In</th>
                    <th>Last Out</th>
                    <th>Status</th>
                    <th>Worked / Break</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const clockOutTime = log.clockOut ? formatClockTime(log.clockOut) : null;
                    const clockInTime = formatClockTime(log.clockIn);
                    const isExp = expandedLogRow === log._id;
                    const sessCount = log.sessions?.length || log.sessionCount || 1;
                    const theme = getDailyStatusTheme(log.dailyStatus);

                    return (
                      <React.Fragment key={log._id}>
                        <tr
                          onClick={() => log.sessions?.length && setExpandedLogRow(isExp ? null : log._id)}
                          style={{ cursor: log.sessions?.length ? 'pointer' : 'default' }}
                        >
                          <td>{log.sessions?.length > 0 && (isExp ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}</td>
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
                          <td style={{ fontWeight: 800, color: 'var(--primary-accent)' }}>{sessCount}</td>
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
                              <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Active
                              </span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
                              <span className={`badge badge-${log.status.toLowerCase()}`} style={{ fontSize: '0.7rem', fontWeight: 700 }}>
                                {log.status}
                              </span>
                              {log.dailyStatus && (
                                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: theme.color }}>
                                  {formatDailyStatusLabel(log.dailyStatus)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <strong style={{ fontSize: '0.86rem' }}>{formatMinutesDuration((log.totalHours || 0) * 60)}</strong>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                Break: {formatMinutesDuration(log.breakMinutes || 0)}
                              </span>
                            </div>
                          </td>
                        </tr>
                        {isExp && (
                          <tr>
                            <td colSpan={isAdminOrHR ? 10 : 8} style={{ padding: '0.4rem 0.85rem', background: 'var(--bg-primary)' }}>
                              <SessionBreakdownTable sessions={log.sessions} record={log} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* HR/ADMIN CORRECTION REQUESTS SECTION */}
      {isAdminOrHR && viewMode === 'company' && adminTab === 'requests' && (
        <div className="table-container table-responsive-wrapper">
          <div className="table-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="table-title">Correction &amp; Regularization Requests</span>
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
                    <th>Actions &amp; Remarks</th>
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
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: '200px' }}>
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

      {/* ── ADMIN: ALL EMPLOYEES HOURS HISTORY TAB ── */}
      {isAdminOrHR && viewMode === 'company' && adminTab === 'history' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <BarChart2 size={18} style={{ color: 'var(--primary-accent)' }} /> All Employees Hours History
            </h3>
            <button className="btn btn-secondary" onClick={exportAllHistoryCSV} style={{ padding: '0.4rem 0.9rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
              <Download size={13} /> Export CSV
            </button>
          </div>

          {/* Filters */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem', padding: '1rem', background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>From Date</label>
              <input type="date" className="form-control" value={allHistFilters.startDate} onChange={e => setAllHistFilters(p => ({ ...p, startDate: e.target.value }))} style={{ fontSize: '0.82rem', padding: '0.4rem 0.65rem', height: '34px' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>To Date</label>
              <input type="date" className="form-control" value={allHistFilters.endDate} onChange={e => setAllHistFilters(p => ({ ...p, endDate: e.target.value }))} style={{ fontSize: '0.82rem', padding: '0.4rem 0.65rem', height: '34px' }} />
            </div>
            {canManagePoliciesOrManual && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Department</label>
                <select className="form-control" value={allHistFilters.department} onChange={e => setAllHistFilters(p => ({ ...p, department: e.target.value }))} style={{ fontSize: '0.82rem', padding: '0.4rem 0.65rem', height: '34px' }}>
                  <option value="">All Departments</option>
                  {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                </select>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Employee</label>
              <select className="form-control" value={allHistFilters.employeeId} onChange={e => setAllHistFilters(p => ({ ...p, employeeId: e.target.value }))} style={{ fontSize: '0.82rem', padding: '0.4rem 0.65rem', height: '34px' }}>
                <option value="">All Employees</option>
                {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Status</label>
              <select className="form-control" value={allHistFilters.status} onChange={e => setAllHistFilters(p => ({ ...p, status: e.target.value }))} style={{ fontSize: '0.82rem', padding: '0.4rem 0.65rem', height: '34px' }}>
                <option value="">All Statuses</option>
                <option value="Present">Present</option>
                <option value="Late">Late</option>
                <option value="Half Day">Half Day</option>
                <option value="Absent">Absent</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Exceptions</label>
              <select className="form-control" value={allHistFilters.exceptionsOnly} onChange={e => setAllHistFilters(p => ({ ...p, exceptionsOnly: e.target.value }))} style={{ fontSize: '0.82rem', padding: '0.4rem 0.65rem', height: '34px' }}>
                <option value="">All Records</option>
                <option value="true">Late / Incomplete Only</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
              <button className="btn btn-primary" onClick={() => { setAllHistPage(1); fetchAllHistory(allHistFilters, 1); }} style={{ flex: 1, padding: '0.4rem 0.75rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                <Search size={13} /> Search
              </button>
              <button className="btn btn-secondary" onClick={() => { const f = { startDate: '', endDate: '', employeeId: '', department: '', status: '', exceptionsOnly: '' }; setAllHistFilters(f); setAllHistPage(1); fetchAllHistory(f, 1); }} style={{ padding: '0.4rem 0.65rem', borderRadius: '8px', fontSize: '0.82rem' }}>Clear</button>
            </div>
          </div>

          {/* Summary row */}
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <span>Total records: <strong style={{ color: 'var(--text-primary)' }}>{allHistTotal}</strong></span>
            {allHistRecords.length > 0 && (
              <span>Showing page <strong>{allHistPage}</strong> of <strong>{allHistPages}</strong></span>
            )}
          </div>

          {allHistLoading ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>Loading records...</div>
          ) : allHistRecords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No records found. Try adjusting filters.</div>
          ) : (
            <>
              <div className="data-table-wrapper" style={{ maxHeight: '480px', overflowY: 'auto' }}>
                <table className="data-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ width: 28 }}></th>
                      <th>Employee</th><th>Date</th><th>Punches</th><th>First In</th><th>Last Out</th><th>Hours</th><th>Break</th><th>Status</th><th>Mode</th><th>OT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allHistRecords.map((rec, i) => {
                      const isExp = expandedHistRow === rec._id;
                      const sessCount = rec.sessions?.length || rec.sessionCount || 1;
                      return (
                        <React.Fragment key={rec._id}>
                          <tr
                            onClick={() => rec.sessions?.length && setExpandedHistRow(isExp ? null : rec._id)}
                            style={{ background: getRowAccent(rec.status), cursor: rec.sessions?.length ? 'pointer' : 'default', animation: `fadeInUp 0.25s ease ${i * 0.02}s both` }}
                          >
                            <td>{rec.sessions?.length > 0 && (isExp ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div className="sidebar-footer-avatar" style={{ width: '26px', height: '26px', fontSize: '0.65rem', flexShrink: 0 }}>
                                  {rec.employee?.firstName?.[0]}{rec.employee?.lastName?.[0]}
                                </div>
                                <div>
                                  <strong style={{ fontSize: '0.85rem' }}>{rec.employee ? `${rec.employee.firstName} ${rec.employee.lastName}` : '–'}</strong>
                                  <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{rec.employee?.employeeId} · {rec.employee?.department?.name || '–'}</span>
                                </div>
                              </div>
                            </td>
                            <td style={{ fontWeight: 700 }}>{new Date(rec.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                            <td style={{ fontWeight: 800, color: 'var(--primary-accent)' }}>{sessCount}</td>
                            <td>{formatClockTime(rec.clockIn)}</td>
                            <td>{rec.clockOut ? formatClockTime(rec.clockOut) : <span style={{ color: '#10b981', fontWeight: 700 }}>Active</span>}</td>
                            <td style={{ fontWeight: 700, color: (rec.totalHours || 0) >= 8 ? 'var(--success)' : 'var(--text-primary)' }}>{formatMinutesDuration((rec.totalHours || 0) * 60)}</td>
                            <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{formatMinutesDuration(rec.breakMinutes || 0)}</td>
                            <td><span style={getStatusBadgeStyle(rec.status)}>{rec.status || '–'}</span></td>
                            <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{rec.workMode || '–'}</td>
                            <td>{rec.overtimeHours > 0 ? <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6777ef', background: 'rgba(103,119,239,0.12)', padding: '0.12rem 0.4rem', borderRadius: '10px' }}>+{rec.overtimeHours}h</span> : <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>–</span>}</td>
                          </tr>
                          {isExp && (
                            <tr>
                              <td colSpan={11} style={{ padding: '0.4rem 0.85rem', background: 'var(--bg-primary)' }}>
                                <SessionBreakdownTable sessions={rec.sessions} record={rec} />
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {allHistPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                  <button className="btn btn-secondary" disabled={allHistPage <= 1} onClick={() => setAllHistPage(p => p - 1)} style={{ padding: '0.35rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <ChevronLeft size={14} /> Prev
                  </button>
                  {Array.from({ length: Math.min(allHistPages, 7) }, (_, i) => {
                    const p = i + 1;
                    return (
                      <button key={p} onClick={() => setAllHistPage(p)} className={`btn ${allHistPage === p ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.35rem 0.65rem', borderRadius: '8px', fontSize: '0.8rem', minWidth: '34px' }}>{p}</button>
                    );
                  })}
                  <button className="btn btn-secondary" disabled={allHistPage >= allHistPages} onClick={() => setAllHistPage(p => p + 1)} style={{ padding: '0.35rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </>
          )}
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

            <form onSubmit={handleRegFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Request Type</label>
                  <select
                    className="form-control"
                    value={regFormData.requestType}
                    onChange={(e) => setRegFormData(prev => ({ ...prev, requestType: e.target.value }))}
                  >
                    <option value="Correction">Edit Existing Punch</option>
                    <option value="MissedPunch">Missed Clock Out</option>
                    <option value="AddSession">Add Missing Punch</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Punch Number (Optional, e.g., 1 or 2)</label>
                <input
                  type="number"
                  min="1"
                  className="form-control"
                  placeholder="Leave blank to target open/latest punch"
                  value={regFormData.sessionNumber}
                  onChange={(e) => setRegFormData(prev => ({ ...prev, sessionNumber: e.target.value }))}
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

      {/* Manual Punch Modal (HR / Admin only) */}
      {manualModalOpen && canManagePoliciesOrManual && (
        <div style={{
          position: 'fixed',
          inset: 0,
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
          }}>
            <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.2rem', fontWeight: 800 }}>
              {manualForm.sessionId ? 'Edit Punch Log' : 'Add Manual Punch'}
            </h3>
            {manualError && <div className="alert alert-danger" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>{manualError}</div>}
            <form onSubmit={handleManualPunchSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Employee</label>
                <select
                  className="form-control"
                  required
                  disabled={Boolean(manualForm.sessionId)}
                  value={manualForm.employeeId}
                  onChange={(e) => setManualForm(p => ({ ...p, employeeId: e.target.value }))}
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName} ({emp.employeeId})</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Date</label>
                  <input type="date" className="form-control" required value={manualForm.date} onChange={(e) => setManualForm(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Work Mode</label>
                  <select className="form-control" value={manualForm.workMode} onChange={(e) => setManualForm(p => ({ ...p, workMode: e.target.value }))}>
                    <option value="Office">Office</option>
                    <option value="WFH">WFH</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Clock In</label>
                  <input type="time" className="form-control" required value={manualForm.clockInTime} onChange={(e) => setManualForm(p => ({ ...p, clockInTime: e.target.value }))} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Clock Out</label>
                  <input type="time" className="form-control" value={manualForm.clockOutTime} onChange={(e) => setManualForm(p => ({ ...p, clockOutTime: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Audit Reason</label>
                <textarea className="form-control" rows="2" required placeholder="Reason for manual punch adjustment (recorded in Audit Log)..." value={manualForm.reason} onChange={(e) => setManualForm(p => ({ ...p, reason: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: '0.85rem', marginTop: '0.4rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setManualModalOpen(false)} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={manualSubmitting} style={{ flex: 1 }}>
                  {manualSubmitting ? 'Saving...' : 'Save Punch'}
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
