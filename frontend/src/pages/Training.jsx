import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap, Plus, BookOpen, Clock, Users, CheckCircle,
  PlayCircle, Award, Video, Building, Sparkles, Filter, X, ChevronRight, AlertCircle
} from 'lucide-react';

const CATEGORY_COLORS = {
  Technical: { bg: 'rgba(103,119,239,0.12)', color: '#6777ef' },
  Leadership: { bg: 'rgba(236,72,153,0.12)', color: '#ec4899' },
  Compliance: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  'Soft Skills': { bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
  Safety: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
  'HR Onboarding': { bg: 'rgba(139,92,246,0.12)', color: '#8b5cf6' },
};

const Training = () => {
  const { user } = useAuth();
  const isHRPlus = ['admin', 'hr'].includes(user?.role);

  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'my'
  const [categoryFilter, setCategoryFilter] = useState('all');

  // New Training Modal (HR/Admin)
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [createForm, setCreateForm] = useState({
    title: '',
    category: 'Technical',
    description: '',
    instructor: '',
    duration: '2 Weeks',
    mode: 'Online',
    capacity: 50,
  });
  const [creating, setCreating] = useState(false);

  // Update Progress Modal (Employee)
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [progressVal, setProgressVal] = useState(0);
  const [progressNotes, setProgressNotes] = useState('');
  const [updatingProgress, setUpdatingProgress] = useState(false);

  const fetchTrainings = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/training');
      if (res.success) {
        setTrainings(res.trainings);
      }
    } catch (err) {
      setError(err.message || 'Failed to load training programs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainings();
  }, []);

  const handleEnroll = async (trainingId) => {
    try {
      const res = await api.post(`/training/${trainingId}/enroll`);
      if (res.success) {
        fetchTrainings();
      }
    } catch (err) {
      alert(err.message || 'Failed to enroll in training');
    }
  };

  const handleCreateTraining = async (e) => {
    e.preventDefault();
    if (!createForm.title || !createForm.description) {
      setFormError('Please enter a course title and syllabus description.');
      return;
    }

    try {
      setCreating(true);
      setFormError('');
      const res = await api.post('/training', createForm);
      if (res.success) {
        setCreateModalOpen(false);
        setFormError('');
        setCreateForm({
          title: '',
          category: 'Technical',
          description: '',
          instructor: '',
          duration: '2 Weeks',
          mode: 'Online',
          capacity: 50,
        });
        fetchTrainings();
      }
    } catch (err) {
      setFormError(err.message || 'Failed to create training program');
    } finally {
      setCreating(false);
    }
  };

  const handleSaveProgress = async (e) => {
    e.preventDefault();
    if (!selectedTraining) return;

    try {
      setUpdatingProgress(true);
      const res = await api.put(`/training/${selectedTraining._id}/progress`, {
        progress: progressVal,
        notes: progressNotes,
      });
      if (res.success) {
        setProgressModalOpen(false);
        setSelectedTraining(null);
        fetchTrainings();
      }
    } catch (err) {
      alert(err.message || 'Failed to update progress');
    } finally {
      setUpdatingProgress(false);
    }
  };

  const myTrainings = trainings.filter(t => t.isEnrolled);

  const displayedTrainings = (activeTab === 'my' ? myTrainings : trainings).filter(t => {
    if (categoryFilter === 'all') return true;
    return t.category.toLowerCase() === categoryFilter.toLowerCase();
  });

  const completedCount = myTrainings.filter(t => t.myEnrollment?.status === 'Completed').length;
  const inProgressCount = myTrainings.filter(t => t.myEnrollment?.status === 'In Progress' || t.myEnrollment?.status === 'Enrolled').length;

  return (
    <div className="page-container" style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Header Banner */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, rgba(103,119,239,0.06) 0%, rgba(139,92,246,0.03) 100%)',
        border: '1px solid rgba(103,119,239,0.15)',
        padding: '1.5rem',
        borderRadius: '16px',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px',
            background: 'rgba(103,119,239,0.12)', color: 'var(--primary-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <GraduationCap size={28} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>
              Learning & Professional Development
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
              Explore certification programs, self-enroll in skill development courses, and track completion progress.
            </p>
          </div>
        </div>

        {isHRPlus && (
          <button
            onClick={() => { setFormError(''); setCreateModalOpen(true); }}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', borderRadius: '10px' }}
          >
            <Plus size={16} /> New Training Program
          </button>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid-auto-fit-4" style={{ marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(103,119,239,0.1)', color: '#6777ef', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Available Courses</span>
            <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>{trainings.length}</h3>
          </div>
        </div>

        <div className="card" style={{ padding: '1.1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PlayCircle size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>My Enrolled Courses</span>
            <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#8b5cf6' }}>{myTrainings.length}</h3>
          </div>
        </div>

        <div className="card" style={{ padding: '1.1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>In Progress</span>
            <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#f59e0b' }}>{inProgressCount}</h3>
          </div>
        </div>

        <div className="card" style={{ padding: '1.1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(46,189,127,0.1)', color: '#2ebd7f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Award size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Completed</span>
            <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#2ebd7f' }}>{completedCount}</h3>
          </div>
        </div>
      </div>

      {/* Main Tabs (Browse All vs My Enrollments) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('all')}
            className={`btn ${activeTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.5rem 1.1rem', fontSize: '0.85rem', borderRadius: '8px' }}
          >
            Browse Programs ({trainings.length})
          </button>
          <button
            onClick={() => setActiveTab('my')}
            className={`btn ${activeTab === 'my' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.5rem 1.1rem', fontSize: '0.85rem', borderRadius: '8px' }}
          >
            My Enrollments ({myTrainings.length})
          </button>
        </div>

        {/* Category filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          {['all', 'Technical', 'Leadership', 'Compliance', 'Safety'].map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              style={{
                border: '1px solid var(--border-color)',
                background: categoryFilter === cat ? 'var(--primary-accent)' : 'var(--bg-secondary)',
                color: categoryFilter === cat ? 'white' : 'var(--text-secondary)',
                fontSize: '0.75rem', fontWeight: 600, padding: '0.3rem 0.75rem', borderRadius: '6px', cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Programs Grid */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <div className="spin" style={{ width: '28px', height: '28px', border: '3px solid var(--border-color)', borderTopColor: 'var(--primary-accent)', borderRadius: '50%', margin: '0 auto 1rem' }} />
          Loading training courses...
        </div>
      ) : error ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--danger)' }}>
          <AlertCircle size={24} style={{ marginBottom: '0.5rem' }} />
          <div>{error}</div>
        </div>
      ) : displayedTrainings.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-secondary)' }}>
          <BookOpen size={42} style={{ color: 'var(--text-secondary)', opacity: 0.5, marginBottom: '0.75rem', display: 'block', margin: '0 auto 0.75rem' }} />
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>No courses found</h3>
          <p style={{ fontSize: '0.85rem', margin: '0.4rem 0 0 0' }}>
            {activeTab === 'my'
              ? 'You have not enrolled in any training program yet. Check the "Browse Programs" tab!'
              : 'No courses match the selected category filter.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {displayedTrainings.map(t => {
            const catStyle = CATEGORY_COLORS[t.category] || CATEGORY_COLORS.Technical;
            const isEnrolled = t.isEnrolled;
            const myEnr = t.myEnrollment;
            const progress = myEnr?.progress || 0;
            const isDone = myEnr?.status === 'Completed';

            return (
              <div
                key={t._id}
                className="card"
                style={{
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  padding: '1.35rem', borderRadius: '14px', transition: 'all 0.2s ease',
                  border: isEnrolled ? '1px solid rgba(103,119,239,0.25)' : '1px solid var(--border-color)',
                  boxShadow: isEnrolled ? '0 4px 16px rgba(103,119,239,0.06)' : 'none',
                }}
              >
                <div>
                  {/* Top tags */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{
                      background: catStyle.bg, color: catStyle.color,
                      fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '6px',
                    }}>
                      {t.category}
                    </span>

                    <span style={{
                      display: 'flex', alignItems: 'center', gap: '0.3rem',
                      fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600,
                    }}>
                      {t.mode === 'Online' ? <Video size={13} /> : <Building size={13} />}
                      {t.mode} · {t.duration}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 700, lineHeight: 1.3 }}>
                    {t.title}
                  </h3>
                  <p style={{
                    margin: '0 0 1rem 0', fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5,
                    display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {t.description}
                  </p>
                </div>

                <div>
                  {/* Instructor & Seats */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', paddingBottom: '0.85rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.85rem' }}>
                    <span>By <strong>{t.instructor}</strong></span>
                    <span><Users size={12} style={{ display: 'inline', marginRight: '3px' }} /> {t.enrolledCount}/{t.capacity} Enrolled</span>
                  </div>

                  {/* Enrollment / Progress section */}
                  {isEnrolled ? (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', fontSize: '0.78rem' }}>
                        <span style={{ fontWeight: 700, color: isDone ? 'var(--success)' : 'var(--primary-accent)' }}>
                          {isDone ? 'Completed ✓' : `${progress}% In Progress`}
                        </span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>
                          Status: {myEnr?.status}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div style={{ height: '7px', background: 'rgba(0,0,0,0.06)', borderRadius: '99px', overflow: 'hidden', marginBottom: '0.85rem' }}>
                        <div style={{
                          height: '100%',
                          width: `${progress}%`,
                          background: isDone ? 'linear-gradient(90deg, #10b981, #2ebd7f)' : 'linear-gradient(90deg, #6777ef, #8b5cf6)',
                          borderRadius: '99px',
                          transition: 'width 0.4s ease',
                        }} />
                      </div>

                      <button
                        onClick={() => {
                          setSelectedTraining(t);
                          setProgressVal(progress);
                          setProgressNotes(myEnr?.notes || '');
                          setProgressModalOpen(true);
                        }}
                        className="btn btn-secondary"
                        style={{ width: '100%', fontSize: '0.82rem', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                      >
                        {isDone ? 'Review Completion' : 'Update Learning Progress'} <ChevronRight size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEnroll(t._id)}
                      className="btn btn-primary"
                      style={{ width: '100%', fontSize: '0.85rem', padding: '0.55rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                    >
                      <Plus size={15} /> Enroll in Program
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create Training (HR/Admin) */}
      {createModalOpen && createPortal(
        <div className="modal-overlay active" onClick={(e) => { if (e.target === e.currentTarget) setCreateModalOpen(false); }}>
          <div
            className="modal-content"
            style={{ maxWidth: '560px', width: '92%', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-header" style={{ padding: '1.25rem 1.5rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(103,119,239,0.15) 0%, rgba(139,92,246,0.1) 100%)',
                  color: 'var(--primary-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <GraduationCap size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Create Training Program
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Assign curriculum, instructor & departments
                  </span>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                style={{
                  background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '50%',
                  width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--text-secondary)', transition: 'all 0.2s'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateTraining}>
              <div className="modal-body" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem', maxHeight: '72vh', overflowY: 'auto' }}>
                {formError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600 }}>
                    <AlertCircle size={16} /> {formError}
                  </div>
                )}

                {/* Title */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                    Course Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Advanced Cloud Security & Kubernetes"
                    value={createForm.title}
                    onChange={e => setCreateForm({ ...createForm, title: e.target.value })}
                    className="form-control"
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                      CATEGORY
                    </label>
                    <select
                      value={createForm.category}
                      onChange={e => setCreateForm({ ...createForm, category: e.target.value })}
                      className="form-control"
                      style={{ width: '100%' }}
                    >
                      <option value="Technical">Technical</option>
                      <option value="Leadership">Leadership</option>
                      <option value="Compliance">Compliance</option>
                      <option value="Soft Skills">Soft Skills</option>
                      <option value="Safety">Safety</option>
                      <option value="HR Onboarding">HR Onboarding</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                      DELIVERY MODE
                    </label>
                    <select
                      value={createForm.mode}
                      onChange={e => setCreateForm({ ...createForm, mode: e.target.value })}
                      className="form-control"
                      style={{ width: '100%' }}
                    >
                      <option value="Online">Online / Self-Paced</option>
                      <option value="Classroom">Classroom</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                      DURATION
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 4 Weeks, 15 Hours"
                      value={createForm.duration}
                      onChange={e => setCreateForm({ ...createForm, duration: e.target.value })}
                      className="form-control"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                      INSTRUCTOR / ACADEMY
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. AWS Training Partner"
                      value={createForm.instructor}
                      onChange={e => setCreateForm({ ...createForm, instructor: e.target.value })}
                      className="form-control"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                    DESCRIPTION & SYLLABUS *
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Outline course learning objectives, prerequisites, and evaluation..."
                    value={createForm.description}
                    onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                    className="form-control"
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="modal-footer" style={{ padding: '1.1rem 1.5rem', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setCreateModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="btn btn-primary">
                  {creating ? 'Publishing...' : 'Publish Course'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Update Progress (Employee) */}
      {progressModalOpen && selectedTraining && createPortal(
        <div className="modal-overlay active" onClick={(e) => { if (e.target === e.currentTarget) setProgressModalOpen(false); }}>
          <div
            className="modal-content"
            style={{ maxWidth: '520px', width: '92%', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-header" style={{ padding: '1.25rem 1.5rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(103,119,239,0.15) 0%, rgba(139,92,246,0.1) 100%)',
                  color: 'var(--primary-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <Award size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Update Learning Progress
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Track course milestone & log completion
                  </span>
                </div>
              </div>
              <button
                onClick={() => setProgressModalOpen(false)}
                style={{
                  background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '50%',
                  width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--text-secondary)', transition: 'all 0.2s'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveProgress}>
              <div className="modal-body" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Course Card Preview */}
                <div style={{
                  padding: '1rem 1.15rem',
                  background: 'linear-gradient(135deg, rgba(103,119,239,0.05) 0%, rgba(139,92,246,0.03) 100%)',
                  border: '1px solid rgba(103,119,239,0.15)',
                  borderRadius: '14px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {selectedTraining.title}
                    </h4>
                    <span style={{
                      background: CATEGORY_COLORS[selectedTraining.category]?.bg || 'rgba(103,119,239,0.12)',
                      color: CATEGORY_COLORS[selectedTraining.category]?.color || 'var(--primary-accent)',
                      fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.55rem', borderRadius: '6px', whiteSpace: 'nowrap'
                    }}>
                      {selectedTraining.category}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Clock size={13} /> {selectedTraining.duration}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Users size={13} /> {selectedTraining.instructor}
                    </span>
                  </div>
                </div>

                {/* Interactive Progress Section */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                      Course Progress
                    </label>
                    <span style={{
                      fontSize: '0.85rem', fontWeight: 800,
                      padding: '0.2rem 0.65rem', borderRadius: '8px',
                      background: progressVal >= 100 ? 'rgba(46,189,127,0.12)' : 'rgba(103,119,239,0.12)',
                      color: progressVal >= 100 ? 'var(--success)' : 'var(--primary-accent)',
                      display: 'flex', alignItems: 'center', gap: '0.3rem'
                    }}>
                      {progressVal >= 100 ? <CheckCircle size={14} /> : <PlayCircle size={14} />}
                      {progressVal}% {progressVal >= 100 ? 'Completed' : 'Done'}
                    </span>
                  </div>

                  {/* Animated Visual Progress Bar */}
                  <div style={{ height: '9px', background: 'rgba(0,0,0,0.06)', borderRadius: '99px', overflow: 'hidden', marginBottom: '0.85rem' }}>
                    <div style={{
                      height: '100%',
                      width: `${progressVal}%`,
                      background: progressVal >= 100
                        ? 'linear-gradient(90deg, #10b981, #2ebd7f)'
                        : 'linear-gradient(90deg, #6777ef, #8b5cf6)',
                      borderRadius: '99px',
                      transition: 'width 0.3s ease',
                    }} />
                  </div>

                  {/* Custom Range Slider */}
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={progressVal}
                    onChange={e => setProgressVal(Number(e.target.value))}
                    style={{
                      width: '100%',
                      accentColor: progressVal >= 100 ? 'var(--success)' : 'var(--primary-accent)',
                      cursor: 'pointer',
                      marginBottom: '0.75rem',
                    }}
                  />

                  {/* Quick Preset Buttons */}
                  <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'space-between' }}>
                    {[
                      { val: 0, label: '0%' },
                      { val: 25, label: '25%' },
                      { val: 50, label: '50%' },
                      { val: 75, label: '75%' },
                      { val: 100, label: '100% ✓' },
                    ].map(btn => (
                      <button
                        type="button"
                        key={btn.val}
                        onClick={() => setProgressVal(btn.val)}
                        style={{
                          flex: 1, padding: '0.35rem 0',
                          background: progressVal === btn.val
                            ? (btn.val === 100 ? 'var(--success)' : 'var(--primary-accent)')
                            : 'var(--bg-primary)',
                          color: progressVal === btn.val ? 'white' : 'var(--text-secondary)',
                          border: `1px solid ${progressVal === btn.val ? 'transparent' : 'var(--border-color)'}`,
                          borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700,
                          cursor: 'pointer', transition: 'all 0.15s ease'
                        }}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Completion Notes / Learning Summary */}
                <div>
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                    <span>Learning Summary & Notes</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 500, textTransform: 'none', color: 'var(--text-secondary)' }}>Optional</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Summarize key skills learned, assignments completed, or link to project / certificate..."
                    value={progressNotes}
                    onChange={e => setProgressNotes(e.target.value)}
                    className="form-control"
                    style={{
                      width: '100%', borderRadius: '10px', padding: '0.75rem',
                      fontSize: '0.85rem', resize: 'vertical', lineHeight: 1.5,
                      border: '1px solid var(--border-color)', background: 'var(--bg-primary)'
                    }}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="modal-footer" style={{ padding: '1.1rem 1.5rem', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setProgressModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ padding: '0.6rem 1.25rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingProgress}
                  className="btn btn-primary"
                  style={{
                    padding: '0.6rem 1.5rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    background: progressVal >= 100 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : undefined,
                    border: progressVal >= 100 ? 'none' : undefined,
                    boxShadow: progressVal >= 100 ? '0 4px 12px rgba(16,185,129,0.3)' : undefined
                  }}
                >
                  {updatingProgress ? (
                    'Saving...'
                  ) : progressVal >= 100 ? (
                    <><CheckCircle size={16} /> Complete Course</>
                  ) : (
                    <><Award size={16} /> Save Progress ({progressVal}%)</>
                  )}
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

export default Training;
