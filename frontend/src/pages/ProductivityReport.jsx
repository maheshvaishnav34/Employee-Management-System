import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, Search, Calendar, ChevronDown, Check,
  Clock, FileSpreadsheet, Import, ShieldAlert,
  ClipboardList, AlertTriangle, User, TrendingUp,
  XCircle, Award, CheckCircle2, AlertCircle
} from 'lucide-react';

const PRIORITY_COLORS = {
  Low:      { color: '#2ebd7f', bg: 'rgba(46,189,127,0.12)' },
  Medium:   { color: '#ffb119', bg: 'rgba(255,177,25,0.12)' },
  High:     { color: '#ff5b5b', bg: 'rgba(255,91,91,0.12)' },
  Critical: { color: '#d946ef', bg: 'rgba(217,70,239,0.12)' },
};

const STATUS_COLORS = {
  Pending:       { color: 'var(--warning)', bg: 'rgba(255,177,25,0.1)' },
  'In Progress': { color: 'var(--info)', bg: 'rgba(58,183,232,0.1)' },
  Completed:     { color: 'var(--success)', bg: 'rgba(46,189,127,0.1)' },
  Cancelled:     { color: 'var(--danger)', bg: 'rgba(255,91,91,0.1)' },
};

const ProductivityReport = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedEmployee, setSelectedEmployee] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
  
  const downloadRef = useRef(null);
  const isManager = user?.role === 'manager';

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [deptRes, empRes, tasksRes] = await Promise.all([
        api.get('/departments').catch(() => ({ success: true, departments: [] })),
        api.get('/employees').catch(() => ({ success: true, employees: [] })),
        api.get('/admin/reports/productivity').catch((e) => {
          // Fallback to direct tasks route if admin reports is restricted or error occurs
          return api.get('/tasks');
        })
      ]);

      if (deptRes.success) setDepartments(deptRes.departments || []);
      if (empRes.success) setEmployees(empRes.employees || []);
      
      // Support both structured report data and tasks fallback structure
      if (tasksRes.success) {
        setTasks(tasksRes.data || tasksRes.tasks || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load task productivity logs.');
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

  // ────────────────── FILTER LOGIC ──────────────────
  const filteredTasks = tasks.filter(task => {
    // 1. Department filter
    if (selectedDept !== 'All') {
      const deptId = task.assignedTo?.department?._id || task.assignedTo?.department;
      if (deptId !== selectedDept) return false;
    }

    // 2. Employee filter
    if (selectedEmployee !== 'All') {
      const empId = task.assignedTo?._id || task.assignedTo;
      if (empId !== selectedEmployee) return false;
    }

    // 3. Priority filter
    if (selectedPriority !== 'All') {
      if (task.priority !== selectedPriority) return false;
    }

    // 4. Status filter
    if (selectedStatus !== 'All') {
      if (task.status !== selectedStatus) return false;
    }

    // 5. Search text filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      const titleMatch = (task.title || '').toLowerCase().includes(query);
      const descMatch = (task.description || '').toLowerCase().includes(query);
      const nameMatch = `${task.assignedTo?.firstName || ''} ${task.assignedTo?.lastName || ''}`.toLowerCase().includes(query);
      if (!titleMatch && !descMatch && !nameMatch) return false;
    }

    return true;
  });

  // Calculate Metrics
  const totalTasks = filteredTasks.length;
  const completedTasks = filteredTasks.filter(t => t.status === 'Completed').length;
  const pendingTasks = filteredTasks.filter(t => ['Pending', 'In Progress'].includes(t.status)).length;
  
  const overdueTasks = filteredTasks.filter(t => {
    if (t.status === 'Completed' || t.status === 'Cancelled') return false;
    if (!t.dueDate) return false;
    return new Date(t.dueDate) < new Date();
  }).length;
  
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // ────────────────── TEAM MEMBERS SUMMARY METRICS ──────────────────
  // Calculate productivity stats per employee
  const employeeStats = employees.map(emp => {
    const empTasks = tasks.filter(t => (t.assignedTo?._id || t.assignedTo) === emp._id);
    const empCompleted = empTasks.filter(t => t.status === 'Completed').length;
    const empTotal = empTasks.length;
    const empRate = empTotal > 0 ? Math.round((empCompleted / empTotal) * 100) : 0;
    
    return {
      id: emp._id,
      name: `${emp.firstName} ${emp.lastName}`,
      designation: emp.designation,
      total: empTotal,
      completed: empCompleted,
      rate: empRate
    };
  }).filter(e => e.total > 0) // only show employees with at least 1 task
    .sort((a, b) => b.rate - a.rate); // sort by highest completion rate

  // ────────────────── EXPORTS ──────────────────
  const handleExport = (format) => {
    setShowDownloadDropdown(false);
    if (filteredTasks.length === 0) {
      setError('No tasks data rows to export.');
      return;
    }

    try {
      if (format === 'csv') {
        const headers = ['Task Title', 'Description', 'Assigned To', 'Priority', 'Status', 'Progress (%)', 'Due Date', 'Assigned By'];
        const csvContent = [
          headers.join(','),
          ...filteredTasks.map(row => [
            `"${row.title || ''}"`,
            `"${row.description || ''}"`,
            `"${row.assignedTo?.firstName || ''} ${row.assignedTo?.lastName || ''}"`,
            `"${row.priority || 'Medium'}"`,
            `"${row.status || 'Pending'}"`,
            `"${row.progress || 0}"`,
            `"${row.dueDate ? new Date(row.dueDate).toLocaleDateString() : 'N/A'}"`,
            `"${row.assignedBy?.username || 'System'}"`
          ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Task_Productivity_Report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setSuccess('Successfully downloaded CSV productivity report.');
      } else {
        const jsonContent = JSON.stringify(filteredTasks, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Task_Productivity_Report_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setSuccess('Successfully downloaded JSON productivity report.');
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
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Team Tasks & Productivity</h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.1rem 0 0 0' }}>
              {isManager ? 'Track task completion rates and workloads of your direct reports' : 'Analyze system task loads and employee output productivity'}
            </p>
          </div>
        </div>

        {/* Filters and Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Dept selector (HR/Admin only) */}
          {!isManager && (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <select
                value={selectedDept}
                onChange={(e) => {
                  setSelectedDept(e.target.value);
                  setSelectedEmployee('All'); // reset employee filter when department changes
                }}
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
          )}

          {/* Employee dropdown */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              style={{
                padding: '0.6rem 2rem 0.6rem 1rem', borderRadius: '10px',
                border: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
                color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.88rem',
                appearance: 'none', cursor: 'pointer', minWidth: '160px'
              }}
            >
              <option value="All">All Team Members</option>
              {employees
                .filter(e => selectedDept === 'All' || (e.department?._id || e.department) === selectedDept)
                .map(emp => (
                  <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName}</option>
                ))}
            </select>
            <span style={{ position: 'absolute', right: '10px', color: 'var(--text-secondary)', pointerEvents: 'none' }}>
              <ChevronDown size={14} />
            </span>
          </div>

          {/* Priority dropdown */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              style={{
                padding: '0.6rem 2rem 0.6rem 1rem', borderRadius: '10px',
                border: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
                color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.88rem',
                appearance: 'none', cursor: 'pointer', minWidth: '130px'
              }}
            >
              <option value="All">All Priorities</option>
              {['Low', 'Medium', 'High', 'Critical'].map(p => <option key={p}>{p}</option>)}
            </select>
            <span style={{ position: 'absolute', right: '10px', color: 'var(--text-secondary)', pointerEvents: 'none' }}>
              <ChevronDown size={14} />
            </span>
          </div>

          {/* Status dropdown */}
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
              {['Pending', 'In Progress', 'Completed', 'Cancelled'].map(s => <option key={s}>{s}</option>)}
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
              placeholder="Search tasks..."
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

          {/* Export button */}
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
              Export <ChevronDown size={14} />
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
          <span style={{ marginLeft: '1rem', fontWeight: 600 }}>Analyzing task boards and workloads...</span>
        </div>
      ) : (
        <>
          {/* KPI Dashboard Row */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '1.25rem', 
            marginBottom: '2rem' 
          }}>
            {/* Total Tasks */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem' }}>
              <span style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(103,119,239,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ClipboardList size={20} color="var(--primary-accent)" />
              </span>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>{totalTasks}</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, margin: 0 }}>Total Team Tasks</p>
              </div>
            </div>

            {/* Completed */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem' }}>
              <span style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={20} color="var(--success)" />
              </span>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--success)' }}>{completedTasks}</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, margin: 0 }}>Tasks Completed</p>
              </div>
            </div>

            {/* Pending */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem' }}>
              <span style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--warning-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={20} color="var(--warning)" />
              </span>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--warning)' }}>{pendingTasks}</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, margin: 0 }}>Awaiting / In Progress</p>
              </div>
            </div>

            {/* Overdue */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem' }}>
              <span style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={20} color="var(--danger)" />
              </span>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--danger)' }}>{overdueTasks}</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, margin: 0 }}>Overdue Deadlines</p>
              </div>
            </div>

            {/* Productivity Rate */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem' }}>
              <span style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={20} color="#8b5cf6" />
              </span>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#8b5cf6' }}>{completionRate}%</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, margin: 0 }}>Task Completion Rate</p>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr', gap: '1.5rem', alignItems: 'start', marginBottom: '2rem' }}>
            {/* Left: Team Member Leaderboard / Performance Breakdown */}
            <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
              <span className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <Award size={18} style={{ color: 'var(--warning)' }} />
                Team Productivity Index
              </span>
              
              {employeeStats.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>
                  No task workloads allocated to department members yet.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                  {employeeStats.map(stat => (
                    <div key={stat.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                        <div>
                          <strong style={{ fontSize: '0.88rem', display: 'block', color: 'var(--text-primary)' }}>{stat.name}</strong>
                          <span style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{stat.designation}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>{stat.rate}%</span>
                          <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{stat.completed}/{stat.total} tasks</span>
                        </div>
                      </div>
                      
                      {/* Custom Progress Track */}
                      <div style={{ height: '6px', background: 'var(--border-color)', borderRadius: '99px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${stat.rate}%`,
                          background: stat.rate > 75 ? 'var(--success)' : stat.rate > 40 ? 'var(--primary-accent)' : 'var(--warning)',
                          borderRadius: '99px',
                          transition: 'width 0.4s ease'
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Detailed Task Ledger */}
            <div className="table-container" style={{ margin: 0 }}>
              <div className="table-header-row">
                <span className="table-title">Task Distribution Ledger</span>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  {totalTasks} matching tasks
                </span>
              </div>
              
              <div className="data-table-wrapper" style={{ maxHeight: '380px', overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40%' }}>Task / Description</th>
                      <th>Assigned To</th>
                      <th>Priority</th>
                      <th>Progress</th>
                      <th>Status</th>
                      <th>Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                          <AlertCircle size={22} style={{ display: 'block', margin: '0 auto 0.5rem', opacity: 0.5 }} />
                          No tasks match the filter selections.
                        </td>
                      </tr>
                    ) : (
                      filteredTasks.map(task => {
                        const pInfo = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.Medium;
                        const sInfo = STATUS_COLORS[task.status] || { color: 'var(--text-secondary)', bg: 'rgba(0,0,0,0.05)' };
                        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Completed';
                        
                        return (
                          <tr key={task._id}>
                            {/* Task Title and Description */}
                            <td>
                              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{task.title}</div>
                              {task.description && (
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.15rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                  {task.description}
                                </div>
                              )}
                            </td>

                            {/* Assigned To */}
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <div style={{
                                  width: '24px', height: '24px', borderRadius: '50%',
                                  background: 'linear-gradient(135deg, #6777ef 0%, #3f51b5 100%)',
                                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontWeight: 700, fontSize: '0.62rem', flexShrink: 0
                                }}>
                                  {getInitials(task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : '')}
                                </div>
                                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                                  {task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : 'N/A'}
                                </span>
                              </div>
                            </td>

                            {/* Priority Badge */}
                            <td>
                              <span style={{
                                padding: '0.15rem 0.5rem', borderRadius: '99px', fontSize: '0.68rem', fontWeight: 800,
                                background: pInfo.bg, color: pInfo.color, border: `1px solid ${pInfo.color}30`
                              }}>
                                {task.priority}
                              </span>
                            </td>

                            {/* Progress bar */}
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: '90px' }}>
                                <div style={{ flex: 1, height: '5px', background: 'var(--border-color)', borderRadius: '99px', overflow: 'hidden' }}>
                                  <div style={{
                                    height: '100%', width: `${task.progress || 0}%`,
                                    background: task.status === 'Completed' ? 'var(--success)' : 'var(--primary-accent)',
                                    borderRadius: '99px'
                                  }} />
                                </div>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{task.progress || 0}%</span>
                              </div>
                            </td>

                            {/* Status */}
                            <td>
                              <span style={{
                                padding: '0.15rem 0.5rem', borderRadius: '99px', fontSize: '0.68rem', fontWeight: 800,
                                background: sInfo.bg, color: sInfo.color, border: `1px solid ${sInfo.color}30`
                              }}>
                                {task.status}
                              </span>
                            </td>

                            {/* Due Date */}
                            <td style={{ 
                              fontSize: '0.82rem', 
                              fontWeight: 700,
                              color: isOverdue ? 'var(--danger)' : 'var(--text-secondary)'
                            }}>
                              {task.dueDate ? new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' }) : 'N/A'}
                              {isOverdue && <span style={{ display: 'block', fontSize: '0.62rem', color: 'var(--danger)', fontWeight: 800 }}>⚠ OVERDUE</span>}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProductivityReport;
