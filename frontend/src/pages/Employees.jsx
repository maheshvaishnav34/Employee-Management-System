import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  Plus, Edit2, Trash2, Eye, Search, X, AlertCircle, Save,
  BookOpen, Brain, CheckCircle, ArrowRight, XCircle, RefreshCw,
  Building2, Users, Check, ChevronRight, ChevronLeft
} from 'lucide-react';

// ==========================================
// SKILL MATRIX TAB CONSTANTS & SUB-COMPONENTS
// ==========================================
const SKILLS_LEVEL_COLORS = { Beginner: 'var(--success)', Intermediate: 'var(--warning)', Expert: 'var(--danger)' };
const SKILLS_LEVEL_PCT   = { Beginner: 33, Intermediate: 66, Expert: 100 };

const SKILLS_LIST = [
  'JavaScript','React','Node.js','Python','MongoDB','SQL','TypeScript',
  'AWS','Docker','Kubernetes','Git','Agile','Communication','Leadership',
  'Project Management','Java','C#','.NET','Figma','Excel','Angular','Vue.js'
];

const SkillsAvatar = ({ name }) => {
  const initials = name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';
  return (
    <div style={{
      width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: '0.8rem'
    }}>{initials}</div>
  );
};

const SkillsLevelBar = ({ level }) => (
  <div>
    <div style={{ height: 5, background: 'var(--border-color)', borderRadius: '99px', overflow: 'hidden', marginTop: '3px' }}>
      <div style={{ width: `${SKILLS_LEVEL_PCT[level] || 0}%`, height: '100%', background: SKILLS_LEVEL_COLORS[level], borderRadius: '99px', transition: 'width 0.5s ease' }} />
    </div>
  </div>
);

