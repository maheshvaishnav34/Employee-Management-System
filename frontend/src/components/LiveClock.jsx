import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

const LiveClock = () => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="card" style={{
      background: 'linear-gradient(135deg, #6777ef 0%, #3f51b5 100%)',
      border: 'none',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      gap: '0.35rem',
      padding: '1.25rem 1.5rem',
    }}>
      <div style={{
        fontSize: '2rem',
        fontWeight: 800,
        fontFamily: "'Outfit', monospace",
        letterSpacing: '2px',
        lineHeight: 1.1,
      }}>
        {timeStr}
      </div>
      <div style={{ fontSize: '0.78rem', opacity: 0.75, fontWeight: 500 }}>{dateStr}</div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.3rem',
        marginTop: '0.25rem',
        fontSize: '0.72rem', opacity: 0.7,
      }}>
        <Clock size={11} /> Live — Auto-updating
      </div>
    </div>
  );
};

export default LiveClock;
