import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import StatCard from '../components/StatCard';
import {
  FileSpreadsheet, CalendarDays, Check, X, AlertCircle,
  Home, Timer, Activity, CheckCircle, XCircle, LogOut, ClipboardList, AlertTriangle
} from 'lucide-react';
import { SkeletonTableRows, SkeletonStatCard } from '../components/Skeleton';

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';

const getDayCount = (start, end) => {
  const diffMs = new Date(end) - new Date(start);
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;
};

const Avatar = ({ name }) => {
  const initials = name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, var(--primary-accent), #818cf8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: '0.7rem'
    }}>{initials}</div>
  );
};

// Checklist panel shared between Employee exit tab and Manager approvals tab
const ChecklistPanel = ({ resignation, onToggle }) => {
  const done = resignation.handoverChecklist?.filter(i => i.completed).length || 0;
  const total = resignation.handoverChecklist?.length || 0;
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div style={{ marginTop: '0.5rem', padding: '1rem', background: 'var(--bg-primary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
        <span style={{ fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ClipboardList size={15} color="var(--primary-accent)" /> Handover Checklist
        </span>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--success)' }}>{done}/{total} done ({pct}%)</span>
      </div>
      <div style={{ height: 5, background: 'var(--border-color)', borderRadius: '99px', marginBottom: '0.75rem', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--success)', borderRadius: '99px', transition: 'width 0.4s ease' }} />
      </div>
      {resignation.handoverChecklist?.map(item => (
        <div key={item._id} onClick={() => onToggle && onToggle(resignation._id, item._id, !item.completed)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '6px 4px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ width: 20, height: 20, borderRadius: '5px', border: `2px solid ${item.completed ? 'var(--success)' : 'var(--border-color)'}`, background: item.completed ? 'var(--success)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
            {item.completed && <Check size={12} color="white" />}
          </div>
          <span style={{ fontSize: '0.83rem', color: item.completed ? 'var(--text-secondary)' : 'var(--text-primary)', textDecoration: item.completed ? 'line-through' : 'none', flex: 1 }}>{item.item}</span>
          {item.completed && item.completedAt && <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', flexShrink: 0 }}>{fmt(item.completedAt)}</span>}
        </div>
      ))}
    </div>
  );
};

// ─────────────── MANAGER APPROVAL TABS ───────────────
const MGMT_TABS = [
  { key: 'leaves',      label: 'Leave Requests',        icon: FileSpreadsheet },
  { key: 'wfh',         label: 'WFH Logs',              icon: Home },
  { key: 'overtime',    label: 'Overtime Records',       icon: Timer },
  { key: 'corrections', label: 'Attendance Corrections', icon: Activity },
  { key: 'resignations',label: 'Resignations',          icon: LogOut },
];

const ManagerApprovalView = ({ showToast }) => {
  const [tab, setTab] = useState('leaves');
  const [data, setData] = useState({ leaves: [], wfhRequests: [], overtimeRequests: [], attendanceCorrections: [], stats: {} });
  const [teamResignations, setTeamResignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [comment, setComment] = useState('');
  const [processing, setProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [processingRemarks, setProcessingRemarks] = useState({});

  // Resignation Actions States
  const [actionModal, setActionModal] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [expandedResignId, setExpandedResignId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, resignRes] = await Promise.all([
        api.get('/manager/approvals'),
        api.get('/resignations').catch(() => ({ success: false, resignations: [] }))
      ]);
      if (res.success) setData(res);
      if (resignRes.success) setTeamResignations(resignRes.resignations || []);
    } catch (e) { showToast(e.message || 'Failed to load', false); }
    finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  // For leave tab: also support filtering by status (Pending/Approved/Rejected/All)
  const [allLeaves, setAllLeaves] = useState([]);
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const queryStr = statusFilter ? `?status=${statusFilter}` : '';
        const res = await api.get(`/leaves${queryStr}`);
        if (res.success) setAllLeaves(res.leaves || []);
      } catch {}
    };
    fetchAll();
  }, [statusFilter]);

  const handleApprove = async (id) => {
    try {
      const remarks = processingRemarks[id] || '';
      const res = await api.put(`/leaves/${id}/status`, { status: 'Approved', comments: remarks });
      if (res.success) {
        setProcessingRemarks(p => { const n = { ...p }; delete n[id]; return n; });
        const queryStr = statusFilter ? `?status=${statusFilter}` : '';
        const r = await api.get(`/leaves${queryStr}`);
        if (r.success) setAllLeaves(r.leaves || []);
        load();
        showToast('Leave approved!');
      }
    } catch (e) { showToast(e.message || 'Failed', false); }
  };

  const handleReject = async (id) => {
    try {
      const remarks = processingRemarks[id] || '';
      const res = await api.put(`/leaves/${id}/status`, { status: 'Rejected', comments: remarks });
      if (res.success) {
        setProcessingRemarks(p => { const n = { ...p }; delete n[id]; return n; });
        const queryStr = statusFilter ? `?status=${statusFilter}` : '';
        const r = await api.get(`/leaves${queryStr}`);
        if (r.success) setAllLeaves(r.leaves || []);
        load();
        showToast('Leave rejected.');
      }
    } catch (e) { showToast(e.message || 'Failed', false); }
  };

  const openCorrectionModal = (item, status) => {
    const name = `${item.employee?.firstName} ${item.employee?.lastName}`;
    setModal({ type: 'correction', id: item._id, status, name });
    setComment('');
  };

  const confirmCorrection = async () => {
    if (!modal) return;
    setProcessing(true);
    try {
      const res = await api.put(`/manager/approvals/correction/${modal.id}`, { status: modal.status, remarks: comment });
      if (res.success) { showToast(`Correction ${modal.status.toLowerCase()}!`); load(); }
      else showToast(res.message || 'Failed', false);
    } catch (e) { showToast(e.message || 'Server error', false); }
    finally { setProcessing(false); setModal(null); }
  };

  // Resignation Actions
  const processResignAction = async () => {
    if (!actionModal) return;
    try {
      const res = await api.put(`/resignations/${actionModal.id}/status`, { status: actionModal.status, managerFeedback: feedback });
      if (res.success) { showToast(`Resignation ${actionModal.status === 'Approved' ? 'accepted' : 'rejected'}!`); load(); }
      else showToast(res.message || 'Failed', false);
    } catch (e) { showToast(e.message || 'Server error', false); }
    finally { setActionModal(null); setFeedback(''); }
  };

  const toggleCheck = async (resignId, itemId, completed) => {
    try {
      await api.put(`/resignations/${resignId}/checklist/${itemId}`, { completed });
      load();
    } catch (e) { showToast(e.message || 'Failed to update checklist', false); }
  };

  const list = tab === 'wfh' ? data.wfhRequests : tab === 'overtime' ? data.overtimeRequests : data.attendanceCorrections;
  const stats = data.stats || {};
  const pendingResignationsCount = teamResignations.filter(r => r.status === 'Pending').length;

  return (
    <>
      {/* Confirm Correction Modal */}
      {modal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '430px' }}>
            <div className="modal-header">
              <h3 className="modal-title">{modal.status === 'Approved' ? '✅ Approve' : '❌ Reject'} Correction</h3>
              <button className="modal-close-btn" onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                Employee: <strong style={{ color: 'var(--text-primary)' }}>{modal.name}</strong>
              </p>
              <div className="form-group">
                <label>Remarks (optional)</label>
                <textarea className="form-control" rows={3} value={comment} onChange={e => setComment(e.target.value)}
                  placeholder="Add notes..." style={{ resize: 'none' }} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmCorrection} disabled={processing}
                style={{ background: modal.status === 'Approved' ? 'var(--success)' : 'var(--danger)', borderColor: modal.status === 'Approved' ? 'var(--success)' : 'var(--danger)' }}>
                {processing ? 'Processing...' : `Confirm ${modal.status}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resignation Accept/Reject Modal */}
      {actionModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '460px' }}>
            <div className="modal-header">
              <h3 className="modal-title">{actionModal.status === 'Approved' ? '✅ Accept' : '❌ Reject'} Resignation</h3>
              <button className="modal-close-btn" onClick={() => setActionModal(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>Employee: <strong style={{ color: 'var(--text-primary)' }}>{actionModal.name}</strong></p>
              <div className="form-group">
                <label>Manager Feedback / Exit Notes</label>
                <textarea className="form-control" rows={4} value={feedback} onChange={e => setFeedback(e.target.value)} style={{ resize: 'none' }} placeholder="Provide feedback, notes, or reason for exit decision..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setActionModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={processResignAction}
                style={{ background: actionModal.status === 'Approved' ? 'var(--success)' : 'var(--danger)', borderColor: actionModal.status === 'Approved' ? 'var(--success)' : 'var(--danger)' }}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Pending Leaves',      value: stats.pendingLeaves || 0,     color: '#f97316' },
          { label: 'WFH Logs (7d)',        value: stats.wfhCount || 0,          color: 'var(--primary-accent)' },
          { label: 'Overtime Records',     value: stats.overtimeCount || 0,     color: '#8b5cf6' },
          { label: 'Pending Corrections',  value: stats.pendingCorrections || 0, color: 'var(--success)' },
          { label: 'Pending Resignations', value: pendingResignationsCount,     color: 'var(--danger)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ fontSize: '1.7rem', fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tab Bar */}
      <div className="card" style={{ padding: '0.5rem 1rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.25rem', overflowX: 'auto' }}>
          {MGMT_TABS.map(t => {
            const Icon = t.icon;
            const count = t.key === 'leaves' ? (stats.pendingLeaves || 0) : t.key === 'wfh' ? (stats.wfhCount || 0) : t.key === 'overtime' ? (stats.overtimeCount || 0) : t.key === 'corrections' ? (stats.pendingCorrections || 0) : pendingResignationsCount;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`btn ${tab === t.key ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.45rem 1.1rem', fontSize: '0.83rem', display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
                <Icon size={14} /> {t.label}
                {count > 0 && <span style={{ background: tab === t.key ? 'rgba(255,255,255,0.25)' : 'var(--border-color)', borderRadius: '99px', padding: '0 7px', fontSize: '0.7rem', fontWeight: 700 }}>{count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* LEAVE TAB */}
      {tab === 'leaves' && (
        <>
          <div className="card" style={{ marginBottom: '1rem', padding: '0.6rem 1rem' }}>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {[{ v: 'Pending', l: 'Pending' }, { v: 'Approved', l: 'Approved' }, { v: 'Rejected', l: 'Rejected' }, { v: '', l: 'All' }].map(({ v, l }) => (
                <button key={l} onClick={() => setStatusFilter(v)}
                  className={`btn ${statusFilter === v ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.4rem 1rem', fontSize: '0.82rem' }}>{l}</button>
              ))}
            </div>
          </div>

          <div className="table-container">
            <div className="table-header-row">
              <span className="table-title">Employee Leave Applications ({allLeaves.length})</span>
            </div>
            <div className="data-table-wrapper">
              {loading ? <SkeletonTableRows rows={4} cols={7} /> : allLeaves.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No leave requests found.</p>
              ) : (
                <table className="data-table">
                  <thead><tr>
                    <th>Employee</th><th>Leave Type</th><th>Duration</th><th>Days</th><th>Reason</th><th>Status</th><th style={{ minWidth: '220px' }}>Actions</th>
                  </tr></thead>
                  <tbody>
                    {allLeaves.map(leave => {
                      const name = leave.employee ? `${leave.employee.firstName} ${leave.employee.lastName}` : 'N/A';
                      const isPending = leave.status === 'Pending';
                      return (
                        <tr key={leave._id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Avatar name={name} />
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '0.87rem' }}>{name}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{leave.employee?.employeeId}</div>
                              </div>
                            </div>
                          </td>
                          <td><span className="badge badge-info" style={{ fontSize: '0.72rem' }}>{leave.leaveType}</span></td>
                          <td style={{ fontSize: '0.82rem' }}>{fmt(leave.startDate)} → {fmt(leave.endDate)}</td>
                          <td style={{ fontWeight: 700 }}>{getDayCount(leave.startDate, leave.endDate)}d</td>
                          <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{leave.reason}</td>
                          <td><span className={`badge badge-${leave.status.toLowerCase()}`}>{leave.status}</span></td>
                          <td>
                            {isPending ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <input type="text" className="form-control" placeholder="Add comments..."
                                  value={processingRemarks[leave._id] || ''}
                                  onChange={e => setProcessingRemarks(p => ({ ...p, [leave._id]: e.target.value }))}
                                  style={{ fontSize: '0.78rem', padding: '0.3rem 0.5rem' }} />
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                  <button onClick={() => handleApprove(leave._id)} className="btn btn-primary"
                                    style={{ padding: '0.3rem 0.8rem', fontSize: '0.75rem', fontWeight: 700, background: 'var(--success)', borderColor: 'var(--success)', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                                    <Check size={12} /> Approve
                                  </button>
                                  <button onClick={() => handleReject(leave._id)} className="btn btn-secondary"
                                    style={{ padding: '0.3rem 0.8rem', fontSize: '0.75rem', fontWeight: 700, background: 'var(--danger)', borderColor: 'var(--danger)', color: '#fff', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                                    <X size={12} /> Reject
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                {leave.comments ? <em>"{leave.comments}"</em> : '—'}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* WFH / OVERTIME / CORRECTIONS TABS */}
      {tab !== 'leaves' && tab !== 'resignations' && (
        <div className="table-container">
          <div className="table-header-row">
            <span className="table-title">{MGMT_TABS.find(t => t.key === tab)?.label} ({list.length})</span>
          </div>
          <div className="data-table-wrapper">
            {loading ? <SkeletonTableRows rows={4} cols={5} /> : list.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <CheckCircle size={36} style={{ opacity: 0.15, display: 'block', margin: '0 auto 0.75rem' }} />
                <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>No records found.</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    {tab === 'wfh' && <><th>Date</th><th>Clock In</th><th>Clock Out</th><th>Work Mode</th></>}
                    {tab === 'overtime' && <><th>Date</th><th>Total Hours</th><th>Overtime</th><th>Status</th></>}
                    {tab === 'corrections' && <><th>Date</th><th>Requested Time</th><th>Reason</th><th>Status</th><th style={{ minWidth: '160px' }}>Actions</th></>}
                  </tr>
                </thead>
                <tbody>
                  {list.map((item, i) => {
                    const name = `${item.employee?.firstName || ''} ${item.employee?.lastName || ''}`.trim();
                    return (
                      <tr key={i}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Avatar name={name} />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.87rem' }}>{name}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{item.employee?.employeeId}</div>
                            </div>
                          </div>
                        </td>
                        {tab === 'wfh' && (
                          <>
                            <td style={{ fontSize: '0.83rem' }}>{fmt(item.date)}</td>
                            <td style={{ fontWeight: 600, color: 'var(--success)', fontSize: '0.83rem' }}>{fmtTime(item.clockIn)}</td>
                            <td style={{ fontWeight: 600, color: 'var(--danger)', fontSize: '0.83rem' }}>{fmtTime(item.clockOut)}</td>
                            <td><span className="badge badge-info" style={{ fontSize: '0.72rem' }}>WFH</span></td>
                          </>
                        )}
                        {tab === 'overtime' && (
                          <>
                            <td style={{ fontSize: '0.83rem' }}>{fmt(item.date)}</td>
                            <td style={{ fontWeight: 700 }}>{item.totalHours || 0}h</td>
                            <td style={{ fontWeight: 700, color: '#8b5cf6' }}>+{item.overtimeHours || 0}h</td>
                            <td><span className={`badge badge-${(item.status || 'present').toLowerCase()}`}>{item.status || 'Present'}</span></td>
                          </>
                        )}
                        {tab === 'corrections' && (
                          <>
                            <td style={{ fontSize: '0.83rem' }}>{fmt(item.date)}</td>
                            <td style={{ fontSize: '0.83rem', fontWeight: 600 }}>{fmtTime(item.clockIn)} → {fmtTime(item.clockOut)}</td>
                            <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{item.reason}</td>
                            <td><span className={`badge badge-${(item.status || 'pending').toLowerCase()}`}>{item.status}</span></td>
                            <td>
                              {item.status === 'Pending' ? (
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                  <button className="btn btn-primary"
                                    style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem', fontWeight: 700, background: 'var(--success)', borderColor: 'var(--success)', display: 'flex', alignItems: 'center', gap: '3px' }}
                                    onClick={() => openCorrectionModal(item, 'Approved')}>
                                    <Check size={12} /> Approve
                                  </button>
                                  <button className="btn btn-secondary"
                                    style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem', fontWeight: 700, background: 'var(--danger)', borderColor: 'var(--danger)', color: '#fff', display: 'flex', alignItems: 'center', gap: '3px' }}
                                    onClick={() => openCorrectionModal(item, 'Rejected')}>
                                    <X size={12} /> Reject
                                  </button>
                                </div>
                              ) : (
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Processed</span>
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TEAM RESIGNATIONS TAB */}
      {tab === 'resignations' && (
        <div className="table-container">
          <div className="table-header-row">
            <span className="table-title">Team Resignations ({teamResignations.length})</span>
          </div>
          <div className="data-table-wrapper">
            {loading ? <SkeletonTableRows rows={4} cols={8} /> : teamResignations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <CheckCircle size={36} style={{ opacity: 0.15, display: 'block', margin: '0 auto 0.75rem' }} />
                <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>No resignations submitted by team members.</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Last Working Day</th>
                    <th>Reason</th>
                    <th>Submitted</th>
                    <th>Status</th>
                    <th>Checklist</th>
                    <th>Manager Feedback</th>
                    <th style={{ minWidth: '180px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teamResignations.map((r, i) => {
                    const name = `${r.employee?.firstName || ''} ${r.employee?.lastName || ''}`.trim();
                    const done = r.handoverChecklist?.filter(item => item.completed).length || 0;
                    const total = r.handoverChecklist?.length || 0;
                    const isExpanded = expandedResignId === r._id;
                    return (
                      <React.Fragment key={r._id || i}>
                        <tr>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Avatar name={name} />
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '0.87rem' }}>{name}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{r.employee?.employeeId}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ fontWeight: 700, color: 'var(--danger)', fontSize: '0.85rem' }}>{fmt(r.lastWorkingDay)}</td>
                          <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.82rem', color: 'var(--text-secondary)' }} title={r.reason}>{r.reason}</td>
                          <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{fmt(r.resignationDate)}</td>
                          <td><span className={`badge badge-${r.status.toLowerCase()}`}>{r.status}</span></td>
                          <td>
                            <button className="btn btn-secondary" onClick={() => setExpandedResignId(isExpanded ? null : r._id)}
                              style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', fontWeight: 700 }}>
                              {done}/{total} {isExpanded ? '▲' : '▼'}
                            </button>
                          </td>
                          <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.managerFeedback ? <em>"{r.managerFeedback}"</em> : '—'}
                          </td>
                          <td>
                            {r.status === 'Pending' ? (
                              <div style={{ display: 'flex', gap: '0.4rem' }}>
                                <button className="btn btn-primary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, background: 'var(--success)', borderColor: 'var(--success)', display: 'flex', alignItems: 'center', gap: '3px' }}
                                  onClick={() => setActionModal({ id: r._id, status: 'Approved', name })}>
                                  <CheckCircle size={13} /> Accept
                                </button>
                                <button className="btn btn-secondary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, background: 'var(--danger)', borderColor: 'var(--danger)', color: '#fff', display: 'flex', alignItems: 'center', gap: '3px' }}
                                  onClick={() => setActionModal({ id: r._id, status: 'Rejected', name })}>
                                  <XCircle size={13} /> Reject
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Processed</span>
                            )}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={8} style={{ background: 'var(--bg-primary)', padding: '0.75rem 1.5rem' }}>
                              <ChecklistPanel resignation={r} onToggle={toggleCheck} />
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
      )}
    </>
  );
};

// ─────────────── MAIN LEAVES PAGE ───────────────
const Leaves = () => {
  const { user } = useAuth();

  // Toast Alert State
  const [toast, setToast] = useState(null);
  const showToast = useCallback((msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const [leaves, setLeaves] = useState([]);
  const [balances, setBalances] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ leaveType: 'Casual', startDate: '', endDate: '', reason: '' });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Employee exit states
  const [empActiveTab, setEmpActiveTab] = useState('leaves');
  const [myResignation, setMyResignation] = useState(null);
  const [showResignForm, setShowResignForm] = useState(false);
  const [resignForm, setResignForm] = useState({ lastWorkingDay: '', reason: '' });
  const [resignSubmitting, setResignSubmitting] = useState(false);

  const isAdminOrHR = ['admin', 'hr', 'manager'].includes(user?.role);

  const fetchLeaves = async () => {
    try {
      setLoading(true); setError('');
      const data = await api.get('/leaves/my-leaves');
      if (data.success) setLeaves(data.leaves);
    } catch (err) {
      setError(err.message || 'Failed to load leave records');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveBalances = async () => {
    try {
      const data = await api.get('/leaves/balances');
      if (data.success) setBalances(data.balances);
    } catch {}
  };

  const fetchMyResignation = async () => {
    try {
      const myRes = await api.get('/resignations/my');
      if (myRes.success) setMyResignation(myRes.resignation);
    } catch {}
  };

  useEffect(() => {
    if (!isAdminOrHR) {
      fetchLeaves();
      fetchLeaveBalances();
      fetchMyResignation();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    if (!formData.startDate || !formData.endDate || !formData.reason) {
      setFormError('Please fill in all fields'); return;
    }
    try {
      setSubmitting(true); setFormError(''); setFormSuccess('');
      const data = await api.post('/leaves/apply', formData);
      if (data.success) {
        setFormSuccess('Leave application submitted successfully!');
        setFormData({ leaveType: 'Casual', startDate: '', endDate: '', reason: '' });
        fetchLeaves(); fetchLeaveBalances();
      }
    } catch (err) {
      setFormError(err.message || 'Failed to submit application');
    } finally { setSubmitting(false); }
  };

  const submitResignation = async () => {
    if (!resignForm.lastWorkingDay || !resignForm.reason.trim()) {
      showToast('Please fill all fields', false);
      return;
    }
    setResignSubmitting(true);
    try {
      const res = await api.post('/resignations', resignForm);
      if (res.success) {
        showToast('Resignation submitted successfully!');
        setShowResignForm(false);
        fetchMyResignation();
      } else {
        showToast(res.message || 'Failed', false);
      }
    } catch (e) {
      showToast(e.message || 'Server error', false);
    } finally {
      setResignSubmitting(false);
    }
  };

  const handleToggleMyChecklist = async (resignId, itemId, completed) => {
    try {
      await api.put(`/resignations/${resignId}/checklist/${itemId}`, { completed });
      fetchMyResignation();
    } catch {}
  };

  // ── Manager / HR / Admin view: show full approval center ──
  if (isAdminOrHR) {
    return (
      <div className="page-container page-enter">
        {toast && (
          <div className={`alert ${toast.ok ? 'alert-success' : 'alert-danger'}`}
            style={{ position: 'fixed', top: '1.25rem', right: '1.5rem', zIndex: 9999, display: 'flex', gap: '0.5rem', alignItems: 'center', boxShadow: 'var(--shadow-lg)' }}>
            {toast.ok ? <CheckCircle size={15} /> : <AlertCircle size={15} />} {toast.msg}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ width: 48, height: 48, borderRadius: '14px', background: 'linear-gradient(135deg,#f97316,#ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(249,115,22,0.3)' }}>
            <FileSpreadsheet size={22} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Leave & Approvals Center</h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>Manage leaves, WFH logs, overtime records, attendance corrections and resignation requests</p>
          </div>
        </div>
        <ManagerApprovalView showToast={showToast} />
      </div>
    );
  }

  // ── Employee view: apply + history ──
  return (
    <div className="page-container page-enter">
      {/* Toast Alert */}
      {toast && (
        <div className={`alert ${toast.ok ? 'alert-success' : 'alert-danger'}`}
          style={{ position: 'fixed', top: '1.25rem', right: '1.5rem', zIndex: 9999, display: 'flex', gap: '0.5rem', alignItems: 'center', boxShadow: 'var(--shadow-lg)' }}>
          {toast.ok ? <CheckCircle size={15} /> : <AlertCircle size={15} />} {toast.msg}
        </div>
      )}

      {/* Title & Employee Tab Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '14px',
            background: empActiveTab === 'leaves'
              ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
              : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
          }}>
            {empActiveTab === 'leaves' ? <FileSpreadsheet size={22} color="white" /> : <LogOut size={22} color="white" />}
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>
              {empActiveTab === 'leaves' ? 'My Leave Applications' : 'Exit & Resignation Management'}
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              {empActiveTab === 'leaves' ? 'File leave requests and check your holiday/sick balances' : 'Submit exit requests and view transition handover tasks'}
            </p>
          </div>
        </div>

        <div className="card" style={{ padding: '0.4rem', margin: 0, display: 'flex', gap: '0.25rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          {[
            { id: 'leaves', label: 'My Leaves', icon: FileSpreadsheet },
            { id: 'exit', label: 'Exit & Resignation', icon: LogOut }
          ].map(t => {
            const Icon = t.icon;
            const active = empActiveTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setEmpActiveTab(t.id)}
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
      </div>

      {empActiveTab === 'leaves' && (
        <>
          {!balances && loading && (
            <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
              {[0,1,2,3].map(i => <SkeletonStatCard key={i} />)}
            </div>
          )}
          {balances && (
            <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
              <StatCard title="Casual Leave Balance" value={`${balances.Casual?.balance || 0} days`} icon={CalendarDays} color="primary" subText={`Used: ${balances.Casual?.used || 0} / Limit: ${balances.Casual?.limit || 0}`} />
              <StatCard title="Sick Leave Balance" value={`${balances.Sick?.balance || 0} days`} icon={FileSpreadsheet} color="success" subText={`Used: ${balances.Sick?.used || 0} / Limit: ${balances.Sick?.limit || 0}`} />
              <StatCard title={user?.employee?.gender === 'Female' ? 'Maternity Leave' : 'Paternity Leave'}
                value={user?.employee?.gender === 'Female' ? `${balances.Maternity?.balance || 0} days` : `${balances.Paternity?.balance || 0} days`}
                icon={CalendarDays} color="info"
                subText={user?.employee?.gender === 'Female' ? `Used: ${balances.Maternity?.used || 0}` : `Used: ${balances.Paternity?.used || 0}`} />
              <StatCard title="Unpaid Leaves Taken" value={`${balances.Unpaid?.used || 0} days`} icon={FileSpreadsheet} color="danger" subText="Deductions made accordingly" />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }} className="leaves-layout">
            {/* Apply Form */}
            <div className="card" style={{ height: 'fit-content' }}>
              <span className="chart-title" style={{ display: 'block', marginBottom: '1rem' }}>Apply for Leave</span>
              {formError && (
                <div className="alert alert-danger" style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                  <AlertCircle size={17} /> {formError}
                </div>
              )}
              {formSuccess && (
                <div className="alert alert-success" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>{formSuccess}</div>
              )}
              <form onSubmit={handleApplySubmit}>
                <div className="form-group">
                  <label>Leave Category</label>
                  <select className="form-control" value={formData.leaveType} onChange={e => setFormData({ ...formData, leaveType: e.target.value })}>
                    <option value="Casual">Casual Leave</option>
                    <option value="Sick">Sick Leave</option>
                    {user?.employee?.gender === 'Female' ? <option value="Maternity">Maternity Leave</option> : <option value="Paternity">Paternity Leave</option>}
                    <option value="Unpaid">Unpaid Leave</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Start Date</label>
                  <input type="date" className="form-control" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input type="date" className="form-control" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Reason / Explanation</label>
                  <textarea rows="3" className="form-control" placeholder="Provide a valid explanation..." value={formData.reason}
                    onChange={e => setFormData({ ...formData, reason: e.target.value })} style={{ resize: 'none' }} required />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={submitting}>
                  {submitting ? 'Submitting...' : 'File Application'}
                </button>
              </form>
            </div>

            {/* History Table */}
            <div className="table-container" style={{ margin: 0 }}>
              <div className="table-header-row">
                <span className="table-title">Your Leave Requests History</span>
              </div>
              <div className="data-table-wrapper" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                {loading ? <SkeletonTableRows rows={4} cols={6} /> : leaves.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No leave records filed</p>
                ) : (
                  <table className="data-table">
                    <thead><tr>
                      <th>Date Filed</th><th>Leave Type</th><th>Duration</th><th>Days</th><th>Reason</th><th>Status</th><th>Manager Remarks</th>
                    </tr></thead>
                    <tbody>
                      {leaves.map(leave => (
                        <tr key={leave._id}>
                          <td>{fmt(leave.appliedDate)}</td>
                          <td><strong>{leave.leaveType}</strong></td>
                          <td style={{ fontSize: '0.82rem' }}>{fmt(leave.startDate)} → {fmt(leave.endDate)}</td>
                          <td>{getDayCount(leave.startDate, leave.endDate)}d</td>
                          <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{leave.reason}</td>
                          <td><span className={`badge badge-${leave.status.toLowerCase()}`}>{leave.status}</span></td>
                          <td style={{ fontSize: '0.8rem' }}>
                            {leave.comments ? <span style={{ color: 'var(--text-primary)', fontStyle: 'italic' }}>"{leave.comments}"</span> : <span style={{ color: 'var(--text-secondary)' }}>—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {empActiveTab === 'exit' && (
        <div style={{ animation: 'fadeIn 0.4s ease both' }}>
          {myResignation ? (
            <div className="card" style={{ border: `1px solid ${myResignation.status === 'Approved' ? 'rgba(46,189,127,0.3)' : myResignation.status === 'Rejected' ? 'rgba(255,91,91,0.3)' : 'rgba(255,177,25,0.3)'}`, padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ClipboardList size={18} /> Resignation Profile</h3>
                <span className={`badge badge-${myResignation.status.toLowerCase()}`}>{myResignation.status}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div><div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '3px' }}>SUBMITTED ON</div><div style={{ fontWeight: 700 }}>{fmt(myResignation.resignationDate)}</div></div>
                <div><div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '3px' }}>LAST WORKING DAY</div><div style={{ fontWeight: 700, color: 'var(--danger)' }}>{fmt(myResignation.lastWorkingDay)}</div></div>
                <div><div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '3px' }}>REASON</div><div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{myResignation.reason}</div></div>
              </div>
              {myResignation.managerFeedback && (
                <div style={{ padding: '0.6rem 0.9rem', background: 'var(--success-bg)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--success)', marginBottom: '0.5rem' }}>
                  💬 Manager Feedback: <em style={{ color: 'var(--text-primary)' }}>"{myResignation.managerFeedback}"</em>
                </div>
              )}
              <ChecklistPanel resignation={myResignation} onToggle={handleToggleMyChecklist} />
            </div>
          ) : (
            <div className="card" style={{ padding: '2rem', border: '1px solid rgba(239,68,68,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'var(--danger)' }}>
                <AlertTriangle size={24} />
                <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.1rem' }}>File New Resignation</h3>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.25rem', lineHeight: 1.55 }}>
                Submitting resignation is a permanent organizational change. Please ensure you are aware of your minimum 14-day notice period requirements from today. Once confirmed, you can track your transition handover checklist.
              </p>
              
              <div className="form-group" style={{ maxWidth: '300px' }}>
                <label>Last Working Day *</label>
                <input type="date" className="form-control" value={resignForm.lastWorkingDay}
                  min={new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  onChange={e => setResignForm(f => ({ ...f, lastWorkingDay: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Reason for Exit *</label>
                <textarea className="form-control" rows={4} value={resignForm.reason} onChange={e => setResignForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="Describe your primary reason for exit..." style={{ resize: 'none' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button className="btn btn-primary" onClick={submitResignation} disabled={resignSubmitting}
                  style={{ background: 'var(--danger)', borderColor: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <LogOut size={15} /> {resignSubmitting ? 'Submitting...' : 'Confirm Resignation'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {error && <div className="alert alert-danger" style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}><AlertCircle size={16} /> {error}</div>}
    </div>
  );
};

export default Leaves;
