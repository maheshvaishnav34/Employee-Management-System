import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { 
  ArrowLeft, Search, ChevronDown, Download, DollarSign, 
  TrendingUp, CreditCard, ShieldAlert, Check, FileSpreadsheet, 
  Import, Activity, CalendarDays, Coins
} from 'lucide-react';

const PayrollLedgerReport = () => {
  const navigate = useNavigate();
  
  // Default month filter to June 2026 for demo seeded payroll run
  const [selectedMonth, setSelectedMonth] = useState('2026-06');
  const [selectedDept, setSelectedDept] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [payrolls, setPayrolls] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
  const downloadRef = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [deptRes, payrollRes] = await Promise.all([
        api.get('/departments').catch(() => ({ success: true, departments: [] })),
        api.get(`/payroll?month=${selectedMonth}`)
      ]);

      if (deptRes.success) setDepartments(deptRes.departments || []);
      if (payrollRes.success) setPayrolls(payrollRes.payrolls || []);
    } catch (err) {
      setError(err.message || 'Failed to load payroll ledger history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (downloadRef.current && !downloadRef.current.contains(e.target)) {
        setShowDownloadDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter Logic
  const filteredPayrolls = payrolls.filter(p => {
    // 1. Department filter
    if (selectedDept !== 'All') {
      const deptId = p.employee?.department?._id || p.employee?.department;
      if (deptId !== selectedDept) return false;
    }

    // 2. Search filter
    const name = `${p.employee?.firstName || ''} ${p.employee?.lastName || ''}`.toLowerCase();
    const empId = (p.employee?.employeeId || '').toLowerCase();
    const matchesSearch = 
      name.includes(searchQuery.toLowerCase()) ||
      empId.includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    return true;
  });

  // Calculate Metrics
  const totalPayout = filteredPayrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0);
  const totalBasic = filteredPayrolls.reduce((sum, p) => sum + (p.baseSalary || 0), 0);
  const totalBonuses = filteredPayrolls.reduce((sum, p) => sum + (p.bonuses || 0), 0);
  const totalDeductions = filteredPayrolls.reduce((sum, p) => sum + (p.deductions || 0), 0);

  // Format currency helper
  const formatVal = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  // CSV / JSON Exports
  const handleExport = (format) => {
    setShowDownloadDropdown(false);
    if (filteredPayrolls.length === 0) {
      setError('No payroll rows to export.');
      return;
    }

    try {
      if (format === 'csv') {
        const headers = ['Name', 'Employee ID', 'Month', 'Base Salary', 'Bonuses', 'Deductions', 'Net Salary', 'Status', 'Payment Date'];
        const csvContent = [
          headers.join(','),
          ...filteredPayrolls.map(row => [
            `"${row.employee?.firstName || ''} ${row.employee?.lastName || ''}"`,
            `"${row.employee?.employeeId || 'N/A'}"`,
            `"${row.month || ''}"`,
            `"${row.baseSalary || 0}"`,
            `"${row.bonuses || 0}"`,
            `"${row.deductions || 0}"`,
            `"${row.netSalary || 0}"`,
            `"${row.status || 'Unpaid'}"`,
            `"${row.paymentDate ? new Date(row.paymentDate).toLocaleDateString() : 'N/A'}"`
          ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Payroll_Ledger_Report_${selectedMonth}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setSuccess('Successfully downloaded CSV payroll ledger.');
      } else {
        const jsonContent = JSON.stringify(filteredPayrolls, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Payroll_Ledger_Report_${selectedMonth}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setSuccess('Successfully downloaded JSON payroll ledger.');
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Export failed: ' + err.message);
    }
  };

  const getInitials = (first, last) => {
    return `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase().slice(0, 2);
  };

  return (
    <div className="page-container">
      {/* Notifications */}
      {error && (
        <div style={{
          padding: '0.75rem 1rem', background: 'var(--danger-bg)', color: 'var(--danger)',
          borderRadius: '10px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
          fontWeight: 600, fontSize: '0.9rem'
        }}>
          <ShieldAlert size={16} /> {error}
        </div>
      )}
      {success && (
        <div style={{
          padding: '0.75rem 1rem', background: 'var(--success-bg)', color: 'var(--success)',
          borderRadius: '10px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
          fontWeight: 600, fontSize: '0.9rem'
        }}>
          <Check size={16} /> {success}
        </div>
      )}

      {/* Header panel */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '1.5rem', 
        flexWrap: 'wrap', 
        gap: '1rem' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={() => navigate('/reports')}
            style={{
              width: '40px', height: '40px', borderRadius: '12px',
              border: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--text-primary)'
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Payroll Ledger Report</h1>
          </div>
        </div>

        {/* Filter actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Month Input selector */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: '10px', color: 'var(--text-secondary)', pointerEvents: 'none' }}>
              <CalendarDays size={14} />
            </span>
            <input 
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                padding: '0.6rem 0.6rem 0.6rem 2.1rem', borderRadius: '10px',
                border: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
                color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.83rem', outline: 'none',
                cursor: 'pointer'
              }}
            />
          </div>

          {/* Dept Filter */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              style={{
                padding: '0.6rem 2rem 0.6rem 1rem', borderRadius: '10px',
                border: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
                color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.88rem',
                appearance: 'none', cursor: 'pointer', minWidth: '150px'
              }}
            >
              <option value="All">All Departments</option>
              {departments.map(d => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>
            <span style={{ position: 'absolute', right: '10px', color: 'var(--text-secondary)', pointerEvents: 'none' }}>
              <ChevronDown size={14} />
            </span>
          </div>

          {/* Search bar */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: '12px', color: 'var(--text-secondary)', pointerEvents: 'none' }}>
              <Search size={15} />
            </span>
            <input 
              type="text"
              placeholder="Search payroll..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '0.6rem 1rem 0.6rem 2.2rem', borderRadius: '10px',
                border: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
                color: 'var(--text-primary)', fontSize: '0.88rem', outline: 'none',
                width: '160px', transition: 'width 0.2s'
              }}
              onFocus={e => e.currentTarget.style.width = '200px'}
              onBlur={e => e.currentTarget.style.width = '160px'}
            />
          </div>

          {/* Download button */}
          <div ref={downloadRef} style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
              style={{
                padding: '0.6rem 1.1rem', borderRadius: '10px',
                border: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
                color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.88rem',
                display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'
              }}
            >
              Download <ChevronDown size={14} />
            </button>
            {showDownloadDropdown && (
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 5px)',
                background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                borderRadius: '10px', boxShadow: 'var(--shadow-lg)', zIndex: 1000,
                width: '140px', padding: '0.25rem 0', display: 'flex', flexDirection: 'column'
              }}>
                <button 
                  onClick={() => handleExport('csv')}
                  style={{
                    padding: '0.6rem 1rem', background: 'none', border: 'none',
                    textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    color: 'var(--text-primary)', fontSize: '0.83rem', fontWeight: 600
                  }}
                  className="dropdown-item-hover"
                >
                  <FileSpreadsheet size={14} color="var(--success)" /> Export CSV
                </button>
                <button 
                  onClick={() => handleExport('json')}
                  style={{
                    padding: '0.6rem 1rem', background: 'none', border: 'none',
                    textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    color: 'var(--text-primary)', fontSize: '0.83rem', fontWeight: 600
                  }}
                  className="dropdown-item-hover"
                >
                  <Import size={14} color="var(--primary-accent)" /> Export JSON
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
          <div className="spin" style={{ width: '32px', height: '32px', border: '3px solid var(--border-color)', borderTopColor: 'var(--primary-accent)', borderRadius: '50%' }} />
        </div>
      ) : (
        <>
          {/* Metrics summary cards grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
            gap: '1.5rem', 
            marginBottom: '2rem' 
          }}>
            {/* Total net payout */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem' }}>
              <span style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DollarSign size={20} color="var(--success)" />
              </span>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>{formatVal(totalPayout)}</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, margin: 0 }}>Total Net Outflow</p>
              </div>
            </div>

            {/* Basic salary */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem' }}>
              <span style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(103,119,239,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CreditCard size={20} color="var(--primary-accent)" />
              </span>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>{formatVal(totalBasic)}</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, margin: 0 }}>Base Salaries paid</p>
              </div>
            </div>

            {/* Bonuses */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem' }}>
              <span style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--warning-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Coins size={20} color="var(--warning)" />
              </span>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>{formatVal(totalBonuses)}</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, margin: 0 }}>Bonuses Distributed</p>
              </div>
            </div>

            {/* Deductions */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem' }}>
              <span style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={20} color="var(--danger)" />
              </span>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>{formatVal(totalDeductions)}</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, margin: 0 }}>Total Deductions</p>
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="table-container">
            <div className="table-header-row">
              <span className="table-title">Payroll Ledger Summary</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                {filteredPayrolls.length} payroll run records
              </span>
            </div>
            
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee Name</th>
                    <th>Employee ID</th>
                    <th>Month</th>
                    <th>Base Salary</th>
                    <th>Bonuses</th>
                    <th>Deductions</th>
                    <th>Net Salary</th>
                    <th>Status</th>
                    <th>Payment Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayrolls.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        No payroll runs logged for this month.
                      </td>
                    </tr>
                  ) : (
                    filteredPayrolls.map(row => (
                      <tr key={row._id}>
                        {/* Employee name card */}
                        <td style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #6777ef 0%, #3f51b5 100%)',
                            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: '0.72rem', flexShrink: 0
                          }}>
                            {getInitials(row.employee?.firstName, row.employee?.lastName)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                              {row.employee?.firstName} {row.employee?.lastName}
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 600 }}>
                              {row.employee?.designation}
                            </div>
                          </div>
                        </td>

                        {/* ID */}
                        <td style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                          {row.employee?.employeeId || 'N/A'}
                        </td>

                        {/* Month */}
                        <td style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                          {row.month}
                        </td>

                        {/* Base Salary */}
                        <td style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                          {formatVal(row.baseSalary)}
                        </td>

                        {/* Bonuses */}
                        <td style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600 }}>
                          +{formatVal(row.bonuses)}
                        </td>

                        {/* Deductions */}
                        <td style={{ color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 600 }}>
                          -{formatVal(row.deductions)}
                        </td>

                        {/* Net Salary */}
                        <td style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                          {formatVal(row.netSalary)}
                        </td>

                        {/* Status Badge */}
                        <td>
                          <span className={`badge ${
                            row.status === 'Paid' ? 'badge-present' : 'badge-pending'
                          }`} style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem' }}>
                            {row.status}
                          </span>
                        </td>

                        {/* Payment Date */}
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                          {row.paymentDate ? new Date(row.paymentDate).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PayrollLedgerReport;
