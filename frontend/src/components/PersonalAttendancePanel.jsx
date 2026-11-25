import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Award,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Coffee,
  Download,
  Eye,
  FileWarning,
  HelpCircle,
  Plus,
  RefreshCw,
  Timer,
  TrendingUp,
  Trophy,
  UserCheck,
  UserX,
  Wrench,
  X,
} from 'lucide-react';
import AttendanceWidget from './AttendanceWidget';
import SessionBreakdownTable from './SessionBreakdownTable';
import {
  computeRecordDisplayMetrics,
  formatClockTime,
  formatDailyStatusLabel,
  formatDateDisplay,
  formatMinutesDuration,
  formatRequestTypeLabel,
  getRequestTypeTheme,
} from '../utils/attendanceFormat';

const RANGE_OPTIONS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'custom', label: 'Custom Range' },
];

const QUICK_STATUS_PILLS = [
  'All',
  'Present',
  'Late',
  'Incomplete',
  'Absent',
  'On Leave',
  'Holiday',
];

const getRegStatusTheme = (status) => {
  if (status === 'Approved') {
    return { bg: 'rgba(16, 185, 129, 0.14)', color: '#10b981', border: 'rgba(16, 185, 129, 0.28)' };
  }
  if (status === 'Rejected') {
    return { bg: 'rgba(239, 68, 68, 0.14)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.28)' };
  }
  return { bg: 'rgba(245, 158, 11, 0.14)', color: '#d97706', border: 'rgba(245, 158, 11, 0.3)' };
};

const getLogStatusStyle = (status) => {
  const base = {
    fontSize: '0.72rem',
    fontWeight: 700,
    padding: '0.2rem 0.65rem',
    borderRadius: '999px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    whiteSpace: 'nowrap',
  };
  if (status === 'Currently Working') {
    return { ...base, background: 'rgba(37, 99, 235, 0.12)', color: '#2563eb' };
  }
  if (status === 'Present') {
    return { ...base, background: 'rgba(16, 185, 129, 0.14)', color: '#10b981' };
  }
  if (status === 'Late') {
    return { ...base, background: 'rgba(245, 158, 11, 0.15)', color: '#d97706' };
  }
  if (status === 'Incomplete' || status === 'Absent') {
    return { ...base, background: 'rgba(239, 68, 68, 0.14)', color: '#ef4444' };
  }
  if (status === 'On Leave') {
    return { ...base, background: 'rgba(139, 92, 246, 0.14)', color: '#8b5cf6' };
  }
  if (status === 'Holiday') {
    return { ...base, background: 'rgba(14, 165, 233, 0.14)', color: '#0ea5e9' };
  }
  if (status === 'Half Day') {
    return { ...base, background: 'rgba(249, 115, 22, 0.15)', color: '#f97316' };
  }
  return { ...base, background: 'rgba(148, 163, 184, 0.14)', color: 'var(--text-secondary)' };
};

const formatOriginalPunchText = (reg) => {
  const origIn = reg.originalClockIn || reg.session?.clockInTime;
  const origOut = reg.originalClockOut || reg.session?.clockOutTime;
  if (!origIn && !origOut) {
    return reg.requestType === 'AddSession' ? 'New Punch' : '–';
  }
  if (origIn && !origOut) {
    return `${formatClockTime(origIn)} – Missing Out`;
  }
  if (!origIn && origOut) {
    return formatClockTime(origOut);
  }
  return `${formatClockTime(origIn)} – ${formatClockTime(origOut)}`;
};

