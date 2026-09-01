import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit2, Trash2, X, AlertCircle, Briefcase } from 'lucide-react';

const Departments = () => {
  const { user } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('departments');
  
  // Modals (Departments)
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formError, setFormError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    manager: '',
  });

  // Modals (Designations)
  const [desgModalOpen, setDesgModalOpen] = useState(false);
  const [isDesgEditMode, setIsDesgEditMode] = useState(false);
  const [desgFormError, setDesgFormError] = useState('');
  const [desgFormData, setDesgFormData] = useState({
    name: '',
    description: '',
  });


  const fetchDepartments = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.get('/departments');
      if (data.success) {
        setDepartments(data.departments);
      }
    } catch (err) {
      setError(err.message || 'Failed to load department records');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const data = await api.get('/employees');
      if (data.success) {
        setEmployees(data.employees);
      }
    } catch (err) {
      console.error('Failed to load employees list', err.message);
    }
  };

  const fetchDesignations = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.get('/designations');
      if (data.success) {
        setDesignations(data.designations);
      }
    } catch (err) {
      setError(err.message || 'Failed to load designation records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchEmployees();
    fetchDesignations();
  }, []);

  const handleOpenAddDesgModal = () => {
    setIsDesgEditMode(false);
    setDesgFormError('');
    setDesgFormData({
      name: '',
      description: '',
    });
    setDesgModalOpen(true);
  };

  const handleOpenEditDesgModal = (desg) => {
    setIsDesgEditMode(true);
    setDesgFormError('');
    setDesgFormData({
      _id: desg._id,
      name: desg.name,
      description: desg.description || '',
    });
    setDesgModalOpen(true);
  };

  const handleDesgFormSubmit = async (e) => {
    e.preventDefault();
    try {
      setDesgFormError('');
      if (isDesgEditMode) {
        const data = await api.put(`/designations/${desgFormData._id}`, desgFormData);
        if (data.success) {
          setDesgModalOpen(false);
          fetchDesignations();
        }
      } else {
        const data = await api.post('/designations', desgFormData);
        if (data.success) {
          setDesgModalOpen(false);
          fetchDesignations();
        }
      }
    } catch (err) {
      setDesgFormError(err.message || 'Operation failed');
    }
  };

  const handleDeleteDesg = async (id) => {
    if (!window.confirm('Are you sure you want to delete this designation?')) {
      return;
    }
    try {
      const data = await api.delete(`/designations/${id}`);
      if (data.success) {
        fetchDesignations();
      }
    } catch (err) {
      alert(err.message || 'Delete operation failed');
    }
  };


  const handleOpenAddModal = () => {
    setIsEditMode(false);
    setFormError('');
    setFormData({
      name: '',
      description: '',
      manager: '',
    });
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
      setFormError('');
      if (isEditMode) {
        const data = await api.put(`/departments/${formData._id}`, formData);
        if (data.success) {
          setModalOpen(false);
          fetchDepartments();
        }
      } else {
        const data = await api.post('/departments', formData);
        if (data.success) {
          setModalOpen(false);
          fetchDepartments();
        }
      }
    } catch (err) {
      setFormError(err.message || 'Operation failed');
    }
  };

  const handleDeleteDept = async (id) => {
    if (!window.confirm('Are you sure you want to delete this department?')) {
      return;
    }
    try {
      const data = await api.delete(`/departments/${id}`);
      if (data.success) {
        fetchDepartments();
      }
    } catch (err) {
      alert(err.message || 'Delete operation failed');
    }
  };

  return (
    <div className="page-container">
      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0' }}>
        <button
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
          Departments
        </button>
        <button
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
          Designations
        </button>
      </div>

      {/* Action panel */}
      {(user?.role === 'admin') && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
          {activeTab === 'departments' ? (
            <button onClick={handleOpenAddModal} className="btn btn-primary">
              <Plus size={18} /> Add Department
            </button>
          ) : (
            <button onClick={handleOpenAddDesgModal} className="btn btn-primary">
              <Plus size={18} /> Add Designation
            </button>
          )}
        </div>
      )}

      {error && <div className="alert alert-danger">{error}</div>}

      {/* ─── Tab: Departments ─── */}
      {activeTab === 'departments' && (
        loading ? (
          <p style={{ textAlign: 'center', padding: '2rem' }}>Loading Departments...</p>
        ) : departments.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No departments registered yet</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {departments.map((dept) => (
              <div key={dept._id} className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: '220px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.25rem' }}>{dept.name}</h3>
                  <span className="badge badge-present" style={{ fontWeight: 700 }}>
                    {dept.employeeCount} Members
                  </span>
                </div>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', flex: 1, lineHeight: '1.5', marginBottom: '1.5rem' }}>
                  {dept.description || 'No description provided.'}
                </p>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>
                      DEPARTMENT HEAD
                    </span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                      {dept.manager
                        ? `${dept.manager.firstName} ${dept.manager.lastName}`
                        : 'Not Assigned'}
                    </span>
                  </div>

                  {(user?.role === 'admin') && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleOpenEditModal(dept)}
                        className="btn btn-secondary btn-icon"
                        title="Edit Unit"
                        style={{ color: 'var(--primary-accent)' }}
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDeleteDept(dept._id)}
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
            ))}
          </div>
        )
      )}

      {/* ─── Tab: Designations ─── */}
      {activeTab === 'designations' && (
        loading ? (
          <p style={{ textAlign: 'center', padding: '2rem' }}>Loading Designations...</p>
        ) : designations.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No designations registered yet</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {designations.map((desg) => (
              <div key={desg._id} className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: '180px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Briefcase size={18} style={{ color: 'var(--primary-accent)' }} />
                    <h3 style={{ fontSize: '1.25rem', margin: 0 }}>{desg.name}</h3>
                  </div>
                  <span className="badge badge-present" style={{ fontWeight: 700 }}>
                    {desg.employeeCount} Employees
                  </span>
                </div>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', flex: 1, lineHeight: '1.5', marginBottom: '1.5rem' }}>
                  {desg.description || 'No description provided.'}
                </p>

                {(user?.role === 'admin') && (
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleOpenEditDesgModal(desg)}
                      className="btn btn-secondary btn-icon"
                      title="Edit Designation"
                      style={{ color: 'var(--primary-accent)' }}
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => handleDeleteDesg(desg._id)}
                      className="btn btn-secondary btn-icon"
                      title="Delete Designation"
                      style={{ color: 'var(--danger)' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Department CRUD Modal Form */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{isEditMode ? 'Modify Department Details' : 'Create New Department'}</h3>
              <button className="modal-close-btn" onClick={() => setModalOpen(false)}>
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
                  <label>Assign Department Head (Manager)</label>
                  <select
                    className="form-control"
                    value={formData.manager}
                    onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                  >
                    <option value="">Select Manager (Optional)</option>
                    {employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.firstName} {emp.lastName} ({emp.employeeId} - {emp.designation})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {isEditMode ? 'Update Unit' : 'Create Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Designation CRUD Modal Form */}
      {desgModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{isDesgEditMode ? 'Modify Designation Details' : 'Create New Designation'}</h3>
              <button className="modal-close-btn" onClick={() => setDesgModalOpen(false)}>
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
                <button type="submit" className="btn btn-primary">
                  {isDesgEditMode ? 'Update Role' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Departments;
