import React from 'react';

const StatCard = ({ title, value, icon: Icon, color = 'primary', subText }) => {
  // Color maps matching Kuber theme styles
  const colorMap = {
    primary: {
      accent: '#6777ef',
      bg: 'rgba(103, 119, 239, 0.1)',
      gradient: 'linear-gradient(135deg, #6777ef 0%, #3f51b5 100%)',
      shadow: '0 4px 20px rgba(103, 119, 239, 0.25)',
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
    <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem' }}>
      
      {/* Metrics Section */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <span className="stat-card-title" style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
          {title}
        </span>
        <h3 className="stat-card-value" style={{ fontSize: '1.75rem', margin: 0, fontWeight: 800 }}>
          {value}
        </h3>
        
        {/* Progress bar matching Kuber dashboard widgets */}
        <div style={{ width: '85%', height: '5px', backgroundColor: 'var(--border-color)', borderRadius: '9px', overflow: 'hidden', marginTop: '0.25rem' }}>
          <div
            style={{
              width: '65%',
              height: '100%',
              background: style.gradient,
              borderRadius: '9px',
            }}
          />
        </div>

        {subText && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
            {subText}
          </span>
        )}
      </div>

      {/* Floating circular icon badge */}
      <div
        style={{
          width: '54px',
          height: '54px',
          borderRadius: '50%',
          background: style.gradient,
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: style.shadow,
        }}
      >
        {Icon && <Icon size={24} />}
      </div>
    </div>
  );
};

export default StatCard;