const PersonalAttendancePanel = ({
  policyInfo,
  logs,
  overviewSummary,
  overviewLoading,
  overviewRange,
  customRange,
  onChangeOverviewRange,
  onChangeCustomRange,
  onApplyCustomRange,
  historyLogs,
  historyLoading,
  historyFilters,
  onChangeHistoryFilters,
  onApplyHistoryFilters,
  onResetHistoryFilters,
  onExportHistoryCSV,
  regularizations,
  regCounts,
  onOpenCorrectionModal,
  onRefreshAll,
}) => {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [regStatusFilter, setRegStatusFilter] = useState('All');
  const [showAllRequests, setShowAllRequests] = useState(false);
  const [selectedRegDetail, setSelectedRegDetail] = useState(null);
  const [selectedDayDetail, setSelectedDayDetail] = useState(null);

  const hasLiveRow = historyLogs.some((rec) => {
    if (rec.dailyStatus !== 'Currently Working') return false;
    return (rec.sessions || []).some((s) => !s.clockOutTime);
  });

  useEffect(() => {
    if (!hasLiveRow) return undefined;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [hasLiveRow]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // Calendar helpers
  const calYear = calendarDate.getFullYear();
  const calMonth = calendarDate.getMonth();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayIndex = new Date(calYear, calMonth, 1).getDay();

  const getCalendarLogForDay = (day) => {
    const target = new Date(calYear, calMonth, day);
    target.setHours(0, 0, 0, 0);
    return logs.find((l) => {
      const ld = new Date(l.date);
      ld.setHours(0, 0, 0, 0);
      return ld.getTime() === target.getTime();
    });
  };

  // Real-only weekly trend (zero fake mock fallback)
  const weeklyTrendItems = logs
    .filter((l) => !l.isVirtual && new Date(l.date).getDay() !== 0)
    .slice(0, 6)
    .reverse()
    .map((log) => ({
      label: new Date(log.date).toLocaleDateString([], { weekday: 'short', day: 'numeric' }),
      hours: log.totalHours || 0,
    }));

  const rangeSubtitleMap = {
    today: 'Today',
    week: 'This week',
    month: 'This month',
    custom: 'Selected range',
  };
  const rangeSubLabel = rangeSubtitleMap[overviewRange] || 'This month';

  const trendPct = overviewSummary.trendVsPreviousPct;
  const trendLabel =
    trendPct === null || trendPct === undefined
      ? rangeSubLabel
      : `${trendPct >= 0 ? '↑' : '↓'} ${Math.abs(trendPct)}% vs prev`;

  const totalRegCount = regCounts?.total ?? overviewSummary.corrections?.total ?? regularizations.length;
  const pendingRegCount =
    regCounts?.pending ??
    overviewSummary.corrections?.pending ??
    regularizations.filter((r) => r.status === 'Pending').length;
  const approvedRegCount =
    regCounts?.approved ??
    overviewSummary.corrections?.approved ??
    regularizations.filter((r) => r.status === 'Approved').length;
  const rejectedRegCount =
    regCounts?.rejected ??
    overviewSummary.corrections?.rejected ??
    regularizations.filter((r) => r.status === 'Rejected').length;

  const overviewCards = [
    {
      label: 'Total Working Hours',
      value: formatMinutesDuration(
        overviewSummary.liveTotalMinutes ?? (overviewSummary.totalHours || 0) * 60
      ),
      sub: trendLabel,
      subColor: trendPct > 0 ? '#10b981' : trendPct < 0 ? '#ef4444' : 'var(--text-secondary)',
      icon: <Clock size={18} />,
      color: '#2563eb',
      bg: 'rgba(37, 99, 235, 0.1)',
    },
    {
      label: 'Present Days',
      value: String(overviewSummary.presentDays ?? 0),
      sub: `of ${overviewSummary.expectedWorkingDays ?? 0} days`,
      subColor: 'var(--text-secondary)',
      icon: <UserCheck size={18} />,
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.1)',
    },
    {
      label: 'Absent Days',
      value: String(overviewSummary.absentDays ?? 0),
      sub: `of ${overviewSummary.expectedWorkingDays ?? 0} days`,
      subColor: 'var(--text-secondary)',
      icon: <UserX size={18} />,
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.1)',
    },
    {
      label: 'Late Arrivals',
      value: String(overviewSummary.lateDays ?? 0),
      sub: rangeSubLabel,
      subColor: 'var(--text-secondary)',
      icon: <Timer size={18} />,
      color: '#d97706',
      bg: 'rgba(245, 158, 11, 0.12)',
    },
    {
      label: 'Incomplete',
      value: String(overviewSummary.incompleteDays ?? 0),
      sub: (overviewSummary.incompleteDays || 0) > 0 ? 'Needs attention' : 'All complete',
      subColor: (overviewSummary.incompleteDays || 0) > 0 ? '#e11d48' : 'var(--text-secondary)',
      icon: <FileWarning size={18} />,
      color: '#db2777',
      bg: 'rgba(219, 39, 119, 0.1)',
    },
    {
      label: 'Break Hours',
      value: formatMinutesDuration(overviewSummary.totalBreakMinutes || 0),
      sub: rangeSubLabel,
      subColor: 'var(--text-secondary)',
      icon: <Coffee size={18} />,
      color: '#0284c7',
      bg: 'rgba(2, 132, 199, 0.1)',
    },
    {
      label: 'Correction Requests',
      value: String(totalRegCount),
      sub: `${pendingRegCount} Pending`,
      subColor: pendingRegCount > 0 ? '#d97706' : 'var(--text-secondary)',
      icon: <CheckCircle2 size={18} />,
      color: '#059669',
      bg: 'rgba(5, 150, 105, 0.1)',
    },
    {
      label: 'Target Achieved',
      value: `${overviewSummary.targetAchievedPct ?? 0}%`,
      sub: `of ${overviewSummary.targetHours ?? 0}h target`,
      subColor: 'var(--text-secondary)',
      icon: <Trophy size={18} />,
      color: '#7c3aed',
      bg: 'rgba(124, 58, 237, 0.1)',
    },
  ];

  // Progress ring metrics
  const targetPct = Math.min(100, Math.max(0, Number(overviewSummary.targetAchievedPct ?? 0)));
  const ringColor =
    targetPct >= 100 ? '#10b981' : targetPct >= 75 ? '#2563eb' : targetPct >= 50 ? '#f59e0b' : '#ef4444';
  const ringR = 36;
  const ringCirc = 2 * Math.PI * ringR;
  const ringDash = (targetPct / 100) * ringCirc;

  // Filtered Correction Requests list
  const filteredRegs = regularizations.filter((r) =>
    regStatusFilter === 'All' ? true : r.status === regStatusFilter
  );
  const visibleRegs = showAllRequests ? filteredRegs : filteredRegs.slice(0, 5);

  const hasActiveHistoryFilters =
    historyFilters.status !== 'All' ||
    historyFilters.workMode !== 'All' ||
    Boolean(historyFilters.startDate) ||
    Boolean(historyFilters.endDate);

  return (
    <>
      {/* ── SECTION 1: ATTENDANCE OVERVIEW (8 KPI Grid + Period Selector) ── */}
      <div className="card" style={{ padding: '1.35rem 1.5rem', marginBottom: '1.5rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.85rem',
            marginBottom: '1.15rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'rgba(37, 99, 235, 0.12)',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CalendarCheck size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Attendance Overview
              </h2>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Your attendance summary for {rangeSubLabel.toLowerCase()}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
            {RANGE_OPTIONS.map((opt) => {
              const active = overviewRange === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => onChangeOverviewRange(opt.key)}
                  style={{
                    padding: '0.42rem 0.85rem',
                    borderRadius: 8,
                    border: active ? '1px solid #2563eb' : '1px solid var(--border-color)',
                    background: active ? '#2563eb' : 'var(--bg-primary)',
                    color: active ? '#ffffff' : 'var(--text-secondary)',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {overviewRange === 'custom' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              flexWrap: 'wrap',
              marginBottom: '1rem',
              padding: '0.65rem 0.85rem',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 10,
            }}
          >
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Range:
            </span>
            <input
              type="date"
              className="form-control"
              value={customRange.startDate}
              onChange={(e) => onChangeCustomRange({ ...customRange, startDate: e.target.value })}
              style={{ maxWidth: 165, padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
            />
            <span style={{ color: 'var(--text-secondary)' }}>–</span>
            <input
              type="date"
              className="form-control"
              value={customRange.endDate}
              onChange={(e) => onChangeCustomRange({ ...customRange, endDate: e.target.value })}
              style={{ maxWidth: 165, padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={onApplyCustomRange}
              style={{ padding: '0.38rem 0.9rem', fontSize: '0.78rem', fontWeight: 700 }}
            >
              Apply Range
            </button>
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
            gap: '0.8rem',
            opacity: overviewLoading ? 0.65 : 1,
            transition: 'opacity 0.2s ease',
          }}
        >
          {overviewCards.map((card) => (
            <div
              key={card.label}
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 12,
                padding: '0.85rem 0.95rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: card.bg,
                  color: card.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {card.icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {card.label}
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.15, marginTop: 2 }}>
                  {card.value}
                </div>
                <div style={{ fontSize: '0.68rem', fontWeight: 600, color: card.subColor, marginTop: 2 }}>
                  {card.sub}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Period Target Progress Bar */}
        <div
          style={{
            marginTop: '1rem',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 12,
            padding: '0.85rem 1.1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1.15rem',
            flexWrap: 'wrap',
          }}
        >
          <svg width="86" height="86" viewBox="0 0 86 86" style={{ flexShrink: 0 }}>
            <circle cx="43" cy="43" r={ringR} fill="none" stroke="var(--border-color)" strokeWidth="7" />
            <circle
              cx="43"
              cy="43"
              r={ringR}
              fill="none"
              stroke={ringColor}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={`${ringDash} ${ringCirc}`}
              transform="rotate(-90 43 43)"
              style={{ transition: 'stroke-dasharray 0.5s ease' }}
            />
            <text x="43" y="42" textAnchor="middle" fill="var(--text-primary)" fontSize="13" fontWeight="900">
              {targetPct}%
            </text>
            <text x="43" y="54" textAnchor="middle" fill="var(--text-secondary)" fontSize="8">
              target
            </text>
          </svg>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Period Target Progress
              </span>
              {overviewSummary.streak >= 3 && (
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#d97706' }}>
                  {overviewSummary.streak}-day on-time streak
                </span>
              )}
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: ringColor, marginBottom: '0.2rem' }}>
              {formatMinutesDuration(overviewSummary.liveTotalMinutes ?? (overviewSummary.totalHours || 0) * 60)}{' '}
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                of {overviewSummary.targetHours || 0}h target ({overviewSummary.totalPeriodWorkingDays || 0} working days × {overviewSummary.dailyTargetHours || policyInfo.dailyTargetHours || 8}h)
              </span>
            </div>
            <div style={{ height: 6, background: 'var(--border-color)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${targetPct}%`, background: ringColor, borderRadius: 999, transition: 'width 0.5s ease' }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: REALTIME PUNCH CONSOLE + INTERACTIVE CALENDAR & WEEKLY TREND ── */}
      <div className="attendance-layout attendance-layout-grid" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <AttendanceWidget onActionComplete={onRefreshAll} />

          <button
            type="button"
            onClick={() => onOpenCorrectionModal()}
            className="btn btn-primary"
            style={{
              padding: '0.8rem 1.5rem',
              borderRadius: '10px',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.28)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
            }}
          >
            <Clock size={16} /> Request Correction
          </button>

          <div className="card" style={{ padding: '1.2rem' }}>
            <span className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.7rem' }}>
              <HelpCircle size={15} style={{ color: 'var(--primary-accent)' }} />
              Shift Policy Info
            </span>
            <ul style={{ paddingLeft: '1.15rem', fontSize: '0.81rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.35rem', lineHeight: 1.45, margin: 0 }}>
              <li>Standard Shift: <strong>{policyInfo.businessHours || '09:30 AM - 06:30 PM'}</strong></li>
              <li>Daily Target: <strong>{policyInfo.dailyTargetHours || 8} hours</strong> (Multiple punches allowed)</li>
              <li>Grace Period: <strong>{policyInfo.lateGraceMinutes ?? 15} minutes</strong> from {policyInfo.officeStartTime || '09:30'}</li>
              <li>Overtime starts after <strong>{policyInfo.overtimeThresholdHours || 8} hours</strong> of work</li>
            </ul>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Interactive Monthly Calendar */}
          <div className="card" style={{ padding: '1.4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.08rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <Calendar size={18} style={{ color: 'var(--primary-accent)' }} />
                {monthNames[calMonth]} {calYear}
              </h3>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  type="button"
                  onClick={() => setCalendarDate(new Date(calYear, calMonth - 1, 1))}
                  className="btn btn-secondary"
                  style={{ padding: '0.38rem 0.75rem', fontSize: '0.78rem' }}
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarDate(new Date(calYear, calMonth + 1, 1))}
                  className="btn btn-secondary"
                  style={{ padding: '0.38rem 0.75rem', fontSize: '0.78rem' }}
                >
                  Next
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.45rem', textAlign: 'center' }} className="week-grid">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)', padding: '0.2rem 0' }}>
                  {d}
                </div>
              ))}
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div key={`blank-${i}`} style={{ height: 50, opacity: 0.1 }} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const log = getCalendarLogForDay(day);
                const isSunday = new Date(calYear, calMonth, day).getDay() === 0;
                let dayBg = 'var(--bg-primary)';
                let dayBorder = '1px solid var(--border-color)';
                let dotColor = 'transparent';
                let tooltip = isSunday ? 'Sunday Weekend' : 'No Record';

                if (log && !log.isVirtual) {
                  const punchCount = log.sessions?.length || log.sessionCount || 1;
                  const punchLabel = `${punchCount} punch${punchCount > 1 ? 'es' : ''}`;
                  const summaryTip = `${punchLabel} · Worked: ${formatMinutesDuration((log.totalHours || 0) * 60)} · Break: ${formatMinutesDuration(log.breakMinutes || 0)}`;
                  if (log.status === 'Present') {
                    dayBorder = '1px solid rgba(46,189,127,0.35)';
                    dayBg = 'rgba(46,189,127,0.06)';
                    dotColor = 'var(--success)';
                    tooltip = `Present · ${summaryTip}`;
                  } else if (log.status === 'Late') {
                    dayBorder = '1px solid rgba(255,177,25,0.35)';
                    dayBg = 'rgba(255,177,25,0.06)';
                    dotColor = 'var(--warning)';
                    tooltip = `Late arrival · ${summaryTip}`;
                  } else if (log.status === 'Half Day') {
                    dayBorder = '1px solid rgba(103,119,239,0.35)';
                    dayBg = 'rgba(103,119,239,0.06)';
                    dotColor = 'var(--primary-accent)';
                    tooltip = `Half Day · ${summaryTip}`;
                  } else if (log.status === 'Absent') {
                    dayBorder = '1px solid rgba(255,91,91,0.35)';
                    dayBg = 'rgba(255,91,91,0.06)';
                    dotColor = 'var(--danger)';
                    tooltip = 'Absent';
                  }
                }

                return (
                  <div
                    key={`day-${day}`}
                    title={tooltip}
                    style={{
                      height: 50,
                      background: dayBg,
                      border: dayBorder,
                      borderRadius: 8,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.35rem',
                    }}
                  >
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: isSunday ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                      {day}
                    </span>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, display: 'block' }} />
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.1rem', flexWrap: 'wrap', borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
              {[
                { label: 'On-Time (Present)', color: 'var(--success)' },
                { label: 'Late Clock-in', color: 'var(--warning)' },
                { label: 'Half Day', color: 'var(--primary-accent)' },
                { label: 'Absent', color: 'var(--danger)' },
              ].map((item) => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          {/* Real Weekly Work Hours Chart (no mock fallback) */}
          <div className="card" style={{ padding: '1.35rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem' }}>
              <span className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <TrendingUp size={15} style={{ color: 'var(--primary-accent)' }} />
                Recent Work Hours Trend
              </span>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Target: {policyInfo.dailyTargetHours || 8}h/day
              </span>
            </div>

            {weeklyTrendItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', fontSize: '0.82rem', color: 'var(--text-secondary)', background: 'var(--bg-primary)', borderRadius: 10, border: '1px dashed var(--border-color)' }}>
                No punch history logged yet. Start clocking in to see your real daily hours chart.
              </div>
            ) : (
              <svg viewBox="0 0 500 185" style={{ width: '100%', height: '165px', overflow: 'visible' }}>
                <line x1="40" y1="20" x2="480" y2="20" stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="3,3" />
                <text x="34" y="24" fill="var(--text-secondary)" fontSize="10" textAnchor="end">12h</text>

                <line x1="40" y1="68" x2="480" y2="68" stroke="rgba(239,68,68,0.55)" strokeWidth="1" strokeDasharray="4,4" />
                <text x="34" y="72" fill="#ef4444" fontSize="10" fontWeight="bold" textAnchor="end">{policyInfo.dailyTargetHours || 8}h</text>

                <line x1="40" y1="158" x2="480" y2="158" stroke="var(--border-color)" strokeWidth="1" />
                <text x="34" y="162" fill="var(--text-secondary)" fontSize="10" textAnchor="end">0h</text>

                {weeklyTrendItems.map((item, idx) => {
                  const barWidth = 36;
                  const colWidth = 440 / Math.max(weeklyTrendItems.length, 1);
                  const x = 40 + idx * colWidth + (colWidth - barWidth) / 2;
                  const maxVal = 12;
                  const graphHeight = 138;
                  const barHeight = (Math.min(item.hours, maxVal) / maxVal) * graphHeight;
                  const y = 158 - barHeight;
                  const svgColor = item.hours < (policyInfo.dailyTargetHours || 8) ? '#f59e0b' : '#10b981';
                  return (
                    <g key={`${item.label}-${idx}`}>
                      <rect x={x} y={y} width={barWidth} height={Math.max(barHeight, 2)} rx="4" fill={svgColor} opacity="0.88" />
                      <text x={x + barWidth / 2} y={y - 6} fill="var(--text-primary)" fontSize="9" fontWeight="bold" textAnchor="middle">
                        {item.hours.toFixed(1)}h
                      </text>
                      <text x={x + barWidth / 2} y="176" fill="var(--text-secondary)" fontSize="9" textAnchor="middle">
                        {item.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* ── SECTION 3: MY CORRECTION REQUESTS ── */}
      <div className="card table-responsive-wrapper" style={{ marginBottom: '1.5rem', padding: '1.35rem 1.5rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.85rem',
            marginBottom: '1.1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'rgba(37, 99, 235, 0.12)',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Award size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                My Correction Requests
              </h3>
              <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                Track the status of your attendance correction requests
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {filteredRegs.length > 5 && (
              <button
                type="button"
                onClick={() => setShowAllRequests((v) => !v)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#2563eb',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '0.25rem 0.5rem',
                }}
              >
                {showAllRequests ? 'Show Recent' : 'View All Requests →'}
              </button>
            )}

            {[
              { key: 'All', label: 'Total', count: totalRegCount, bg: 'var(--bg-primary)', color: 'var(--text-primary)', border: 'var(--border-color)' },
              { key: 'Pending', label: 'Pending', count: pendingRegCount, bg: 'rgba(245, 158, 11, 0.12)', color: '#d97706', border: 'rgba(245, 158, 11, 0.3)' },
              { key: 'Approved', label: 'Approved', count: approvedRegCount, bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: 'rgba(16, 185, 129, 0.3)' },
              { key: 'Rejected', label: 'Rejected', count: rejectedRegCount, bg: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' },
            ].map((pill) => {
              const selected = regStatusFilter === pill.key;
              return (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => setRegStatusFilter(pill.key)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '0.32rem 0.7rem',
                    borderRadius: 10,
                    background: pill.bg,
                    border: selected ? '1.5px solid #2563eb' : `1px solid ${pill.border}`,
                    color: pill.color,
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <span>{pill.label}</span>
                  <strong>{pill.count}</strong>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => onOpenCorrectionModal()}
              className="btn btn-primary"
              style={{
                padding: '0.38rem 0.78rem',
                fontSize: '0.76rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Plus size={14} /> New
            </button>
          </div>
        </div>

        <div className="data-table-wrapper" style={{ maxHeight: '340px', overflowY: 'auto' }}>
          {visibleRegs.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-secondary)', fontSize: '0.84rem', margin: 0 }}>
              {regularizations.length === 0
                ? 'No correction requests submitted yet.'
                : `No ${regStatusFilter.toLowerCase()} correction requests found.`}
            </p>
          ) : (
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Request Date</th>
                  <th>Attendance Date</th>
                  <th>Request Type</th>
                  <th>Original Punch</th>
                  <th>Requested Time</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Submitted On</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleRegs.map((reg) => {
                  const typeTheme = getRequestTypeTheme(reg.requestType);
                  const regTheme = getRegStatusTheme(reg.status);
                  const submittedAt = reg.createdAt ? new Date(reg.createdAt) : new Date(reg.date);
                  return (
                    <tr key={reg._id}>
                      <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                        {formatDateDisplay(reg.createdAt || reg.date)}
                      </td>
                      <td style={{ whiteSpace: 'nowrap', fontWeight: 700 }}>
                        {formatDateDisplay(reg.date)}
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '0.71rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.6rem',
                            borderRadius: 999,
                            background: typeTheme.bg,
                            color: typeTheme.color,
                            border: `1px solid ${typeTheme.border}`,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {formatRequestTypeLabel(reg.requestType)}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                        {formatOriginalPunchText(reg)}
                      </td>
                      <td style={{ fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {reg.clockIn ? `${formatClockTime(reg.clockIn)} – ` : ''}
                        {formatClockTime(reg.clockOut)}
                      </td>
                      <td
                        style={{ fontSize: '0.78rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={reg.reason}
                      >
                        {reg.reason}
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.65rem',
                            borderRadius: 999,
                            background: regTheme.bg,
                            color: regTheme.color,
                            border: `1px solid ${regTheme.border}`,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {reg.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.76rem', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                        {formatDateDisplay(submittedAt)} {formatClockTime(submittedAt)}
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => setSelectedRegDetail(reg)}
                          className="btn btn-secondary"
                          style={{
                            padding: '0.28rem 0.65rem',
                            fontSize: '0.73rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            whiteSpace: 'nowrap',
                            color: '#2563eb',
                          }}
                        >
                          <Eye size={13} /> View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── SECTION 4: UNIFIED PERSONAL PUNCH HISTORY LOG ── */}
      <div className="card table-responsive-wrapper" style={{ padding: '1.35rem 1.5rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'rgba(37, 99, 235, 0.12)',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Activity size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Personal Punch History Log
              </h3>
              <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                Your detailed attendance records
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '0.76rem',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                padding: '0.32rem 0.7rem',
                borderRadius: 999,
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
              }}
            >
              {historyLogs.length} {historyLogs.length === 1 ? 'Record' : 'Records'}
            </span>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => onExportHistoryCSV(historyLogs)}
              disabled={!historyLogs.length}
              title={historyLogs.length ? 'Download filtered Punch History CSV' : 'No records to export'}
              style={{
                padding: '0.38rem 0.85rem',
                borderRadius: 8,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.78rem',
                fontWeight: 700,
                opacity: historyLogs.length ? 1 : 0.5,
                cursor: historyLogs.length ? 'pointer' : 'not-allowed',
              }}
            >
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '0.55rem',
            padding: '0.75rem 0.9rem',
            background: 'var(--bg-primary)',
            borderRadius: 12,
            border: '1px solid var(--border-color)',
            marginBottom: '1.1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', marginRight: '0.25rem' }}>
            {QUICK_STATUS_PILLS.map((st) => {
              const active = historyFilters.status === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    const next = { ...historyFilters, status: st };
                    onChangeHistoryFilters(next);
                    onApplyHistoryFilters(next);
                  }}
                  style={{
                    padding: '0.34rem 0.72rem',
                    borderRadius: 8,
                    border: active ? '1px solid #2563eb' : '1px solid var(--border-color)',
                    background: active ? '#2563eb' : 'var(--bg-card)',
                    color: active ? '#ffffff' : 'var(--text-secondary)',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {st}
                </button>
              );
            })}
          </div>

          <input
            type="date"
            className="form-control"
            title="From Date"
            value={historyFilters.startDate}
            onChange={(e) => onChangeHistoryFilters({ ...historyFilters, startDate: e.target.value })}
            style={{ width: 138, padding: '0.34rem 0.55rem', fontSize: '0.76rem' }}
          />
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>–</span>
          <input
            type="date"
            className="form-control"
            title="To Date"
            value={historyFilters.endDate}
            onChange={(e) => onChangeHistoryFilters({ ...historyFilters, endDate: e.target.value })}
            style={{ width: 138, padding: '0.34rem 0.55rem', fontSize: '0.76rem' }}
          />

          <select
            className="form-control"
            value={historyFilters.workMode}
            onChange={(e) => onChangeHistoryFilters({ ...historyFilters, workMode: e.target.value })}
            style={{ width: 142, padding: '0.34rem 0.55rem', fontSize: '0.76rem' }}
          >
            <option value="All">All Work Modes</option>
            <option value="Office">Office</option>
            <option value="WFH">WFH</option>
            <option value="Hybrid">Hybrid</option>
          </select>

          <select
            className="form-control"
            value={historyFilters.status}
            onChange={(e) => onChangeHistoryFilters({ ...historyFilters, status: e.target.value })}
            style={{ width: 148, padding: '0.34rem 0.55rem', fontSize: '0.76rem' }}
          >
            <option value="All">All Status</option>
            <option value="Present">Present</option>
            <option value="Late">Late</option>
            <option value="Currently Working">Currently Working</option>
            <option value="Incomplete">Incomplete</option>
            <option value="Absent">Absent</option>
            <option value="On Leave">On Leave</option>
            <option value="Holiday">Holiday</option>
          </select>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onApplyHistoryFilters(historyFilters)}
            style={{ padding: '0.38rem 0.9rem', fontSize: '0.76rem', fontWeight: 700 }}
          >
            Apply
          </button>

          {hasActiveHistoryFilters && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onResetHistoryFilters}
              style={{ padding: '0.38rem 0.7rem', fontSize: '0.75rem', fontWeight: 700 }}
            >
              Reset
            </button>
          )}

          <button
            type="button"
            className="btn btn-secondary"
            title="Refresh Records"
            onClick={() => onApplyHistoryFilters(historyFilters)}
            style={{ padding: '0.38rem 0.55rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <RefreshCw size={14} className={historyLoading ? 'spin' : ''} />
          </button>
        </div>

        {/* History Table */}
        <div className="data-table-wrapper" style={{ maxHeight: '520px', overflowY: 'auto' }}>
          {historyLoading ? (
            <p style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Loading punch history records...
            </p>
          ) : historyLogs.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              No attendance records match the selected filters.
            </p>
          ) : (
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: 30 }}></th>
                  <th>Date</th>
                  <th>Punches</th>
                  <th>Work Mode</th>
                  <th>First In</th>
                  <th>Last Out</th>
                  <th>Status</th>
                  <th>Worked Hours</th>
                  <th>Break</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {historyLogs.map((rec) => {
                  const isExp = expandedRowId === rec._id;
                  const m = computeRecordDisplayMetrics(rec, nowMs);
                  const canExpand = !rec.isVirtual && (rec.sessions?.length || 0) > 0;
                  const statusLabel = rec.isVirtual ? rec.status : m.displayStatus;

                  return (
                    <React.Fragment key={rec._id}>
                      <tr
                        onClick={() => canExpand && setExpandedRowId(isExp ? null : rec._id)}
                        style={{ cursor: canExpand ? 'pointer' : 'default' }}
                      >
                        <td>
                          {canExpand && (isExp ? <ChevronDown size={15} /> : <ChevronRight size={15} />)}
                        </td>
                        <td style={{ whiteSpace: 'nowrap', fontWeight: 700 }}>
                          {new Date(rec.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: '0.73rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.6rem',
                              borderRadius: 999,
                              background: rec.isVirtual ? 'rgba(148, 163, 184, 0.14)' : 'rgba(37, 99, 235, 0.1)',
                              color: rec.isVirtual ? 'var(--text-secondary)' : '#2563eb',
                              border: rec.isVirtual ? '1px solid var(--border-color)' : '1px solid rgba(37, 99, 235, 0.22)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {m.punchesCount} {m.punchesCount === 1 ? 'Punch' : 'Punches'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                          {m.workModeText}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {rec.clockIn ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.84rem', fontWeight: 600 }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                              {formatClockTime(rec.clockIn)}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)' }}>–</span>
                          )}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {m.isTodayOpen ? (
                            <span style={{ color: '#2563eb', fontWeight: 700, fontSize: '0.78rem' }}>
                              Running
                            </span>
                          ) : m.isPastUnclosed ? (
                            <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.78rem' }}>
                              Missing Out
                            </span>
                          ) : rec.clockOut ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.84rem', fontWeight: 600 }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2563eb' }} />
                              {formatClockTime(rec.clockOut)}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)' }}>–</span>
                          )}
                        </td>
                        <td>
                          <span style={getLogStatusStyle(statusLabel)}>{statusLabel}</span>
                        </td>
                        <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {rec.isVirtual ? '0m' : formatMinutesDuration(m.totalWorkingMinutes)}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {rec.isVirtual ? '0m' : formatMinutesDuration(m.breakMinutes)}
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => setSelectedDayDetail(rec)}
                              style={{
                                padding: '0.28rem 0.65rem',
                                fontSize: '0.73rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                color: '#2563eb',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <Eye size={13} /> View Details
                            </button>
                            {(m.isPastUnclosed || rec.status === 'Absent') && (
                              <button
                                type="button"
                                className="btn btn-secondary"
                                title="Request Attendance Correction"
                                onClick={() => onOpenCorrectionModal(rec)}
                                style={{
                                  padding: '0.28rem 0.5rem',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  color: '#d97706',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                <Wrench size={12} /> Fix
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExp && canExpand && (
                        <tr>
                          <td colSpan={10} style={{ padding: '0.45rem 0.85rem', background: 'var(--bg-primary)' }}>
                            <SessionBreakdownTable sessions={rec.sessions} record={rec} />
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

      {/* ── MODAL: CORRECTION REQUEST DETAILS ── */}
      {selectedRegDetail && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.58)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '1rem',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: 520,
              padding: '1.5rem',
              borderRadius: 16,
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Correction Request Details</h3>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedRegDetail(null)}
                style={{ padding: '0.3rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem', fontSize: '0.82rem' }}>
              <div style={{ background: 'var(--bg-primary)', padding: '0.7rem', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>Attendance Date</div>
                <strong style={{ color: 'var(--text-primary)' }}>{formatDateDisplay(selectedRegDetail.date)}</strong>
              </div>
              <div style={{ background: 'var(--bg-primary)', padding: '0.7rem', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>Request Type</div>
                <strong style={{ color: 'var(--text-primary)' }}>
                  {formatRequestTypeLabel(selectedRegDetail.requestType)}
                  {selectedRegDetail.sessionNumber ? ` (Punch #${selectedRegDetail.sessionNumber})` : ''}
                </strong>
              </div>
              <div style={{ background: 'var(--bg-primary)', padding: '0.7rem', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>Original Punch</div>
                <strong style={{ color: 'var(--text-primary)' }}>{formatOriginalPunchText(selectedRegDetail)}</strong>
              </div>
              <div style={{ background: 'var(--bg-primary)', padding: '0.7rem', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>Requested Time</div>
                <strong style={{ color: '#2563eb' }}>
                  {selectedRegDetail.clockIn ? `${formatClockTime(selectedRegDetail.clockIn)} – ` : ''}
                  {formatClockTime(selectedRegDetail.clockOut)}
                </strong>
              </div>
              <div style={{ background: 'var(--bg-primary)', padding: '0.7rem', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>Status</div>
                <strong style={{ color: getRegStatusTheme(selectedRegDetail.status).color }}>{selectedRegDetail.status}</strong>
              </div>
              <div style={{ background: 'var(--bg-primary)', padding: '0.7rem', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>Submitted On</div>
                <strong style={{ color: 'var(--text-primary)' }}>
                  {formatDateDisplay(selectedRegDetail.createdAt || selectedRegDetail.date)} {formatClockTime(selectedRegDetail.createdAt || selectedRegDetail.date)}
                </strong>
              </div>
            </div>

            <div style={{ background: 'var(--bg-primary)', padding: '0.8rem', borderRadius: 10, border: '1px solid var(--border-color)', marginBottom: '0.75rem', fontSize: '0.82rem' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', marginBottom: 4 }}>Reason</div>
              <div style={{ color: 'var(--text-primary)', lineHeight: 1.45 }}>{selectedRegDetail.reason}</div>
            </div>

            {(selectedRegDetail.remarks || selectedRegDetail.approvedBy) && (
              <div style={{ background: 'var(--bg-primary)', padding: '0.8rem', borderRadius: 10, border: '1px solid var(--border-color)', marginBottom: '1rem', fontSize: '0.82rem' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', marginBottom: 4 }}>
                  Review Details {selectedRegDetail.approvedBy?.username ? `(${selectedRegDetail.approvedBy.username})` : ''}
                </div>
                <div style={{ color: 'var(--text-primary)' }}>
                  {selectedRegDetail.remarks || 'Processed with no extra remarks.'}
                </div>
              </div>
            )}

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setSelectedRegDetail(null)}
              style={{ width: '100%' }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL: DAY ATTENDANCE DETAILS ── */}
      {selectedDayDetail && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.58)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '1rem',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: 820,
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.5rem',
              borderRadius: 16,
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.12rem', fontWeight: 800 }}>
                  Attendance Details — {formatDateDisplay(selectedDayDetail.date)}
                </h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  {selectedDayDetail.dailyStatus ? formatDailyStatusLabel(selectedDayDetail.dailyStatus) : selectedDayDetail.status}
                  {selectedDayDetail.leaveType ? ` (${selectedDayDetail.leaveType} Leave)` : ''}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {!selectedDayDetail.isFinalized && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      const target = selectedDayDetail;
                      setSelectedDayDetail(null);
                      onOpenCorrectionModal(target);
                    }}
                    style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                  >
                    <AlertCircle size={14} /> Request Correction
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedDayDetail(null)}
                  style={{ padding: '0.35rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {selectedDayDetail.isVirtual ? (
              <div style={{ padding: '1.25rem', background: 'var(--bg-primary)', borderRadius: 12, border: '1px solid var(--border-color)', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                No punch records were logged on this date ({selectedDayDetail.status}). Use <strong>Request Correction</strong> if you worked on this day and forgot to punch.
              </div>
            ) : (
              <SessionBreakdownTable sessions={selectedDayDetail.sessions} record={selectedDayDetail} />
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default PersonalAttendancePanel;
