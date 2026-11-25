import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  Briefcase,
  CheckCircle2,
  AlertTriangle,
  Search,
  Users,
  RefreshCw,
  UserCheck,
} from 'lucide-react';

const DESIGNATION_CATEGORIES = [
  'Executive',
  'Senior Management',
  'Management',
  'Engineering',
  'Design',
  'Product',
  'Business',
  'Marketing',
  'Sales',
  'HR',
  'Operations',
  'Finance',
  'Support',
  'Administration',
  'Entry Level',
  'General',
];

const Departments = () => {
  const { user } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [unlinkedDesignations, setUnlinkedDesignations] = useState([]);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [loadingDesgs, setLoadingDesgs] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [activeTab, setActiveTab] = useState('departments');

  // Search & Filter states
  const [deptSearch, setDeptSearch] = useState('');
  const [deptHeadFilter, setDeptHeadFilter] = useState('All'); // 'All' | 'Assigned' | 'Unassigned'
  const [desgSearch, setDesgSearch] = useState('');
  const [desgCategoryFilter, setDesgCategoryFilter] = useState('All');
  const [syncingDesgs, setSyncingDesgs] = useState(false);

  // Modals (Departments)
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    manager: '',
  });

  // Modals (Designations)
  const [desgModalOpen, setDesgModalOpen] = useState(false);
  const [isDesgEditMode, setIsDesgEditMode] = useState(false);
  const [desgFormError, setDesgFormError] = useState('');
  const [desgSubmitting, setDesgSubmitting] = useState(false);
  const [desgFormData, setDesgFormData] = useState({
    name: '',
    description: '',
    category: 'General',
    level: 5,
  });

  // Members / Employees Inspection Modals
  const [membersModalDept, setMembersModalDept] = useState(null);
  const [membersModalDesg, setMembersModalDesg] = useState(null);
  const [quickUpdatingId, setQuickUpdatingId] = useState('');

  // In-app Delete & Reassign Modal (handles both Departments & Designations)
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [reassignMode, setReassignMode] = useState('move');
  const [reassignToId, setReassignToId] = useState('');
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg((cur) => (cur === msg ? '' : cur));
    }, 4500);
  };

  const fetchDepartments = useCallback(async () => {
    try {
      setLoadingDepts(true);
      const data = await api.get('/departments');
      if (data.success) {
        setDepartments(data.departments || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load department records');
    } finally {
      setLoadingDepts(false);
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      const data = await api.get('/employees');
      if (data.success) {
        setEmployees(data.employees || []);
      }
    } catch (err) {
      console.error('Failed to load employees list', err.message);
    }
  }, []);

  const fetchDesignations = useCallback(async () => {
    try {
      setLoadingDesgs(true);
      const data = await api.get('/designations');
      if (data.success) {
        setDesignations(data.designations || []);
        setUnlinkedDesignations(data.unlinkedDesignations || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load designation records');
    } finally {
      setLoadingDesgs(false);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      fetchDepartments();
      fetchEmployees();
      fetchDesignations();
    }, 0);
    return () => clearTimeout(id);
  }, [fetchDepartments, fetchEmployees, fetchDesignations]);

  // Active employees sorted cleanly for Department Head selection
  const activeEmployees = useMemo(
    () => employees.filter((e) => (e.status || 'Active') === 'Active'),
    [employees]
  );

  const modalDeptMembers = useMemo(() => {
    if (!isEditMode || !formData._id) return [];
    return activeEmployees.filter(
      (e) => String(e.department?._id || e.department || '') === String(formData._id)
    );
  }, [isEditMode, formData._id, activeEmployees]);

  const modalOtherEmployees = useMemo(() => {
    if (!isEditMode || !formData._id) return activeEmployees;
    return activeEmployees.filter(
      (e) => String(e.department?._id || e.department || '') !== String(formData._id)
    );
  }, [isEditMode, formData._id, activeEmployees]);

  const filteredDepartments = useMemo(() => {
    const q = deptSearch.trim().toLowerCase();
    return departments.filter((dept) => {
      const headName = dept.manager
        ? `${dept.manager.firstName} ${dept.manager.lastName}`.toLowerCase()
        : '';
      const matchesQuery =
        !q ||
        dept.name.toLowerCase().includes(q) ||
        (dept.description || '').toLowerCase().includes(q) ||
        headName.includes(q);

      if (!matchesQuery) return false;
      if (deptHeadFilter === 'Assigned') return Boolean(dept.manager);
      if (deptHeadFilter === 'Unassigned') return !dept.manager;
      return true;
    });
  }, [departments, deptSearch, deptHeadFilter]);

  const availableCategories = useMemo(() => {
    const set = new Set(designations.map((d) => d.category || 'General'));
    return ['All', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [designations]);

  const filteredDesignations = useMemo(() => {
    const q = desgSearch.trim().toLowerCase();
    return designations.filter((desg) => {
      const matchesCat =
        desgCategoryFilter === 'All' || (desg.category || 'General') === desgCategoryFilter;
      const matchesQuery =
        !q ||
        desg.name.toLowerCase().includes(q) ||
        (desg.description || '').toLowerCase().includes(q) ||
        (desg.category || '').toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [designations, desgSearch, desgCategoryFilter]);

  const deptMembersList = useMemo(() => {
    if (!membersModalDept) return [];
    return employees.filter(
      (e) => String(e.department?._id || e.department || '') === String(membersModalDept._id)
    );
  }, [employees, membersModalDept]);

  const desgMembersList = useMemo(() => {
    if (!membersModalDesg) return [];
    const targetLower = String(membersModalDesg.name || '').trim().toLowerCase();
    return employees.filter(
      (e) => String(e.designation || '').trim().toLowerCase() === targetLower
    );
  }, [employees, membersModalDesg]);

  const handleOpenAddDesgModal = () => {
    setIsDesgEditMode(false);
    setDesgFormError('');
    setDesgFormData({ name: '', description: '', category: 'General', level: 5 });
    setDesgModalOpen(true);
  };

  const handleOpenEditDesgModal = (desg) => {
    setIsDesgEditMode(true);
    setDesgFormError('');
    setDesgFormData({
      _id: desg._id,
      name: desg.name,
      description: desg.description || '',
      category: desg.category || 'General',
      level: desg.level ?? 5,
    });
    setDesgModalOpen(true);
  };

  const handleDesgFormSubmit = async (e) => {
    e.preventDefault();
    try {
      setDesgSubmitting(true);
      setDesgFormError('');
      const payload = {
        name: desgFormData.name,
        description: desgFormData.description,
        category: desgFormData.category || 'General',
        level: Number(desgFormData.level) || 5,
      };
      if (isDesgEditMode) {
        const data = await api.put(`/designations/${desgFormData._id}`, payload);
        if (data.success) {
          setDesgModalOpen(false);
          await Promise.all([fetchDesignations(), fetchEmployees()]);
          showSuccess(`Designation '${desgFormData.name}' updated.`);
        }
      } else {
        const data = await api.post('/designations', payload);
        if (data.success) {
          setDesgModalOpen(false);
          await fetchDesignations();
          showSuccess(`Designation '${desgFormData.name}' created.`);
        }
      }
    } catch (err) {
      setDesgFormError(err.message || 'Operation failed');
    } finally {
      setDesgSubmitting(false);
    }
  };

  const handleSyncDesignations = async () => {
    try {
      setSyncingDesgs(true);
      setError('');
      const res = await api.post('/designations/sync', {});
      if (res.success) {
        await Promise.all([fetchDesignations(), fetchEmployees()]);
        showSuccess(res.message || 'Unlinked employee designations synced.');
      }
    } catch (err) {
      setError(err.message || 'Failed to sync designations');
    } finally {
      setSyncingDesgs(false);
    }
  };

  const handleOpenAddModal = () => {
    setIsEditMode(false);
    setFormError('');
    setFormData({ name: '', description: '', manager: '' });
    setModalOpen(true);
  };

  const handleOpenEditModal = (dept) => {
    setIsEditMode(true);
    setFormError('');
    setFormData({
      _id: dept._id,
      name: dept.name,
      description: dept.description || '',
      manager: dept.manager?._id || dept.manager || '',
    });
    setModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setFormError('');
      if (isEditMode) {
        const data = await api.put(`/departments/${formData._id}`, formData);
        if (data.success) {
          setModalOpen(false);
          await Promise.all([fetchDepartments(), fetchEmployees()]);
          showSuccess(`Department '${formData.name}' updated.`);
        }
      } else {
        const data = await api.post('/departments', formData);
        if (data.success) {
          setModalOpen(false);
          await Promise.all([fetchDepartments(), fetchEmployees()]);
          showSuccess(`Department '${formData.name}' created.`);
        }
      }
    } catch (err) {
      setFormError(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickAssignHead = async (dept, emp) => {
    try {
      setQuickUpdatingId(emp._id);
      setError('');
      const data = await api.put(`/departments/${dept._id}`, { manager: emp._id });
      if (data.success) {
        setMembersModalDept(data.department);
        await Promise.all([fetchDepartments(), fetchEmployees()]);
        showSuccess(`${emp.firstName} ${emp.lastName} assigned as Head of ${dept.name}.`);
      }
    } catch (err) {
      setError(err.message || 'Failed to assign Department Head');
    } finally {
      setQuickUpdatingId('');
    }
  };

  const handleQuickChangeEmployeeDesignation = async (emp, nextDesignation) => {
    if (!nextDesignation || nextDesignation === emp.designation) return;
    try {
      setQuickUpdatingId(emp._id);
      setError('');
      const res = await api.put(`/employees/${emp._id}`, { designation: nextDesignation });
      if (res.success) {
        await Promise.all([fetchEmployees(), fetchDesignations()]);
        showSuccess(`Updated ${emp.firstName} ${emp.lastName}'s designation to '${nextDesignation}'.`);
      }
    } catch (err) {
      setError(err.message || 'Failed to update employee designation');
    } finally {
      setQuickUpdatingId('');
    }
  };

  const openDeleteModal = (kind, item) => {
    setDeleteError('');
    setError('');
    const candidates =
      kind === 'department'
        ? departments.filter((d) => String(d._id) !== String(item._id))
        : designations.filter((d) => String(d._id) !== String(item._id));

    if (candidates.length > 0) {
      setReassignMode('move');
      setReassignToId(candidates[0]._id);
    } else {
      setReassignMode('unassigned');
      setReassignToId('');
    }
    setDeleteTarget({ kind, item, candidates });
  };

  const handleConfirmDelete = async (e) => {
    e.preventDefault();
    if (!deleteTarget) return;

    const { kind, item } = deleteTarget;
    const hasMembers = (item.employeeCount || 0) > 0;
    const basePath = kind === 'department' ? `/departments/${item._id}` : `/designations/${item._id}`;

    let query = '';
    if (hasMembers) {
      if (reassignMode === 'move') {
        if (!reassignToId) {
          setDeleteError(`Please choose another ${kind} to move existing members to.`);
          return;
        }
        query = `?reassignTo=${encodeURIComponent(reassignToId)}`;
      } else {
        query = '?force=true';
      }
    }

    try {
      setDeleteSubmitting(true);
      setDeleteError('');
      const data = await api.delete(`${basePath}${query}`);
      if (data.success) {
        setDeleteTarget(null);
        await Promise.all([
          kind === 'department' ? fetchDepartments() : fetchDesignations(),
          fetchEmployees(),
        ]);
        showSuccess(data.message || `${kind === 'department' ? 'Department' : 'Designation'} deleted successfully.`);
      }
    } catch (err) {
      setDeleteError(err.message || 'Delete operation failed');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const isAdmin = user?.role === 'admin';
  const loading = activeTab === 'departments' ? loadingDepts : loadingDesgs;

  return (
    <div className="page-container">
      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.35rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0' }}>
        <button
          type="button"
          onClick={() => { setActiveTab('departments'); setError(''); }}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            background: 'none', border: 'none', cursor: 'pointer',
            borderBottom: activeTab === 'departments' ? '2px solid var(--primary-accent)' : '2px solid transparent',
            marginBottom: '-2px',
            color: activeTab === 'departments' ? 'var(--primary-accent)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'departments' ? 700 : 500,
            fontSize: '0.9rem',
            transition: 'all 0.2s',
          }}
        >
          Departments ({departments.length})
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('designations'); setError(''); }}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            background: 'none', border: 'none', cursor: 'pointer',
            borderBottom: activeTab === 'designations' ? '2px solid var(--primary-accent)' : '2px solid transparent',
            marginBottom: '-2px',
            color: activeTab === 'designations' ? 'var(--primary-accent)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'designations' ? 700 : 500,
            fontSize: '0.9rem',
            transition: 'all 0.2s',
          }}
        >
          Designations ({designations.length})
        </button>
      </div>

      {/* Action & Filter Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {activeTab === 'departments' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', flex: 1 }}>
            <div style={{ position: 'relative', minWidth: '220px', flex: '0 1 280px' }}>
              <Search size={15} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                className="form-control"
                placeholder="Search departments or heads..."
                value={deptSearch}
                onChange={(e) => setDeptSearch(e.target.value)}
                style={{ paddingLeft: '2.1rem' }}
              />
            </div>
            <select
              className="form-control"
              value={deptHeadFilter}
              onChange={(e) => setDeptHeadFilter(e.target.value)}
              style={{ width: 'auto', minWidth: '165px' }}
            >
              <option value="All">All Head Statuses</option>
              <option value="Assigned">Head Assigned</option>
              <option value="Unassigned">Not Assigned</option>
            </select>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', flex: 1 }}>
            <div style={{ position: 'relative', minWidth: '220px', flex: '0 1 280px' }}>
              <Search size={15} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                className="form-control"
                placeholder="Search designations or category..."
                value={desgSearch}
                onChange={(e) => setDesgSearch(e.target.value)}
                style={{ paddingLeft: '2.1rem' }}
              />
            </div>
            <select
              className="form-control"
              value={desgCategoryFilter}
              onChange={(e) => setDesgCategoryFilter(e.target.value)}
              style={{ width: 'auto', minWidth: '175px' }}
            >
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'All' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>
        )}

        {isAdmin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            {activeTab === 'designations' && unlinkedDesignations.length > 0 && (
              <button
                type="button"
                onClick={handleSyncDesignations}
                disabled={syncingDesgs}
                className="btn btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
              >
                <RefreshCw size={15} className={syncingDesgs ? 'spin' : ''} />
                Sync Unlinked Roles ({unlinkedDesignations.length})
              </button>
            )}
            {activeTab === 'departments' ? (
              <button type="button" onClick={handleOpenAddModal} className="btn btn-primary">
                <Plus size={18} /> Add Department
              </button>
            ) : (
              <button type="button" onClick={handleOpenAddDesgModal} className="btn btn-primary">
                <Plus size={18} /> Add Designation
              </button>
            )}
          </div>
        )}
      </div>

      {activeTab === 'designations' && unlinkedDesignations.length > 0 && (
        <div
          style={{
            padding: '0.8rem 1rem',
            borderRadius: '12px',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: '#d97706',
            fontSize: '0.82rem',
            fontWeight: 600,
            marginBottom: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <span>
            {unlinkedDesignations.length} active employee role title(s) are not yet in the Designations catalog:{' '}
            <strong>{unlinkedDesignations.map((u) => `${u.name} (${u.employeeCount})`).join(', ')}</strong>
          </span>
          {isAdmin && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSyncDesignations}
              disabled={syncingDesgs}
              style={{ padding: '0.35rem 0.85rem', fontSize: '0.78rem' }}
            >
              {syncingDesgs ? 'Syncing...' : 'Sync All Now'}
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ─── Tab: Departments ─── */}
      {activeTab === 'departments' && (
        loading ? (
          <p style={{ textAlign: 'center', padding: '2rem' }}>Loading Departments...</p>
        ) : filteredDepartments.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            {departments.length === 0 ? 'No departments registered yet' : 'No departments match the current filter.'}
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {filteredDepartments.map((dept) => {
              const memberCount = dept.employeeCount || 0;
              return (
                <div key={dept._id} className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: '220px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '1.22rem', margin: 0 }}>{dept.name}</h3>
                    <button
                      type="button"
                      onClick={() => setMembersModalDept(dept)}
                      className="badge badge-present"
                      title="View Department Members"
                      style={{ fontWeight: 700, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      <Users size={11} />
                      {memberCount} {memberCount === 1 ? 'Member' : 'Members'}
                    </button>
                  </div>

                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', flex: 1, lineHeight: '1.5', marginBottom: '1.5rem' }}>
                    {dept.description || 'No description provided.'}
                  </p>

                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>
                        DEPARTMENT HEAD
                      </span>
                      {dept.manager ? (
                        <div>
                          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {dept.manager.firstName} {dept.manager.lastName}
                          </span>
                          {dept.manager.designation && (
                            <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                              {dept.manager.designation}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          Not Assigned
                        </span>
                      )}
                    </div>

                    {isAdmin && (
                      <div style={{ display: 'flex', gap: '0.45rem', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(dept)}
                          className="btn btn-secondary btn-icon"
                          title="Edit Unit & Assign Head"
                          style={{ color: 'var(--primary-accent)' }}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteModal('department', dept)}
                          className="btn btn-secondary btn-icon"
                          title="Delete Unit"
                          style={{ color: 'var(--danger)' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ─── Tab: Designations ─── */}
      {activeTab === 'designations' && (
        loading ? (
          <p style={{ textAlign: 'center', padding: '2rem' }}>Loading Designations...</p>
        ) : filteredDesignations.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            {designations.length === 0 ? 'No designations registered yet' : 'No designations match the selected filter.'}
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {filteredDesignations.map((desg) => {
              const count = desg.employeeCount || 0;
              return (
                <div key={desg._id} className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: '195px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.6rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                      <Briefcase size={18} style={{ color: 'var(--primary-accent)', flexShrink: 0 }} />
                      <h3 style={{ fontSize: '1.15rem', margin: 0 }}>{desg.name}</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMembersModalDesg(desg)}
                      className="badge badge-present"
                      title="View Employees in this Designation"
                      style={{ fontWeight: 700, border: 'none', cursor: 'pointer', flexShrink: 0 }}
                    >
                      {count} {count === 1 ? 'Employee' : 'Employees'}
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.65rem', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '0.14rem 0.5rem',
                      borderRadius: '999px',
                      background: 'rgba(37, 99, 235, 0.1)',
                      color: '#2563eb',
                    }}>
                      {desg.category || 'General'}
                    </span>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '0.14rem 0.5rem',
                      borderRadius: '999px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-secondary)',
                    }}>
                      Level {desg.level || 5}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', flex: 1, lineHeight: '1.5', marginBottom: '1.25rem' }}>
                    {desg.description || 'No description provided.'}
                  </p>

                  {isAdmin && (
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => setMembersModalDesg(desg)}
                        style={{ background: 'none', border: 'none', padding: 0, color: 'var(--primary-accent)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        View Staff ({count})
                      </button>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEditDesgModal(desg)}
                          className="btn btn-secondary btn-icon"
                          title="Edit Designation"
                          style={{ color: 'var(--primary-accent)' }}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteModal('designation', desg)}
                          className="btn btn-secondary btn-icon"
                          title="Delete Designation"
                          style={{ color: 'var(--danger)' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Department CRUD Modal Form */}
      {modalOpen && createPortal(
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{isEditMode ? 'Modify Department Details' : 'Create New Department'}</h3>
              <button type="button" className="modal-close-btn" onClick={() => setModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleFormSubmit}>
              <div className="modal-body">
                {formError && (
                  <div className="alert alert-danger" style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem 1rem' }}>
                    <AlertCircle size={18} /> {formError}
                  </div>
                )}

                <div className="form-group">
                  <label>Department Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Engineering"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    rows="3"
                    className="form-control"
                    placeholder="Briefly describe the functions of this unit..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    style={{ resize: 'none' }}
                  />
                </div>

                <div className="form-group">
                  <label>Assign Department Head (Active Staff Only)</label>
                  <select
                    className="form-control"
                    value={formData.manager}
                    onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                  >
                    <option value="">Not Assigned (Clear Head)</option>
                    {isEditMode && modalDeptMembers.length > 0 && (
                      <optgroup label={`Current ${formData.name || 'Department'} Members`}>
                        {modalDeptMembers.map((emp) => (
                          <option key={emp._id} value={emp._id}>
                            {emp.firstName} {emp.lastName} ({emp.employeeId} · {emp.designation})
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label={isEditMode ? 'Other Active Employees (auto-moves here)' : 'Active Employees'}>
                      {modalOtherEmployees.map((emp) => (
                        <option key={emp._id} value={emp._id}>
                          {emp.firstName} {emp.lastName} ({emp.employeeId} · {emp.department?.name || 'Unassigned'} · {emp.designation})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <small style={{ display: 'block', marginTop: '0.35rem', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    Selecting a Department Head sets this department as their fixed team base and grants Manager permissions (unless Admin/HR).
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : isEditMode ? 'Update Unit' : 'Create Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Designation CRUD Modal Form */}
      {desgModalOpen && createPortal(
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setDesgModalOpen(false); }}>
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{isDesgEditMode ? 'Modify Designation Details' : 'Create New Designation'}</h3>
              <button type="button" className="modal-close-btn" onClick={() => setDesgModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleDesgFormSubmit}>
              <div className="modal-body">
                {desgFormError && (
                  <div className="alert alert-danger" style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem 1rem' }}>
                    <AlertCircle size={18} /> {desgFormError}
                  </div>
                )}

                <div className="form-group">
                  <label>Designation Title *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Senior Software Engineer"
                    value={desgFormData.name}
                    onChange={(e) => setDesgFormData({ ...desgFormData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Category</label>
                    <select
                      className="form-control"
                      value={desgFormData.category}
                      onChange={(e) => setDesgFormData({ ...desgFormData, category: e.target.value })}
                    >
                      {DESIGNATION_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Hierarchy Level (1–10)</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      className="form-control"
                      value={desgFormData.level}
                      onChange={(e) => setDesgFormData({ ...desgFormData, level: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    rows="3"
                    className="form-control"
                    placeholder="Briefly describe this role's scope and duties..."
                    value={desgFormData.description}
                    onChange={(e) => setDesgFormData({ ...desgFormData, description: e.target.value })}
                    style={{ resize: 'none' }}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setDesgModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={desgSubmitting}>
                  {desgSubmitting ? 'Saving...' : isDesgEditMode ? 'Update Role' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Department Members Inspection & Quick Head Assignment Modal */}
      {membersModalDept && createPortal(
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setMembersModalDept(null); }}>
          <div className="modal-content" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={18} color="var(--primary-accent)" />
                {membersModalDept.name} Members ({deptMembersList.length})
              </h3>
              <button type="button" className="modal-close-btn" onClick={() => setMembersModalDept(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              {deptMembersList.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1.5rem 0' }}>
                  No members are currently assigned to {membersModalDept.name}.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {deptMembersList.map((emp) => {
                    const isHead =
                      String(membersModalDept.manager?._id || membersModalDept.manager || '') === String(emp._id);
                    const isActiveEmp = (emp.status || 'Active') === 'Active';
                    return (
                      <div
                        key={emp._id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.75rem 0.9rem',
                          borderRadius: '10px',
                          background: 'var(--bg-primary)',
                          border: isHead ? '1px solid rgba(37, 99, 235, 0.35)' : '1px solid var(--border-color)',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <span>{emp.firstName} {emp.lastName}</span>
                            {isHead && (
                              <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.12rem 0.45rem', borderRadius: 999, background: 'rgba(37, 99, 235, 0.14)', color: '#2563eb' }}>
                                Department Head
                              </span>
                            )}
                            {!isActiveEmp && (
                              <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.12rem 0.45rem', borderRadius: 999, background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>
                                Inactive
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                            {emp.employeeId} · {emp.designation} · {emp.role?.toUpperCase() || 'EMPLOYEE'}
                          </div>
                        </div>

                        {isAdmin && isActiveEmp && !isHead && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            disabled={quickUpdatingId === emp._id}
                            onClick={() => handleQuickAssignHead(membersModalDept, emp)}
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.76rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5, color: '#2563eb' }}
                          >
                            <UserCheck size={14} />
                            {quickUpdatingId === emp._id ? 'Assigning...' : 'Set as Head'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-primary" onClick={() => setMembersModalDept(null)}>
                Done
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Designation Staff Modal & Quick Reassign */}
      {membersModalDesg && createPortal(
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setMembersModalDesg(null); }}>
          <div className="modal-content" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Briefcase size={18} color="var(--primary-accent)" />
                {membersModalDesg.name} ({desgMembersList.length} {desgMembersList.length === 1 ? 'Employee' : 'Employees'})
              </h3>
              <button type="button" className="modal-close-btn" onClick={() => setMembersModalDesg(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              {desgMembersList.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1.5rem 0' }}>
                  No employees currently hold the {membersModalDesg.name} designation.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {desgMembersList.map((emp) => (
                    <div
                      key={emp._id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem 0.9rem',
                        borderRadius: '10px',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                          {emp.firstName} {emp.lastName}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                          {emp.employeeId} · {emp.department?.name || 'Unassigned'} · {emp.status || 'Active'}
                        </div>
                      </div>

                      {isAdmin && designations.length > 1 && (
                        <select
                          className="form-control"
                          value={emp.designation}
                          disabled={quickUpdatingId === emp._id}
                          onChange={(e) => handleQuickChangeEmployeeDesignation(emp, e.target.value)}
                          style={{ width: 'auto', minWidth: '185px', fontSize: '0.78rem' }}
                        >
                          {designations.map((opt) => (
                            <option key={opt._id} value={opt.name}>{opt.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-primary" onClick={() => setMembersModalDesg(null)}>
                Done
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation & Reassignment Modal */}
      {deleteTarget && createPortal(
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && !deleteSubmitting) setDeleteTarget(null); }}>
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)' }}>
                <AlertTriangle size={18} />
                Delete {deleteTarget.kind === 'department' ? 'Department' : 'Designation'}
              </h3>
              <button type="button" className="modal-close-btn" disabled={deleteSubmitting} onClick={() => setDeleteTarget(null)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleConfirmDelete}>
              <div className="modal-body">
                {deleteError && (
                  <div className="alert alert-danger" style={{ display: 'flex', gap: '0.5rem', padding: '0.55rem 0.9rem', marginBottom: '0.85rem' }}>
                    <AlertCircle size={17} style={{ flexShrink: 0 }} />
                    <span>{deleteError}</span>
                  </div>
                )}

                <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.85rem', lineHeight: 1.5 }}>
                  You are about to delete <strong>{deleteTarget.item.name}</strong>.
                </p>

                {(deleteTarget.item.employeeCount || 0) > 0 ? (
                  <div style={{
                    padding: '0.9rem',
                    borderRadius: '10px',
                    background: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#d97706' }}>
                      {deleteTarget.item.employeeCount} active member(s) are currently assigned to {deleteTarget.item.name}. Choose where to move them:
                    </div>

                    {deleteTarget.candidates.length > 0 && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.84rem', fontWeight: 600, cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="reassignMode"
                          checked={reassignMode === 'move'}
                          onChange={() => setReassignMode('move')}
                        />
                        <span>Reassign members to another {deleteTarget.kind}</span>
                      </label>
                    )}

                    {reassignMode === 'move' && deleteTarget.candidates.length > 0 && (
                      <select
                        className="form-control"
                        value={reassignToId}
                        onChange={(e) => setReassignToId(e.target.value)}
                        required
                      >
                        {deleteTarget.candidates.map((cand) => (
                          <option key={cand._id} value={cand._id}>
                            {cand.name} ({cand.employeeCount || 0} members)
                          </option>
                        ))}
                      </select>
                    )}

                    {!(deleteTarget.kind === 'department' && deleteTarget.item.name?.toLowerCase() === 'unassigned') && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.84rem', fontWeight: 600, cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="reassignMode"
                          checked={reassignMode === 'unassigned'}
                          onChange={() => setReassignMode('unassigned')}
                        />
                        <span>Move members to &quot;Unassigned&quot; and force delete</span>
                      </label>
                    )}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                    This {deleteTarget.kind} currently has 0 assigned members and can be removed safely.
                  </p>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" disabled={deleteSubmitting} onClick={() => setDeleteTarget(null)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-danger"
                  disabled={deleteSubmitting}
                  style={{ background: '#ef4444', borderColor: '#ef4444', color: '#ffffff' }}
                >
                  {deleteSubmitting ? 'Deleting...' : 'Confirm Delete'}
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

export default Departments;
