import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  Receipt, Plus, DollarSign, Clock, CheckCircle, AlertTriangle,
  X, AlertCircle, Calendar, FileText, Check, Trash2, RefreshCw
} from 'lucide-react';
import { SkeletonBlock } from '../components/Skeleton';

const CATEGORY_COLORS = {
  Travel: '#3b82f6',
  'Office Supplies': '#6366f1',
  Meals: '#ffb119',
  'Client Entertainment': '#ec4899',
  'Software/Subscriptions': '#8b5cf6',
  Other: '#64748b',
};

const Expenses = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter state
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Modals state
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  
  // Selected claim
  const [selectedExpense, setSelectedExpense] = useState(null);

  // Forms
  const [claimForm, setClaimForm] = useState({
    title: '', amount: '', category: 'Travel', date: '', description: ''
  });
  const [actionForm, setActionForm] = useState({
    status: 'Approved', notes: ''
  });
  const [formError, setFormError] = useState('');

  const isHRPlus = ['admin', 'hr'].includes(user?.role);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/expenses');
      if (res.success) setExpenses(res.expenses);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleCreateClaim = async (e) => {
    e.preventDefault();
    if (!claimForm.title || !claimForm.amount || !claimForm.category) {
      setFormError('Title, Amount, and Category are required');
      return;
    }
    try {
      setFormError('');
      const payload = {
        ...claimForm,
        amount: parseFloat(claimForm.amount),
        date: claimForm.date || new Date(),
      };
      const res = await api.post('/expenses', payload);
      if (res.success) {
        setClaimModalOpen(false);
        setClaimForm({ title: '', amount: '', category: 'Travel', date: '', description: '' });
        fetchExpenses();
      }
    } catch (e) {
      setFormError(e.message);
    }
  };

  const handleActionClaim = async (e) => {
    e.preventDefault();
    try {
      setFormError('');
      const res = await api.put(`/expenses/${selectedExpense._id}`, actionForm);
      if (res.success) {
        setActionModalOpen(false);
        setActionForm({ status: 'Approved', notes: '' });
        setSelectedExpense(null);
        fetchExpenses();
      }
    } catch (e) {
      setFormError(e.message);
    }
  };

  const handleDeleteClaim = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this expense claim?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      fetchExpenses();
    } catch (e) {
      alert(e.message);
    }
  };

  // Compute Stats
  const stats = expenses.reduce((acc, curr) => {
    acc.total += curr.amount;
    if (curr.status === 'Pending') acc.pending += curr.amount;
    if (curr.status === 'Approved') acc.approved += curr.amount;
    return acc;
  }, { total: 0, pending: 0, approved: 0 });

  const filteredExpenses = expenses.filter(exp => {
    if (statusFilter === 'All') return true;
    return exp.status === statusFilter;
  });

  return (
    <div className="page-container page-enter">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '14px',
          background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 15px rgba(16,185,129,0.3)',
        }}>
          <Receipt size={22} color="white" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Expense Claims</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            {isHRPlus ? 'Review and manage employee reimbursement claims' : 'Submit and track your expense reimbursements'}
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem' }}>
          <button onClick={fetchExpenses} className="btn btn-secondary btn-icon" title="Reload expenses">
            <RefreshCw size={16} />
          </button>
          {!isHRPlus && (
            <button onClick={() => setClaimModalOpen(true)} className="btn btn-primary" style={{ background: 'var(--primary-gradient)' }}>
              <Plus size={18} /> Submit Expense
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}><AlertCircle size={16} /> {error}</div>}

      {/* Stats Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }} className="three-column-grid">
        {[
          { label: 'Total Submitted', value: stats.total, color: 'var(--primary-accent)', icon: DollarSign },
          { label: 'Pending Approval', value: stats.pending, color: 'var(--warning)', icon: Clock },
          { label: 'Approved Claims', value: stats.approved, color: 'var(--success)', icon: CheckCircle },
        ].map(s => (
          <div key={s.label} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>{s.label}</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>${s.value.toFixed(2)}</div>
            </div>
            <div style={{
              width: '42px', height: '42px', borderRadius: '10px',
              background: 'rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color
            }}>
              <s.icon size={20} />
            </div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="card" style={{ padding: '0.75rem 1.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['All', 'Pending', 'Approved', 'Rejected'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className="btn btn-secondary"
              style={{
                fontSize: '0.85rem',
                padding: '0.4rem 1rem',
                borderRadius: '8px',
                border: statusFilter === status ? '1px solid var(--primary-accent)' : '1px solid var(--border-color)',
                background: statusFilter === status ? 'var(--bg-sidebar-active)' : 'transparent',
                color: statusFilter === status ? 'var(--text-sidebar-active)' : 'var(--text-primary)',
              }}
            >
              {status}
            </button>
          ))}
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Showing {filteredExpenses.length} claims</span>
      </div>

      {/* Claims Grid/Table */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[0, 1, 2].map(i => (
            <div key={i} className="card" style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <SkeletonBlock width="40px" height="40px" borderRadius="10px" />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <SkeletonBlock height="15px" width="30%" />
                <SkeletonBlock height="10px" width="60%" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredExpenses.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
          <Receipt size={48} style={{ color: 'var(--text-secondary)', marginBottom: '1rem', opacity: 0.5 }} />
          <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>No expense claims found.</p>
        </div>
      ) : (
        <div className="table-container">
          <div className="table-header-row">
            <span className="table-title">Expense Reimbursements History</span>
          </div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  {isHRPlus && <th>Employee</th>}
                  <th>Title</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Expense Date</th>
                  <th>Status</th>
                  <th>Processed By</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map(exp => (
                  <tr key={exp._id}>
                    {isHRPlus && (
                      <td style={{ fontWeight: 600 }}>
                        {exp.employee ? `${exp.employee.firstName} ${exp.employee.lastName}` : 'Unknown'}
                      </td>
                    )}
                    <td style={{ fontWeight: 600 }}>{exp.title}</td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 600,
                        color: CATEGORY_COLORS[exp.category] || '#64748b'
                      }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: CATEGORY_COLORS[exp.category] || '#64748b' }} />
                        {exp.category}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>${exp.amount.toFixed(2)}</td>
                    <td>{new Date(exp.date).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge ${
                        exp.status === 'Approved' ? 'badge-approved' : exp.status === 'Rejected' ? 'badge-rejected' : 'badge-pending'
                      }`}>
                        {exp.status}
                      </span>
                    </td>
                    <td>
                      {exp.approvedBy ? exp.approvedBy.username : '-'}
                    </td>
                    <td title={exp.notes} style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {exp.notes || '-'}
                    </td>
                    <td>
                      {exp.status === 'Pending' ? (
                        isHRPlus ? (
                          <button
                            onClick={() => { setSelectedExpense(exp); setActionModalOpen(true); }}
                            className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', background: 'var(--primary-gradient)' }}
                          >
                            Approve/Reject
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDeleteClaim(exp._id)}
                            className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', color: 'var(--danger)' }}
                          >
                            <Trash2 size={13} style={{ verticalAlign: 'middle' }} /> Cancel
                          </button>
                        )
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Processed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Submit Claim Modal */}
      {claimModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Submit Reimbursement Claim</h3>
              <button className="modal-close-btn" onClick={() => setClaimModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateClaim}>
              <div className="modal-body">
                {formError && <div className="alert alert-danger" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}><AlertCircle size={16} /> {formError}</div>}
                <div className="form-group">
                  <label>Claim Title / Purchase Name *</label>
                  <input type="text" className="form-control" placeholder="e.g. Flight to conference / AWS Database Bill"
                    value={claimForm.title} onChange={e => setClaimForm({ ...claimForm, title: e.target.value })} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Amount ($) *</label>
                    <input type="number" step="0.01" className="form-control" placeholder="e.g. 150.50"
                      value={claimForm.amount} onChange={e => setClaimForm({ ...claimForm, amount: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Category *</label>
                    <select className="form-control" value={claimForm.category} onChange={e => setClaimForm({ ...claimForm, category: e.target.value })}>
                      {['Travel', 'Office Supplies', 'Meals', 'Client Entertainment', 'Software/Subscriptions', 'Other'].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Date of Spend *</label>
                    <input type="date" className="form-control"
                      value={claimForm.date} onChange={e => setClaimForm({ ...claimForm, date: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Explanation / Details</label>
                  <textarea rows="3" className="form-control" placeholder="Provide extra description about this claim..." style={{ resize: 'none' }}
                    value={claimForm.description} onChange={e => setClaimForm({ ...claimForm, description: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setClaimModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Claim</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approve/Reject Expense Modal (HR) */}
      {actionModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Review Reimbursement Claim</h3>
              <button className="modal-close-btn" onClick={() => { setActionModalOpen(false); setSelectedExpense(null); }}><X size={20} /></button>
            </div>
            <form onSubmit={handleActionClaim}>
              <div className="modal-body">
                {formError && <div className="alert alert-danger" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}><AlertCircle size={16} /> {formError}</div>}
                <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '12px', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 600 }}>Employee:</span>
                    <span>{selectedExpense?.employee ? `${selectedExpense.employee.firstName} ${selectedExpense.employee.lastName}` : 'Unknown'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 600 }}>Expense:</span>
                    <span>{selectedExpense?.title}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600 }}>Amount:</span>
                    <span style={{ fontWeight: 700, color: 'var(--success)' }}>${selectedExpense?.amount.toFixed(2)}</span>
                  </div>
                </div>
                <div className="form-group">
                  <label>Action Decision *</label>
                  <select className="form-control" value={actionForm.status} onChange={e => setActionForm({ ...actionForm, status: e.target.value })}>
                    <option value="Approved">Approve Claim</option>
                    <option value="Rejected">Reject Claim</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Manager Note / Approval Comments</label>
                  <textarea rows="3" className="form-control" placeholder="Comments on approval/rejection details..." style={{ resize: 'none' }}
                    value={actionForm.notes} onChange={e => setActionForm({ ...actionForm, notes: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setActionModalOpen(false); setSelectedExpense(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Decision</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
