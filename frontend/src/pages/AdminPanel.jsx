import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  ShieldAlert, Users, ClipboardList, FileDown,
  ChevronDown, AlertCircle, Check, X, RefreshCw,
  UserCog, Activity, BarChart3, Search, Shield,
  Mail, Clock, Calendar, DollarSign, Database, UploadCloud, FileText, CheckCircle2
} from 'lucide-react';

// Custom switch toggle component
const CustomSwitch = ({ checked, onChange }) => (
  <div 
    onClick={() => onChange(!checked)}
    style={{
      width: '46px',
      height: '24px',
      borderRadius: '12px',
      background: checked ? 'var(--primary-accent)' : 'var(--text-secondary)',
      position: 'relative',
      cursor: 'pointer',
      transition: 'background 0.2s',
      display: 'inline-block'
    }}
  >
    <div style={{
      width: '18px',
      height: '18px',
      borderRadius: '50%',
      background: 'white',
      position: 'absolute',
      top: '3px',
      left: checked ? '25px' : '3px',
      transition: 'left 0.2s',
      boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
    }} />
  </div>
);

// Dynamic tabs based on user role
const getTabs = (role) => {
  const tabs = [
    { id: 'overview',  label: 'Overview',        icon: BarChart3 },
    { id: 'users',     label: 'User & Roles',     icon: UserCog },
  ];
  if (['admin', 'hr', 'manager'].includes(role)) {
    tabs.push({ id: 'audit', label: 'Audit Log', icon: ClipboardList });
  }
  tabs.push({ id: 'reports', label: 'Export Reports', icon: FileDown });
  tabs.push({ id: 'settings', label: 'System Settings', icon: ShieldAlert });
  return tabs;
};

const ROLE_COLORS = {
  admin:    { bg: 'rgba(255,91,91,0.12)',   color: '#ff5b5b' },
  hr:       { bg: 'rgba(255,177,25,0.12)',  color: '#ffb119' },
  employee: { bg: 'rgba(46,189,127,0.12)', color: '#2ebd7f' },
};

const timeAgo = (date) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

