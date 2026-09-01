import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Users, Plus, Calendar, Check, X, AlertCircle, FileText } from 'lucide-react';

const STATUS_BADGES = {
  'Applied': { bg: 'rgba(103,119,239,0.12)', color: '#6777ef' },
  'Interview Scheduled': { bg: 'rgba(255,177,25,0.12)', color: '#ffb119' },
  'Hired': { bg: 'rgba(46,189,127,0.12)', color: '#2ebd7f' },
  'Rejected': { bg: 'rgba(255,91,91,0.12)', color: '#ff5b5b' },
};

const Recruitment = () => {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [success, setSuccess] = useState('');

  // Add Candidate Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    designation: '',
    notes: '',
  });

  // Schedule State
  const [scheduleId, setScheduleId] = useState(null);
  const [interviewDate, setInterviewDate] = useState('');

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/recruitment');
      if (res.success) setCandidates(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load candidates data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.designation) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setError('');
      setSuccess('');
      const res = await api.post('/recruitment', formData);
      if (res.success) {
        setSuccess('Candidate registered successfully!');
        setFormData({ name: '', email: '', phone: '', designation: '', notes: '' });
        setFormOpen(false);
        fetchCandidates();
      }
    } catch (err) {
      setError(err.message || 'Failed to add candidate');
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      setError('');
      setSuccess('');
      const res = await api.put(`/recruitment/${id}`, { status });
      if (res.success) {
        setSuccess(`Candidate status updated to ${status}`);
        fetchCandidates();
      }
    } catch (err) {
      setError(err.message || 'Failed to update candidate');
    }
  };

  const handleScheduleInterview = async (id) => {
    if (!interviewDate) return;
    try {
      setError('');
      setSuccess('');
      const res = await api.put(`/recruitment/${id}`, { status: 'Interview Scheduled', interviewDate });
      if (res.success) {
        setSuccess('Interview scheduled successfully!');
        setScheduleId(null);
        setInterviewDate('');
        fetchCandidates();
      }
    } catch (err) {
      setError(err.message || 'Failed to schedule interview');
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #6777ef 0%, #3f51b5 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 15px rgba(103,119,239,0.3)',
          }}>
            <Users size={22} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Recruitment Board</h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              Manage hiring process, candidates pool, and schedule interviews
            </p>
          </div>
        </div>

        <button onClick={() => setFormOpen(true)} className="btn btn-primary">
          <Plus size={18} /> Add Candidate
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="alert alert-danger" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {success && (
        <div style={{ padding: '0.75rem 1rem', background: 'var(--success-bg)', color: 'var(--success)', borderRadius: '10px', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
          <Check size={16} /> {success}
        </div>
      )}

      {/* Candidates Board */}
      <div className="table-container">
        <div className="table-header-row">
          <span className="table-title">Candidates Pipeline ({candidates.length})</span>
        </div>
        <div className="data-table-wrapper">
          {loading ? (
            <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading recruitment pipeline...</p>
          ) : candidates.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No candidates registered yet.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Designation</th>
                  <th>Contact info</th>
                  <th>Status</th>
                  <th>Interview details</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => {
                  const badge = STATUS_BADGES[c.status] || { bg: 'var(--border-color)', color: 'var(--text-secondary)' };
                  const isScheduling = scheduleId === c._id;
                  return (
                    <tr key={c._id}>
                      <td>
                        <strong>{c.name}</strong>
                        {c.notes && <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{c.notes}</span>}
                      </td>
                      <td>
                        <strong>{c.designation}</strong>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        <div>{c.email}</div>
                        <div style={{ color: 'var(--text-secondary)' }}>{c.phone || '—'}</div>
                      </td>
                      <td>
                        <span style={{
                          padding: '0.25rem 0.7rem', borderRadius: '99px',
                          fontSize: '0.75rem', fontWeight: 700,
                          background: badge.bg, color: badge.color,
                        }}>{c.status}</span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {c.interviewDate ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--primary-accent)', fontWeight: 600 }}>
                            <Calendar size={14} />
                            {new Date(c.interviewDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)' }}>Not Scheduled</span>
                        )}
                      </td>
                      <td>
                        {isScheduling ? (
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            <input
                              type="datetime-local"
                              value={interviewDate}
                              onChange={(e) => setInterviewDate(e.target.value)}
                              className="form-control"
                              style={{ padding: '0.3rem 0.5rem', fontSize: '0.82rem', width: '170px' }}
                            />
                            <button onClick={() => handleScheduleInterview(c._id)} className="btn btn-primary btn-icon" style={{ width: '30px', height: '30px' }}>
                              <Check size={13} />
                            </button>
                            <button onClick={() => { setScheduleId(null); setInterviewDate(''); }} className="btn btn-secondary btn-icon" style={{ width: '30px', height: '30px' }}>
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {c.status !== 'Hired' && c.status !== 'Rejected' && (
                              <>
                                <button
                                  onClick={() => setScheduleId(c._id)}
                                  className="btn btn-secondary"
                                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                                >
                                  <Calendar size={13} /> Schedule
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(c._id, 'Hired')}
                                  className="btn btn-secondary"
                                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', color: 'var(--success)' }}
                                >
                                  Hire
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(c._id, 'Rejected')}
                                  className="btn btn-secondary btn-icon"
                                  style={{ color: 'var(--danger)', width: '30px', height: '30px' }}
                                >
                                  <X size={14} />
                                </button>
                              </>
                            )}
                            {(c.status === 'Hired' || c.status === 'Rejected') && (
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Archived</span>
                            )}
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

      {/* Add Candidate Modal */}
      {formOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Register Candidate</h3>
              <button className="modal-close-btn" onClick={() => setFormOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label>Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    className="form-control"
                    placeholder="Enter full name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label>Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    className="form-control"
                    placeholder="candidate@example.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label>Phone Number</label>
                  <input
                    type="text"
                    name="phone"
                    className="form-control"
                    placeholder="Contact number"
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label>Target Designation *</label>
                  <input
                    type="text"
                    name="designation"
                    className="form-control"
                    placeholder="e.g. Frontend Engineer"
                    value={formData.designation}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Notes / Remarks</label>
                  <textarea
                    name="notes"
                    rows="3"
                    className="form-control"
                    placeholder="Candidate background, experience details..."
                    value={formData.notes}
                    onChange={handleInputChange}
                    style={{ resize: 'none' }}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setFormOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Register Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Recruitment;
