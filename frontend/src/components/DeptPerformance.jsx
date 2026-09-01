import React from 'react';
import { Building2, TrendingUp, TrendingDown } from 'lucide-react';

const DeptPerformance = ({ data = [] }) => {
  // data: [{ name, count, attendanceRate }]
  const sorted = [...data].sort((a, b) => (b.attendanceRate || 0) - (a.attendanceRate || 0));

  const getColor = (rate) => {
    if (rate >= 85) return { color: 'var(--success)', bg: 'var(--success-bg)' };
    if (rate >= 60) return { color: 'var(--warning)', bg: 'var(--warning-bg)' };
    return { color: 'var(--danger)', bg: 'var(--danger-bg)' };
  };

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <span className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <Building2 size={18} style={{ color: 'var(--info)' }} />
        Dept. Attendance Performance
        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginLeft: 'auto', fontWeight: 400 }}>Today's rate</span>
      </span>

      {sorted.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', margin: 'auto', fontSize: '0.85rem' }}>
          No department data
        </p>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.85rem', overflowY: 'auto' }}>
          {sorted.map((dept, i) => {
            const rate = dept.attendanceRate || 0;
            const cfg = getColor(rate);
            return (
              <div key={dept.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                      width: '20px', height: '20px', borderRadius: '6px',
                      background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.7rem', fontWeight: 800, flexShrink: 0,
                    }}>
                      {i + 1}
                    </span>
                    <span style={{ fontSize: '0.87rem', fontWeight: 600 }}>{dept.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{dept.count} emp</span>
                    <span style={{
                      fontSize: '0.82rem', fontWeight: 800,
                      padding: '0.15rem 0.55rem', borderRadius: '8px',
                      background: cfg.bg, color: cfg.color,
                    }}>
                      {rate}%
                    </span>
                  </div>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'var(--bg-primary)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${rate}%`, height: '100%',
                    background: cfg.color,
                    borderRadius: '99px',
                    transition: 'width 1s ease-out',
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DeptPerformance;
