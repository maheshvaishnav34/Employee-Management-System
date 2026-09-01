import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Sparkles, HeartHandshake, HelpCircle, Loader2 } from 'lucide-react';

const MoodPulseWidget = () => {
  const [loggedToday, setLoggedToday] = useState(false);
  const [selectedMood, setSelectedMood] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [serverMood, setServerMood] = useState('');
  const [error, setError] = useState('');

  const moodConfig = {
    excellent: { emoji: '🌟', label: 'Excellent', color: '#10b981', bg: 'rgba(16,185,129,0.1)', quote: "Awesome! Let's keep this momentum going and crush those goals! 🚀" },
    good: { emoji: '😊', label: 'Good', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', quote: "Fantastic! Wishing you a productive and smooth workday! ✨" },
    neutral: { emoji: '😐', label: 'Neutral', color: '#6b7280', bg: 'rgba(107,114,128,0.1)', quote: "Steady as she goes. Remember to take small walks and stay hydrated! 💧" },
    tired: { emoji: '🥱', label: 'Tired', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', quote: "Remember to take breaks. A short 5-minute screen rest does wonders! ☕" },
    stressed: { emoji: '😰', label: 'Stressed', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', quote: "Deep breath. Prioritize one thing at a time or reach out for support. We've got your back! ❤️" }
  };

  const fetchTodayMood = async () => {
    try {
      setLoading(true);
      const res = await api.get('/engagement/mood/today');
      if (res.success) {
        setLoggedToday(res.loggedToday);
        if (res.loggedToday) {
          setServerMood(res.mood);
        }
      }
    } catch (err) {
      console.error('Error checking today mood:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayMood();
  }, []);

  const handleSubmit = async () => {
    if (!selectedMood) return;
    try {
      setSubmitting(true);
      setError('');
      const res = await api.post('/engagement/mood', { mood: selectedMood, notes });
      if (res.success) {
        setLoggedToday(true);
        setServerMood(selectedMood);
      } else {
        setError(res.message || 'Failed to submit mood');
      }
    } catch (err) {
      setError(err.message || 'Failed to submit mood');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '180px' }}>
        <Loader2 className="spinner" size={24} style={{ color: 'var(--primary-accent)' }} />
      </div>
    );
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: '180px', position: 'relative', overflow: 'hidden' }}>
      {/* Decorative gradient overlay */}
      <div style={{
        position: 'absolute', top: 0, right: 0, width: '150px', height: '150px',
        background: 'radial-gradient(circle, rgba(103,119,239,0.06) 0%, rgba(255,255,255,0) 70%)',
        zIndex: 0, pointerEvents: 'none'
      }} />

      <div style={{ zIndex: 1 }}>
        <span className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem', margin: 0 }}>
          <HeartHandshake size={18} style={{ color: 'var(--success)' }} />
          Daily Pulse Check
        </span>

        {loggedToday ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '1rem 0' }}>
            <div style={{
              fontSize: '2.5rem', marginBottom: '0.5rem',
              animation: 'bounce 2s infinite'
            }}>
              {moodConfig[serverMood]?.emoji || '😊'}
            </div>
            <h4 style={{ fontWeight: 700, margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>
              Morale Logged: {moodConfig[serverMood]?.label || serverMood}
            </h4>
            <p style={{
              fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: '380px', lineHeight: 1.4, margin: '0.25rem 0 0 0',
              padding: '0.5rem 0.75rem', borderRadius: '8px', background: moodConfig[serverMood]?.bg || 'rgba(0,0,0,0.02)'
            }}>
              {moodConfig[serverMood]?.quote || "Keep up the excellent work!"}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
              How is your work day going today? Share your pulse with HR anonymously.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.4rem' }}>
              {Object.keys(moodConfig).map((key) => {
                const isSelected = selectedMood === key;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedMood(key)}
                    style={{
                      border: isSelected ? `2.5px solid ${moodConfig[key].color}` : '1px solid var(--border-color)',
                      borderRadius: '12px',
                      padding: '0.6rem 0.25rem',
                      background: isSelected ? moodConfig[key].bg : 'var(--bg-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.3rem',
                      transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                      transform: isSelected ? 'scale(1.05)' : 'none',
                    }}
                    title={moodConfig[key].label}
                  >
                    <span style={{ fontSize: '1.4rem' }}>{moodConfig[key].emoji}</span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 600, color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                      {moodConfig[key].label}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedMood && (
              <div style={{
                display: 'flex', flexDirection: 'column', gap: '0.5rem',
                animation: 'slideDownFade 0.3s ease-out'
              }}>
                <textarea
                  placeholder="Optional: Any notes on what is influencing your mood today?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={200}
                  style={{
                    width: '100%', minHeight: '44px', padding: '0.45rem 0.6rem',
                    border: '1px solid var(--border-color)', borderRadius: '8px',
                    fontSize: '0.78rem', background: 'var(--bg-primary)', resize: 'none',
                    color: 'var(--text-primary)', outline: 'none'
                  }}
                />
                
                {error && <span style={{ fontSize: '0.72rem', color: 'var(--danger)' }}>{error}</span>}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button
                    onClick={() => setSelectedMood(null)}
                    className="btn btn-secondary"
                    style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="btn btn-primary"
                    style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="spinner" size={12} /> Saving...
                      </>
                    ) : 'Log Mood'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MoodPulseWidget;
