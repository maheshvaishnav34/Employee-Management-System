import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  Check, X, Loader, Receipt, Laptop, Sparkles, CheckCircle,
  UserMinus, ArrowRightLeft,
} from 'lucide-react';

const PendingReviewsWidget = () => {
  const { user } = useAuth();
  const isHR = user?.role === 'hr';

  const [activeTab, setActiveTab] = useState(isHR ? 'exits' : 'expenses');
  const [expenses, setExpenses] = useState([]);
  const [assetRequests, setAssetRequests] = useState([]);
  const [resignations, setResignations] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null);
  const [doneActions, setDoneActions] = useState({});

  const fetchData = async () => {
    try {
      setLoading(true);
      if (isHR) {
        // Fetch HR lifecycle items: Resignations/Exits and Department Transfers
        const [resigRes, transRes] = await Promise.all([
          api.get('/resignations').catch(() => ({ success: false })),
          api.get('/transfers').catch(() => ({ success: false })),
        ]);
        if (resigRes?.success && Array.isArray(resigRes.resignations)) {
          setResignations(resigRes.resignations.filter(r => r.status === 'Pending'));
        }
        if (transRes?.success && Array.isArray(transRes.transfers)) {
          setTransfers(transRes.transfers.filter(t => t.status === 'Pending'));
        }
      } else {
        // Admin: Expenses & Assets
        const [expenseRes, assetRes] = await Promise.all([
          api.get('/expenses').catch(() => ({ success: false })),
          api.get('/assets/requests').catch(() => ({ success: false })),
        ]);
        if (expenseRes?.success && Array.isArray(expenseRes.expenses)) {
          setExpenses(expenseRes.expenses.filter(e => e.status === 'Pending'));
        }
        if (assetRes?.success && Array.isArray(assetRes.requests)) {
          setAssetRequests(assetRes.requests.filter(r => r.status === 'Pending'));
        }
      }
    } catch (e) {
      console.error('Error fetching quick reviews data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isHR) {
      setActiveTab('exits');
    } else {
      setActiveTab('expenses');
    }
    fetchData();
  }, [user?.role]);

  // Handlers for Admin (Expenses & Assets)
  const handleExpenseAction = async (id, status) => {
    setActioningId(id);
    try {
      await api.put(`/expenses/${id}`, { status, notes: `Quick processed from dashboard.` });
      setDoneActions(prev => ({ ...prev, [id]: status }));
      setTimeout(() => {
        setExpenses(prev => prev.filter(e => e._id !== id));
      }, 600);
    } catch (e) {
      alert(e.message);
    } finally {
      setActioningId(null);
    }
  };

  const handleAssetAction = async (id, status) => {
    setActioningId(id);
    try {
      await api.put(`/assets/requests/${id}`, { status, notes: `Quick processed from dashboard.` });
      setDoneActions(prev => ({ ...prev, [id]: status }));
      setTimeout(() => {
        setAssetRequests(prev => prev.filter(r => r._id !== id));
      }, 600);
    } catch (e) {
      alert(e.message);
    } finally {
      setActioningId(null);
    }
  };

  // Handlers for HR (Exits & Transfers)
  const handleResignationAction = async (id, status) => {
    setActioningId(id);
    try {
      await api.put(`/resignations/${id}/status`, {
        status,
        managerFeedback: `Quick processed from HR approvals hub.`,
      });
      setDoneActions(prev => ({ ...prev, [id]: status }));
      setTimeout(() => {
        setResignations(prev => prev.filter(r => r._id !== id));
      }, 600);
    } catch (e) {
      alert(e.message);
    } finally {
      setActioningId(null);
    }
  };

  const handleTransferAction = async (id, status) => {
    setActioningId(id);
    try {
      await api.put(`/transfers/${id}/status`, {
        status,
        comments: `Quick processed from HR approvals hub.`,
      });
      setDoneActions(prev => ({ ...prev, [id]: status }));
      setTimeout(() => {
        setTransfers(prev => prev.filter(t => t._id !== id));
      }, 600);
    } catch (e) {
      alert(e.message);
    } finally {
      setActioningId(null);
    }
  };

  const pendingExpenses = expenses.filter(e => !doneActions[e._id]);
  const pendingAssets = assetRequests.filter(r => !doneActions[r._id]);
  const pendingExits = resignations.filter(r => !doneActions[r._id]);
  const pendingTransfers = transfers.filter(t => !doneActions[t._id]);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: '340px' }}>
      {/* Widget Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
          <Sparkles size={18} style={{ color: 'var(--primary-accent)' }} />
          {isHR ? 'HR Approvals Hub' : 'Workplace Approvals Hub'}
        </span>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.03)', borderRadius: '8px', padding: '2px' }}>
          {isHR ? (
            <>
              <button
                onClick={() => setActiveTab('exits')}
                style={{
                  border: 'none', background: activeTab === 'exits' ? 'var(--bg-secondary)' : 'transparent',
                  color: activeTab === 'exits' ? 'var(--primary-accent)' : 'var(--text-secondary)',
                  fontSize: '0.74rem', fontWeight: 700, padding: '0.25rem 0.6rem', borderRadius: '6px', cursor: 'pointer',
                  boxShadow: activeTab === 'exits' ? 'var(--shadow-sm)' : 'none', transition: 'all 0.2s',
                }}
              >
                Employee Exits ({pendingExits.length})
              </button>
              <button
                onClick={() => setActiveTab('transfers')}
                style={{
                  border: 'none', background: activeTab === 'transfers' ? 'var(--bg-secondary)' : 'transparent',
                  color: activeTab === 'transfers' ? 'var(--primary-accent)' : 'var(--text-secondary)',
                  fontSize: '0.74rem', fontWeight: 700, padding: '0.25rem 0.6rem', borderRadius: '6px', cursor: 'pointer',
                  boxShadow: activeTab === 'transfers' ? 'var(--shadow-sm)' : 'none', transition: 'all 0.2s',
                }}
              >
                Transfers ({pendingTransfers.length})
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveTab('expenses')}
                style={{
                  border: 'none', background: activeTab === 'expenses' ? 'var(--bg-secondary)' : 'transparent',
                  color: activeTab === 'expenses' ? 'var(--primary-accent)' : 'var(--text-secondary)',
                  fontSize: '0.74rem', fontWeight: 700, padding: '0.25rem 0.6rem', borderRadius: '6px', cursor: 'pointer',
                  boxShadow: activeTab === 'expenses' ? 'var(--shadow-sm)' : 'none', transition: 'all 0.2s',
                }}
              >
                Expenses ({pendingExpenses.length})
              </button>
              <button
                onClick={() => setActiveTab('assets')}
                style={{
                  border: 'none', background: activeTab === 'assets' ? 'var(--bg-secondary)' : 'transparent',
                  color: activeTab === 'assets' ? 'var(--primary-accent)' : 'var(--text-secondary)',
                  fontSize: '0.74rem', fontWeight: 700, padding: '0.25rem 0.6rem', borderRadius: '6px', cursor: 'pointer',
                  boxShadow: activeTab === 'assets' ? 'var(--shadow-sm)' : 'none', transition: 'all 0.2s',
                }}
              >
                Assets ({pendingAssets.length})
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ margin: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <Loader size={24} style={{ color: 'var(--primary-accent)', animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Loading pending approvals...</span>
        </div>
      ) : isHR && activeTab === 'exits' ? (
        /* HR: Employee Exits Tab */
        pendingExits.length === 0 ? (
          <div style={{ margin: 'auto', textAlign: 'center', padding: '1rem' }}>
            <CheckCircle size={32} style={{ color: 'var(--success)', marginBottom: '0.5rem', display: 'block', margin: '0 auto 0.5rem' }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>All exit requests processed!</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', overflowY: 'auto', maxHeight: '250px', paddingRight: '2px' }}>
            {pendingExits.map(exit => {
              const isActioning = actioningId === exit._id;
              const actionResult = doneActions[exit._id];
              return (
                <div key={exit._id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.85rem',
                  background: actionResult ? (actionResult === 'Approved' ? 'var(--success-bg)' : 'var(--danger-bg)') : 'var(--bg-primary)',
                  border: `1px solid ${actionResult ? (actionResult === 'Approved' ? 'rgba(46,189,127,0.2)' : 'rgba(255,91,91,0.2)') : 'var(--border-color)'}`,
                  borderRadius: '10px', transition: 'all 0.3s ease',
                }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)',
                    color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <UserMinus size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: '0.85rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {exit.employee ? `${exit.employee.firstName} ${exit.employee.lastName}` : 'Employee'}
                    </strong>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                      Last day: {exit.lastWorkingDay ? new Date(exit.lastWorkingDay).toLocaleDateString() : 'N/A'} · <span style={{ color: 'var(--text-primary)' }}>{exit.reason || 'Resignation'}</span>
                    </span>
                  </div>
                  {isActioning ? (
                    <Loader size={16} style={{ color: 'var(--text-secondary)', animation: 'spin 1s linear infinite' }} />
                  ) : actionResult ? (
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: actionResult === 'Approved' ? 'var(--success)' : 'var(--danger)' }}>{actionResult}</span>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
                      <button
                        title="Approve Exit"
                        onClick={() => handleResignationAction(exit._id, 'Approved')}
                        style={{
                          width: '28px', height: '28px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                          background: 'var(--success-bg)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--success)'; e.currentTarget.style.color = 'white'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--success-bg)'; e.currentTarget.style.color = 'var(--success)'; }}
                      >
                        <Check size={14} />
                      </button>
                      <button
                        title="Reject Exit"
                        onClick={() => handleResignationAction(exit._id, 'Rejected')}
                        style={{
                          width: '28px', height: '28px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                          background: 'var(--danger-bg)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger)'; e.currentTarget.style.color = 'white'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--danger-bg)'; e.currentTarget.style.color = 'var(--danger)'; }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : isHR && activeTab === 'transfers' ? (
        /* HR: Transfers Tab */
        pendingTransfers.length === 0 ? (
          <div style={{ margin: 'auto', textAlign: 'center', padding: '1rem' }}>
            <CheckCircle size={32} style={{ color: 'var(--success)', marginBottom: '0.5rem', display: 'block', margin: '0 auto 0.5rem' }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>All transfer requests reviewed!</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', overflowY: 'auto', maxHeight: '250px', paddingRight: '2px' }}>
            {pendingTransfers.map(trans => {
              const isActioning = actioningId === trans._id;
              const actionResult = doneActions[trans._id];
              return (
                <div key={trans._id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.85rem',
                  background: actionResult ? (actionResult === 'Approved' ? 'var(--success-bg)' : 'var(--danger-bg)') : 'var(--bg-primary)',
                  border: `1px solid ${actionResult ? (actionResult === 'Approved' ? 'rgba(46,189,127,0.2)' : 'rgba(255,91,91,0.2)') : 'var(--border-color)'}`,
                  borderRadius: '10px', transition: 'all 0.3s ease',
                }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(103,119,239,0.1)',
                    color: '#6777ef', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <ArrowRightLeft size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: '0.85rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {trans.employee ? `${trans.employee.firstName} ${trans.employee.lastName}` : 'Employee'}
                    </strong>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                      {trans.fromDepartment?.name || 'Dept'} → <strong style={{ color: 'var(--primary-accent)' }}>{trans.toDepartment?.name || 'Dept'}</strong>
                    </span>
                  </div>
                  {isActioning ? (
                    <Loader size={16} style={{ color: 'var(--text-secondary)', animation: 'spin 1s linear infinite' }} />
                  ) : actionResult ? (
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: actionResult === 'Approved' ? 'var(--success)' : 'var(--danger)' }}>{actionResult}</span>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
                      <button
                        title="Approve Transfer"
                        onClick={() => handleTransferAction(trans._id, 'Approved')}
                        style={{
                          width: '28px', height: '28px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                          background: 'var(--success-bg)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--success)'; e.currentTarget.style.color = 'white'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--success-bg)'; e.currentTarget.style.color = 'var(--success)'; }}
                      >
                        <Check size={14} />
                      </button>
                      <button
                        title="Reject Transfer"
                        onClick={() => handleTransferAction(trans._id, 'Rejected')}
                        style={{
                          width: '28px', height: '28px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                          background: 'var(--danger-bg)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger)'; e.currentTarget.style.color = 'white'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--danger-bg)'; e.currentTarget.style.color = 'var(--danger)'; }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : activeTab === 'expenses' ? (
        /* Expenses Tab (Admin) */
        pendingExpenses.length === 0 ? (
          <div style={{ margin: 'auto', textAlign: 'center', padding: '1rem' }}>
            <CheckCircle size={32} style={{ color: 'var(--success)', marginBottom: '0.5rem', display: 'block', margin: '0 auto 0.5rem' }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>All expense claims cleared!</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', overflowY: 'auto', maxHeight: '250px', paddingRight: '2px' }}>
            {pendingExpenses.map(exp => {
              const isActioning = actioningId === exp._id;
              const actionResult = doneActions[exp._id];
              return (
                <div key={exp._id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.85rem',
                  background: actionResult ? (actionResult === 'Approved' ? 'var(--success-bg)' : 'var(--danger-bg)') : 'var(--bg-primary)',
                  border: `1px solid ${actionResult ? (actionResult === 'Approved' ? 'rgba(46,189,127,0.2)' : 'rgba(255,91,91,0.2)') : 'var(--border-color)'}`,
                  borderRadius: '10px', transition: 'all 0.3s ease',
                }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16,185,129,0.08)',
                    color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Receipt size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: '0.85rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {exp.employee ? `${exp.employee.firstName} ${exp.employee.lastName}` : 'Employee'}
                    </strong>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                      {exp.title} · <strong style={{ color: 'var(--success)' }}>₹{exp.amount.toFixed(2)}</strong>
                    </span>
                  </div>
                  {isActioning ? (
                    <Loader size={16} style={{ color: 'var(--text-secondary)', animation: 'spin 1s linear infinite' }} />
                  ) : actionResult ? (
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: actionResult === 'Approved' ? 'var(--success)' : 'var(--danger)' }}>{actionResult}</span>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
                      <button
                        title="Approve Claim"
                        onClick={() => handleExpenseAction(exp._id, 'Approved')}
                        style={{
                          width: '28px', height: '28px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                          background: 'var(--success-bg)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--success)'; e.currentTarget.style.color = 'white'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--success-bg)'; e.currentTarget.style.color = 'var(--success)'; }}
                      >
                        <Check size={14} />
                      </button>
                      <button
                        title="Reject Claim"
                        onClick={() => handleExpenseAction(exp._id, 'Rejected')}
                        style={{
                          width: '28px', height: '28px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                          background: 'var(--danger-bg)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger)'; e.currentTarget.style.color = 'white'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--danger-bg)'; e.currentTarget.style.color = 'var(--danger)'; }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Assets Tab (Admin) */
        pendingAssets.length === 0 ? (
          <div style={{ margin: 'auto', textAlign: 'center', padding: '1rem' }}>
            <CheckCircle size={32} style={{ color: 'var(--success)', marginBottom: '0.5rem', display: 'block', margin: '0 auto 0.5rem' }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>All asset requests reviewed!</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', overflowY: 'auto', maxHeight: '250px', paddingRight: '2px' }}>
            {pendingAssets.map(req => {
              const isActioning = actioningId === req._id;
              const actionResult = doneActions[req._id];
              return (
                <div key={req._id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.85rem',
                  background: actionResult ? (actionResult === 'Approved' ? 'var(--success-bg)' : 'var(--danger-bg)') : 'var(--bg-primary)',
                  border: `1px solid ${actionResult ? (actionResult === 'Approved' ? 'rgba(46,189,127,0.2)' : 'rgba(255,91,91,0.2)') : 'var(--border-color)'}`,
                  borderRadius: '10px', transition: 'all 0.3s ease',
                }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59,130,246,0.08)',
                    color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Laptop size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: '0.85rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {req.employee ? `${req.employee.firstName} ${req.employee.lastName}` : 'Employee'}
                    </strong>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                      Request: {req.assetCategory} · Urgency: <strong style={{ color: req.urgency === 'High' ? 'var(--danger)' : 'var(--info)' }}>{req.urgency}</strong>
                    </span>
                  </div>
                  {isActioning ? (
                    <Loader size={16} style={{ color: 'var(--text-secondary)', animation: 'spin 1s linear infinite' }} />
                  ) : actionResult ? (
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: actionResult === 'Approved' ? 'var(--success)' : 'var(--danger)' }}>{actionResult}</span>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
                      <button
                        title="Approve Request"
                        onClick={() => handleAssetAction(req._id, 'Approved')}
                        style={{
                          width: '28px', height: '28px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                          background: 'var(--success-bg)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--success)'; e.currentTarget.style.color = 'white'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--success-bg)'; e.currentTarget.style.color = 'var(--success)'; }}
                      >
                        <Check size={14} />
                      </button>
                      <button
                        title="Reject Request"
                        onClick={() => handleAssetAction(req._id, 'Rejected')}
                        style={{
                          width: '28px', height: '28px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                          background: 'var(--danger-bg)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger)'; e.currentTarget.style.color = 'white'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--danger-bg)'; e.currentTarget.style.color = 'var(--danger)'; }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
};

export default PendingReviewsWidget;
