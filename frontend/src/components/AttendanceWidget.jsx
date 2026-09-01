import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Clock, Play, Square, CheckCircle2, MapPin, Laptop, Shuffle } from 'lucide-react';

const AttendanceWidget = ({ onActionComplete }) => {
  const [status, setStatus] = useState({
    clockedIn: false,
    clockedOut: false,
    record: null,
  });
  const [time, setTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [activeHours, setActiveHours] = useState('00:00:00');
  const [workMode, setWorkMode] = useState('Office');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch status of today's attendance on load
  const fetchTodayStatus = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.get('/attendance/today-status');
      if (data.success) {
        setStatus({
          clockedIn: data.clockedIn,
          clockedOut: data.clockedOut,
          record: data.record,
        });
        if (data.record?.workMode) {
          setWorkMode(data.record.workMode);
        }
      }
    } catch (err) {
      setError('Failed to fetch attendance status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayStatus();
  }, []);

  // Update current time clock every second
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Update active hours counter if clocked in and not clocked out
  useEffect(() => {
    let interval;
    if (status.clockedIn && !status.clockedOut && status.record?.clockIn) {
      const calculateDuration = () => {
        const start = new Date(status.record.clockIn);
        const now = new Date();
        const diffMs = now - start;
        
        const secs = Math.floor((diffMs / 1000) % 60);
        const mins = Math.floor((diffMs / (1000 * 60)) % 60);
        const hours = Math.floor(diffMs / (1000 * 60 * 60));

        const format = (num) => String(num).padStart(2, '0');
        setActiveHours(`${format(hours)}:${format(mins)}:${format(secs)}`);
      };

      calculateDuration();
      interval = setInterval(calculateDuration, 1000);
    } else if (status.clockedOut && status.record?.totalHours) {
      setActiveHours(`${status.record.totalHours} hrs worked`);
    } else {
      setActiveHours('00:00:00');
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status]);

  const handleClockIn = async () => {
    try {
      setError('');
      setSuccess('');
      const data = await api.post('/attendance/clockin', { workMode });
      if (data.success) {
        setSuccess(data.message || 'Clocked in successfully');
        await fetchTodayStatus();
        if (onActionComplete) onActionComplete();
      }
    } catch (err) {
      setError(err.message || 'Clock-in failed');
    }
  };

  const handleClockOut = async () => {
    try {
      setError('');
      setSuccess('');
      const data = await api.post('/attendance/clockout', {});
      if (data.success) {
        setSuccess(data.message || 'Clocked out successfully');
        await fetchTodayStatus();
        if (onActionComplete) onActionComplete();
      }
    } catch (err) {
      setError(err.message || 'Clock-out failed');
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '340px' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading Console...</p>
      </div>
    );
  }

  // Choose icon based on workMode
  const getWorkModeIcon = (mode) => {
    switch (mode) {
      case 'Office': return <MapPin size={16} />;
      case 'WFH': return <Laptop size={16} />;
      case 'Hybrid': return <Shuffle size={16} />;
      default: return <MapPin size={16} />;
    }
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', minHeight: '380px', padding: '2rem 1.5rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      
      {/* Upper branding */}
      <div style={{ width: '100%' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-accent)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>
          Realtime Punch Portal
        </span>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Attendance Console</h3>
      </div>

      {/* Circle Dial Widget */}
      <div style={{
        width: '160px', height: '160px', borderRadius: '50%',
        border: '6px solid var(--border-color)',
        borderTopColor: status.clockedIn && !status.clockedOut ? 'var(--success)' : 'var(--primary-accent)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        margin: '1.5rem 0',
        background: 'rgba(255,255,255,0.02)',
        boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.05)',
        transition: 'border-color 0.3s',
      }}>
        {status.clockedIn && !status.clockedOut ? (
          <>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--success)', letterSpacing: '0.05em' }}>SESSION ACTIVE</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: "'Outfit', sans-serif", margin: '0.2rem 0' }}>
              {activeHours}
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              {getWorkModeIcon(workMode)} {workMode}
            </span>
          </>
        ) : (
          <>
            <div style={{ fontSize: '1.35rem', fontWeight: 800 }}>
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              {time.toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </span>
          </>
        )}
      </div>

      {/* Messages */}
      {error && <div className="alert alert-danger" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', margin: '0.5rem 0', width: '100%' }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', margin: '0.5rem 0', width: '100%' }}>{success}</div>}

      {/* Action Area */}
      <div style={{ width: '100%' }}>
        {!status.clockedIn && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
            {/* Work Mode Dropdown Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Working from:</span>
              <select
                className="form-control"
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value)}
                style={{ width: '120px', padding: '0.25rem 0.5rem', fontSize: '0.8rem', height: '30px' }}
              >
                <option value="Office">Office</option>
                <option value="WFH">WFH (Home)</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>

            <button onClick={handleClockIn} className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }}>
              <Play size={16} /> Punch In Session
            </button>
          </div>
        )}

        {status.clockedIn && !status.clockedOut && (
          <button onClick={handleClockOut} className="btn btn-danger" style={{ width: '100%', padding: '0.75rem' }}>
            <Square size={14} /> Punch Out Session
          </button>
        )}

        {status.clockedOut && (
          <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', margin: 0, padding: '0.75rem' }}>
            <CheckCircle2 size={18} /> Daily Work Period Closed
          </div>
        )}
      </div>

      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
        {status.clockedIn ? (
          <span>
            Punch In: <strong>{new Date(status.record?.clockIn).toLocaleTimeString()}</strong>
            {status.record?.status === 'Late' && (
              <span className="badge badge-late" style={{ marginLeft: '0.5rem', fontSize: '0.6rem', padding: '0.1rem 0.3rem' }}>LATE</span>
            )}
          </span>
        ) : (
          <span>Duty Hours: 09:30 AM - 06:30 PM (Mon-Sat)</span>
        )}
      </div>

    </div>
  );
};

export default AttendanceWidget;
