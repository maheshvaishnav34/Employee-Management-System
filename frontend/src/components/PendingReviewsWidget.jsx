import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Check, X, Loader, Receipt, Laptop, Sparkles, CheckCircle } from 'lucide-react';

const PendingReviewsWidget = () => {
  const [activeTab, setActiveTab] = useState('expenses'); // 'expenses' or 'assets'
  const [expenses, setExpenses] = useState([]);
  const [assetRequests, setAssetRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null);
  const [doneActions, setDoneActions] = useState({});

  const fetchData = async () => {
    try {
      setLoading(true);
      const expenseRes = await api.get('/expenses');
      if (expenseRes.success) {
        setExpenses(expenseRes.expenses.filter(e => e.status === 'Pending'));
      }
      const assetRes = await api.get('/assets/requests');
      if (assetRes.success) {
        setAssetRequests(assetRes.requests.filter(r => r.status === 'Pending'));
      }
    } catch (e) {
      console.error('Error fetching quick reviews data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  const pendingExpenses = expenses.filter(e => !doneActions[e._id]);
  const pendingAssets = assetRequests.filter(r => !doneActions[r._id]);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: '340px' }}>
      {/* Widget Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
          <Sparkles size={18} style={{ color: 'var(--primary-accent)' }} />
          Workplace Approvals Hub
        </span>
        
        {/* Tab Switcher */}
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.03)', borderRadius: '8px', padding: '2px' }}>
          <button
            onClick={() => setActiveTab('expenses')}
            style={{
              border: 'none', background: activeTab === 'expenses' ? 'var(--bg-secondary)' : 'transparent',
              color: activeTab === 'expenses' ? 'var(--primary-accent)' : 'var(--text-secondary)',
              fontSize: '0.74rem', fontWeight: 700, padding: '0.25rem 0.6rem', borderRadius: '6px', cursor: 'pointer',
              boxShadow: activeTab === 'expenses' ? 'var(--shadow-sm)' : 'none', transition: 'all 0.2s'
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
              boxShadow: activeTab === 'assets' ? 'var(--shadow-sm)' : 'none', transition: 'all 0.2s'
            }}
          >
            Assets ({pendingAssets.length})
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ margin: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <Loader size={24} style={{ color: 'var(--primary-accent)', animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Loading pending claims...</span>
        </div>
      ) : activeTab === 'expenses' ? (
        /* Expenses Tab */
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
                  borderRadius: '10px', transition: 'all 0.3s ease'
                }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16,185,129,0.08)',
                    color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <Receipt size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: '0.85rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {exp.employee ? `${exp.employee.firstName} ${exp.employee.lastName}` : 'Employee'}
                    </strong>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                      {exp.title} · <strong style={{ color: 'var(--success)' }}>${exp.amount.toFixed(2)}</strong>
                    </span>
                  </div>
                  {isActioning ? (
                    <Loader size={16} style={{ color: 'var(--text-secondary)', animation: 'spin 1s linear infinite' }} />
                  ) : actionResult ? (
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: actionResult === 'Approved' ? 'var(--success)' : 'var(--danger)' }}>{actionResult}</span>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
                      <button
                        onClick={() => handleExpenseAction(exp._id, 'Approved')}
                        style={{
                          width: '28px', height: '28px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                          background: 'var(--success-bg)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--success)'; e.currentTarget.style.color = 'white'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--success-bg)'; e.currentTarget.style.color = 'var(--success)'; }}
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => handleExpenseAction(exp._id, 'Rejected')}
                        style={{
                          width: '28px', height: '28px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                          background: 'var(--danger-bg)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.2s'
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
        /* Assets Tab */
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
                  borderRadius: '10px', transition: 'all 0.3s ease'
                }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59,130,246,0.08)',
                    color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
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
                        onClick={() => handleAssetAction(req._id, 'Approved')}
                        style={{
                          width: '28px', height: '28px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                          background: 'var(--success-bg)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--success)'; e.currentTarget.style.color = 'white'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--success-bg)'; e.currentTarget.style.color = 'var(--success)'; }}
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => handleAssetAction(req._id, 'Rejected')}
                        style={{
                          width: '28px', height: '28px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                          background: 'var(--danger-bg)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.2s'
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
