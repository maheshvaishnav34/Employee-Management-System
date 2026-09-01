import React from 'react';

/* ─────── Reusable Skeleton Shimmer Components ─────── */

// A single shimmering block
export const SkeletonBlock = ({ width = '100%', height = '16px', borderRadius = '8px', style = {} }) => (
  <div
    className="skeleton-shimmer"
    style={{
      width,
      height,
      borderRadius,
      background: 'var(--skeleton-bg, linear-gradient(90deg, var(--border-color) 25%, rgba(255,255,255,0.15) 50%, var(--border-color) 75%))',
      backgroundSize: '200% 100%',
      animation: 'skeleton-shimmer 1.4s infinite linear',
      flexShrink: 0,
      ...style,
    }}
  />
);

// A circle (for avatars)
export const SkeletonCircle = ({ size = '40px', style = {} }) => (
  <SkeletonBlock width={size} height={size} borderRadius="50%" style={style} />
);

// Stat card skeleton
export const SkeletonStatCard = () => (
  <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem' }}>
    <SkeletonBlock width="44px" height="44px" borderRadius="12px" />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <SkeletonBlock width="60%" height="12px" />
      <SkeletonBlock width="40%" height="28px" />
      <SkeletonBlock width="80%" height="10px" />
    </div>
  </div>
);

// Table row skeleton
export const SkeletonTableRows = ({ rows = 5, cols = 6 }) => (
  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
    <tbody>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} style={{ padding: '1.1rem 1.5rem' }}>
              <SkeletonBlock height="14px" width={j === 0 ? '80px' : j === cols - 1 ? '60px' : '100%'} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);

// Card grid skeleton
export const SkeletonCardGrid = ({ count = 6, minWidth = '220px' }) => (
  <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}, 1fr))`, gap: '1.25rem' }}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <SkeletonCircle size="56px" style={{ margin: '0 auto' }} />
        <SkeletonBlock height="14px" width="70%" style={{ margin: '0 auto' }} />
        <SkeletonBlock height="11px" width="50%" style={{ margin: '0 auto' }} />
        <SkeletonBlock height="11px" width="90%" />
        <SkeletonBlock height="11px" width="75%" />
      </div>
    ))}
  </div>
);

// Dashboard skeleton
export const SkeletonDashboard = () => (
  <div>
    {/* Welcome banner */}
    <div className="card" style={{ padding: '1.75rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
      <SkeletonBlock width="56px" height="56px" borderRadius="16px" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <SkeletonBlock width="30%" height="18px" />
        <SkeletonBlock width="60%" height="12px" />
      </div>
    </div>

    {/* Stats grid */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
      {[0,1,2,3].map(i => <SkeletonStatCard key={i} />)}
    </div>

    {/* Chart area */}
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.3fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
      {[0,1,2].map(i => (
        <div key={i} className="card" style={{ padding: '1.5rem', height: '200px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <SkeletonBlock height="14px" width="50%" />
          <SkeletonBlock height="100%" borderRadius="8px" />
        </div>
      ))}
    </div>
  </div>
);

// Page header skeleton
export const SkeletonPageHeader = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
    <SkeletonBlock width="48px" height="48px" borderRadius="14px" />
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <SkeletonBlock width="180px" height="20px" />
      <SkeletonBlock width="280px" height="12px" />
    </div>
  </div>
);

// Profile card skeleton
export const SkeletonProfile = () => (
  <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', alignItems: 'start' }}>
    <div className="card" style={{ padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      <SkeletonCircle size="90px" />
      <SkeletonBlock width="70%" height="18px" />
      <SkeletonBlock width="50%" height="12px" />
      <SkeletonBlock width="80px" height="24px" borderRadius="99px" />
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {[0,1,2].map(i => <SkeletonBlock key={i} height="12px" width={`${60 + i * 10}%`} style={{ margin: '0 auto' }} />)}
      </div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {[0,1,2].map(i => (
        <div key={i} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <SkeletonBlock width="40%" height="16px" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {[0,1,2,3].map(j => (
              <div key={j} style={{ padding: '0.85rem 1rem', borderRadius: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', display: 'flex', gap: '0.85rem' }}>
                <SkeletonBlock width="34px" height="34px" borderRadius="9px" />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <SkeletonBlock height="10px" width="60%" />
                  <SkeletonBlock height="14px" width="80%" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default { SkeletonBlock, SkeletonCircle, SkeletonStatCard, SkeletonTableRows, SkeletonCardGrid, SkeletonDashboard, SkeletonPageHeader, SkeletonProfile };
