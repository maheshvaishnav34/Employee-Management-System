import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { Megaphone, Trash2, Plus, ArrowLeft, Loader2, Calendar, AlertCircle } from 'lucide-react';

const AnnouncementsWidget = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState('medium');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isAdminOrHR = user?.role === 'admin' || user?.role === 'hr';

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/announcements');
      if (res.success) {
        setAnnouncements(res.announcements || []);
      }
    } catch (err) {
      console.error('Error fetching announcements:', err);
      setError(err.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    try {
      setSubmitting(true);
      setError('');
      const res = await api.post('/announcements', {
        title: title.trim(),
        content: content.trim(),
        priority,
      });

      if (res.success) {
        setTitle('');
        setContent('');
        setPriority('medium');
        setIsCreating(false);
        fetchAnnouncements();
      } else {
        setError(res.message || 'Failed to create announcement');
      }
    } catch (err) {
      setError(err.message || 'Failed to create announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    try {
      const res = await api.delete(`/announcements/${id}`);
      if (res.success) {
        fetchAnnouncements();
      } else {
        setError(res.message || 'Failed to delete announcement');
      }
    } catch (err) {
      setError(err.message || 'Failed to delete announcement');
    }
  };

  // Color maps matching EMS priority levels
  const priorityColor = {
    high: { border: '#ff5b5b', text: '#ff5b5b', bg: 'rgba(255, 91, 91, 0.08)' },
    medium: { border: '#ffb119', text: '#d98b00', bg: 'rgba(255, 177, 25, 0.08)' },
    low: { border: '#6777ef', text: '#6777ef', bg: 'rgba(103, 119, 239, 0.08)' },
  };

  if (loading && announcements.length === 0) {
    return (
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '220px' }}>
        <Loader2 className="spinner" size={24} style={{ color: 'var(--primary-accent)' }} />
      </div>
    );
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: '220px', transition: 'all 0.3s ease' }}>
      
      {/* Widget Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
        <span className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
          <Megaphone size={18} style={{ color: 'var(--primary-accent)' }} />
          Workplace Announcements
        </span>

        {isAdminOrHR && (
          <button
            onClick={() => {
              setIsCreating(!isCreating);
              setError('');
            }}
            className="btn btn-secondary"
            style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', borderRadius: '8px', cursor: 'pointer' }}
          >
            {isCreating ? (
              <>
                <ArrowLeft size={12} /> Back
              </>
            ) : (
              <>
                <Plus size={12} /> Post Notice
              </>
            )}
          </button>
        )}
      </div>

      {/* Form / List View */}
      {isCreating ? (
        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1 }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>New Announcement</h4>
          
          {error && (
            <div style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', background: 'rgba(255, 91, 91, 0.08)', color: '#ff5b5b', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Title</label>
            <input
              type="text"
              placeholder="e.g. Town Hall Meeting Scheduled"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '0.78rem',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.78rem',
                }}
              >
                <option value="low">Low (General)</option>
                <option value="medium">Medium (Important)</option>
                <option value="high">High (Urgent)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Content Details</label>
            <textarea
              placeholder="Write the announcement description details here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={3}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '0.78rem',
                resize: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ padding: '0.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', cursor: 'pointer' }}
          >
            {submitting ? (
              <>
                <Loader2 className="spinner" size={14} /> Posting...
              </>
            ) : 'Post to Notice Board'}
          </button>
        </form>
      ) : (
        /* List Mode */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, overflowY: 'auto', maxHeight: '380px', paddingRight: '4px' }}>
          {announcements.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-secondary)', padding: '2rem 0' }}>
              <Megaphone size={32} style={{ opacity: 0.25, marginBottom: '0.5rem' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>No announcements posted yet</span>
            </div>
          ) : (
            announcements.map((item) => {
              const colors = priorityColor[item.priority] || priorityColor.medium;

              return (
                <div
                  key={item._id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '0.85rem',
                    border: '1px solid var(--border-color)',
                    borderLeft: `4px solid ${colors.border}`,
                    borderRadius: '10px',
                    background: 'var(--bg-primary)',
                    position: 'relative',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  }}
                  className="announcement-item"
                >
                  {/* Delete Button */}
                  {isAdminOrHR && (
                    <button
                      onClick={() => handleDelete(item._id)}
                      style={{
                        position: 'absolute',
                        top: '0.75rem',
                        right: '0.75rem',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        opacity: 0.6,
                        transition: 'opacity 0.15s ease, color 0.15s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#ff5b5b'; e.currentTarget.style.opacity = 1; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.opacity = 0.6; }}
                      title="Delete Announcement"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}

                  {/* Header metadata */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '0.1rem 0.45rem',
                      borderRadius: '10px',
                      background: colors.bg,
                      color: colors.text,
                    }}>
                      {item.priority} priority
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <Calendar size={10} />
                      {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  {/* Title & Content */}
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 0.35rem 0', color: 'var(--text-primary)', paddingRight: '1.5rem' }}>
                    {item.title}
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                    {item.content}
                  </p>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default AnnouncementsWidget;
