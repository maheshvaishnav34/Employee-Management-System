import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarDays,
  FileSpreadsheet,
  CircleDollarSign,
  LogOut,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  UserCircle,
  CheckSquare,
  BookUser,
  ConciergeBell,
  Trophy,
  TrendingUp,
  Laptop,
  Receipt,
  CalendarClock,
  FolderClosed,
  MessageSquare,
  FileText,
} from 'lucide-react';

const MENU_COLORS = {
  '/dashboard': '#6777ef',
  '/employees': '#2ebd7f',
  '/departments': '#3ab7e8',
  '/attendance': '#ffb119',
  '/leaves': '#f97316',
  '/payroll': '#10b981',
  '/recruitment': '#8b5cf6',
  '/performance': '#ec4899',
  '/reports': '#06b6d4',
  '/tasks': '#6366f1',
  '/directory': '#3ab7e8',
  '/rewards': '#f59e0b',
  '/self-service': '#14b8a6',
  '/assets': '#3b82f6',
  '/expenses': '#10b981',
  '/shifts': '#f59e0b',
  '/documents': '#6366f1',
  '/chat': '#ec4899',
  '/resignations': '#ef4444',
  '/admin': '#ef4444',
  '/profile': '#a78bfa',
};

const Sidebar = ({ collapsed, setCollapsed }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'hr', 'manager', 'employee'] },
    { path: '/employees', label: 'Employees', icon: Users, roles: ['admin', 'hr', 'manager'] },
    { path: '/departments', label: 'Departments', icon: Building2, roles: ['admin'] },
    { path: '/attendance', label: 'Attendance', icon: CalendarDays, roles: ['admin', 'hr', 'manager', 'employee'] },
    { path: '/leaves', label: 'Leaves', icon: FileSpreadsheet, roles: ['admin', 'hr', 'manager', 'employee'] },
    { path: '/payroll', label: 'Payroll', icon: CircleDollarSign, roles: ['admin', 'hr', 'manager', 'employee'] },
    { path: '/recruitment', label: 'Recruitment', icon: Users, roles: ['admin', 'hr'] },
    { path: '/performance', label: 'Performance', icon: TrendingUp, roles: ['admin', 'hr', 'manager', 'employee'] },
    { path: '/reports', label: 'Reports', icon: FileSpreadsheet, roles: ['admin', 'hr', 'manager'] },
    { path: '/tasks', label: 'Tasks', icon: CheckSquare, roles: ['admin', 'hr', 'manager', 'employee'] },
    { path: '/directory', label: 'Directory', icon: BookUser, roles: ['admin', 'hr', 'manager', 'employee'] },
    { path: '/rewards', label: 'Rewards', icon: Trophy, roles: ['admin', 'hr', 'manager', 'employee'] },
    { path: '/self-service', label: 'Self Service', icon: ConciergeBell, roles: ['admin', 'hr', 'manager', 'employee'] },
    { path: '/assets', label: 'Assets', icon: Laptop, roles: ['admin', 'hr', 'manager', 'employee'] },
    { path: '/expenses', label: 'Expenses', icon: Receipt, roles: ['admin', 'hr', 'manager', 'employee'] },
    { path: '/shifts', label: 'Shift Planner', icon: CalendarClock, roles: ['admin', 'hr', 'manager', 'employee'] },
    { path: '/documents', label: 'Documents', icon: FolderClosed, roles: ['admin', 'hr', 'manager', 'employee'] },
    { path: '/chat', label: 'Team Chat', icon: MessageSquare, roles: ['admin', 'hr', 'manager', 'employee'] },
    { path: '/resignations', label: 'Resignation', icon: FileText, roles: ['admin', 'hr', 'manager', 'employee'] },
    { path: '/admin', label: 'Admin Panel', icon: ShieldAlert, roles: ['admin'], divider: true },
    { path: '/profile', label: 'My Profile', icon: UserCircle, roles: ['admin', 'hr', 'manager', 'employee'], divider: true },
  ];

  const filteredMenu = menuItems.filter((item) => item.roles.includes(user?.role));

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split('.').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <img
          src="/ems_logo.png"
          alt="EMS Hub Logo"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            objectFit: 'cover',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
            flexShrink: 0,
          }}
        />
        {!collapsed && (
          <span className="sidebar-logo-text">EMS Hub</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="sidebar-collapse-btn"
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      {/* Menu Items */}
      <ul className="sidebar-menu">
        {filteredMenu.map((item, idx) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          const showDivider = item.divider && idx > 0;
          const iconColor = MENU_COLORS[item.path] || '#6777ef';

          return (
            <React.Fragment key={item.path}>
              {showDivider && (
                <li style={{ margin: '0.5rem 0.75rem', borderTop: '1px solid var(--border-color)' }} />
              )}
              <li
                className={`sidebar-item ${isActive ? 'active' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <Link to={item.path}>
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: isActive ? `${iconColor}22` : 'transparent',
                    transition: 'background 0.2s ease',
                    flexShrink: 0,
                    color: isActive ? iconColor : 'inherit',
                  }}>
                    <Icon size={18} />
                  </span>
                  {!collapsed && (
                    <span style={{ color: isActive ? iconColor : undefined }}>
                      {item.label}
                    </span>
                  )}
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

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-footer-user">
          <div className="sidebar-footer-avatar" style={{
            background: 'linear-gradient(135deg, #6777ef 0%, #3f51b5 100%)',
            boxShadow: '0 2px 8px rgba(103,119,239,0.35)',
            fontSize: '0.8rem',
          }}>
            {getInitials(user?.username || user?.email)}
          </div>
          {!collapsed && (
            <div className="sidebar-footer-info">
              <span className="sidebar-footer-name">
                {user?.employee
                  ? `${user.employee.firstName} ${user.employee.lastName}`
                  : user?.username || 'Admin User'}
              </span>
              <span className="sidebar-footer-role" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2ebd7f', flexShrink: 0 }} />
                {user?.role === 'admin' ? 'SUPER ADMIN' : user?.role === 'hr' ? 'HR ADMIN' : user?.role?.toUpperCase()}
              </span>
            </div>
          )}
        </div>
        <button onClick={logout} className="logout-btn" title="Sign Out">
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
