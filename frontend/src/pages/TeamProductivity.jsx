import React, { useState, useEffect, useCallback } from 'react';
import { CheckSquare, Clock, Users, TrendingUp, BarChart2, Loader, RefreshCw, Calendar, Award } from 'lucide-react';

const API = 'http://localhost:5000/api';
const getToken = () => localStorage.getItem('ems_token');

const Avatar = ({ name, img }) => {
  const initials = name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';
  return img
    ? <img src={img} alt={name} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
    : <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.78rem', flexShrink: 0 }}>{initials}</div>;
};

const ScoreRing = ({ score, size = 60, strokeWidth = 5 }) => {
  const radius = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border-color)" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        style={{ transform: 'rotate(90deg)', transformOrigin: `${size / 2}px ${size / 2}px`, fill: color, fontSize: '0.75rem', fontWeight: 700 }}>
        {score}
      </text>
    </svg>
  );
};

const MiniBar = ({ value, max = 100, color = '#6366f1' }) => (
  <div style={{ height: 6, background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
    <div style={{ width: `${Math.min((value / max) * 100, 100)}%`, height: '100%', background: color, borderRadius: '4px', transition: 'width 0.6s ease' }} />
  </div>
);

export default function TeamProductivity() {
  const [insights, setInsights] = useState([]);
  const [alerts, setAlerts] = useState({ highPerformers: [], atRisk: [], frequentAbsentees: [] });
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState('performanceScore');
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/insights/team`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const json = await res.json();
      if (json.success) {
        setInsights(json.insights);
        setAlerts(json.alerts);
        setTotal(json.totalEmployees);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sortedInsights = [...insights]
    .filter(i => search ? `${i.employee.firstName} ${i.employee.lastName}`.toLowerCase().includes(search.toLowerCase()) : true)
    .sort((a, b) => {
      if (sortBy === 'performanceScore') return b.performanceScore - a.performanceScore;
      if (sortBy === 'attendancePct') return b.attendancePct - a.attendancePct;
      if (sortBy === 'taskCompletionPct') return b.taskCompletionPct - a.taskCompletionPct;
      return 0;
    });

  const avgScore = insights.length ? Math.round(insights.reduce((s, i) => s + i.performanceScore, 0) / insights.length) : 0;
  const avgAttendance = insights.length ? Math.round(insights.reduce((s, i) => s + i.attendancePct, 0) / insights.length) : 0;
  const totalCompletedTasks = insights.reduce((s, i) => s + i.completedTasks, 0);
  const totalPendingTasks = insights.reduce((s, i) => s + i.pendingTasks, 0);

  const alertColor = { high_performer: ['#10b981', '#ecfdf5', '🏆'], at_risk: ['#ef4444', '#fef2f2', '⚠️'], frequent_absentee: ['#f59e0b', '#fffbeb', '🚨'] };

  return (
    <div style={{ padding: '1.5rem 2rem', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.8rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>📊 Team Productivity Dashboard</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Real-time performance and productivity metrics for your team</p>
        </div>
        <button onClick={fetchData} disabled={loading}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontWeight: 600 }}>
          <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Team Members', value: total, icon: Users, color: '#6366f1' },
          { label: 'Avg Performance', value: `${avgScore}%`, icon: Award, color: '#8b5cf6' },
          { label: 'Avg Attendance', value: `${avgAttendance}%`, icon: Calendar, color: '#10b981' },
          { label: 'Tasks Completed', value: totalCompletedTasks, icon: CheckSquare, color: '#f59e0b' },
          { label: 'Tasks Pending', value: totalPendingTasks, icon: Clock, color: '#ef4444' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{ background: 'var(--bg-card)', borderRadius: '14px', padding: '1.2rem', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.8rem', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
            <div style={{ width: 42, height: 42, borderRadius: '12px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={20} color={color} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Alert Panels */}
      {!loading && (alerts.highPerformers.length > 0 || alerts.atRisk.length > 0 || alerts.frequentAbsentees.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { key: 'highPerformers', label: 'High Performers', list: alerts.highPerformers, type: 'high_performer' },
            { key: 'atRisk', label: 'At-Risk Employees', list: alerts.atRisk, type: 'at_risk' },
            { key: 'frequentAbsentees', label: 'Frequent Absentees', list: alerts.frequentAbsentees, type: 'frequent_absentee' },
          ].filter(a => a.list.length > 0).map(({ key, label, list, type }) => {
            const [color, bg, emoji] = alertColor[type];
            return (
              <div key={key} style={{ background: bg, borderRadius: '14px', padding: '1.2rem', border: `1px solid ${color}30` }}>
                <div style={{ fontWeight: 700, color, marginBottom: '0.8rem', fontSize: '0.9rem' }}>{emoji} {label} ({list.length})</div>
                {list.slice(0, 3).map((i, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                    <Avatar name={`${i.employee.firstName} ${i.employee.lastName}`} img={i.employee.profileImage} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{i.employee.firstName} {i.employee.lastName}</div>
                      <div style={{ fontSize: '0.75rem', color: `${color}aa` }}>Score: {i.performanceScore}%</div>
                    </div>
                  </div>
                ))}
                {list.length > 3 && <div style={{ fontSize: '0.78rem', color: `${color}99`, textAlign: 'center', marginTop: '0.3rem' }}>+{list.length - 3} more</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* Table */}
      <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem' }}>Individual Performance</h3>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee..."
              style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.85rem' }} />
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.85rem' }}>
              <option value="performanceScore">Sort: Performance</option>
              <option value="attendancePct">Sort: Attendance</option>
              <option value="taskCompletionPct">Sort: Tasks</option>
            </select>
          </div>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}><Loader size={28} style={{ animation: 'spin 1s linear infinite' }} /></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-hover)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
                  {['Employee', 'Score', 'Attendance', 'Tasks Done', 'Pending', 'Leave Days', 'Status'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedInsights.map((insight, i) => {
                  const alertInfo = insight.alertType ? alertColor[insight.alertType] : null;
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                          <Avatar name={`${insight.employee.firstName} ${insight.employee.lastName}`} img={insight.employee.profileImage} />
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>{insight.employee.firstName} {insight.employee.lastName}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{insight.employee.designation}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <ScoreRing score={insight.performanceScore} size={52} strokeWidth={5} />
                      </td>
                      <td style={{ padding: '12px 16px', minWidth: '110px' }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{insight.attendancePct}%</div>
                        <MiniBar value={insight.attendancePct} color="#10b981" />
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '3px' }}>{insight.presentDays}/{insight.workingDays} days</div>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{ fontWeight: 700, color: '#10b981', fontSize: '1rem' }}>{insight.completedTasks}</span>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>of {insight.totalTasks}</div>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{ fontWeight: 700, color: insight.pendingTasks > 3 ? '#ef4444' : '#f59e0b', fontSize: '1rem' }}>{insight.pendingTasks}</span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{ fontWeight: 700, color: insight.leaveDaysTaken > 15 ? '#ef4444' : 'var(--text-primary)', fontSize: '0.95rem' }}>{insight.leaveDaysTaken}</span>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>days</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {alertInfo ? (
                          <span style={{ background: alertInfo[1], color: alertInfo[0], borderRadius: '8px', padding: '3px 10px', fontSize: '0.75rem', fontWeight: 700, border: `1px solid ${alertInfo[0]}30`, whiteSpace: 'nowrap' }}>
                            {alertInfo[2]} {insight.alertType === 'high_performer' ? 'High' : insight.alertType === 'at_risk' ? 'At Risk' : 'Absentee'}
                          </span>
                        ) : (
                          <span style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', borderRadius: '8px', padding: '3px 10px', fontSize: '0.75rem', fontWeight: 600 }}>Normal</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {sortedInsights.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No team members found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
