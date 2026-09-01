import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { FileSpreadsheet, FileDown, Check, AlertCircle, Monitor } from 'lucide-react';

const REPORTS = [
  {
    type: 'insummary',
    label: 'In Summary Attendance Report',
    desc: 'Interactive live dashboard showing clock-in sources, gauges, daily statistics, and a filterable attendance roster.',
    hex: '#fc4b6c',
    bg: 'rgba(252,75,108,0.10)',
    btnGradient: 'linear-gradient(135deg, #fc4b6c 0%, #ff6e85 100%)',
    isInteractive: true,
    path: '/reports/standardreport/insummaryreports',
  },
  {
    type: 'employees',
    label: 'Employee Directory Report',
    desc: 'Contains complete roster profiles, designations, department links, statuses, and salaries.',
    hex: '#6777ef',
    bg: 'rgba(103,119,239,0.10)',
    btnGradient: 'linear-gradient(135deg, #6777ef 0%, #3f51b5 100%)',
    isInteractive: true,
    path: '/reports/standardreport/employeedirectory',
  },
  {
    type: 'attendance',
    label: 'Attendance Audit Sheet',
    desc: 'Detailed logs for clock-in/out timestamps, status (present/late/absent), and total working hours.',
    hex: '#2ebd7f',
    bg: 'rgba(46,189,127,0.10)',
    btnGradient: 'linear-gradient(135deg, #2ebd7f 0%, #1a9e65 100%)',
    isInteractive: true,
    path: '/reports/standardreport/attendanceaudit',
  },
  {
    type: 'payroll',
    label: 'Payroll Ledger Report',
    desc: 'Processed payroll history sheets, including gross salary, deductions, bonuses, and payment date.',
    hex: '#ffb119',
    bg: 'rgba(255,177,25,0.10)',
    btnGradient: 'linear-gradient(135deg, #ffb119 0%, #e09000 100%)',
    isInteractive: true,
    path: '/reports/standardreport/payrollledger',
  },
  {
    type: 'leaves',
    label: 'Leave Allocation Sheet',
    desc: 'Comprehensive records of leave requests, statuses, types, and approval metadata.',
    hex: '#00bcd4',
    bg: 'rgba(0,188,212,0.10)',
    btnGradient: 'linear-gradient(135deg, #00bcd4 0%, #0097a7 100%)',
    isInteractive: true,
    path: '/reports/standardreport/leaveallocation',
  },
  {
    type: 'productivity',
    label: 'Team Tasks & Productivity Report',
    desc: 'Detailed view of team task statuses, completion progress rates, individual work distribution, and overdue items.',
    hex: '#8b5cf6',
    bg: 'rgba(139,92,246,0.10)',
    btnGradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    isInteractive: true,
    path: '/reports/standardreport/productivity',
  },
];

const ReportsPage = () => {
  const navigate = useNavigate();
  const [exporting, setExporting] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleExport = async (type) => {
    setExporting(type);
    setError('');
    setSuccessMsg('');
    try {
      const res = await api.get(`/admin/reports/${type}`);
      if (res.success) {
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `${type}-report-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setSuccessMsg(`Exported ${type} report successfully. (${res.count} records)`);
      }
    } catch (e) {
      setError(e.message || 'Export failed');
    } finally {
      setExporting('');
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '14px',
          background: 'linear-gradient(135deg, #6777ef 0%, #3f51b5 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 15px rgba(103,119,239,0.3)',
        }}>
          <FileSpreadsheet size={22} color="white" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>System Reports Console</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            Generate and export system metrics, audit sheets, and employee records in structured formats
          </p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="alert alert-danger" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {successMsg && (
        <div style={{
          padding: '0.75rem 1rem', background: 'rgba(46,189,127,0.1)', color: '#2ebd7f',
          borderRadius: '10px', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem',
          fontWeight: 600, fontSize: '0.9rem',
        }}>
          <Check size={16} /> {successMsg}
        </div>
      )}

      {/* Reports Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {REPORTS.map((report) => (
          <div
            key={report.type}
            className="card"
            style={{ border: `1px solid ${report.hex}30`, display: 'flex', flexDirection: 'column', minHeight: '230px' }}
          >
            {/* Icon Box */}
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: report.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '1rem',
            }}>
              <FileDown size={20} color={report.hex} />
            </div>

            {/* Title */}
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
              {report.label}
            </h3>

            {/* Description */}
            <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5, flex: 1 }}>
              {report.desc}
            </p>

            {/* Export Button */}
            <button
              onClick={() => report.isInteractive ? navigate(report.path) : handleExport(report.type)}
              disabled={!report.isInteractive && exporting === report.type}
              style={{
                width: '100%',
                padding: '0.7rem 1rem',
                background: report.btnGradient,
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.88rem',
                border: 'none',
                borderRadius: '10px',
                cursor: (!report.isInteractive && exporting === report.type) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                opacity: (!report.isInteractive && exporting === report.type) ? 0.7 : 1,
                transition: 'opacity 0.2s, transform 0.15s',
                letterSpacing: '0.02em',
                boxShadow: `0 4px 12px ${report.hex}40`,
              }}
              onMouseEnter={e => { if (report.isInteractive || exporting !== report.type) e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {report.isInteractive ? <Monitor size={15} /> : <FileDown size={15} />}
              {report.isInteractive ? 'Open Interactive Report' : (exporting === report.type ? 'Exporting...' : `Export ${report.label.split(' ')[0]} Report`)}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReportsPage;
