import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  UserPlus, CircleDollarSign, CheckCircle, FileDown,
  CalendarPlus, ClipboardList, Zap, Users,
} from 'lucide-react';

const QuickActions = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const allActions = [
    { label: 'Add Employee',    icon: UserPlus,        color: '#6777ef', bg: 'rgba(103,119,239,0.1)', path: '/employees', roles: ['admin', 'hr'] },
    { label: 'Team Directory',  icon: Users,           color: '#6777ef', bg: 'rgba(103,119,239,0.1)', path: '/employees', roles: ['manager'] },
    { label: 'Approve Leaves',  icon: CheckCircle,     color: '#2ebd7f', bg: 'rgba(46,189,127,0.1)',  path: '/leaves',    roles: ['admin', 'hr', 'manager'] },
    { label: 'Mark Attendance', icon: CalendarPlus,    color: '#00bcd4', bg: 'rgba(0,188,212,0.1)',   path: '/attendance',roles: ['admin', 'hr', 'manager'] },
    { label: 'Assign Tasks',    icon: ClipboardList,   color: '#ab47bc', bg: 'rgba(171,71,188,0.1)',  path: '/tasks',     roles: ['manager'] },
    { label: 'Run Payroll',     icon: CircleDollarSign,color: '#ffb119', bg: 'rgba(255,177,25,0.1)',  path: '/payroll',   roles: ['admin', 'hr'] },
    { label: 'View Reports',    icon: FileDown,        color: '#ff7043', bg: 'rgba(255,112,67,0.1)',  path: '/admin',     roles: ['admin'] },
    { label: 'Departments',     icon: ClipboardList,   color: '#ab47bc', bg: 'rgba(171,71,188,0.1)',  path: '/departments',roles: ['admin'] },
  ];

  const actions = allActions.filter(a => a.roles.includes(user?.role));

  return (
    <div style={{ marginBottom: '1.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
        <Zap size={16} style={{ color: 'var(--warning)' }} />
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.55rem 1.1rem',
                background: a.bg,
                border: `1px solid ${a.color}30`,
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: a.color,
                transition: 'all 0.18s ease',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 4px 12px ${a.color}25`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <Icon size={15} />
              {a.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuickActions;
