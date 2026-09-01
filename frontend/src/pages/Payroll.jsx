import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import PayslipModal from '../components/PayslipModal';
import { CircleDollarSign, Plus, Edit2, FileText, X, AlertCircle } from 'lucide-react';

const Payroll = () => {
  const { user } = useAuth();
  const [payrolls, setPayrolls] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Admin Payroll Run Generation state
  const [targetMonth, setTargetMonth] = useState('');
  const [runMessage, setRunMessage] = useState('');
  const [runError, setRunError] = useState('');
  const [runLoading, setRunLoading] = useState(false);

  // Edit Payroll Modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState({
    id: '',
    employeeName: '',
    month: '',
    baseSalary: 0,
    bonuses: 0,
    deductions: 0,
    status: 'Unpaid',
  });
  const [editError, setEditError] = useState('');

  // Payslip Modal state
  const [selectedPayroll, setSelectedPayroll] = useState(null);

  // Filter state
  const [monthFilter, setMonthFilter] = useState('');

  const isLedgerVisible = ['admin', 'hr', 'manager'].includes(user?.role);

  const fetchPayrolls = async () => {
    try {
      setLoading(true);
      setError('');
      const params = [];
      if (monthFilter) params.push(`month=${monthFilter}`);
      const queryStr = params.length > 0 ? `?${params.join('&')}` : '';
      
      const data = await api.get(`/payroll${queryStr}`);
      if (data.success) {
        setPayrolls(data.payrolls);
      }
    } catch (err) {
      setError(err.message || 'Failed to load payroll logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrolls();
  }, [monthFilter, user]);

  const handleGenerateRun = async (e) => {
    e.preventDefault();
    if (!targetMonth) {
      setRunError('Please select a target month');
      return;
    }

    try {
      setRunLoading(true);
      setRunError('');
      setRunMessage('');
      
      const data = await api.post('/payroll/generate', { month: targetMonth });
      if (data.success) {
        setRunMessage(data.message || 'Payroll run generated successfully');
        setTargetMonth('');
        fetchPayrolls();
      }
    } catch (err) {
      setRunError(err.message || 'Failed to generate payroll run');
    } finally {
      setRunLoading(false);
    }
  };

  const handleOpenEdit = (pr) => {
    setEditError('');
    setEditData({
      id: pr._id,
      employeeName: `${pr.employee?.firstName} ${pr.employee?.lastName}`,
      month: pr.month,
      baseSalary: pr.baseSalary,
      bonuses: pr.bonuses,
      deductions: pr.deductions,
      status: pr.status,
    });
    setEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      setEditError('');
      const data = await api.put(`/payroll/${editData.id}`, {
        bonuses: editData.bonuses,
        deductions: editData.deductions,
        status: editData.status,
      });
      if (data.success) {
        setEditOpen(false);
        fetchPayrolls();
      }
    } catch (err) {
      setEditError(err.message || 'Failed to update payroll details');
    }
  };

  return (
    <div className="page-container">
      {isLedgerVisible ? (
        /* HR / ADMIN PAYROLL DASHBOARD */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '1.5rem' }} className="payroll-dashboard">
          
          {/* Left panel: Trigger new runs */}
          <div>
            {user?.role === 'admin' ? (
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <span className="chart-title" style={{ display: 'block', marginBottom: '1rem' }}>Trigger Payroll Run</span>
                
                {runError && (
                  <div className="alert alert-danger" style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                    <AlertCircle size={18} /> {runError}
                  </div>
                )}
                {runMessage && (
                  <div className="alert alert-success" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                    {runMessage}
                  </div>
                )}

                <form onSubmit={handleGenerateRun}>
                  <div className="form-group">
                    <label>Target Pay Month</label>
                    <input
                      type="month"
                      className="form-control"
                      value={targetMonth}
                      onChange={(e) => setTargetMonth(e.target.value)}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '0.5rem' }}
                    disabled={runLoading}
                  >
                    <CircleDollarSign size={16} /> {runLoading ? 'Running calculations...' : 'Execute Run'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <span className="chart-title" style={{ display: 'block', marginBottom: '1rem' }}>Trigger Payroll Run</span>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Generating new payroll cycles is restricted to System Admins.
                </p>
              </div>
            )}

            {/* Filter Console */}
            <div className="card">
              <span className="chart-title" style={{ display: 'block', marginBottom: '1rem' }}>Ledger Filter</span>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Filter Month</label>
                <input
                  type="month"
                  className="form-control"
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                />
                {monthFilter && (
                  <button
                    onClick={() => setMonthFilter('')}
                    className="btn btn-secondary"
                    style={{ width: '100%', marginTop: '0.75rem', padding: '0.5rem', fontSize: '0.85rem' }}
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right panel: Active payroll grid ledger */}
          <div className="table-container" style={{ margin: 0 }}>
            <div className="table-header-row">
              <span className="table-title">Global Salary Ledger ({payrolls.length} entries)</span>
            </div>
            <div className="data-table-wrapper">
              {error && <div className="alert alert-danger">{error}</div>}
              {loading ? (
                <p style={{ textAlign: 'center', padding: '2rem' }}>Loading payroll ledger...</p>
              ) : payrolls.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No payroll records generated for target month</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Employee ID</th>
                      <th>Employee Name</th>
                      <th>Base Salary</th>
                      <th>Bonuses</th>
                      <th>Deductions</th>
                      <th>Net Disbursed</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrolls.map((pr) => (
                      <tr key={pr._id}>
                        <td><strong>{pr.month}</strong></td>
                        <td><strong>{pr.employee?.employeeId}</strong></td>
                        <td>{pr.employee ? `${pr.employee.firstName} ${pr.employee.lastName}` : 'N/A'}</td>
                        <td>${pr.baseSalary?.toLocaleString()}</td>
                        <td style={{ color: 'var(--success)' }}>+${pr.bonuses?.toLocaleString()}</td>
                        <td style={{ color: 'var(--danger)' }}>-${pr.deductions?.toLocaleString()}</td>
                        <td><strong>${pr.netSalary?.toLocaleString()}</strong></td>
                        <td>
                          <span className={`badge badge-${pr.status.toLowerCase()}`}>{pr.status}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            {(user?.role === 'admin') && (
                              <button
                                onClick={() => handleOpenEdit(pr)}
                                className="btn btn-secondary btn-icon"
                                title="Edit Adjustments"
                                style={{ color: 'var(--primary-accent)' }}
                              >
                                <Edit2 size={15} />
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedPayroll(pr)}
                              className="btn btn-secondary btn-icon"
                              title="View Payslip"
                            >
                              <FileText size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* EMPLOYEE PAYROLL VIEW (history list) */
        <div className="table-container">
          <div className="table-header-row">
            <span className="table-title">Your Monthly Salary Slips</span>
          </div>
          <div className="data-table-wrapper">
            {error && <div className="alert alert-danger">{error}</div>}
            {loading ? (
              <p style={{ textAlign: 'center', padding: '2rem' }}>Loading salary slips...</p>
            ) : payrolls.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No salary records released</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Base Salary</th>
                    <th>Bonuses</th>
                    <th>Deductions</th>
                    <th>Net Salary</th>
                    <th>Release Date</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payrolls.map((pr) => (
                    <tr key={pr._id}>
                      <td><strong>{pr.month}</strong></td>
                      <td>${pr.baseSalary?.toLocaleString()}</td>
                      <td style={{ color: 'var(--success)' }}>+${pr.bonuses?.toLocaleString()}</td>
                      <td style={{ color: 'var(--danger)' }}>-${pr.deductions?.toLocaleString()}</td>
                      <td><strong>${pr.netSalary?.toLocaleString()}</strong></td>
                      <td>{pr.paymentDate ? new Date(pr.paymentDate).toLocaleDateString() : 'Awaiting Release'}</td>
                      <td>
                        <span className={`badge badge-${pr.status.toLowerCase()}`}>{pr.status}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <button
                            onClick={() => setSelectedPayroll(pr)}
                            className="btn btn-secondary btn-icon"
                            title="Open Invoice Payslip"
                          >
                            <FileText size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Admin Edit Adjustment Modal */}
      {editOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '450px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Adjust Pay Details</h3>
              <button className="modal-close-btn" onClick={() => setEditOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                {editError && (
                  <div className="alert alert-danger" style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem 1rem' }}>
                    <AlertCircle size={18} /> {editError}
                  </div>
                )}

                <div style={{ marginBottom: '1.25rem', fontSize: '0.9rem', lineHeight: '1.6' }}>
                  Employee: <strong>{editData.employeeName}</strong><br />
                  Pay Month: <strong>{editData.month}</strong><br />
                  Base Contract Salary: <strong>${editData.baseSalary?.toLocaleString()}</strong>
                </div>

                <div className="form-group">
                  <label>Performance Bonuses ($)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={editData.bonuses}
                    onChange={(e) => setEditData({ ...editData, bonuses: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Tax & Leave Deductions ($)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={editData.deductions}
                    onChange={(e) => setEditData({ ...editData, deductions: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Disbursement Release Status</label>
                  <select
                    className="form-control"
                    value={editData.status}
                    onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                  >
                    <option value="Unpaid">Unpaid / Processing</option>
                    <option value="Paid">Paid / Disbursed</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Adjustments
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Render printable payslip details modal */}
      {selectedPayroll && (
        <PayslipModal
          payroll={selectedPayroll}
          onClose={() => setSelectedPayroll(null)}
        />
      )}
    </div>
  );
};

export default Payroll;
