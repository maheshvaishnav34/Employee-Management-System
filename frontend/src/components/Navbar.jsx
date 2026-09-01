import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Sun, Moon, Menu, Bell, Gift, Cake, CheckSquare,
  Megaphone, TrendingUp, Users, Clock, AlertCircle,
  RefreshCw, Zap, ChevronRight, ShieldCheck, Wifi, WifiOff,
  UserCheck
} from 'lucide-react';
import useRealtimeNotifications from '../hooks/useRealtimeNotifications';

/* ─────────────── tiny helpers ───────────────── */
const timeAgo = (ms) => {
  const s = Math.floor(ms / 1000);
  if (s < 5)  return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
};

/* ─────────────── reusable pieces ───────────── */
const PulsingDot = ({ color = '#ff5b5b', size = 10 }) => (
  <span style={{ position: 'relative', display: 'inline-flex', width: size, height: size, flexShrink: 0 }}>
    <span style={{
      position: 'absolute', inset: 0, borderRadius: '50%', background: color,
      animation: 'notif-ping 1.5s ease-out infinite', opacity: 0.55,
    }} />
    <span style={{ width: size, height: size, borderRadius: '50%', background: color, position: 'relative' }} />
  </span>
);

const SectionLabel = ({ icon: Icon, children }) => (
  <div style={{
    fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-secondary)',
    textTransform: 'uppercase', letterSpacing: '0.8px',
    display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem',
  }}>
    {Icon && <Icon size={10} />}
    {children}
  </div>
);

const resolveColor = (color) => {
  if (color && color.startsWith('var(')) {
    const varName = color.slice(4, -1);
    const map = {
      '--primary-accent': '#6777ef',
      '--success': '#2ebd7f',
      '--warning': '#ffb119',
      '--danger': '#ff5b5b',
      '--info': '#00bcd4'
    };
    return map[varName] || '#6777ef';
  }
  return color;
};

