import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutGrid,
  Users,
  Building2,
  CalendarDays,
  FileSpreadsheet,
  CircleDollarSign,
  LogOut,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  UserCircle,
  CheckSquare,
  BookUser,
  Trophy,
  TrendingUp,
  Laptop,
  Receipt,
  CalendarClock,
  FolderClosed,
  MessageSquare,
  FileText,
  Clock,
  X,
  GraduationCap,
  LifeBuoy,
  Award,
  Sliders,
} from 'lucide-react';

const MENU_COLORS = {
  '/dashboard': '#2563eb',
  '/employees': '#2ebd7f',
  '/departments': '#3ab7e8',
  '/attendance': '#ffb119',
  '/leaves': '#f97316',
  '/payroll': '#10b981',
  '/recruitment': '#8b5cf6',
  '/performance': '#ec4899',
  '/reports': '#06b6d4',
  '/reports/standardreport/insummaryreports': '#fc4b6c',
  '/reports/standardreport/employeedirectory': '#2563eb',
  '/reports/standardreport/attendanceaudit': '#2ebd7f',
  '/reports/standardreport/payrollledger': '#ffb119',
  '/reports/standardreport/leaveallocation': '#00bcd4',
  '/reports/standardreport/productivity': '#8b5cf6',
  '/tasks': '#6366f1',
  '/training': '#8b5cf6',
  '/directory': '#3ab7e8',
  '/rewards': '#f59e0b',
  '/self-service': '#14b8a6',
  '/assets': '#3b82f6',
  '/expenses': '#10b981',
  '/shifts': '#0284c7',
  '/documents': '#6366f1',
  '/complaints': '#ef4444',
  '/chat': '#ec4899',
  '/resignations': '#ef4444',
  '/admin': '#ef4444',
  '/system-policies': '#059669',
  '/profile': '#a78bfa',
};

