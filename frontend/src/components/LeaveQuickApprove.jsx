import React, { useState } from 'react';
import { CheckCircle, XCircle, FileText, Loader } from 'lucide-react';
import { api } from '../utils/api';

const LeaveQuickApprove = ({ leaves = [], onUpdate }) => {
  const [loadingId, setLoadingId] = useState(null);
  const [done, setDone] = useState({});

  const handleAction = async (leaveId, action) => {
    setLoadingId(leaveId);
    try {
      await api.put(`/leaves/${leaveId}/status`, { status: action });
      setDone(prev => ({ ...prev, [leaveId]: action }));
      if (onUpdate) setTimeout(onUpdate, 600);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingId(null);
    }
  };

  const pending = leaves.filter(l => !done[l._id]);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      <span className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <FileText size={18} style={{ color: 'var(--warning)' }} />
        Leave Quick Approve
        {pending.length > 0 && (
          <span style={{
            marginLeft: 'auto', background: 'var(--warning-bg)', color: 'var(--warning)',
            fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '99px',
          }}>
            {pending.length} pending
          </span>
        )}
      </span>

      {pending.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          <CheckCircle size={28} style={{ color: 'var(--success)', marginBottom: '0.5rem', display: 'block', margin: '0 auto 0.5rem' }} />
          All leaves reviewed! ✓
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', overflowY: 'auto', maxHeight: '280px' }}>
          {pending.map((leave) => {
            const isLoading = loadingId === leave._id;
            const wasHandled = done[leave._id];
            return (
              <div key={leave._id} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.6rem 0.85rem',
                background: wasHandled
                  ? (wasHandled === 'Approved' ? 'var(--success-bg)' : 'var(--danger-bg)')
                  : 'var(--bg-primary)',
                border: `1px solid ${wasHandled ? (wasHandled === 'Approved' ? 'rgba(46,189,127,0.2)' : 'rgba(255,91,91,0.2)') : 'var(--border-color)'}`,
                borderRadius: '10px',
                transition: 'all 0.3s ease',
              }}>
                {/* Avatar */}
                <div className="sidebar-footer-avatar" style={{ width: '32px', height: '32px', fontSize: '0.72rem', flexShrink: 0 }}>
                  {leave.employee?.firstName?.[0]}{leave.employee?.lastName?.[0]}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ fontSize: '0.87rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {leave.employee?.firstName} {leave.employee?.lastName}
                  </strong>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                    {leave.leaveType} · {new Date(leave.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    {' – '}{new Date(leave.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                </div>

                {isLoading ? (
                  <Loader size={18} style={{ color: 'var(--text-secondary)', animation: 'spin 1s linear infinite' }} />
                ) : wasHandled ? (
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.5rem',
                    borderRadius: '6px',
                    background: wasHandled === 'Approved' ? 'var(--success-bg)' : 'var(--danger-bg)',
                    color: wasHandled === 'Approved' ? 'var(--success)' : 'var(--danger)',
                  }}>
                    {wasHandled}
                  </span>
                ) : (
                  <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                    <button
                      onClick={() => handleAction(leave._id, 'Approved')}
                      title="Approve"
                      style={{
                        width: '30px', height: '30px', borderRadius: '8px', border: 'none',
                        background: 'var(--success-bg)', color: 'var(--success)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--success)'; e.currentTarget.style.color = 'white'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'var(--success-bg)'; e.currentTarget.style.color = 'var(--success)'; }}
                    >
                      <CheckCircle size={15} />
                    </button>
                    <button
                      onClick={() => handleAction(leave._id, 'Rejected')}
                      title="Reject"
                      style={{
                        width: '30px', height: '30px', borderRadius: '8px', border: 'none',
                        background: 'var(--danger-bg)', color: 'var(--danger)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger)'; e.currentTarget.style.color = 'white'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'var(--danger-bg)'; e.currentTarget.style.color = 'var(--danger)'; }}
                    >
                      <XCircle size={15} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LeaveQuickApprove;
