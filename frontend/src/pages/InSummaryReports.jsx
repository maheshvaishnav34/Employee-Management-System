import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { 
  ArrowLeft, Search, Calendar, ChevronDown, Download, 
  Hourglass, Umbrella, Monitor, Smartphone, Globe, 
  CalendarDays, RotateCcw, Import, ShieldAlert,
  Clock, Check, FileSpreadsheet, XCircle
} from 'lucide-react';

// Semi-circular gauge SVG Component
const SemiCircularGauge = ({ value, total, color = '#2ebd7f', emptyColor = 'var(--border-color)' }) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  const radius = 50;
  const strokeWidth = 10;
  const strokeDasharray = 157.08; // Circumference of semicircle (PI * R)
  const strokeDashoffset = strokeDasharray - (Math.min(percentage, 100) / 100) * strokeDasharray;

  return (
    <div style={{ 
      position: 'relative', 
      width: '150px', 
      height: '90px', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'flex-end', 
      overflow: 'hidden' 
    }}>
      <svg width="140" height="80" viewBox="0 0 120 65" style={{ transform: 'translateY(5px)' }}>
        {/* Background track */}
        <path
          d="M 10,60 A 50,50 0 0 1 110,60"
          fill="none"
          stroke={emptyColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          opacity={0.3}
        />
        {/* Foreground value fill */}
        <path
          d="M 10,60 A 50,50 0 0 1 110,60"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
      
      {/* Outer Labels */}
      <span style={{ position: 'absolute', bottom: '0px', left: '8px', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)' }}>0</span>
      <span style={{ position: 'absolute', bottom: '0px', right: '8px', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{total}</span>
      
      {/* Center Percentage Display */}
      <div style={{ 
        position: 'absolute', 
        bottom: '0px', 
        textAlign: 'center', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        justifyContent: 'center',
        height: '50px'
      }}>
        <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit' }}>{value}/{total}</span>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Employees</span>
      </div>
    </div>
  );
};

const InSummaryReports = () => {
  const navigate = useNavigate();
  
  // Date state initialized to seeded data date "2026-06-12"
  const [selectedDate, setSelectedDate] = useState('2026-06-12');
  const [selectedDept, setSelectedDept] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data lists
  const [employees, setEmployees] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [regularizations, setRegularizations] = useState([]);
  const [departments, setDepartments] = useState([]);
  
  // Loading & Error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
  const downloadRef = useRef(null);

  // Time filter active state
  const [timeFilter, setTimeFilter] = useState('All'); // 'All', 'OnTime', 'Late'

  // Fetch all datasets
  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      // Get Departments for filter dropdown
      const deptRes = await api.get('/departments').catch(() => ({ success: true, departments: [] }));
      if (deptRes.success) {
        setDepartments(deptRes.departments || []);
      }

      // Fetch employees, logs, leaves, and regularizations
      const [employeesRes, logsRes, leavesRes, regRes] = await Promise.all([
        api.get('/employees'),
        api.get(`/attendance/logs?date=${selectedDate}`),
        api.get('/leaves').catch(() => ({ success: true, leaves: [] })),
        api.get('/attendance/regularize/all').catch(() => ({ success: true, regularizations: [] }))
      ]);

      if (employeesRes.success) {
        setEmployees(employeesRes.employees || []);
      }
      if (logsRes.success) {
        setAttendanceLogs(logsRes.logs || []);
      }
      if (leavesRes.success) {
        setLeaves(leavesRes.leaves || []);
      }
      if (regRes.success) {
        setRegularizations(regRes.regularizations || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch attendance summary data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  // Handle outside clicks to close Download menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (downloadRef.current && !downloadRef.current.contains(e.target)) {
        setShowDownloadDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ────────────────── CALCULATING STATS ──────────────────

  // Filter employees based on department selection
  const filteredEmployees = employees.filter(emp => {
    if (selectedDept === 'All') return true;
    return emp.department?._id === selectedDept || emp.department === selectedDept;
  });

  const totalEmpCount = filteredEmployees.length;

  // Filter logs based on department selection
  const filteredLogs = attendanceLogs.filter(log => {
    if (selectedDept === 'All') return true;
    const empDept = log.employee?.department?._id || log.employee?.department;
    return empDept === selectedDept;
  });

  const presentCount = filteredLogs.length;

  // Filter leaves active on this specific date
  const activeLeaves = leaves.filter(leave => {
    if (leave.status !== 'Approved') return false;
    // Check if employee matches selected department
    if (selectedDept !== 'All') {
      const empDept = leave.employee?.department?._id || leave.employee?.department;
      if (empDept !== selectedDept) return false;
    }
    const start = new Date(leave.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(leave.endDate);
    end.setHours(23, 59, 59, 999);
    const current = new Date(selectedDate);
    return current >= start && current <= end;
  });

  const offDayCount = activeLeaves.length;
  
  // Calculate Yet to Clock In: Total - Present - Off Day
  const yetToClockInCount = Math.max(0, totalEmpCount - presentCount - offDayCount);

  // Source distribution
  let kioskCount = 0;
  let mobileCount = 0;
  let webCount = 0;
  let regularizationCount = 0;
  let correctionCount = 0;
  let importCount = 0;

  // Check which check-ins were regularized on this date
  const activeRegularizations = regularizations.filter(reg => {
    if (reg.status !== 'Approved') return false;
    const regDate = new Date(reg.date).toISOString().split('T')[0];
    return regDate === selectedDate;
  });
  const regularizedEmpIds = activeRegularizations.map(r => r.employee?._id || r.employee);

  filteredLogs.forEach(log => {
    const empId = log.employee?._id || log.employee;
    if (regularizedEmpIds.includes(empId)) {
      regularizationCount++;
    } else if (log.workMode === 'Office') {
      kioskCount++;
    } else if (log.workMode === 'WFH') {
      mobileCount++;
    } else if (log.workMode === 'Hybrid') {
      webCount++;
    } else {
      kioskCount++; // fallback
    }
  });

  // Clock In Time Statistics
  let onTimeCount = 0;
  let lateCount = 0;

  filteredLogs.forEach(log => {
    if (log.status === 'Late') {
      lateCount++;
    } else {
      onTimeCount++;
    }
  });

  // Table rows generation
  // We want to combine Present employees (logs) and Absent employees (not in logs)
  const presentEmpIds = filteredLogs.map(l => l.employee?._id || l.employee);
  const offDayEmpIds = activeLeaves.map(l => l.employee?._id || l.employee);

  const tableRows = filteredEmployees.map(emp => {
    const isPresent = presentEmpIds.includes(emp._id);
    const isOffDay = offDayEmpIds.includes(emp._id);
    const log = filteredLogs.find(l => (l.employee?._id || l.employee) === emp._id);
    const regularization = activeRegularizations.find(r => (r.employee?._id || r.employee) === emp._id);

    let rowStatus = 'Absent';
    let firstIn = '-';
    let checkInSource = '-';

    if (isPresent && log) {
      rowStatus = log.status; // 'Present', 'Late', etc
      firstIn = log.clockIn ? new Date(log.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
      
      if (regularization) {
        checkInSource = 'Regularization';
      } else if (log.workMode === 'Office') {
        checkInSource = 'Kiosk';
      } else if (log.workMode === 'WFH') {
        checkInSource = 'Mobile';
      } else if (log.workMode === 'Hybrid') {
        checkInSource = 'Web';
      } else {
        checkInSource = 'Kiosk';
      }
    } else if (isOffDay) {
      rowStatus = 'Off Day';
    }

    return {
      id: emp._id,
      name: `${emp.firstName || ''} ${emp.lastName || ''}`,
      firstName: emp.firstName,
      lastName: emp.lastName,
      designation: emp.designation || 'Employee',
      employeeId: emp.employeeId || 'N/A',
      office: emp.office || 'StackCode Training Inst.',
      department: emp.department?.name || 'Development',
      employeeType: emp.employeeType || 'Permanent',
      firstIn,
      status: rowStatus,
      source: checkInSource,
      shift: emp.shift || 'General Shift'
    };
  });

  // Apply Search Query & Status Filters
  const searchedRows = tableRows.filter(row => {
    // 1. Search Query filter
    const matchesSearch = 
      row.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.department.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // 2. Time statistics filter (OnTime, Late)
    if (timeFilter === 'OnTime') {
      return row.status === 'Present' || row.status === 'Half Day';
    }
    if (timeFilter === 'Late') {
      return row.status === 'Late';
    }

    return true;
  });

  // CSV / JSON Exports
  const handleExport = (format) => {
    setShowDownloadDropdown(false);
    if (searchedRows.length === 0) {
      setError('No data rows to export.');
      return;
    }

    try {
      if (format === 'csv') {
        const headers = ['Name', 'Employee ID', 'Office', 'Department', 'Employee Type', 'First In', 'Source', 'Status', 'Shift'];
        const csvContent = [
          headers.join(','),
          ...searchedRows.map(row => [
            `"${row.name}"`,
            `"${row.employeeId}"`,
            `"${row.office}"`,
            `"${row.department}"`,
            `"${row.employeeType}"`,
            `"${row.firstIn}"`,
            `"${row.source}"`,
            `"${row.status}"`,
            `"${row.shift}"`
          ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Attendance_InSummary_${selectedDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setSuccess('Successfully downloaded CSV report.');
      } else {
        const jsonContent = JSON.stringify(searchedRows, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Attendance_InSummary_${selectedDate}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setSuccess('Successfully downloaded JSON report.');
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Export failed: ' + err.message);
    }
  };

  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'EM';
  };

  return (
    <div className="page-container">
      {/* Dynamic Notifications */}
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

      {/* Main Header Console */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '1.5rem', 
        flexWrap: 'wrap', 
        gap: '1rem' 
      }}>
        {/* Back Button and Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={() => navigate('/reports')}
            style={{
              width: '40px', height: '40px', borderRadius: '12px',
              border: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.2s', color: 'var(--text-primary)'
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-accent)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>In Summary</h1>
          </div>
        </div>

        {/* Action Options: Date, Employee, Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Date Picker */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: '12px', color: 'var(--text-secondary)', pointerEvents: 'none' }}>
              <Calendar size={15} />
            </span>
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                padding: '0.6rem 0.8rem 0.6rem 2.2rem',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontWeight: 600,
                fontSize: '0.88rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            />
          </div>

          {/* Department Filter */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              style={{
                padding: '0.6rem 2rem 0.6rem 1rem',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontWeight: 600,
                fontSize: '0.88rem',
                outline: 'none',
                appearance: 'none',
                cursor: 'pointer',
                minWidth: '160px'
              }}
            >
              <option value="All">All Departments</option>
              {departments.map(dept => (
                <option key={dept._id} value={dept._id}>{dept.name}</option>
              ))}
            </select>
            <span style={{ position: 'absolute', right: '10px', color: 'var(--text-secondary)', pointerEvents: 'none' }}>
              <ChevronDown size={14} />
            </span>
          </div>

          {/* Search Field */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: '12px', color: 'var(--text-secondary)', pointerEvents: 'none' }}>
              <Search size={15} />
            </span>
            <input 
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '0.6rem 1rem 0.6rem 2.2rem',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.88rem',
                outline: 'none',
                width: '180px',
                transition: 'width 0.2s'
              }}
              onFocus={e => e.currentTarget.style.width = '240px'}
              onBlur={e => e.currentTarget.style.width = '180px'}
            />
          </div>

          {/* Download Dropdown */}
          <div ref={downloadRef} style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
              style={{
                padding: '0.6rem 1rem',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-accent)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
            >
              Download As <ChevronDown size={14} />
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
          <span style={{ marginLeft: '1rem', fontWeight: 600 }}>Analyzing logs & attendance records...</span>
        </div>
      ) : (
        <>
          {/* Main Visual Dashboard Cards */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
            gap: '1.5rem', 
            marginBottom: '2rem' 
          }}>
            {/* Card 1: Clock In - Source */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: '200px' }}>
              <h3 style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1.25rem' }}>
                Clock In - Source
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: '1.5rem' }}>
                {/* Gauge Semicircle */}
                <SemiCircularGauge value={presentCount} total={totalEmpCount} color="#2ebd7f" />
                
                {/* Break-up metrics list */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '0.75rem 1rem', 
                  flex: 1,
                  fontSize: '0.82rem',
                  fontWeight: 700
                }}>
                  {/* Kiosk */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(46,189,127,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Monitor size={13} color="#2ebd7f" />
                    </span>
                    <div>
                      <div style={{ color: 'var(--text-primary)', fontSize: '0.88rem' }}>{kioskCount}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>Kiosk</div>
                    </div>
                  </div>
                  
                  {/* Mobile */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(103,119,239,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Smartphone size={13} color="#6777ef" />
                    </span>
                    <div>
                      <div style={{ color: 'var(--text-primary)', fontSize: '0.88rem' }}>{mobileCount}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>Mobile</div>
                    </div>
                  </div>

                  {/* Web */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(0,188,212,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Globe size={13} color="#00bcd4" />
                    </span>
                    <div>
                      <div style={{ color: 'var(--text-primary)', fontSize: '0.88rem' }}>{webCount}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>Web</div>
                    </div>
                  </div>

                  {/* Regularization */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(255,177,25,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CalendarDays size={13} color="#ffb119" />
                    </span>
                    <div>
                      <div style={{ color: 'var(--text-primary)', fontSize: '0.88rem' }}>{regularizationCount}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>Regularization</div>
                    </div>
                  </div>

                  {/* Correction */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(249,115,22,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <RotateCcw size={13} color="#f97316" />
                    </span>
                    <div>
                      <div style={{ color: 'var(--text-primary)', fontSize: '0.88rem' }}>{correctionCount}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>Correction</div>
                    </div>
                  </div>

                  {/* Import */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Import size={13} color="#8b5cf6" />
                    </span>
                    <div>
                      <div style={{ color: 'var(--text-primary)', fontSize: '0.88rem' }}>{importCount}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>Import</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Clock In - Time Statistics */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: '200px' }}>
              <h3 style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1.25rem' }}>
                Clock In - Time Statistics
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: '1.5rem' }}>
                {/* Gauge Semicircle */}
                <SemiCircularGauge value={presentCount} total={totalEmpCount} color="#2ebd7f" />
                
                {/* Break-up metrics list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                  {/* On Time */}
                  <div 
                    onClick={() => setTimeFilter(timeFilter === 'OnTime' ? 'All' : 'OnTime')}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer',
                      padding: '0.4rem 0.6rem', borderRadius: '8px',
                      background: timeFilter === 'OnTime' ? 'var(--success-bg)' : 'transparent',
                      transition: 'background 0.2s',
                      border: timeFilter === 'OnTime' ? '1px solid rgba(46,189,127,0.3)' : '1px solid transparent'
                    }}
                  >
                    <span style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Clock size={15} color="var(--success)" />
                    </span>
                    <div>
                      <div style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 800 }}>{onTimeCount}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 600 }}>On Time</div>
                    </div>
                  </div>

                  {/* Late In */}
                  <div 
                    onClick={() => setTimeFilter(timeFilter === 'Late' ? 'All' : 'Late')}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer',
                      padding: '0.4rem 0.6rem', borderRadius: '8px',
                      background: timeFilter === 'Late' ? 'var(--danger-bg)' : 'transparent',
                      transition: 'background 0.2s',
                      border: timeFilter === 'Late' ? '1px solid rgba(255,91,91,0.3)' : '1px solid transparent'
                    }}
                  >
                    <span style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Clock size={15} color="var(--danger)" />
                    </span>
                    <div>
                      <div style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 800 }}>{lateCount}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 600 }}>Late In</div>
                    </div>
                  </div>
                </div>

                {/* Filter Clear button if active */}
                {timeFilter !== 'All' && (
                  <button 
                    onClick={() => setTimeFilter('All')}
                    style={{
                      border: 'none', background: 'none', cursor: 'pointer',
                      fontSize: '0.7rem', color: 'var(--primary-accent)', fontWeight: 800,
                      alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '2px'
                    }}
                  >
                    <XCircle size={10} /> Clear
                  </button>
                )}
              </div>
            </div>

            {/* Card 3: Not Clocked In */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Hourglass: Yet to Clock In */}
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem', flex: 1 }}>
                <span style={{ 
                  width: '44px', height: '44px', borderRadius: '12px', 
                  background: 'rgba(255,91,91,0.1)', display: 'flex', 
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <Hourglass size={20} color="var(--danger)" />
                </span>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    {yetToClockInCount} / {totalEmpCount}
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, margin: 0 }}>
                    Yet to Clock In
                  </p>
                </div>
              </div>

              {/* Umbrella: Off Day */}
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem', flex: 1 }}>
                <span style={{ 
                  width: '44px', height: '44px', borderRadius: '12px', 
                  background: 'rgba(0,188,212,0.1)', display: 'flex', 
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <Umbrella size={20} color="var(--info)" />
                </span>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    {offDayCount} / {totalEmpCount}
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, margin: 0 }}>
                    Off Day
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Table Element */}
          <div className="table-container">
            <div className="table-header-row">
              <span className="table-title">Employees Details</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                {searchedRows.length} Rows
              </span>
            </div>
            
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Employee ID</th>
                    <th>Office</th>
                    <th>Department</th>
                    <th>Employee Type</th>
                    <th>First In</th>
                    <th>Source</th>
                    <th>Status</th>
                    <th>Shift</th>
                  </tr>
                </thead>
                <tbody>
                  {searchedRows.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        <ShieldAlert size={24} style={{ display: 'block', margin: '0 auto 0.5rem', opacity: 0.5 }} />
                        No employees found matching the current selections.
                      </td>
                    </tr>
                  ) : (
                    searchedRows.map(row => (
                      <tr key={row.id}>
                        {/* Name Column with initials avatar & subtitle */}
                        <td style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #6777ef 0%, #3f51b5 100%)',
                            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: '0.75rem', flexShrink: 0
                          }}>
                            {getInitials(row.name)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.88rem' }}>{row.name}</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 600 }}>{row.designation}</div>
                          </div>
                        </td>

                        {/* ID Column */}
                        <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {row.employeeId}
                        </td>

                        {/* Office Location */}
                        <td style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                          {row.office}
                        </td>

                        {/* Department */}
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                          {row.department}
                        </td>

                        {/* Employee Type */}
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                          {row.employeeType}
                        </td>

                        {/* First In Time */}
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {row.firstIn}
                        </td>

                        {/* Check-In Source */}
                        <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {row.source}
                        </td>

                        {/* Status Badge */}
                        <td>
                          <span className={`badge ${
                            row.status === 'Present' ? 'badge-present' :
                            row.status === 'Late' ? 'badge-late' :
                            row.status === 'Half Day' ? 'badge-halfday' :
                            row.status === 'Off Day' ? 'badge-late' :
                            'badge-inactive'
                          }`} style={{ 
                            fontSize: '0.68rem', padding: '0.2rem 0.5rem', 
                            background: row.status === 'Off Day' ? 'rgba(0, 188, 212, 0.12)' : undefined,
                            color: row.status === 'Off Day' ? '#00bcd4' : undefined
                          }}>
                            {row.status}
                          </span>
                        </td>

                        {/* Shift */}
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                          {row.shift}
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

      {/* Styled css additions */}
      <style>{`
        .dropdown-item-hover:hover {
          background-color: var(--bg-sidebar-active) !important;
        }
        .dropdown-item-hover {
          transition: background-color 0.15s ease;
        }
      `}</style>
    </div>
  );
};

export default InSummaryReports;
