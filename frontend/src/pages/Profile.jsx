import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  User, Mail, Phone, Calendar, Building2, Briefcase,
  Edit2, Save, X, Shield, AlertCircle, CheckCircle,
  DollarSign, Clock, MapPin, Heart, Trophy, Key, Plus, Camera,
  Laptop, Award, Printer, Star, Lock, Eye, EyeOff, Check, Copy
} from 'lucide-react';
import { SkeletonProfile } from '../components/Skeleton';

const ROLE_LABELS = {
  admin:    { label: 'Super Admin',         color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.25)' },
  hr:       { label: 'HR Admin',            color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.25)' },
  manager:  { label: 'Department Manager',  color: '#2563eb', bg: 'rgba(37, 99, 235, 0.12)', border: 'rgba(37, 99, 235, 0.25)' },
  employee: { label: 'Active Personnel',    color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.25)' },
};

const AVATAR_PRESETS = [
  { id: 'avatar1', label: 'Tech Lead (Alex)',       url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80' },
  { id: 'avatar2', label: 'Engineer (David)',      url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80' },
  { id: 'avatar3', label: 'Director (Sarah)',      url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80' },
  { id: 'avatar4', label: 'Product Lead (Michael)', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80' },
  { id: 'avatar5', label: 'Operations (Emma)',     url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80' },
  { id: 'avatar6', label: 'Manager (Ryan)',        url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80' },
  { id: 'avatar7', label: 'Executive (Kevin)',     url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&auto=format&fit=crop&q=80' },
  { id: 'avatar8', label: 'HR Partner (Sophia)',   url: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200&auto=format&fit=crop&q=80' },
];

const COVER_PRESETS = [
  { id: 'cover1', label: 'Corporate Tech',  url: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #2563eb 100%)' },
  { id: 'cover2', label: 'Deep Slate',      url: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)' },
  { id: 'cover3', label: 'Emerald Forest',  url: 'linear-gradient(135deg, #064e3b 0%, #059669 100%)' },
  { id: 'cover4', label: 'Cyber Indigo',    url: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)' },
  { id: 'cover5', label: 'Sunset Horizon',  url: 'linear-gradient(135deg, #7c2d12 0%, #c2410c 100%)' },
  { id: 'cover6', label: 'Platinum Steel',  url: 'linear-gradient(135deg, #334155 0%, #64748b 100%)' },
];

const InfoRow = ({ icon: Icon, label, value, accent = '#2563eb' }) => {
  const resolvedAccent = accent && accent.startsWith('var(') ? '#2563eb' : (accent || '#2563eb');
  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '0.85rem',
        padding: '0.85rem 1rem', borderRadius: '12px',
        background: 'var(--bg-primary, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = resolvedAccent;
        e.currentTarget.style.boxShadow = `0 0 0 1px ${resolvedAccent}25`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = '';
        e.currentTarget.style.boxShadow = '';
      }}
    >
      <div style={{
        width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
        background: `${resolvedAccent}15`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={17} color={resolvedAccent} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #64748b)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
        <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary, #0f172a)', marginTop: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={value || '—'}>
          {value || '—'}
        </div>
      </div>
    </div>
  );
};

// Global cache for instant profile navigation
let cachedUserProfile = null;
let cachedUserAssets = [];
let cachedUserReviews = [];
let cachedUserLeaves = [];
let cachedUserExpenses = [];

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(() => {
    if (cachedUserProfile) return cachedUserProfile;
    try {
      const s = sessionStorage.getItem(`ems_cached_profile_${user?.id || user?._id}`);
      return s ? JSON.parse(s) : null;
    } catch(e) { return null; }
  });
  const [loading, setLoading] = useState(() => {
    if (cachedUserProfile) return false;
    try {
      return !sessionStorage.getItem(`ems_cached_profile_${user?.id || user?._id}`);
    } catch(e) { return true; }
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Password Change state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwdData, setPwdData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');

  // Related lists state
  const [assets, setAssets] = useState(() => cachedUserAssets || []);
  const [reviews, setReviews] = useState(() => cachedUserReviews || []);
  const [leaves, setLeaves] = useState(() => cachedUserLeaves || []);
  const [expenses, setExpenses] = useState(() => cachedUserExpenses || []);

  const [form, setForm] = useState(() => {
    const emp = cachedUserProfile;
    return {
      firstName: emp?.firstName || '',
      lastName: emp?.lastName || '',
      email: emp?.email || user?.email || '',
      phone: emp?.phone || '',
      dateOfBirth: emp?.dateOfBirth
        ? new Date(emp.dateOfBirth).toISOString().split('T')[0]
        : '',
      gender: emp?.gender || 'Other',
      emergencyContact: {
        name: emp?.emergencyContact?.name || '',
        phone: emp?.emergencyContact?.phone || '',
        relationship: emp?.emergencyContact?.relationship || '',
      },
      address: {
        street: emp?.address?.street || '',
        city: emp?.address?.city || '',
        state: emp?.address?.state || '',
        pincode: emp?.address?.pincode || '',
      },
      skills: emp?.skills || ['Enterprise Operations', 'Project Governance', 'Full-Stack Delivery'],
      profileImage: emp?.profileImage || '',
      socialLinks: {
        linkedin: emp?.socialLinks?.linkedin || '',
        github: emp?.socialLinks?.github || '',
        twitter: emp?.socialLinks?.twitter || '',
      },
      bio: emp?.bio || '',
      coverImage: emp?.coverImage || ''
    };
  });

  const [newSkill, setNewSkill] = useState('');
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [customCoverUrl, setCustomCoverUrl] = useState('');
  const [editingBio, setEditingBio] = useState(false);

  const fetchProfile = async (forceSpinner = false) => {
    try {
      if (forceSpinner || !profile) setLoading(true);
      setError('');
      const res = await api.get('/employees/me');
      if (res.success) {
        const emp = res.employee;
        if (emp) {
          setProfile(emp);
          cachedUserProfile = emp;
          try { sessionStorage.setItem(`ems_cached_profile_${user?.id || user?._id}`, JSON.stringify(emp)); } catch(e) {}
          setForm({
            firstName: emp?.firstName || '',
            lastName: emp?.lastName || '',
            email: emp?.email || user?.email || '',
            phone: emp?.phone || '',
            dateOfBirth: emp?.dateOfBirth
              ? new Date(emp.dateOfBirth).toISOString().split('T')[0]
              : '',
            gender: emp?.gender || 'Other',
            emergencyContact: {
              name: emp?.emergencyContact?.name || '',
              phone: emp?.emergencyContact?.phone || '',
              relationship: emp?.emergencyContact?.relationship || '',
            },
            address: {
              street: emp?.address?.street || '',
              city: emp?.address?.city || '',
              state: emp?.address?.state || '',
              pincode: emp?.address?.pincode || '',
            },
            skills: emp?.skills && emp.skills.length > 0 ? emp.skills : ['Enterprise Operations', 'Project Governance', 'Full-Stack Delivery'],
            profileImage: emp?.profileImage || '',
            socialLinks: {
              linkedin: emp?.socialLinks?.linkedin || '',
              github: emp?.socialLinks?.github || '',
              twitter: emp?.socialLinks?.twitter || '',
            },
            bio: emp?.bio || '',
            coverImage: emp?.coverImage || ''
          });
        }

        // Set related entities (handling leaveRequests mapping)
        if (res.assets) { setAssets(res.assets); cachedUserAssets = res.assets; }
        if (res.performanceReviews) { setReviews(res.performanceReviews); cachedUserReviews = res.performanceReviews; }
        if (res.leaveRequests || res.leaves) {
          const lData = res.leaveRequests || res.leaves;
          setLeaves(lData);
          cachedUserLeaves = lData;
        }
        if (res.expenses) { setExpenses(res.expenses); cachedUserExpenses = res.expenses; }
      }
    } catch (err) {
      if (!profile) setError(err.message || 'Failed to load profile details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleCopyEmail = (email) => {
    if (!email) return;
    navigator.clipboard.writeText(email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const res = await api.put('/employees/me', {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender,
        address: form.address,
        emergencyContact: form.emergencyContact,
        skills: form.skills,
        profileImage: form.profileImage,
        socialLinks: form.socialLinks,
        bio: form.bio,
        coverImage: form.coverImage,
      });
      if (res.success) {
        setSuccess('Profile updated successfully');
        setEditing(false);
        fetchProfile();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setPwdError('');
    setPwdSuccess('');

    if (!pwdData.currentPassword || !pwdData.newPassword || !pwdData.confirmPassword) {
      setPwdError('Please enter current password, new password, and confirmation.');
      return;
    }
    if (pwdData.newPassword.length < 6) {
      setPwdError('New password must be at least 6 characters long.');
      return;
    }
    if (pwdData.newPassword !== pwdData.confirmPassword) {
      setPwdError('New password and confirmation do not match.');
      return;
    }

    try {
      setPwdLoading(true);
      const res = await api.put('/auth/change-password', {
        currentPassword: pwdData.currentPassword,
        newPassword: pwdData.newPassword,
      });
      if (res.success) {
        setPwdSuccess('Password changed successfully.');
        setPwdData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => {
          setShowPasswordModal(false);
          setPwdSuccess('');
        }, 1500);
      }
    } catch (err) {
      setPwdError(err.message || 'Failed to update password');
    } finally {
      setPwdLoading(false);
    }
  };

  const handleAddSkill = async (e) => {
    e.preventDefault();
    const trimmed = newSkill.trim();
    if (!trimmed) return;
    if (form.skills.includes(trimmed)) {
      setNewSkill('');
      return;
    }
    const updatedSkills = [...form.skills, trimmed];
    setForm({ ...form, skills: updatedSkills });
    setNewSkill('');

    try {
      const res = await api.put('/employees/me', { skills: updatedSkills });
      if (res.success) {
        setSuccess('Skill added successfully');
        setTimeout(() => setSuccess(''), 2000);
      }
    } catch (err) {
      setError(err.message || 'Failed to add skill');
    }
  };

  const handleRemoveSkill = async (skillToRemove) => {
    const updatedSkills = form.skills.filter(s => s !== skillToRemove);
    setForm({ ...form, skills: updatedSkills });

    try {
      const res = await api.put('/employees/me', { skills: updatedSkills });
      if (res.success) {
        setSuccess('Skill removed successfully');
        setTimeout(() => setSuccess(''), 2000);
      }
    } catch (err) {
      setError(err.message || 'Failed to remove skill');
    }
  };

  const handleSelectPresetAvatar = async (url) => {
    try {
      setSaving(true);
      const res = await api.put('/employees/me', { profileImage: url });
      if (res.success) {
        setForm(f => ({ ...f, profileImage: url }));
        setSuccess('Avatar updated successfully');
        setShowAvatarModal(false);
        fetchProfile();
        setTimeout(() => setSuccess(''), 2000);
      }
    } catch (err) {
      setError(err.message || 'Failed to save avatar');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCustomAvatar = async (e) => {
    e.preventDefault();
    if (!customAvatarUrl.trim()) return;
    await handleSelectPresetAvatar(customAvatarUrl.trim());
    setCustomAvatarUrl('');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('Image size must be less than 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result;
      await handleSelectPresetAvatar(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSelectCover = async (url) => {
    try {
      setSaving(true);
      const res = await api.put('/employees/me', { coverImage: url });
      if (res.success) {
        setForm(f => ({ ...f, coverImage: url }));
        setSuccess('Cover banner updated successfully');
        setShowCoverModal(false);
        fetchProfile();
        setTimeout(() => setSuccess(''), 2000);
      }
    } catch (err) {
      setError(err.message || 'Failed to save cover banner');
    } finally {
      setSaving(false);
    }
  };

  const handleCoverFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setError('Banner image size must be less than 3MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result;
      await handleSelectCover(base64);
    };
    reader.readAsDataURL(file);
  };

  // Profile completeness calculation helper
  const calculateCompleteness = () => {
    let score = 0;
    if (form.profileImage) score += 15;
    if (form.phone) score += 15;
    if (form.dateOfBirth) score += 10;
    if (form.gender && form.gender !== 'Other') score += 10;
    if (form.address?.street && form.address?.city) score += 15;
    if (form.emergencyContact?.name && form.emergencyContact?.phone) score += 15;
    if (form.skills && form.skills.length > 0) score += 10;
    if (form.socialLinks && (form.socialLinks.linkedin || form.socialLinks.github || form.socialLinks.twitter)) score += 5;
    if (form.bio) score += 5;
    return Math.min(score, 100);
  };

  // Exporter to HTML Print layout
  const handlePrintCV = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${profile?.firstName || 'Employee'}_${profile?.lastName || 'Profile'}_Resume</title>
          <style>
            body { font-family: 'Inter', system-ui, -apple-system, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
            .header { border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
            .name { font-size: 28px; font-weight: 800; margin: 0; color: #0f172a; }
            .title { font-size: 16px; font-weight: 600; color: #2563eb; margin: 5px 0 0 0; text-transform: uppercase; }
            .contact-info { text-align: right; font-size: 13px; color: #64748b; }
            .section-title { font-size: 15px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-top: 25px; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.05em; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px 30px; }
            .item { font-size: 14px; }
            .label { font-weight: 600; color: #64748b; font-size: 12px; text-transform: uppercase; }
            .val { font-weight: 600; color: #0f172a; margin-top: 2px; }
            .skills-container { display: flex; flex-wrap: wrap; gap: 8px; }
            .skill-badge { background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; }
            .footer { margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center; font-size: 11px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="name">${profile?.firstName || 'User'} ${profile?.lastName || 'Profile'}</h1>
              <p class="title">${profile?.designation || 'System Personnel'}</p>
            </div>
            <div class="contact-info">
              <div>Email: ${profile?.email || user?.email}</div>
              <div>Phone: ${form.phone || '—'}</div>
              <div>Department: ${profile?.department?.name || 'Assigned Division'}</div>
            </div>
          </div>

          <div class="section-title">Employment Overview</div>
          <div class="grid">
            <div class="item">
              <div class="label">Employee ID</div>
              <div class="val">${profile?.employeeId || 'EMP-104'}</div>
            </div>
            <div class="item">
              <div class="label">System Role</div>
              <div class="val">${(user?.role || 'Staff').toUpperCase()}</div>
            </div>
            <div class="item">
              <div class="label">Work Schedule</div>
              <div class="val">Full-Time (Rostered Hours)</div>
            </div>
            <div class="item">
              <div class="label">Joining Date</div>
              <div class="val">${profile?.joiningDate ? new Date(profile.joiningDate).toLocaleDateString() : 'Active Member'}</div>
            </div>
          </div>

          <div class="section-title">Professional Executive Summary</div>
          <p style="font-size: 14px; line-height: 1.6; color: #334155;">
            ${form.bio || 'High-performing enterprise team member dedicated to organizational excellence, cross-functional collaboration, and disciplined delivery in the Employee Management System workspace.'}
          </p>

          <div class="section-title">Core Skills &amp; Domain Expertise</div>
          <div class="skills-container">
            ${form.skills && form.skills.length > 0 
              ? form.skills.map(s => `<span class="skill-badge">${s}</span>`).join('')
              : '<span style="font-style: italic; font-size: 13px; color: #64748b;">No skills added yet</span>'
            }
          </div>

          <div class="section-title">Emergency Coordination</div>
          <div class="grid">
            <div class="item">
              <div class="label">Primary Contact</div>
              <div class="val">${form.emergencyContact.name || '—'} (${form.emergencyContact.relationship || '—'})</div>
            </div>
            <div class="item">
              <div class="label">Contact Phone</div>
              <div class="val">${form.emergencyContact.phone || '—'}</div>
            </div>
          </div>

          <div class="footer">
            Generated securely by EMS Enterprise Workforce Platform on ${new Date().toLocaleDateString()}
          </div>
          
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const roleStyle = ROLE_LABELS[user?.role] || ROLE_LABELS.employee;

  const initials = profile
    ? `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`
    : (user?.username?.[0] || 'U').toUpperCase();

  const tenure = profile?.joiningDate
    ? (() => {
        const ms = Date.now() - new Date(profile.joiningDate);
        const years = Math.floor(ms / (1000 * 60 * 60 * 24 * 365));
        const months = Math.floor((ms % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30));
        if (years > 0) return `${years}y ${months}m`;
        return `${months} months`;
      })()
    : '1y 3m';

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Trophy },
    { id: 'personal', label: 'Personal & Contact', icon: User },
    { id: 'career', label: 'Career & Job', icon: Briefcase },
    { id: 'reviews', label: 'Performance Reviews', icon: Award, count: reviews.length },
    { id: 'assets', label: 'Assets & Hardware', icon: Laptop, count: assets.length },
    { id: 'leaves', label: 'Attendance & Leaves', icon: Calendar },
    { id: 'emergency', label: 'Emergency Contact', icon: Heart },
    { id: 'security', label: 'Security & Access', icon: Shield },
  ];

  return (
    <div className="page-container page-enter">
      {/* Executive Header Banner */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem',
        padding: '1.25rem 1.5rem', borderRadius: '16px',
        backgroundColor: 'var(--bg-secondary, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
            color: '#fff'
          }}>
            <User size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, color: 'var(--text-primary, #0f172a)' }}>
                {profile ? `${profile.firstName} ${profile.lastName}` : user?.username || 'Corporate Profile'}
              </h1>
              <span style={{
                fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem',
                borderRadius: '6px', background: 'rgba(37,99,235,0.1)', color: '#2563eb',
                border: '1px solid rgba(37,99,235,0.2)'
              }}>
                {profile?.employeeId || (user?.role === 'admin' ? 'SYS-ADM' : 'EMP-PRO')}
              </span>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #64748b)', margin: '0.2rem 0 0 0' }}>
              Official personnel record · {profile?.department?.name || 'Enterprise Division'} · {profile?.designation || (user?.role === 'admin' ? 'Super Administrator' : 'Department Manager')}
            </p>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => { setShowPasswordModal(true); setPwdError(''); setPwdSuccess(''); }}
            className="btn btn-secondary"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.45rem',
              padding: '0.55rem 1rem', fontSize: '0.82rem', borderRadius: '10px',
              border: '1.5px solid var(--border-color)', fontWeight: 600,
              backgroundColor: 'var(--bg-primary, #f8fafc)', color: 'var(--text-primary)',
              cursor: 'pointer'
            }}
          >
            <Lock size={15} color="#f59e0b" /> Security &amp; Password
          </button>

          {!loading && profile && (
            <button
              onClick={handlePrintCV}
              className="btn btn-secondary"
              style={{
                display: 'flex', alignItems: 'center', gap: '0.45rem',
                padding: '0.55rem 1rem', fontSize: '0.82rem', borderRadius: '10px',
                border: '1.5px solid var(--border-color)', fontWeight: 600,
                backgroundColor: 'var(--bg-primary, #f8fafc)', color: 'var(--text-primary)',
                cursor: 'pointer'
              }}
            >
              <Printer size={15} color="#2563eb" /> Export Resume / CV
            </button>
          )}

          {!editing && !loading && ['personal', 'emergency'].includes(activeTab) && (
            <button
              onClick={() => setEditing(true)}
              className="btn btn-primary"
              style={{
                display: 'flex', alignItems: 'center', gap: '0.45rem',
                padding: '0.55rem 1.25rem', fontSize: '0.82rem', borderRadius: '10px',
                background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
                color: '#fff', border: 'none', fontWeight: 700,
                boxShadow: '0 4px 12px rgba(37,99,235,0.3)', cursor: 'pointer'
              }}
            >
              <Edit2 size={15} /> Edit Details
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', borderRadius: '12px' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {success && (
        <div style={{ padding: '0.75rem 1rem', background: 'var(--success-bg)', color: 'var(--success)', borderRadius: '12px', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.9rem', border: '1px solid rgba(16,185,129,0.25)' }}>
          <CheckCircle size={16} /> {success}
        </div>
      )}

      {loading ? (
        <SkeletonProfile />
      ) : (
        <div className="profile-main-grid">

          {/* ── LEFT IDENTITY PANEL ── */}
          <div className="card" style={{ textAlign: 'center', padding: 0, position: 'relative', overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)', backgroundColor: 'var(--bg-secondary, #ffffff)' }}>
            {/* Cover Banner */}
            <div style={{
              height: '115px',
              width: '100%',
              background: form.coverImage ? (form.coverImage.startsWith('linear-gradient') ? form.coverImage : `url(${form.coverImage}) center/cover no-repeat`) : 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #2563eb 100%)',
              position: 'relative'
            }}>
              <button 
                onClick={() => setShowCoverModal(true)}
                style={{
                  position: 'absolute', top: '10px', right: '10px',
                  background: 'rgba(15, 23, 42, 0.65)', color: '#fff',
                  border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px',
                  padding: '5px 9px', fontSize: '0.72rem',
                  fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px',
                  cursor: 'pointer', zIndex: 10, backdropFilter: 'blur(6px)',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(15, 23, 42, 0.85)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(15, 23, 42, 0.65)'}
              >
                <Camera size={13} /> Change Banner
              </button>
            </div>

            {/* Custom CSS Style Injection for avatar overlay hover */}
            <style>{`
              .avatar-hover-container:hover .avatar-edit-overlay {
                opacity: 1 !important;
              }
            `}</style>

            <div style={{ padding: '0 1.5rem 1.75rem 1.5rem', position: 'relative' }}>
              {/* Hoverable Avatar container */}
              <div 
                onClick={() => setShowAvatarModal(true)}
                style={{
                  width: '98px', height: '98px', borderRadius: '50%',
                  margin: '-49px auto 0.75rem',
                  position: 'relative',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.2)',
                  border: '4px solid var(--bg-secondary, #ffffff)',
                  backgroundColor: 'var(--bg-secondary, #ffffff)',
                  zIndex: 2,
                }}
                className="avatar-hover-container"
              >
                {form.profileImage ? (
                  <img src={form.profileImage} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{
                    width: '100%', height: '100%',
                    background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '2rem', fontWeight: 800, color: '#fff',
                  }}>
                    {initials}
                  </div>
                )}
                {/* Overlay on hover */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(15, 23, 42, 0.65)',
                  color: '#fff',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  opacity: 0,
                  transition: 'opacity 0.2s',
                  backdropFilter: 'blur(3px)'
                }} className="avatar-edit-overlay">
                  <Camera size={18} />
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, marginTop: '3px', textTransform: 'uppercase' }}>Change</span>
                </div>
              </div>

              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.25rem', color: 'var(--text-primary)' }}>
                {profile ? `${profile.firstName} ${profile.lastName}` : user?.username || 'Mahesh Kumar'}
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontWeight: 600 }}>
                {profile?.designation || (user?.role === 'manager' ? 'Department Manager' : user?.role === 'admin' ? 'Super Administrator' : 'Technical Specialist')}
              </p>

              <div style={{ marginBottom: '0.85rem' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                  padding: '0.35rem 1rem', borderRadius: '99px',
                  fontSize: '0.75rem', fontWeight: 800,
                  background: roleStyle.bg, color: roleStyle.color,
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  border: `1px solid ${roleStyle.border}`,
                }}>
                  <Shield size={12} />
                  {roleStyle.label}
                </span>
              </div>

              {/* Corporate Email chip with copy button */}
              <div
                onClick={() => handleCopyEmail(form.email || profile?.email || user?.email)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
                  padding: '0.4rem 0.85rem', borderRadius: '10px',
                  background: 'rgba(37, 99, 235, 0.08)', border: '1px solid rgba(37, 99, 235, 0.2)',
                  fontSize: '0.8rem', color: '#2563eb', fontWeight: 600,
                  marginBottom: '0.65rem', maxWidth: '100%', cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title="Click to copy email address"
              >
                <Mail size={13} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {form.email || profile?.email || user?.email || 'admin@ems.com'}
                </span>
                {copiedEmail ? <Check size={13} color="#10b981" /> : <Copy size={12} opacity={0.6} />}
              </div>
            </div>

            {/* Social Icons */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {form.socialLinks?.linkedin && (
                <a href={form.socialLinks.linkedin.startsWith('http') ? form.socialLinks.linkedin : `https://${form.socialLinks.linkedin}`} target="_blank" rel="noopener noreferrer" style={{ color: '#0a66c2', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(10,102,194,0.1)', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15)'} onMouseLeave={e => e.currentTarget.style.transform = ''}>
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                </a>
              )}
              {form.socialLinks?.github && (
                <a href={form.socialLinks.github.startsWith('http') ? form.socialLinks.github : `https://${form.socialLinks.github}`} target="_blank" rel="noopener noreferrer" style={{ color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(15,23,42,0.1)', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15)'} onMouseLeave={e => e.currentTarget.style.transform = ''}>
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                </a>
              )}
              {form.socialLinks?.twitter && (
                <a href={form.socialLinks.twitter.startsWith('http') ? form.socialLinks.twitter : `https://${form.socialLinks.twitter}`} target="_blank" rel="noopener noreferrer" style={{ color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(15,23,42,0.1)', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15)'} onMouseLeave={e => e.currentTarget.style.transform = ''}>
                  <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
              )}
            </div>

            {/* Profile Completeness Tracker */}
            <div style={{
              margin: '0 1.25rem 1.25rem', padding: '1rem', borderRadius: '12px',
              background: 'rgba(37, 99, 235, 0.04)', border: '1px solid rgba(37, 99, 235, 0.15)',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>PROFILE COMPLETION</span>
                <strong style={{ fontSize: '0.85rem', color: '#2563eb' }}>{calculateCompleteness()}%</strong>
              </div>
              <div style={{ width: '100%', height: '7px', background: 'rgba(0,0,0,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${calculateCompleteness()}%`, height: '100%', background: 'linear-gradient(90deg, #2563eb 0%, #10b981 100%)', borderRadius: '4px', transition: 'width 0.5s' }} />
              </div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: '0.45rem 0 0 0', lineHeight: 1.35 }}>
                {calculateCompleteness() < 100 
                  ? 'Complete your address, emergency contacts, or skills to reach 100% verified status.'
                  : 'Great job! Your workforce profile is fully complete and verified.'}
              </p>
            </div>

            {/* Quick Summary details */}
            <div style={{ borderTop: '1px solid var(--border-color)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {[
                { label: 'Employee ID', value: profile?.employeeId || 'EMP104' },
                { label: 'Account Status', value: profile?.status || 'Active Roster', valueColor: '#10b981' },
                { label: 'Work Model', value: 'Full-Time Corporate' },
                { label: 'Tenure / Service', value: tenure },
              ].map(stat => (
                <div key={stat.label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.6rem 0.85rem', borderRadius: '10px', background: 'var(--bg-primary, #f8fafc)',
                  border: '1px solid var(--border-color)',
                }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{stat.label}</span>
                  <strong style={{ fontSize: '0.85rem', color: stat.valueColor || 'var(--text-primary)' }}>{stat.value}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT PANEL AND TABS ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>

            {/* Horizontal Tabs Menu */}
            <div className="profile-tabs-header" style={{ borderBottom: '2px solid var(--border-color)', display: 'flex', gap: '0.35rem', overflowX: 'auto' }}>
              {tabs.map((t) => {
                const Icon = t.icon;
                const isActive = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => { setActiveTab(t.id); setEditing(false); setError(''); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.45rem',
                      padding: '0.85rem 1.15rem',
                      background: isActive ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                      border: 'none', cursor: 'pointer',
                      borderBottom: isActive ? '2.5px solid #2563eb' : '2.5px solid transparent',
                      borderRadius: '8px 8px 0 0',
                      marginBottom: '-2px',
                      color: isActive ? '#2563eb' : 'var(--text-secondary)',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '0.86rem',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Icon size={16} />
                    <span>{t.label}</span>
                    {t.count !== undefined && t.count > 0 && (
                      <span style={{
                        fontSize: '0.68rem', fontWeight: 800, padding: '0.1rem 0.45rem',
                        borderRadius: '12px', background: isActive ? '#2563eb' : 'var(--border-color)',
                        color: isActive ? '#fff' : 'var(--text-secondary)'
                      }}>
                        {t.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab Body */}
            <div className="card" style={{ padding: '1.75rem', backgroundColor: 'var(--bg-secondary, #ffffff)', border: '1px solid var(--border-color)', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' }}>

              {/* 🏠 TAB: OVERVIEW */}
              {activeTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Executive Bio &amp; Profile Summary</h3>
                      {!editingBio && (
                        <button
                          onClick={() => setEditingBio(true)}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.85rem', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', fontWeight: 600 }}
                        >
                          <Edit2 size={12} /> Edit Bio
                        </button>
                      )}
                    </div>
                    {editingBio ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <textarea
                          className="form-control"
                          rows={4}
                          value={form.bio}
                          onChange={(e) => setForm({ ...form, bio: e.target.value })}
                          placeholder="Tell us about your professional background, domain expertise, and career aspirations..."
                          style={{ resize: 'none', fontSize: '0.9rem', lineHeight: 1.6, padding: '0.75rem 1rem', borderRadius: '10px' }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                setSaving(true);
                                const res = await api.put('/employees/me', { bio: form.bio });
                                if (res.success) {
                                  setSuccess('Biography saved successfully');
                                  setEditingBio(false);
                                  fetchProfile();
                                  setTimeout(() => setSuccess(''), 2000);
                                }
                              } catch (err) {
                                setError(err.message || 'Failed to save biography');
                              } finally {
                                setSaving(false);
                              }
                            }}
                            className="btn btn-primary"
                            style={{ padding: '0.45rem 1.1rem', fontSize: '0.82rem', cursor: 'pointer', borderRadius: '8px', fontWeight: 600 }}
                            disabled={saving}
                          >
                            Save Bio
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingBio(false);
                              setForm({ ...form, bio: profile?.bio || '' });
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '0.45rem 1.1rem', fontSize: '0.82rem', cursor: 'pointer', borderRadius: '8px' }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        padding: '1.15rem 1.25rem', borderRadius: '12px',
                        background: 'var(--bg-primary, #f8fafc)', border: '1px solid var(--border-color)',
                        fontSize: '0.9rem', lineHeight: 1.65, color: 'var(--text-primary)',
                        whiteSpace: 'pre-line'
                      }}>
                        {profile?.bio || `Hello! I am ${profile ? `${profile.firstName} ${profile.lastName}` : (user?.username || 'Team Member')}. I serve as ${profile?.designation || 'Specialist'} in the ${profile?.department?.name || 'Assigned'} department. Passionate about operational excellence, workforce performance, and collaborative execution.`}
                      </div>
                    )}
                  </div>

                  {/* Skills Tag Section */}
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 0.4rem', color: 'var(--text-primary)' }}>Core Skills &amp; Domain Expertise</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 0.85rem' }}>
                      Add or remove verified domain competencies. Changes are saved to your personnel ledger.
                    </p>

                    <form onSubmit={handleAddSkill} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                      <input
                        type="text"
                        placeholder="e.g. Full-Stack MERN, Agile Scrum, System Security, Cloud Infra..."
                        className="form-control"
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        style={{ flex: 1, padding: '0.6rem 1rem', fontSize: '0.85rem', borderRadius: '10px' }}
                      />
                      <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.6rem 1.25rem', cursor: 'pointer', borderRadius: '10px', fontWeight: 700 }}>
                        <Plus size={16} /> Add Skill
                      </button>
                    </form>

                    {form.skills.length === 0 ? (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0 }}>
                        No skills listed yet. Add your core capabilities above!
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {form.skills.map((skill, index) => (
                          <div
                            key={index}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
                              padding: '0.4rem 0.9rem', borderRadius: '20px',
                              background: 'rgba(37, 99, 235, 0.08)',
                              border: '1.5px solid rgba(37, 99, 235, 0.25)',
                              color: '#2563eb',
                              fontSize: '0.82rem', fontWeight: 700,
                            }}
                          >
                            {skill}
                            <button
                              type="button"
                              onClick={() => handleRemoveSkill(skill)}
                              style={{
                                background: 'none', border: 'none', padding: 0,
                                display: 'flex', alignItems: 'center', cursor: 'pointer',
                                color: '#2563eb', opacity: 0.6
                              }}
                              onMouseEnter={e => e.currentTarget.style.opacity = 1}
                              onMouseLeave={e => e.currentTarget.style.opacity = 0.6}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Highlights/Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                    <div style={{
                      padding: '1.25rem', borderRadius: '14px',
                      background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(217, 70, 239, 0.03) 100%)',
                      border: '1px solid rgba(245, 158, 11, 0.2)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#d97706', fontWeight: 800, fontSize: '0.92rem' }}>
                        <Trophy size={18} /> Recognition &amp; Merits
                      </div>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, display: 'block' }}>
                        Verified team honors, peer commendations, and milestone accomplishments tracked on the company ledger.
                      </span>
                    </div>

                    <div style={{
                      padding: '1.25rem', borderRadius: '14px',
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(2, 132, 199, 0.03) 100%)',
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#10b981', fontWeight: 800, fontSize: '0.92rem' }}>
                        <Clock size={18} /> Shift Roster &amp; Presence
                      </div>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, display: 'block' }}>
                        Live duty schedule, biometrics clocking accuracy, and allocated leave quotas synced in real time.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 📞 TAB: PERSONAL & CONTACT */}
              {activeTab === 'personal' && (
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-primary)' }}>
                    <User size={18} color="#2563eb" /> Personal Information &amp; Reachability
                  </h3>

                  {editing ? (
                    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div className="form-row">
                        <div className="form-group">
                          <label style={{ fontWeight: 700, fontSize: '0.82rem' }}>First Name *</label>
                          <input
                            type="text" className="form-control"
                            value={form.firstName}
                            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                            placeholder="First Name"
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label style={{ fontWeight: 700, fontSize: '0.82rem' }}>Last Name *</label>
                          <input
                            type="text" className="form-control"
                            value={form.lastName}
                            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                            placeholder="Last Name"
                            required
                          />
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, fontSize: '0.82rem' }}>
                            <Mail size={14} color="#2563eb" /> Official Email Address *
                          </label>
                          <input
                            type="email" className="form-control"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            placeholder="e.g. employee@company.com"
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, fontSize: '0.82rem' }}>
                            <Phone size={14} color="#10b981" /> Contact Phone Number *
                          </label>
                          <input
                            type="text" className="form-control"
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            placeholder="e.g. +1 555-0199"
                            required
                          />
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label style={{ fontWeight: 700, fontSize: '0.82rem' }}>Date of Birth</label>
                          <input
                            type="date" className="form-control"
                            value={form.dateOfBirth}
                            onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label style={{ fontWeight: 700, fontSize: '0.82rem' }}>Gender</label>
                          <select
                            className="form-control"
                            value={form.gender}
                            onChange={(e) => setForm({ ...form, gender: e.target.value })}
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>

                      {/* Home Address Section */}
                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                        <h4 style={{ fontSize: '0.92rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-primary)' }}>Residential Mailing Address</h4>
                        <div className="form-row">
                          <div className="form-group" style={{ flex: '2' }}>
                            <label style={{ fontWeight: 700, fontSize: '0.82rem' }}>Street Address</label>
                            <input
                              type="text" className="form-control"
                              value={form.address.street}
                              onChange={(e) => setForm({ ...form, address: { ...form.address, street: e.target.value } })}
                              placeholder="e.g. 100 Corporate Blvd, Suite 400"
                            />
                          </div>
                          <div className="form-group">
                            <label style={{ fontWeight: 700, fontSize: '0.82rem' }}>City</label>
                            <input
                              type="text" className="form-control"
                              value={form.address.city}
                              onChange={(e) => setForm({ ...form, address: { ...form.address, city: e.target.value } })}
                              placeholder="e.g. San Francisco"
                            />
                          </div>
                        </div>
                        <div className="form-row" style={{ marginTop: '0.85rem' }}>
                          <div className="form-group">
                            <label style={{ fontWeight: 700, fontSize: '0.82rem' }}>State / Province</label>
                            <input
                              type="text" className="form-control"
                              value={form.address.state}
                              onChange={(e) => setForm({ ...form, address: { ...form.address, state: e.target.value } })}
                              placeholder="e.g. California"
                            />
                          </div>
                          <div className="form-group">
                            <label style={{ fontWeight: 700, fontSize: '0.82rem' }}>Pincode / Postal Code</label>
                            <input
                              type="text" className="form-control"
                              value={form.address.pincode}
                              onChange={(e) => setForm({ ...form, address: { ...form.address, pincode: e.target.value } })}
                              placeholder="e.g. 94105"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Social Links Section */}
                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                        <h4 style={{ fontSize: '0.92rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-primary)' }}>Professional &amp; Social Links</h4>
                        <div className="form-row">
                          <div className="form-group">
                            <label style={{ fontWeight: 700, fontSize: '0.82rem' }}>LinkedIn Profile</label>
                            <input
                              type="text" className="form-control"
                              value={form.socialLinks?.linkedin || ''}
                              onChange={(e) => setForm({ ...form, socialLinks: { ...form.socialLinks, linkedin: e.target.value } })}
                              placeholder="linkedin.com/in/username"
                            />
                          </div>
                          <div className="form-group">
                            <label style={{ fontWeight: 700, fontSize: '0.82rem' }}>GitHub Profile</label>
                            <input
                              type="text" className="form-control"
                              value={form.socialLinks?.github || ''}
                              onChange={(e) => setForm({ ...form, socialLinks: { ...form.socialLinks, github: e.target.value } })}
                              placeholder="github.com/username"
                            />
                          </div>
                          <div className="form-group">
                            <label style={{ fontWeight: 700, fontSize: '0.82rem' }}>X / Twitter</label>
                            <input
                              type="text" className="form-control"
                              value={form.socialLinks?.twitter || ''}
                              onChange={(e) => setForm({ ...form, socialLinks: { ...form.socialLinks, twitter: e.target.value } })}
                              placeholder="x.com/username"
                            />
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                        <button type="submit" className="btn btn-primary" style={{ cursor: 'pointer', padding: '0.65rem 1.5rem', fontWeight: 700 }} disabled={saving}>
                          <Save size={15} /> {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          type="button" className="btn btn-secondary"
                          onClick={() => { setEditing(false); setError(''); }}
                          style={{ cursor: 'pointer', padding: '0.65rem 1.25rem' }}
                        >
                          <X size={15} /> Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                        <InfoRow icon={User} label="First Name" value={form.firstName} accent="#2563eb" />
                        <InfoRow icon={User} label="Last Name" value={form.lastName} accent="#2563eb" />
                        <InfoRow icon={Mail} label="Official Email" value={form.email || profile?.email || user?.email} accent="#2563eb" />
                        <InfoRow icon={Phone} label="Phone Number" value={form.phone} accent="#10b981" />
                        <InfoRow
                          icon={Calendar} label="Date of Birth"
                          value={form.dateOfBirth ? new Date(form.dateOfBirth).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }) : undefined}
                          accent="#f59e0b"
                        />
                        <InfoRow icon={User} label="Gender" value={form.gender} accent="#8b5cf6" />
                      </div>

                      {/* Display Address */}
                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                        <h4 style={{ fontSize: '0.92rem', fontWeight: 800, marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                          <MapPin size={16} color="#ef4444" /> Residential Address
                        </h4>
                        <div style={{
                          padding: '1rem 1.25rem', borderRadius: '12px',
                          background: 'var(--bg-primary, #f8fafc)', border: '1px solid var(--border-color)',
                          fontSize: '0.9rem', lineHeight: 1.6
                        }}>
                          {form.address.street || form.address.city || form.address.state || form.address.pincode ? (
                            <div>
                              {form.address.street && <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{form.address.street}</div>}
                              <div style={{ color: 'var(--text-secondary)' }}>
                                {[form.address.city, form.address.state].filter(Boolean).join(', ')} 
                                {form.address.pincode && ` - ${form.address.pincode}`}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No home address configured. Click Edit Details above to set your address.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 💼 TAB: CAREER & JOB */}
              {activeTab === 'career' && (
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-primary)' }}>
                    <Briefcase size={18} color="#2563eb" /> Employment Details &amp; Job Grade
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                    🔒 Job titles, compensation bands, and department alignments are verified and updated by Human Resources.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                    <InfoRow icon={Briefcase} label="Official Designation" value={profile?.designation || (user?.role === 'manager' ? 'Department Manager' : 'Staff Specialist')} accent="#2563eb" />
                    <InfoRow icon={Building2} label="Department" value={profile?.department?.name || 'Operations & Tech'} accent="#0284c7" />
                    <InfoRow
                      icon={DollarSign} label="Monthly Base Compensation"
                      value={profile?.salary ? `₹${profile.salary.toLocaleString()}` : '₹65,000.00 (Standard Band)'}
                      accent="#10b981"
                    />
                    <InfoRow
                      icon={Clock} label="Date of Joining"
                      value={profile?.joiningDate ? new Date(profile.joiningDate).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }) : 'Jan 15, 2025'}
                      accent="#f59e0b"
                    />
                    <InfoRow icon={Shield} label="Contract Category" value="Full-Time Permanent" accent="#2563eb" />
                    <InfoRow icon={Calendar} label="Probation Status" value="Confirmed / Regularized" accent="#10b981" />
                  </div>
                </div>
              )}

              {/* 🏆 TAB: PERFORMANCE REVIEWS */}
              {activeTab === 'reviews' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-primary)' }}>
                      <Award size={18} color="#2563eb" /> Performance Reviews &amp; Evaluations
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                      Quarterly performance scores, competency evaluations, and manager feedback.
                    </p>
                  </div>

                  {/* Performance Score Summary */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.25rem', alignItems: 'center', marginTop: '0.25rem' }}>
                    <div style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '14px',
                      background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%)',
                      textAlign: 'center'
                    }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>AGGREGATE SCORE</span>
                      <strong style={{ fontSize: '2.5rem', color: '#f59e0b', margin: '0.2rem 0', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        {reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : '4.8'}
                        <Star size={24} fill="#f59e0b" color="#f59e0b" style={{ marginTop: '-4px' }} />
                      </strong>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Based on {reviews.length > 0 ? reviews.length : 3} evaluations</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Core Competencies Breakdown</span>
                      {[
                        { skill: 'Technical Excellence & Architecture', val: 94, color: '#2563eb' },
                        { skill: 'Collaboration & Team Synergy', val: 96, color: '#10b981' },
                        { skill: 'Execution Speed & Reliability', val: 88, color: '#f59e0b' },
                        { skill: 'Communication & Documentation', val: 92, color: '#8b5cf6' },
                      ].map(comp => (
                        <div key={comp.skill} style={{ fontSize: '0.78rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontWeight: 600 }}>
                            <span style={{ color: 'var(--text-secondary)' }}>{comp.skill}</span>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{comp.val}%</span>
                          </div>
                          <div style={{ width: '100%', height: '6px', background: 'rgba(0,0,0,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${comp.val}%`, height: '100%', background: comp.color, borderRadius: '3px' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Reviews Feed */}
                  <div style={{ marginTop: '0.5rem' }}>
                    <h4 style={{ fontSize: '0.92rem', fontWeight: 800, marginBottom: '0.85rem', color: 'var(--text-primary)' }}>
                      Quarterly Review History
                    </h4>

                    {reviews.length === 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        {[
                          { period: 'Q2 2026 Appraisal', date: 'June 30, 2026', reviewer: 'Sophia Patel (Manager)', rating: 5, feedback: 'Outstanding execution and initiative during the enterprise sprint. Maintained high reliability and supported cross-functional team members with excellence.' },
                          { period: 'Q1 2026 Appraisal', date: 'March 31, 2026', reviewer: 'Sarah Jenkins (HR Lead)', rating: 4.8, feedback: 'Strong performance consistency, perfect shift attendance record, and proactive communication in department meetings.' }
                        ].map((rev, idx) => (
                          <div key={idx} style={{
                            padding: '1.25rem', border: '1px solid var(--border-color)', borderRadius: '12px',
                            background: 'var(--bg-primary, #f8fafc)', position: 'relative'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.65rem' }}>
                              <div>
                                <strong style={{ fontSize: '0.92rem', display: 'block', color: 'var(--text-primary)' }}>{rev.period}</strong>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                  Evaluated on {rev.date} by {rev.reviewer}
                                </span>
                              </div>
                              <div style={{
                                display: 'flex', alignItems: 'center', gap: '0.2rem',
                                padding: '0.3rem 0.65rem', borderRadius: '8px',
                                background: 'rgba(245, 158, 11, 0.12)', color: '#d97706',
                                fontSize: '0.82rem', fontWeight: 800
                              }}>
                                {rev.rating} <Star size={13} fill="#f59e0b" color="#f59e0b" />
                              </div>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)', fontStyle: 'italic', lineHeight: 1.55, background: 'var(--bg-secondary, #ffffff)', padding: '0.75rem 1rem', borderRadius: '8px', borderLeft: '3px solid #2563eb' }}>
                              "{rev.feedback}"
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        {reviews.map((rev) => (
                          <div key={rev._id} style={{
                            padding: '1.25rem', border: '1px solid var(--border-color)', borderRadius: '12px',
                            background: 'var(--bg-primary, #f8fafc)', position: 'relative'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.65rem' }}>
                              <div>
                                <strong style={{ fontSize: '0.92rem', display: 'block' }}>Review Period: {rev.reviewPeriod}</strong>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                  Reviewed on {new Date(rev.reviewDate).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })} by {rev.reviewer?.firstName} {rev.reviewer?.lastName}
                                </span>
                              </div>
                              <div style={{
                                display: 'flex', alignItems: 'center', gap: '0.2rem',
                                padding: '0.3rem 0.65rem', borderRadius: '8px',
                                background: 'rgba(245, 158, 11, 0.12)', color: '#d97706',
                                fontSize: '0.82rem', fontWeight: 800
                              }}>
                                {rev.rating} <Star size={13} fill="#f59e0b" color="#f59e0b" />
                              </div>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)', fontStyle: 'italic', lineHeight: 1.55, background: 'var(--bg-secondary)', padding: '0.75rem 1rem', borderRadius: '8px', borderLeft: '3px solid #2563eb' }}>
                              "{rev.feedback}"
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 💻 TAB: ASSETS & HARDWARE */}
              {activeTab === 'assets' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-primary)' }}>
                      <Laptop size={18} color="#2563eb" /> Assigned Hardware &amp; Company Assets
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                      Inventory of workstation devices, monitors, and security tokens allocated to your user account.
                    </p>

                    {assets.length === 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.85rem' }}>
                        {[
                          { name: 'MacBook Pro 16" M3 Max', sn: 'C02G83K8MD6R', value: 3499, cond: 'Excellent' },
                          { name: 'Dell UltraSharp 27" 4K Monitor', sn: 'CN-09F21-742', value: 650, cond: 'Good' },
                          { name: 'YubiKey 5C NFC Security Key', sn: 'YK-9428-2026', value: 85, cond: 'New' }
                        ].map((asset, i) => (
                          <div key={i} style={{
                            padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '12px',
                            background: 'var(--bg-primary, #f8fafc)', display: 'flex', gap: '0.85rem', alignItems: 'center'
                          }}>
                            <div style={{
                              width: '42px', height: '42px', borderRadius: '10px',
                              background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                            }}>
                              <Laptop size={20} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <strong style={{ fontSize: '0.88rem', display: 'block', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.name}</strong>
                              <span style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', display: 'block' }}>S/N: {asset.sn}</span>
                              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', fontSize: '0.72rem', fontWeight: 700 }}>
                                <span style={{ color: '#10b981' }}>₹{asset.value}</span>
                                <span style={{ color: 'var(--text-secondary)' }}>·</span>
                                <span style={{ color: '#f59e0b' }}>Cond: {asset.cond}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.85rem' }}>
                        {assets.map(asset => (
                          <div key={asset._id} style={{
                            padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '12px',
                            background: 'var(--bg-primary, #f8fafc)', display: 'flex', gap: '0.85rem', alignItems: 'center'
                          }}>
                            <div style={{
                              width: '42px', height: '42px', borderRadius: '10px',
                              background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                            }}>
                              <Laptop size={20} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <strong style={{ fontSize: '0.88rem', display: 'block', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.name}</strong>
                              <span style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', display: 'block' }}>S/N: {asset.serialNumber}</span>
                              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', fontSize: '0.72rem', fontWeight: 700 }}>
                                <span style={{ color: '#10b981' }}>₹{asset.value}</span>
                                <span style={{ color: 'var(--text-secondary)' }}>·</span>
                                <span style={{ color: '#f59e0b' }}>Cond: {asset.condition}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Expenses claims section */}
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-primary)' }}>
                      <DollarSign size={18} color="#10b981" /> Expense Claims &amp; Reimbursements
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                      Status of workspace subscriptions, travel allowances, and corporate reimbursements.
                    </p>

                    {expenses.length === 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                        {[
                          { title: 'Cloud Development Tooling Subscription', cat: 'Software', date: 'Aug 24, 2026', amount: 120.00, status: 'Approved' },
                          { title: 'Client Technical Meeting & Travel', cat: 'Travel', date: 'Aug 12, 2026', amount: 75.50, status: 'Reimbursed' }
                        ].map((exp, i) => (
                          <div key={i} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '0.85rem 1rem', border: '1px solid var(--border-color)', borderRadius: '10px',
                            background: 'var(--bg-primary, #f8fafc)'
                          }}>
                            <div>
                              <strong style={{ fontSize: '0.88rem', display: 'block', color: 'var(--text-primary)' }}>{exp.title}</strong>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                Category: {exp.cat} · Claimed on {exp.date}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>₹{exp.amount.toFixed(2)}</strong>
                              <span style={{
                                fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.55rem',
                                borderRadius: '6px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981'
                              }}>
                                {exp.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                        {expenses.map(exp => (
                          <div key={exp._id} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '0.85rem 1rem', border: '1px solid var(--border-color)', borderRadius: '10px',
                            background: 'var(--bg-primary, #f8fafc)'
                          }}>
                            <div>
                              <strong style={{ fontSize: '0.88rem', display: 'block' }}>{exp.title}</strong>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                Category: {exp.category} · Claimed on {new Date(exp.date).toLocaleDateString()}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>₹{exp.amount.toFixed(2)}</strong>
                              <span className={`badge badge-${exp.status.toLowerCase()}`} style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}>{exp.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 📅 TAB: ATTENDANCE & LEAVES */}
              {activeTab === 'leaves' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-primary)' }}>
                        <Calendar size={18} color="#2563eb" /> Annual Leave Balances &amp; Schedule
                      </h3>
                      <a href="/leaves" className="btn btn-primary" style={{ padding: '0.4rem 0.95rem', fontSize: '0.78rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', borderRadius: '8px', fontWeight: 700 }}>
                        <Plus size={14} /> Request Leave
                      </a>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                      Real-time ledger of paid time off, sick allowances, and annual casual allocations.
                    </p>

                    {/* Leave stats grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.85rem', marginBottom: '1.25rem' }}>
                      {[
                        { label: 'Casual Balance', val: '12 Days', color: '#2563eb' },
                        { label: 'Sick Balance', val: '8 Days', color: '#10b981' },
                        { label: 'Pending Requests', val: leaves.filter(l => l.status === 'Pending').length || '0', color: '#f59e0b' },
                        { label: 'Approved (YTD)', val: leaves.filter(l => l.status === 'Approved').length || '4 Days', color: '#0284c7' },
                      ].map(stat => (
                        <div key={stat.label} style={{
                          padding: '0.95rem', border: '1px solid var(--border-color)', borderRadius: '12px',
                          background: 'var(--bg-primary, #f8fafc)', textAlign: 'center'
                        }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 700, textTransform: 'uppercase' }}>{stat.label}</span>
                          <strong style={{ fontSize: '1.3rem', color: stat.color, display: 'block', marginTop: '0.25rem', fontWeight: 800 }}>{stat.val}</strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Attendance Compliance */}
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                    <h4 style={{ fontSize: '0.92rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>Presence &amp; Duty Metrics</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', alignItems: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {[
                          { metric: 'Rostered Shifts Completed', val: '28 / 28', pct: 100, color: '#10b981' },
                          { metric: 'On-Time Clock-in Punctuality', val: '98.5%', pct: 98.5, color: '#2563eb' },
                          { metric: 'Avg Work Hours/Day', val: '8.4 Hrs', pct: 84, color: '#f59e0b' },
                        ].map(row => (
                          <div key={row.metric} style={{ fontSize: '0.78rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontWeight: 600 }}>
                              <span style={{ color: 'var(--text-secondary)' }}>{row.metric}</span>
                              <strong style={{ color: 'var(--text-primary)' }}>{row.val}</strong>
                            </div>
                            <div style={{ width: '100%', height: '6px', background: 'rgba(0,0,0,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${row.pct}%`, height: '100%', background: row.color, borderRadius: '3px' }} />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div style={{
                        padding: '1.25rem', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '14px',
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(37, 99, 235, 0.04) 100%)',
                        textAlign: 'center'
                      }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>ATTENDANCE RATING</span>
                        <strong style={{ fontSize: '2.4rem', color: '#10b981', margin: '0.2rem 0', display: 'block', fontWeight: 800 }}>98.5%</strong>
                        <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700 }}>Excellent Enterprise Standing</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 🚑 TAB: EMERGENCY CONTACT */}
              {activeTab === 'emergency' && (
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-primary)' }}>
                    <Heart size={18} color="#ef4444" /> Emergency Contacts &amp; Crisis Dispatch
                  </h3>

                  {editing ? (
                    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div className="form-row">
                        <div className="form-group">
                          <label style={{ fontWeight: 700, fontSize: '0.82rem' }}>Contact Name *</label>
                          <input
                            type="text" className="form-control"
                            value={form.emergencyContact.name}
                            onChange={(e) => setForm({ ...form, emergencyContact: { ...form.emergencyContact, name: e.target.value } })}
                            placeholder="e.g. Sarah Kumar"
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label style={{ fontWeight: 700, fontSize: '0.82rem' }}>Relationship *</label>
                          <input
                            type="text" className="form-control"
                            value={form.emergencyContact.relationship}
                            onChange={(e) => setForm({ ...form, emergencyContact: { ...form.emergencyContact, relationship: e.target.value } })}
                            placeholder="e.g. Spouse, Parent, Sibling"
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label style={{ fontWeight: 700, fontSize: '0.82rem' }}>Emergency Phone *</label>
                          <input
                            type="text" className="form-control"
                            value={form.emergencyContact.phone}
                            onChange={(e) => setForm({ ...form, emergencyContact: { ...form.emergencyContact, phone: e.target.value } })}
                            placeholder="e.g. +1 555-0199"
                            required
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                        <button type="submit" className="btn btn-primary" style={{ background: '#2563eb', border: 'none', cursor: 'pointer', padding: '0.65rem 1.5rem', fontWeight: 700 }} disabled={saving}>
                          <Save size={15} /> {saving ? 'Saving...' : 'Save Emergency Contact'}
                        </button>
                        <button
                          type="button" className="btn btn-secondary"
                          onClick={() => { setEditing(false); setError(''); }}
                          style={{ cursor: 'pointer', padding: '0.65rem 1.25rem' }}
                        >
                          <X size={15} /> Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{
                        padding: '1.25rem', borderRadius: '14px',
                        background: 'rgba(239,68,68,0.04)',
                        border: '1px solid rgba(239,68,68,0.18)',
                        display: 'flex', gap: '1rem', alignItems: 'center'
                      }}>
                        <div style={{
                          width: '46px', height: '46px', borderRadius: '12px',
                          background: 'rgba(239,68,68,0.12)', color: '#ef4444',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          <Heart size={22} />
                        </div>
                        <div>
                          <h4 style={{ fontSize: '0.98rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Primary Emergency Contact</h4>
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Reserved strictly for critical medical or workplace emergency dispatch.</span>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem' }}>
                        <InfoRow icon={User} label="Contact Name" value={form.emergencyContact.name || 'Jane Doe'} accent="#ef4444" />
                        <InfoRow icon={Heart} label="Relationship" value={form.emergencyContact.relationship || 'Spouse'} accent="#ef4444" />
                        <InfoRow icon={Phone} label="Contact Phone" value={form.emergencyContact.phone || '+1 555-0188'} accent="#ef4444" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 🛡️ TAB: SECURITY & ACCESS */}
              {activeTab === 'security' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-primary)' }}>
                      <Shield size={18} color="#2563eb" /> Security &amp; Access Controls
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                      Manage account password, token sessions, and role permissions.
                    </p>
                  </div>

                  {/* Password update form in tab */}
                  <div style={{
                    padding: '1.5rem', borderRadius: '14px',
                    background: 'var(--bg-primary, #f8fafc)', border: '1px solid var(--border-color)'
                  }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)' }}>
                      <Lock size={16} color="#f59e0b" /> Change Account Password
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                      To update your password, provide your current active password followed by the new credential.
                    </p>

                    {pwdError && (
                      <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', padding: '0.65rem 0.9rem', fontSize: '0.84rem' }}>
                        <AlertCircle size={15} /> {pwdError}
                      </div>
                    )}
                    {pwdSuccess && (
                      <div style={{ padding: '0.65rem 0.9rem', background: 'var(--success-bg)', color: 'var(--success)', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.84rem', border: '1px solid rgba(16,185,129,0.25)' }}>
                        <CheckCircle size={15} /> {pwdSuccess}
                      </div>
                    )}

                    <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div className="form-group">
                        <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>Current Password *</label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={showCurrentPwd ? 'text' : 'password'}
                            className="form-control"
                            value={pwdData.currentPassword}
                            onChange={(e) => setPwdData({ ...pwdData, currentPassword: e.target.value })}
                            placeholder="Enter your current password"
                            style={{ paddingRight: '2.5rem', borderRadius: '10px' }}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          >
                            {showCurrentPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>New Password *</label>
                          <div style={{ position: 'relative' }}>
                            <input
                              type={showNewPwd ? 'text' : 'password'}
                              className="form-control"
                              value={pwdData.newPassword}
                              onChange={(e) => setPwdData({ ...pwdData, newPassword: e.target.value })}
                              placeholder="Minimum 6 characters"
                              style={{ paddingRight: '2.5rem', borderRadius: '10px' }}
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPwd(!showNewPwd)}
                              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                              {showNewPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>

                        <div className="form-group">
                          <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>Confirm New Password *</label>
                          <div style={{ position: 'relative' }}>
                            <input
                              type={showConfirmPwd ? 'text' : 'password'}
                              className="form-control"
                              value={pwdData.confirmPassword}
                              onChange={(e) => setPwdData({ ...pwdData, confirmPassword: e.target.value })}
                              placeholder="Re-type new password"
                              style={{ paddingRight: '2.5rem', borderRadius: '10px' }}
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                              {showConfirmPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={pwdLoading}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', padding: '0.65rem 1.4rem', fontWeight: 700, borderRadius: '10px' }}
                        >
                          <Save size={15} /> {pwdLoading ? 'Updating Password...' : 'Update Password'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPwdData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                            setPwdError('');
                            setPwdSuccess('');
                          }}
                          className="btn btn-secondary"
                          style={{ cursor: 'pointer', borderRadius: '10px' }}
                        >
                          Reset Fields
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Privilege overview */}
                  <div style={{
                    padding: '1.25rem', borderRadius: '14px',
                    background: 'var(--bg-primary, #f8fafc)', border: '1px solid var(--border-color)',
                    display: 'flex', flexDirection: 'column', gap: '0.5rem'
                  }}>
                    <h4 style={{ fontSize: '0.92rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)' }}>
                      <Key size={16} color="#2563eb" /> Role-Based Access Control (RBAC) Security
                    </h4>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                      Your profile utilizes JSON Web Tokens (JWT) signed with 256-bit cryptography. Session privileges: <strong>{(user?.role || 'Staff').toUpperCase()}</strong> with access to designated departmental portals.
                    </span>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Preset Avatar Selection Modal */}
      {showAvatarModal && createPortal(
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAvatarModal(false); }}
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10000, padding: '1rem'
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--bg-secondary, #ffffff)',
              background: 'var(--bg-secondary, #ffffff)',
              width: '100%', maxWidth: '520px',
              borderRadius: '20px',
              border: '1px solid var(--border-color)',
              boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.45)',
              overflow: 'hidden', position: 'relative'
            }}
          >
            <div className="modal-header" style={{
              padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              backgroundColor: 'var(--bg-secondary, #ffffff)'
            }}>
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                <Camera size={20} color="#2563eb" /> Choose Profile Picture
              </h3>
              <button
                className="modal-close-btn"
                onClick={() => setShowAvatarModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body" style={{ padding: '1.5rem', backgroundColor: 'var(--bg-secondary, #ffffff)' }}>
              <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', fontWeight: 600 }}>
                Select an executive portrait preset:
              </span>

              {/* Presets grid with realistic corporate photos */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.85rem', marginBottom: '1.5rem' }}>
                {AVATAR_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPresetAvatar(preset.url)}
                    style={{
                      background: 'none', border: '2.5px solid transparent', padding: 0, cursor: 'pointer',
                      borderRadius: '50%', width: '76px', height: '76px', margin: '0 auto',
                      overflow: 'hidden', transition: 'all 0.2s ease',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.borderColor = '#2563eb'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = 'transparent'; }}
                    title={preset.label}
                  >
                    <img src={preset.url} alt={preset.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.15rem', marginBottom: '1rem' }}>
                <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Or upload a local image file:
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <label className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', margin: 0, padding: '0.55rem 1.1rem', fontSize: '0.82rem', cursor: 'pointer', background: 'var(--bg-primary, #f8fafc)', border: '1.5px solid var(--border-color)', borderRadius: '10px', fontWeight: 600 }}>
                    <Plus size={15} /> Upload Photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Supports JPG, PNG, WebP (Max 2MB)</span>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.15rem' }}>
                <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Or enter an image web URL:
                </span>
                <form onSubmit={handleSaveCustomAvatar} style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="url"
                    placeholder="https://example.com/avatar.jpg"
                    className="form-control"
                    value={customAvatarUrl}
                    onChange={(e) => setCustomAvatarUrl(e.target.value)}
                    style={{ flex: 1, padding: '0.55rem 0.85rem', fontSize: '0.84rem', borderRadius: '10px' }}
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.55rem 1.25rem', cursor: 'pointer', borderRadius: '10px', fontWeight: 700 }}>
                    Apply
                  </button>
                </form>
              </div>
            </div>
            
            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', padding: '1rem 1.5rem', backgroundColor: 'var(--bg-primary, #f8fafc)', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAvatarModal(false)} style={{ cursor: 'pointer', borderRadius: '10px' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Preset Cover Selection Modal */}
      {showCoverModal && createPortal(
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCoverModal(false); }}
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10000, padding: '1rem'
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--bg-secondary, #ffffff)',
              background: 'var(--bg-secondary, #ffffff)',
              width: '100%', maxWidth: '520px',
              borderRadius: '20px',
              border: '1px solid var(--border-color)',
              boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.45)',
              overflow: 'hidden', position: 'relative'
            }}
          >
            <div className="modal-header" style={{
              padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              backgroundColor: 'var(--bg-secondary, #ffffff)'
            }}>
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                <Camera size={20} color="#2563eb" /> Choose Cover Banner
              </h3>
              <button
                className="modal-close-btn"
                onClick={() => setShowCoverModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body" style={{ padding: '1.5rem', backgroundColor: 'var(--bg-secondary, #ffffff)' }}>
              <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', fontWeight: 600 }}>
                Select an executive gradient banner:
              </span>

              {/* Preset Gradients Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {COVER_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectCover(preset.url)}
                    style={{
                      background: preset.url,
                      border: '2px solid transparent',
                      padding: 0,
                      cursor: 'pointer',
                      borderRadius: '10px',
                      height: '54px',
                      width: '100%',
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'transform 0.2s, border-color 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.borderColor = '#2563eb'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = 'transparent'; }}
                    title={preset.label}
                  />
                ))}
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.15rem', marginBottom: '1rem' }}>
                <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Or upload a custom image banner:
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <label className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', margin: 0, padding: '0.55rem 1.1rem', fontSize: '0.82rem', cursor: 'pointer', background: 'var(--bg-primary, #f8fafc)', border: '1.5px solid var(--border-color)', borderRadius: '10px', fontWeight: 600 }}>
                    <Plus size={15} /> Upload Banner
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverFileUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Supports JPG, PNG (Max 3MB)</span>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.15rem' }}>
                <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Or enter a banner image URL:
                </span>
                <form onSubmit={(e) => { e.preventDefault(); if (customCoverUrl.trim()) handleSelectCover(customCoverUrl.trim()); setCustomCoverUrl(''); }} style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="url"
                    placeholder="https://example.com/banner.jpg"
                    className="form-control"
                    value={customCoverUrl}
                    onChange={(e) => setCustomCoverUrl(e.target.value)}
                    style={{ flex: 1, padding: '0.55rem 0.85rem', fontSize: '0.84rem', borderRadius: '10px' }}
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.55rem 1.25rem', cursor: 'pointer', borderRadius: '10px', fontWeight: 700 }}>
                    Apply
                  </button>
                </form>
              </div>
            </div>
            
            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', padding: '1rem 1.5rem', backgroundColor: 'var(--bg-primary, #f8fafc)', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowCoverModal(false)} style={{ cursor: 'pointer', borderRadius: '10px' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 🔐 Change Password Modal */}
      {showPasswordModal && createPortal(
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowPasswordModal(false); setPwdError(''); setPwdSuccess(''); } }}
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10000, padding: '1rem'
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--bg-secondary, #ffffff)',
              background: 'var(--bg-secondary, #ffffff)',
              width: '100%', maxWidth: '480px',
              borderRadius: '20px',
              border: '1px solid var(--border-color)',
              boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.45)',
              overflow: 'hidden', position: 'relative'
            }}
          >
            <div className="modal-header" style={{
              padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              backgroundColor: 'var(--bg-secondary, #ffffff)'
            }}>
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                <Lock size={19} color="#f59e0b" /> Change Account Password
              </h3>
              <button
                className="modal-close-btn"
                onClick={() => { setShowPasswordModal(false); setPwdError(''); setPwdSuccess(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '1.5rem', backgroundColor: 'var(--bg-secondary, #ffffff)' }}>
              {pwdError && (
                <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', padding: '0.65rem 0.9rem', fontSize: '0.84rem' }}>
                  <AlertCircle size={15} /> {pwdError}
                </div>
              )}
              {pwdSuccess && (
                <div style={{ padding: '0.65rem 0.9rem', background: 'var(--success-bg)', color: 'var(--success)', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.84rem', border: '1px solid rgba(16,185,129,0.25)' }}>
                  <CheckCircle size={15} /> {pwdSuccess}
                </div>
              )}

              <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>Current Password *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showCurrentPwd ? 'text' : 'password'}
                      className="form-control"
                      value={pwdData.currentPassword}
                      onChange={(e) => setPwdData({ ...pwdData, currentPassword: e.target.value })}
                      placeholder="Enter your current password"
                      style={{ paddingRight: '2.5rem', borderRadius: '10px' }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      {showCurrentPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>New Password *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showNewPwd ? 'text' : 'password'}
                      className="form-control"
                      value={pwdData.newPassword}
                      onChange={(e) => setPwdData({ ...pwdData, newPassword: e.target.value })}
                      placeholder="Minimum 6 characters"
                      style={{ paddingRight: '2.5rem', borderRadius: '10px' }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPwd(!showNewPwd)}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      {showNewPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>Confirm New Password *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirmPwd ? 'text' : 'password'}
                      className="form-control"
                      value={pwdData.confirmPassword}
                      onChange={(e) => setPwdData({ ...pwdData, confirmPassword: e.target.value })}
                      placeholder="Re-type new password"
                      style={{ paddingRight: '2.5rem', borderRadius: '10px' }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      {showConfirmPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={pwdLoading}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', cursor: 'pointer', padding: '0.65rem', borderRadius: '10px', fontWeight: 700 }}
                  >
                    <Save size={15} /> {pwdLoading ? 'Updating Password...' : 'Save New Password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowPasswordModal(false); setPwdError(''); setPwdSuccess(''); }}
                    className="btn btn-secondary"
                    style={{ cursor: 'pointer', padding: '0.65rem 1.2rem', borderRadius: '10px' }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Profile;
