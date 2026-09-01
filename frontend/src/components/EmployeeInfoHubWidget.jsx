import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { CalendarClock, Laptop, Clock, ShieldCheck, Loader } from 'lucide-react';

const EmployeeInfoHubWidget = () => {
  const [activeTab, setActiveTab] = useState('shifts'); // 'shifts' or 'assets'
  const [shifts, setShifts] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const shiftRes = await api.get('/shifts');
      if (shiftRes.success) {
        // Filter shifts for today and upcoming
        const todayStr = new Date().toDateString();
        const upcoming = shiftRes.shifts.filter(s => {
          const shiftDate = new Date(s.date);
          return shiftDate >= new Date(new Date().setHours(0,0,0,0));
        });
        setShifts(upcoming.slice(0, 5));
      }
      const assetRes = await api.get('/assets');
      if (assetRes.success) {
        setAssets(assetRes.assets);
      }
    } catch (e) {
      console.error('Error fetching employee hub widget data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: '260px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
          <CalendarClock size={18} style={{ color: 'var(--primary-accent)' }} />
          My Workspace Info
        </span>
        
        {/* Tab switch */}
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.03)', borderRadius: '8px', padding: '2px' }}>
          <button
            onClick={() => setActiveTab('shifts')}
            style={{
              border: 'none', background: activeTab === 'shifts' ? 'var(--bg-secondary)' : 'transparent',
              color: activeTab === 'shifts' ? 'var(--primary-accent)' : 'var(--text-secondary)',
              fontSize: '0.74rem', fontWeight: 700, padding: '0.25rem 0.6rem', borderRadius: '6px', cursor: 'pointer',
              boxShadow: activeTab === 'shifts' ? 'var(--shadow-sm)' : 'none', transition: 'all 0.2s'
            }}
          >
            My Shifts ({shifts.length})
          </button>
          <button
            onClick={() => setActiveTab('assets')}
            style={{
              border: 'none', background: activeTab === 'assets' ? 'var(--bg-secondary)' : 'transparent',
              color: activeTab === 'assets' ? 'var(--primary-accent)' : 'var(--text-secondary)',
              fontSize: '0.74rem', fontWeight: 700, padding: '0.25rem 0.6rem', borderRadius: '6px', cursor: 'pointer',
              boxShadow: activeTab === 'assets' ? 'var(--shadow-sm)' : 'none', transition: 'all 0.2s'
            }}
          >
            My Hardware ({assets.length})
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ margin: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <Loader size={22} style={{ color: 'var(--primary-accent)', animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Loading schedule details...</span>
        </div>
      ) : activeTab === 'shifts' ? (
        /* Shifts Roster Tab */
        shifts.length === 0 ? (
          <div style={{ margin: 'auto', textAlign: 'center', padding: '1rem' }}>
            <CalendarClock size={28} style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', opacity: 0.5, display: 'block', margin: '0 auto 0.5rem' }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No upcoming shifts scheduled.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', overflowY: 'auto', maxHeight: '180px' }}>
            {shifts.map(shift => (
              <div key={shift._id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.55rem 0.8rem', background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)', borderRadius: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={14} style={{ color: 'var(--primary-accent)' }} />
                  <div>
                    <strong style={{ fontSize: '0.82rem', display: 'block' }}>
                      {new Date(shift.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                    </strong>
                    <span style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                      {shift.startTime} - {shift.endTime}
                    </span>
                  </div>
                </div>
                <span style={{
                  fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '5px',
                  background: shift.type === 'Morning' ? 'rgba(59,130,246,0.1)' : 'rgba(245,158,11,0.1)',
                  color: shift.type === 'Morning' ? '#3b82f6' : '#f59e0b'
                }}>
                  {shift.type}
                </span>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Assets Tab */
        assets.length === 0 ? (
          <div style={{ margin: 'auto', textAlign: 'center', padding: '1rem' }}>
            <Laptop size={28} style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', opacity: 0.5, display: 'block', margin: '0 auto 0.5rem' }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No company hardware assigned to you.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', overflowY: 'auto', maxHeight: '180px' }}>
            {assets.map(asset => (
              <div key={asset._id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.55rem 0.8rem', background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)', borderRadius: '10px'
              }}>
                <div>
                  <strong style={{ fontSize: '0.82rem', display: 'block' }}>{asset.name}</strong>
                  <span style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                    S/N: {asset.serialNumber} · Condition: {asset.condition}
                  </span>
                </div>
                <span style={{
                  fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '5px',
                  background: 'rgba(16,185,129,0.1)', color: '#10b981', display: 'flex', alignItems: 'center', gap: '2px'
                }}>
                  <ShieldCheck size={12} /> {asset.category}
                </span>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};

export default EmployeeInfoHubWidget;
