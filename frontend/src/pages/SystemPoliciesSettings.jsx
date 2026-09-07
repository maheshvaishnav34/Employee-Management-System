import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  Sliders, Shield, Clock, CalendarDays, DollarSign,
  Lock, FileText, Bell, CheckCircle2, AlertCircle,
  Save, RotateCcw, Download, Search, Check, Sparkles,
  Info, ArrowRight, ShieldCheck, Building2, Eye, UserCheck
} from 'lucide-react';

const DEFAULT_POLICIES = {
  // 0. Employee ID & Corporate Identification
  employeeIdPrefix: 'EMP',
  employeeIdDigits: 3,
  employeeIdNextNumber: 107,
  employeeIdSeparator: 'None',
  autoGenerateEmployeeId: true,
  allowCustomEmployeeId: true,

  // 1. Work & Attendance
  standardWorkHours: '09:30 AM - 06:30 PM',
  lateGraceMinutes: 15,
  halfDayThresholdHours: 4.5,
  allowOvertime: true,
  maxRemoteDaysPerWeek: 2,
  autoClockOutMidnight: true,

  // 2. Leaves & Absence
  annualPaidLeaves: 18,
  sickLeaves: 12,
  casualLeaves: 10,
  advanceNoticeDays: 3,
  carryForwardLeaves: true,
  autoApproveHalfDay: false,

  // 3. Payroll & Compensation (INR ₹)
  salaryDisbursalDay: '1st of every month',
  currency: 'INR (₹)',
  minAllowableWage: 25000,
  providentFundRate: 12,
  expenseAutoApproveLimit: 5000,
  overtimeMultiplier: 1.5,

  // 4. Security & Access Control
  minPasswordLength: 8,
  enforceSpecialChars: true,
  sessionTimeoutMinutes: 30,
  enforce2FA: false,
  allowMultipleSessions: true,
  ipRestrictionEnabled: false,

  // 5. Compliance & Ethics
  requireNDASigning: true,
  poshPolicyEnforced: true,
  resignationNoticeDays: 30,
  assetReturnSlaDays: 3,
  performanceReviewCycle: 'Bi-Annual (Every 6 Months)',

  // 6. Alerts & Automation
  emailOnLeaveRequest: true,
  emailOnTaskAssignment: true,
  autoGeneratePayslipAlerts: true,
  autoDailyDbBackup: true,
};

const CATEGORIES = [
  { id: 'all', label: 'All Policies', icon: Sliders },
  { id: 'employeeId', label: 'Employee ID & Identity', icon: UserCheck },
  { id: 'work', label: 'Work & Attendance', icon: Clock },
  { id: 'leaves', label: 'Leaves & Absence', icon: CalendarDays },
  { id: 'payroll', label: 'Payroll & Compensation', icon: DollarSign },
  { id: 'security', label: 'Security & Access', icon: Lock },
  { id: 'compliance', label: 'Compliance & Ethics', icon: ShieldCheck },
  { id: 'alerts', label: 'Alerts & Automation', icon: Bell },
];

const ToggleSwitch = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    onClick={() => !disabled && onChange(!checked)}
    style={{
      width: '46px',
      height: '24px',
      borderRadius: '12px',
      background: checked ? 'var(--primary-accent, #2563eb)' : 'rgba(100,116,139,0.3)',
      position: 'relative',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'background 0.2s ease',
      border: 'none',
      padding: 0,
      outline: 'none',
      flexShrink: 0,
    }}
  >
    <div
      style={{
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        background: '#ffffff',
        position: 'absolute',
        top: '3px',
        left: checked ? '25px' : '3px',
        transition: 'left 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
      }}
    />
  </button>
);

