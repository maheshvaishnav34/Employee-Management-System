import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  Calendar, Clock, Plus, Trash2, AlertCircle, RefreshCw, X, User,
  Search, Filter, Sun, Moon, Sunset, PhoneCall, CheckCircle2,
  CalendarDays, Users, Sparkles, Building2, Briefcase
} from 'lucide-react';
import { SkeletonBlock } from '../components/Skeleton';

const SHIFT_TYPES = {
  Morning: {
    bg: 'rgba(37, 99, 235, 0.08)',
    border: 'rgba(37, 99, 235, 0.25)',
    color: '#2563eb',
    icon: Sun,
    badge: 'Morning Shift',
    timing: '09:00 - 17:00'
  },
  Evening: {
    bg: 'rgba(245, 158, 11, 0.08)',
    border: 'rgba(245, 158, 11, 0.25)',
    color: '#d97706',
    icon: Sunset,
    badge: 'Evening Shift',
    timing: '13:00 - 21:00'
  },
  Night: {
    bg: 'rgba(99, 102, 241, 0.08)',
    border: 'rgba(99, 102, 241, 0.25)',
    color: '#4f46e5',
    icon: Moon,
    badge: 'Night Shift',
    timing: '22:00 - 06:00'
  },
  'On-Call': {
    bg: 'rgba(236, 72, 153, 0.08)',
    border: 'rgba(236, 72, 153, 0.25)',
    color: '#db2777',
    icon: PhoneCall,
    badge: 'On-Call',
    timing: 'Flexible / Escalation'
  },
};

const PRESETS = [
  { label: 'Morning Standard', type: 'Morning', start: '09:00', end: '17:00', notes: 'Core sprint and operational hours' },
  { label: 'Early Roster', type: 'Morning', start: '08:00', end: '16:00', notes: 'Early client coverage and standups' },
  { label: 'Evening Shift', type: 'Evening', start: '13:00', end: '21:00', notes: 'APAC/EMEA handoff and support' },
  { label: 'Overnight 24/7', type: 'Night', start: '22:00', end: '06:00', notes: 'Critical infra monitoring and alerts' },
  { label: 'On-Call Rotation', type: 'On-Call', start: '10:00', end: '18:00', notes: 'Tier-2 technical escalation standby' },
];