const NotifRow = ({ icon: Icon, iconColor, title, subtitle, tag, tagColor, pulse }) => {
  const resolvedIconColor = resolveColor(iconColor);
  const resolvedTagColor = resolveColor(tagColor);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.7rem',
      padding: '0.55rem 0.8rem', borderRadius: 10,
      background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
      cursor: 'default', transition: 'background 0.18s',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-sidebar-active)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-primary)'; }}
    >
      <span style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        background: `${resolvedIconColor}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {pulse
          ? <PulsingDot color={iconColor} size={8} />
          : <Icon size={13} style={{ color: iconColor }} />}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{
          fontSize: '0.78rem', fontWeight: 600, display: 'block',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{title}</span>
        {subtitle && (
          <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{subtitle}</span>
        )}
      </div>
      {tag && (
        <span style={{
          fontSize: '0.6rem', fontWeight: 800, padding: '0.18rem 0.45rem',
          borderRadius: 20, background: `${resolvedTagColor}22`, color: tagColor,
          flexShrink: 0, letterSpacing: '0.3px',
        }}>{tag}</span>
      )}
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, color, alert }) => {
  const resolvedColor = resolveColor(color);
  return (
    <div style={{
      padding: '0.6rem 0.75rem', borderRadius: 10, flex: 1,
      background: `${resolvedColor}10`, border: `1px solid ${resolvedColor}28`,
    }}>
      <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
        <Icon size={10} style={{ color }} />
        {label}
      </div>
      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: alert ? 'var(--danger)' : color }}>
        {value}
      </div>
    </div>
  );
};

/* ─────────────── connection badge ──────────── */
const ConnectionBadge = ({ status }) => {
  const cfg = {
    live:       { color: 'var(--success)', icon: Wifi,    label: 'Live' },
    polling:    { color: 'var(--warning)', icon: WifiOff, label: 'Polling' },
    connecting: { color: 'var(--info)',    icon: Wifi,    label: 'Connecting…' },
    error:      { color: 'var(--danger)',  icon: WifiOff, label: 'Offline' },
  }[status] || { color: 'var(--text-secondary)', icon: WifiOff, label: status };

  const Icon = cfg.icon;
  return (
    <span style={{
      display: 'flex', alignItems: 'center', gap: 4,
      fontSize: '0.65rem', color: cfg.color, fontWeight: 600,
    }}>
      {status === 'live' && <PulsingDot color={cfg.color} size={8} />}
      {(status !== 'live') && <Icon size={10} />}
      {cfg.label}
    </span>
  );
};

/* ═══════════════ NAVBAR ══════════════════════ */
const Navbar = ({ collapsed, setCollapsed }) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const isAuthorized = !!user;

  /* real-time notifications via SSE */
  const { data: notif, connectionStatus, lastUpdated, newAlert, clearNewAlert, refresh } = useRealtimeNotifications(user);

  const [showDropdown, setShowDropdown] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [bellShaking, setBellShaking] = useState(false);
  const dropdownRef = useRef(null);

  /* Shake bell whenever a new alert fires */
  useEffect(() => {
    if (newAlert) {
      setBellShaking(true);
      const t = setTimeout(() => setBellShaking(false), 700);
      return () => clearTimeout(t);
    }
  }, [newAlert]);

  /* Click outside → close dropdown */
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleBellClick = () => {
    setShowDropdown(v => !v);
    clearNewAlert();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setTimeout(() => setRefreshing(false), 600);
  };

  const getPageTitle = () => {
    const p = location.pathname;
    if (p.startsWith('/dashboard'))   return 'Dashboard Analytics';
    if (p.startsWith('/employees'))   return 'Employee Directory';
    if (p.startsWith('/departments')) return 'Department Directory';
    if (p.startsWith('/attendance'))  return 'Attendance Logs';
    if (p.startsWith('/leaves'))      return 'Leave Management';
    if (p.startsWith('/payroll'))     return 'Payroll Board';
    if (p.startsWith('/recruitment')) return 'Recruitment Center';
    if (p.startsWith('/performance')) return 'Performance Reviews';
    if (p.startsWith('/tasks'))       return 'Task Manager';
    if (p.startsWith('/directory'))   return 'Colleague Directory';
    if (p.startsWith('/rewards'))     return 'Rewards & Trophies';
    if (p.startsWith('/self-service')) return 'Employee Self Service';
    if (p.startsWith('/assets'))      return 'Asset Inventory';
    if (p.startsWith('/expenses'))     return 'Expense Claims';
    if (p.startsWith('/shifts'))      return 'Shift Planner';
    if (p.startsWith('/documents'))   return 'Document Vault';
    if (p.startsWith('/chat'))        return 'Team Chatroom';
    if (p.startsWith('/admin'))       return 'Admin Panel';
    if (p.startsWith('/profile'))     return 'My Corporate Profile';
    if (p.startsWith('/reports/standardreport/insummaryreports')) return 'In Summary Report';
    if (p.startsWith('/reports/standardreport/employeedirectory')) return 'Employee Directory Report';
    if (p.startsWith('/reports/standardreport/attendanceaudit')) return 'Attendance Audit Sheet';
    if (p.startsWith('/reports/standardreport/payrollledger')) return 'Payroll Ledger Report';
    if (p.startsWith('/reports/standardreport/leaveallocation')) return 'Leave Allocation Sheet';
    if (p.startsWith('/reports'))     return 'System Reports Console';
    return 'EMS Board';
  };

  /* badge count */
  const totalCount = notif.pendingLeaves + notif.upcomingBirthdays.length + notif.workAnniversaries.length;

  /* smart suggestions */
  const suggestions = [
    notif.pendingLeaves > 3 && {
      id: 's1', icon: AlertCircle,
      text: `${notif.pendingLeaves} leave requests awaiting review`,
      color: 'var(--warning)',
    },
    notif.attendanceRate < 75 && notif.attendanceRate > 0 && {
      id: 's2', icon: TrendingUp,
      text: `Attendance at ${notif.attendanceRate}% — below threshold`,
      color: 'var(--danger)',
    },
    notif.upcomingBirthdays.some(b => b.isToday) && {
      id: 's3', icon: Cake,
      text: 'Send birthday wishes to your team member 🎉',
      color: 'var(--success)',
    },
    notif.newLeaveRequests?.length > 0 && {
      id: 's4', icon: CheckSquare,
      text: `${notif.newLeaveRequests.length} new leave request${notif.newLeaveRequests.length > 1 ? 's' : ''} in last 24h`,
      color: 'var(--info)',
    },
  ].filter(Boolean);

  return (
    <>
      {/* ── CSS Keyframes (injected once) ── */}
      <style>{`
        @keyframes notif-ping {
          0%   { transform: scale(1);   opacity: 0.55; }
          80%  { transform: scale(2.4); opacity: 0;    }
          100% { transform: scale(2.4); opacity: 0;    }
        }
        @keyframes bell-shake {
          0%,100% { transform: rotate(0);    }
          15%     { transform: rotate(18deg); }
          30%     { transform: rotate(-14deg);}
          45%     { transform: rotate(11deg); }
          60%     { transform: rotate(-8deg); }
          75%     { transform: rotate(5deg);  }
        }
        @keyframes dropdown-in {
          from { opacity:0; transform: translateY(-8px) scale(0.97); }
          to   { opacity:1; transform: translateY(0)    scale(1);    }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .bell-shake  { animation: bell-shake 0.65s ease; }
        .spin        { animation: spin 0.5s linear; }
        .dropdown-in { animation: dropdown-in 0.2s cubic-bezier(0.34,1.46,0.64,1) forwards; }
        .notif-scroll::-webkit-scrollbar       { width: 4px; }
        .notif-scroll::-webkit-scrollbar-track { background: transparent; }
        .notif-scroll::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }
        .bell-btn:hover { background: var(--bg-sidebar-active) !important; color: var(--primary-accent) !important; }
      `}</style>

      <header className="navbar" style={{ position: 'relative' }}>
        {/* ── Left ── */}
        <div className="navbar-left">
          <button className="sidebar-toggle-btn" onClick={() => setCollapsed(!collapsed)} title="Toggle Sidebar">
            <Menu size={22} />
          </button>
          <h1 className="navbar-page-title">{getPageTitle()}</h1>
        </div>

        {/* ── Right ── */}
        <div className="navbar-right" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>

          {/* Theme toggle */}
          <button className="theme-toggle-btn" onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}>
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          {/* ── Bell icon (all roles) ── */}
          {isAuthorized && (
            <div ref={dropdownRef} style={{ position: 'relative' }}>

              {/* Bell Button */}
              <button
                id="navbar-notification-bell"
                className="bell-btn"
                onClick={handleBellClick}
                style={{
                  background: showDropdown ? 'var(--bg-sidebar-active)' : 'transparent',
                  border: 'none', cursor: 'pointer',
                  color: showDropdown ? 'var(--primary-accent)' : 'var(--text-secondary)',
                  position: 'relative', display: 'flex', alignItems: 'center',
                  padding: '0.5rem', borderRadius: '50%', transition: 'all 0.2s',
                }}
                title="Notifications & Alerts"
              >
                <Bell size={22} className={bellShaking ? 'bell-shake' : ''} />

                {/* Count badge */}
                {totalCount > 0 && (
                  <span style={{
                    position: 'absolute', top: 4, right: 4,
                    background: 'var(--danger)', color: '#fff',
                    borderRadius: '50%', minWidth: 18, height: 18, padding: '0 2px',
                    fontSize: '0.6rem', fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid var(--bg-secondary)',
                    boxShadow: '0 2px 8px rgba(255,91,91,0.45)',
                  }}>
                    {totalCount > 99 ? '99+' : totalCount}
                  </span>
                )}

                {/* New-alert pulse ring */}
                {newAlert && (
                  <span style={{ position: 'absolute', top: 3, right: 3 }}>
                    <PulsingDot color="var(--danger)" size={9} />
                  </span>
                )}
              </button>

              {/* ── Dropdown Panel ── */}
              {showDropdown && (
                <div
                  className="dropdown-in notif-scroll"
                  style={{
                    position: 'absolute', top: 'calc(100% + 12px)', right: 0,
                    width: 360, maxHeight: 540, overflowY: 'auto',
                    zIndex: 9999,
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 18,
                    boxShadow: 'var(--shadow-lg), 0 0 40px rgba(103,119,239,0.12)',
                    display: 'flex', flexDirection: 'column',
                  }}
                >
                  {/* ── Panel Header ── */}
                  <div style={{
                    padding: '1rem 1.1rem 0.8rem',
                    borderBottom: '1px solid var(--border-color)',
                    background: 'linear-gradient(135deg, rgba(103,119,239,0.07) 0%, transparent 100%)',
                    borderRadius: '18px 18px 0 0',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span style={{
                        width: 34, height: 34, borderRadius: 10,
                        background: 'var(--primary-gradient)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 10px rgba(103,119,239,0.3)',
                      }}>
                        <Bell size={16} color="#fff" />
                      </span>
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, lineHeight: 1.2 }}>
                          Notifications & Alerts
                        </div>
                        <div style={{ fontSize: '0.67rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                          <ConnectionBadge status={connectionStatus} />
                          {lastUpdated && (
                            <span>· updated {timeAgo(Date.now() - lastUpdated)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Refresh button */}
                    <button onClick={handleRefresh} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-secondary)', padding: '0.35rem',
                      borderRadius: 8, display: 'flex', alignItems: 'center',
                      transition: 'color 0.2s',
                    }} title="Refresh now">
                      <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
                    </button>
                  </div>

                  {/* ── Body ── */}
                  <div style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>

                    {/* Quick Stats */}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <StatCard
                        label="Employees" value={notif.totalEmployees}
                        icon={Users} color="var(--primary-accent)"
                      />
                      <StatCard
                        label="Today's Attendance" value={`${notif.attendanceRate}%`}
                        icon={UserCheck}
                        color={notif.attendanceRate >= 75 ? 'var(--success)' : 'var(--danger)'}
                        alert={notif.attendanceRate < 75 && notif.attendanceRate > 0}
                      />
                      <StatCard
                        label="Pending Leaves" value={notif.pendingLeaves}
                        icon={CheckSquare}
                        color={notif.pendingLeaves > 0 ? 'var(--warning)' : 'var(--success)'}
                        alert={notif.pendingLeaves > 3}
                      />
                    </div>

                    {/* Recent new leave requests (last 24h) */}
                    {notif.newLeaveRequests?.length > 0 && (
                      <div>
                        <SectionLabel icon={CheckSquare}>New Requests (24h)</SectionLabel>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          {notif.newLeaveRequests.map((lr) => (
                            <NotifRow
                              key={lr._id}
                              icon={CheckSquare}
                              iconColor="var(--warning)"
                              title={`${lr.employee?.firstName} ${lr.employee?.lastName}`}
                              subtitle={`${lr.leaveType} leave — ${lr.reason?.substring(0, 40)}${lr.reason?.length > 40 ? '…' : ''}`}
                              tag="NEW"
                              tagColor="var(--warning)"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Pending leave summary */}
                    {notif.pendingLeaves > 0 && (
                      <div>
                        <SectionLabel icon={AlertCircle}>Action Required</SectionLabel>
                        <NotifRow
                          icon={CheckSquare}
                          iconColor="var(--warning)"
                          title={`${notif.pendingLeaves} leave request${notif.pendingLeaves !== 1 ? 's' : ''} pending approval`}
                          subtitle="Go to Leave Management to review"
                          tag="PENDING"
                          tagColor="var(--warning)"
                        />
                      </div>
                    )}

                    {/* Birthdays */}
                    {notif.upcomingBirthdays.length > 0 && (
                      <div>
                        <SectionLabel>🎂 Upcoming Birthdays</SectionLabel>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          {notif.upcomingBirthdays.map((emp) => (
                            <NotifRow
                              key={emp._id}
                              icon={Cake}
                              iconColor={emp.isToday ? 'var(--success)' : 'var(--primary-accent)'}
                              title={`${emp.firstName} ${emp.lastName}`}
                              subtitle={emp.department?.name || emp.birthdayDate}
                              tag={emp.isToday ? '🎉 TODAY' : 'SOON'}
                              tagColor={emp.isToday ? 'var(--success)' : 'var(--info)'}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Work Anniversaries */}
                    {notif.workAnniversaries.length > 0 && (
                      <div>
                        <SectionLabel icon={Gift}>Work Anniversaries</SectionLabel>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          {notif.workAnniversaries.map((emp) => (
                            <NotifRow
                              key={emp._id}
                              icon={Gift}
                              iconColor="var(--info)"
                              title={`${emp.firstName} ${emp.lastName}`}
                              subtitle={`${emp.yearsCompleted} year${emp.yearsCompleted !== 1 ? 's' : ''} at the company`}
                              tag="MILESTONE"
                              tagColor="var(--info)"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Smart Suggestions */}
                    {suggestions.length > 0 && (
                      <div>
                        <SectionLabel icon={Zap}>Smart Suggestions</SectionLabel>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          {suggestions.map((s) => {
                            const resolvedSColor = resolveColor(s.color);
                            return (
                              <div key={s.id} style={{
                                display: 'flex', alignItems: 'center', gap: '0.6rem',
                                padding: '0.5rem 0.75rem', borderRadius: 10,
                                background: `${resolvedSColor}0d`, border: `1px solid ${resolvedSColor}25`,
                              }}>
                                <s.icon size={13} style={{ color: s.color, flexShrink: 0 }} />
                                <span style={{ fontSize: '0.73rem', fontWeight: 500, color: s.color, flex: 1 }}>
                                  {s.text}
                                </span>
                                <ChevronRight size={12} style={{ color: s.color, opacity: 0.6, flexShrink: 0 }} />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* HR Announcements */}
                    <div>
                      <SectionLabel icon={Megaphone}>HR Announcements</SectionLabel>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        {[
                          { id: 1, text: 'Clock in before 09:30 AM daily', type: 'warning' },
                          { id: 2, text: 'Submit leave requests 3 days in advance', type: 'info' },
                          { id: 3, text: 'Monthly performance review — 3rd week', type: 'info' },
                        ].map((a) => (
                          <div key={a.id} style={{
                            padding: '0.48rem 0.75rem', borderRadius: 9,
                            background: a.type === 'warning' ? 'var(--warning-bg)' : 'var(--info-bg)',
                            border: `1px solid ${a.type === 'warning' ? 'rgba(255,177,25,0.2)' : 'rgba(0,188,212,0.2)'}`,
                            fontSize: '0.73rem', fontWeight: 500,
                            color: a.type === 'warning' ? 'var(--warning)' : 'var(--info)',
                            display: 'flex', alignItems: 'center', gap: '0.45rem',
                          }}>
                            <Megaphone size={11} style={{ flexShrink: 0 }} />
                            {a.text}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* All-clear */}
                    {totalCount === 0 && notif.newLeaveRequests?.length === 0 && (
                      <div style={{
                        textAlign: 'center', padding: '1.2rem 0',
                        color: 'var(--text-secondary)', fontSize: '0.8rem',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem',
                      }}>
                        <ShieldCheck size={26} style={{ color: 'var(--success)', opacity: 0.75 }} />
                        All clear — no pending notifications
                      </div>
                    )}
                  </div>

                  {/* ── Panel Footer ── */}
                  <div style={{
                    padding: '0.6rem 1rem',
                    borderTop: '1px solid var(--border-color)',
                    borderRadius: '0 0 18px 18px',
                    background: 'linear-gradient(135deg, transparent, rgba(103,119,239,0.04))',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={9} />
                      {connectionStatus === 'live' ? 'Pushed every 10s via SSE' : 'Polling every 10s'}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--primary-accent)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <ShieldCheck size={10} /> Active Staff Portal
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Role badge */}
          <span className="badge badge-pending" style={{ fontSize: '0.78rem', padding: '0.38rem 0.85rem', flexShrink: 0 }}>
            {user?.role?.toUpperCase()}
          </span>
        </div>
      </header>
    </>
  );
};

export default Navbar;
