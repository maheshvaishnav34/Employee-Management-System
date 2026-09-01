import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { BarChart3, Plus, Smile, MessageSquare, Check, X, ShieldAlert, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

const AdminEngagementAnalytics = () => {
  const [moodData, setMoodData] = useState(null);
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // New poll form fields
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [closeOthers, setCloseOthers] = useState(true);
  const [submittingPoll, setSubmittingPoll] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Tab state: 'mood' or 'polls'
  const [activeTab, setActiveTab] = useState('mood');

  const fetchData = async () => {
    try {
      setLoading(true);
      const moodRes = await api.get('/engagement/mood/analytics');
      if (moodRes.success) {
        setMoodData(moodRes.analytics);
      }
      const pollRes = await api.get('/engagement/polls/all');
      if (pollRes.success) {
        setPolls(pollRes.polls);
      }
    } catch (e) {
      console.error('Error fetching engagement analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddOptionField = () => {
    if (options.length < 5) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOptionField = (idx) => {
    if (options.length > 2) {
      const updated = options.filter((_, i) => i !== idx);
      setOptions(updated);
    }
  };

  const handleOptionChange = (value, idx) => {
    const updated = [...options];
    updated[idx] = value;
    setOptions(updated);
  };

  const handleCreatePollSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');

    // Validations
    if (!question.trim()) {
      setFormError('Question is required');
      return;
    }
    const filteredOptions = options.filter(o => o.trim() !== '');
    if (filteredOptions.length < 2) {
      setFormError('At least 2 non-empty options are required');
      return;
    }

    try {
      setSubmittingPoll(true);
      const res = await api.post('/engagement/polls', {
        question,
        options: filteredOptions,
        closeOthers
      });

      if (res.success) {
        setSuccessMsg('Poll successfully created & launched!');
        setQuestion('');
        setOptions(['', '']);
        setShowCreateForm(false);
        // Refresh polls list
        fetchData();
      } else {
        setFormError(res.message || 'Failed to create poll');
      }
    } catch (err) {
      setFormError(err.message || 'Failed to create poll');
    } finally {
      setSubmittingPoll(false);
    }
  };

  const handleTogglePollStatus = async (id) => {
    try {
      const res = await api.put(`/engagement/polls/${id}/toggle`);
      if (res.success) {
        fetchData();
      }
    } catch (err) {
      console.error('Failed to toggle poll status:', err);
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '260px' }}>
        <Loader2 className="spinner" size={24} style={{ color: 'var(--primary-accent)' }} />
      </div>
    );
  }

  // Calculate morale metrics
  const counts = moodData?.counts || { excellent: 0, good: 0, neutral: 0, tired: 0, stressed: 0 };
  const totalMoodLogs = moodData?.totalLogs || 0;
  const positiveCount = counts.excellent + counts.good;
  const positivePercentage = totalMoodLogs > 0 ? Math.round((positiveCount / totalMoodLogs) * 100) : 0;

  const moodColors = {
    excellent: '#10b981',
    good: '#3b82f6',
    neutral: '#6b7280',
    tired: '#f59e0b',
    stressed: '#ef4444'
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: '320px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <span className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
          <Smile size={18} style={{ color: 'var(--primary-accent)' }} />
          Workplace Engagement & Sentiment
        </span>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.03)', borderRadius: '8px', padding: '2px' }}>
          <button
            onClick={() => setActiveTab('mood')}
            style={{
              border: 'none', background: activeTab === 'mood' ? 'var(--bg-secondary)' : 'transparent',
              color: activeTab === 'mood' ? 'var(--primary-accent)' : 'var(--text-secondary)',
              fontSize: '0.74rem', fontWeight: 700, padding: '0.25rem 0.6rem', borderRadius: '6px', cursor: 'pointer',
              boxShadow: activeTab === 'mood' ? 'var(--shadow-sm)' : 'none', transition: 'all 0.2s'
            }}
          >
            Morale Tracker ({positivePercentage}% Positive)
          </button>
          <button
            onClick={() => setActiveTab('polls')}
            style={{
              border: 'none', background: activeTab === 'polls' ? 'var(--bg-secondary)' : 'transparent',
              color: activeTab === 'polls' ? 'var(--primary-accent)' : 'var(--text-secondary)',
              fontSize: '0.74rem', fontWeight: 700, padding: '0.25rem 0.6rem', borderRadius: '6px', cursor: 'pointer',
              boxShadow: activeTab === 'polls' ? 'var(--shadow-sm)' : 'none', transition: 'all 0.2s'
            }}
          >
            Feedback Polls ({polls.length})
          </button>
        </div>
      </div>

      {/* ═══════════════ MORALE TAB CONTENT ═══════════════ */}
      {activeTab === 'mood' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Morale Stats Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '1.25rem', alignItems: 'center' }}>
            {/* Morale Score */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '1.25rem', border: '1px solid var(--border-color)', borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(16,185,129,0.04) 0%, rgba(59,130,246,0.02) 100%)',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>WORKPLACE MORALE</span>
              <strong style={{ fontSize: '2.5rem', color: '#10b981', margin: '0.2rem 0' }}>{positivePercentage}%</strong>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Positive Sentiment</span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '0.4rem', opacity: 0.7 }}>
                Based on {totalMoodLogs} check-ins (last 30 days)
              </span>
            </div>

            {/* Distribution Bar chart */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Mood Distribution Breakdown</span>
              {Object.keys(counts).map(key => {
                const count = counts[key];
                const pct = totalMoodLogs > 0 ? Math.round((count / totalMoodLogs) * 100) : 0;
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
                    <span style={{ width: '68px', textTransform: 'capitalize', color: 'var(--text-secondary)', fontWeight: 500 }}>{key}</span>
                    <div style={{ flex: 1, height: '8px', background: 'rgba(0,0,0,0.04)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: moodColors[key], borderRadius: '4px' }} />
                    </div>
                    <span style={{ width: '42px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Employee Feedback Comments Feed */}
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.5rem' }}>
              <MessageSquare size={14} style={{ color: 'var(--info)' }} />
              Morale Feedback Feed (Anonymized by Department)
            </span>

            {(!moodData?.notesFeed || moodData.notesFeed.length === 0) ? (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
                No feedback comments submitted in the last 30 days.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '160px', overflowY: 'auto' }}>
                {moodData.notesFeed.map(feed => (
                  <div key={feed._id} style={{
                    padding: '0.55rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: '8px',
                    background: 'var(--bg-primary)', fontSize: '0.78rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--primary-accent)', fontSize: '0.72rem' }}>
                        Dept: {feed.department}
                      </span>
                      <span style={{
                        fontSize: '0.68rem', fontWeight: 600, padding: '0.05rem 0.35rem', borderRadius: '4px',
                        background: moodColors[feed.mood] + '15', color: moodColors[feed.mood]
                      }}>
                        {feed.mood}
                      </span>
                    </div>
                    <p style={{ margin: 0, color: 'var(--text-primary)', fontStyle: 'italic', lineHeight: 1.35 }}>
                      "{feed.notes}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════ POLLS TAB CONTENT ═══════════════ */}
      {activeTab === 'polls' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Poll Operations Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Engagement Surveys</span>
            <button
              onClick={() => {
                setShowCreateForm(!showCreateForm);
                setFormError('');
                setSuccessMsg('');
              }}
              className="btn btn-primary"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
            >
              <Plus size={12} /> {showCreateForm ? 'Cancel' : 'Launch Poll'}
            </button>
          </div>

          {/* Form to Create/Launch Poll */}
          {showCreateForm && (
            <form onSubmit={handleCreatePollSubmit} style={{
              padding: '0.85rem', border: '1px solid var(--primary-accent)', borderRadius: '12px',
              background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', gap: '0.65rem',
              animation: 'slideDownFade 0.3s ease-out'
            }}>
              <h5 style={{ margin: 0, fontWeight: 700, fontSize: '0.82rem', color: 'var(--primary-accent)' }}>
                New Poll Specification
              </h5>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>QUESTION</label>
                <input
                  type="text"
                  placeholder="e.g. Rate your satisfaction with remote setup?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  style={{
                    padding: '0.45rem 0.6rem', fontSize: '0.78rem', borderRadius: '8px',
                    border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none'
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>OPTIONS</label>
                {options.map((opt, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder={`Option ${idx + 1}`}
                      value={opt}
                      onChange={(e) => handleOptionChange(e.target.value, idx)}
                      style={{
                        flex: 1, padding: '0.4rem 0.5rem', fontSize: '0.78rem', borderRadius: '6px',
                        border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none'
                      }}
                      required={idx < 2}
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOptionField(idx)}
                        style={{ border: 'none', background: 'transparent', color: 'var(--danger)', cursor: 'pointer', padding: '0.2rem' }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
                
                {options.length < 5 && (
                  <button
                    type="button"
                    onClick={handleAddOptionField}
                    style={{
                      border: '1px dashed var(--border-color)', background: 'transparent', color: 'var(--text-secondary)',
                      fontSize: '0.72rem', padding: '0.3rem', borderRadius: '6px', cursor: 'pointer', textAlign: 'center', marginTop: '0.1rem'
                    }}
                  >
                    + Add Selection Option
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                <input
                  type="checkbox"
                  id="closeOthersCheck"
                  checked={closeOthers}
                  onChange={(e) => setCloseOthers(e.target.checked)}
                />
                <label htmlFor="closeOthersCheck" style={{ color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  Auto-close all other active polls
                </label>
              </div>

              {formError && <span style={{ fontSize: '0.72rem', color: 'var(--danger)' }}>{formError}</span>}

              <button
                type="submit"
                className="btn btn-primary"
                style={{ padding: '0.45rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}
                disabled={submittingPoll}
              >
                {submittingPoll ? <Loader2 className="spinner" size={14} /> : 'Deploy and Launch Poll'}
              </button>
            </form>
          )}

          {successMsg && (
            <div style={{
              padding: '0.5rem 0.75rem', background: 'rgba(16,185,129,0.1)', color: '#10b981',
              borderRadius: '8px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem'
            }}>
              <Check size={14} /> {successMsg}
            </div>
          )}

          {/* Polls History Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '240px', overflowY: 'auto' }}>
            {polls.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>
                No surveys deployed yet.
              </p>
            ) : (
              polls.map(p => (
                <div key={p._id} style={{
                  padding: '0.85rem', border: '1px solid var(--border-color)', borderRadius: '10px',
                  background: 'var(--bg-primary)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <h5 style={{ margin: 0, fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)', maxWidth: '75%', lineHeight: 1.3 }}>
                      {p.question}
                    </h5>
                    
                    {/* Status badge & toggle button */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span className={`badge badge-${p.isActive ? 'success' : 'secondary'}`} style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
                        {p.isActive ? 'Active' : 'Closed'}
                      </span>
                      <button
                        onClick={() => handleTogglePollStatus(p._id)}
                        style={{
                          border: '1px solid var(--border-color)', borderRadius: '5px', background: 'var(--bg-secondary)',
                          color: p.isActive ? 'var(--danger)' : 'var(--success)', cursor: 'pointer', fontSize: '0.68rem',
                          fontWeight: 700, padding: '0.15rem 0.35rem', transition: 'all 0.1s'
                        }}
                      >
                        {p.isActive ? 'Close' : 'Reopen'}
                      </button>
                    </div>
                  </div>

                  {/* Poll voting option results */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
                    {p.results.map((r, i) => (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                          <span>{r.option}</span>
                          <strong style={{ color: 'var(--text-primary)' }}>{r.percentage}% ({r.count})</strong>
                        </div>
                        <div style={{ width: '100%', height: '5px', background: 'rgba(0,0,0,0.03)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${r.percentage}%`, height: '100%', background: '#6777ef', borderRadius: '3px' }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '0.6rem', textAlign: 'right' }}>
                    Total responses: <strong>{p.totalVotes}</strong>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEngagementAnalytics;
