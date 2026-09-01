import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { 
  ArrowLeft, Search, ChevronDown, Download, Users, 
  Briefcase, DollarSign, Activity, FileSpreadsheet, 
  Import, ShieldAlert, Check, UserCheck, UserMinus
} from 'lucide-react';

const EmployeeDirectoryReport = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All'); // 'All', 'Active', 'Inactive'
  
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
  const downloadRef = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [deptRes, empRes] = await Promise.all([
        api.get('/departments').catch(() => ({ success: true, departments: [] })),
        api.get('/employees')
      ]);

      if (deptRes.success) setDepartments(deptRes.departments || []);
      if (empRes.success) setEmployees(empRes.employees || []);
    } catch (err) {
      setError(err.message || 'Failed to load employee records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
  const filteredRows = employees.filter(emp => {
    const name = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
    const empId = (emp.employeeId || '').toLowerCase();
    const designation = (emp.designation || '').toLowerCase();
    const deptId = emp.department?._id || emp.department;
    
    // 1. Search filter
    const matchesSearch = 
      name.includes(searchQuery.toLowerCase()) ||
      empId.includes(searchQuery.toLowerCase()) ||
      designation.includes(searchQuery.toLowerCase());
      
    if (!matchesSearch) return false;

    // 2. Department filter
    if (selectedDept !== 'All' && deptId !== selectedDept) return false;

    // 3. Status filter
    const status = emp.status || 'Active';
    if (selectedStatus !== 'All' && status !== selectedStatus) return false;

    return true;
  });

  // Calculate Metrics
  const totalCount = filteredRows.length;
  const activeCount = filteredRows.filter(e => (e.status || 'Active') === 'Active').length;
  const inactiveCount = totalCount - activeCount;

  // Average Salary
  const salariedEmps = filteredRows.filter(e => e.salary && e.salary > 0);
  const avgSalary = salariedEmps.length > 0 
    ? Math.round(salariedEmps.reduce((sum, e) => sum + e.salary, 0) / salariedEmps.length) 
    : 0;

  // Department distribution
  const deptCounts = filteredRows.reduce((acc, emp) => {
    const name = emp.department?.name || 'Unassigned';
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});

  const maxDeptCount = Math.max(...Object.values(deptCounts), 1);

  // Format currency
  const formatSalary = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  // CSV / JSON Exports
  const handleExport = (format) => {
    setShowDownloadDropdown(false);
    if (filteredRows.length === 0) {
      setError('No employee rows to export.');
      return;
    }

    try {
      if (format === 'csv') {
        const headers = ['Name', 'Employee ID', 'Designation', 'Department', 'Role', 'Joining Date', 'Salary', 'Status'];
        const csvContent = [
          headers.join(','),
          ...filteredRows.map(row => [
            `"${row.firstName || ''} ${row.lastName || ''}"`,
            `"${row.employeeId || 'N/A'}"`,
            `"${row.designation || 'Employee'}"`,
            `"${row.department?.name || 'Unassigned'}"`,
            `"${row.role || 'employee'}"`,
            `"${row.joiningDate ? new Date(row.joiningDate).toLocaleDateString() : 'N/A'}"`,
            `"${row.salary || 0}"`,
            `"${row.status || 'Active'}"`
          ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Employee_Directory_Report.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setSuccess('Successfully downloaded CSV directory report.');
      } else {
        const jsonContent = JSON.stringify(filteredRows, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Employee_Directory_Report.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setSuccess('Successfully downloaded JSON directory report.');
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

      {/* Header Panel */}
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
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Employee Directory Report</h1>
          </div>
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Department filter */}
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

          {/* Status filter */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{
                padding: '0.6rem 2rem 0.6rem 1rem', borderRadius: '10px',
                border: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
                color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.88rem',
                appearance: 'none', cursor: 'pointer', minWidth: '130px'
              }}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive Only</option>
            </select>
            <span style={{ position: 'absolute', right: '10px', color: 'var(--text-secondary)', pointerEvents: 'none' }}>
              <ChevronDown size={14} />
            </span>
          </div>

          {/* Search input */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: '12px', color: 'var(--text-secondary)', pointerEvents: 'none' }}>
              <Search size={15} />
            </span>
            <input 
              type="text"
              placeholder="Search directory..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '0.6rem 1rem 0.6rem 2.2rem', borderRadius: '10px',
                border: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
                color: 'var(--text-primary)', fontSize: '0.88rem', outline: 'none',
                width: '180px', transition: 'width 0.2s'
              }}
              onFocus={e => e.currentTarget.style.width = '240px'}
              onBlur={e => e.currentTarget.style.width = '180px'}
            />
          </div>

          {/* Download Action */}
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
          {/* Metrics Row */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
            gap: '1.5rem', 
            marginBottom: '1.5rem' 
          }}>
            {/* Total headcount */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem' }}>
              <span style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(103,119,239,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={20} color="var(--primary-accent)" />
              </span>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>{totalCount}</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, margin: 0 }}>Total Headcount</p>
              </div>
            </div>

            {/* Active Only */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem' }}>
              <span style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserCheck size={20} color="var(--success)" />
              </span>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>{activeCount}</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, margin: 0 }}>Active Colleagues</p>
              </div>
            </div>

            {/* Inactive Only */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem' }}>
              <span style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserMinus size={20} color="var(--danger)" />
              </span>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>{inactiveCount}</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, margin: 0 }}>Suspended/Inactive</p>
              </div>
            </div>

            {/* Average salary */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem' }}>
              <span style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--warning-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DollarSign size={20} color="var(--warning)" />
              </span>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>{formatSalary(avgSalary)}</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, margin: 0 }}>Average Salary</p>
              </div>
            </div>
          </div>

          {/* Department Breakdown Bar Chart */}
          <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1rem' }}>
              Department Distribution
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {Object.entries(deptCounts).map(([deptName, count]) => {
                const pct = (count / maxDeptCount) * 100;
                return (
                  <div key={deptName} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ width: '130px', fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {deptName}
                    </span>
                    <div style={{ flex: 1, height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ 
                        width: `${pct}%`, height: '100%', 
                        background: 'linear-gradient(90deg, var(--primary-accent) 0%, #3f51b5 100%)',
                        borderRadius: '4px', transition: 'width 0.8s ease'
                      }} />
                    </div>
                    <span style={{ width: '30px', textAlign: 'right', fontSize: '0.83rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Roster Table */}
          <div className="table-container">
            <div className="table-header-row">
              <span className="table-title">Employee Roster Details</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                {totalCount} Active Filters Headcount
              </span>
            </div>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Employee ID</th>
                    <th>Joining Date</th>
                    <th>Department</th>
                    <th>Role</th>
                    <th>Salary</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        No employee profiles found.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map(row => (
                      <tr key={row._id}>
                        {/* Avatar name */}
                        <td style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #6777ef 0%, #3f51b5 100%)',
                            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: '0.75rem', flexShrink: 0
                          }}>
                            {getInitials(row.firstName, row.lastName)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                              {row.firstName} {row.lastName}
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 600 }}>
                              {row.designation || 'Employee'}
                            </div>
                          </div>
                        </td>

                        {/* ID */}
                        <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {row.employeeId || 'N/A'}
                        </td>

                        {/* Join Date */}
                        <td style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                          {row.joiningDate ? new Date(row.joiningDate).toLocaleDateString() : 'N/A'}
                        </td>

                        {/* Department */}
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                          {row.department?.name || 'Unassigned'}
                        </td>

                        {/* Role */}
                        <td style={{ textTransform: 'uppercase', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                          {row.role || 'employee'}
                        </td>

                        {/* Salary */}
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {row.salary ? formatSalary(row.salary) : '$0'}
                        </td>

                        {/* Status Badge */}
                        <td>
                          <span className={`badge ${
                            (row.status || 'Active') === 'Active' ? 'badge-present' : 'badge-inactive'
                          }`} style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem' }}>
                            {row.status || 'Active'}
                          </span>
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

export default EmployeeDirectoryReport;
