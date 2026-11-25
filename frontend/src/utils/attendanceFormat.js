export const formatMinutesDuration = (minutes) => {
  if (minutes === null || minutes === undefined || isNaN(minutes)) return '–';
  const totalSec = Math.round(Number(minutes) * 60);
  if (totalSec <= 0) return '0m';
  if (totalSec < 60) return `${totalSec}s`;
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h 0m`;
  return `${m}m`;
};

export const formatHoursDuration = (hours) => {
  if (hours === null || hours === undefined || isNaN(hours)) return '–';
  return formatMinutesDuration(Number(hours) * 60);
};

export const formatClockTime = (dateVal) => {
  if (!dateVal) return '–';
  return new Date(dateVal).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatClockTimeWithSec = (dateVal) => {
  if (!dateVal) return '–';
  return new Date(dateVal).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export const formatDateDisplay = (dateVal) => {
  if (!dateVal) return '–';
  return new Date(dateVal).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDailyStatusLabel = (dailyStatus) => {
  switch (dailyStatus) {
    case 'Not Started':
      return 'Not Clocked In';
    case 'Currently Working':
      return 'Currently Working';
    case 'Between Sessions':
      return 'Clocked Out';
    case 'Completed Session':
      return 'Completed';
    case 'Daily Target Completed':
      return 'Target Completed';
    case 'Attendance Incomplete':
      return 'Incomplete';
    case 'Daily Attendance Finalized':
      return 'Finalized';
    default:
      return dailyStatus || '–';
  }
};

export const escapeCsvCell = (value) => {
  const str = value === null || value === undefined ? '' : String(value);
  return `"${str.replace(/"/g, '""')}"`;
};

export const downloadCsvFile = (filename, headers, rows) => {
  const csvLines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(',')),
  ];
  const csvContent = `\uFEFF${csvLines.join('\r\n')}`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const getDailyStatusTheme = (dailyStatus) => {
  switch (dailyStatus) {
    case 'Currently Working':
      return { bg: 'rgba(16, 185, 129, 0.14)', color: '#10b981', border: 'rgba(16, 185, 129, 0.28)' };
    case 'Between Sessions':
      return { bg: 'rgba(37, 99, 235, 0.12)', color: '#2563eb', border: 'rgba(37, 99, 235, 0.25)' };
    case 'Daily Target Completed':
    case 'Completed Session':
      return { bg: 'rgba(16, 185, 129, 0.14)', color: '#059669', border: 'rgba(16, 185, 129, 0.28)' };
    case 'Attendance Incomplete':
      return { bg: 'rgba(239, 68, 68, 0.14)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.28)' };
    case 'Daily Attendance Finalized':
      return { bg: 'rgba(99, 102, 241, 0.14)', color: '#6366f1', border: 'rgba(99, 102, 241, 0.28)' };
    case 'On Leave':
      return { bg: 'rgba(139, 92, 246, 0.14)', color: '#8b5cf6', border: 'rgba(139, 92, 246, 0.28)' };
    case 'Holiday':
      return { bg: 'rgba(14, 165, 233, 0.14)', color: '#0ea5e9', border: 'rgba(14, 165, 233, 0.28)' };
    case 'Absent':
      return { bg: 'rgba(239, 68, 68, 0.14)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.28)' };
    default:
      return { bg: 'rgba(148, 163, 184, 0.14)', color: 'var(--text-secondary)', border: 'var(--border-color)' };
  }
};

export const formatRequestTypeLabel = (requestType) => {
  switch (requestType) {
    case 'MissedPunch':
      return 'Missing Clock Out';
    case 'Correction':
      return 'Edit Existing Punch';
    case 'AddSession':
      return 'Add Missing Punch';
    default:
      return requestType || 'Edit Existing Punch';
  }
};

export const getRequestTypeTheme = (requestType) => {
  switch (requestType) {
    case 'MissedPunch':
      return { bg: 'rgba(37, 99, 235, 0.12)', color: '#2563eb', border: 'rgba(37, 99, 235, 0.25)' };
    case 'AddSession':
      return { bg: 'rgba(16, 185, 129, 0.12)', color: '#059669', border: 'rgba(16, 185, 129, 0.25)' };
    default:
      return { bg: 'rgba(99, 102, 241, 0.12)', color: '#6366f1', border: 'rgba(99, 102, 241, 0.25)' };
  }
};

export const formatDateInputValue = (dateVal) => {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const formatTimeInputValue = (dateVal) => {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

export const computeRecordDisplayMetrics = (rec, nowMs = Date.now()) => {
  if (!rec) {
    return {
      punchesCount: 0,
      workModeText: '–',
      hasOpenPunch: false,
      isTodayOpen: false,
      isPastUnclosed: false,
      totalWorkingMinutes: 0,
      breakMinutes: 0,
      displayStatus: '–',
    };
  }

  const sessions = rec.sessions || [];
  const punchesCount = rec.isVirtual ? 0 : sessions.length || rec.sessionCount || 1;

  const today = new Date(nowMs);
  today.setHours(0, 0, 0, 0);
  const recDay = new Date(rec.date);
  recDay.setHours(0, 0, 0, 0);
  const isTodayRec = recDay.getTime() === today.getTime();

  const openPunch = sessions.find((s) => !s.clockOutTime);
  const isTodayOpen = Boolean(openPunch) && isTodayRec && rec.dailyStatus === 'Currently Working';
  const isPastUnclosed =
    Boolean(rec.isIncomplete) || (Boolean(openPunch) && recDay.getTime() < today.getTime());

  const baseMinutes =
    rec.totalMinutes !== undefined && rec.totalMinutes !== null
      ? Number(rec.totalMinutes)
      : Math.round((Number(rec.totalHours) || 0) * 60 * 100) / 100;

  const liveAddMinutes =
    isTodayOpen && openPunch?.clockInTime
      ? Math.max(0, (nowMs - new Date(openPunch.clockInTime).getTime()) / 60000)
      : 0;

  const totalWorkingMinutes = Math.round((baseMinutes + liveAddMinutes) * 100) / 100;

  const uniqueModes =
    rec.workModes && rec.workModes.length > 0
      ? rec.workModes
      : Array.from(new Set(sessions.map((s) => s.workMode).filter(Boolean)));
  const workModeText = rec.isVirtual
    ? '–'
    : uniqueModes.length > 0
      ? uniqueModes.join(' / ')
      : rec.workMode || 'Office';

  let displayStatus = rec.status || '–';
  if (isTodayOpen) displayStatus = 'Currently Working';
  else if (isPastUnclosed) displayStatus = 'Incomplete';

  return {
    punchesCount,
    workModeText,
    hasOpenPunch: Boolean(openPunch),
    isTodayOpen,
    isPastUnclosed,
    totalWorkingMinutes,
    breakMinutes: Number(rec.breakMinutes || 0),
    displayStatus,
  };
};
