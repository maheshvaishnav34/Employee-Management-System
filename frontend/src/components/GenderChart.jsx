import React from 'react';
import { Users2 } from 'lucide-react';

const GenderChart = ({ data = [] }) => {
  // data expected: [{ name: 'Male', count: 10 }, { name: 'Female', count: 8 }, ...]
  const total = data.reduce((s, d) => s + d.count, 0);

  const colors = {
    Male:   { color: '#6777ef', bg: 'rgba(103,119,239,0.12)', emoji: '👨' },
    Female: { color: '#e91e8c', bg: 'rgba(233,30,140,0.1)',   emoji: '👩' },
    Other:  { color: '#00bcd4', bg: 'rgba(0,188,212,0.1)',    emoji: '🧑' },
  };

  // Build segments for CSS conic-gradient donut
  let cumulative = 0;
  const segments = data.map((d) => {
    const pct = total > 0 ? (d.count / total) * 100 : 0;
    const start = cumulative;
    cumulative += pct;
    const cfg = colors[d.name] || { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', emoji: '👤' };
    return { ...d, pct, start, color: cfg.color, bg: cfg.bg, emoji: cfg.emoji };
  });

  const gradient = segments
    .map((s) => `${s.color} ${s.start.toFixed(1)}% ${(s.start + s.pct).toFixed(1)}%`)
    .join(', ');

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <span className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <Users2 size={18} style={{ color: 'var(--primary-accent)' }} />
        Gender Distribution
      </span>

      {total === 0 ? (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', margin: 'auto', fontSize: '0.85rem' }}>
          No employee data
        </p>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1 }}>
          {/* Donut chart via CSS */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: '100px', height: '100px', borderRadius: '50%',
              background: segments.length > 0
                ? `conic-gradient(${gradient})`
                : 'var(--border-color)',
            }} />
            {/* Inner hole */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '60px', height: '60px',
              borderRadius: '50%',
              background: 'var(--bg-secondary)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: "'Outfit', sans-serif", lineHeight: 1 }}>
                {total}
              </span>
              <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total</span>
            </div>
          </div>

          {/* Legend */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {segments.map((s) => (
              <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: s.color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.83rem', flex: 1, fontWeight: 500 }}>
                  {s.emoji} {s.name}
                </span>
                <span style={{ fontSize: '0.83rem', fontWeight: 700 }}>{s.count}</span>
                <span style={{
                  fontSize: '0.72rem', padding: '0.1rem 0.4rem',
                  borderRadius: '6px', background: s.bg, color: s.color, fontWeight: 700,
                }}>
                  {s.pct.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GenderChart;