const Shifts = () => {
  const { user } = useAuth();
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtering states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [viewTab, setViewTab] = useState('timeline'); // 'timeline', 'today', 'my'
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    employee: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '17:00',
    type: 'Morning',
    notes: 'Core development and team support hours'
  });

  const isHRPlus = ['admin', 'hr', 'manager'].includes(user?.role);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const shiftRes = await api.get('/shifts');
      if (shiftRes && shiftRes.success) {
        setShifts(shiftRes.shifts || []);
      }

      if (isHRPlus) {
        const empRes = await api.get('/employees');
        if (empRes && empRes.success) {
          setEmployees(empRes.employees || []);
        }
      }
    } catch (e) {
      setError(e.message || 'Failed to load shift rosters');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApplyPreset = (preset) => {
    setFormData(prev => ({
      ...prev,
      type: preset.type,
      startTime: preset.start,
      endTime: preset.end,
      notes: preset.notes
    }));
  };

  const handleCreateShift = async (e) => {
    e.preventDefault();
    if (!formData.employee || !formData.date || !formData.startTime || !formData.endTime) {
      setFormError('Please select an employee, date, and valid shift hours.');
      return;
    }
    try {
      setSubmitting(true);
      setFormError('');
      const res = await api.post('/shifts', formData);
      if (res && res.success) {
        setModalOpen(false);
        setFormData({
          employee: '',
          date: new Date().toISOString().split('T')[0],
          startTime: '09:00',
          endTime: '17:00',
          type: 'Morning',
          notes: ''
        });
        fetchData();
      } else {
        setFormError(res?.message || 'Failed to schedule shift');
      }
    } catch (e) {
      setFormError(e.message || 'An error occurred while saving the shift');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteShift = async (id) => {
    if (!window.confirm('Are you sure you want to remove this shift assignment?')) return;
    try {
      await api.delete(`/shifts/${id}`);
      fetchData();
    } catch (e) {
      alert(e.message || 'Failed to delete shift');
    }
  };

  // Filtered shifts calculation
  const filteredShifts = useMemo(() => {
    return shifts.filter(shift => {
      const emp = shift.employee || {};
      const empName = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
      const empId = (emp.employeeId || '').toLowerCase();
      const empDesig = (emp.designation || '').toLowerCase();
      const matchesSearch = !searchTerm || 
        empName.includes(searchTerm.toLowerCase()) || 
        empId.includes(searchTerm.toLowerCase()) ||
        empDesig.includes(searchTerm.toLowerCase());

      const matchesType = selectedType === 'All' || shift.type === selectedType;

      if (viewTab === 'today') {
        const todayStr = new Date().toDateString();
        const shiftStr = new Date(shift.date).toDateString();
        return matchesSearch && matchesType && (shiftStr === todayStr);
      }

      if (viewTab === 'my') {
        const isMe = emp.email === user?.email || (user?.employee && emp._id === user.employee);
        return matchesSearch && matchesType && isMe;
      }

      return matchesSearch && matchesType;
    });
  }, [shifts, searchTerm, selectedType, viewTab, user]);

  // Group by date
  const groupedShifts = useMemo(() => {
    const groups = {};
    filteredShifts.forEach(shift => {
      const d = new Date(shift.date).toDateString();
      if (!groups[d]) groups[d] = [];
      groups[d].push(shift);
    });
    return groups;
  }, [filteredShifts]);

  const sortedDates = useMemo(() => {
    return Object.keys(groupedShifts).sort((a, b) => new Date(a) - new Date(b));
  }, [groupedShifts]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: shifts.length,
      morning: shifts.filter(s => s.type === 'Morning').length,
      evening: shifts.filter(s => s.type === 'Evening').length,
      night: shifts.filter(s => s.type === 'Night').length,
      onCall: shifts.filter(s => s.type === 'On-Call').length,
    };
  }, [shifts]);

  const todayDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
  });

  return (
    <div className="page-container page-enter" style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '3rem' }}>
      
      {/* ── Header ── */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        marginBottom: '1.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 6px 20px rgba(37, 99, 235, 0.3)',
            color: '#ffffff'
          }}>
            <CalendarDays size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                Shift Planner & Rosters
              </h1>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '0.2rem 0.6rem',
                borderRadius: '999px',
                background: 'rgba(37, 99, 235, 0.1)',
                color: '#2563eb',
                border: '1px solid rgba(37, 99, 235, 0.2)'
              }}>
                Live Enterprise Roster
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
              {isHRPlus
                ? 'Manage work schedules, allocate shift categories, and track workforce rosters'
                : 'View your scheduled shifts, duty timings, and rotational assignments'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={fetchData}
            className="btn btn-secondary"
            title="Refresh Roster"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', height: '40px' }}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            <span className="hide-mobile">Refresh</span>
          </button>

          {isHRPlus && (
            <button
              onClick={() => setModalOpen(true)}
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                height: '40px',
                background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
                fontWeight: 600,
              }}
            >
              <Plus size={18} />
              <span>Schedule Shift</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Stat Metric Cards ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '1rem',
        marginBottom: '1.75rem'
      }}>
        {/* Total Scheduled */}
        <div className="card" style={{
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          borderLeft: '4px solid #2563eb',
          borderRadius: '14px',
          boxShadow: 'var(--card-shadow)'
        }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Calendar size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Shifts
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
              {stats.total}
            </div>
          </div>
        </div>

        {/* Morning Roster */}
        <div className="card" style={{
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          borderLeft: '4px solid #0284c7',
          borderRadius: '14px',
          boxShadow: 'var(--card-shadow)'
        }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Sun size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Morning Shifts
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0284c7', lineHeight: 1.1 }}>
              {stats.morning}
            </div>
          </div>
        </div>

        {/* Evening Roster */}
        <div className="card" style={{
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          borderLeft: '4px solid #d97706',
          borderRadius: '14px',
          boxShadow: 'var(--card-shadow)'
        }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'rgba(217, 119, 6, 0.1)', color: '#d97706',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Sunset size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Evening Shifts
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#d97706', lineHeight: 1.1 }}>
              {stats.evening}
            </div>
          </div>
        </div>

        {/* Night & On-Call */}
        <div className="card" style={{
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          borderLeft: '4px solid #6366f1',
          borderRadius: '14px',
          boxShadow: 'var(--card-shadow)'
        }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Moon size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Night & On-Call
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#6366f1', lineHeight: 1.1 }}>
              {stats.night + stats.onCall}
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter & Search Bar ── */}
      <div className="card" style={{
        padding: '1rem 1.25rem',
        marginBottom: '1.75rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        borderRadius: '14px',
        boxShadow: 'var(--card-shadow)'
      }}>
        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-primary)',
          padding: '4px',
          borderRadius: '10px',
          border: '1px solid var(--border-color)',
          gap: '4px'
        }}>
          <button
            type="button"
            onClick={() => setViewTab('timeline')}
            style={{
              padding: '0.45rem 0.9rem',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: viewTab === 'timeline' ? '#2563eb' : 'transparent',
              color: viewTab === 'timeline' ? '#ffffff' : 'var(--text-secondary)',
              transition: 'all 0.15s ease'
            }}
          >
            All Rosters
          </button>
          <button
            type="button"
            onClick={() => setViewTab('today')}
            style={{
              padding: '0.45rem 0.9rem',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: viewTab === 'today' ? '#2563eb' : 'transparent',
              color: viewTab === 'today' ? '#ffffff' : 'var(--text-secondary)',
              transition: 'all 0.15s ease'
            }}
          >
            Today's Schedule
          </button>
          <button
            type="button"
            onClick={() => setViewTab('my')}
            style={{
              padding: '0.45rem 0.9rem',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: viewTab === 'my' ? '#2563eb' : 'transparent',
              color: viewTab === 'my' ? '#ffffff' : 'var(--text-secondary)',
              transition: 'all 0.15s ease'
            }}
          >
            My Assigned Shifts
          </button>
        </div>

        {/* Search & Category Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1 1 320px', maxWidth: '520px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '0 0.85rem',
            height: '38px',
            flex: 1
          }}>
            <Search size={16} style={{ color: 'var(--text-secondary)', marginRight: '0.5rem', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search employee, ID, role..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                width: '100%',
                fontSize: '0.85rem',
                color: 'var(--text-primary)'
              }}
            />
            {searchTerm && (
              <X size={15} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => setSearchTerm('')} />
            )}
          </div>

          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            style={{
              height: '38px',
              padding: '0 0.75rem',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <option value="All">All Categories</option>
            <option value="Morning">Morning</option>
            <option value="Evening">Evening</option>
            <option value="Night">Night</option>
            <option value="On-Call">On-Call</option>
          </select>
        </div>
      </div>

      {/* ── Main Schedule Grid ── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {[0, 1, 2].map(i => (
            <div key={i} className="card" style={{ padding: '1.75rem', borderRadius: '16px' }}>
              <SkeletonBlock height="22px" width="30%" style={{ marginBottom: '1.25rem' }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {[0, 1].map(j => (
                  <SkeletonBlock key={j} height="110px" borderRadius="14px" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : sortedDates.length === 0 ? (
        <div className="card" style={{
          textAlign: 'center',
          padding: '4.5rem 2rem',
          borderRadius: '16px',
          boxShadow: 'var(--card-shadow)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(37, 99, 235, 0.1)',
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto'
          }}>
            <CalendarDays size={32} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
            No Shifts Found
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto 1.5rem auto' }}>
            {searchTerm || selectedType !== 'All'
              ? 'No shift rosters match your current filters. Try resetting the search or category.'
              : 'There are no active shifts scheduled for the selected view.'}
          </p>
          {isHRPlus && (
            <button
              onClick={() => setModalOpen(true)}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Plus size={16} /> Schedule a Shift Now
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {sortedDates.map(dateStr => {
            const dayShifts = groupedShifts[dateStr] || [];
            const isToday = new Date(dateStr).toDateString() === new Date().toDateString();

            return (
              <div key={dateStr} className="card" style={{
                padding: '1.5rem 1.75rem',
                borderRadius: '16px',
                boxShadow: 'var(--card-shadow)',
                border: isToday ? '1.5px solid rgba(37, 99, 235, 0.35)' : '1px solid var(--border-color)',
                backgroundColor: isToday ? 'rgba(37, 99, 235, 0.015)' : 'var(--bg-card)'
              }}>
                {/* Date Header */}
                <div className="shifts-date-header" style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: '0.85rem',
                  marginBottom: '1.25rem',
                  borderBottom: '1px solid var(--border-color)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: isToday ? '#2563eb' : 'var(--bg-primary)',
                      color: isToday ? '#ffffff' : 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      border: isToday ? 'none' : '1px solid var(--border-color)'
                    }}>
                      {new Date(dateStr).getDate()}
                    </div>
                    <div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>{dateStr}</span>
                        {isToday && (
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '999px',
                            background: 'rgba(37, 99, 235, 0.15)',
                            color: '#2563eb'
                          }}>
                            TODAY'S ROSTER
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {dayShifts.length} personnel scheduled for duty
                      </div>
                    </div>
                  </div>

                  <span style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    background: 'var(--bg-primary)',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)'
                  }}>
                    {dayShifts.length} Active {dayShifts.length > 1 ? 'Shifts' : 'Shift'}
                  </span>
                </div>

                {/* Shift Grid */}
                <div className="shifts-day-grid" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '1.15rem'
                }}>
                  {dayShifts.map(shift => {
                    const emp = shift.employee || {};
                    const fullName = emp.firstName ? `${emp.firstName} ${emp.lastName}` : 'Unassigned Staff';
                    const empInitials = emp.firstName ? (emp.firstName[0] + (emp.lastName ? emp.lastName[0] : '')).toUpperCase() : 'U';
                    const typeConfig = SHIFT_TYPES[shift.type] || SHIFT_TYPES['Morning'];
                    const TypeIcon = typeConfig.icon;

                    return (
                      <div
                        key={shift._id}
                        style={{
                          padding: '1.25rem',
                          backgroundColor: 'var(--bg-secondary, #ffffff)',
                          border: `1px solid ${typeConfig.border}`,
                          borderRadius: '14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.85rem',
                          position: 'relative',
                          transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.06)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)';
                        }}
                      >
                        {/* HR Action delete */}
                        {isHRPlus && (
                          <button
                            type="button"
                            onClick={() => handleDeleteShift(shift._id)}
                            style={{
                              position: 'absolute',
                              top: '12px',
                              right: '12px',
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                              padding: '4px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s ease'
                            }}
                            title="Remove Shift"
                            onMouseEnter={e => {
                              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                              e.currentTarget.style.color = '#ef4444';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.color = 'var(--text-secondary)';
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}

                        {/* Employee Details */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.88rem',
                            fontWeight: 800,
                            flexShrink: 0,
                            boxShadow: '0 3px 10px rgba(37, 99, 235, 0.25)'
                          }}>
                            {empInitials}
                          </div>
                          <div style={{ minWidth: 0, flex: 1, paddingRight: isHRPlus ? '1.5rem' : 0 }}>
                            <div style={{
                              fontSize: '0.94rem',
                              fontWeight: 700,
                              color: 'var(--text-primary)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {fullName}
                            </div>
                            <div style={{
                              fontSize: '0.75rem',
                              color: 'var(--text-secondary)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              marginTop: '2px'
                            }}>
                              <span style={{ fontWeight: 600, color: '#2563eb' }}>{emp.employeeId || 'ID#---'}</span>
                              <span>•</span>
                              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {emp.designation || 'Specialist'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Timing and Shift Badge */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.6rem 0.75rem',
                          background: typeConfig.bg,
                          borderRadius: '10px',
                          border: `1px solid ${typeConfig.border}`
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            <Clock size={15} style={{ color: typeConfig.color }} />
                            <span>{shift.startTime} – {shift.endTime}</span>
                          </div>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            color: typeConfig.color,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            <TypeIcon size={13} />
                            {shift.type}
                          </span>
                        </div>

                        {/* Notes if any */}
                        {shift.notes ? (
                          <div style={{
                            fontSize: '0.78rem',
                            color: 'var(--text-secondary)',
                            background: 'var(--bg-primary)',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            lineHeight: 1.4
                          }}>
                            <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Note: </strong>
                            {shift.notes}
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                            Standard enterprise duty schedule
                          </div>
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

      {/* ── Schedule Shift Modal ── */}
      {modalOpen && createPortal(
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1.25rem'
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--bg-secondary, #ffffff)',
              background: 'var(--bg-secondary, #ffffff)',
              width: '100%',
              maxWidth: '560px',
              borderRadius: '20px',
              boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.5), 0 0 0 1px var(--border-color)',
              border: '1px solid var(--border-color)',
              overflow: 'hidden',
              position: 'relative',
              zIndex: 10001
            }}
          >
            {/* Modal Header */}
            <div
              className="modal-header"
              style={{
                padding: '1.25rem 1.75rem',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'var(--bg-secondary, #ffffff)',
                background: 'var(--bg-secondary, #ffffff)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '10px',
                  backgroundColor: 'rgba(37, 99, 235, 0.1)', color: '#2563eb',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid rgba(37, 99, 235, 0.2)'
                }}>
                  <CalendarDays size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Schedule Team Shift
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Assign working hours and roster to employee
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close modal"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.06)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateShift} style={{ backgroundColor: 'var(--bg-secondary, #ffffff)', background: 'var(--bg-secondary, #ffffff)', margin: 0 }}>
              <div className="modal-body" style={{
                padding: '1.5rem 1.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.15rem',
                backgroundColor: 'var(--bg-secondary, #ffffff)',
                background: 'var(--bg-secondary, #ffffff)'
              }}>
                {formError && (
                  <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertCircle size={16} />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Quick Presets */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.45rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Quick Shift Presets
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                    {PRESETS.map((p, idx) => {
                      const isSelected = formData.type === p.type && formData.startTime === p.start && formData.endTime === p.end;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleApplyPreset(p)}
                          style={{
                            padding: '0.4rem 0.75rem',
                            borderRadius: '8px',
                            border: isSelected ? '1.5px solid #2563eb' : '1.5px solid var(--border-color)',
                            backgroundColor: isSelected ? '#2563eb' : 'var(--bg-primary, #f8fafc)',
                            color: isSelected ? '#ffffff' : 'var(--text-primary, #0f172a)',
                            fontSize: '0.78rem',
                            fontWeight: isSelected ? 700 : 600,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            boxShadow: isSelected ? '0 2px 8px rgba(37, 99, 235, 0.3)' : 'none'
                          }}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Select Employee */}
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', margin: 0 }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Assign To Employee <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    className="form-control"
                    value={formData.employee}
                    onChange={e => setFormData({ ...formData, employee: e.target.value })}
                    required
                    style={{
                      height: '42px',
                      borderRadius: '10px',
                      backgroundColor: 'var(--bg-secondary, #ffffff)',
                      color: 'var(--text-primary)',
                      border: '1.5px solid var(--border-color)',
                      padding: '0 0.85rem',
                      fontSize: '0.88rem',
                      fontWeight: 500,
                      width: '100%',
                      outline: 'none'
                    }}
                  >
                    <option value="">Choose team member...</option>
                    {employees.map(emp => (
                      <option key={emp._id} value={emp._id}>
                        {emp.firstName} {emp.lastName} ({emp.employeeId || 'ID'}) — {emp.designation || 'Staff'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Shift Date & Category */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', margin: 0 }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Shift Date <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                      required
                      style={{
                        height: '42px',
                        borderRadius: '10px',
                        backgroundColor: 'var(--bg-secondary, #ffffff)',
                        color: 'var(--text-primary)',
                        border: '1.5px solid var(--border-color)',
                        padding: '0 0.85rem',
                        fontSize: '0.88rem',
                        fontWeight: 500,
                        width: '100%',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', margin: 0 }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Shift Category <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      className="form-control"
                      value={formData.type}
                      onChange={e => setFormData({ ...formData, type: e.target.value })}
                      style={{
                        height: '42px',
                        borderRadius: '10px',
                        backgroundColor: 'var(--bg-secondary, #ffffff)',
                        color: 'var(--text-primary)',
                        border: '1.5px solid var(--border-color)',
                        padding: '0 0.85rem',
                        fontSize: '0.88rem',
                        fontWeight: 500,
                        width: '100%',
                        outline: 'none'
                      }}
                    >
                      <option value="Morning">Morning (Day Shift)</option>
                      <option value="Evening">Evening (Swing Shift)</option>
                      <option value="Night">Night (Graveyard Shift)</option>
                      <option value="On-Call">On-Call (Standby)</option>
                    </select>
                  </div>
                </div>

                {/* Start & End Times */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', margin: 0 }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Start Time (HH:MM) <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="time"
                      className="form-control"
                      value={formData.startTime}
                      onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                      required
                      style={{
                        height: '42px',
                        borderRadius: '10px',
                        backgroundColor: 'var(--bg-secondary, #ffffff)',
                        color: 'var(--text-primary)',
                        border: '1.5px solid var(--border-color)',
                        padding: '0 0.85rem',
                        fontSize: '0.88rem',
                        fontWeight: 500,
                        width: '100%',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', margin: 0 }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      End Time (HH:MM) <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="time"
                      className="form-control"
                      value={formData.endTime}
                      onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                      required
                      style={{
                        height: '42px',
                        borderRadius: '10px',
                        backgroundColor: 'var(--bg-secondary, #ffffff)',
                        color: 'var(--text-primary)',
                        border: '1.5px solid var(--border-color)',
                        padding: '0 0.85rem',
                        fontSize: '0.88rem',
                        fontWeight: 500,
                        width: '100%',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Shift Instructions / Notes */}
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', margin: 0 }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Roster Notes / Instructions
                  </label>
                  <textarea
                    rows="2"
                    className="form-control"
                    placeholder="Specific responsibilities, sprint focus, or coverage notes..."
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    style={{
                      borderRadius: '10px',
                      resize: 'none',
                      backgroundColor: 'var(--bg-secondary, #ffffff)',
                      color: 'var(--text-primary)',
                      border: '1.5px solid var(--border-color)',
                      padding: '0.65rem 0.85rem',
                      fontSize: '0.88rem',
                      fontWeight: 500,
                      width: '100%',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div
                className="modal-footer"
                style={{
                  padding: '1.15rem 1.75rem',
                  borderTop: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  backgroundColor: 'var(--bg-primary, #f8fafc)',
                  background: 'var(--bg-primary, #f8fafc)'
                }}
              >
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                  style={{
                    padding: '0.6rem 1.2rem',
                    borderRadius: '10px',
                    border: '1.5px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary, #ffffff)',
                    color: 'var(--text-secondary, #475569)',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '0.6rem 1.4rem',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
                    color: '#ffffff',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1,
                    transition: 'all 0.15s ease'
                  }}
                >
                  {submitting ? 'Scheduling...' : 'Save Shift Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default Shifts;
