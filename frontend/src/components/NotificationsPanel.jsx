import React from 'react';
import { Gift, Cake, BellRing, CheckSquare, Megaphone } from 'lucide-react';

const NotificationsPanel = ({ birthdays = [], anniversaries = [], pendingLeaves = 0 }) => {
  const announcements = [
    { id: 1, text: 'Clock in before 09:30 AM daily', type: 'info' },
    { id: 2, text: 'Submit leave requests 3 days in advance', type: 'warning' },
    { id: 3, text: 'Monthly payroll processed on the 28th', type: 'info' },
  ];

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <span className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <BellRing size={18} style={{ color: 'var(--warning)' }} />
        Notifications &amp; Alerts
      </span>

      {/* Pending Tasks */}
      {pendingLeaves > 0 && (
        <div style={{
          padding: '0.75rem 1rem',
          background: 'var(--warning-bg)',
          borderRadius: '10px',
          borderLeft: '3px solid var(--warning)',
          display: 'flex', alignItems: 'center', gap: '0.6rem',
        }}>
          <CheckSquare size={16} style={{ color: 'var(--warning)', flexShrink: 0 }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--warning)' }}>
            {pendingLeaves} Leave Request{pendingLeaves !== 1 ? 's' : ''} awaiting your approval
          </span>
        </div>
      )}

      {/* Birthdays */}
      {birthdays.length > 0 && (
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.6rem' }}>
            🎂 Birthdays
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {birthdays.map((emp) => (
              <div key={emp._id} style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                padding: '0.5rem 0.75rem',
                background: emp.isToday ? 'rgba(46,189,127,0.08)' : 'var(--bg-primary)',
                borderRadius: '8px',
                border: emp.isToday ? '1px solid var(--success)' : '1px solid transparent',
              }}>
                <Cake size={14} style={{ color: emp.isToday ? 'var(--success)' : 'var(--primary-accent)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {emp.firstName} {emp.lastName}
                    {emp.isToday && <span style={{ color: 'var(--success)', marginLeft: '0.4rem', fontSize: '0.75rem' }}>Today! 🎉</span>}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{emp.birthdayDate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Work Anniversaries */}
      {anniversaries.length > 0 && (
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.6rem' }}>
            🏅 Work Anniversaries
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {anniversaries.map((emp) => (
              <div key={emp._id} style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                padding: '0.5rem 0.75rem', background: 'var(--bg-primary)', borderRadius: '8px',
              }}>
                <Gift size={14} style={{ color: 'var(--info)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {emp.firstName} {emp.lastName}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {emp.yearsCompleted} year{emp.yearsCompleted !== 1 ? 's' : ''} this month
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HR Announcements */}
      <div>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Megaphone size={12} /> HR Announcements
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {announcements.map((a) => (
            <div key={a.id} style={{
              padding: '0.5rem 0.75rem',
              background: a.type === 'warning' ? 'var(--warning-bg)' : 'var(--info-bg)',
              borderRadius: '8px',
              fontSize: '0.82rem',
              color: a.type === 'warning' ? 'var(--warning)' : 'var(--info)',
              fontWeight: 500,
            }}>
              {a.text}
            </div>
          ))}
        </div>
      </div>

      {birthdays.length === 0 && anniversaries.length === 0 && pendingLeaves === 0 && (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.85rem', margin: 'auto' }}>
          No new notifications today
        </p>
      )}
    </div>
  );
};

export default NotificationsPanel;
