import React, { useState } from 'react';

// Helper to format currency
const formatCurrency = (val) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(val);
};

// Helper for compact axis formatting (e.g. $60k)
const formatCompactCurrency = (val) => {
  if (val >= 1000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val / 1000) + 'k';
  }
  return formatCurrency(val);
};

// Month formatting helpers
const formatMonth = (str) => {
  const [year, month] = str.split('-');
  const date = new Date(year, parseInt(month) - 1, 1);
  return date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
};

const formatMonthFull = (str) => {
  const [year, month] = str.split('-');
  const date = new Date(year, parseInt(month) - 1, 1);
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};

// Cubic Bezier curve spline generator
const getBezierPath = (points) => {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    
    // Control points at 1/3 and 2/3 distance
    const cp1x = p0.x + (p1.x - p0.x) / 3;
    const cp1y = p0.y;
    const cp2x = p0.x + 2 * (p1.x - p0.x) / 3;
    const cp2y = p1.y;
    
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
  }
  return path;
};

// 1. Spline chart displaying Monthly Payroll expense trends
export const PayrollChart = ({ data = [] }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="chart-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <span className="chart-title">Payroll Monthly Expenses</span>
        <p style={{ color: 'var(--text-secondary)' }}>No payroll trend data available</p>
      </div>
    );
  }

  // Calculate stats values
  const latest = data[data.length - 1];
  const latestAmount = latest ? latest.amount : 0;
  const prevAmount = data.length >= 2 ? data[data.length - 2].amount : 0;
  const percentChange = prevAmount > 0 ? ((latestAmount - prevAmount) / prevAmount) * 100 : 0;
  const averageAmount = data.reduce((sum, item) => sum + item.amount, 0) / data.length;
  const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);

  // SVG dimensions
  const width = 500;
  const height = 200;
  const paddingLeft = 50;
  const paddingRight = 15;
  const paddingTop = 15;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Scale calculations
  const maxVal = Math.max(...data.map((d) => d.amount), 1000);
  const maxY = maxVal * 1.15; // 15% padding on top
  const minY = 0;

  // Convert data points to SVG coordinate space
  const pts = data.map((item, index) => {
    const x = paddingLeft + (index / (data.length - 1 || 1)) * chartWidth;
    const y = height - paddingBottom - ((item.amount - minY) / (maxY - minY)) * chartHeight;
    return { x, y, ...item };
  });

  const linePath = getBezierPath(pts);
  const areaPath = pts.length > 0
    ? `${linePath} L ${pts[pts.length - 1].x} ${height - paddingBottom} L ${pts[0].x} ${height - paddingBottom} Z`
    : '';

  // Generate 4 grid lines
  const gridLines = [];
  const tickCount = 3;
  for (let i = 0; i <= tickCount; i++) {
    const ratio = i / tickCount;
    const value = minY + ratio * (maxY - minY);
    const y = height - paddingBottom - ratio * chartHeight;
    gridLines.push({ y, value });
  }

  // Find active hovered point
  const hoveredPoint = hoveredIndex !== null ? pts[hoveredIndex] : null;

  const handleMouseMove = (e) => {
    const svgRect = e.currentTarget.getBoundingClientRect();
    const mouseX = ((e.clientX - svgRect.left) / svgRect.width) * width;
    
    let closestIndex = 0;
    let minDiff = Infinity;
    pts.forEach((p, idx) => {
      const diff = Math.abs(p.x - mouseX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = idx;
      }
    });
    setHoveredIndex(closestIndex);
  };

  return (
    <div className="chart-container" style={{ position: 'relative', height: '100%', minHeight: '350px' }}>
      <style>{`
        @keyframes drawPath {
          to { stroke-dashoffset: 0; }
        }
        @keyframes fadeArea {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes growDot {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-line {
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          animation: drawPath 1.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-area {
          opacity: 0;
          animation: fadeArea 1.2s ease-out 0.2s forwards;
        }
        .animate-dot {
          transform-origin: center;
          animation: growDot 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
      `}</style>

      {/* Metrics Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <span className="chart-title" style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Monthly Payroll Expenditure
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.15rem' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif' }}>
              {formatCurrency(latestAmount)}
            </span>
            {data.length >= 2 && (
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '0.15rem 0.45rem',
                borderRadius: '6px',
                background: percentChange >= 0 ? 'var(--success-bg)' : 'var(--danger-bg)',
                color: percentChange >= 0 ? 'var(--success)' : 'var(--danger)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.15rem'
              }}>
                {percentChange >= 0 ? '▲ +' : '▼ '}{percentChange.toFixed(1)}% MoM
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1.25rem' }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Average / Mo
            </span>
            <span style={{ fontSize: '1rem', fontWeight: 700 }}>
              {formatCurrency(averageAmount)}
            </span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total 6-Mo
            </span>
            <span style={{ fontSize: '1rem', fontWeight: 700 }}>
              {formatCurrency(totalAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* SVG Sparkline / Area Chart */}
      <div style={{ flex: 1, position: 'relative', minHeight: '180px' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            <linearGradient id="payrollGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary-accent)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--primary-accent)" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Gridlines & Y axis Labels */}
          {gridLines.map((line, idx) => (
            <g key={idx}>
              <line
                x1={paddingLeft}
                y1={line.y}
                x2={width - paddingRight}
                y2={line.y}
                stroke="var(--border-color)"
                strokeWidth="1"
                strokeDasharray="4 4"
                opacity={0.4}
              />
              <text
                x={paddingLeft - 8}
                y={line.y + 3}
                textAnchor="end"
                fontSize="9"
                fill="var(--text-secondary)"
                fontWeight="600"
              >
                {formatCompactCurrency(line.value)}
              </text>
            </g>
          ))}

          {/* Area Fill */}
          {areaPath && (
            <path
              d={areaPath}
              fill="url(#payrollGrad)"
              className="animate-area"
            />
          )}

          {/* Line Path */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="var(--primary-accent)"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-line"
            />
          )}

          {/* Hover Indicators (dashed guideline + cursor ring) */}
          {hoveredPoint && (
            <g>
              <line
                x1={hoveredPoint.x}
                y1={paddingTop}
                x2={hoveredPoint.x}
                y2={height - paddingBottom}
                stroke="var(--primary-accent)"
                strokeWidth="1.2"
                strokeDasharray="3 3"
                opacity="0.6"
              />
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y}
                r="6.5"
                fill="none"
                stroke="var(--primary-accent)"
                strokeWidth="2.5"
                opacity="0.4"
              />
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y}
                r="3.5"
                fill="var(--primary-accent)"
                stroke="var(--bg-secondary)"
                strokeWidth="1.5"
              />
            </g>
          )}

          {/* Data dots (animated entry) */}
          {pts.map((p, idx) => (
            <circle
              key={idx}
              cx={p.x}
              cy={p.y}
              r={hoveredIndex === idx ? "5" : "4"}
              className="animate-dot"
              style={{
                fill: hoveredIndex === idx ? 'var(--primary-accent)' : 'var(--bg-secondary)',
                stroke: 'var(--primary-accent)',
                strokeWidth: hoveredIndex === idx ? '3' : '2.5',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                animationDelay: `${idx * 100}ms`
              }}
            />
          ))}

          {/* X axis line */}
          <line
            x1={paddingLeft}
            y1={height - paddingBottom}
            x2={width - paddingRight}
            y2={height - paddingBottom}
            stroke="var(--border-color)"
            strokeWidth="1"
            opacity={0.8}
          />

          {/* X axis labels */}
          {pts.map((p, idx) => (
            <text
              key={idx}
              x={p.x}
              y={height - paddingBottom + 16}
              textAnchor="middle"
              fontSize="9.5"
              fill="var(--text-secondary)"
              fontWeight="600"
            >
              {formatMonth(p.month)}
            </text>
          ))}
        </svg>

        {/* Floating Tooltip HTML element overlay */}
        {hoveredPoint && (
          <div
            style={{
              position: 'absolute',
              left: `${(hoveredPoint.x / width) * 100}%`,
              top: `${(hoveredPoint.y / height) * 100 - 10}%`,
              transform: 'translate(-50%, -100%)',
              backgroundColor: 'var(--bg-sidebar)',
              color: '#ffffff',
              padding: '0.55rem 0.8rem',
              borderRadius: '8px',
              fontSize: '0.8rem',
              boxShadow: 'var(--shadow-lg)',
              pointerEvents: 'none',
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.15rem',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              minWidth: '120px',
              transition: 'left 0.12s cubic-bezier(0.25, 1, 0.5, 1), top 0.12s cubic-bezier(0.25, 1, 0.5, 1)',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '0.7rem', color: 'var(--text-sidebar)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {formatMonthFull(hoveredPoint.month)}
            </div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#ffffff' }}>
              {formatCurrency(hoveredPoint.amount)}
            </div>
            {hoveredIndex > 0 && (
              <div style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: (hoveredPoint.amount >= pts[hoveredIndex - 1].amount) ? 'var(--success)' : 'var(--danger)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.15rem',
                marginTop: '0.1rem'
              }}>
                {hoveredPoint.amount >= pts[hoveredIndex - 1].amount ? '▲' : '▼'}{' '}
                {Math.abs(((hoveredPoint.amount - pts[hoveredIndex - 1].amount) / pts[hoveredIndex - 1].amount) * 100).toFixed(1)}% vs prev
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};


// 2. Headcount distribution per department
export const DepartmentChart = ({ data = [] }) => {
  if (!data || data.length === 0) {
    return (
      <div className="chart-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <span className="chart-title">Department Employee Share</span>
        <p style={{ color: 'var(--text-secondary)' }}>No department data available</p>
      </div>
    );
  }

  const totalEmployees = data.reduce((sum, item) => sum + item.count, 0);

  // Curated color schemes for departments
  const colors = [
    'var(--primary-accent)',
    'var(--success)',
    'var(--warning)',
    'var(--info)',
    'var(--danger)',
  ];

  return (
    <div className="chart-container" style={{ height: '100%' }}>
      <span className="chart-title">Department Share ({totalEmployees} Active)</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', justifyContent: 'center', height: '100%' }}>
        {data.map((item, index) => {
          const percentage = totalEmployees > 0 ? Math.round((item.count / totalEmployees) * 100) : 0;
          const barColor = colors[index % colors.length];

          return (
            <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 600 }}>{item.name}</span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  <strong>{item.count}</strong> employees ({percentage}%)
                </span>
              </div>
              <div style={{ width: '100%', height: '10px', backgroundColor: 'var(--bg-primary)', borderRadius: '99px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${percentage}%`,
                    height: '100%',
                    background: barColor,
                    borderRadius: '99px',
                    transition: 'width 0.8s ease-out',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
