import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { BarChart3, CheckCircle2, Loader2, Vote } from 'lucide-react';

const DashboardPollWidget = () => {
  const [poll, setPoll] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchActivePoll = async () => {
    try {
      setLoading(true);
      const res = await api.get('/engagement/polls/active');
      if (res.success) {
        setPoll(res.poll);
      }
    } catch (err) {
      console.error('Error fetching active poll:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivePoll();
  }, []);

  const handleVoteSubmit = async () => {
    if (selectedOption === null || !poll) return;
    try {
      setSubmitting(true);
      setError('');
      const res = await api.post(`/engagement/polls/${poll._id}/vote`, { optionIndex: selectedOption });
      if (res.success) {
        setPoll(res.poll);
      } else {
        setError(res.message || 'Failed to submit vote');
      }
    } catch (err) {
      setError(err.message || 'Failed to submit vote');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
        <Loader2 className="spinner" size={24} style={{ color: 'var(--primary-accent)' }} />
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '200px', textAlign: 'center', padding: '1.5rem' }}>
        <Vote size={32} style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', opacity: 0.5 }} />
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>No Active Polls</span>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', maxWidth: '240px' }}>
          Check back later for company surveys and feedback polls!
        </p>
      </div>
    );
  }

  const colors = ['#6777ef', '#2ebd7f', '#f59e0b', '#ef4444', '#a855f7'];

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: '200px', position: 'relative' }}>
      <span className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.85rem', margin: 0 }}>
        <BarChart3 size={18} style={{ color: 'var(--primary-accent)' }} />
        Active Workspace Poll
      </span>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
        <div>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 700, margin: '0 0 0.85rem 0', color: 'var(--text-primary)', lineHeight: 1.4 }}>
            {poll.question}
          </h4>

          {poll.hasVoted ? (
            /* Results Mode */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {poll.results.map((res, idx) => {
                const isMyChoice = poll.votedOptionIndex === idx;
                const barColor = colors[idx % colors.length];

                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                      <span style={{
                        fontWeight: isMyChoice ? 700 : 500,
                        color: isMyChoice ? 'var(--text-primary)' : 'var(--text-secondary)',
                        display: 'flex', alignItems: 'center', gap: '0.25rem'
                      }}>
                        {res.option}
                        {isMyChoice && <CheckCircle2 size={12} style={{ color: 'var(--success)' }} />}
                      </span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {res.percentage}% <span style={{ fontWeight: 400, fontSize: '0.7rem', color: 'var(--text-secondary)' }}>({res.count})</span>
                      </span>
                    </div>
                    {/* Progress Bar Container */}
                    <div style={{
                      width: '100%', height: '8px', background: 'rgba(0,0,0,0.04)', borderRadius: '4px',
                      overflow: 'hidden', position: 'relative'
                    }}>
                      <div style={{
                        width: `${res.percentage}%`, height: '100%', background: barColor, borderRadius: '4px',
                        transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Voting Mode */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {poll.options.map((opt, idx) => {
                const isSelected = selectedOption === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedOption(idx)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.55rem 0.75rem',
                      border: isSelected ? '2px solid var(--primary-accent)' : '1px solid var(--border-color)',
                      borderRadius: '10px',
                      background: isSelected ? 'rgba(103,119,239,0.06)' : 'var(--bg-primary)',
                      fontSize: '0.78rem',
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? 'var(--primary-accent)' : 'var(--text-primary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{
                        width: '14px', height: '14px', borderRadius: '50%',
                        border: '1px solid var(--border-color)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'var(--bg-primary)'
                      }}>
                        {isSelected && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary-accent)' }} />}
                      </div>
                      {opt}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info/controls */}
        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            {poll.totalVotes} {poll.totalVotes === 1 ? 'vote' : 'votes'} cast
          </span>

          {!poll.hasVoted && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {error && <span style={{ fontSize: '0.72rem', color: 'var(--danger)' }}>{error}</span>}
              <button
                onClick={handleVoteSubmit}
                disabled={selectedOption === null || submitting}
                className="btn btn-primary"
                style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="spinner" size={12} /> Voting...
                  </>
                ) : 'Vote'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPollWidget;