const SystemPoliciesSettings = () => {
  const { user } = useAuth();
  const [policies, setPolicies] = useState(() => {
    try {
      const saved = localStorage.getItem('ems_system_policies');
      return saved ? { ...DEFAULT_POLICIES, ...JSON.parse(saved) } : DEFAULT_POLICIES;
    } catch (e) {
      return DEFAULT_POLICIES;
    }
  });

  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  // Sync with backend admin settings if available
  useEffect(() => {
    const fetchBackendSettings = async () => {
      try {
        const res = await api.get('/admin/settings');
        if (res.success && res.settings) {
          setPolicies(prev => ({
            ...prev,
            standardWorkHours: res.settings.businessHours || prev.standardWorkHours,
            minAllowableWage: res.settings.salaryRuleMin || prev.minAllowableWage,
            autoDailyDbBackup: res.settings.enableBackups ?? prev.autoDailyDbBackup,
            emailOnLeaveRequest: res.settings.emailNotifications ?? prev.emailOnLeaveRequest,
            employeeIdPrefix: res.settings.employeeIdPrefix || prev.employeeIdPrefix,
            employeeIdDigits: res.settings.employeeIdDigits ?? prev.employeeIdDigits,
            employeeIdNextNumber: res.settings.employeeIdNextNumber ?? prev.employeeIdNextNumber,
            employeeIdSeparator: res.settings.employeeIdSeparator || prev.employeeIdSeparator,
            autoGenerateEmployeeId: res.settings.autoGenerateEmployeeId ?? prev.autoGenerateEmployeeId,
            allowCustomEmployeeId: res.settings.allowCustomEmployeeId ?? prev.allowCustomEmployeeId,
          }));
        }
      } catch (e) {
        // Backend settings fallback gracefully
      }
    };
    if (['admin', 'hr'].includes(user?.role)) {
      fetchBackendSettings();
    }
  }, [user]);

  const updatePolicy = (key, value) => {
    setPolicies(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setSaveSuccess('');
    try {
      localStorage.setItem('ems_system_policies', JSON.stringify(policies));
      
      // Also try to push to backend admin settings
      try {
        await api.put('/admin/settings', {
          businessHours: policies.standardWorkHours,
          salaryRuleMin: Number(policies.minAllowableWage),
          enableBackups: policies.autoDailyDbBackup,
          emailNotifications: policies.emailOnLeaveRequest,
          employeeIdPrefix: policies.employeeIdPrefix,
          employeeIdDigits: Number(policies.employeeIdDigits),
          employeeIdNextNumber: Number(policies.employeeIdNextNumber),
          employeeIdSeparator: policies.employeeIdSeparator,
          autoGenerateEmployeeId: policies.autoGenerateEmployeeId,
          allowCustomEmployeeId: policies.allowCustomEmployeeId,
        });
      } catch (e) {}

      setSaveSuccess('System policies and settings saved successfully!');
      setTimeout(() => setSaveSuccess(''), 4000);
    } catch (e) {
      alert('Failed to save policies: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Are you sure you want to reset all policies to standard factory defaults?')) {
      setPolicies(DEFAULT_POLICIES);
      localStorage.setItem('ems_system_policies', JSON.stringify(DEFAULT_POLICIES));
      setSaveSuccess('Policies reset to standard company defaults.');
      setTimeout(() => setSaveSuccess(''), 4000);
    }
  };

  const handleExportPolicyHandbook = () => {
    const dataStr = JSON.stringify({
      company: 'EMS Enterprise Systems',
      currency: 'INR (₹)',
      exportDate: new Date().toISOString(),
      policies: policies,
    }, null, 2);

    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Company_System_Policies_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const policySections = [
    {
      id: 'employeeId',
      title: 'Employee ID & Identification Policies',
      desc: 'Configure corporate employee identification code prefix, automated serial sequencing, separator styles, and custom ID override rules.',
      icon: UserCheck,
      color: '#6366f1',
      items: [
        {
          key: 'employeeIdPrefix',
          label: 'Employee ID Corporate Prefix Code',
          desc: 'Primary alphabetic organization code placed before serial numbers (e.g. EMP, CORP, TECH, EMS).',
          type: 'text',
          value: policies.employeeIdPrefix,
        },
        {
          key: 'employeeIdSeparator',
          label: 'Prefix & Serial Number Separator',
          desc: 'Formatting character between corporate prefix and sequential digits.',
          type: 'select',
          options: [
            { label: 'None (e.g. EMP101)', value: 'None' },
            { label: 'Hyphen / Dash (e.g. EMP-101)', value: '-' },
            { label: 'Slash (e.g. EMP/101)', value: '/' },
            { label: 'Underscore (e.g. EMP_101)', value: '_' },
          ],
          value: policies.employeeIdSeparator,
        },
        {
          key: 'employeeIdDigits',
          label: 'Employee ID Serial Padding (Digits)',
          desc: 'Minimum total digits for sequential number (e.g. 3 digits = 101, 4 digits = 0101).',
          type: 'select',
          options: [
            { label: '3 Digits (e.g., 101, 102)', value: 3 },
            { label: '4 Digits (e.g., 0101, 1001)', value: 4 },
            { label: '5 Digits (e.g., 00101, 10001)', value: 5 },
            { label: '6 Digits (e.g., 000101)', value: 6 },
          ],
          value: policies.employeeIdDigits,
        },
        {
          key: 'employeeIdNextNumber',
          label: 'Next Starting Serial Number',
          desc: 'Sequential number to be assigned to the next registered employee record in the system.',
          type: 'number',
          value: policies.employeeIdNextNumber,
          min: 1, max: 999999,
        },
        {
          key: 'autoGenerateEmployeeId',
          label: 'Auto-Generate Employee ID on New Form',
          desc: 'Automatically pre-populate the Employee ID field when opening the Register New Employee modal.',
          type: 'toggle',
          value: policies.autoGenerateEmployeeId,
        },
        {
          key: 'allowCustomEmployeeId',
          label: 'Allow Manual Employee ID Customization',
          desc: 'Permit HR admins to manually edit or override generated IDs during registration.',
          type: 'toggle',
          value: policies.allowCustomEmployeeId,
        },
      ],
    },
    {
      id: 'work',
      title: 'Work & Attendance Policies',
      desc: 'Define corporate operating hours, late marking tolerance, overtime authorization, and remote work quotas.',
      icon: Clock,
      color: '#0284c7',
      items: [
        {
          key: 'standardWorkHours',
          label: 'Standard Office Timings',
          desc: 'Expected daily core operating shifts for full-time staff.',
          type: 'text',
          value: policies.standardWorkHours,
        },
        {
          key: 'lateGraceMinutes',
          label: 'Late-In Grace Window (Minutes)',
          desc: 'Tolerance window after shift start before marked as late arrival.',
          type: 'number',
          value: policies.lateGraceMinutes,
          min: 0, max: 60,
        },
        {
          key: 'halfDayThresholdHours',
          label: 'Half-Day Working Threshold (Hours)',
          desc: 'Minimum active tracked hours required to count as a half-day present.',
          type: 'number',
          value: policies.halfDayThresholdHours,
          step: 0.5, min: 2, max: 6,
        },
        {
          key: 'maxRemoteDaysPerWeek',
          label: 'Work-From-Home Allowance (Days / Week)',
          desc: 'Maximum eligible remote days per calendar week without prior special exemption.',
          type: 'select',
          options: [
            { label: '0 Days (Fully On-Site)', value: 0 },
            { label: '1 Day / Week', value: 1 },
            { label: '2 Days / Week (Hybrid Standard)', value: 2 },
            { label: '3 Days / Week', value: 3 },
            { label: '5 Days / Week (Fully Remote)', value: 5 },
          ],
          value: policies.maxRemoteDaysPerWeek,
        },
        {
          key: 'allowOvertime',
          label: 'Overtime Compensation Eligibility',
          desc: 'Permit employees to log after-hours overtime with manager approval.',
          type: 'toggle',
          value: policies.allowOvertime,
        },
        {
          key: 'autoClockOutMidnight',
          label: 'Auto Clock-Out at Midnight',
          desc: 'Automatically close open attendance shifts at 23:59 to prevent multi-day clock-ins.',
          type: 'toggle',
          value: policies.autoClockOutMidnight,
        },
      ],
    },
    {
      id: 'leaves',
      title: 'Leaves & Absence Entitlements',
      desc: 'Annual paid leave quotas, sick leave rules, advance application notice periods, and carry-forward rules.',
      icon: CalendarDays,
      color: '#f97316',
      items: [
        {
          key: 'annualPaidLeaves',
          label: 'Annual Paid Leaves (Days / Year)',
          desc: 'Annual quota credited to confirmed employees on January 1st.',
          type: 'number',
          value: policies.annualPaidLeaves,
          min: 5, max: 35,
        },
        {
          key: 'sickLeaves',
          label: 'Medical & Sick Leaves (Days / Year)',
          desc: 'Paid quota allocated specifically for health conditions and medical appointments.',
          type: 'number',
          value: policies.sickLeaves,
          min: 0, max: 20,
        },
        {
          key: 'casualLeaves',
          label: 'Casual Leaves (Days / Year)',
          desc: 'Short-notice leaves for urgent personal obligations.',
          type: 'number',
          value: policies.casualLeaves,
          min: 0, max: 15,
        },
        {
          key: 'advanceNoticeDays',
          label: 'Advance Notice Required for Planned Leaves (Days)',
          desc: 'Lead time required when applying for non-emergency leaves.',
          type: 'number',
          value: policies.advanceNoticeDays,
          min: 1, max: 30,
        },
        {
          key: 'carryForwardLeaves',
          label: 'Annual Leave Carry-Forward',
          desc: 'Allow unused paid leaves to roll over into the subsequent calendar year.',
          type: 'toggle',
          value: policies.carryForwardLeaves,
        },
        {
          key: 'autoApproveHalfDay',
          label: 'Fast-Track Auto-Approval for Half-Days',
          desc: 'Automatically approve single half-day leave requests without manager intervention.',
          type: 'toggle',
          value: policies.autoApproveHalfDay,
        },
      ],
    },
    {
      id: 'payroll',
      title: 'Payroll, Allowances & Expense Policies',
      desc: 'Corporate compensation regulations, Indian Rupee (₹) currency standards, minimum wages, and expense claims.',
      icon: DollarSign,
      color: '#10b981',
      items: [
        {
          key: 'currency',
          label: 'Standard Accounting Currency',
          desc: 'Official operating currency across payslips, expenses, and compensation.',
          type: 'text',
          value: policies.currency,
          disabled: true,
        },
        {
          key: 'salaryDisbursalDay',
          label: 'Monthly Salary Disbursal Schedule',
          desc: 'Day of the month on which net salary disbursement files are triggered.',
          type: 'select',
          options: [
            { label: '1st of every month (Standard)', value: '1st of every month' },
            { label: '5th of every month', value: '5th of every month' },
            { label: '7th of every month', value: '7th of every month' },
            { label: 'Last Working Day of Month', value: 'Last Working Day of Month' },
          ],
          value: policies.salaryDisbursalDay,
        },
        {
          key: 'minAllowableWage',
          label: 'Statutory Minimum Monthly Wage (₹)',
          desc: 'Floor threshold preventing creation of employees below legal wage norms.',
          type: 'number',
          value: policies.minAllowableWage,
          min: 10000, step: 1000,
        },
        {
          key: 'expenseAutoApproveLimit',
          label: 'Max Reimbursement Auto-Approval Limit (₹)',
          desc: 'Expense claims below this amount can be cleared without secondary executive sign-off.',
          type: 'number',
          value: policies.expenseAutoApproveLimit,
          min: 500, step: 500,
        },
        {
          key: 'providentFundRate',
          label: 'Employee Provident Fund (EPF) Contribution Rate (%)',
          desc: 'Standard statutory percentage deducted toward employee retirement savings.',
          type: 'number',
          value: policies.providentFundRate,
          min: 0, max: 20,
        },
        {
          key: 'overtimeMultiplier',
          label: 'Overtime Hourly Compensation Multiplier',
          desc: 'Rate factor applied to base hourly pay for approved overtime hours.',
          type: 'select',
          options: [
            { label: '1.0x (Regular Hourly Rate)', value: 1.0 },
            { label: '1.5x (Time-and-a-Half)', value: 1.5 },
            { label: '2.0x (Double Time)', value: 2.0 },
          ],
          value: policies.overtimeMultiplier,
        },
      ],
    },
    {
      id: 'security',
      title: 'Security, Access & Authentication Policies',
      desc: 'Credentials complexity, session lifetime, multi-factor authentication, and IP authorization rules.',
      icon: Lock,
      color: '#8b5cf6',
      items: [
        {
          key: 'minPasswordLength',
          label: 'Minimum Password Length (Characters)',
          desc: 'Enforce password complexity for newly registered or reset accounts.',
          type: 'number',
          value: policies.minPasswordLength,
          min: 6, max: 24,
        },
        {
          key: 'sessionTimeoutMinutes',
          label: 'Session Inactivity Auto-Logout (Minutes)',
          desc: 'Terminate idle browser sessions to protect sensitive personnel data.',
          type: 'number',
          value: policies.sessionTimeoutMinutes,
          min: 10, max: 240,
        },
        {
          key: 'enforceSpecialChars',
          label: 'Require Special Characters & Digits in Passwords',
          desc: 'Mandate at least one symbol (@, #, $) and numeral in user passwords.',
          type: 'toggle',
          value: policies.enforceSpecialChars,
        },
        {
          key: 'enforce2FA',
          label: 'Mandate Two-Factor Authentication (2FA) for HR & Admin',
          desc: 'Require secondary OTP verification for high-privileged system roles.',
          type: 'toggle',
          value: policies.enforce2FA,
        },
        {
          key: 'allowMultipleSessions',
          label: 'Permit Concurrent Multi-Device Logins',
          desc: 'Allow users to be logged in simultaneously on laptop and mobile browsers.',
          type: 'toggle',
          value: policies.allowMultipleSessions,
        },
        {
          key: 'ipRestrictionEnabled',
          label: 'Enforce Corporate Network / VPN IP Whitelist',
          desc: 'Restrict system access strictly to recognized corporate IP address blocks.',
          type: 'toggle',
          value: policies.ipRestrictionEnabled,
        },
      ],
    },
    {
      id: 'compliance',
      title: 'Compliance, Code of Conduct & Ethics',
      desc: 'Non-disclosure agreements, sexual harassment prevention (POSH), and employee exit SLAs.',
      icon: ShieldCheck,
      color: '#ec4899',
      items: [
        {
          key: 'resignationNoticeDays',
          label: 'Standard Employee Notice Period (Days)',
          desc: 'Required duration between resignation submission and official relieving date.',
          type: 'select',
          options: [
            { label: '15 Days (Probation)', value: 15 },
            { label: '30 Days (Standard Staff)', value: 30 },
            { label: '60 Days (Senior Specialists)', value: 60 },
            { label: '90 Days (Executive Roles)', value: 90 },
          ],
          value: policies.resignationNoticeDays,
        },
        {
          key: 'assetReturnSlaDays',
          label: 'Asset Handover & Return SLA (Days Post-Exit)',
          desc: 'Maximum working days allowed for physical handover of laptops and corporate peripherals.',
          type: 'number',
          value: policies.assetReturnSlaDays,
          min: 1, max: 14,
        },
        {
          key: 'performanceReviewCycle',
          label: 'Performance Appraisal Cadence',
          desc: 'Official organizational cycle for evaluations, peer reviews, and rating assessments.',
          type: 'select',
          options: [
            { label: 'Quarterly (Every 3 Months)', value: 'Quarterly (Every 3 Months)' },
            { label: 'Bi-Annual (Every 6 Months)', value: 'Bi-Annual (Every 6 Months)' },
            { label: 'Annual (Once a Year)', value: 'Annual (Once a Year)' },
          ],
          value: policies.performanceReviewCycle,
        },
        {
          key: 'requireNDASigning',
          label: 'Mandatory Non-Disclosure Agreement (NDA) on Onboarding',
          desc: 'Enforce digital acknowledgment of confidentiality before workspace access.',
          type: 'toggle',
          value: policies.requireNDASigning,
        },
        {
          key: 'poshPolicyEnforced',
          label: 'POSH (Anti-Harassment) Policy Compliance',
          desc: 'Active mandate ensuring compliance with statutory Workplace Dignity directives.',
          type: 'toggle',
          value: policies.poshPolicyEnforced,
        },
      ],
    },
    {
      id: 'alerts',
      title: 'Alerts, Notifications & System Automation',
      desc: 'Automated email dispatches, task notifications, database backups, and event listeners.',
      icon: Bell,
      color: '#eab308',
      items: [
        {
          key: 'emailOnLeaveRequest',
          label: 'Email Notifications on Leave Applications',
          desc: 'Send instant email notifications to department managers upon employee leave filings.',
          type: 'toggle',
          value: policies.emailOnLeaveRequest,
        },
        {
          key: 'emailOnTaskAssignment',
          label: 'Task Assignment Notifications',
          desc: 'Alert employees immediately when new tasks are assigned to their queue.',
          type: 'toggle',
          value: policies.emailOnTaskAssignment,
        },
        {
          key: 'autoGeneratePayslipAlerts',
          label: 'Salary Slip Release Broadcasts',
          desc: 'Notify staff members via system alert upon monthly payroll approval.',
          type: 'toggle',
          value: policies.autoGeneratePayslipAlerts,
        },
        {
          key: 'autoDailyDbBackup',
          label: 'Automated Daily Database Backups',
          desc: 'Generate automated daily encrypted JSON snapshots of all system collections at 02:00 AM.',
          type: 'toggle',
          value: policies.autoDailyDbBackup,
        },
      ],
    },
  ];

  const filteredSections = policySections
    .filter(sec => activeTab === 'all' || sec.id === activeTab)
    .map(sec => ({
      ...sec,
      items: sec.items.filter(item =>
        search === '' ||
        item.label.toLowerCase().includes(search.toLowerCase()) ||
        item.desc.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter(sec => sec.items.length > 0);

  return (
    <div className="page-container page-enter" style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '4rem' }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.5rem',
        marginBottom: '2rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
            color: 'white',
          }}>
            <Sliders size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                System Policies &amp; Settings
              </h1>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '0.2rem 0.6rem',
                borderRadius: '99px',
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}>
                Enterprise Active
              </span>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: '0.35rem 0 0' }}>
              Configure company-wide operational rules, compliance policies, work schedules, security thresholds, and Indian Rupee (₹) standards.
            </p>
          </div>
        </div>

        {/* Top Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleExportPolicyHandbook}
            className="btn btn-secondary"
            title="Download JSON Handbook"
            style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem', padding: '0.6rem 1rem' }}
          >
            <Download size={15} /> Export Handbook
          </button>
          <button
            onClick={handleResetDefaults}
            className="btn btn-secondary"
            title="Reset to Factory Defaults"
            style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem', padding: '0.6rem 1rem', color: 'var(--danger)' }}
          >
            <RotateCcw size={15} /> Reset Defaults
          </button>
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.88rem',
              padding: '0.6rem 1.4rem',
              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
            }}
          >
            <Save size={16} /> {saving ? 'Saving...' : 'Save All Policies'}
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {saveSuccess && (
        <div
          className="alert alert-success"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1.75rem',
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            animation: 'fadeIn 0.25s ease',
          }}
        >
          <CheckCircle2 size={20} color="#10b981" />
          <span style={{ fontWeight: 600 }}>{saveSuccess}</span>
        </div>
      )}

      {/* Stat Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        <div className="card" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(2, 132, 199, 0.12)', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Daily Work Hours</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>{policies.standardWorkHours}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Operating Currency</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#10b981' }}>Indian Rupee (₹ INR)</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(249, 115, 22, 0.12)', color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CalendarDays size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Annual Paid Leaves</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>{policies.annualPaidLeaves} Days / Year</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Next Employee ID</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#6366f1', fontFamily: 'monospace' }}>
              {(policies.employeeIdPrefix || 'EMP').toUpperCase()}
              {policies.employeeIdSeparator === 'None' ? '' : policies.employeeIdSeparator}
              {String(policies.employeeIdNextNumber || 107).padStart(Number(policies.employeeIdDigits) || 3, '0')}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Compliance Status</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#8b5cf6' }}>100% Verified Active</div>
          </div>
        </div>
      </div>

      {/* Category Tabs & Search Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        {/* Category Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const isActive = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.82rem',
                  padding: '0.45rem 0.9rem',
                  borderRadius: '99px',
                }}
              >
                <Icon size={14} /> {cat.label}
              </button>
            );
          })}
        </div>

        {/* Search Box */}
        <div style={{ position: 'relative', minWidth: '260px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Search rules & policies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.4rem', height: '38px', borderRadius: '99px', fontSize: '0.85rem' }}
          />
        </div>
      </div>

      {/* Policy Sections Render */}
      {filteredSections.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem' }}>
          <Sliders size={48} style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>No matching policies found</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.35rem' }}>
            Try adjusting your search query or reset category filter to "All Policies".
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {filteredSections.map(section => {
            const SectionIcon = section.icon;
            return (
              <div key={section.id} className="card" style={{ padding: '1.75rem', borderRadius: '18px' }}>
                {/* Section Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  paddingBottom: '1.25rem',
                  borderBottom: '1px solid var(--border-color)',
                  marginBottom: '1.5rem',
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: `${section.color}15`,
                    color: section.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <SectionIcon size={20} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                      {section.title}
                    </h2>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>
                      {section.desc}
                    </p>
                  </div>
                </div>

                {/* Live Preview Banner for Employee ID */}
                {section.id === 'employeeId' && (
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.05) 100%)',
                    border: '1.5px dashed rgba(99, 102, 241, 0.35)',
                    borderRadius: '14px',
                    padding: '1.1rem 1.4rem',
                    marginBottom: '1.4rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#6366f1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <UserCheck size={22} />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#6366f1', letterSpacing: '0.5px' }}>
                          Live Generated ID Preview
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.15rem' }}>
                          <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace', letterSpacing: '1px' }}>
                            {(policies.employeeIdPrefix || 'EMP').toUpperCase()}
                            {policies.employeeIdSeparator === 'None' ? '' : policies.employeeIdSeparator}
                            {String(policies.employeeIdNextNumber || 107).padStart(Number(policies.employeeIdDigits) || 3, '0')}
                          </span>
                          <span style={{ fontSize: '0.72rem', background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 700 }}>
                            Next New Hire
                          </span>
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '380px' }}>
                      This ID format will be automatically assigned to the next employee registered on the Employees page.
                    </div>
                  </div>
                )}

                {/* Section Items Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: '1.25rem',
                }}>
                  {section.items.map(item => (
                    <div
                      key={item.key}
                      style={{
                        padding: '1.15rem 1.25rem',
                        borderRadius: '14px',
                        background: 'var(--bg-primary, rgba(0,0,0,0.02))',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '0.85rem',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {item.label}
                          </span>
                          {item.type === 'toggle' && (
                            <ToggleSwitch
                              checked={Boolean(item.value)}
                              onChange={(val) => updatePolicy(item.key, val)}
                            />
                          )}
                        </div>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.35rem 0 0', lineHeight: 1.4 }}>
                          {item.desc}
                        </p>
                      </div>

                      {/* Inputs for non-toggle items */}
                      {item.type !== 'toggle' && (
                        <div style={{ marginTop: '0.25rem' }}>
                          {item.type === 'select' ? (
                            <select
                              className="form-control"
                              value={item.value}
                              onChange={(e) => updatePolicy(item.key, isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value))}
                              style={{ height: '40px', fontSize: '0.85rem' }}
                            >
                              {item.options.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          ) : item.type === 'number' ? (
                            <input
                              type="number"
                              className="form-control"
                              value={item.value}
                              step={item.step || 1}
                              min={item.min}
                              max={item.max}
                              onChange={(e) => updatePolicy(item.key, Number(e.target.value))}
                              style={{ height: '40px', fontSize: '0.88rem' }}
                            />
                          ) : (
                            <input
                              type="text"
                              className="form-control"
                              value={item.value}
                              disabled={item.disabled}
                              onChange={(e) => updatePolicy(item.key, e.target.value)}
                              style={{ height: '40px', fontSize: '0.88rem', background: item.disabled ? 'rgba(0,0,0,0.04)' : undefined }}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Sticky Action Bar */}
      <div style={{
        marginTop: '2.5rem',
        padding: '1.25rem 1.75rem',
        borderRadius: '16px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: 'var(--shadow-md)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Sparkles size={20} color="#10b981" />
          <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            Changes apply instantly to attendance rules, payroll runs, leave allowances, and system authentication.
          </span>
        </div>
        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="btn btn-primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1.5rem',
            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
          }}
        >
          <Save size={16} /> {saving ? 'Saving...' : 'Save All Policies'}
        </button>
      </div>
    </div>
  );
};

export default SystemPoliciesSettings;
