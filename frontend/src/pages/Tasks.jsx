import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  ClipboardList, Plus, CheckCircle2, Clock, AlertTriangle,
  ChevronUp, ChevronDown, Minus, X, AlertCircle, Calendar,
  User, Circle, Edit, Trash2,
} from 'lucide-react';
import { SkeletonBlock } from '../components/Skeleton';

const PRIORITY_COLORS = {
  Low:      { color: '#2ebd7f', bg: 'rgba(46,189,127,0.12)' },
  Medium:   { color: '#ffb119', bg: 'rgba(255,177,25,0.12)' },
  High:     { color: '#ff5b5b', bg: 'rgba(255,91,91,0.12)' },
  Critical: { color: '#d946ef', bg: 'rgba(217,70,239,0.12)' },
};

const STATUS_COLORS = {
  Pending:     { color: 'var(--warning)', icon: Clock },
  'In Progress':{ color: 'var(--primary-accent)', icon: Circle },
  Completed:   { color: 'var(--success)', icon: CheckCircle2 },
  Cancelled:   { color: 'var(--danger)', icon: X },
};

const PriorityIcon = ({ priority }) => {
  if (priority === 'Critical') return <ChevronUp size={14} color="#d946ef" />;
  if (priority === 'High') return <ChevronUp size={14} color="#ff5b5b" />;
  if (priority === 'Medium') return <Minus size={14} color="#ffb119" />;
  return <ChevronDown size={14} color="#2ebd7f" />;
};

// Global cache for instant tasks navigation
let cachedTasksList = null;
let cachedTasksEmployees = null;

const Tasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState(() => {
    if (cachedTasksList) return cachedTasksList;
    try {
      const s = sessionStorage.getItem(`ems_cached_tasks_${user?.role}`);
      return s ? JSON.parse(s) : [];
    } catch (e) { return []; }
  });
  const [employees, setEmployees] = useState(() => {
    if (cachedTasksEmployees) return cachedTasksEmployees;
    try {
      const s = sessionStorage.getItem('ems_cached_tasks_emps');
      return s ? JSON.parse(s) : [];
    } catch (e) { return []; }
  });
  const [loading, setLoading] = useState(() => {
    if (cachedTasksList) return false;
    try {
      return !sessionStorage.getItem(`ems_cached_tasks_${user?.role}`);
    } catch (e) { return true; }
  });
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    title: '', description: '', assignedTo: '', dueDate: '', priority: 'Medium',
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [editTaskId, setEditTaskId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const isHRPlus = ['admin', 'hr', 'manager'].includes(user?.role);

  const fetchTasks = async (forceSpinner = false) => {
    try {
      if (forceSpinner || !tasks.length) setLoading(true);
      const params = [];
      if (filterStatus) params.push(`status=${filterStatus}`);
      if (filterPriority) params.push(`priority=${filterPriority}`);
      const qs = params.length ? `?${params.join('&')}` : '';
      const res = await api.get(`/tasks${qs}`);
      if (res.success) {
        // Guarantee only unique tasks by _id
        const unique = [];
        const seen = new Set();
        (res.tasks || []).forEach(t => {
          if (t && t._id && !seen.has(t._id.toString())) {
            seen.add(t._id.toString());
            unique.push(t);
          }
        });
        setTasks(unique);
        if (!filterStatus && !filterPriority) {
          cachedTasksList = unique;
          try { sessionStorage.setItem(`ems_cached_tasks_${user?.role}`, JSON.stringify(unique)); } catch (e) {}
        }
      }
    } catch (e) {
      if (!tasks.length) setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    if (!isHRPlus) return;
    try {
      const res = await api.get('/employees');
      if (res.success) {
        setEmployees(res.employees);
        cachedTasksEmployees = res.employees;
        try { sessionStorage.setItem('ems_cached_tasks_emps', JSON.stringify(res.employees)); } catch (e) {}
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchTasks();
    fetchEmployees();
  }, [filterStatus, filterPriority]);

  // Handle ESC key to dismiss modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && modalOpen && !submitting) {
        setModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalOpen, submitting]);

  const handleOpenAdd = () => {
    setIsEditMode(false);
    setEditTaskId(null);
    setFormError('');
    setFormData({ title: '', description: '', assignedTo: '', dueDate: '', priority: 'Medium' });
    setModalOpen(true);
  };

  const handleOpenEdit = (task) => {
    setIsEditMode(true);
    setEditTaskId(task._id);
    setFormError('');
    setFormData({
      title: task.title,
      description: task.description || '',
      assignedTo: task.assignedTo?._id || task.assignedTo || '',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      priority: task.priority || 'Medium',
    });
    setModalOpen(true);
  };

  const handleDeleteTask = async (id) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      const res = await api.delete(`/tasks/${id}`);
      if (res.success) fetchTasks();
    } catch (e) {
      alert(e.message || 'Failed to delete task');
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!formData.title?.trim() || !formData.assignedTo) {
      setFormError('Title and employee are required');
      return;
    }
    try {
      setSubmitting(true);
      setFormError('');
      let res;
      if (isEditMode) {
        res = await api.put(`/tasks/${editTaskId}`, { ...formData, title: formData.title.trim() });
      } else {
        res = await api.post('/tasks', { ...formData, title: formData.title.trim() });
      }
      if (res.success) {
        setModalOpen(false);
        setIsEditMode(false);
        setEditTaskId(null);
        setFormData({ title: '', description: '', assignedTo: '', dueDate: '', priority: 'Medium' });
        fetchTasks(true);
      } else {
        setFormError(res.message || 'Failed to save task');
      }
    } catch (e) {
      setFormError(e.message || 'Failed to save task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (taskId, newStatus, newProgress) => {
    try {
      const updates = { status: newStatus };
      if (newProgress !== undefined) updates.progress = newProgress;
      await api.put(`/tasks/${taskId}`, updates);
      fetchTasks();
    } catch (e) {
      alert(e.message);
    }
  };

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'Pending').length,
    inProgress: tasks.filter(t => t.status === 'In Progress').length,
    completed: tasks.filter(t => t.status === 'Completed').length,
  };

  return (
    <div className="page-container page-enter">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '14px',
          background: 'linear-gradient(135deg, #6777ef 0%, #a78bfa 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 15px rgba(103,119,239,0.3)',
        }}>
          <ClipboardList size={22} color="white" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Task Management</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            {isHRPlus ? 'Assign and track tasks across the team' : 'Your assigned tasks and progress'}
          </p>
        </div>
        {isHRPlus && (
          <button onClick={handleOpenAdd} className="btn btn-primary" style={{ marginLeft: 'auto' }}>
            <Plus size={18} /> Assign Task
          </button>
        )}
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}><AlertCircle size={16} /> {error}</div>}

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }} className="four-column-grid">
        {[
          { label: 'Total Tasks', value: stats.total, color: 'var(--primary-accent)' },
          { label: 'Pending', value: stats.pending, color: 'var(--warning)' },
          { label: 'In Progress', value: stats.inProgress, color: 'var(--info)' },
          { label: 'Completed', value: stats.completed, color: 'var(--success)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '0.25rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <select className="form-control" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: '180px' }}>
            <option value="">All Statuses</option>
            {['Pending', 'In Progress', 'Completed', 'Cancelled'].map(s => <option key={s}>{s}</option>)}
          </select>
          <select className="form-control" value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{ width: '180px' }}>
            <option value="">All Priorities</option>
            {['Low', 'Medium', 'High', 'Critical'].map(p => <option key={p}>{p}</option>)}
          </select>
          {(filterStatus || filterPriority) && (
            <button className="btn btn-secondary" onClick={() => { setFilterStatus(''); setFilterPriority(''); }}>
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Task Cards */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[0,1,2,3,4].map(i => (
            <div key={i} className="card" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <SkeletonBlock width="40px" height="40px" borderRadius="12px" />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <SkeletonBlock height="16px" width="60%" />
                <SkeletonBlock height="11px" width="80%" />
                <SkeletonBlock height="6px" />
              </div>
              <SkeletonBlock width="70px" height="28px" borderRadius="8px" />
            </div>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <ClipboardList size={48} style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-secondary)' }}>No tasks found</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {tasks.map(task => {
            const pColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.Medium;
            const sInfo = STATUS_COLORS[task.status] || {};
            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Completed';

            return (
              <div key={task._id} className="card" style={{
                padding: '1.25rem 1.5rem',
                borderLeft: `3px solid ${pColor.color}`,
                display: 'flex', alignItems: 'flex-start', gap: '1rem',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>{task.title}</h3>
                    <span style={{
                      padding: '0.15rem 0.6rem', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 700,
                      background: pColor.bg, color: pColor.color, display: 'flex', alignItems: 'center', gap: '3px',
                    }}>
                      <PriorityIcon priority={task.priority} /> {task.priority}
                    </span>
                    {isOverdue && (
                      <span style={{ padding: '0.15rem 0.6rem', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 700, background: 'rgba(255,91,91,0.12)', color: 'var(--danger)' }}>
                        ⚠ Overdue
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', margin: '0 0 0.75rem', lineHeight: 1.5 }}>{task.description}</p>
                  )}
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                    <span><User size={12} style={{ verticalAlign: 'middle' }} /> {task.assignedTo?.firstName ? `${task.assignedTo.firstName} ${task.assignedTo.lastName || ''}`.trim() : (task.assignedTo?.name || 'Unassigned')}</span>
                    {task.dueDate && (
                      <span style={{ color: isOverdue ? 'var(--danger)' : undefined }}>
                        <Calendar size={12} style={{ verticalAlign: 'middle' }} /> Due: {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                    <span>Assigned by: {task.assignedBy?.username || 'System'}</span>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ marginTop: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                      <span>Progress</span><span>{task.progress || 0}%</span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--border-color)', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${task.progress || 0}%`,
                        background: task.status === 'Completed' ? 'var(--success)' : 'var(--primary-accent)',
                        borderRadius: '99px', transition: 'width 0.4s ease',
                      }} />
                    </div>
                  </div>
                </div>

                {/* Status Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', flexShrink: 0 }}>
                  <span style={{ color: sInfo.color, fontSize: '0.8rem', fontWeight: 700 }}>{task.status}</span>
                  {task.status !== 'Completed' && task.status !== 'Cancelled' && (
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      {task.status === 'Pending' && (
                        <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem' }}
                          onClick={() => handleStatusChange(task._id, 'In Progress', 30)}>
                          Start
                        </button>
                      )}
                      {task.status === 'In Progress' && (
                        <button className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem', background: 'var(--success)' }}
                          onClick={() => handleStatusChange(task._id, 'Completed', 100)}>
                          Complete
                        </button>
                      )}
                    </div>
                  )}
                  {task.status === 'Completed' && (
                    <CheckCircle2 size={20} color="var(--success)" />
                  )}
                  {isHRPlus && (
                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.75rem' }}>
                      <button
                        onClick={() => handleOpenEdit(task)}
                        className="btn btn-secondary btn-icon"
                        title="Edit Task"
                        style={{ padding: '0.25rem', height: '26px', width: '26px', minWidth: '26px' }}
                      >
                        <Edit size={13} style={{ color: 'var(--primary-accent)' }} />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task._id)}
                        className="btn btn-secondary btn-icon"
                        title="Delete Task"
                        style={{ padding: '0.25rem', height: '26px', width: '26px', minWidth: '26px' }}
                      >
                        <Trash2 size={13} style={{ color: 'var(--danger)' }} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Task Modal */}
      {modalOpen && createPortal(
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) setModalOpen(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div
            className="modal-content"
            style={{
              width: '520px',
              maxWidth: '96vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '16px',
              boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
            }}
          >
            {/* Modal Header */}
            <div
              className="modal-header"
              style={{
                padding: '1.25rem 1.75rem',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--bg-secondary)',
                flexShrink: 0,
              }}
            >
              <h3
                className="modal-title"
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  margin: 0,
                  color: 'var(--text-primary)',
                }}
              >
                {isEditMode ? 'Modify Task Details' : 'Assign New Task'}
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setModalOpen(false)}
                title="Close"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px',
                  transition: 'color 0.15s ease',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form
              onSubmit={handleCreateTask}
              style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, margin: 0 }}
            >
              <div
                className="modal-body"
                style={{
                  padding: '1.4rem 1.75rem',
                  overflowY: 'auto',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.1rem',
                  background: 'var(--bg-secondary)',
                }}
              >
                {formError && (
                  <div
                    className="alert alert-danger"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      margin: 0,
                    }}
                  >
                    <AlertCircle size={18} style={{ flexShrink: 0 }} />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
                    Task Title <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Prepare Q2 Report"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    style={{
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      height: '42px',
                    }}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
                    Description
                  </label>
                  <textarea
                    rows="3"
                    className="form-control"
                    placeholder="Task details..."
                    style={{
                      resize: 'vertical',
                      minHeight: '80px',
                      maxHeight: '160px',
                      padding: '0.65rem 0.85rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                    }}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', margin: 0 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
                      Assign To <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <select
                      className="form-control"
                      value={formData.assignedTo}
                      onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                      required
                      style={{
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        height: '42px',
                      }}
                    >
                      <option value="">Select Employee</option>
                      {employees.map((emp) => (
                        <option key={emp._id} value={emp._id}>
                          {emp.firstName} {emp.lastName} {emp.designation ? `• ${emp.designation}` : `(${emp.employeeId || ''})`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
                      Priority
                    </label>
                    <select
                      className="form-control"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      style={{
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        height: '42px',
                      }}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
                    Due Date
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    style={{
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      height: '42px',
                    }}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div
                className="modal-footer"
                style={{
                  padding: '1.15rem 1.75rem',
                  borderTop: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  background: 'var(--bg-secondary)',
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setModalOpen(false)}
                  style={{
                    padding: '0.65rem 1.5rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '0.65rem 1.5rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#2563eb',
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                  }}
                >
                  {submitting ? 'Saving...' : isEditMode ? 'Update Task' : 'Assign Task'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Tasks;
