import React from 'react';
import { TrendingUp } from 'lucide-react';

const HeadcountTrend = ({ data = [] }) => {
  if (!data || data.length === 0) {
    return (
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No headcount data</p>
      </div>
    );
  }

  const maxVal = Math.max(...data.map(d => d.count), 1);
  const minVal = Math.min(...data.map(d => d.count), 0);
  const range = maxVal - minVal || 1;

  // SVG line chart dimensions
  const W = 300, H = 80, PAD = 10;
  const pts = data.map((d, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((d.count - minVal) / range) * (H - PAD * 2);
    return { x, y, ...d };
  });

  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${pts[pts.length - 1].x} ${H} L ${pts[0].x} ${H} Z`;

  const formatMonth = (str) => {
    const [year, month] = str.split('-');
    return new Date(year, parseInt(month) - 1, 1).toLocaleDateString(undefined, { month: 'short' });
  };

  const growth = data.length >= 2
    ? data[data.length - 1].count - data[0].count
    : 0;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <span className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
          <TrendingUp size={18} style={{ color: 'var(--success)' }} />
          Headcount Growth
        </span>
        <span style={{
          fontSize: '0.8rem', fontWeight: 700,
          padding: '0.2rem 0.6rem', borderRadius: '8px',
          background: growth >= 0 ? 'var(--success-bg)' : 'var(--danger-bg)',
          color: growth >= 0 ? 'var(--success)' : 'var(--danger)',
        }}>
          {growth >= 0 ? '+' : ''}{growth} last 6mo
        </span>
      </div>

      {/* Current headcount big number */}
      <div style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: "'Outfit', sans-serif", lineHeight: 1, marginBottom: '0.75rem' }}>
        {data[data.length - 1]?.count ?? 0}
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 400, marginLeft: '0.4rem' }}>
          employees
        </span>
      </div>

      {/* SVG Sparkline */}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '70px', overflow: 'visible' }}>
        <defs>
          <linearGradient id="hcGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--success)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--success)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Area fill */}
        <path d={areaD} fill="url(#hcGrad)" />
        {/* Line */}
        <path d={pathD} fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Data points */}
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="var(--success)" stroke="var(--bg-secondary)" strokeWidth="2" />
        ))}
      </svg>

      {/* Month labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem' }}>
        {data.map((d, i) => (
          <span key={i} style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            {formatMonth(d.month)}
          </span>
        ))}
      </div>
    </div>
  );
};

export default HeadcountTrend;
