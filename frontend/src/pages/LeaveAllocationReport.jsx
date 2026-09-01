import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { 
  ArrowLeft, Search, Calendar, ChevronDown, Download, FileSpreadsheet,
  Import, ShieldAlert, Check, FileText, CheckSquare, AlertCircle,
  HelpCircle, Umbrella, UserPlus
} from 'lucide-react';

const LeaveAllocationReport = () => {
  const navigate = useNavigate();
  
  // Date range defaults to full calendar year 2026
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-12-31');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All'); // 'All', 'Approved', 'Pending', 'Rejected'
  const [searchQuery, setSearchQuery] = useState('');
  
  const [leaves, setLeaves] = useState([]);
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
      const [deptRes, leaveRes] = await Promise.all([
        api.get('/departments').catch(() => ({ success: true, departments: [] })),
        api.get('/leaves') // fetches all leaves
      ]);

      if (deptRes.success) setDepartments(deptRes.departments || []);
      if (leaveRes.success) setLeaves(leaveRes.leaves || []);
    } catch (err) {
      setError(err.message || 'Failed to load leave allocation sheets.');
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

  // Calculate days between two dates inclusive
  const calculateDays = (start, end) => {
    const diffMs = new Date(end) - new Date(start);
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;
  };

  // Filter logic: Date range overlapping, status, department, and search
  const filteredLeaves = leaves.filter(leave => {
    // 1. Date overlap check
    const leaveStart = new Date(leave.startDate).getTime();
    const leaveEnd = new Date(leave.endDate).getTime();
    const rangeStart = new Date(startDate).setHours(0,0,0,0);
    const rangeEnd = new Date(endDate).setHours(23,59,59,999);

    // Filter out if log is completely outside range
    if (leaveEnd < rangeStart || leaveStart > rangeEnd) return false;

    // 2. Department filter
    if (selectedDept !== 'All') {
      const deptId = leave.employee?.department?._id || leave.employee?.department;
      if (deptId !== selectedDept) return false;
    }

    // 3. Status filter
    if (selectedStatus !== 'All' && leave.status !== selectedStatus) return false;

    // 4. Search query
    const name = `${leave.employee?.firstName || ''} ${leave.employee?.lastName || ''}`.toLowerCase();
    const empId = (leave.employee?.employeeId || '').toLowerCase();
    const matchesSearch = 
      name.includes(searchQuery.toLowerCase()) ||
      empId.includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    return true;
  });

  // Calculate stats
  const totalCount = filteredLeaves.length;
  const approvedCount = filteredLeaves.filter(l => l.status === 'Approved').length;
  const pendingCount = filteredLeaves.filter(l => l.status === 'Pending').length;
  const rejectedCount = totalCount - approvedCount - pendingCount;

  // Types distribution
  let sickCount = 0;
  let casualCount = 0;
  let maternityCount = 0;
  let unpaidCount = 0;

  filteredLeaves.forEach(l => {
    if (l.leaveType === 'Sick') sickCount++;
    else if (l.leaveType === 'Casual') casualCount++;
    else if (l.leaveType === 'Maternity') maternityCount++;
    else unpaidCount++;
  });

  // CSV / JSON Exports
  const handleExport = (format) => {
    setShowDownloadDropdown(false);
    if (filteredLeaves.length === 0) {
      setError('No leave rows to export.');
      return;
    }

    try {
      if (format === 'csv') {
        const headers = ['Name', 'Employee ID', 'Leave Type', 'Start Date', 'End Date', 'Total Days', 'Status', 'Reason', 'Applied Date'];
        const csvContent = [
          headers.join(','),
          ...filteredLeaves.map(row => [
            `"${row.employee?.firstName || ''} ${row.employee?.lastName || ''}"`,
            `"${row.employee?.employeeId || 'N/A'}"`,
            `"${row.leaveType || ''}"`,
            `"${row.startDate ? new Date(row.startDate).toLocaleDateString() : 'N/A'}"`,
            `"${row.endDate ? new Date(row.endDate).toLocaleDateString() : 'N/A'}"`,
            `"${calculateDays(row.startDate, row.endDate)}"`,
            `"${row.status || 'Pending'}"`,
            `"${row.reason || ''}"`,
            `"${row.appliedDate ? new Date(row.appliedDate).toLocaleDateString() : 'N/A'}"`
          ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Leave_Allocation_Report_${startDate}_to_${endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setSuccess('Successfully downloaded CSV leave report.');
      } else {
        const jsonContent = JSON.stringify(filteredLeaves, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Leave_Allocation_Report_${startDate}_to_${endDate}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setSuccess('Successfully downloaded JSON leave report.');
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

      {/* Header section */}
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
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Leave Allocation Sheet</h1>
          </div>
        </div>

        {/* Filters and Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Start date */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: '10px', color: 'var(--text-secondary)', pointerEvents: 'none' }}>
              <Calendar size={14} />
            </span>
            <input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                padding: '0.6rem 0.6rem 0.6rem 2.1rem', borderRadius: '10px',
                border: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
                color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.83rem', outline: 'none'
              }}
            />
          </div>

          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700 }}>to</span>

          {/* End date */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: '10px', color: 'var(--text-secondary)', pointerEvents: 'none' }}>
              <Calendar size={14} />
            </span>
            <input 
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                padding: '0.6rem 0.6rem 0.6rem 2.1rem', borderRadius: '10px',
                border: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
                color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.83rem', outline: 'none'
              }}
            />
          </div>

          {/* Status selection */}
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
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
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
              placeholder="Search leaves..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '0.6rem 1rem 0.6rem 2.2rem', borderRadius: '10px',
                border: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
                color: 'var(--text-primary)', fontSize: '0.88rem', outline: 'none',
                width: '150px', transition: 'width 0.2s'
              }}
              onFocus={e => e.currentTarget.style.width = '180px'}
              onBlur={e => e.currentTarget.style.width = '150px'}
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
          {/* Summary Cards */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
            gap: '1.5rem', 
            marginBottom: '1.5rem' 
          }}>
            {/* Total leaves */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem' }}>
              <span style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(103,119,239,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={20} color="var(--primary-accent)" />
              </span>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>{totalCount}</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, margin: 0 }}>Total Applications</p>
              </div>
            </div>

            {/* Approved */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem' }}>
              <span style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckSquare size={20} color="var(--success)" />
              </span>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>{approvedCount}</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, margin: 0 }}>Approved requests</p>
              </div>
            </div>

            {/* Pending */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem' }}>
              <span style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--warning-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertCircle size={20} color="var(--warning)" />
              </span>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>{pendingCount}</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, margin: 0 }}>Pending approvals</p>
              </div>
            </div>

            {/* Rejected */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem' }}>
              <span style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HelpCircle size={20} color="var(--danger)" />
              </span>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>{rejectedCount}</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, margin: 0 }}>Rejected requests</p>
              </div>
            </div>
          </div>

          {/* Leave distribution breakdown */}
          <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1.25rem' }}>
              Leave Types Distribution
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              {/* Sick */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <span style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Umbrella size={15} color="#ef4444" />
                </span>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{sickCount}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Sick Leave</div>
                </div>
              </div>

              {/* Casual */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <span style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Umbrella size={15} color="#3b82f6" />
                </span>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{casualCount}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Casual Leave</div>
                </div>
              </div>

              {/* Maternity */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <span style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Umbrella size={15} color="#10b981" />
                </span>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{maternityCount}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Maternity Leave</div>
                </div>
              </div>

              {/* Unpaid */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <span style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Umbrella size={15} color="#8b5cf6" />
                </span>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{unpaidCount}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Unpaid/Other</div>
                </div>
              </div>
            </div>
          </div>

          {/* Allocations Table */}
          <div className="table-container">
            <div className="table-header-row">
              <span className="table-title">Leave Request Allocations</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                {totalCount} records matching range
              </span>
            </div>
            
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee Name</th>
                    <th>Employee ID</th>
                    <th>Leave Type</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Total Days</th>
                    <th>Status</th>
                    <th>Reason</th>
                    <th>Applied Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeaves.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        No leave allocations found.
                      </td>
                    </tr>
                  ) : (
                    filteredLeaves.map(row => (
                      <tr key={row._id}>
                        {/* Employee Name */}
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

                        {/* Leave Type */}
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                          {row.leaveType}
                        </td>

                        {/* Start Date */}
                        <td style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                          {row.startDate ? new Date(row.startDate).toLocaleDateString() : 'N/A'}
                        </td>

                        {/* End Date */}
                        <td style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                          {row.endDate ? new Date(row.endDate).toLocaleDateString() : 'N/A'}
                        </td>

                        {/* Total Days */}
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {calculateDays(row.startDate, row.endDate)} days
                        </td>

                        {/* Status Badge */}
                        <td>
                          <span className={`badge ${
                            row.status === 'Approved' ? 'badge-present' :
                            row.status === 'Pending' ? 'badge-pending' :
                            'badge-inactive'
                          }`} style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem' }}>
                            {row.status}
                          </span>
                        </td>

                        {/* Reason */}
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.83rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.reason}>
                          {row.reason}
                        </td>

                        {/* Applied Date */}
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                          {row.appliedDate ? new Date(row.appliedDate).toLocaleDateString() : '-'}
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

export default LeaveAllocationReport;
