import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  Calendar, Clock, Plus, Trash2, AlertCircle, RefreshCw, X, User
} from 'lucide-react';
import { SkeletonBlock } from '../components/Skeleton';

const SHIFT_TYPES = {
  Morning: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6' },
  Evening: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
  Night: { bg: 'rgba(99,102,241,0.1)', color: '#6366f1' },
  'On-Call': { bg: 'rgba(236,72,153,0.1)', color: '#ec4899' },
};

const Shifts = () => {
  const { user } = useAuth();
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    employee: '', date: '', startTime: '09:00', endTime: '17:00', type: 'Morning', notes: ''
  });

  const isHRPlus = ['admin', 'hr'].includes(user?.role);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const shiftRes = await api.get('/shifts');
      if (shiftRes.success) setShifts(shiftRes.shifts);

      if (isHRPlus) {
        const empRes = await api.get('/employees');
        if (empRes.success) setEmployees(empRes.employees);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateShift = async (e) => {
    e.preventDefault();
    if (!formData.employee || !formData.date || !formData.startTime || !formData.endTime) {
      setFormError('All fields marked with * are required');
      return;
    }
    try {
      setFormError('');
      const res = await api.post('/shifts', formData);
      if (res.success) {
        setModalOpen(false);
        setFormData({ employee: '', date: '', startTime: '09:00', endTime: '17:00', type: 'Morning', notes: '' });
        fetchData();
      }
    } catch (e) {
      setFormError(e.message);
    }
  };

  const handleDeleteShift = async (id) => {
    if (!window.confirm('Are you sure you want to remove this shift assignment?')) return;
    try {
      await api.delete(`/shifts/${id}`);
      fetchData();
    } catch (e) {
      alert(e.message);
    }
  };

  // Group shifts by date for cleaner timeline display
  const groupShiftsByDate = () => {
    const groups = {};
    shifts.forEach(shift => {
      const d = new Date(shift.date).toDateString();
      if (!groups[d]) groups[d] = [];
      groups[d].push(shift);
    });
    return groups;
  };

  const grouped = groupShiftsByDate();
  const sortedDates = Object.keys(grouped).sort((a, b) => new Date(a) - new Date(b));

  return (
    <div className="page-container page-enter">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '14px',
          background: 'linear-gradient(135deg, #f59e0b 0%, #fcd34d 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 15px rgba(245,158,11,0.3)',
        }}>
          <Calendar size={22} color="white" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Shift Planner</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            {isHRPlus ? 'Schedule and monitor employee shifts and rosters' : 'Check your scheduled working hours and shifts'}
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem' }}>
          <button onClick={fetchData} className="btn btn-secondary btn-icon" title="Reload schedule">
            <RefreshCw size={16} />
          </button>
          {isHRPlus && (
            <button onClick={() => setModalOpen(true)} className="btn btn-primary" style={{ background: 'var(--primary-gradient)' }}>
              <Plus size={18} /> Schedule Shift
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}><AlertCircle size={16} /> {error}</div>}

      {/* Roster Timeline Display */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {[0, 1].map(i => (
            <div key={i} className="card" style={{ padding: '1.5rem' }}>
              <SkeletonBlock height="20px" width="25%" style={{ marginBottom: '1rem' }} />
              <div style={{ display: 'flex', gap: '1rem' }}>
                <SkeletonBlock width="45px" height="45px" borderRadius="10px" />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <SkeletonBlock height="15px" width="50%" />
                  <SkeletonBlock height="10px" width="80%" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : sortedDates.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
          <Calendar size={48} style={{ color: 'var(--text-secondary)', marginBottom: '1rem', opacity: 0.5 }} />
          <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>No shifts scheduled on the planner.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {sortedDates.map(dateStr => {
            const dayShifts = grouped[dateStr];
            return (
              <div key={dateStr} className="card" style={{ padding: '1.5rem 1.75rem' }}>
                <div style={{
                  fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-sidebar-active)',
                  marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem',
                  display: 'flex', justifyContent: 'space-between'
                }}>
                  <span>{dateStr}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{dayShifts.length} Shift{dayShifts.length > 1 ? 's' : ''}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }} className="auto-fit-grid">
                  {dayShifts.map(shift => {
                    const typeStyle = SHIFT_TYPES[shift.type] || { bg: 'rgba(0,0,0,0.03)', color: '#64748b' };
                    return (
                      <div key={shift._id} style={{
                        padding: '1.25rem', border: '1px solid var(--border-color)', borderRadius: '12px',
                        display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative'
                      }}>
                        {isHRPlus && (
                          <button
                            onClick={() => handleDeleteShift(shift._id)}
                            style={{
                              position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none',
                              color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-gradient)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                            fontSize: '0.75rem', fontWeight: 700
                          }}>
                            {shift.employee ? shift.employee.firstName[0] + shift.employee.lastName[0] : 'U'}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                              {shift.employee ? `${shift.employee.firstName} ${shift.employee.lastName}` : 'Unknown'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              {shift.employee?.designation || 'Staff'}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={13} style={{ color: 'var(--primary-accent)' }} /> {shift.startTime} - {shift.endTime}
                          </span>
                          <span style={{
                            fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '6px',
                            background: typeStyle.bg, color: typeStyle.color
                          }}>
                            {shift.type}
                          </span>
                        </div>
                        {shift.notes && (
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0 }}>
                            Note: {shift.notes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assign Shift Modal */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Schedule Employee Shift</h3>
              <button className="modal-close-btn" onClick={() => setModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateShift}>
              <div className="modal-body">
                {formError && <div className="alert alert-danger" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}><AlertCircle size={16} /> {formError}</div>}
                <div className="form-group">
                  <label>Assign To Employee *</label>
                  <select className="form-control" value={formData.employee} onChange={e => setFormData({ ...formData, employee: e.target.value })} required>
                    <option value="">Select Employee</option>
                    {employees.map(emp => (
                      <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName} ({emp.employeeId})</option>
                    ))}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Shift Date *</label>
                    <input type="date" className="form-control"
                      value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Shift Category</label>
                    <select className="form-control" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                      {['Morning', 'Evening', 'Night', 'On-Call'].map(type => <option key={type}>{type}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Start Time (HH:MM) *</label>
                    <input type="time" className="form-control"
                      value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>End Time (HH:MM) *</label>
                    <input type="time" className="form-control"
                      value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })} required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Shift Notes / Instructions</label>
                  <textarea rows="3" className="form-control" placeholder="Specific duties or notes for this shift..." style={{ resize: 'none' }}
                    value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Schedule Shift</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shifts;
