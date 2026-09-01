import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  Download, FileText, Briefcase, User, CheckCircle,
  FileSpreadsheet, Gift, Eye, Printer, X, ClipboardList,
  Send, AlertCircle
} from 'lucide-react';

const CARDS_CONFIG = [
  {
    key: 'payslips',
    icon: FileSpreadsheet,
    title: 'Salary Slips',
    hex: '#2ebd7f',
    bg: 'rgba(46,189,127,0.10)',
    btnGradient: 'linear-gradient(135deg, #2ebd7f 0%, #1a9e65 100%)',
    label: 'View Payslips History',
    shadow: 'rgba(46,189,127,0.30)',
  },
  {
    key: 'experience',
    icon: Briefcase,
    title: 'Experience Letter',
    hex: '#6777ef',
    bg: 'rgba(103,119,239,0.10)',
    btnGradient: 'linear-gradient(135deg, #6777ef 0%, #3f51b5 100%)',
    label: 'Preview Experience Letter',
    shadow: 'rgba(103,119,239,0.30)',
  },
  {
    key: 'offer',
    icon: FileText,
    title: 'Offer Letter',
    hex: '#00bcd4',
    bg: 'rgba(0,188,212,0.10)',
    btnGradient: 'linear-gradient(135deg, #00bcd4 0%, #0097a7 100%)',
    label: 'Preview Offer Letter',
    shadow: 'rgba(0,188,212,0.30)',
  },
  {
    key: 'profile',
    icon: User,
    title: 'Profile Data Export',
    hex: '#ffb119',
    bg: 'rgba(255,177,25,0.10)',
    btnGradient: 'linear-gradient(135deg, #ffb119 0%, #e09000 100%)',
    label: 'Export Profile JSON',
    shadow: 'rgba(255,177,25,0.30)',
  },
];