const SkillMatrixTab = ({ showToast }) => {
  const { user } = useAuth();
  const [teamSkills, setTeamSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('All');
  const [editEntry, setEditEntry] = useState(null);
  const [editSkills, setEditSkills] = useState([]);
  const [editRecs, setEditRecs] = useState([]);
  const [newSkill, setNewSkill] = useState({ skillName: '', level: 'Beginner' });
  const [newRec, setNewRec] = useState('');
  const [saving, setSaving] = useState(false);
  const [skillSuggest, setSkillSuggest] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/skills/team');
      if (res.success) setTeamSkills(res.teamSkills || []);
    } catch (e) { showToast(e.message || 'Load failed', false); }
    finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const openEdit = (entry) => {
    setEditEntry(entry);
    setEditSkills(entry.skills ? [...entry.skills] : []);
    setEditRecs(entry.trainingRecommendations ? [...entry.trainingRecommendations] : []);
  };

  const addSkill = () => {
    if (!newSkill.skillName.trim()) return;
    if (editSkills.find(s => s.skillName.toLowerCase() === newSkill.skillName.toLowerCase()))
      return showToast('Skill already listed', false);
    setEditSkills(prev => [...prev, { skillName: newSkill.skillName.trim(), level: newSkill.level }]);
    setNewSkill({ skillName: '', level: 'Beginner' });
    setSkillSuggest(false);
  };

  const save = async () => {
    if (!editEntry) return;
    setSaving(true);
    try {
      const res = await api.put(`/skills/${editEntry.employee._id}`, { skills: editSkills, trainingRecommendations: editRecs });
      if (res.success) { showToast('Skill matrix saved!'); setEditEntry(null); load(); }
      else showToast(res.message || 'Save failed', false);
    } catch (e) { showToast(e.message || 'Server error', false); }
    finally { setSaving(false); }
  };

  const filtered = teamSkills.filter(entry => {
    const name = `${entry.employee?.firstName} ${entry.employee?.lastName}`.toLowerCase();
    if (search && !name.includes(search.toLowerCase())) return false;
    if (filterLevel !== 'All' && !entry.skills?.some(s => s.level === filterLevel)) return false;
    return true;
  });

  const teamCoverage = [...new Set(teamSkills.flatMap(e => e.skills?.map(s => s.skillName) || []))]
    .map(skill => ({ skill, count: teamSkills.filter(e => e.skills?.some(s => s.skillName === skill)).length }))
    .sort((a, b) => b.count - a.count).slice(0, 10);

  return (
    <div style={{ animation: 'fadeIn 0.4s ease both' }}>
      {/* Edit Modal */}
      {editEntry && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '580px', maxHeight: '92vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <SkillsAvatar name={`${editEntry.employee?.firstName} ${editEntry.employee?.lastName}`} />
                <div>
                  <h3 className="modal-title" style={{ margin: 0 }}>{editEntry.employee?.firstName} {editEntry.employee?.lastName}</h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{editEntry.employee?.designation}</p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setEditEntry(null)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Add Skill */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Add New Skill</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div style={{ position: 'relative', flex: 2 }}>
                    <input className="form-control" value={newSkill.skillName}
                      onChange={e => { setNewSkill(n => ({ ...n, skillName: e.target.value })); setSkillSuggest(true); }}
                      onFocus={() => setSkillSuggest(true)} onBlur={() => setTimeout(() => setSkillSuggest(false), 180)}
                      placeholder="e.g. React, Python..." />
                    {skillSuggest && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', boxShadow: 'var(--shadow-lg)', maxHeight: '160px', overflowY: 'auto' }}>
                        {SKILLS_LIST.filter(s => s.toLowerCase().includes(newSkill.skillName.toLowerCase())).map(s => (
                          <div key={s} onMouseDown={() => setNewSkill(n => ({ ...n, skillName: s }))}
                            style={{ padding: '0.55rem 1rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)' }}
                            onMouseEnter={e => e.target.style.background = 'var(--bg-sidebar-active)'}
                            onMouseLeave={e => e.target.style.background = 'transparent'}>{s}</div>
                        ))}
                      </div>
                    )}
                  </div>
                  <select className="form-control" value={newSkill.level} onChange={e => setNewSkill(n => ({ ...n, level: e.target.value }))} style={{ flex: 1 }}>
                    <option>Beginner</option><option>Intermediate</option><option>Expert</option>
                  </select>
                  <button className="btn btn-primary" onClick={addSkill} style={{ padding: '0 1rem' }}><Plus size={16} /></button>
                </div>
              </div>

              {/* Skills List */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Skills ({editSkills.length})</label>
                {editSkills.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic' }}>No skills added yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '220px', overflowY: 'auto' }}>
                    {editSkills.map((sk, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <span style={{ flex: 1, fontWeight: 600, fontSize: '0.88rem' }}>{sk.skillName}</span>
                        <div style={{ width: '100px' }}><SkillsLevelBar level={sk.level} /></div>
                        <select value={sk.level} onChange={e => setEditSkills(prev => prev.map((s, j) => j === i ? { ...s, level: e.target.value } : s))}
                          style={{ padding: '3px 6px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', fontSize: '0.78rem', color: SKILLS_LEVEL_COLORS[sk.level], fontWeight: 700 }}>
                          <option>Beginner</option><option>Intermediate</option><option>Expert</option>
                        </select>
                        <button onClick={() => setEditSkills(prev => prev.filter((_, j) => j !== i))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '2px' }}><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Training Recommendations */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Training Recommendations</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input className="form-control" value={newRec} onChange={e => setNewRec(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && newRec.trim()) { setEditRecs(p => [...p, newRec.trim()]); setNewRec(''); } }}
                    placeholder="e.g. Complete AWS Solutions Architect cert..." />
                  <button className="btn btn-primary" onClick={() => { if (newRec.trim()) { setEditRecs(p => [...p, newRec.trim()]); setNewRec(''); } }} style={{ padding: '0 1rem' }}><Plus size={16} /></button>
                </div>
                {editRecs.map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '0.35rem' }}>
                    <BookOpen size={14} color="var(--primary-accent)" style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: '0.83rem', color: 'var(--text-secondary)' }}>{r}</span>
                    <button onClick={() => setEditRecs(p => p.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '2px' }}><X size={13} /></button>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditEntry(null)}>Cancel</button>
              <button className="btn btn-primary btn-shimmer" onClick={save} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Save size={15} /> {saving ? 'Saving...' : 'Save Skills'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Skill Coverage */}
      {teamCoverage.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem 1.5rem' }}>
          <span className="chart-title" style={{ display: 'block', marginBottom: '0.75rem' }}>Team Skill Coverage</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {teamCoverage.map(({ skill, count }) => (
              <span key={skill} style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.25)', borderRadius: '8px', padding: '3px 10px', fontSize: '0.78rem', fontWeight: 700 }}>
                {skill} <span style={{ opacity: 0.7 }}>({count})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', color: 'var(--text-secondary)' }} />
          <input className="form-control" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee..." style={{ paddingLeft: '2.2rem', minWidth: '200px' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {['All', 'Beginner', 'Intermediate', 'Expert'].map(l => (
            <button key={l} onClick={() => setFilterLevel(l)}
              className={`btn ${filterLevel === l ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.45rem 1rem', fontSize: '0.82rem' }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Team Grid Table */}
      <div className="table-container">
        <div className="table-header-row">
          <span className="table-title">Team Skill Profiles ({filtered.length})</span>
        </div>
        <div className="data-table-wrapper">
          {loading ? (
            <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading Skill Matrix...</p>
          ) : filtered.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No team members found.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Skills</th>
                  <th>Beginner</th>
                  <th>Intermediate</th>
                  <th>Expert</th>
                  <th>Recommendations</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry, i) => {
                  const name = `${entry.employee?.firstName} ${entry.employee?.lastName}`;
                  const beg = entry.skills?.filter(s => s.level === 'Beginner').length || 0;
                  const int = entry.skills?.filter(s => s.level === 'Intermediate').length || 0;
                  const exp = entry.skills?.filter(s => s.level === 'Expert').length || 0;
                  return (
                    <tr key={i}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <SkillsAvatar name={name} />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{name}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{entry.employee?.employeeId} · {entry.employee?.designation}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', maxWidth: '220px' }}>
                          {entry.skills?.length === 0 && <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontStyle: 'italic' }}>No skills</span>}
                          {entry.skills?.slice(0, 4).map((sk, si) => (
                            <span key={si} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '1px 7px', fontSize: '0.72rem', fontWeight: 600, color: SKILLS_LEVEL_COLORS[sk.level] }}>
                              {sk.skillName}
                            </span>
                          ))}
                          {entry.skills?.length > 4 && <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>+{entry.skills.length - 4}</span>}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}><span style={{ fontWeight: 700, color: 'var(--success)' }}>{beg}</span></td>
                      <td style={{ textAlign: 'center' }}><span style={{ fontWeight: 700, color: 'var(--warning)' }}>{int}</span></td>
                      <td style={{ textAlign: 'center' }}><span style={{ fontWeight: 700, color: 'var(--danger)' }}>{exp}</span></td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', maxWidth: '200px' }}>
                        {entry.trainingRecommendations?.length > 0
                          ? <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{entry.trainingRecommendations.join(' · ')}</span>
                          : <span style={{ fontStyle: 'italic' }}>None</span>}
                      </td>
                      <td>
                        <button className="btn btn-secondary" onClick={() => openEdit(entry)}
                          style={{ padding: '0.3rem 0.8rem', fontSize: '0.78rem', fontWeight: 700 }}>Edit Skills</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// TRANSFER REQUESTS TAB SUB-COMPONENTS
// ==========================================
const transferFmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const TransferStatusBadge = ({ status }) => {
  const cls = { Pending: 'badge-pending', Approved: 'badge-present', Rejected: 'badge-absent' };
  return <span className={`badge ${cls[status] || 'badge-pending'}`}>{status}</span>;
};

const TransfersAvatar = ({ name }) => {
  const initials = name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';
  return (
    <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.72rem' }}>
      {initials}
    </div>
  );
};

const TransferRequestsTab = ({ showToast }) => {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employeeId: '', toDepartmentId: '', reason: '', effectiveDate: '' });
  const [submitting, setSubmitting] = useState(false);
  const [actionModal, setActionModal] = useState(null);
  const [actionComment, setActionComment] = useState('');
  const [filter, setFilter] = useState('All');

  const canApprove = ['admin', 'hr'].includes(user?.role);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, eRes, dRes] = await Promise.all([
        api.get('/transfers'),
        api.get('/employees'),
        api.get('/departments'),
      ]);
      if (tRes.success) setTransfers(tRes.transfers || []);
      if (eRes.success) setEmployees(eRes.employees || []);
      if (dRes.success) setDepartments(dRes.departments || []);
    } catch (e) { showToast(e.message || 'Failed to load', false); }
    finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!form.employeeId || !form.toDepartmentId || !form.reason.trim())
      return showToast('Please fill all required fields', false);
    setSubmitting(true);
    try {
      const res = await api.post('/transfers', form);
      if (res.success) { showToast('Transfer request submitted!'); setShowForm(false); setForm({ employeeId: '', toDepartmentId: '', reason: '', effectiveDate: '' }); load(); }
      else showToast(res.message || 'Failed', false);
    } catch (e) { showToast(e.message || 'Server error', false); }
    finally { setSubmitting(false); }
  };

  const processAction = async () => {
    if (!actionModal) return;
    try {
      const res = await api.put(`/transfers/${actionModal.id}/status`, { status: actionModal.status, comments: actionComment });
      if (res.success) { showToast(`Transfer ${actionModal.status.toLowerCase()}!`); load(); }
      else showToast(res.message || 'Failed', false);
    } catch (e) { showToast(e.message || 'Server error', false); }
    finally { setActionModal(null); setActionComment(''); }
  };

  const filtered = filter === 'All' ? transfers : transfers.filter(t => t.status === filter);
  const selectedEmpDept = employees.find(e => e._id === form.employeeId)?.department?._id || employees.find(e => e._id === form.employeeId)?.department;
  const availableDepts = departments.filter(d => d._id.toString() !== (selectedEmpDept?.toString ? selectedEmpDept.toString() : selectedEmpDept));

  const counts = {
    All: transfers.length,
    Pending: transfers.filter(t => t.status === 'Pending').length,
    Approved: transfers.filter(t => t.status === 'Approved').length,
    Rejected: transfers.filter(t => t.status === 'Rejected').length,
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease both' }}>
      {/* Action Modal */}
      {actionModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '440px' }}>
            <div className="modal-header">
              <h3 className="modal-title">{actionModal.status === 'Approved' ? '✅ Approve' : '❌ Reject'} Transfer</h3>
              <button className="modal-close-btn" onClick={() => setActionModal(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>Employee: <strong style={{ color: 'var(--text-primary)' }}>{actionModal.name}</strong></p>
              <div className="form-group">
                <label>Comments (optional)</label>
                <textarea className="form-control" rows={3} value={actionComment} onChange={e => setActionComment(e.target.value)} style={{ resize: 'none' }} placeholder="Add notes about this decision..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setActionModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={processAction}
                style={{ background: actionModal.status === 'Approved' ? 'var(--success)' : 'var(--danger)', borderColor: actionModal.status === 'Approved' ? 'var(--success)' : 'var(--danger)' }}>
                Confirm {actionModal.status}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Row */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginBottom: '1.25rem' }}>
        <button className="btn btn-secondary" onClick={load} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
        </button>
        <button className="btn btn-primary btn-shimmer" onClick={() => setShowForm(f => !f)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)' }}>
          <Plus size={16} /> New Request
        </button>
      </div>

      {/* New Request Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem', border: '1px solid rgba(139,92,246,0.3)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={18} color="#8b5cf6" /> New Transfer Request
          </h3>
          <div className="form-row">
            <div className="form-group">
              <label>Employee *</label>
              <select className="form-control" value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value, toDepartmentId: '' }))}>
                <option value="">Select employee...</option>
                {employees.filter(e => e.status === 'Active').map(e => (
                  <option key={e._id} value={e._id}>{e.firstName} {e.lastName} ({e.employeeId})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Transfer To Department *</label>
              <select className="form-control" value={form.toDepartmentId} onChange={e => setForm(f => ({ ...f, toDepartmentId: e.target.value }))}>
                <option value="">Select target department...</option>
                {availableDepts.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Effective Date</label>
              <input type="date" className="form-control" value={form.effectiveDate} onChange={e => setForm(f => ({ ...f, effectiveDate: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label>Reason for Transfer *</label>
            <textarea className="form-control" rows={3} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="Explain why this employee should be transferred to the new department..." style={{ resize: 'none' }} />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={submit} disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Request'}</button>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="card" style={{ padding: '0.5rem 1rem', marginBottom: '1.25rem', display: 'flex', gap: '0.25rem' }}>
        {['All', 'Pending', 'Approved', 'Rejected'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.45rem 1.1rem', fontSize: '0.82rem' }}>
            {f} {counts[f] > 0 && <span style={{ marginLeft: '4px', background: 'rgba(255,255,255,0.25)', borderRadius: '50px', padding: '0 6px', fontSize: '0.7rem' }}>{counts[f]}</span>}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="table-container">
        <div className="table-header-row">
          <span className="table-title">Transfer Records ({filtered.length})</span>
        </div>
        <div className="data-table-wrapper">
          {loading ? (
            <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading transfer records...</p>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <ArrowRight size={36} style={{ opacity: 0.15, display: 'block', margin: '0 auto 0.75rem' }} />
              <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>No transfer requests found.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>From Department</th>
                  <th style={{ textAlign: 'center', width: '30px' }}></th>
                  <th>To Department</th>
                  <th>Reason</th>
                  <th>Effective Date</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  {canApprove && <th style={{ minWidth: '160px' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => {
                  const name = `${t.employee?.firstName || ''} ${t.employee?.lastName || ''}`.trim();
                  return (
                    <tr key={i}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <TransfersAvatar name={name} />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{name}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{t.employee?.employeeId}</div>
                          </div>
                        </div>
                      </td>
                      <td><span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{t.fromDepartment?.name || '—'}</span></td>
                      <td style={{ textAlign: 'center', color: '#8b5cf6' }}><ArrowRight size={16} /></td>
                      <td><span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#8b5cf6' }}>{t.toDepartment?.name || '—'}</span></td>
                      <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{t.reason}</td>
                      <td style={{ fontSize: '0.82rem' }}>{transferFmt(t.effectiveDate)}</td>
                      <td><TransferStatusBadge status={t.status} /></td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{transferFmt(t.createdAt)}</td>
                      {canApprove && (
                        <td>
                          {t.status === 'Pending' ? (
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <button className="btn btn-primary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, background: 'var(--success)', borderColor: 'var(--success)', display: 'flex', alignItems: 'center', gap: '3px' }}
                                onClick={() => setActionModal({ id: t._id, status: 'Approved', name })}>
                                <CheckCircle size={13} /> Approve
                              </button>
                              <button className="btn btn-secondary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, background: 'var(--danger)', borderColor: 'var(--danger)', color: '#fff', display: 'flex', alignItems: 'center', gap: '3px' }}
                                onClick={() => setActionModal({ id: t._id, status: 'Rejected', name })}>
                                <XCircle size={13} /> Reject
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                              {t.comments ? `"${t.comments}"` : 'Processed'}
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

// ==========================================
// MAIN EMPLOYEES COMPONENT
// ==========================================
const Employees = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('roster');

  // Toast State
  const [toast, setToast] = useState(null);
  const showToast = useCallback((msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Roster-specific States
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [leaveBalances, setLeaveBalances] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    dateOfBirth: '',
    gender: 'Male',
    designation: '',
    salary: '',
    department: '',
    status: 'Active',
    role: 'employee',
  });
  const [formError, setFormError] = useState('');
  const [error, setError] = useState('');

  const showSalary = !['manager', 'employee'].includes(user?.role);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError('');
      const params = [];
      if (search) params.push(`search=${encodeURIComponent(search)}`);
      if (deptFilter) params.push(`department=${deptFilter}`);
      
      const queryStr = params.length > 0 ? `?${params.join('&')}` : '';
      const data = await api.get(`/employees${queryStr}`);
      if (data.success) {
        setEmployees(data.employees);
      }
    } catch (err) {
      setError(err.message || 'Failed to load employee records');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const data = await api.get('/departments');
      if (data.success) {
        setDepartments(data.departments);
      }
    } catch (err) {
      console.error('Failed to load departments', err.message);
    }
  };

  const fetchDesignations = async () => {
    try {
      const data = await api.get('/designations');
      if (data.success) {
        setDesignations(data.designations);
      }
    } catch (err) {
      console.error('Failed to load designations', err.message);
    }
  };

  useEffect(() => {
    if (activeTab === 'roster') {
      fetchEmployees();
      fetchDepartments();
      fetchDesignations();
    }
  }, [search, deptFilter, activeTab]);

  const handleOpenAddForm = () => {
    setIsEditMode(false);
    setFormError('');
    setFormData({
      employeeId: `EMP${Math.floor(100 + Math.random() * 900)}`,
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      phone: '',
      dateOfBirth: '',
      gender: 'Male',
      designation: '',
      salary: '',
      department: departments[0]?._id || '',
      status: 'Active',
      role: 'employee',
    });
    setFormOpen(true);
  };

  const handleOpenEditForm = (emp) => {
    setIsEditMode(true);
    setFormError('');
    const dob = emp.dateOfBirth ? new Date(emp.dateOfBirth).toISOString().split('T')[0] : '';
    setFormData({
      _id: emp._id,
      employeeId: emp.employeeId,
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      phone: emp.phone || '',
      dateOfBirth: dob,
      gender: emp.gender,
      designation: emp.designation,
      salary: emp.salary,
      department: emp.department?._id || emp.department || '',
      status: emp.status || 'Active',
      role: emp.role || 'employee',
    });
    setFormOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.department) {
      setFormError('Please select a department');
      return;
    }

    try {
      setFormError('');
      if (isEditMode) {
        const data = await api.put(`/employees/${formData._id}`, formData);
        if (data.success) {
          setFormOpen(false);
          fetchEmployees();
          showToast('Employee details updated successfully!');
        }
      } else {
        if (!formData.password || formData.password.length < 6) {
          setFormError('Password must be at least 6 characters long');
          return;
        }
        const data = await api.post('/users', formData);
        if (data.success) {
          setFormOpen(false);
          fetchEmployees();
          showToast('New employee registered successfully!');
        }
      }
    } catch (err) {
      setFormError(err.message || 'Operation failed');
    }
  };

  const handleDeleteEmployee = async (id) => {
    if (!window.confirm('Are you absolutely sure you want to delete this employee? This will permanently delete their employee record and matching user credentials.')) {
      return;
    }
    try {
      const data = await api.delete(`/employees/${id}`);
      if (data.success) {
        fetchEmployees();
        showToast('Employee deleted successfully.');
      }
    } catch (err) {
      showToast(err.message || 'Failed to delete employee', false);
    }
  };

  const handleViewProfile = async (emp) => {
    setSelectedEmployee(emp);
    setLeaveBalances(null);
    setProfileOpen(true);

    try {
      const data = await api.get(`/leaves/balances?employeeId=${emp._id}`);
      if (data.success) {
        setLeaveBalances(data.balances);
      }
    } catch (err) {
      console.error('Failed to load leave balances', err.message);
    }
  };

  return (
    <div className="page-container page-enter">
      {/* Toast Alert */}
      {toast && (
        <div className={`alert ${toast.ok ? 'alert-success' : 'alert-danger'}`}
          style={{ position: 'fixed', top: '1.25rem', right: '1.5rem', zIndex: 9999, display: 'flex', gap: '0.5rem', alignItems: 'center', boxShadow: 'var(--shadow-lg)' }}>
          {toast.ok ? <CheckCircle size={15} /> : <AlertCircle size={15} />} {toast.msg}
        </div>
      )}

      {/* Header and Tab Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '14px',
            background: activeTab === 'roster'
              ? 'linear-gradient(135deg, #2ebd7f 0%, #10b981 100%)'
              : activeTab === 'skills'
              ? 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)'
              : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
            transition: 'all 0.3s ease',
          }}>
            {activeTab === 'roster' ? <Users size={22} color="white" /> : activeTab === 'skills' ? <Brain size={22} color="white" /> : <ArrowRight size={22} color="white" />}
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>
              {activeTab === 'roster' ? 'Employee Roster' : activeTab === 'skills' ? 'Employee Skill Matrix' : 'Employee Transfer Center'}
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              {activeTab === 'roster' ? 'Manage roster profiles and company system credentials' : activeTab === 'skills' ? 'Track team technical capabilities and recommend training' : 'Recommend and manage inter-department transfer requests'}
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="card" style={{ padding: '0.4rem', margin: 0, display: 'flex', gap: '0.25rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          {[
            { id: 'roster', label: 'Roster Directory', icon: Users },
            { id: 'skills', label: 'Skill Matrix', icon: Brain },
            { id: 'transfers', label: 'Transfers', icon: ArrowRight }
          ].map(t => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`btn ${active ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  padding: '0.45rem 1.1rem',
                  fontSize: '0.83rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  borderRadius: '8px',
                  background: active ? undefined : 'transparent',
                  borderColor: 'transparent',
                  color: active ? '#fff' : 'var(--text-primary)',
                  boxShadow: active ? '0 4px 12px rgba(99, 102, 241, 0.2)' : 'none',
                }}
              >
                <Icon size={14} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Roster Tab */}
      {activeTab === 'roster' && (
        <>
          <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.5rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '1rem', flex: 1, minWidth: '280px' }}>
                {/* Search Input */}
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by ID, name, email, designation..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                  />
                  <Search
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '1rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-secondary)',
                    }}
                  />
                </div>

                {/* Department Filter */}
                <select
                  className="form-control"
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  style={{ width: '200px' }}
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {['admin', 'hr'].includes(user?.role) && (
                <button onClick={handleOpenAddForm} className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #2ebd7f 0%, #10b981 100%)', borderColor: '#2ebd7f' }}>
                  <Plus size={18} /> Add Employee
                </button>
              )}
            </div>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          {/* Employees Table List */}
          <div className="table-container">
            <div className="table-header-row">
              <span className="table-title">Employee Roster ({employees.length})</span>
            </div>
            <div className="data-table-wrapper">
              {loading ? (
                <p style={{ textAlign: 'center', padding: '2rem' }}>Loading Employees Directory...</p>
              ) : employees.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No employees found matching the filters</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Employee ID</th>
                      <th>Name</th>
                      <th>Department</th>
                      <th>Designation</th>
                      <th>Joining Date</th>
                      {showSalary && <th>Salary</th>}
                      <th>Status</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => (
                      <tr key={emp._id}>
                        <td>
                          <strong>{emp.employeeId}</strong>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div className="sidebar-footer-avatar" style={{ width: '32px', height: '32px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {emp.firstName[0]}{emp.lastName[0]}
                            </div>
                            <div>
                              <strong>{emp.firstName} {emp.lastName}</strong>
                              <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                {emp.email}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>{emp.department?.name || 'Unassigned'}</td>
                        <td>
                          <strong>{emp.designation}</strong>
                          <span style={{ display: 'block', fontSize: '0.725rem', color: 'var(--primary-accent)', fontWeight: 700, marginTop: '0.2rem' }}>
                            Access: {emp.role?.toUpperCase() || 'EMPLOYEE'}
                          </span>
                        </td>
                        <td>{new Date(emp.joiningDate).toLocaleDateString()}</td>
                        {showSalary && <td>${emp.salary?.toLocaleString()}</td>}
                        <td>
                          <span className={`badge badge-${emp.status.toLowerCase()}`}>{emp.status}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            <button
                              onClick={() => handleViewProfile(emp)}
                              className="btn btn-secondary btn-icon"
                              title="View Profile"
                            >
                              <Eye size={16} />
                            </button>
                            {['admin', 'hr'].includes(user?.role) && (
                              <button
                                onClick={() => handleOpenEditForm(emp)}
                                className="btn btn-secondary btn-icon"
                                title="Edit Details"
                                style={{ color: 'var(--primary-accent)' }}
                              >
                                <Edit2 size={16} />
                              </button>
                            )}
                            {(user?.role === 'admin') && (
                              <button
                                onClick={() => handleDeleteEmployee(emp._id)}
                                className="btn btn-secondary btn-icon"
                                title="Delete Employee"
                                style={{ color: 'var(--danger)' }}
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* CRUD Form Modal */}
          {formOpen && (
            <div className="modal-overlay">
              <div className="modal-content" style={{ width: '600px' }}>
                <div className="modal-header">
                  <h3 className="modal-title">{isEditMode ? 'Edit Employee Details' : 'Register New Employee'}</h3>
                  <button className="modal-close-btn" onClick={() => setFormOpen(false)}>
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
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label>Employee ID *</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.employeeId}
                          onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                          disabled={isEditMode}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Department *</label>
                        <select
                          className="form-control"
                          value={formData.department}
                          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                          required
                        >
                          <option value="">Select Department</option>
                          {departments.map((d) => (
                            <option key={d._id} value={d._id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>First Name *</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Last Name *</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Email Address *</label>
                        <input
                          type="email"
                          className="form-control"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Phone Number</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Date of Birth</label>
                        <input
                          type="date"
                          className="form-control"
                          value={formData.dateOfBirth}
                          onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label>Gender *</label>
                        <select
                          className="form-control"
                          value={formData.gender}
                          onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                          required
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Designation / Title *</label>
                        <select
                          className="form-control"
                          value={formData.designation}
                          onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                          required
                        >
                          <option value="">Select Designation</option>
                          {designations.map((d) => (
                            <option key={d._id} value={d.name}>
                              {d.name}
                            </option>
                          ))}
                          {formData.designation && !designations.some(d => d.name === formData.designation) && (
                            <option value={formData.designation}>{formData.designation}</option>
                          )}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Monthly Salary ($) *</label>
                        <input
                          type="number"
                          className="form-control"
                          placeholder="e.g. 5000"
                          value={formData.salary}
                          onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>System Access Role *</label>
                        <select
                          className="form-control"
                          value={formData.role || 'employee'}
                          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                          required
                        >
                          <option value="employee">Employee (Standard Access)</option>
                          <option value="manager">Department Manager (Team Access)</option>
                          <option value="hr">HR Admin (Middle Access)</option>
                          <option value="admin">Super Admin (Full Access)</option>
                        </select>
                      </div>
                      {isEditMode ? (
                        <div className="form-group">
                          <label>Account Status</label>
                          <select
                            className="form-control"
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                          </select>
                        </div>
                      ) : (
                        <div className="form-group">
                          <label>Account Password *</label>
                          <input
                            type="password"
                            className="form-control"
                            placeholder="Min 6 characters"
                            value={formData.password || ''}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required={!isEditMode}
                            minLength={6}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setFormOpen(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #2ebd7f 0%, #10b981 100%)', borderColor: '#2ebd7f' }}>
                      {isEditMode ? 'Update Record' : 'Create Record'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Detailed Profile View Drawer Modal */}
          {profileOpen && selectedEmployee && (
            <div className="modal-overlay">
              <div className="modal-content" style={{ width: '650px' }}>
                <div className="modal-header">
                  <h3 className="modal-title">Employee Profile Card</h3>
                  <button className="modal-close-btn" onClick={() => setProfileOpen(false)}>
                    <X size={20} />
                  </button>
                </div>
                <div className="modal-body">
                  <div className="profile-grid">
                    
                    {/* Left Side avatar */}
                    <div className="profile-avatar-container">
                      <div className="profile-avatar-large">
                        {selectedEmployee.firstName[0]}{selectedEmployee.lastName[0]}
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.25rem' }}>{selectedEmployee.firstName} {selectedEmployee.lastName}</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                          {selectedEmployee.designation}
                        </p>
                        <span className={`badge badge-${selectedEmployee.status.toLowerCase()}`} style={{ marginTop: '0.5rem' }}>
                          {selectedEmployee.status}
                        </span>
                      </div>
                    </div>

                    {/* Right Side metadata details */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      
                      <div>
                        <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
                          Employment Profile
                        </h4>
                        <div className="profile-info-grid">
                          <div className="profile-info-item">
                            <span className="profile-info-label">Employee ID</span>
                            <span className="profile-info-val"><strong>{selectedEmployee.employeeId}</strong></span>
                          </div>
                          <div className="profile-info-item">
                            <span className="profile-info-label">Department</span>
                            <span className="profile-info-val">{selectedEmployee.department?.name || 'Unassigned'}</span>
                          </div>
                          {showSalary && (
                            <div className="profile-info-item">
                              <span className="profile-info-label">Monthly Base</span>
                              <span className="profile-info-val">${selectedEmployee.salary?.toLocaleString()}</span>
                            </div>
                          )}
                          <div className="profile-info-item">
                            <span className="profile-info-label">Joining Date</span>
                            <span className="profile-info-val">{new Date(selectedEmployee.joiningDate).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
                          Personal Contact
                        </h4>
                        <div className="profile-info-grid">
                          <div className="profile-info-item">
                            <span className="profile-info-label">Work Email</span>
                            <span className="profile-info-val">{selectedEmployee.email}</span>
                          </div>
                          <div className="profile-info-item">
                            <span className="profile-info-label">Phone</span>
                            <span className="profile-info-val">{selectedEmployee.phone || 'N/A'}</span>
                          </div>
                          <div className="profile-info-item">
                            <span className="profile-info-label">Date of Birth</span>
                            <span className="profile-info-val">
                              {selectedEmployee.dateOfBirth ? new Date(selectedEmployee.dateOfBirth).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                          <div className="profile-info-item">
                            <span className="profile-info-label">Gender</span>
                            <span className="profile-info-val">{selectedEmployee.gender}</span>
                          </div>
                        </div>
                      </div>

                      {/* Active leave balances */}
                      <div>
                        <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
                          Leave Balances (Current Year)
                        </h4>
                        {leaveBalances ? (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            {Object.keys(leaveBalances).map((type) => {
                              const item = leaveBalances[type];
                              return (
                                <div key={type} style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{type}</span>
                                  <span style={{ fontSize: '0.8rem' }}>
                                    Used: <strong>{item.used}</strong> / Bal: <strong>{type === 'Unpaid' ? '∞' : item.balance}</strong>
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Loading balances...</p>
                        )}
                      </div>

                    </div>

                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-primary" onClick={() => setProfileOpen(false)}>
                    Close Profile
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Skill Matrix Tab */}
      {activeTab === 'skills' && <SkillMatrixTab showToast={showToast} />}

      {/* Transfers Tab */}
      {activeTab === 'transfers' && <TransferRequestsTab showToast={showToast} />}
    </div>
  );
};

export default Employees;
