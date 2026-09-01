import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { 
  ArrowLeft, Search, Calendar, ChevronDown, Download, Clock, 
  Hourglass, FileSpreadsheet, Import, ShieldAlert, Check,
  CalendarDays, Activity, AlertCircle, Laptop
} from 'lucide-react';

const AttendanceAuditReport = () => {
  const navigate = useNavigate();
  
  // Date range defaults to June 2026 for seeded attendance data
  const [startDate, setStartDate] = useState('2026-06-01');
  const [endDate, setEndDate] = useState('2026-06-30');
  const [selectedDept, setSelectedDept] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [logs, setLogs] = useState([]);
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
      const [deptRes, logsRes] = await Promise.all([
        api.get('/departments').catch(() => ({ success: true, departments: [] })),
        api.get('/attendance/logs') // fetch all logs, then filter client-side by date range
      ]);

      if (deptRes.success) setDepartments(deptRes.departments || []);
      if (logsRes.success) setLogs(logsRes.logs || []);
    } catch (err) {
      setError(err.message || 'Failed to load attendance audit logs.');
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

  // Filter Logic: Date Range, Search Query, Department
  const filteredLogs = logs.filter(log => {
    // 1. Date Range filter
    if (log.date) {
      const logTime = new Date(log.date).getTime();
      const start = new Date(startDate).setHours(0,0,0,0);
      const end = new Date(endDate).setHours(23,59,59,999);
      if (logTime < start || logTime > end) return false;
    }

    // 2. Department filter
    if (selectedDept !== 'All') {
      const deptId = log.employee?.department?._id || log.employee?.department;
      if (deptId !== selectedDept) return false;
    }

    // 3. Search filter
    const name = `${log.employee?.firstName || ''} ${log.employee?.lastName || ''}`.toLowerCase();
    const empId = (log.employee?.employeeId || '').toLowerCase();
    const matchesSearch = 
      name.includes(searchQuery.toLowerCase()) ||
      empId.includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    return true;
  });

  // Calculate Metrics
  const totalSessions = filteredLogs.length;

  const totalHoursSum = filteredLogs.reduce((sum, log) => sum + (log.totalHours || 0), 0);
  const avgHours = totalSessions > 0 ? Math.round((totalHoursSum / totalSessions) * 10) / 10 : 0;

  const totalOvertime = Math.round(filteredLogs.reduce((sum, log) => sum + (log.overtimeHours || 0), 0) * 10) / 10;

  const lateCount = filteredLogs.filter(log => log.status === 'Late').length;
  const latePct = totalSessions > 0 ? Math.round((lateCount / totalSessions) * 100) : 0;

  // CSV / JSON Exports
  const handleExport = (format) => {
    setShowDownloadDropdown(false);
    if (filteredLogs.length === 0) {
      setError('No attendance audit rows to export.');
      return;
    }

    try {
      if (format === 'csv') {
        const headers = ['Name', 'Employee ID', 'Date', 'Clock In', 'Clock Out', 'Total Hours', 'Overtime Hours', 'Status', 'Work Mode'];
        const csvContent = [
          headers.join(','),
          ...filteredLogs.map(row => [
            `"${row.employee?.firstName || ''} ${row.employee?.lastName || ''}"`,
            `"${row.employee?.employeeId || 'N/A'}"`,
            `"${row.date ? new Date(row.date).toLocaleDateString() : 'N/A'}"`,
            `"${row.clockIn ? new Date(row.clockIn).toLocaleTimeString() : 'N/A'}"`,
            `"${row.clockOut ? new Date(row.clockOut).toLocaleTimeString() : 'N/A'}"`,
            `"${row.totalHours || 0}"`,
            `"${row.overtimeHours || 0}"`,
            `"${row.status || 'Present'}"`,
            `"${row.workMode || 'Office'}"`
          ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Attendance_Audit_Report_${startDate}_to_${endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setSuccess('Successfully downloaded CSV audit sheet.');
      } else {
        const jsonContent = JSON.stringify(filteredLogs, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Attendance_Audit_Report_${startDate}_to_${endDate}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setSuccess('Successfully downloaded JSON audit sheet.');
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

      {/* Header and Controls */}
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
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Attendance Audit Sheet</h1>
          </div>
        </div>

        {/* Action Options */}
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

          {/* Dept dropdown */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              style={{
                padding: '0.6rem 2rem 0.6rem 1rem', borderRadius: '10px',
                border: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
                color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.88rem',
                appearance: 'none', cursor: 'pointer', minWidth: '140px'
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
              placeholder="Search employee ID..."
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

          {/* Download dropdown */}
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
          {/* Metrics Summary Row */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
            gap: '1.5rem', 
            marginBottom: '2rem' 
          }}>
            {/* Total sessions */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem' }}>
              <span style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(103,119,239,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CalendarDays size={20} color="var(--primary-accent)" />
              </span>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>{totalSessions}</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, margin: 0 }}>Total Sessions logged</p>
              </div>
            </div>

            {/* Average working hours */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem' }}>
              <span style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={20} color="var(--success)" />
              </span>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>{avgHours} hrs</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, margin: 0 }}>Average hours/day</p>
              </div>
            </div>

            {/* Total Overtime hours */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem' }}>
              <span style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--warning-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={20} color="var(--warning)" />
              </span>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>{totalOvertime} hrs</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, margin: 0 }}>Overtime hours logged</p>
              </div>
            </div>

            {/* Late clock-in rate */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem' }}>
              <span style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertCircle size={20} color="var(--danger)" />
              </span>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>{latePct}%</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, margin: 0 }}>Late In Ratio</p>
              </div>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="table-container">
            <div className="table-header-row">
              <span className="table-title">Attendance Log Records</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                {totalSessions} records matching range
              </span>
            </div>
            
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Employee Name</th>
                    <th>Employee ID</th>
                    <th>Clock In</th>
                    <th>Clock Out</th>
                    <th>Working Hours</th>
                    <th>Overtime</th>
                    <th>Status</th>
                    <th>Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        No attendance logs found in this date range.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map(log => (
                      <tr key={log._id}>
                        {/* Date */}
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                          {log.date ? new Date(log.date).toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' }) : 'N/A'}
                        </td>

                        {/* Name Column */}
                        <td style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #6777ef 0%, #3f51b5 100%)',
                            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: '0.72rem', flexShrink: 0
                          }}>
                            {getInitials(log.employee?.firstName, log.employee?.lastName)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                              {log.employee?.firstName} {log.employee?.lastName}
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 600 }}>
                              {log.employee?.designation}
                            </div>
                          </div>
                        </td>

                        {/* Employee ID */}
                        <td style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                          {log.employee?.employeeId || 'N/A'}
                        </td>

                        {/* Clock In */}
                        <td style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                          {log.clockIn ? new Date(log.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>

                        {/* Clock Out */}
                        <td style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                          {log.clockOut ? new Date(log.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>

                        {/* Total Hours */}
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {log.totalHours ? `${log.totalHours} hrs` : '0 hrs'}
                        </td>

                        {/* Overtime Hours */}
                        <td style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                          {log.overtimeHours ? `${log.overtimeHours} hrs` : '0 hrs'}
                        </td>

                        {/* Status Badge */}
                        <td>
                          <span className={`badge ${
                            log.status === 'Present' ? 'badge-present' :
                            log.status === 'Late' ? 'badge-late' :
                            log.status === 'Half Day' ? 'badge-halfday' :
                            'badge-inactive'
                          }`} style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem' }}>
                            {log.status}
                          </span>
                        </td>

                        {/* Work Mode */}
                        <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-secondary)' }}>
                            <Laptop size={11} color="var(--primary-accent)" />
                            {log.workMode || 'Office'}
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

export default AttendanceAuditReport;