const SelfService = () => {
  const { user } = useAuth();
  const [payslips, setPayslips] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  // Modals state
  const [activeModal, setActiveModal] = useState(null); // 'experience', 'offer', 'payslip'
  const [selectedPayslip, setSelectedPayslip] = useState(null);

  // Change request forms
  const [changeType, setChangeType] = useState('Update Phone Contact');
  const [changeDescription, setChangeDescription] = useState('');
  const [requestsList, setRequestsList] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [payRes, meRes] = await Promise.all([
          api.get('/payroll/my'),
          api.get('/auth/me'),
        ]);
        if (payRes.success) setPayslips(payRes.payrolls || []);
        if (meRes.success) setProfile(meRes.user);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();

    // Load request tickets list from localStorage
    const saved = localStorage.getItem(`change_requests_${user?.email || 'user'}`);
    if (saved) {
      setRequestsList(JSON.parse(saved));
    }
  }, [user]);

  const downloadJSON = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setMsg(`✅ ${filename} exported successfully`);
    setTimeout(() => setMsg(''), 3000);
  };

  const getLetterContent = (type) => {
    const emp = profile?.employee;
    const name = emp ? `${emp.firstName} ${emp.lastName}` : user?.username;
    const designation = emp?.designation || 'Team Member';
    const dept = emp?.department?.name || 'General';
    const joining = emp?.joiningDate ? new Date(emp.joiningDate).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A';
    const today = new Date().toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });

    if (type === 'experience') {
      return {
        title: 'EXPERIENCE CERTIFICATE',
        salutation: 'TO WHOM IT MAY CONCERN',
        body: `This is to certify that ${name} has been employed with EMS Hub Technologies as a ${designation} in the ${dept} Department since ${joining}. During their tenure, ${name} has demonstrated excellent professionalism, technical skillsets, and commendable work ethics. They have contributed positively to our development roadmap and client operations. We wish them the best of success in all their future career paths.`,
        date: today
      };
    } else {
      return {
        title: 'OFFER OF EMPLOYMENT',
        salutation: `Dear ${name},`,
        body: `We are pleased to offer you the position of ${designation} in the ${dept} Department at EMS Hub Technologies, effective from ${joining}. This letter confirms your placement on our core team with the standard terms and benefits discussed during the interview process. We look forward to your valuable contributions towards the growth of our product suite.`,
        date: today
      };
    }
  };

  const handleCardClick = (key) => {
    if (key === 'payslips') {
      const el = document.getElementById('payslip-history-table');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else if (key === 'experience') {
      setActiveModal('experience');
    } else if (key === 'offer') {
      setActiveModal('offer');
    } else if (key === 'profile') {
      downloadJSON(profile, `my-profile-${user?.username}.json`);
    }
  };

  // Submit profile correction requests to local storage
  const handleRequestSubmit = (e) => {
    e.preventDefault();
    if (!changeDescription.trim()) return;

    const newRequest = {
      id: Date.now(),
      date: new Date().toLocaleDateString(),
      type: changeType,
      description: changeDescription,
      status: 'Pending HR Review'
    };

    const updated = [newRequest, ...requestsList];
    setRequestsList(updated);
    localStorage.setItem(`change_requests_${user?.email || 'user'}`, JSON.stringify(updated));
    setChangeDescription('');
    setMsg('✅ Change Request ticket submitted successfully');
    setTimeout(() => setMsg(''), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="page-container">
      {/* Print styles to isolate A4 previews */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-area, #printable-area * {
            visibility: visible;
          }
          #printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background: white !important;
            color: black !important;
            padding: 1.5in !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
        .dropdown-item-hover:hover {
          background-color: var(--bg-sidebar-active) !important;
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '14px',
          background: 'linear-gradient(135deg, #2ebd7f 0%, #059669 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 15px rgba(46,189,127,0.3)',
        }}>
          <Gift size={22} color="white" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Self-Service Portal</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            Download official documents, view salary sheets, and request profile changes
          </p>
        </div>
      </div>

      {/* Message alerts */}
      {msg && (
        <div style={{
          padding: '0.75rem 1rem', background: 'var(--success-bg)', color: 'var(--success)',
          borderRadius: '10px', marginBottom: '1.5rem',
          display: 'flex', gap: '0.5rem', fontWeight: 600, fontSize: '0.9rem',
        }}>
          <CheckCircle size={16} /> {msg}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
          <div className="spin" style={{ width: '24px', height: '24px', border: '3px solid var(--border-color)', borderTopColor: 'var(--primary-accent)', borderRadius: '50%' }} />
        </div>
      ) : (
        <>
          {/* Main Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            {CARDS_CONFIG.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.key}
                  className="card"
                  style={{ border: `1px solid ${card.hex}25`, display: 'flex', flexDirection: 'column', minHeight: '200px' }}
                >
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '12px',
                    background: card.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: '1rem',
                  }}>
                    <Icon size={20} color={card.hex} />
                  </div>

                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
                    {card.title}
                  </h3>
                  <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5, flex: 1 }}>
                    {card.key === 'payslips' ? `View and download your ${payslips.length} salary statements` : `Generate or export your official ${card.title.toLowerCase()}`}
                  </p>

                  <button
                    onClick={() => handleCardClick(card.key)}
                    style={{
                      width: '100%',
                      padding: '0.7rem 1rem',
                      background: card.btnGradient,
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      boxShadow: `0 4px 12px ${card.shadow}`,
                      transition: 'transform 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <Eye size={15} />
                    {card.label}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Dynamic Payslips Table */}
          <div id="payslip-history-table" className="table-container" style={{ marginBottom: '2rem' }}>
            <div className="table-header-row">
              <span className="table-title">Your Payslip History ({payslips.length})</span>
            </div>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Basic Salary</th>
                    <th>Bonuses</th>
                    <th>Deductions</th>
                    <th>Net Salary</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payslips.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
                        No monthly payslips issued yet.
                      </td>
                    </tr>
                  ) : (
                    payslips.map((p) => (
                      <tr key={p._id}>
                        <td><strong>{p.month}</strong></td>
                        <td>${p.baseSalary?.toLocaleString()}</td>
                        <td style={{ color: 'var(--success)', fontWeight: 600 }}>+${p.bonuses?.toLocaleString()}</td>
                        <td style={{ color: 'var(--danger)', fontWeight: 600 }}>-${p.deductions?.toLocaleString()}</td>
                        <td style={{ color: 'var(--success)', fontWeight: 800 }}>${p.netSalary?.toLocaleString()}</td>
                        <td>
                          <span className={`badge ${p.status === 'Paid' ? 'badge-present' : 'badge-pending'}`}>
                            {p.status}
                          </span>
                        </td>
                        <td style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                          <button
                            onClick={() => {
                              setSelectedPayslip(p);
                              setActiveModal('payslip');
                            }}
                            className="btn btn-secondary btn-icon"
                            title="View Payslip Invoice"
                            style={{ width: '32px', height: '32px' }}
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            onClick={() => downloadJSON(p, `Payslip_${p.month}.json`)}
                            className="btn btn-secondary btn-icon"
                            title="Export JSON"
                            style={{ width: '32px', height: '32px' }}
                          >
                            <Download size={13} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Change Request Tickets Form & Tracker */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1.5rem', flexWrap: 'wrap' }}>
            {/* Ticket form */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <ClipboardList size={18} color="var(--primary-accent)" /> Submit HR Change Request
              </h3>
              <form onSubmit={handleRequestSubmit}>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.8rem' }}>Request Type *</label>
                  <select
                    className="form-control"
                    value={changeType}
                    onChange={(e) => setChangeType(e.target.value)}
                    style={{ fontSize: '0.88rem', padding: '0.6rem' }}
                  >
                    <option value="Update Phone Contact">Update Phone Contact</option>
                    <option value="Update Home Address">Update Home Address</option>
                    <option value="Update Bank Details">Update Bank Details</option>
                    <option value="General Query">General Query / Helpdesk</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label style={{ fontSize: '0.8rem' }}>Description & Details *</label>
                  <textarea
                    rows="4"
                    className="form-control"
                    placeholder="Provide detailed changes (e.g. New Address: 123 Main St, New Bank: Acct #987654...)"
                    value={changeDescription}
                    onChange={(e) => setChangeDescription(e.target.value)}
                    required
                    style={{ resize: 'none', fontSize: '0.88rem' }}
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <Send size={14} /> Submit Request Ticket
                </button>
              </form>
            </div>

            {/* Tracker table */}
            <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1.25rem' }}>
                Submitted Tickets Status
              </h3>
              <div style={{ flex: 1, overflowY: 'auto', maxHeight: '280px' }}>
                <table className="data-table" style={{ fontSize: '0.83rem' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '0.5rem' }}>Date</th>
                      <th style={{ padding: '0.5rem' }}>Type</th>
                      <th style={{ padding: '0.5rem' }}>Details</th>
                      <th style={{ padding: '0.5rem' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requestsList.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                          No tickets submitted.
                        </td>
                      </tr>
                    ) : (
                      requestsList.map((req) => (
                        <tr key={req.id}>
                          <td style={{ padding: '0.6rem 0.5rem', whiteSpace: 'nowrap' }}>{req.date}</td>
                          <td style={{ padding: '0.6rem 0.5rem', fontWeight: 700 }}>{req.type}</td>
                          <td style={{ padding: '0.6rem 0.5rem', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={req.description}>
                            {req.description}
                          </td>
                          <td style={{ padding: '0.6rem 0.5rem' }}>
                            <span className="badge badge-pending" style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}>
                              {req.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ────────────────── OVERLAY MODALS ────────────────── */}

      {/* Letters Preview Modal */}
      {(activeModal === 'experience' || activeModal === 'offer') && (() => {
        const letter = getLetterContent(activeModal);
        const emp = profile?.employee;
        return (
          <div className="modal-overlay no-print">
            <div className="modal-content" style={{ width: '640px', maxHeight: '95vh' }}>
              <div className="modal-header">
                <h3 className="modal-title">Letter Preview</h3>
                <button className="modal-close-btn" onClick={() => setActiveModal(null)}>
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body" style={{ background: '#f1f5f9', padding: '2rem', display: 'flex', justifyContent: 'center' }}>
                {/* Paper sheet */}
                <div id="printable-area" style={{
                  background: '#ffffff', width: '100%', minHeight: '500px',
                  boxShadow: '0 4px 25px rgba(0,0,0,0.1)', padding: '3rem 2.5rem',
                  color: '#1e293b', position: 'relative', border: '1px solid #e2e8f0',
                  fontFamily: 'Outfit, Georgia, serif', display: 'flex', flexDirection: 'column', gap: '1.5rem'
                }}>
                  {/* Letterhead */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #64748b', paddingBottom: '0.75rem' }}>
                    <div>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>EMS Hub Technologies</h2>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Enterprise Workspace Hub</span>
                    </div>
                    <span style={{ fontSize: '#0.7rem', color: '#64748b', textAlign: 'right', fontSize: '0.75rem' }}>
                      123 Corporate Blvd<br/>Suite 500, New York
                    </span>
                  </div>

                  {/* Date & Ref */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#475569' }}>
                    <span>Ref: EMS/{activeModal === 'experience' ? 'EXP' : 'OFR'}/{new Date().getFullYear()}</span>
                    <span>Date: {letter.date}</span>
                  </div>

                  {/* Letter Title */}
                  <h3 style={{ textAlign: 'center', fontSize: '1.15rem', fontWeight: 800, letterSpacing: '0.5px', color: '#0f172a', textDecoration: 'underline' }}>
                    {letter.title}
                  </h3>

                  {/* Salutation */}
                  <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{letter.salutation}</strong>

                  {/* Body Text */}
                  <p style={{ fontSize: '0.88rem', lineHeight: 1.8, color: '#334155', textAlign: 'justify', margin: 0 }}>
                    {letter.body}
                  </p>

                  {/* Closing signature section */}
                  <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
                    <p style={{ fontSize: '#0.88rem', margin: '0 0 1.5rem 0', color: '#475569' }}>Yours faithfully,</p>
                    {/* Simulated sign stamp signature */}
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      {/* Signature graphic line */}
                      <span style={{ fontFamily: '"Reenie Beanie", cursive, Brush Script MT', fontSize: '1.8rem', color: '#3b82f6', display: 'block', transform: 'rotate(-5deg)' }}>
                        HR Manager
                      </span>
                      {/* Stamp overlay */}
                      <div style={{
                        position: 'absolute', top: '-10px', left: '40px', width: '60px', height: '60px',
                        border: '2px dashed rgba(239,68,68,0.4)', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'rgba(239,68,68,0.4)', fontSize: '0.62rem', fontWeight: 800,
                        transform: 'rotate(15deg)', pointerEvents: 'none', textTransform: 'uppercase'
                      }}>
                        EMS Stamp
                      </div>
                    </div>
                    <strong style={{ display: 'block', fontSize: '0.88rem', color: '#0f172a', marginTop: '0.5rem' }}>Human Resources Department</strong>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>EMS Hub Technologies Inc.</span>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setActiveModal(null)}>Close</button>
                <button className="btn btn-primary" onClick={handlePrint}>
                  <Printer size={15} /> Print Document
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Payslip Invoice Modal */}
      {activeModal === 'payslip' && selectedPayslip && (() => {
        const emp = profile?.employee;
        return (
          <div className="modal-overlay no-print">
            <div className="modal-content" style={{ width: '550px' }}>
              <div className="modal-header">
                <h3 className="modal-title">Payslip Statement: {selectedPayslip.month}</h3>
                <button className="modal-close-btn" onClick={() => {
                  setSelectedPayslip(null);
                  setActiveModal(null);
                }}>
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body" style={{ background: '#f8fafc', padding: '1.5rem' }}>
                <div id="printable-area" style={{
                  background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px',
                  padding: '2rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '1.25rem'
                }}>
                  {/* Title letterhead */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>EMS Hub Technologies</h4>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Salary Earnings Statement</span>
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2ebd7f', background: 'rgba(46,189,127,0.1)', padding: '0.2rem 0.5rem', borderRadius: '6px', alignSelf: 'center' }}>
                      Status: {selectedPayslip.status}
                    </span>
                  </div>

                  {/* Roster profiles info */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.78rem', padding: '0.25rem 0' }}>
                    <div>
                      <strong style={{ color: '#0f172a' }}>Employee Details:</strong>
                      <div style={{ marginTop: '0.25rem' }}>
                        {emp ? `${emp.firstName} ${emp.lastName}` : user?.username}<br/>
                        ID: {emp?.employeeId || 'N/A'}<br/>
                        Designation: {emp?.designation || 'Staff'}
                      </div>
                    </div>
                    <div>
                      <strong style={{ color: '#0f172a' }}>Payment Reference:</strong>
                      <div style={{ marginTop: '0.25rem' }}>
                        Period: {selectedPayslip.month}<br/>
                        Account Credit: Wire Transfer<br/>
                        Date Issued: {selectedPayslip.paymentDate ? new Date(selectedPayslip.paymentDate).toLocaleDateString() : 'Pending'}
                      </div>
                    </div>
                  </div>

                  {/* Calculations breakdown table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem', marginTop: '0.5rem' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '0.5rem', textAlign: 'left', color: '#475569' }}>Description</th>
                        <th style={{ padding: '0.5rem', textAlign: 'right', color: '#475569' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.6rem 0.5rem' }}>Basic Base Salary</td>
                        <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right' }}>${selectedPayslip.baseSalary?.toLocaleString()}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.6rem 0.5rem', color: '#2ebd7f' }}>Bonuses & Incentives</td>
                        <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right', color: '#2ebd7f' }}>+${selectedPayslip.bonuses?.toLocaleString()}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '0.6rem 0.5rem', color: '#ef4444' }}>Tax Deductions</td>
                        <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right', color: '#ef4444' }}>-${selectedPayslip.deductions?.toLocaleString()}</td>
                      </tr>
                      {/* Total */}
                      <tr style={{ fontWeight: 800, background: 'rgba(46,189,127,0.05)' }}>
                        <td style={{ padding: '0.75rem 0.5rem', color: '#0f172a', fontSize: '0.9rem' }}>Net Take-Home Salary</td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', color: '#2ebd7f', fontSize: '0.95rem' }}>
                          ${selectedPayslip.netSalary?.toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Verification seal */}
                  <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: '#94a3b8' }}>
                    <span>EMS Autogenerated Payslip Sheet</span>
                    <span>No physical signature required.</span>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => {
                  setSelectedPayslip(null);
                  setActiveModal(null);
                }}>Close</button>
                <button className="btn btn-primary" onClick={handlePrint}>
                  <Printer size={15} /> Print Payslip
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default SelfService;