const Sidebar = ({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isReportsActive = location.pathname.startsWith('/reports');
  const [reportsOpen, setReportsOpen] = useState(() => isReportsActive);

  useEffect(() => {
    if (isReportsActive) {
      setReportsOpen(true);
    }
  }, [location.pathname, isReportsActive]);

  // Exact Employee Management System items in the clean order from the reference design
  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutGrid, roles: ['admin', 'hr', 'manager', 'employee'] },
    { path: '/tasks', label: user?.role === 'employee' ? 'My Tasks' : 'Tasks', icon: CheckSquare, roles: ['admin', 'hr', 'manager', 'employee'] },
    { path: '/leaves', label: user?.role === 'employee' ? 'My Leaves' : 'Leaves', icon: CalendarDays, roles: ['admin', 'hr', 'manager', 'employee'] },
    { path: '/performance', label: 'Performance', icon: Award, roles: ['admin', 'hr', 'manager', 'employee'] },
    { path: '/attendance', label: user?.role === 'employee' ? 'My Attendance' : 'Attendance', icon: Clock, roles: ['admin', 'hr', 'manager', 'employee'] },
    { path: '/employees', label: user?.role === 'manager' ? 'Manage Team' : 'Employees', icon: Users, roles: ['admin', 'hr', 'manager'] },
    {
      path: '/reports',
      label: 'Reports',
      icon: FileSpreadsheet,
      roles: ['admin', 'hr', 'manager'],
      isDropdown: true,
      subItems: [
        { path: '/reports', label: 'All Reports', icon: FileSpreadsheet },
        { path: '/reports/standardreport/insummaryreports', label: 'Attendance Summary', icon: Clock },
        { path: '/reports/standardreport/employeedirectory', label: 'Employee Directory', icon: Users },
        { path: '/reports/standardreport/attendanceaudit', label: 'Attendance Audit', icon: CalendarDays },
        { path: '/reports/standardreport/payrollledger', label: 'Payroll Ledger', icon: CircleDollarSign },
        { path: '/reports/standardreport/leaveallocation', label: 'Leave Allocation', icon: FileText },
        { path: '/reports/standardreport/productivity', label: 'Team Productivity', icon: TrendingUp },
      ],
    },
    { path: '/complaints', label: 'Complaint / Support', icon: LifeBuoy, roles: ['admin', 'hr', 'manager', 'employee'] },
    { path: '/chat', label: 'Team Chat', icon: MessageSquare, roles: ['admin', 'hr', 'manager', 'employee'] },
    { path: '/directory', label: 'Directory', icon: BookUser, roles: ['admin', 'hr', 'manager'] },
    { path: '/shifts', label: user?.role === 'employee' ? 'My Shifts' : user?.role === 'manager' ? 'Work Schedule' : 'Shift Planner', icon: CalendarClock, roles: ['admin', 'hr', 'manager', 'employee'] },
    { path: '/departments', label: 'Departments', icon: Building2, roles: ['admin'] },
    { path: '/payroll', label: user?.role === 'employee' ? 'Salary / Payslip' : 'Payroll', icon: CircleDollarSign, roles: ['admin', 'hr', 'employee'] },
    { path: '/recruitment', label: 'Recruitment', icon: Users, roles: ['admin', 'hr'] },
    { path: '/training', label: 'Training', icon: GraduationCap, roles: ['admin', 'hr', 'manager', 'employee'] },
    { path: '/documents', label: user?.role === 'hr' ? 'HR Policies' : 'Documents', icon: FolderClosed, roles: ['admin', 'hr', 'employee'] },
    { path: '/resignations', label: user?.role === 'hr' ? 'Employee Exit' : 'Resignation', icon: FileText, roles: ['admin', 'hr', 'employee'] },
    { path: '/rewards', label: 'Rewards', icon: Trophy, roles: ['admin'] },
    { path: '/assets', label: 'Assets', icon: Laptop, roles: ['admin'] },
    { path: '/expenses', label: 'Expenses', icon: Receipt, roles: ['admin'] },
    { path: '/system-policies', label: 'Policies & Settings', icon: Sliders, roles: ['admin', 'hr'] },
    { path: '/admin', label: 'Admin Panel', icon: ShieldAlert, roles: ['admin'], divider: true },
    { path: '/profile', label: 'My Profile', icon: UserCircle, roles: ['admin', 'hr', 'manager', 'employee'], divider: true },
  ];

  const filteredMenu = menuItems.filter((item) => item.roles.includes(user?.role));

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split('.').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleLinkClick = () => {
    if (setMobileOpen) {
      setMobileOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="sidebar-backdrop active"
          onClick={() => setMobileOpen && setMobileOpen(false)}
        />
      )}

      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <img
            src="/ems_badge_logo.png"
            alt="EMS Logo"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              objectFit: 'contain',
              filter: 'drop-shadow(0 2px 6px rgba(37, 99, 235, 0.35))',
              flexShrink: 0,
              backgroundColor: '#ffffff',
            }}
          />
          {!collapsed && (
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, lineHeight: 1.15 }}>
              <span className="sidebar-logo-text" style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, letterSpacing: '0.5px' }}>
                EMS
              </span>
              <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                Employee Management
              </span>
            </div>
          )}
          {/* Mobile Close Button */}
          <button
            onClick={() => setMobileOpen && setMobileOpen(false)}
            className="sidebar-mobile-close-btn"
            title="Close Menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Menu Items */}
        <ul className="sidebar-menu">
          {filteredMenu.map((item, idx) => {
            const Icon = item.icon;
            const showDivider = item.divider && idx > 0;

            if (item.isDropdown) {
              const isDropdownActive = location.pathname.startsWith(item.path);

              return (
                <React.Fragment key={item.path}>
                  {showDivider && (
                    <li style={{ margin: '0.5rem 0.75rem', borderTop: '1px solid var(--border-color)' }} />
                  )}
                  <li
                    className="sidebar-item"
                    title={collapsed ? item.label : undefined}
                  >
                    <div
                      onClick={() => {
                        if (collapsed) {
                          setCollapsed(false);
                          setReportsOpen(true);
                        } else {
                          setReportsOpen(!reportsOpen);
                        }
                      }}
                      className={`sidebar-pill-link ${isDropdownActive ? 'active' : ''}`}
                      style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
                    >
                      <Icon size={20} strokeWidth={2} style={{ flexShrink: 0 }} />
                      {!collapsed && (
                        <span style={{ flex: 1 }}>{item.label}</span>
                      )}
                    </div>

                    {/* Dropdown Sub-menu Items */}
                    {!collapsed && reportsOpen && (
                      <ul style={{
                        listStyle: 'none',
                        margin: '0.35rem 0 0.5rem 1.75rem',
                        padding: '0.25rem 0 0.25rem 0.65rem',
                        borderLeft: '2px solid rgba(37, 99, 235, 0.25)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                        animation: 'slideUpFade 0.2s cubic-bezier(0.16, 1, 0.3, 1) both',
                      }}>
                        {item.subItems.map((sub) => {
                          const SubIcon = sub.icon;
                          const isSubActive = location.pathname === sub.path;
                          const subColor = MENU_COLORS[sub.path] || 'var(--primary-accent)';

                          return (
                            <li key={sub.path}>
                              <Link
                                to={sub.path}
                                onClick={handleLinkClick}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.75rem',
                                  padding: '0.48rem 0.75rem',
                                  color: isSubActive ? subColor : 'var(--text-sidebar)',
                                  textDecoration: 'none',
                                  borderRadius: '8px',
                                  fontWeight: isSubActive ? 600 : 500,
                                  fontSize: '0.85rem',
                                  background: isSubActive ? `${subColor}18` : 'transparent',
                                  transition: 'all 0.15s ease',
                                  whiteSpace: 'nowrap',
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSubActive) {
                                    e.currentTarget.style.background = 'var(--sidebar-hover-bg)';
                                    e.currentTarget.style.color = subColor;
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSubActive) {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = 'var(--text-sidebar)';
                                  }
                                }}
                              >
                                <SubIcon size={15} style={{ color: isSubActive ? subColor : 'inherit', flexShrink: 0 }} />
                                <span>{sub.label}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                </React.Fragment>
              );
            }

            const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path + '/'));
            const itemColor = MENU_COLORS[item.path] || 'var(--primary-accent)';

            return (
              <React.Fragment key={item.path}>
                {showDivider && (
                  <li style={{ margin: '0.5rem 0.75rem', borderTop: '1px solid var(--border-color)' }} />
                )}
                <li
                  className="sidebar-item"
                  title={collapsed ? item.label : undefined}
                >
                  <Link
                    to={item.path}
                    onClick={handleLinkClick}
                    className={`sidebar-pill-link ${isActive ? 'active' : ''}`}
                    style={{
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      background: isActive ? `${itemColor}15` : undefined,
                      color: isActive ? itemColor : undefined,
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = `${itemColor}10`;
                        e.currentTarget.style.color = itemColor;
                        const svg = e.currentTarget.querySelector('svg');
                        if (svg) svg.style.color = itemColor;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = '';
                        e.currentTarget.style.color = '';
                        const svg = e.currentTarget.querySelector('svg');
                        if (svg) svg.style.color = '';
                      }
                    }}
                  >
                    <Icon
                      size={20}
                      strokeWidth={2}
                      style={{
                        flexShrink: 0,
                        color: isActive ? itemColor : undefined,
                      }}
                    />
                    {!collapsed && <span>{item.label}</span>}
                    {!collapsed && item.path === '/admin' && (
                      <span style={{
                        marginLeft: 'auto',
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        padding: '0.12rem 0.4rem',
                        borderRadius: '4px',
                        background: 'rgba(255,91,91,0.15)',
                        color: '#ff5b5b',
                      }}>ADMIN</span>
                    )}
                  </Link>
                </li>
              </React.Fragment>
            );
          })}
        </ul>

        {/* Footer: Clean Logout Button matching reference */}
        <div className="sidebar-footer" style={{ padding: '0.75rem 0.85rem', borderTop: '1px solid var(--border-color)' }}>
          <button
            type="button"
            onClick={logout}
            className="sidebar-logout-button"
            title="Logout"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: '0.85rem',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-sidebar, #334155)',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              outline: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
              e.currentTarget.style.color = '#ef4444';
              const icon = e.currentTarget.querySelector('svg');
              if (icon) icon.style.color = '#ef4444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-sidebar, #334155)';
              const icon = e.currentTarget.querySelector('svg');
              if (icon) icon.style.color = 'inherit';
            }}
          >
            <LogOut size={20} strokeWidth={2} style={{ flexShrink: 0 }} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
