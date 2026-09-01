import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  Star, Award, Plus, Check, X, AlertCircle, TrendingUp,
  BarChart2, Users, Calendar, ChevronRight, Search, ChevronDown,
  AlertTriangle, UserX, ChevronUp, Cpu, CheckCircle
} from 'lucide-react';
import { SkeletonBlock } from '../components/Skeleton';

// ==========================================
// STAR RATING COMPONENT
// ==========================================
const StarRating = ({ rating, size = 16, interactive = false, onChange }) => (
  <div style={{ display: 'flex', gap: '0.15rem' }}>
    {[1, 2, 3, 4, 5].map((s) => (
      <Star
        key={s}
        size={size}
        fill={s <= rating ? '#ffb119' : 'none'}
        stroke={s <= rating ? '#ffb119' : 'var(--border-color)'}
        style={{ cursor: interactive ? 'pointer' : 'default', transition: 'transform 0.1s' }}
        onClick={() => interactive && onChange && onChange(s)}
        onMouseEnter={e => { if (interactive) e.currentTarget.style.transform = 'scale(1.2)'; }}
        onMouseLeave={e => { if (interactive) e.currentTarget.style.transform = 'scale(1)'; }}
      />
    ))}
  </div>
);

const RATING_LABELS = {
  5: { label: 'Excellent', color: '#2ebd7f', bg: 'rgba(46,189,127,0.12)' },
  4: { label: 'Good',      color: '#6777ef', bg: 'rgba(103,119,239,0.12)' },
  3: { label: 'Average',   color: '#ffb119', bg: 'rgba(255,177,25,0.12)' },
  2: { label: 'Poor',      color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  1: { label: 'Bad',       color: '#ff5b5b', bg: 'rgba(255,91,91,0.12)' },
};

// ==========================================
// AI INSIGHTS SUB-COMPONENTS
// ==========================================
const InsightsAvatar = ({ name }) => {
  const initials = name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';
  return (
    <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, var(--primary-accent) 0%, #818cf8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}>
      {initials}
    </div>
  );
};

const ScoreCircle = ({ score }) => {
  const color = score >= 75 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--danger)';
  const bg = score >= 75 ? 'var(--success-bg)' : score >= 50 ? 'var(--warning-bg)' : 'var(--danger-bg)';
  return (
    <div style={{ width: 50, height: 50, borderRadius: '50%', background: bg, border: `3px solid ${color}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ fontSize: '0.95rem', fontWeight: 900, color, lineHeight: 1 }}>{score}</span>
    </div>
  );
};

const InsightsMiniBar = ({ pct, color }) => (
  <div>
    <div style={{ height: 5, background: 'var(--border-color)', borderRadius: '99px', overflow: 'hidden', marginTop: '3px' }}>
      <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, borderRadius: '99px', transition: 'width 0.6s ease' }} />
    </div>
  </div>
);

const INSIGHTS_ALERT_CONFIG = {
  high_performer:    { label: 'High Performer',   icon: Award,         cls: 'badge-present' },
  at_risk:           { label: 'At Risk',           icon: AlertTriangle, cls: 'badge-absent' },
  frequent_absentee: { label: 'Frequent Absentee', icon: UserX,         cls: 'badge-pending' },
};

const PerformanceInsightsTab = ({ showToast }) => {
  const [insights, setInsights] = useState([]);
  const [alerts, setAlerts] = useState({ highPerformers: [], atRisk: [], frequentAbsentees: [] });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('performanceScore');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get('/insights/team');
      if (res.success) { setInsights(res.insights || []); setAlerts(res.alerts || {}); setTotal(res.totalEmployees || 0); }
      else setError(res.message || 'Failed to load insights');
    } catch (e) { setError(e.message || 'Server error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredInsights = insights
    .filter(i => {
      const name = `${i.employee.firstName} ${i.employee.lastName}`.toLowerCase();
      const matchSearch = !search || name.includes(search.toLowerCase());
      const matchFilter = filter === 'All' || i.alertType === filter || (filter === 'normal' && !i.alertType);
      return matchSearch && matchFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'performanceScore') return b.performanceScore - a.performanceScore;
      if (sortBy === 'attendancePct') return b.attendancePct - a.attendancePct;
      if (sortBy === 'taskCompletionPct') return b.taskCompletionPct - a.taskCompletionPct;
      return 0;
    });

  const avgScore = insights.length ? Math.round(insights.reduce((s, i) => s + i.performanceScore, 0) / insights.length) : 0;

  return (
    <div style={{ animation: 'fadeIn 0.4s ease both' }}>
      {error && <div className="alert alert-danger" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}><AlertCircle size={16} /> {error}</div>}

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        {[
          { label: 'Total Analyzed',    value: total,                           color: 'var(--primary-accent)' },
          { label: 'Avg AI Score',      value: `${avgScore}`,                   color: avgScore >= 75 ? 'var(--success)' : avgScore >= 50 ? 'var(--warning)' : 'var(--danger)' },
          { label: 'High Performers',   value: alerts.highPerformers?.length || 0,   color: 'var(--success)' },
          { label: 'At Risk',           value: alerts.atRisk?.length || 0,           color: 'var(--danger)' },
          { label: 'Frequent Absentees',value: alerts.frequentAbsentees?.length || 0,color: 'var(--warning)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '1.1rem 1.25rem' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Alert Cards row */}
      {!loading && (alerts.highPerformers?.length > 0 || alerts.atRisk?.length > 0 || alerts.frequentAbsentees?.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
          {[
            { title: '🏆 High Performers',   list: alerts.highPerformers   || [], cls: 'badge-present' },
            { title: '⚠️ At-Risk Employees',  list: alerts.atRisk           || [], cls: 'badge-absent' },
            { title: '🚨 Frequent Absentees', list: alerts.frequentAbsentees|| [], cls: 'badge-pending' },
          ].filter(a => a.list.length > 0).map(({ title, list, cls }) => (
            <div key={title} className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontWeight: 700, marginBottom: '0.85rem', fontSize: '0.9rem' }}>{title} ({list.length})</div>
              {list.slice(0, 4).map((i, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
                  <InsightsAvatar name={`${i.employee.firstName} ${i.employee.lastName}`} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.employee.firstName} {i.employee.lastName}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{i.employee.designation}</div>
                  </div>
                  <span className={`badge ${cls}`} style={{ fontSize: '0.72rem' }}>{i.performanceScore}</span>
                </div>
              ))}
              {list.length > 4 && <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textAlign: 'center', margin: 0 }}>+{list.length - 4} more</p>}
            </div>
          ))}
        </div>
      )}

      {/* Scoring Formula Banner */}
      <div className="card" style={{ marginBottom: '1.75rem', padding: '1.25rem 1.5rem', background: 'linear-gradient(135deg,rgba(103,119,239,0.08),rgba(79,70,229,0.04))' }}>
        <span className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}><TrendingUp size={16} color="var(--primary-accent)" /> AI Scoring Formula</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '0.75rem' }}>
          {[
            { label: 'Attendance Score', weight: '40%', desc: 'Present days / Working days', color: 'var(--success)' },
            { label: 'Task Completion', weight: '35%', desc: 'Completed / Total assigned tasks', color: 'var(--warning)' },
            { label: 'Leave Health', weight: '25%', desc: 'Inverse of excess leave days taken', color: 'var(--primary-accent)' },
          ].map(f => (
            <div key={f.label} style={{ padding: '0.75rem 1rem', background: 'var(--bg-primary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: f.color }}>{f.weight}</div>
              <div style={{ fontWeight: 700, fontSize: '0.83rem', marginTop: '2px' }}>{f.label}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '3px' }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter & Search Row */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="form-control" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee..." style={{ minWidth: '200px', flex: 1 }} />
        <select className="form-control" value={filter} onChange={e => setFilter(e.target.value)} style={{ minWidth: '160px' }}>
          <option value="All">All Employees</option>
          <option value="high_performer">High Performers</option>
          <option value="at_risk">At Risk</option>
          <option value="frequent_absentee">Frequent Absentees</option>
          <option value="normal">Normal</option>
        </select>
        <select className="form-control" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ minWidth: '180px' }}>
          <option value="performanceScore">Sort: AI Score</option>
          <option value="attendancePct">Sort: Attendance</option>
          <option value="taskCompletionPct">Sort: Tasks</option>
        </select>
      </div>

      {/* Main Table */}
      <div className="table-container">
        <div className="table-header-row">
          <span className="table-title">Individual Performance Analysis ({filteredInsights.length})</span>
        </div>
        <div className="data-table-wrapper">
          {loading ? (
            <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Analyzing performance data...</p>
          ) : filteredInsights.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No employees found.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th style={{ textAlign: 'center' }}>AI Score</th>
                  <th>Attendance</th>
                  <th>Task Rate</th>
                  <th style={{ textAlign: 'center' }}>Leave Days</th>
                  <th style={{ textAlign: 'center' }}>OT Hours</th>
                  <th>Alert</th>
                  <th style={{ textAlign: 'center' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredInsights.map((insight, i) => {
                  const name = `${insight.employee.firstName} ${insight.employee.lastName}`;
                  const alertCfg = insight.alertType ? INSIGHTS_ALERT_CONFIG[insight.alertType] : null;
                  const isOpen = expanded === i;
                  return (
                    <React.Fragment key={i}>
                      <tr>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <InsightsAvatar name={name} />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{name}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{insight.employee.designation}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}><ScoreCircle score={insight.performanceScore} /></td>
                        <td style={{ minWidth: '120px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '1px' }}>
                            <span style={{ fontWeight: 700 }}>{insight.attendancePct}%</span>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>{insight.presentDays}/{insight.workingDays}d</span>
                          </div>
                          <InsightsMiniBar pct={insight.attendancePct} color="var(--success)" />
                        </td>
                        <td style={{ minWidth: '120px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '1px' }}>
                            <span style={{ fontWeight: 700 }}>{insight.taskCompletionPct}%</span>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>{insight.completedTasks}/{insight.totalTasks}</span>
                          </div>
                          <InsightsMiniBar pct={insight.taskCompletionPct} color="var(--warning)" />
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: insight.leaveDaysTaken > 15 ? 'var(--danger)' : 'var(--text-primary)' }}>{insight.leaveDaysTaken}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: '#8b5cf6' }}>{insight.totalOvertimeHours}h</td>
                        <td>
                          {alertCfg ? (
                            <span className={`badge ${alertCfg.cls}`} style={{ display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content' }}>
                              <alertCfg.icon size={11} /> {alertCfg.label}
                            </span>
                          ) : (
                            <span className="badge badge-info" style={{ fontSize: '0.68rem' }}>Normal</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button className="btn btn-secondary btn-icon" onClick={() => setExpanded(isOpen ? null : i)}
                            style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                          </button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td colSpan={8} style={{ background: 'var(--bg-primary)', padding: '1rem 1.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1.5rem' }}>
                              {/* Attendance Detail */}
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Attendance (30d)</div>
                                {[
                                  { label: 'Present Days',    value: insight.presentDays,         color: 'var(--success)' },
                                  { label: 'Absent Days',     value: insight.absentDays,          color: 'var(--danger)' },
                                  { label: 'Late Days',       value: insight.lateDays,            color: 'var(--warning)' },
                                  { label: 'Overtime Hours',  value: `${insight.totalOvertimeHours}h`, color: '#8b5cf6' },
                                ].map(({ label, value, color }) => (
                                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.82rem' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                                    <span style={{ fontWeight: 700, color }}>{value}</span>
                                  </div>
                                ))}
                              </div>
                              {/* Task Breakdown */}
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Task Summary</div>
                                {[
                                  { label: 'Total Tasks',  value: insight.totalTasks,     color: 'var(--text-primary)' },
                                  { label: 'Completed',    value: insight.completedTasks, color: 'var(--success)' },
                                  { label: 'Pending',      value: insight.pendingTasks,   color: 'var(--warning)' },
                                  { label: 'Leave Days (YTD)', value: insight.leaveDaysTaken, color: insight.leaveDaysTaken > 15 ? 'var(--danger)' : 'var(--text-primary)' },
                                ].map(({ label, value, color }) => (
                                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.82rem' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                                    <span style={{ fontWeight: 700, color }}>{value}</span>
                                  </div>
                                ))}
                              </div>
                              {/* Score Breakdown */}
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Score Components</div>
                                {[
                                  { label: 'Attendance (40%)',   pct: insight.attendancePct,     color: 'var(--success)' },
                                  { label: 'Tasks (35%)',        pct: insight.taskCompletionPct, color: 'var(--warning)' },
                                  { label: 'Leave Health (25%)', pct: Math.max(0, 100 - Math.round((insight.leaveDaysTaken / 30) * 100)), color: 'var(--primary-accent)' },
                                ].map(({ label, pct, color }) => (
                                  <div key={label} style={{ marginBottom: '0.6rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '3px' }}>
                                      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                                      <span style={{ fontWeight: 700, color }}>{pct}%</span>
                                    </div>
                                    <InsightsMiniBar pct={pct} color={color} />
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

// ==========================================
// MAIN PERFORMANCE COMPONENT
// ==========================================
const Performance = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('reviews');

  // Toast Alert State
  const [toast, setToast] = useState(null);
  const showToast = useCallback((msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Reviews-specific states
  const [reviews, setReviews] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState('All');
  const [periodFilter, setPeriodFilter] = useState('All');

  const [formData, setFormData] = useState({
    employeeId: '',
    rating: 5,
    feedback: '',
    reviewPeriod: `Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}`,
  });

  const isEmployee = user?.role === 'employee';

  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/performance');
      if (res.success) setReviews(res.data);
    } catch (err) {
      setError(err.message || 'Failed to fetch reviews');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    if (isEmployee) return;
    try {
      const res = await api.get('/employees');
      if (res.success) {
        setEmployees(res.employees);
        if (res.employees.length > 0) {
          setFormData(prev => ({ ...prev, employeeId: res.employees[0]._id }));
        }
      }
    } catch (err) {
      console.error(err.message);
    }
  };

  useEffect(() => {
    if (activeTab === 'reviews') {
      fetchReviews();
      fetchEmployees();
    }
  }, [user, activeTab]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.employeeId || !formData.rating || !formData.feedback || !formData.reviewPeriod) {
      setError('Please fill in all review details');
      return;
    }
    try {
      setError('');
      const res = await api.post('/performance', formData);
      if (res.success) {
        showToast('Performance review logged successfully!');
        setFormData(prev => ({ ...prev, feedback: '', rating: 5 }));
        setFormOpen(false);
        fetchReviews();
      }
    } catch (err) {
      setError(err.message || 'Failed to submit performance review');
    }
  };

  // Stats computation
  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  const ratingDistribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    pct: reviews.length ? Math.round((reviews.filter(r => r.rating === star).length / reviews.length) * 100) : 0,
  }));

  const latestPeriods = [...new Set(reviews.map(r => r.reviewPeriod))].slice(0, 3);

  const filteredReviews = reviews.filter(r => {
    const subjectName = `${r.employee?.firstName || ''} ${r.employee?.lastName || ''}`.toLowerCase();
    const reviewerName = `${r.reviewer?.firstName || ''} ${r.reviewer?.lastName || ''}`.toLowerCase();
    const feedbackText = (r.feedback || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    
    const matchesSearch = 
      subjectName.includes(query) || 
      reviewerName.includes(query) ||
      feedbackText.includes(query);
      
    if (!matchesSearch) return false;

    if (ratingFilter !== 'All' && r.rating !== Number(ratingFilter)) return false;
    if (periodFilter !== 'All' && r.reviewPeriod !== periodFilter) return false;

    return true;
  });

  return (
    <div className="page-container page-enter">
      {/* Toast alert */}
      {toast && (
        <div className={`alert ${toast.ok ? 'alert-success' : 'alert-danger'}`}
          style={{ position: 'fixed', top: '1.25rem', right: '1.5rem', zIndex: 9999, display: 'flex', gap: '0.5rem', alignItems: 'center', boxShadow: 'var(--shadow-lg)' }}>
          {toast.ok ? <CheckCircle size={15} /> : <AlertCircle size={15} />} {toast.msg}
        </div>
      )}

      {/* Header and Tab Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '14px',
            background: activeTab === 'reviews'
              ? 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)'
              : 'linear-gradient(135deg, var(--primary-accent) 0%, #4f46e5 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
          }}>
            {activeTab === 'reviews' ? <Award size={22} color="white" /> : <Cpu size={22} color="white" />}
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>
              {activeTab === 'reviews' ? 'Performance Reviews' : 'AI Performance Insights'}
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              {activeTab === 'reviews' 
                ? (isEmployee ? 'Your performance history and ratings' : 'Manage employee reviews and feedback')
                : 'Rule-based scoring: Attendance 40% + Tasks 35% + Leave Pattern 25%'}
            </p>
          </div>
        </div>

        {/* Tab switcher for managers */}
        {!isEmployee && (
          <div className="card" style={{ padding: '0.4rem', margin: 0, display: 'flex', gap: '0.25rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
            {[
              { id: 'reviews', label: 'Reviews Log', icon: Award },
              { id: 'insights', label: 'AI Team Insights', icon: Cpu }
            ].map(t => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`btn ${active ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    padding: '0.45rem 1.1rem',
                    fontSize: '0.83rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    borderRadius: '8px',
                    background: active ? undefined : 'transparent',
                    borderColor: 'transparent',
                    color: active ? '#fff' : 'var(--text-primary)',
                    boxShadow: active ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  <Icon size={14} />
                  {t.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Add Review Button (Only for reviews tab & non-employees) */}
        {!isEmployee && activeTab === 'reviews' && (
          <button
            onClick={() => setFormOpen(true)}
            className="btn btn-primary btn-shimmer"
            style={{ background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)', borderColor: '#ec4899', boxShadow: '0 4px 15px rgba(236,72,153,0.35)' }}
          >
            <Plus size={18} /> New Review
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-danger" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Reviews Log Tab */}
      {activeTab === 'reviews' && (
        <>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '2rem 0' }}>
              <div style={{ height: '80px', background: 'var(--bg-secondary)', borderRadius: '12px' }} className="skeleton-blink" />
              <div style={{ height: '300px', background: 'var(--bg-secondary)', borderRadius: '12px' }} className="skeleton-blink" />
            </div>
          ) : (
            <>
              {/* Stats Row */}
              {reviews.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                  <div className="card card-glow" style={{
                    padding: '1.5rem', textAlign: 'center',
                    background: 'linear-gradient(135deg, rgba(236,72,153,0.06) 0%, rgba(190,24,93,0.03) 100%)',
                    border: '1px solid rgba(236,72,153,0.15)',
                  }}>
                    <div style={{ fontSize: '3rem', fontWeight: 900, color: '#ec4899', lineHeight: 1 }}>
                      {avgRating}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', margin: '0.5rem 0' }}>
                      <StarRating rating={Math.round(avgRating)} />
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Average Rating</div>
                  </div>

                  <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(103,119,239,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <BarChart2 size={18} color="#6777ef" />
                      </div>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary-accent)' }}>{reviews.length}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Reviews</div>
                  </div>

                  <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(46,189,127,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users size={18} color="#2ebd7f" />
                      </div>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#2ebd7f' }}>
                      {new Set(reviews.map(r => r.employee?._id)).size}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Reviewed Staff</div>
                  </div>

                  <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,177,25,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Calendar size={18} color="#ffb119" />
                      </div>
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffb119' }}>
                      {latestPeriods[0] || '—'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Latest Period</div>
                  </div>
                </div>
              )}

              {/* Rating Distribution + Reviews Grid */}
              {reviews.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem', marginBottom: '1.5rem', alignItems: 'start' }}>
                  {/* Rating Distribution Panel */}
                  <div className="card" style={{ padding: '1.5rem' }}>
                    <span className="chart-title" style={{ marginBottom: '1.25rem', display: 'block' }}>
                      <TrendingUp size={16} color="#ec4899" style={{ verticalAlign: 'middle', marginRight: '5px' }} /> Rating Distribution
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {ratingDistribution.map(({ star, count, pct }) => {
                        const cfg = RATING_LABELS[star];
                        const isSelected = ratingFilter === star.toString();
                        return (
                          <div 
                            key={star}
                            onClick={() => setRatingFilter(isSelected ? 'All' : star.toString())}
                            style={{
                              padding: '0.4rem 0.5rem',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              background: isSelected ? `${cfg.color}15` : 'transparent',
                              border: `1px solid ${isSelected ? `${cfg.color}40` : 'transparent'}`,
                              transition: 'all 0.2s',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <Star size={13} fill="#ffb119" stroke="#ffb119" />
                                <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{star}</span>
                                <span style={{ fontSize: '0.72rem', padding: '0.1rem 0.4rem', borderRadius: '6px', background: cfg.bg, color: cfg.color, fontWeight: 700 }}>{cfg.label}</span>
                              </div>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{count}</span>
                            </div>
                            <div style={{ height: '6px', background: 'var(--border-color)', borderRadius: '99px', overflow: 'hidden' }}>
                              <div style={{
                                width: `${pct}%`, height: '100%',
                                background: cfg.color, borderRadius: '99px',
                                transition: 'width 0.8s cubic-bezier(0.34,1.56,0.64,1)',
                              }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Column: Search/Filter + Reviews */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="card" style={{ padding: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Search reviews..."
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          style={{ paddingLeft: '2.5rem', paddingTop: '0.55rem', paddingBottom: '0.55rem', fontSize: '0.88rem' }}
                        />
                        <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                      </div>
                      
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <select
                          value={periodFilter}
                          onChange={e => setPeriodFilter(e.target.value)}
                          className="form-control"
                          style={{ minWidth: '130px' }}
                        >
                          <option value="All">All Periods</option>
                          {latestPeriods.map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>

                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <select
                          value={ratingFilter}
                          onChange={e => setRatingFilter(e.target.value)}
                          className="form-control"
                          style={{ minWidth: '135px' }}
                        >
                          <option value="All">All Ratings</option>
                          <option value="5">⭐⭐⭐⭐⭐ Excellent (5)</option>
                          <option value="4">⭐⭐⭐⭐ Good (4)</option>
                          <option value="3">⭐⭐⭐ Average (3)</option>
                          <option value="2">⭐⭐ Poor (2)</option>
                          <option value="1">⭐ Bad (1)</option>
                        </select>
                      </div>
                    </div>

                    {filteredReviews.length === 0 ? (
                      <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <AlertCircle size={32} style={{ display: 'block', margin: '0 auto 0.5rem', opacity: 0.5 }} />
                        No performance reviews match the current filters.
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '1.25rem' }}>
                        {filteredReviews.map((r) => {
                          const ratingCfg = RATING_LABELS[r.rating] || RATING_LABELS[3];
                          return (
                            <div key={r._id} className="card card-glow" style={{
                              padding: '1.5rem',
                              display: 'flex', flexDirection: 'column', gap: '0.85rem',
                              borderLeft: `3px solid ${ratingCfg.color}`,
                              animation: 'slideUpFade 0.4s ease both',
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                  <div style={{
                                    width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
                                    background: `${ratingCfg.color}20`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.88rem', fontWeight: 800, color: ratingCfg.color,
                                  }}>
                                    {r.employee?.firstName?.[0] || 'U'}{r.employee?.lastName?.[0] || ''}
                                  </div>
                                  <div>
                                    <strong style={{ fontSize: '0.95rem', display: 'block', lineHeight: 1.2 }}>
                                      {r.employee?.firstName} {r.employee?.lastName}
                                    </strong>
                                    <span style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                                      {r.employee?.employeeId} · {r.employee?.designation}
                                    </span>
                                  </div>
                                </div>
                                <span style={{
                                  padding: '0.2rem 0.6rem', borderRadius: '6px',
                                  background: 'rgba(103,119,239,0.1)', color: 'var(--primary-accent)',
                                  fontSize: '0.72rem', fontWeight: 700, flexShrink: 0,
                                }}>{r.reviewPeriod}</span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <StarRating rating={r.rating} size={17} />
                                <span style={{
                                  fontSize: '0.72rem', fontWeight: 800,
                                  padding: '0.15rem 0.5rem', borderRadius: '99px',
                                  background: ratingCfg.bg, color: ratingCfg.color,
                                }}>{ratingCfg.label}</span>
                              </div>

                              <p style={{
                                fontSize: '0.85rem', margin: 0, fontStyle: 'italic',
                                color: 'var(--text-primary)', lineHeight: 1.55,
                                padding: '0.65rem 0.85rem',
                                background: 'var(--bg-primary)',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                              }}>
                                "{r.feedback}"
                              </p>

                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                                <span>By: <strong>{r.reviewer?.firstName} {r.reviewer?.lastName}</strong></span>
                                <span>{new Date(r.reviewDate || r.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {reviews.length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                  <div style={{
                    width: '80px', height: '80px', borderRadius: '24px',
                    background: 'rgba(236,72,153,0.1)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', margin: '0 auto 1.5rem',
                  }}>
                    <Award size={40} style={{ color: '#ec4899' }} />
                  </div>
                  <h3 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.5rem' }}>No Reviews Yet</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                    {isEmployee
                      ? 'You have no performance reviews on record yet.'
                      : 'Start by creating the first performance review for your team.'}
                  </p>
                  {!isEmployee && (
                    <button
                      onClick={() => setFormOpen(true)}
                      className="btn btn-primary"
                      style={{ background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)' }}
                    >
                      <Plus size={16} /> Create First Review
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* Form Modal */}
          {formOpen && (
            <div className="modal-overlay">
              <div className="modal-content" style={{ width: '520px' }}>
                <div className="modal-header">
                  <h3 className="modal-title">Log Performance Review</h3>
                  <button className="modal-close-btn" onClick={() => setFormOpen(false)}>
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div className="form-group">
                      <label>Select Employee *</label>
                      <select
                        className="form-control"
                        value={formData.employeeId}
                        onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                        required
                      >
                        <option value="">Select...</option>
                        {employees.map((e) => (
                          <option key={e._id} value={e._id}>
                            {e.firstName} {e.lastName} ({e.employeeId} - {e.designation})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Review Period *</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Q2 2026"
                          value={formData.reviewPeriod}
                          onChange={(e) => setFormData({ ...formData, reviewPeriod: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Rating (1–5 Stars) *</label>
                        <select
                          className="form-control"
                          value={formData.rating}
                          onChange={(e) => setFormData({ ...formData, rating: Number(e.target.value) })}
                          required
                        >
                          <option value="5">⭐⭐⭐⭐⭐ Excellent</option>
                          <option value="4">⭐⭐⭐⭐ Good</option>
                          <option value="3">⭐⭐⭐ Average</option>
                          <option value="2">⭐⭐ Poor</option>
                          <option value="1">⭐ Unsatisfactory</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', background: 'var(--bg-primary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Visual Rating:</span>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        {[1,2,3,4,5].map(s => (
                          <Star
                            key={s}
                            size={24}
                            fill={s <= (hoverRating || formData.rating) ? '#ffb119' : 'none'}
                            stroke={s <= (hoverRating || formData.rating) ? '#ffb119' : 'var(--border-color)'}
                            style={{ cursor: 'pointer', transition: 'transform 0.15s' }}
                            onMouseEnter={() => setHoverRating(s)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => setFormData({ ...formData, rating: s })}
                          />
                        ))}
                      </div>
                      <span style={{
                        fontSize: '0.78rem', fontWeight: 800,
                        padding: '0.2rem 0.6rem', borderRadius: '99px',
                        background: RATING_LABELS[hoverRating || formData.rating]?.bg,
                        color: RATING_LABELS[hoverRating || formData.rating]?.color,
                      }}>
                        {RATING_LABELS[hoverRating || formData.rating]?.label}
                      </span>
                    </div>

                    <div className="form-group">
                      <label>Detailed Feedback & Remarks *</label>
                      <textarea
                        rows="4"
                        className="form-control"
                        placeholder="Describe strengths, areas of improvement, and key achievements..."
                        value={formData.feedback}
                        onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
                        required
                        style={{ resize: 'none' }}
                      />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setFormOpen(false)}>Cancel</button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)', borderColor: '#ec4899', boxShadow: '0 4px 12px rgba(236,72,153,0.3)' }}
                    >
                      <Award size={15} /> Submit Review
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}

      {/* AI Performance Insights Tab */}
      {activeTab === 'insights' && !isEmployee && (
        <PerformanceInsightsTab showToast={showToast} />
      )}
    </div>
  );
};

export default Performance;
