import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  FileText, Plus, Clock, CheckCircle, AlertTriangle,
  X, AlertCircle, Calendar, MessageSquare, Check, RefreshCw,
  User, ClipboardCheck, ArrowRight, ShieldAlert, CheckSquare, Square
} from 'lucide-react';
import { SkeletonTableRows, SkeletonPageHeader } from '../components/Skeleton';

const Resignations = () => {
  const { user } = useAuth();
  const [resignations, setResignations] = useState([]);
  const [myResignation, setMyResignation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters (for Admin/HR/Manager)
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals state
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [selectedResignation, setSelectedResignation] = useState(null);

  // Forms
  const [submitForm, setSubmitForm] = useState({
    lastWorkingDay: '',
    reason: ''
  });
  const [actionForm, setActionForm] = useState({
    status: 'Approved',
    managerFeedback: ''
  });
  const [formError, setFormError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const isHRPlus = ['admin', 'hr', 'manager'].includes(user?.role);
  const isEmployeeOnly = user?.role === 'employee';

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      if (isHRPlus) {
        // Fetch all resignations in team/company
        const res = await api.get('/resignations');
        if (res.success) {
          setResignations(res.resignations);
        }
      }
      
      // Fetch my resignation if user is linked to employee profile
      if (user?.employee) {
        const myRes = await api.get('/resignations/my');
        if (myRes.success) {
          setMyResignation(myRes.resignation);
        }
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleSubmitResignation = async (e) => {
    e.preventDefault();
    if (!submitForm.lastWorkingDay || !submitForm.reason) {
      setFormError('Proposed last working day and reason are required');
      return;
    }
    
    // Check that last working day is in the future
    const selectedDate = new Date(submitForm.lastWorkingDay);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate <= today) {
      setFormError('Last working day must be a future date');
      return;
    }

    try {
      setFormError('');
      setActionLoading(true);
      const res = await api.post('/resignations', submitForm);
      if (res.success) {
        setSubmitModalOpen(false);
        setSubmitForm({ lastWorkingDay: '', reason: '' });
        fetchData();
      }
    } catch (e) {
      setFormError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleActionResignation = async (e) => {
    e.preventDefault();
    try {
      setFormError('');
      setActionLoading(true);
      const res = await api.put(`/resignations/${selectedResignation._id}/status`, actionForm);
      if (res.success) {
        setActionModalOpen(false);
        setActionForm({ status: 'Approved', managerFeedback: '' });
        setSelectedResignation(null);
        fetchData();
      }
    } catch (e) {
      setFormError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleChecklistItem = async (resignationId, itemId, currentCompleted) => {
    try {
      const res = await api.put(`/resignations/${resignationId}/checklist/${itemId}`, {
        completed: !currentCompleted
      });
      if (res.success) {
        // Refresh local state without full reload
        if (myResignation && myResignation._id === resignationId) {
          setMyResignation(res.resignation);
        }
        setResignations(prev => 
          prev.map(r => r._id === resignationId ? res.resignation : r)
        );
      }
    } catch (e) {
      alert(`Error updating checklist item: ${e.message}`);
    }
  };

  // Compute stats
  const stats = resignations.reduce((acc, curr) => {
    acc.total += 1;
    if (curr.status === 'Pending') acc.pending += 1;
    if (curr.status === 'Approved') acc.approved += 1;
    return acc;
  }, { total: 0, pending: 0, approved: 0 });

  const filteredResignations = resignations.filter(res => {
    if (statusFilter === 'All') return true;
    return res.status === statusFilter;
  });

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Approved': return 'badge-approved';
      case 'Rejected': return 'badge-rejected';
      case 'Pending': return 'badge-pending';
      default: return 'badge-secondary';
    }
  };

  return (
    <div className="page-container page-enter">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '14px',
          background: 'linear-gradient(135deg, #ef4444 0%, #f43f5e 100%)',
          display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center',
          boxShadow: '0 4px 15px rgba(239,68,68,0.3)',
        }}>
          <FileText size={22} color="white" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Resignation Clearance</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            {isHRPlus ? 'Review and manage employee resignations & clearance tasks' : 'Submit resignation and complete exit checklist clearance'}
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem' }}>
          <button onClick={fetchData} className="btn btn-secondary btn-icon" title="Refresh data">
            <RefreshCw size={16} />
          </button>
          {!isHRPlus && user?.employee && !myResignation && (
            <button onClick={() => setSubmitModalOpen(true)} className="btn btn-primary" style={{ background: 'var(--primary-gradient)' }}>
              <Plus size={18} /> Submit Resignation
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div>
          <SkeletonPageHeader />
          <SkeletonTableRows />
        </div>
      ) : (
        <>
          {/* Stats Bar for HR/Admin/Manager */}
          {isHRPlus && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1.25rem',
              marginBottom: '2rem'
            }}>
              <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(103,119,239,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6777ef' }}>
                  <FileText size={20} />
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Resignations</span>
                  <h3 style={{ margin: '0.2rem 0 0', fontSize: '1.4rem', fontWeight: 800 }}>{stats.total}</h3>
                </div>
              </div>
              <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,177,25,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffb119' }}>
                  <Clock size={20} />
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Pending Reviews</span>
                  <h3 style={{ margin: '0.2rem 0 0', fontSize: '1.4rem', fontWeight: 800 }}>{stats.pending}</h3>
                </div>
              </div>
              <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(46,189,127,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2ebd7f' }}>
                  <CheckCircle size={20} />
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Approved Exits</span>
                  <h3 style={{ margin: '0.2rem 0 0', fontSize: '1.4rem', fontWeight: 800 }}>{stats.approved}</h3>
                </div>
              </div>
            </div>
          )}

          {/* MAIN PAGE VIEW */}
          {isEmployeeOnly ? (
            myResignation ? (
              /* Single Employee Active Resignation Details */
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '2rem' }}>
                {/* Details Card */}
                <div className="card" style={{ padding: '1.75rem' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 1.25rem 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                    Resignation Details
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>Status</span>
                      <span className={`badge ${getStatusBadgeClass(myResignation.status)}`} style={{ marginTop: '0.25rem', display: 'inline-block' }}>
                        {myResignation.status}
                      </span>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>Submission Date</span>
                      <strong style={{ fontSize: '0.95rem' }}>{new Date(myResignation.resignationDate).toLocaleDateString(undefined, { dateStyle: 'long' })}</strong>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>Proposed Last Working Day</span>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--danger)' }}>{new Date(myResignation.lastWorkingDay).toLocaleDateString(undefined, { dateStyle: 'long' })}</strong>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>Reason for Departure</span>
                      <blockquote style={{
                        margin: '0.5rem 0 0 0',
                        padding: '0.75rem 1rem',
                        background: 'var(--bg-primary)',
                        borderLeft: '4px solid var(--primary-accent)',
                        borderRadius: '0 8px 8px 0',
                        fontSize: '0.9rem',
                        fontStyle: 'italic',
                        color: 'var(--text-primary)',
                        lineHeight: 1.5
                      }}>
                        {myResignation.reason}
                      </blockquote>
                    </div>

                    {myResignation.managerFeedback && (
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>Reviewer Feedback</span>
                        <div style={{
                          marginTop: '0.5rem',
                          padding: '0.85rem 1rem',
                          background: 'rgba(103,119,239,0.08)',
                          border: '1px solid rgba(103,119,239,0.2)',
                          borderRadius: '8px',
                          fontSize: '0.9rem',
                          color: 'var(--text-primary)'
                        }}>
                          {myResignation.managerFeedback}
                        </div>
                      </div>
                    )}

                    {myResignation.approvedBy && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                        Processed by {myResignation.approvedBy.username} on {new Date(myResignation.approvedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Handover & Clearance Checklist Card */}
                <div className="card" style={{ padding: '1.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 1.25rem 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                      Exit Clearance Checklist
                    </h3>
                    <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', borderRadius: '10px', background: 'var(--bg-primary)', color: 'var(--primary-accent)', fontWeight: 600 }}>
                      {myResignation.handoverChecklist.filter(item => item.completed).length} of {myResignation.handoverChecklist.length} Clear
                    </span>
                  </div>

                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.4 }}>
                    Please check off items as you complete them. These changes will update the backend tracker dynamically.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {myResignation.handoverChecklist.map((item) => (
                      <div
                        key={item._id}
                        onClick={() => toggleChecklistItem(myResignation._id, item._id, item.completed)}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '1rem',
                          padding: '1rem',
                          background: item.completed ? 'rgba(46,189,127,0.05)' : 'var(--bg-primary)',
                          border: item.completed ? '1px solid rgba(46,189,127,0.2)' : '1px solid var(--border-color)',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                        className="checklist-item-hover"
                      >
                        <span style={{ color: item.completed ? '#2ebd7f' : 'var(--text-secondary)', flexShrink: 0, marginTop: '2px' }}>
                          {item.completed ? <CheckSquare size={18} /> : <Square size={18} />}
                        </span>
                        <div style={{ flex: 1 }}>
                          <span style={{
                            fontSize: '0.9rem',
                            fontWeight: 500,
                            textDecoration: item.completed ? 'line-through' : 'none',
                            color: item.completed ? 'var(--text-secondary)' : 'var(--text-primary)',
                          }}>
                            {item.item}
                          </span>
                          {item.completed && item.completedAt && (
                            <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                              Completed {new Date(item.completedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* No Active Resignation Panel */
              <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center', maxWidth: '600px', margin: '2rem auto' }}>
                <FileText size={48} style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', opacity: 0.7 }} />
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>No Active Resignation Request</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '2rem' }}>
                  If you are planning to leave the organization, please submit your resignation formal request. You will be provided with an exit handover checklist to complete before your last working day.
                </p>
                {user?.employee ? (
                  <button onClick={() => setSubmitModalOpen(true)} className="btn btn-primary" style={{ background: 'var(--primary-gradient)', padding: '0.75rem 2rem' }}>
                    Initiate Resignation Request
                  </button>
                ) : (
                  <div className="alert alert-warning" style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                    <ShieldAlert size={16} />
                    <span>Your account is not linked to an employee profile. Seeding may be incomplete.</span>
                  </div>
                )}
              </div>
            )
          ) : (
            /* Admin/HR/Manager List View */
            <div className="card">
              {/* Filter Tabs */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--border-color)',
                flexWrap: 'wrap'
              }}>
                {['All', 'Pending', 'Approved', 'Rejected'].map(status => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`btn ${statusFilter === status ? 'btn-primary' : 'btn-secondary'}`}
                    style={{
                      padding: '0.4rem 1rem',
                      fontSize: '0.8rem',
                      borderRadius: '8px',
                      background: statusFilter === status ? undefined : 'transparent',
                      border: statusFilter === status ? undefined : '1px solid var(--border-color)'
                    }}
                  >
                    {status}
                  </button>
                ))}
              </div>

              {/* Table */}
              {filteredResignations.length === 0 ? (
                <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <FileText size={32} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                  <p style={{ margin: 0, fontSize: '0.95rem' }}>No resignation requests found matching filters</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                        <th style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Employee</th>
                        <th style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Submitted Date</th>
                        <th style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Last Working Day</th>
                        <th style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Checklist status</th>
                        <th style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Status</th>
                        <th style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredResignations.map((res) => {
                        const totalItems = res.handoverChecklist?.length || 0;
                        const completedItems = res.handoverChecklist?.filter(item => item.completed).length || 0;
                        
                        return (
                          <tr key={res._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '1rem 1.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                  width: '36px', height: '36px', borderRadius: '50%',
                                  background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: '0.8rem', fontWeight: 600, border: '1px solid var(--border-color)', color: 'var(--primary-accent)'
                                }}>
                                  {res.employee ? `${res.employee.firstName[0]}${res.employee.lastName[0]}` : '??'}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                    {res.employee ? `${res.employee.firstName} ${res.employee.lastName}` : 'Unknown Employee'}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    {res.employee ? res.employee.designation : '-'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '1rem 1.5rem', fontSize: '0.9rem' }}>
                              {new Date(res.resignationDate).toLocaleDateString()}
                            </td>
                            <td style={{ padding: '1rem 1.5rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--danger)' }}>
                              {new Date(res.lastWorkingDay).toLocaleDateString()}
                            </td>
                            <td style={{ padding: '1rem 1.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ flex: 1, height: '6px', background: 'var(--bg-primary)', borderRadius: '3px', overflow: 'hidden', minWidth: '80px' }}>
                                  <div style={{
                                    height: '100%',
                                    width: `${totalItems ? (completedItems / totalItems) * 100 : 0}%`,
                                    background: completedItems === totalItems ? 'var(--success)' : 'var(--primary-accent)',
                                    transition: 'width 0.3s ease'
                                  }} />
                                </div>
                                <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                  {completedItems}/{totalItems}
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: '1rem 1.5rem' }}>
                              <span className={`badge ${getStatusBadgeClass(res.status)}`}>
                                {res.status}
                              </span>
                            </td>
                            <td style={{ padding: '1rem 1.5rem' }}>
                              <button
                                onClick={() => { setSelectedResignation(res); setActionForm({ status: res.status === 'Pending' ? 'Approved' : res.status, managerFeedback: res.managerFeedback || '' }); setActionModalOpen(true); }}
                                className="btn btn-secondary"
                                style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                              >
                                View / Review
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Submit Resignation Modal (Employee Only) */}
      {submitModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Submit Exit Request</h3>
              <button className="modal-close-btn" onClick={() => setSubmitModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmitResignation}>
              <div className="modal-body">
                {formError && (
                  <div className="alert alert-danger" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <AlertCircle size={16} />
                    <span>{formError}</span>
                  </div>
                )}
                
                <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
                    Proposed Last Working Day *
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={submitForm.lastWorkingDay}
                    onChange={e => setSubmitForm({ ...submitForm, lastWorkingDay: e.target.value })}
                    required
                  />
                  <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem', fontSize: '0.75rem' }}>
                    Please select your proposed final date of employment.
                  </small>
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
                    Reason for Resignation *
                  </label>
                  <textarea
                    rows="4"
                    className="form-control"
                    placeholder="Briefly describe your reasons for leaving and/or transition comments..."
                    style={{ resize: 'none' }}
                    value={submitForm.reason}
                    onChange={e => setSubmitForm({ ...submitForm, reason: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setSubmitModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Resignation Modal (Admin/HR/Manager) */}
      {actionModalOpen && selectedResignation && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Review Exit Request</h3>
              <button className="modal-close-btn" onClick={() => { setActionModalOpen(false); setSelectedResignation(null); }}><X size={20} /></button>
            </div>
            <form onSubmit={handleActionResignation}>
              <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                {formError && (
                  <div className="alert alert-danger" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <AlertCircle size={16} />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Profile detail */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-primary)', padding: '1rem', borderRadius: '10px', marginBottom: '1.25rem' }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '50%',
                    background: 'var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary-accent)'
                  }}>
                    {selectedResignation.employee ? `${selectedResignation.employee.firstName[0]}${selectedResignation.employee.lastName[0]}` : '??'}
                  </div>
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.95rem' }}>
                      {selectedResignation.employee ? `${selectedResignation.employee.firstName} ${selectedResignation.employee.lastName}` : 'Unknown Employee'}
                    </strong>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      ID: {selectedResignation.employee?.employeeId} | {selectedResignation.employee?.designation}
                    </span>
                  </div>
                </div>

                {/* Request details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Submitted On</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{new Date(selectedResignation.resignationDate).toLocaleDateString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Requested Last Day</span>
                    <strong style={{ color: 'var(--danger)' }}>{new Date(selectedResignation.lastWorkingDay).toLocaleDateString(undefined, { dateStyle: 'medium' })}</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Reason:</span>
                    <blockquote style={{
                      margin: 0, padding: '0.75rem 1rem', background: 'var(--bg-primary)',
                      borderLeft: '3px solid var(--primary-accent)', borderRadius: '0 8px 8px 0',
                      fontSize: '0.88rem', fontStyle: 'italic', lineHeight: 1.4
                    }}>
                      {selectedResignation.reason}
                    </blockquote>
                  </div>
                </div>

                {/* Checklist Section */}
                <div style={{ marginBottom: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', justifySelf: 'start', justifyContent: 'space-between', width: '100%' }}>
                    <span>Clearance Handover Checklist</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                      {selectedResignation.handoverChecklist?.filter(item => item.completed).length || 0} of {selectedResignation.handoverChecklist?.length || 0} Complete
                    </span>
                  </h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {selectedResignation.handoverChecklist?.map((item) => (
                      <div
                        key={item._id}
                        onClick={() => toggleChecklistItem(selectedResignation._id, item._id, item.completed)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.6rem 0.85rem',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '0.82rem'
                        }}
                      >
                        <span style={{ color: item.completed ? '#2ebd7f' : 'var(--text-secondary)', display: 'flex' }}>
                          {item.completed ? <CheckSquare size={16} /> : <Square size={16} />}
                        </span>
                        <span style={{ textDecoration: item.completed ? 'line-through' : 'none', color: item.completed ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                          {item.item}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions Form (If request is Pending or review feedback needs updates) */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                  {selectedResignation.status === 'Pending' ? (
                    <>
                      <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
                          Select Review Action *
                        </label>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                            <input
                              type="radio"
                              name="actionStatus"
                              checked={actionForm.status === 'Approved'}
                              onChange={() => setActionForm({ ...actionForm, status: 'Approved' })}
                            />
                            Approve Departure
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                            <input
                              type="radio"
                              name="actionStatus"
                              checked={actionForm.status === 'Rejected'}
                              onChange={() => setActionForm({ ...actionForm, status: 'Rejected' })}
                            />
                            Reject request
                          </label>
                        </div>
                      </div>

                      <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
                          Feedback / Comments
                        </label>
                        <textarea
                          rows="3"
                          className="form-control"
                          placeholder="Provide review feedback or checklist instructions..."
                          style={{ resize: 'none' }}
                          value={actionForm.managerFeedback}
                          onChange={e => setActionForm({ ...actionForm, managerFeedback: e.target.value })}
                        />
                      </div>
                    </>
                  ) : (
                    <div style={{ padding: '0.75rem 1rem', background: 'rgba(103,119,239,0.05)', borderRadius: '8px', fontSize: '0.85rem' }}>
                      <ShieldAlert size={14} style={{ marginRight: '0.5rem', display: 'inline', verticalAlign: 'middle', color: 'var(--primary-accent)' }} />
                      <span>This request is already <strong>{selectedResignation.status}</strong> and cannot be updated.</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setActionModalOpen(false); setSelectedResignation(null); }}>
                  Close
                </button>
                {selectedResignation.status === 'Pending' && (
                  <button type="submit" className="btn btn-primary" disabled={actionLoading} style={{ background: actionForm.status === 'Rejected' ? 'var(--danger)' : undefined }}>
                    {actionLoading ? 'Processing...' : `Submit ${actionForm.status}`}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Resignations;
