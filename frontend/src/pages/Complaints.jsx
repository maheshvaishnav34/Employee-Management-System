import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  LifeBuoy, Plus, CheckCircle, Clock, AlertTriangle, MessageSquare,
  Shield, X, Check, Eye, User, Calendar, FileText, Filter, AlertCircle
} from 'lucide-react';

const PRIORITY_COLORS = {
  Low: { bg: 'rgba(46,189,127,0.12)', color: '#2ebd7f' },
  Medium: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
  High: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  Urgent: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
};

const STATUS_COLORS = {
  Pending: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', icon: Clock },
  'In Review': { bg: 'rgba(103,119,239,0.12)', color: '#6777ef', icon: Eye },
  Resolved: { bg: 'rgba(46,189,127,0.12)', color: '#2ebd7f', icon: CheckCircle },
  Dismissed: { bg: 'rgba(107,114,128,0.12)', color: '#6b7280', icon: X },
};

const Complaints = () => {
  const { user } = useAuth();
  const isHRPlus = ['admin', 'hr', 'manager'].includes(user?.role);
  const isEmployee = user?.role === 'employee';

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Submit Modal
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [submitForm, setSubmitForm] = useState({
    title: '',
    category: 'Workplace Issue',
    priority: 'Medium',
    description: '',
    isAnonymous: false,
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Resolve Modal (for HR/Manager/Admin)
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [resolveForm, setResolveForm] = useState({
    status: 'In Review',
    resolutionNotes: '',
  });
  const [resolveLoading, setResolveLoading] = useState(false);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      setError('');
      // If HR/Admin/Manager, fetch all complaints. If employee, fetch personal complaints.
      const url = isHRPlus ? '/complaints' : '/complaints/my';
      const res = await api.get(url);
      if (res.success) {
        setComplaints(res.complaints);
      }
    } catch (err) {
      setError(err.message || 'Failed to load complaints');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [user?.role]);

  const handleSubmitComplaint = async (e) => {
    e.preventDefault();
    if (!submitForm.title || !submitForm.description) {
      setSubmitError('Please fill in both title and description');
      return;
    }

    try {
      setSubmitLoading(true);
      setSubmitError('');
      const res = await api.post('/complaints', submitForm);
      if (res.success) {
        setSubmitModalOpen(false);
        setSubmitForm({
          title: '',
          category: 'Workplace Issue',
          priority: 'Medium',
          description: '',
          isAnonymous: false,
        });
        fetchComplaints();
      }
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit complaint');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;

    try {
      setResolveLoading(true);
      const res = await api.put(`/complaints/${selectedComplaint._id}/status`, resolveForm);
      if (res.success) {
        setResolveModalOpen(false);
        setSelectedComplaint(null);
        fetchComplaints();
      }
    } catch (err) {
      alert(err.message || 'Failed to update complaint status');
    } finally {
      setResolveLoading(false);
    }
  };

  const filteredComplaints = complaints.filter(c => {
    if (filterStatus === 'all') return true;
    return c.status.toLowerCase() === filterStatus.toLowerCase();
  });

  const pendingCount = complaints.filter(c => c.status === 'Pending').length;
  const inReviewCount = complaints.filter(c => c.status === 'In Review').length;
  const resolvedCount = complaints.filter(c => c.status === 'Resolved').length;

  return (
    <div className="page-container" style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Header Banner */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, rgba(239,68,68,0.06) 0%, rgba(103,119,239,0.03) 100%)',
        border: '1px solid rgba(239,68,68,0.15)',
        padding: '1.5rem',
        borderRadius: '16px',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px',
            background: 'rgba(239,68,68,0.12)', color: '#ef4444',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <LifeBuoy size={26} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>
              {isHRPlus ? 'Workplace Grievances & Support Center' : 'Complaint & Support Desk'}
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
              {isHRPlus
                ? 'Review, investigate, and resolve employee workplace issues, harassment reports, and feedback.'
                : 'Submit confidential workplace issues, check resolution progress, and communicate with HR safely.'}
            </p>
          </div>
        </div>

        <div>
          <button
            onClick={() => setSubmitModalOpen(true)}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', borderRadius: '10px' }}
          >
            <Plus size={16} /> Raise Issue / Complaint
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid-auto-fit-4" style={{ marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(103,119,239,0.1)', color: '#6777ef', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Total Tickets</span>
            <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>{complaints.length}</h3>
          </div>
        </div>

        <div className="card" style={{ padding: '1.1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Pending Review</span>
            <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#f59e0b' }}>{pendingCount}</h3>
          </div>
        </div>

        <div className="card" style={{ padding: '1.1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Eye size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>In Investigation</span>
            <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#3b82f6' }}>{inReviewCount}</h3>
          </div>
        </div>

        <div className="card" style={{ padding: '1.1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(46,189,127,0.1)', color: '#2ebd7f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Resolved</span>
            <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#2ebd7f' }}>{resolvedCount}</h3>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: `All (${complaints.length})` },
          { key: 'pending', label: `Pending (${pendingCount})` },
          { key: 'in review', label: `In Review (${inReviewCount})` },
          { key: 'resolved', label: `Resolved (${resolvedCount})` },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            className={`btn ${filterStatus === tab.key ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.45rem 1rem', fontSize: '0.82rem', borderRadius: '8px' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Complaints List */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <div className="spin" style={{ width: '28px', height: '28px', border: '3px solid var(--border-color)', borderTopColor: 'var(--primary-accent)', borderRadius: '50%', margin: '0 auto 1rem' }} />
          Loading complaint tickets...
        </div>
      ) : error ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--danger)' }}>
          <AlertCircle size={24} style={{ marginBottom: '0.5rem' }} />
          <div>{error}</div>
        </div>
      ) : filteredComplaints.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-secondary)' }}>
          <CheckCircle size={42} style={{ color: 'var(--success)', marginBottom: '0.75rem', display: 'block', margin: '0 auto 0.75rem' }} />
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>No tickets found</h3>
          <p style={{ fontSize: '0.85rem', margin: '0.4rem 0 0 0' }}>
            {filterStatus === 'all' ? 'No complaints have been filed.' : `No complaints with status "${filterStatus}".`}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {filteredComplaints.map((c) => {
            const priorityStyle = PRIORITY_COLORS[c.priority] || PRIORITY_COLORS.Medium;
            const statusStyle = STATUS_COLORS[c.status] || STATUS_COLORS.Pending;
            const StatusIcon = statusStyle.icon;

            return (
              <div
                key={c._id}
                className="card"
                style={{
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  transition: 'all 0.2s ease',
                  borderLeft: `4px solid ${priorityStyle.color}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>{c.title}</h3>
                      <span style={{
                        background: priorityStyle.bg, color: priorityStyle.color,
                        fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.55rem', borderRadius: '6px',
                      }}>
                        {c.priority} Priority
                      </span>
                      <span style={{
                        background: 'rgba(0,0,0,0.05)', color: 'var(--text-secondary)',
                        fontSize: '0.72rem', fontWeight: 600, padding: '0.15rem 0.55rem', borderRadius: '6px',
                      }}>
                        {c.category}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Calendar size={13} /> {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                      {isHRPlus && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <User size={13} />
                          {c.isAnonymous ? (
                            <strong style={{ color: 'var(--warning)' }}>Anonymous Employee</strong>
                          ) : (
                            <strong>{c.employee ? `${c.employee.firstName} ${c.employee.lastName} (${c.employee.employeeId || 'ID'})` : 'Employee'}</strong>
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{
                      display: 'flex', alignItems: 'center', gap: '0.35rem',
                      background: statusStyle.bg, color: statusStyle.color,
                      fontSize: '0.78rem', fontWeight: 700, padding: '0.3rem 0.75rem', borderRadius: '8px',
                    }}>
                      <StatusIcon size={14} /> {c.status}
                    </span>

                    {isHRPlus && (
                      <button
                        onClick={() => {
                          setSelectedComplaint(c);
                          setResolveForm({ status: c.status, resolutionNotes: c.resolutionNotes || '' });
                          setResolveModalOpen(true);
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.8rem', fontSize: '0.78rem' }}
                      >
                        Action / Resolve
                      </button>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p style={{
                  margin: 0, fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.5,
                  background: 'var(--bg-primary)', padding: '0.85rem', borderRadius: '8px',
                }}>
                  {c.description}
                </p>

                {/* Resolution notes banner if resolved/in review */}
                {c.resolutionNotes && (
                  <div style={{
                    background: c.status === 'Resolved' ? 'rgba(46,189,127,0.08)' : 'rgba(103,119,239,0.08)',
                    border: `1px solid ${c.status === 'Resolved' ? 'rgba(46,189,127,0.2)' : 'rgba(103,119,239,0.2)'}`,
                    borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.82rem',
                  }}>
                    <strong style={{ display: 'block', color: c.status === 'Resolved' ? '#2ebd7f' : '#6777ef', marginBottom: '0.2rem' }}>
                      Official HR / Management Feedback:
                    </strong>
                    <span style={{ color: 'var(--text-primary)' }}>{c.resolutionNotes}</span>
                    {c.resolvedBy && (
                      <span style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        Processed by {c.resolvedBy.username || 'HR Officer'} on {c.resolvedAt ? new Date(c.resolvedAt).toLocaleDateString() : ''}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Submit Complaint Modal */}
      {submitModalOpen && createPortal(
        <div className="modal-overlay active" onClick={() => setSubmitModalOpen(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '560px', width: '92%', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-header" style={{ padding: '1.25rem 1.5rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '12px',
                  background: 'rgba(239,68,68,0.12)', color: '#ef4444',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <LifeBuoy size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Submit Workplace Complaint
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Report grievance, harassment, or workplace issues
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSubmitModalOpen(false)}
                style={{
                  background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '50%',
                  width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--text-secondary)', transition: 'all 0.2s'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {submitError && (
              <div style={{ margin: '1rem 1.5rem 0', padding: '0.65rem 0.9rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '8px', fontSize: '0.82rem' }}>
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmitComplaint}>
              <div className="modal-body" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                    SUBJECT / TITLE *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Unresolved overtime calculation / Workplace dispute"
                    value={submitForm.title}
                    onChange={e => setSubmitForm({ ...submitForm, title: e.target.value })}
                    className="form-control"
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                      CATEGORY
                    </label>
                    <select
                      value={submitForm.category}
                      onChange={e => setSubmitForm({ ...submitForm, category: e.target.value })}
                      className="form-control"
                      style={{ width: '100%' }}
                    >
                      <option value="Workplace Issue">Workplace Issue</option>
                      <option value="Harassment">Harassment</option>
                      <option value="Salary/Payroll Issue">Salary/Payroll Issue</option>
                      <option value="Manager Conflict">Manager Conflict</option>
                      <option value="Facility/IT">Facility/IT</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                      PRIORITY
                    </label>
                    <select
                      value={submitForm.priority}
                      onChange={e => setSubmitForm({ ...submitForm, priority: e.target.value })}
                      className="form-control"
                      style={{ width: '100%' }}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                    DESCRIPTION *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe the issue, dates, individuals involved, and any steps already taken..."
                    value={submitForm.description}
                    onChange={e => setSubmitForm({ ...submitForm, description: e.target.value })}
                    className="form-control"
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={submitForm.isAnonymous}
                    onChange={e => setSubmitForm({ ...submitForm, isAnonymous: e.target.checked })}
                    style={{ width: '16px', height: '16px', accentColor: '#ef4444' }}
                  />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                    Submit Anonymously (Hide my identity from department manager)
                  </span>
                </label>
              </div>

              {/* Modal Footer */}
              <div className="modal-footer" style={{ padding: '1.1rem 1.5rem', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setSubmitModalOpen(false)} className="btn btn-secondary" style={{ padding: '0.6rem 1.25rem', borderRadius: '10px', fontSize: '0.85rem' }}>
                  Cancel
                </button>
                <button type="submit" disabled={submitLoading} className="btn btn-primary" style={{ padding: '0.6rem 1.5rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700, background: '#ef4444', border: 'none' }}>
                  {submitLoading ? 'Submitting...' : 'Submit Complaint'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Action / Resolve Modal (HR / Manager / Admin) */}
      {resolveModalOpen && selectedComplaint && createPortal(
        <div className="modal-overlay active" onClick={() => setResolveModalOpen(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '540px', width: '92%', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-header" style={{ padding: '1.25rem 1.5rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '12px',
                  background: 'rgba(103,119,239,0.12)', color: 'var(--primary-accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <Shield size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Process Grievance Ticket
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Record resolution feedback & change ticket status
                  </span>
                </div>
              </div>
              <button
                onClick={() => setResolveModalOpen(false)}
                style={{
                  background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '50%',
                  width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--text-secondary)', transition: 'all 0.2s'
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateStatus}>
              <div className="modal-body" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                <div style={{ padding: '1rem', background: 'linear-gradient(135deg, rgba(103,119,239,0.05) 0%, rgba(239,68,68,0.03) 100%)', border: '1px solid rgba(103,119,239,0.15)', borderRadius: '12px' }}>
                  <strong style={{ fontSize: '0.95rem', display: 'block', color: 'var(--text-primary)' }}>{selectedComplaint.title}</strong>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.35rem 0 0 0', lineHeight: 1.5 }}>
                    {selectedComplaint.description}
                  </p>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                    UPDATE STATUS
                  </label>
                  <select
                    value={resolveForm.status}
                    onChange={e => setResolveForm({ ...resolveForm, status: e.target.value })}
                    className="form-control"
                    style={{ width: '100%' }}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Review">In Review</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Dismissed">Dismissed</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                    RESOLUTION NOTES / MANAGEMENT FEEDBACK
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Document actions taken, mediation results, or next steps communicated to the employee..."
                    value={resolveForm.resolutionNotes}
                    onChange={e => setResolveForm({ ...resolveForm, resolutionNotes: e.target.value })}
                    className="form-control"
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="modal-footer" style={{ padding: '1.1rem 1.5rem', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setResolveModalOpen(false)} className="btn btn-secondary" style={{ padding: '0.6rem 1.25rem', borderRadius: '10px', fontSize: '0.85rem' }}>
                  Cancel
                </button>
                <button type="submit" disabled={resolveLoading} className="btn btn-primary" style={{ padding: '0.6rem 1.5rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700 }}>
                  {resolveLoading ? 'Saving...' : 'Update Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Complaints;
