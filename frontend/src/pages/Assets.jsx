import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  Laptop, Plus, CheckCircle, HelpCircle, AlertTriangle,
  Clock, X, AlertCircle, Calendar, User, Search, RefreshCw
} from 'lucide-react';
import { SkeletonBlock } from '../components/Skeleton';

const CATEGORY_ICONS = {
  Laptop: Laptop,
  Monitor: Laptop, // Fallback icon
  Keyboard: Laptop,
  Mouse: Laptop,
  Phone: Laptop,
  Headset: Laptop,
  License: Laptop,
  Other: HelpCircle,
};

const Assets = () => {
  const { user } = useAuth();
  const [assets, setAssets] = useState([]);
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' or 'requests'
  const [error, setError] = useState('');
  
  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [actionModalOpen, setActionModalOpen] = useState(false);

  // Selected details
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Form states
  const [assetForm, setAssetForm] = useState({
    name: '', serialNumber: '', category: 'Laptop', value: '', condition: 'Good', status: 'Available'
  });
  const [requestForm, setRequestForm] = useState({
    assetCategory: 'Laptop', reason: '', urgency: 'Medium'
  });
  const [assignForm, setAssignForm] = useState({
    assignedTo: ''
  });
  const [actionForm, setActionForm] = useState({
    status: 'Approved', notes: ''
  });
  const [formError, setFormError] = useState('');

  const isHRPlus = ['admin', 'hr'].includes(user?.role);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const assetRes = await api.get('/assets');
      if (assetRes.success) setAssets(assetRes.assets);

      const requestRes = await api.get('/assets/requests');
      if (requestRes.success) setRequests(requestRes.requests);

      if (isHRPlus) {
        const empRes = await api.get('/employees');
        if (empRes.success) setEmployees(empRes.employees);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateAsset = async (e) => {
    e.preventDefault();
    if (!assetForm.name || !assetForm.serialNumber) {
      setFormError('Name and Serial Number are required');
      return;
    }
    try {
      setFormError('');
      const res = await api.post('/assets', assetForm);
      if (res.success) {
        setAddModalOpen(false);
        setAssetForm({ name: '', serialNumber: '', category: 'Laptop', value: '', condition: 'Good', status: 'Available' });
        fetchData();
      }
    } catch (e) {
      setFormError(e.message);
    }
  };

  const handleAssignAsset = async (e) => {
    e.preventDefault();
    try {
      setFormError('');
      const res = await api.put(`/assets/${selectedAsset._id}`, {
        assignedTo: assignForm.assignedTo || null
      });
      if (res.success) {
        setAssignModalOpen(false);
        setAssignForm({ assignedTo: '' });
        setSelectedAsset(null);
        fetchData();
      }
    } catch (e) {
      setFormError(e.message);
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!requestForm.reason) {
      setFormError('Reason is required');
      return;
    }
    try {
      setFormError('');
      const res = await api.post('/assets/requests', requestForm);
      if (res.success) {
        setRequestModalOpen(false);
        setRequestForm({ assetCategory: 'Laptop', reason: '', urgency: 'Medium' });
        fetchData();
      }
    } catch (e) {
      setFormError(e.message);
    }
  };

  const handleRequestAction = async (e) => {
    e.preventDefault();
    try {
      setFormError('');
      const res = await api.put(`/assets/requests/${selectedRequest._id}`, actionForm);
      if (res.success) {
        setActionModalOpen(false);
        setActionForm({ status: 'Approved', notes: '' });
        setSelectedRequest(null);
        fetchData();
      }
    } catch (e) {
      setFormError(e.message);
    }
  };

  const handleDeleteAsset = async (id) => {
    if (!window.confirm('Are you sure you want to delete this asset record?')) return;
    try {
      await api.delete(`/assets/${id}`);
      fetchData();
    } catch (e) {
      alert(e.message);
    }
  };

  const getUrgencyBadge = (urgency) => {
    if (urgency === 'High') return <span className="badge badge-inactive">High</span>;
    if (urgency === 'Medium') return <span className="badge badge-pending">Medium</span>;
    return <span className="badge badge-active" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>Low</span>;
  };

  const getStatusBadge = (status) => {
    if (status === 'Assigned') return <span className="badge badge-active" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>Assigned</span>;
    if (status === 'Available') return <span className="badge badge-present">Available</span>;
    if (status === 'Under Repair') return <span className="badge badge-late">Under Repair</span>;
    return <span className="badge badge-inactive">Retired</span>;
  };

  return (
    <div className="page-container page-enter">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '14px',
          background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 15px rgba(59,130,246,0.3)',
        }}>
          <Laptop size={22} color="white" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Asset Management</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            Track company-owned hardware, equipment, licenses, and assignations.
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem' }}>
          <button onClick={fetchData} className="btn btn-secondary btn-icon" title="Reload data">
            <RefreshCw size={16} />
          </button>
          {!isHRPlus ? (
            <button onClick={() => setRequestModalOpen(true)} className="btn btn-primary" style={{ background: 'var(--primary-gradient)' }}>
              <Plus size={18} /> Request Equipment
            </button>
          ) : (
            <button onClick={() => setAddModalOpen(true)} className="btn btn-primary" style={{ background: 'var(--primary-gradient)' }}>
              <Plus size={18} /> Register Asset
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}><AlertCircle size={16} /> {error}</div>}

      {/* Tabs for Admin/HR */}
      {isHRPlus && (
        <div className="card" style={{ padding: '0.5rem', display: 'inline-flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <button
            className={`btn ${activeTab === 'inventory' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem', borderRadius: '10px', background: activeTab === 'inventory' ? 'var(--primary-gradient)' : 'transparent', border: 'none', color: activeTab === 'inventory' ? 'white' : 'var(--text-primary)' }}
            onClick={() => setActiveTab('inventory')}
          >
            Asset Directory ({assets.length})
          </button>
          <button
            className={`btn ${activeTab === 'requests' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem', borderRadius: '10px', background: activeTab === 'requests' ? 'var(--primary-gradient)' : 'transparent', border: 'none', color: activeTab === 'requests' ? 'white' : 'var(--text-primary)' }}
            onClick={() => setActiveTab('requests')}
          >
            Requests Queue ({requests.filter(r => r.status === 'Pending').length} Pending)
          </button>
        </div>
      )}

      {/* Content Rendering */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[0, 1, 2].map(i => (
            <div key={i} className="card" style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <SkeletonBlock width="45px" height="45px" borderRadius="12px" />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <SkeletonBlock height="16px" width="40%" />
                <SkeletonBlock height="12px" width="70%" />
              </div>
            </div>
          ))}
        </div>
      ) : activeTab === 'inventory' || !isHRPlus ? (
        /* Inventory List View */
        assets.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
            <Laptop size={48} style={{ color: 'var(--text-secondary)', marginBottom: '1rem', opacity: 0.5 }} />
            <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>No assets registered or assigned to you.</p>
          </div>
        ) : (
          <div className="table-container">
            <div className="table-header-row">
              <span className="table-title">{isHRPlus ? 'Company Hardware Inventory' : 'My Assigned Devices'}</span>
            </div>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Asset Name</th>
                    <th>Category</th>
                    <th>Serial Number</th>
                    <th>Condition</th>
                    <th>Status</th>
                    {isHRPlus && <th>Assigned To</th>}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map(asset => (
                    <tr key={asset._id}>
                      <td style={{ fontWeight: 600 }}>{asset.name}</td>
                      <td>{asset.category}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{asset.serialNumber}</td>
                      <td>{asset.condition}</td>
                      <td>{getStatusBadge(asset.status)}</td>
                      {isHRPlus && (
                        <td>
                          {asset.assignedTo ? (
                            <span>{asset.assignedTo.firstName} {asset.assignedTo.lastName}</span>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Unassigned</span>
                          )}
                        </td>
                      )}
                      <td>
                        {isHRPlus ? (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => { setSelectedAsset(asset); setAssignForm({ assignedTo: asset.assignedTo?._id || '' }); setAssignModalOpen(true); }}
                              className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                            >
                              Assign
                            </button>
                            <button
                              onClick={() => handleDeleteAsset(asset._id)}
                              className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', color: 'var(--danger)' }}
                            >
                              Delete
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>View-only</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        /* Requests Queue (HR View) */
        requests.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
            <Clock size={48} style={{ color: 'var(--text-secondary)', marginBottom: '1rem', opacity: 0.5 }} />
            <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>No equipment requests found.</p>
          </div>
        ) : (
          <div className="table-container">
            <div className="table-header-row">
              <span className="table-title">Employee Asset Requests Queue</span>
            </div>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Requester</th>
                    <th>Category</th>
                    <th>Reason</th>
                    <th>Urgency</th>
                    <th>Applied Date</th>
                    <th>Status</th>
                    <th>Notes</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map(req => (
                    <tr key={req._id}>
                      <td style={{ fontWeight: 600 }}>
                        {req.employee ? `${req.employee.firstName} ${req.employee.lastName}` : 'Unknown Employee'}
                      </td>
                      <td>{req.assetCategory}</td>
                      <td title={req.reason} style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {req.reason}
                      </td>
                      <td>{getUrgencyBadge(req.urgency)}</td>
                      <td>{new Date(req.requestDate).toLocaleDateString()}</td>
                      <td>
                        <span className={`badge ${
                          req.status === 'Approved' ? 'badge-approved' : req.status === 'Rejected' ? 'badge-rejected' : 'badge-pending'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td>{req.notes || '-'}</td>
                      <td>
                        {req.status === 'Pending' ? (
                          <button
                            onClick={() => { setSelectedRequest(req); setActionModalOpen(true); }}
                            className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', background: 'var(--primary-gradient)' }}
                          >
                            Respond
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Handled</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Register Asset Modal */}
      {addModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Register Company Asset</h3>
              <button className="modal-close-btn" onClick={() => setAddModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateAsset}>
              <div className="modal-body">
                {formError && <div className="alert alert-danger" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}><AlertCircle size={16} /> {formError}</div>}
                <div className="form-group">
                  <label>Asset Name *</label>
                  <input type="text" className="form-control" placeholder="e.g. MacBook Pro 16"
                    value={assetForm.name} onChange={e => setAssetForm({ ...assetForm, name: e.target.value })} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Serial Number *</label>
                    <input type="text" className="form-control" placeholder="e.g. MBP-982-XYZ"
                      value={assetForm.serialNumber} onChange={e => setAssetForm({ ...assetForm, serialNumber: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Category *</label>
                    <select className="form-control" value={assetForm.category} onChange={e => setAssetForm({ ...assetForm, category: e.target.value })}>
                      {['Laptop', 'Monitor', 'Keyboard', 'Mouse', 'Phone', 'Headset', 'License', 'Other'].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Asset Value ($)</label>
                    <input type="number" className="form-control" placeholder="e.g. 1500"
                      value={assetForm.value} onChange={e => setAssetForm({ ...assetForm, value: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Condition</label>
                    <select className="form-control" value={assetForm.condition} onChange={e => setAssetForm({ ...assetForm, condition: e.target.value })}>
                      {['New', 'Good', 'Fair', 'Poor'].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setAddModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Asset</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Asset Modal */}
      {assignModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Assign Asset: {selectedAsset?.name}</h3>
              <button className="modal-close-btn" onClick={() => { setAssignModalOpen(false); setSelectedAsset(null); }}><X size={20} /></button>
            </div>
            <form onSubmit={handleAssignAsset}>
              <div className="modal-body">
                {formError && <div className="alert alert-danger" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}><AlertCircle size={16} /> {formError}</div>}
                <div className="form-group">
                  <label>Assign To Employee</label>
                  <select className="form-control" value={assignForm.assignedTo} onChange={e => setAssignForm({ assignedTo: e.target.value })}>
                    <option value="">-- Unassigned / Return to Stock --</option>
                    {employees.map(emp => (
                      <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName} ({emp.employeeId})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setAssignModalOpen(false); setSelectedAsset(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary">Update Assignation</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request Equipment Modal */}
      {requestModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Request Equipment</h3>
              <button className="modal-close-btn" onClick={() => setRequestModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateRequest}>
              <div className="modal-body">
                {formError && <div className="alert alert-danger" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}><AlertCircle size={16} /> {formError}</div>}
                <div className="form-row">
                  <div className="form-group">
                    <label>Asset Category *</label>
                    <select className="form-control" value={requestForm.assetCategory} onChange={e => setRequestForm({ ...requestForm, assetCategory: e.target.value })}>
                      {['Laptop', 'Monitor', 'Keyboard', 'Mouse', 'Phone', 'Headset', 'License', 'Other'].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Urgency Level</label>
                    <select className="form-control" value={requestForm.urgency} onChange={e => setRequestForm({ ...requestForm, urgency: e.target.value })}>
                      {['Low', 'Medium', 'High'].map(u => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Business Reason / Justification *</label>
                  <textarea rows="4" className="form-control" placeholder="Please describe why this equipment is needed..." style={{ resize: 'none' }}
                    value={requestForm.reason} onChange={e => setRequestForm({ ...requestForm, reason: e.target.value })} required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setRequestModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request Action Modal */}
      {actionModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Respond to Asset Request</h3>
              <button className="modal-close-btn" onClick={() => { setActionModalOpen(false); setSelectedRequest(null); }}><X size={20} /></button>
            </div>
            <form onSubmit={handleRequestAction}>
              <div className="modal-body">
                {formError && <div className="alert alert-danger" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}><AlertCircle size={16} /> {formError}</div>}
                <div className="form-group">
                  <label>Decision *</label>
                  <select className="form-control" value={actionForm.status} onChange={e => setActionForm({ ...actionForm, status: e.target.value })}>
                    <option value="Approved">Approve Request</option>
                    <option value="Rejected">Reject Request</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Manager Notes / Instructions</label>
                  <textarea rows="3" className="form-control" placeholder="e.g. Approved. Please coordinate with IT support for pickup." style={{ resize: 'none' }}
                    value={actionForm.notes} onChange={e => setActionForm({ ...actionForm, notes: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setActionModalOpen(false); setSelectedRequest(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Decision</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assets;
