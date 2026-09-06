import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  UserPlus, CircleDollarSign, CheckCircle, FileDown,
  CalendarPlus, ClipboardList, Zap, Users
} from 'lucide-react';

const QuickActions = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Keep only the main / most essential high-frequency actions per role
  const allActions = [
    // ── Admin / HR: 5 Main Core Actions ──
    { label: 'Add Employee',    icon: UserPlus,         color: '#2563eb', bg: 'rgba(37,99,235,0.1)',   path: '/employees',  roles: ['admin', 'hr'] },
    { label: 'Run Payroll',     icon: CircleDollarSign, color: '#10b981', bg: 'rgba(16,185,129,0.1)',  path: '/payroll',    roles: ['admin', 'hr'] },
    { label: 'Approve Leaves',  icon: CheckCircle,      color: '#2ebd7f', bg: 'rgba(46,189,127,0.1)',  path: '/leaves',     roles: ['admin', 'hr'] },
    { label: 'Attendance Logs', icon: CalendarPlus,     color: '#00bcd4', bg: 'rgba(0,188,212,0.1)',   path: '/attendance', roles: ['admin', 'hr'] },
    { label: 'View Reports',    icon: FileDown,         color: '#ff7043', bg: 'rgba(255,112,67,0.1)',  path: '/reports',    roles: ['admin', 'hr'] },

    // ── Department Manager: 5 Main Core Actions ──
    { label: 'Manage Team',     icon: Users,            color: '#2563eb', bg: 'rgba(37,99,235,0.1)',   path: '/employees',  roles: ['manager'] },
    { label: 'Approve Leaves',  icon: CheckCircle,      color: '#2ebd7f', bg: 'rgba(46,189,127,0.1)',  path: '/leaves',     roles: ['manager'] },
    { label: 'Assign Tasks',    icon: ClipboardList,    color: '#6366f1', bg: 'rgba(99,102,241,0.1)',  path: '/tasks',      roles: ['manager'] },
    { label: 'Team Attendance', icon: CalendarPlus,     color: '#00bcd4', bg: 'rgba(0,188,212,0.1)',   path: '/attendance', roles: ['manager'] },
    { label: 'Team Reports',    icon: FileDown,         color: '#ff7043', bg: 'rgba(255,112,67,0.1)',  path: '/reports',    roles: ['manager'] },

    // ── Employee: 4 Main Core Daily Actions ──
    { label: 'Mark Attendance', icon: CalendarPlus,     color: '#00bcd4', bg: 'rgba(0,188,212,0.1)',   path: '/attendance', roles: ['employee'] },
    { label: 'Apply Leave',     icon: CheckCircle,      color: '#2ebd7f', bg: 'rgba(46,189,127,0.1)',  path: '/leaves',     roles: ['employee'] },
    { label: 'My Tasks',        icon: ClipboardList,    color: '#6366f1', bg: 'rgba(99,102,241,0.1)',  path: '/tasks',      roles: ['employee'] },
    { label: 'My Payslip',      icon: CircleDollarSign, color: '#10b981', bg: 'rgba(16,185,129,0.1)',  path: '/payroll',    roles: ['employee'] },
  ];

  const actions = allActions.filter((a) => a.roles.includes(user?.role));

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <Zap size={16} style={{ color: 'var(--warning)' }} />
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Quick Actions
        </span>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.label}
              onClick={() => navigate(a.path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.55rem 1.15rem',
                background: a.bg,
                border: `1px solid ${a.color}35`,
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: a.color,
                transition: 'all 0.18s ease',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 4px 12px ${a.color}25`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <Icon size={16} />
              {a.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuickActions;
