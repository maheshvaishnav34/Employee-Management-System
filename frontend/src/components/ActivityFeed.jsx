import React from 'react';
import { UserPlus, FileText, Clock, Edit, Activity } from 'lucide-react';

const iconMap = {
  'CREATE_EMPLOYEE': { icon: UserPlus, color: '#2ebd7f' },
  'CREATE_LEAVE':    { icon: FileText, color: '#6777ef' },
  'APPROVE_LEAVE':   { icon: FileText, color: '#2ebd7f' },
  'REJECT_LEAVE':    { icon: FileText, color: '#ff5b5b' },
  'MARK_ATTENDANCE': { icon: Clock,    color: '#00bcd4' },
  'UPDATE_ATTENDANCE':{ icon: Clock,   color: '#ffb119' },
  'UPDATE_EMPLOYEE': { icon: Edit,     color: '#ffb119' },
  'GENERATE_PAYROLL':{ icon: Activity, color: '#2ebd7f' },
  'CHANGE_ROLE':     { icon: Edit,     color: '#6777ef' },
};

const timeAgo = (date) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const ActivityFeed = ({ logs = [], newEmployees = [] }) => {
  // Merge audit logs + new hire events into unified timeline
  const events = [
    ...logs.map(log => ({
      id: log._id,
      type: log.action,
      text: log.details || log.action.replace(/_/g, ' '),
      who: log.performedBy?.username || log.performedBy?.email || 'System',
      at: log.createdAt,
    })),
    ...newEmployees.map(emp => ({
      id: `emp-${emp._id}`,
      type: 'CREATE_EMPLOYEE',
      text: `${emp.firstName} ${emp.lastName} joined as ${emp.designation}`,
      who: emp.department?.name || 'HR',
      at: emp.createdAt,
    })),
  ].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 10);

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <span className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <Activity size={18} style={{ color: 'var(--primary-accent)' }} />
        Recent Activity
      </span>

      {events.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', margin: 'auto', fontSize: '0.85rem' }}>
          No recent activity
        </p>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0' }}>
          {events.map((event, idx) => {
            const cfg = iconMap[event.type] || { icon: Activity, color: '#78829d' };
            const Icon = cfg.icon;
            const isLast = idx === events.length - 1;
            return (
              <div key={event.id} style={{ display: 'flex', gap: '0.75rem', paddingBottom: isLast ? 0 : '0.75rem' }}>
                {/* Timeline line + dot */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{
                    width: '30px', height: '30px', borderRadius: '50%',
                    background: `${cfg.color}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `2px solid ${cfg.color}40`,
                  }}>
                    <Icon size={13} style={{ color: cfg.color }} />
                  </div>
                  {!isLast && (
                    <div style={{ width: '2px', flex: 1, background: 'var(--border-color)', minHeight: '12px', marginTop: '4px' }} />
                  )}
                </div>
                {/* Content */}
                <div style={{ flex: 1, paddingTop: '0.2rem' }}>
                  <p style={{ fontSize: '0.84rem', fontWeight: 500, marginBottom: '0.15rem', lineHeight: 1.4 }}>
                    {event.text}
                  </p>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    by <strong>{event.who}</strong> · {timeAgo(event.at)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;
