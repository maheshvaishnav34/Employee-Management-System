import React from 'react';

const StatCard = ({ title, value, icon: Icon, color = 'primary', subText }) => {
  // Color maps matching Kuber theme styles
  const colorMap = {
    primary: {
      accent: '#2563eb',
      bg: 'rgba(37, 99, 235, 0.1)',
      gradient: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
      shadow: '0 4px 20px rgba(37, 99, 235, 0.25)',
    },
    success: {
      accent: '#2ebd7f',
      bg: 'rgba(46, 189, 127, 0.1)',
      gradient: 'linear-gradient(135deg, #2ebd7f 0%, #157a4c 100%)',
      shadow: '0 4px 20px rgba(46, 189, 127, 0.25)',
    },
    warning: {
      accent: '#ffb119',
      bg: 'rgba(255, 177, 25, 0.1)',
      gradient: 'linear-gradient(135deg, #ffb119 0%, #e06c00 100%)',
      shadow: '0 4px 20px rgba(255, 177, 25, 0.25)',
    },
    danger: {
      accent: '#ff5b5b',
      bg: 'rgba(255, 91, 91, 0.1)',
      gradient: 'linear-gradient(135deg, #ff5b5b 0%, #c62828 100%)',
      shadow: '0 4px 20px rgba(255, 91, 91, 0.25)',
    },
    info: {
      accent: '#00bcd4',
      bg: 'rgba(0, 188, 212, 0.1)',
      gradient: 'linear-gradient(135deg, #00bcd4 0%, #00838f 100%)',
      shadow: '0 4px 20px rgba(0, 188, 212, 0.25)',
    },
  };

  const style = colorMap[color] || colorMap.primary;

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.25rem 1.4rem',
        borderRadius: '14px',
        border: '1px solid var(--border-color)',
        background: 'var(--bg-card)',
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      {/* Metrics Section */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {title}
        </span>
        <h3 style={{ fontSize: '1.65rem', margin: 0, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
          {value}
        </h3>
        
        {/* Subtle Accent Indicator */}
        <div style={{ width: '80%', height: '4px', backgroundColor: 'var(--border-color)', borderRadius: '6px', overflow: 'hidden', marginTop: '0.3rem' }}>
          <div
            style={{
              width: '65%',
              height: '100%',
              background: style.gradient,
              borderRadius: '6px',
            }}
          />
        </div>

        {subText && (
          <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
            {subText}
          </span>
        )}
      </div>

      {/* Clean square icon badge */}
      <div
        style={{
          width: '46px',
          height: '46px',
          borderRadius: '12px',
          background: style.bg,
          color: style.accent,
          border: `1px solid ${style.accent}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        {Icon && <Icon size={22} />}
      </div>
    </div>
  );
};

export default StatCard;
