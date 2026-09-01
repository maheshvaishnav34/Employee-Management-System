import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Trophy, Star, Award, Zap, Plus, X, AlertCircle, CheckCircle } from 'lucide-react';
import { SkeletonBlock, SkeletonCircle } from '../components/Skeleton';

// Define Users2 FIRST before BADGE_ICONS uses it
const Users2 = ({ size, color }) => <span style={{ fontSize: size || 16, color }}>👥</span>;

const BADGE_ICONS = {
  'Star Performer':    { icon: Star,   color: '#ffb119', bg: 'rgba(255,177,25,0.12)' },
  'Team Player':       { icon: Users2, color: '#2ebd7f', bg: 'rgba(46,189,127,0.12)' },
  'Innovation Award':  { icon: Zap,    color: '#6777ef', bg: 'rgba(103,119,239,0.12)' },
  'Customer Champion': { icon: Award,  color: '#3ab7e8', bg: 'rgba(58,183,232,0.12)' },
  'Leadership':        { icon: Trophy, color: '#d946ef', bg: 'rgba(217,70,239,0.12)' },
  'Punctuality':       { icon: Award,  color: '#2ebd7f', bg: 'rgba(46,189,127,0.12)' },
};

const Rewards = () => {
  const { user } = useAuth();
  const [myRewards, setMyRewards] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [allRewards, setAllRewards] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPoints, setTotalPoints] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    employee: '', type: 'Points', title: '', description: '', points: 0, badge: '',
  });

  const isHRPlus = ['admin', 'hr'].includes(user?.role);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [myRes, lbRes] = await Promise.all([
        api.get('/rewards/my'),
        api.get('/rewards/leaderboard'),
      ]);
      if (myRes.success) { setMyRewards(myRes.rewards); setTotalPoints(myRes.totalPoints); }
      if (lbRes.success) setLeaderboard(lbRes.leaderboard);

      if (isHRPlus) {
        const allRes = await api.get('/rewards');
        if (allRes.success) setAllRewards(allRes.rewards);
        const empRes = await api.get('/employees');
        if (empRes.success) setEmployees(empRes.employees);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleGiveReward = async (e) => {
    e.preventDefault();
    if (!form.employee || !form.title) { setFormError('Employee and title are required'); return; }
    try {
      setFormError('');
      const res = await api.post('/rewards', { ...form, points: Number(form.points) });
      if (res.success) {
        setSuccess('Reward given successfully!');
        setModalOpen(false);
        setForm({ employee: '', type: 'Points', title: '', description: '', points: 0, badge: '' });
        fetchData();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (e) { setFormError(e.message); }
  };

  const RANK_COLORS = ['#ffb119', '#94a3b8', '#cd7f32', 'var(--text-secondary)', 'var(--text-secondary)'];

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '14px',
          background: 'linear-gradient(135deg, #ffb119 0%, #d97706 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 15px rgba(255,177,25,0.35)',
        }}>
          <Trophy size={22} color="white" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Employee Rewards</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            Recognition, badges, and points leaderboard
          </p>
        </div>
        {isHRPlus && (
          <button onClick={() => setModalOpen(true)} className="btn btn-primary" style={{ marginLeft: 'auto', background: 'linear-gradient(135deg,#ffb119,#d97706)' }}>
            <Plus size={18} /> Give Reward
          </button>
        )}
      </div>

      {success && (
        <div style={{ padding: '0.75rem 1rem', background: 'var(--success-bg)', color: 'var(--success)', borderRadius: '10px', marginBottom: '1rem', display: 'flex', gap: '0.5rem', fontWeight: 600 }}>
          <CheckCircle size={16} /> {success}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }} className="two-col-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card" style={{ padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <SkeletonBlock height="48px" width="120px" borderRadius="12px" style={{ margin: '0 auto' }} />
              <SkeletonBlock height="14px" width="60%" />
              <SkeletonBlock height="11px" width="80%" />
            </div>
            <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <SkeletonBlock height="16px" width="40%" />
              {[0,1,2,3].map(i => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.7rem 1rem', background: 'var(--bg-primary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <SkeletonBlock width="36px" height="36px" borderRadius="10px" />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <SkeletonBlock height="13px" width="70%" />
                    <SkeletonBlock height="10px" width="50%" />
                  </div>
                  <SkeletonBlock width="50px" height="14px" />
                </div>
              ))}
            </div>
          </div>
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <SkeletonBlock height="16px" width="40%" />
            {[0,1,2,3,4].map(i => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.75rem 1rem', background: 'var(--bg-primary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <SkeletonBlock width="32px" height="14px" />
                <SkeletonCircle size="36px" />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <SkeletonBlock height="13px" width="60%" />
                  <SkeletonBlock height="10px" width="45%" />
                </div>
                <SkeletonBlock width="55px" height="16px" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }} className="two-col-grid">

          {/* Left — My Rewards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Points Summary */}
            <div className="card" style={{ background: 'linear-gradient(135deg, rgba(255,177,25,0.08) 0%, rgba(103,119,239,0.08) 100%)', border: '1px solid rgba(255,177,25,0.2)', textAlign: 'center', padding: '2rem' }}>
              <div style={{ fontSize: '3rem', fontWeight: 900, color: '#ffb119', lineHeight: 1 }}>{totalPoints}</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Total Reward Points</div>
              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '1rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <span>🏅 {myRewards.filter(r => r.type === 'Badge').length} Badges</span>
                <span>🎖 {myRewards.filter(r => r.type === 'Employee of Month').length} EOM Awards</span>
                <span>⭐ {myRewards.length} Total Rewards</span>
              </div>
            </div>

            {/* My Reward History */}
            <div className="card">
              <span className="chart-title" style={{ marginBottom: '1rem', display: 'block' }}>My Rewards History</span>
              {myRewards.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  No rewards yet. Keep up the great work! 🌟
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {myRewards.map(reward => (
                    <div key={reward._id} style={{
                      display: 'flex', alignItems: 'center', gap: '0.85rem',
                      padding: '0.7rem 1rem', background: 'var(--bg-primary)',
                      borderRadius: '10px', border: '1px solid var(--border-color)',
                    }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                        background: reward.type === 'Employee of Month' ? 'rgba(255,177,25,0.15)' : 'rgba(103,119,239,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
                      }}>
                        {reward.type === 'Badge' ? '🏅' : reward.type === 'Employee of Month' ? '🏆' : '⭐'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: '0.9rem', display: 'block' }}>{reward.title}</strong>
                        {reward.description && <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{reward.description}</span>}
                      </div>
                      {reward.points > 0 && (
                        <span style={{ fontWeight: 800, color: '#ffb119', fontSize: '0.9rem' }}>+{reward.points} pts</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right — Leaderboard */}
          <div className="card">
            <span className="chart-title" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Trophy size={16} color="#ffb119" /> Reward Leaderboard
            </span>
            {leaderboard.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No reward data yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {leaderboard.map((entry, idx) => (
                  <div key={entry._id} style={{
                    display: 'flex', alignItems: 'center', gap: '0.85rem',
                    padding: '0.75rem 1rem', background: idx < 3 ? `rgba(255,177,25,${0.08 - idx * 0.02})` : 'var(--bg-primary)',
                    borderRadius: '10px', border: idx < 3 ? '1px solid rgba(255,177,25,0.2)' : '1px solid var(--border-color)',
                  }}>
                    <div style={{ width: '32px', textAlign: 'center', fontSize: idx < 3 ? '1.2rem' : '0.85rem', fontWeight: 800, color: RANK_COLORS[idx] }}>
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                    </div>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: `linear-gradient(135deg,#6777ef,#3f51b5)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.8rem', fontWeight: 800, color: '#fff', flexShrink: 0,
                    }}>
                      {entry.employee?.firstName?.[0]}{entry.employee?.lastName?.[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: '0.9rem', display: 'block' }}>{entry.employee?.firstName} {entry.employee?.lastName}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{entry.employee?.designation} · {entry.count} rewards</span>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: '#ffb119' }}>{entry.totalPoints} pts</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Give Reward Modal */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Give Reward</h3>
              <button className="modal-close-btn" onClick={() => setModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleGiveReward}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                {formError && <div className="alert alert-danger" style={{ display: 'flex', gap: '0.5rem' }}><AlertCircle size={16} /> {formError}</div>}
                <div className="form-group">
                  <label>Employee *</label>
                  <select className="form-control" value={form.employee} onChange={e => setForm({ ...form, employee: e.target.value })} required>
                    <option value="">Select Employee</option>
                    {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName} ({emp.employeeId})</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Reward Type</label>
                    <select className="form-control" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                      {['Points', 'Badge', 'Employee of Month', 'Certificate'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Points</label>
                    <input type="number" className="form-control" min="0" value={form.points}
                      onChange={e => setForm({ ...form, points: e.target.value })} placeholder="0" />
                  </div>
                </div>
                {form.type === 'Badge' && (
                  <div className="form-group">
                    <label>Badge Type</label>
                    <select className="form-control" value={form.badge} onChange={e => setForm({ ...form, badge: e.target.value })}>
                      <option value="">Select Badge</option>
                      {['Star Performer', 'Team Player', 'Innovation Award', 'Customer Champion', 'Leadership', 'Punctuality'].map(b => <option key={b}>{b}</option>)}
                    </select>
                  </div>
                )}
                <div className="form-group">
                  <label>Title *</label>
                  <input type="text" className="form-control" placeholder="e.g. Best Q2 Performance" value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea rows="2" className="form-control" style={{ resize: 'none' }} placeholder="Reason for this reward..."
                    value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: 'linear-gradient(135deg,#ffb119,#d97706)' }}>Give Reward 🏆</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rewards;
