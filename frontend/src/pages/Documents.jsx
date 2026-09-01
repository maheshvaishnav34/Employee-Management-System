import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  FolderClosed, FileText, Plus, Trash2, X, AlertCircle, Eye, Search, RefreshCw, BookOpen
} from 'lucide-react';
import { SkeletonBlock } from '../components/Skeleton';

const CATEGORY_COLORS = {
  Handbook: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6' },
  Policy: { bg: 'rgba(16,185,129,0.1)', color: '#10b981' },
  Contract: { bg: 'rgba(139,92,246,0.1)', color: '#8b5cf6' },
  Benefit: { bg: 'rgba(236,72,153,0.1)', color: '#ec4899' },
  Other: { bg: 'rgba(100,116,139,0.1)', color: '#64748b' },
};

const Documents = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [readModalOpen, setReadModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  
  // Forms
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    title: '', description: '', category: 'Policy', content: ''
  });

  const isHRPlus = ['admin', 'hr'].includes(user?.role);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/documents');
      if (res.success) setDocuments(res.documents);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.content) {
      setFormError('Title and Content are required');
      return;
    }
    try {
      setFormError('');
      const res = await api.post('/documents', formData);
      if (res.success) {
        setPublishModalOpen(false);
        setFormData({ title: '', description: '', category: 'Policy', content: '' });
        fetchDocuments();
      }
    } catch (e) {
      setFormError(e.message);
    }
  };

  const handleDeleteDoc = async (id) => {
    if (!window.confirm('Are you sure you want to delete this document permanently?')) return;
    try {
      await api.delete(`/documents/${id}`);
      fetchDocuments();
    } catch (e) {
      alert(e.message);
    }
  };

  const filteredDocs = documents.filter(doc => {
    const q = searchQuery.toLowerCase();
    return doc.title.toLowerCase().includes(q) ||
      doc.description.toLowerCase().includes(q) ||
      doc.category.toLowerCase().includes(q);
  });

  return (
    <div className="page-container page-enter">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '14px',
          background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 15px rgba(99,102,241,0.3)',
        }}>
          <FolderClosed size={22} color="white" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Company Policies & Documents</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            Read and publish handbook files, standard operating procedures, and compliance guidelines.
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem' }}>
          <button onClick={fetchDocuments} className="btn btn-secondary btn-icon" title="Reload documents">
            <RefreshCw size={16} />
          </button>
          {isHRPlus && (
            <button onClick={() => setPublishModalOpen(true)} className="btn btn-primary" style={{ background: 'var(--primary-gradient)' }}>
              <Plus size={18} /> Publish Policy
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}><AlertCircle size={16} /> {error}</div>}

      {/* Search Bar */}
      <div className="card" style={{ padding: '0.75rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Search size={18} style={{ color: 'var(--text-secondary)' }} />
        <input
          type="text"
          className="form-control"
          placeholder="Search documents by title, category, or description..."
          style={{ border: 'none', background: 'transparent', padding: '0.25rem 0', boxShadow: 'none' }}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Documents Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {[0, 1, 2].map(i => (
            <div key={i} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <SkeletonBlock width="40px" height="40px" borderRadius="10px" />
              <SkeletonBlock height="18px" width="60%" />
              <SkeletonBlock height="10px" />
              <SkeletonBlock height="10px" width="80%" />
            </div>
          ))}
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
          <FolderClosed size={48} style={{ color: 'var(--text-secondary)', marginBottom: '1rem', opacity: 0.5 }} />
          <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>No documents found.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {filteredDocs.map(doc => {
            const catStyle = CATEGORY_COLORS[doc.category] || CATEGORY_COLORS.Other;
            return (
              <div key={doc._id} className="card" style={{
                padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                minHeight: '200px'
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <span style={{
                      fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '6px',
                      background: catStyle.bg, color: catStyle.color
                    }}>
                      {doc.category}
                    </span>
                    {isHRPlus && (
                      <button
                        onClick={() => handleDeleteDoc(doc._id)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.5rem' }}>{doc.title}</h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                    {doc.description || 'No summary description available.'}
                  </p>
                </div>
                <div style={{
                  marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    By: {doc.uploadedBy?.username || 'HR Dept'}
                  </span>
                  <button
                    onClick={() => { setSelectedDoc(doc); setReadModalOpen(true); }}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '0.35rem 0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Eye size={13} /> Read Policy
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Publish Policy Modal */}
      {publishModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '640px', maxWidth: '90%' }}>
            <div className="modal-header">
              <h3 className="modal-title">Publish New Company Policy</h3>
              <button className="modal-close-btn" onClick={() => setPublishModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handlePublish}>
              <div className="modal-body">
                {formError && <div className="alert alert-danger" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}><AlertCircle size={16} /> {formError}</div>}
                <div className="form-group">
                  <label>Document Title *</label>
                  <input type="text" className="form-control" placeholder="e.g. Travel Reimbursement SOP 2026"
                    value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Category *</label>
                    <select className="form-control" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                      {['Handbook', 'Policy', 'Contract', 'Benefit', 'Other'].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Brief Summary / Description</label>
                    <input type="text" className="form-control" placeholder="e.g. Rules regarding travel bounds."
                      value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Document Content (Plain Text/Markdown Guidelines) *</label>
                  <textarea rows="10" className="form-control" placeholder="Write full text details here..." style={{ resize: 'none', fontFamily: 'monospace', fontSize: '0.88rem' }}
                    value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setPublishModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Publish Document</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Read Document Modal */}
      {readModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '700px', maxWidth: '95%', maxHeight: '85vh' }}>
            <div className="modal-header" style={{ paddingBottom: '1rem' }}>
              <div>
                <span className="badge badge-present" style={{ fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.25rem', display: 'inline-block' }}>
                  {selectedDoc?.category}
                </span>
                <h3 className="modal-title" style={{ margin: 0 }}>{selectedDoc?.title}</h3>
              </div>
              <button className="modal-close-btn" onClick={() => { setReadModalOpen(false); setSelectedDoc(null); }}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ padding: '1.75rem', overflowY: 'auto' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                Published on: {new Date(selectedDoc?.createdAt).toLocaleDateString()} | Author: {selectedDoc?.uploadedBy?.username || 'HR Manager'}
              </p>
              <div style={{
                lineHeight: 1.7, fontSize: '0.925rem', whiteSpace: 'pre-wrap', fontFamily: 'inherit',
                color: 'var(--text-primary)'
              }}>
                {selectedDoc?.content}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => { setReadModalOpen(false); setSelectedDoc(null); }}>
                Close Reader
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Documents;
