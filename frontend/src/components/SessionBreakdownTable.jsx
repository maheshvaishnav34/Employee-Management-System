import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Edit3, ListChecks, ReceiptText } from 'lucide-react';
import { formatClockTime, formatMinutesDuration } from '../utils/attendanceFormat';

/**
 * Displays individual Clock In / Clock Out punches as a horizontal timeline stepper
 * paired with a Daily Summary card. Uses "Punch" terminology throughout the UI.
 */
const SessionBreakdownTable = ({ sessions = [], record = null, canEdit = false, onEditSession }) => {
  const [nowMs, setNowMs] = useState(() => Date.now());

  const hasLiveActivePunch = (sessions || []).some((s) => {
    if (s.clockOutTime || s.status === 'Incomplete') return false;
    const d = new Date(s.attendanceDate || s.clockInTime);
    const today = new Date();
    d.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  });

  useEffect(() => {
    if (!hasLiveActivePunch) return undefined;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [hasLiveActivePunch]);

  if (!sessions || sessions.length === 0) {
    return (
      <div style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        No punches recorded for this date.
      </div>
    );
  }

  const sorted = [...sessions].sort(
    (a, b) =>
      (a.sessionNumber || 0) - (b.sessionNumber || 0) ||
      new Date(a.clockInTime) - new Date(b.clockInTime)
  );

  const todayMidnight = new Date(nowMs);
  todayMidnight.setHours(0, 0, 0, 0);

  let computedWorkMinutes = 0;
  let computedBreakMinutes = 0;
  let hasTodayOpen = false;
  let hasPastOpen = false;

  sorted.forEach((s, idx) => {
    const punchDay = new Date(s.attendanceDate || s.clockInTime);
    punchDay.setHours(0, 0, 0, 0);
    const isPastDay = punchDay < todayMidnight;

    if (s.clockOutTime) {
      const mins =
        s.durationMinutes !== undefined && s.durationMinutes !== null
          ? Number(s.durationMinutes)
          : Math.max(0, (new Date(s.clockOutTime) - new Date(s.clockInTime)) / 60000);
      computedWorkMinutes += mins;
    } else if (isPastDay || s.status === 'Incomplete') {
      hasPastOpen = true;
    } else {
      hasTodayOpen = true;
      computedWorkMinutes += Math.max(0, (nowMs - new Date(s.clockInTime).getTime()) / 60000);
    }

    if (idx > 0 && sorted[idx - 1].clockOutTime) {
      const gapMins = (new Date(s.clockInTime) - new Date(sorted[idx - 1].clockOutTime)) / 60000;
      if (gapMins > 0) computedBreakMinutes += gapMins;
    }
  });

  const firstClockIn = record?.clockIn || sorted[0]?.clockInTime;
  const lastPunch = sorted[sorted.length - 1];
  const lastOutDisplay = hasTodayOpen
    ? 'Running'
    : hasPastOpen
      ? 'Missing Out'
      : lastPunch?.clockOutTime
        ? formatClockTime(lastPunch.clockOutTime)
        : record?.clockOut
          ? formatClockTime(record.clockOut)
          : '–';

  const summaryBreakMinutes =
    record?.breakMinutes !== undefined && record?.breakMinutes !== null
      ? Number(record.breakMinutes)
      : Math.round(computedBreakMinutes * 100) / 100;

  return (
    <div
      style={{
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-color)',
        borderRadius: 14,
        padding: '0.95rem 1.1rem',
        margin: '0.25rem 0',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(220px, 250px)',
        gap: '1.15rem',
        alignItems: 'stretch',
      }}
      className="punch-breakdown-grid"
    >
      {/* Left: Horizontal Punch Stepper */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <span
            style={{
              fontSize: '0.78rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
            }}
          >
            <ListChecks size={15} color="var(--primary-accent)" />
            Punch Details ({sorted.length} {sorted.length === 1 ? 'Punch' : 'Punches'})
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fit, minmax(150px, 1fr))`,
            gap: '0.75rem',
            position: 'relative',
          }}
        >
          {sorted.map((s) => {
            const isOpen = !s.clockOutTime;
            const punchDay = new Date(s.attendanceDate || s.clockInTime);
            punchDay.setHours(0, 0, 0, 0);
            const isIncomplete =
              s.status === 'Incomplete' || (isOpen && punchDay < todayMidnight);
            const isLive = isOpen && !isIncomplete;

            const liveMinutes = isLive
              ? Math.max(0, (nowMs - new Date(s.clockInTime).getTime()) / 60000)
              : Number(s.durationMinutes || 0);

            const accentColor = isIncomplete
              ? '#ef4444'
              : isLive
                ? '#2563eb'
                : '#10b981';

            return (
              <div
                key={s._id || s.sessionNumber}
                style={{
                  position: 'relative',
                  background: 'var(--bg-card)',
                  border: `1px solid ${isLive ? 'rgba(37, 99, 235, 0.35)' : isIncomplete ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-color)'}`,
                  borderRadius: 12,
                  padding: '0.75rem 0.7rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: '0.32rem',
                }}
              >
                {/* Status step circle */}
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: `${accentColor}1a`,
                    color: accentColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 2,
                  }}
                >
                  {isIncomplete ? (
                    <AlertTriangle size={15} />
                  ) : isLive ? (
                    <Clock size={15} />
                  ) : (
                    <CheckCircle2 size={15} />
                  )}
                </div>

                {/* Title + optional HR edit action */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <strong style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                    Punch {s.sessionNumber}
                  </strong>
                  {canEdit && onEditSession && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditSession(s);
                      }}
                      title="Edit this punch"
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--primary-accent)',
                        cursor: 'pointer',
                        padding: 2,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Edit3 size={12} />
                    </button>
                  )}
                </div>

                {/* In - Out times */}
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {formatClockTime(s.clockInTime)} –{' '}
                  <span style={{ color: isLive ? '#2563eb' : isIncomplete ? '#ef4444' : 'var(--text-secondary)', fontWeight: isOpen ? 700 : 600 }}>
                    {isIncomplete ? 'Missing Out' : isLive ? 'Running' : formatClockTime(s.clockOutTime)}
                  </span>
                </div>

                {/* Duration */}
                <div
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    color: isLive ? '#2563eb' : isIncomplete ? '#ef4444' : 'var(--text-primary)',
                  }}
                >
                  {isIncomplete ? 'Incomplete' : isLive ? `${formatMinutesDuration(liveMinutes)}+` : formatMinutesDuration(liveMinutes)}
                </div>

                {/* Work Mode & Adjusted Marker */}
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '0.12rem 0.45rem',
                    borderRadius: 999,
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {s.workMode || 'Office'}{s.isManual ? ' · Edited' : ''}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Daily Summary Card */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 12,
          padding: '0.85rem 0.95rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '0.55rem',
        }}
      >
        <div
          style={{
            fontSize: '0.78rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            paddingBottom: '0.45rem',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <ReceiptText size={14} color="var(--primary-accent)" />
          Daily Summary
        </div>

        {[
          { label: 'First Clock In', value: firstClockIn ? formatClockTime(firstClockIn) : '–' },
          {
            label: 'Last Clock Out',
            value: lastOutDisplay,
            color: hasTodayOpen ? '#2563eb' : hasPastOpen ? '#ef4444' : 'var(--text-primary)',
          },
          { label: 'Total Punches', value: String(sorted.length) },
          {
            label: 'Total Working',
            value: formatMinutesDuration(computedWorkMinutes),
            color: 'var(--text-primary)',
          },
          { label: 'Total Break', value: formatMinutesDuration(summaryBreakMinutes) },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.76rem',
              gap: '0.5rem',
            }}
          >
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{item.label}</span>
            <strong style={{ color: item.color || 'var(--text-primary)', fontWeight: 800 }}>
              {item.value}
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SessionBreakdownTable;