/* ═════════════════════════════════════════════════════ */
const AdminPanel = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const [overview, setOverview] = useState(null);
  const [users, setUsers]       = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [roleChangeId, setRoleChangeId] = useState(null);
  const [roleChangeVal, setRoleChangeVal] = useState('');
  const [exporting, setExporting] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Persistent system configurations
  const [settings, setSettings] = useState({
    companyName: 'EMS Hub Technologies',
    contactEmail: 'support@emshub.io',
    businessHours: '09:00 AM - 06:00 PM',
    holidayPolicy: 'Standard 12 Paid Holidays',
    enableBackups: true,
    authLevel: 'JWT + Role Rules',
    salaryRuleMin: 1000,
    emailNotifications: true,
  });

  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Filter & Search states
  const [userSearch, setUserSearch] = useState('');
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('');

  const load = async (tab) => {
    setLoading(true); setError(''); setSuccessMsg('');
    try {
      if (tab === 'overview') {
        const res = await api.get('/admin/overview');
        if (res.success) setOverview(res.overview);
      } else if (tab === 'users') {
        const res = await api.get('/admin/users');
        if (res.success) {
          setUsers(res.users);
        }
      } else if (tab === 'audit') {
        const res = await api.get('/admin/audit-logs?limit=50');
        if (res.success) setAuditLogs(res.logs);
      } else if (tab === 'settings') {
        const res = await api.get('/admin/settings');
        if (res.success && res.settings) setSettings(res.settings);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccessMsg('');
    try {
      const res = await api.put('/admin/settings', settings);
      if (res.success) {
        setSuccessMsg(res.message || 'Settings saved successfully');
        if (res.settings) setSettings(res.settings);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportBackup = async () => {
    setBackingUp(true); setError(''); setSuccessMsg('');
    try {
      const res = await api.get('/admin/backup');
      if (res.success) {
        const blob = new Blob([JSON.stringify(res, null, 2)], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `ems-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setSuccessMsg('Database backup JSON exported successfully.');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBackingUp(false);
    }
  };

  const handleImportBackup = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!window.confirm('WARNING: Restoring database will overwrite all current data. Are you sure you want to proceed?')) {
      e.target.value = '';
      return;
    }

    setRestoring(true); setError(''); setSuccessMsg('');
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const backupData = JSON.parse(evt.target.result);
        const res = await api.post('/admin/restore', backupData);
        if (res.success) {
          setSuccessMsg(res.message || 'Backup restored successfully!');
          setActiveTab('overview');
        }
      } catch (err) {
        setError(err.message || 'Failed to parse or restore backup file.');
      } finally {
        setRestoring(false);
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  useEffect(() => { load(activeTab); }, [activeTab]);

  const handleRoleChange = async (userId) => {
    if (!roleChangeVal) return;
    try {
      const res = await api.put(`/admin/users/${userId}/role`, { role: roleChangeVal });
      if (res.success) {
        setSuccessMsg(`Role updated successfully`);
        setRoleChangeId(null);
        setRoleChangeVal('');
        load('users');
      }
    } catch (e) { setError(e.message); }
  };

  const handleExport = async (type) => {
    setExporting(type);
    try {
      const res = await api.get(`/admin/reports/${type}`);
      if (res.success) {
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `${type}-report-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setSuccessMsg(`${type} report exported (${res.count} records)`);
      }
    } catch (e) { setError(e.message); }
    finally { setExporting(''); }
  };

  // Filter computations
  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.employee && `${u.employee.firstName} ${u.employee.lastName}`.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = log.performedBy?.email?.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.details?.toLowerCase().includes(auditSearch.toLowerCase());
    const matchesAction = auditActionFilter ? log.action === auditActionFilter : true;
    return matchesSearch && matchesAction;
  });

  const uniqueActions = [...new Set(auditLogs.map(l => l.action))];

  return (
    <div className="page-container page-enter">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '14px',
          background: 'linear-gradient(135deg, #6777ef 0%, #3f51b5 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 15px rgba(103,119,239,0.3)',
        }}>
          <ShieldAlert size={22} color="white" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Admin Panel</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            System management, user roles, audit logs &amp; reports
          </p>
        </div>
        <button onClick={() => load(activeTab)} className="btn btn-secondary" style={{ marginLeft: 'auto', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderRadius: '8px', cursor: 'pointer' }}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="alert alert-danger" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {successMsg && (
        <div style={{ padding: '0.75rem 1rem', background: 'var(--success-bg)', color: 'var(--success)', borderRadius: '10px', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', fontWeight: 600, fontSize: '0.9rem', border: '1px solid rgba(46,189,127,0.2)' }}>
          <Check size={16} /> {successMsg}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0' }}>
        {getTabs(user?.role).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setError(''); setSuccessMsg(''); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.75rem 1.25rem',
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: isActive ? '2px solid var(--primary-accent)' : '2px solid transparent',
                marginBottom: '-2px',
                color: isActive ? 'var(--primary-accent)' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.9rem',
                transition: 'all 0.2s',
              }}
            >
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <RefreshCw size={24} className="spin" style={{ animation: 'spin 1.5s linear infinite', marginBottom: '1rem' }} />
          <p>Retrieving panel logs &amp; parameters...</p>
        </div>
      )}

      {/* ═══ TAB: OVERVIEW ═══ */}
      {!loading && activeTab === 'overview' && overview && (
        <>
          {/* Admin Welcome Banner */}
          <div className="card" style={{
            background: 'linear-gradient(135deg, rgba(103,119,239,0.06) 0%, rgba(63,81,181,0.03) 100%)',
            border: '1px solid rgba(103,119,239,0.15)',
            padding: '1.75rem',
            borderRadius: '16px',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '16px',
                background: 'rgba(103,119,239,0.12)', color: 'var(--primary-accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Shield size={26} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>Welcome back, Admin Console!</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                  System security check OK. All node database systems are online and fully synced.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.72rem', fontWeight: 700 }}>SYSTEM TIME</span>
                <strong>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
              </div>
              <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '1.5rem' }}>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.72rem', fontWeight: 700 }}>DATABASE NODE</span>
                <strong style={{ color: 'var(--success)' }}>CONNECTED</strong>
              </div>
            </div>
          </div>

          {/* Premium Stats Grid */}
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '2rem' }}>
            {[
              { label: 'Total Users', value: overview.users.total, color: 'var(--primary-accent)', bg: 'rgba(103,119,239,0.1)', icon: Users, desc: 'Registered system accounts' },
              { label: 'Admin Users', value: overview.users.admin, color: 'var(--danger)', bg: 'rgba(255,91,91,0.1)', icon: ShieldAlert, desc: 'Full system authorization' },
              { label: 'Department Managers', value: overview.users.hr, color: 'var(--warning)', bg: 'rgba(255,177,25,0.1)', icon: UserCog, desc: 'Operational modules permission' },
              { label: 'Employees', value: overview.users.employee, color: 'var(--success)', bg: 'rgba(46,189,127,0.1)', icon: Users, desc: 'Staff portal identities' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="card" style={{ display: 'flex', gap: '1.25rem', padding: '1.5rem', alignItems: 'center' }}>
                  <div style={{
                    padding: '0.75rem', borderRadius: '12px', background: item.bg, color: item.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Icon size={22} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{item.label}</span>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0.1rem 0' }}>{item.value}</h2>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{item.desc}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Two-Column Grid: Distribution and Activity Feed */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 2fr', gap: '2rem', marginBottom: '2rem' }}>
            {/* Left: Role distribution bars */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.5rem' }}>
              <span className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <BarChart3 size={16} style={{ color: 'var(--primary-accent)' }} />
                Account Role Distribution
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1, justifyContent: 'center' }}>
                {[
                  { name: 'Employees', count: overview.users.employee, pct: Math.round((overview.users.employee / (overview.users.total || 1)) * 100), color: 'var(--success)' },
                  { name: 'Department Managers', count: overview.users.hr, pct: Math.round((overview.users.hr / (overview.users.total || 1)) * 100), color: 'var(--warning)' },
                  { name: 'Administrators', count: overview.users.admin, pct: Math.round((overview.users.admin / (overview.users.total || 1)) * 100), color: 'var(--danger)' },
                ].map((role) => (
                  <div key={role.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.4rem' }}>
                      <span style={{ fontWeight: 700 }}>{role.name}</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{role.count} accounts ({role.pct}%)</span>
                    </div>
                    <div style={{ height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${role.pct}%`, height: '100%', background: role.color, borderRadius: '4px' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Recent System Activity Feed */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <span className="chart-title" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={16} style={{ color: 'var(--primary-accent)' }} />
                Recent System Activity
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '240px', overflowY: 'auto' }}>
                {(overview.recentLogs || []).map((log) => (
                  <div key={log._id} style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    padding: '0.65rem 0.85rem', background: 'var(--bg-primary)', borderRadius: '10px',
                    border: '1px solid var(--border-color)'
                  }}>
                    <span style={{
                      fontSize: '0.68rem', fontWeight: 800, padding: '0.2rem 0.6rem',
                      borderRadius: '6px', background: 'rgba(103,119,239,0.12)', color: 'var(--primary-accent)',
                      whiteSpace: 'nowrap', flexShrink: 0, textTransform: 'uppercase'
                    }}>
                      {log.action?.replace(/_/g, ' ')}
                    </span>
                    <span style={{ flex: 1, fontSize: '0.82rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.details}>
                      {log.details || '—'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontStyle: 'italic' }}>
                      {log.performedBy?.email?.split('@')[0] || 'system'} · {timeAgo(log.createdAt)}
                    </span>
                  </div>
                ))}
                {(overview.recentLogs || []).length === 0 && (
                  <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0', fontSize: '0.85rem' }}>No system logs recorded.</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══ TAB: USERS & ROLES ═══ */}
      {!loading && activeTab === 'users' && (
        <>
          {/* User Filtering Console */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                placeholder="Filter users by Username, Email, or Linked Employee name..."
                className="form-control"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                style={{ paddingLeft: '2.3rem', fontSize: '0.88rem' }}
              />
            </div>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
              Showing {filteredUsers.length} of {users.length} registered accounts
            </span>
          </div>

          <div className="table-container">
            <div className="table-header-row">
              <span className="table-title">User Account Registry</span>
            </div>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User identity</th>
                    <th>Email Address</th>
                    <th>System Role</th>
                    <th>Linked Employee Record</th>
                    <th>Registration Date</th>
                    <th>Permissions &amp; Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem' }}>No accounts matching search criteria found.</td></tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const rc = ROLE_COLORS[u.role] || {};
                      const isChanging = roleChangeId === u._id;
                      return (
                        <tr key={u._id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                              <div className="sidebar-footer-avatar" style={{ width: '32px', height: '32px', fontSize: '0.75rem', background: 'linear-gradient(135deg, #6777ef 0%, #3f51b5 100%)', color: 'white', fontWeight: 700, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {(u.username || u.email)?.[0]?.toUpperCase()}
                              </div>
                              <strong style={{ fontSize: '0.9rem' }}>{u.username || '—'}</strong>
                            </div>
                          </td>
                          <td style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>{u.email}</td>
                          <td>
                            <span style={{
                              padding: '0.25rem 0.75rem', borderRadius: '99px',
                              fontSize: '0.72rem', fontWeight: 800,
                              background: rc.bg, color: rc.color, textTransform: 'uppercase',
                              border: `1px solid ${rc.color}20`
                            }}>{u.role}</span>
                          </td>
                          <td style={{ fontSize: '0.85rem' }}>
                            {u.employee ? (
                              <div>
                                <strong>{u.employee.firstName} {u.employee.lastName}</strong>
                                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>ID: {u.employee.employeeId} · {u.employee.designation || 'Unassigned'}</span>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontStyle: 'italic' }}>Unlinked Account</span>
                            )}
                          </td>
                          <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            {new Date(u.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td>
                            {user._id !== u._id ? (
                              isChanging ? (
                                <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                                  <select
                                    value={roleChangeVal}
                                    onChange={(e) => setRoleChangeVal(e.target.value)}
                                    className="form-control"
                                    style={{ padding: '0.3rem 0.5rem', fontSize: '0.82rem', width: '110px', borderRadius: '8px', border: '1px solid var(--primary-accent)' }}
                                  >
                                    <option value="">Select...</option>
                                    <option value="admin">Admin</option>
                                    <option value="hr">HR</option>
                                    <option value="employee">Employee</option>
                                  </select>
                                  <button onClick={() => handleRoleChange(u._id)} className="btn btn-primary btn-icon" style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'var(--success)', color: 'white', cursor: 'pointer' }}>
                                    <Check size={13} />
                                  </button>
                                  <button onClick={() => { setRoleChangeId(null); setRoleChangeVal(''); }} className="btn btn-secondary btn-icon" style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'var(--danger)', color: 'white', cursor: 'pointer' }}>
                                    <X size={13} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => { setRoleChangeId(u._id); setRoleChangeVal(u.role); }}
                                  className="btn btn-secondary"
                                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}
                                >
                                  <UserCog size={13} /> Edit Role
                                </button>
                              )
                            ) : (
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, fontStyle: 'italic' }}>Your Account</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ═══ TAB: AUDIT LOG ═══ */}
      {!loading && activeTab === 'audit' && (
        <>
          {/* Audit Logging Filters */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                placeholder="Filter logs by Email, performer, details, etc..."
                className="form-control"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                style={{ paddingLeft: '2.3rem', fontSize: '0.88rem' }}
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Action Filter:</label>
              <select
                className="form-control"
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
                style={{ width: '180px', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              >
                <option value="">All Actions</option>
                {uniqueActions.map(action => (
                  <option key={action} value={action}>{action?.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>

            {(auditSearch || auditActionFilter) && (
              <button
                onClick={() => {
                  setAuditSearch('');
                  setAuditActionFilter('');
                }}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.82rem', borderRadius: '8px', cursor: 'pointer' }}
              >
                Clear Filters
              </button>
            )}
          </div>

          <div className="table-container">
            <div className="table-header-row">
              <span className="table-title">System Audit Log Trail</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Showing last 50 transactions</span>
            </div>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Details Description</th>
                    <th>Executed By</th>
                    <th>Authorizer Role</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem' }}>No audit transactions logged matching criteria.</td></tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log._id}>
                        <td>
                          <span style={{
                            fontSize: '0.72rem', fontWeight: 800, padding: '0.2rem 0.6rem',
                            borderRadius: '6px', background: 'rgba(103,119,239,0.1)',
                            color: 'var(--primary-accent)', whiteSpace: 'nowrap',
                            textTransform: 'uppercase', border: '1px solid rgba(103,119,239,0.15)'
                          }}>
                            {log.action?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.85rem', maxWidth: '300px', wordBreak: 'break-word' }}>
                          {log.details || '—'}
                        </td>
                        <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>{log.performedBy?.email || '—'}</td>
                        <td>
                          {log.performedBy?.role && (
                            <span style={{
                              fontSize: '0.7rem', fontWeight: 800, padding: '0.15rem 0.5rem',
                              borderRadius: '99px',
                              background: ROLE_COLORS[log.performedBy.role]?.bg,
                              color: ROLE_COLORS[log.performedBy.role]?.color,
                              textTransform: 'uppercase',
                              border: `1px solid ${ROLE_COLORS[log.performedBy.role]?.color}20`
                            }}>{log.performedBy.role}</span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ═══ TAB: REPORTS ═══ */}
      {!loading && activeTab === 'reports' && (
        <>
          <div style={{ marginBottom: '2rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Reports Generator Engine</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.1rem 0 0 0' }}>
              Export system modules snapshots into JSON files for data integration, backup archives, or analytics sheets.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
            {[
              { type: 'employees',  label: 'Employee Directory',  desc: 'All active employee profiles, departments, designations, and salary structures.', hex: '#6777ef', bg: 'rgba(103,119,239,0.08)', btnGradient: 'linear-gradient(135deg, #6777ef 0%, #3f51b5 100%)' },
              { type: 'attendance', label: 'Attendance Records',  desc: 'Clock-in/out stamps, calculated hours, WFH/office codes for the current month.', hex: '#2ebd7f', bg: 'rgba(46,189,127,0.10)',  btnGradient: 'linear-gradient(135deg, #2ebd7f 0%, #1a9e65 100%)' },
              { type: 'payroll',    label: 'Payroll Summary',     desc: 'Gross salary data, statutory deductions, net payments, and payment timestamps.',   hex: '#ffb119', bg: 'rgba(255,177,25,0.10)',  btnGradient: 'linear-gradient(135deg, #ffb119 0%, #e09000 100%)' },
              { type: 'leaves',     label: 'Leave Requests',      desc: 'Annual leaves, medical leaves details along with date intervals and approval records.',    hex: '#00bcd4', bg: 'rgba(0,188,212,0.10)',   btnGradient: 'linear-gradient(135deg, #00bcd4 0%, #0097a7 100%)' },
            ].map((report) => (
              <div key={report.type} className="card" style={{ border: `1px solid ${report.hex}25`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '12px',
                    background: report.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: '1rem',
                  }}>
                    <FileDown size={20} color={report.hex} />
                  </div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.4rem' }}>{report.label}</h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5 }}>{report.desc}</p>
                </div>
                <button
                  onClick={() => handleExport(report.type)}
                  disabled={exporting === report.type}
                  style={{
                    width: '100%',
                    padding: '0.7rem 1rem',
                    background: report.btnGradient,
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: exporting === report.type ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    opacity: exporting === report.type ? 0.7 : 1,
                    boxShadow: `0 4px 12px ${report.hex}30`,
                  }}
                >
                  <FileDown size={15} />
                  {exporting === report.type ? 'Generating snapshot...' : 'Generate JSON Report'}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ═══ TAB: SETTINGS ═══ */}
      {!loading && activeTab === 'settings' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: '2rem', alignItems: 'start' }}>
          {/* Admin System Settings */}
          <div className="card">
            <span className="chart-title" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Shield size={16} style={{ color: 'var(--primary-accent)' }} />
              System Policies &amp; Settings
            </span>
            <form onSubmit={handleSettingsSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-row">
                <div className="form-group">
                  <label>Company Identity Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={settings.companyName || ''}
                    onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Operations Contact Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={settings.contactEmail || ''}
                    onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Standard Office Hours</label>
                  <input
                    type="text"
                    className="form-control"
                    value={settings.businessHours || ''}
                    onChange={(e) => setSettings({ ...settings, businessHours: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Holiday policy Code</label>
                  <input
                    type="text"
                    className="form-control"
                    value={settings.holidayPolicy || ''}
                    onChange={(e) => setSettings({ ...settings, holidayPolicy: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Authorization Layer</label>
                  <input
                    type="text"
                    className="form-control"
                    value={settings.authLevel || ''}
                    onChange={(e) => setSettings({ ...settings, authLevel: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Minimum Allowable Wage ($)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={settings.salaryRuleMin || 0}
                    onChange={(e) => setSettings({ ...settings, salaryRuleMin: parseInt(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginTop: '0.5rem' }}>
                <div>
                  <label style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700 }}>Automatic Database Backups</label>
                  <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Automate daily database JSON replication dumps</span>
                </div>
                <CustomSwitch 
                  checked={settings.enableBackups || false}
                  onChange={(val) => setSettings({ ...settings, enableBackups: val })}
                />
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                <div>
                  <label style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700 }}>Alerts &amp; Email Notifications</label>
                  <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Send automatic notifications upon approvals or role changes</span>
                </div>
                <CustomSwitch 
                  checked={settings.emailNotifications || false}
                  onChange={(val) => setSettings({ ...settings, emailNotifications: val })}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem', alignSelf: 'flex-start', padding: '0.7rem 1.5rem', borderRadius: '8px', cursor: 'pointer' }}>
                Save System Configuration
              </button>
            </form>
          </div>

          {/* Backup & Restore Panel */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
            <span className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Database size={16} style={{ color: 'var(--primary-accent)' }} />
              Database Backup &amp; Recovery
            </span>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Export current database state to a local JSON backup file, or restore active records from a backup JSON snapshot.
            </p>

            {/* Export Section */}
            <div style={{
              border: '1px dashed var(--border-color)',
              borderRadius: '12px',
              padding: '1.5rem',
              textAlign: 'center',
              background: 'rgba(103,119,239,0.02)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <Database size={24} style={{ color: 'var(--primary-accent)', opacity: 0.8 }} />
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0 }}>System Data Export</h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                Generates a JSON file containing all user accounts, employee profiles, department lists, logs, payroll, attendance, and tasks.
              </p>
              <button
                type="button"
                onClick={handleExportBackup}
                disabled={backingUp}
                className="btn btn-primary"
                style={{
                  padding: '0.6rem 1.25rem',
                  fontSize: '0.85rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #6777ef 0%, #3f51b5 100%)',
                  cursor: 'pointer'
                }}
              >
                <FileDown size={14} /> {backingUp ? 'Exporting...' : 'Download Backup JSON'}
              </button>
            </div>

            {/* Import Section */}
            <div style={{
              border: '1px dashed var(--danger)',
              borderRadius: '12px',
              padding: '1.5rem',
              textAlign: 'center',
              background: 'rgba(255,91,91,0.02)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <UploadCloud size={24} style={{ color: 'var(--danger)', opacity: 0.8 }} />
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0 }}>System Data Recovery</h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                Select a valid EMS backup JSON file. <strong>Warning: All active database records will be deleted and overwritten.</strong>
              </p>
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                disabled={restoring}
                style={{ display: 'none' }}
                id="restore-upload-input"
              />
              <label
                htmlFor="restore-upload-input"
                className="btn btn-secondary"
                style={{
                  cursor: 'pointer',
                  padding: '0.6rem 1.25rem',
                  fontSize: '0.85rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  background: 'var(--danger)',
                  color: 'white',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(255,91,91,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  margin: 0
                }}
              >
                <UploadCloud size={14} /> {restoring ? 'Restoring state...' : 'Upload & Restore'}
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
