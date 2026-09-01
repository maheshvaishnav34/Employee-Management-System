import React from 'react';
import { Trophy, TrendingUp } from 'lucide-react';

const TopPerformers = ({ performers = [] }) => {
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <span className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <Trophy size={18} style={{ color: 'var(--warning)' }} />
        Top Performers
        <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 'auto' }}>
          by attendance rate
        </span>
      </span>

      {performers.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', margin: 'auto', fontSize: '0.85rem' }}>
          No performance data yet
        </p>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto' }}>
          {performers.map((emp, idx) => (
            <div key={emp._id} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.65rem 0.85rem',
              background: idx === 0 ? 'rgba(255,177,25,0.07)' : 'var(--bg-primary)',
              borderRadius: '10px',
              border: idx === 0 ? '1px solid rgba(255,177,25,0.2)' : '1px solid transparent',
            }}>
              <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{medals[idx] || `#${idx + 1}`}</span>

              <div className="sidebar-footer-avatar" style={{ width: '34px', height: '34px', fontSize: '0.75rem', flexShrink: 0 }}>
                {emp.firstName?.[0]}{emp.lastName?.[0]}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ fontSize: '0.9rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {emp.firstName} {emp.lastName}
                </strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {emp.designation} · {emp.department?.name}
                </span>
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: emp.attendanceRate >= 90 ? 'var(--success)' : emp.attendanceRate >= 70 ? 'var(--warning)' : 'var(--danger)' }}>
                  {emp.attendanceRate}%
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{emp.presentDays}d present</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TopPerformers;
