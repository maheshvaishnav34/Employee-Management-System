import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  User, Mail, Phone, Calendar, Building2, Briefcase,
  Edit2, Save, X, Shield, AlertCircle, CheckCircle,
  DollarSign, Clock, MapPin, Heart, Trophy, Key, Plus, Camera,
  Laptop, Award, Printer, Star
} from 'lucide-react';
import { SkeletonProfile } from '../components/Skeleton';

const ROLE_LABELS = {
  admin:    { label: 'Super Admin', color: '#ff5b5b', bg: 'rgba(255,91,91,0.12)' },
  hr:       { label: 'HR Admin',    color: '#ffb119', bg: 'rgba(255,177,25,0.12)' },
  manager:  { label: 'Department Manager',     color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  employee: { label: 'Employee',    color: '#2ebd7f', bg: 'rgba(46,189,127,0.12)' },
};

const AVATAR_PRESETS = [
  { id: 'avatar1', label: 'Blue Sky', url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcng9IjUwIiBmaWxsPSIjZTBmMmZlIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSIzOCIgcj0iMTgiIGZpbGw9IiMwMjg0YzciLz48cGF0aCBkPSJNMjUgODBjMC0xMiAxMC0xOCAyNS0xOHMyNSA2IDI1IDE4eiIgZmlsbD0iIzAyODRjNyIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iMzgiIHI9IjE0IiBmaWxsPSIjYmFlNmZkIi8+PHBhdGggZD0iTTMwIDgwYzAtOCA4LTEyIDIwLTEyczIwIDQgMjAgMTJ6IiBmaWxsPSIjYmFlNmZkIi8+PC9zdmc+' },
  { id: 'avatar2', label: 'Purple Mist', url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcng9IjUwIiBmaWxsPSIjZjNlOGZmIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSIzOCIgcj0iMTgiIGZpbGw9IiM3ZTIyY2UiLz48cGF0aCBkPSJNMjUgODBjMC0xMiAxMC0xOCAyNS0xOHMyNSA2IDI1IDE4eiIgZmlsbD0iIzdlMjJjZSIvPjxwYXRoIGQ9Ik0zOCAzMGMwIDAgNi02IDEyLTYzMTIgNiAxMiA2djEySDM4eiIgZmlsbD0iI2E4NTVmNyIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iMzgiIHI9IjE0IiBmaWxsPSIjZTlkNTVmZiIvPjxwYXRoIGQ9Ik0zMCA4MGMwLTggOC0xMiAyMC0xMnMyMCA0IDIwIDEyeiIgZmlsbD0iI2U5ZDU1ZmYiLz48L3N2Zz4=' },
  { id: 'avatar3', label: 'Teal Tech', url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcng9IjUwIiBmaWxsPSIjZTEgZmEgZTUiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjM4IiByPSIxOCIgZmlsbD0iIzA0IDc4IDU3Ii8+PHBhdGggZD0iTTI1IDgwYzAtMTIgMTAtMTggMjUtMThzMjUgNiAyNSAxOHoiIGZpbGw9IiMwNCA3OCA1NyIvPjxyZWN0IHg9IjQyIiB5PSI0NiIgd2lkdGg9IjE2IiBoZWlnaHQ9IjgiIHJ4PSIyIiBmaWxsPSIjMzQgZDMgOTkiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjM4IiByPSIxNCIgZmlsbD0iI2E3IGYzIGQwIi8+PHBhdGggZD0iTTMwIDgwYzAtOCA4LTEyIDIwLTEyczIwIDQgMjAgMTJ6IiBmaWxsPSIjYTcgZjMgZDAiLz48L3N2Zz4=' },
  { id: 'avatar4', label: 'Rose Bloom', url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcng9IjUwIiBmaWxsPSIjZmllNGU2Ii8+PGNpcmNsZSBjeD0iNTAiIGN5PSIzOCIgcj0iMTgiIGZpbGw9IiNiZTEyM2MiLz48cGF0aCBkPSJNMjUgODBjMC0xMiAxMC0xOCAyNS0xOHMyNSA2IDI1IDE4eiIgZmlsbD0iI2JlMTIzYyIvPjxwYXRoIGQ9Ik0zNiAzMmgyOHY2SDM2eiIgZmlsbD0iI2ZiNzE4NSIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iMzgiIHI9IjE0IiBmaWxsPSIjZmVjZGQzIi8+PHBhdGggZD0iTTMwIDgwYzAtOCA4LTEyIDIwLTEyczIwIDQgMjAgMTJ6IiBmaWxsPSIjZmVjZGQzIi8+PC9zdmc+' },
  { id: 'avatar5', label: 'Gold Star', url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcng9IjUwIiBmaWxsPSIjZmVmM2M3Ii8+PGNpcmNsZSBjeD0iNTAiIGN5PSIzOCIgcj0iMTgiIGZpbGw9IiNiNDUzMDkiLz48cGF0aCBkPSJNMjUgODBjMC0xMiAxMC0xOCAyNS0xOHMyNSA2IDI1IDE4eiIgZmlsbD0iI2I0NTMwOSIvPjxwYXRoIGQ9Ik00OCAyMGw0IDhoLTh6IiBmaWxsPSIjZmJiZjI0Ii8+PGNpcmNsZSBjeD0iNTAiIGN5PSIzOCIgcj0iMTQiIGZpbGw9IiNmZGU2OGEiLz48cGF0aCBkPSJNMzAgODBjMC04IDggLTEyIDIwLTEyczIwIDQgMjAgMTJ6IiBmaWxsPSIjZmRlNjhhIi8+PC9zdmc+' },
  { id: 'avatar6', label: 'Sunset Glow', url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcng9IjUwIiBmaWxsPSIjZmZlZGQ1Ii8+PGNpcmNsZSBjeD0iNTAiIGN5PSIzOCIgcj0iMTgiIGZpbGw9IiNjMjQxMGMiLz48cGF0aCBkPSJNMjUgODBjMC0xMiAxMC0xOCAyNS0xOHMyNSA2IDI1IDE4eiIgZmlsbD0iI2MyNDEwYyIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iMzgiIHI9IjE0IiBmaWxsPSIjZmVkN2FhIi8+PHBhdGggZD0iTTMwIDgwYzAtOCA4LTEyIDIwLTEyczIwIDQgMjAgMTJ6IiBmaWxsPSIjZmVkN2FhIi8+PC9zdmc+' },
  { id: 'avatar7', label: 'Cyan Breeze', url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcng9IjUwIiBmaWxsPSIjZWNmZWZmIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSIzOCIgcj0iMTgiIGZpbGw9IiMwODkxYjIiLz48cGF0aCBkPSJNMjUgODBjMC0xMiAxMC0xOCAyNS0xOHMyNSA2IDI1IDE4eiIgZmlsbD0iIzA4OTFiMiIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iMzgiIHI9IjE0IiBmaWxsPSIjY2ZmYWZlIi8+PHBhdGggZD0iTTMwIDgwYzAtOCA4LTEyIDIwLTEyczIwIDQgMjAgMTJ6IiBmaWxsPSIjY2ZmYWZlIi8+PC9zdmc+' },
  { id: 'avatar8', label: 'Indigo Wave', url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcng9IjUwIiBmaWxsPSIjZTBlN2ZmIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSIzOCIgcj0iMTgiIGZpbGw9IiM0MzM4Y2EiLz48cGF0aCBkPSJNMjUgODBjMC0xMiAxMC0xOCAyNS0xOHMyNSA2IDI1IDE4eiIgZmlsbD0iIzQzMzhjYSIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iMzgiIHI9IjE0IiBmaWxsPSIjYzdkMmZlIi8+PHBhdGggZD0iTTMwIDgwYzAtOCA4LTEyIDIwLTEyczIwIDQgMjAgMTJ6IiBmaWxsPSIjYzdkMmZlIi8+PC9zdmc+' }
];

const InfoRow = ({ icon: Icon, label, value, accent }) => {
  const resolvedAccent = accent && accent.startsWith('var(') ? '#6777ef' : accent;
  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '0.85rem',
        padding: '0.85rem 1rem', borderRadius: '12px',
        background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = resolvedAccent || '#6777ef';
        e.currentTarget.style.boxShadow = `0 0 0 1px ${resolvedAccent || '#6777ef'}25`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = '';
        e.currentTarget.style.boxShadow = '';
      }}
    >
      <div style={{
        width: '34px', height: '34px', borderRadius: '9px', flexShrink: 0,
        background: resolvedAccent ? `${resolvedAccent}18` : 'rgba(103,119,239,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={16} color={accent || 'var(--primary-accent)'} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
        <div style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={value || '—'}>
          {value || '—'}
        </div>
      </div>
    </div>
  );
};

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Related lists state
  const [assets, setAssets] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [expenses, setExpenses] = useState([]);

  const [form, setForm] = useState({
    phone: '',
    dateOfBirth: '',
    gender: 'Other',
    emergencyContact: { name: '', phone: '', relationship: '' },
    address: { street: '', city: '', state: '', pincode: '' },
    skills: [],
    profileImage: '',
    socialLinks: { linkedin: '', github: '', twitter: '' },
    bio: '',
    coverImage: ''
  });

  const [newSkill, setNewSkill] = useState('');
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [customCoverUrl, setCustomCoverUrl] = useState('');
  const [editingBio, setEditingBio] = useState(false);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/employees/me');
      if (res.success) {
        setProfile(res.employee);
        const emp = res.employee;
        setForm({
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
          skills: emp?.skills || [],
          profileImage: emp?.profileImage || '',
          socialLinks: {
            linkedin: emp?.socialLinks?.linkedin || '',
            github: emp?.socialLinks?.github || '',
            twitter: emp?.socialLinks?.twitter || '',
          },
          bio: emp?.bio || '',
          coverImage: emp?.coverImage || ''
        });

        // Set related entities
        setAssets(res.assets || []);
        setReviews(res.performanceReviews || []);
        setLeaves(res.leaveRequests || []);
        setExpenses(res.expenses || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const res = await api.put('/employees/me', {
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

  const COVER_PRESETS = [
    { id: 'cover1', label: 'Sunset Glow', url: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' },
    { id: 'cover2', label: 'Indigo Wave', url: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)' },
    { id: 'cover3', label: 'Teal Tech', url: 'linear-gradient(135deg, #0d9488 0%, #115e59 100%)' },
    { id: 'cover4', label: 'Rose Bloom', url: 'linear-gradient(135deg, #db2777 0%, #9d174d 100%)' },
    { id: 'cover5', label: 'Dark Charcoal', url: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' },
    { id: 'cover6', label: 'Emerald Forest', url: 'linear-gradient(135deg, #059669 0%, #064e3b 100%)' },
  ];

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
    return score;
  };



  // Exporter to HTML Print layout
  const handlePrintCV = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${profile?.firstName || 'Employee'}_${profile?.lastName || 'Profile'}_Resume</title>
          <style>
            body { font-family: 'Inter', system-ui, -apple-system, sans-serif; padding: 40px; color: #333; line-height: 1.5; }
            .header { border-bottom: 2px solid #6777ef; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
            .name { font-size: 28px; font-weight: 800; margin: 0; color: #111; }
            .title { font-size: 16px; font-weight: 600; color: #6777ef; margin: 5px 0 0 0; text-transform: uppercase; }
            .contact-info { text-align: right; font-size: 13px; color: #666; }
            .section-title { font-size: 16px; font-weight: 700; color: #111; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 30px; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.05em; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px 30px; }
            .item { font-size: 14px; }
            .label { font-weight: 600; color: #666; font-size: 12px; text-transform: uppercase; }
            .val { font-weight: 500; color: #111; margin-top: 2px; }
            .skills-container { display: flex; flex-wrap: wrap; gap: 8px; }
            .skill-badge { background: #f3f4f6; border: 1px solid #e5e7eb; color: #374151; padding: 4px 10px; borderRadius: 4px; font-size: 12px; font-weight: 600; }
            .footer { margin-top: 50px; border-top: 1px solid #eee; padding-top: 15px; text-align: center; font-size: 11px; color: #999; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="name">${profile?.firstName || 'User'} ${profile?.lastName || 'Profile'}</h1>
              <p class="title">${profile?.designation || 'System User'}</p>
            </div>
            <div class="contact-info">
              <div>Email: ${profile?.email || user?.email}</div>
              <div>Phone: ${form.phone || '—'}</div>
              <div>ID: ${profile?.employeeId || '—'}</div>
            </div>
          </div>

          <div class="section-title">Executive Summary</div>
          <p style="font-size: 13.5px; line-height: 1.6; color: #444; margin: 0; white-space: pre-line;">
            ${profile?.bio || `Hello! I am ${profile ? `${profile.firstName} ${profile.lastName}` : 'User'}. I work as a ${profile?.designation || 'System Specialist'} in the ${profile?.department?.name || 'Assigned'} department. Passionate about professional growth, driving core objectives, and contributing to high-performance workflows.`}
          </p>
          
          <div class="section-title">Employment Overview</div>
          <div class="grid">
            <div class="item">
              <div class="label">Department</div>
              <div class="val">${profile?.department?.name || 'Unassigned'}</div>
            </div>
            <div class="item">
              <div class="label">Date of Joining</div>
              <div class="val">${profile?.joiningDate ? new Date(profile.joiningDate).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}</div>
            </div>
            <div class="item">
              <div class="label">Job Schedule</div>
              <div class="val">Full-Time (Permanent)</div>
            </div>
            <div class="item">
              <div class="label">Tenure</div>
              <div class="val">${tenure || '—'}</div>
            </div>
          </div>

          <div class="section-title">Personal Information</div>
          <div class="grid">
            <div class="item">
              <div class="label">Date of Birth</div>
              <div class="val">${form.dateOfBirth ? new Date(form.dateOfBirth).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}</div>
            </div>
            <div class="item">
              <div class="label">Gender</div>
              <div class="val">${form.gender || '—'}</div>
            </div>
            <div class="item">
              <div class="label">Residential Address</div>
              <div class="val">
                ${[form.address.street, form.address.city, form.address.state, form.address.pincode].filter(Boolean).join(', ') || '—'}
              </div>
            </div>
          </div>

          <div class="section-title">Skills & Competencies</div>
          <div class="skills-container">
            ${form.skills && form.skills.length > 0 
              ? form.skills.map(s => `<span class="skill-badge">${s}</span>`).join('')
              : '<span style="font-style: italic; font-size: 13px; color: #666;">No skills added yet</span>'
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
            Generated by EMS Hub Corporate Workspace on ${new Date().toLocaleDateString()}
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
    : null;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Trophy },
    { id: 'personal', label: 'Personal & Contact', icon: User },
    { id: 'career', label: 'Career & Job', icon: Briefcase },
    { id: 'reviews', label: 'Performance Reviews', icon: Award },
    { id: 'assets', label: 'Assets & Expenses', icon: Laptop },
    { id: 'leaves', label: 'Attendance & Leaves', icon: Calendar },
    { id: 'emergency', label: 'Emergency Contact', icon: Heart },
    { id: 'security', label: 'Security & Role', icon: Shield },
  ];

  return (
    <div className="page-container page-enter">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '14px',
          background: 'linear-gradient(135deg, var(--primary-accent) 0%, #3f51b5 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 15px rgba(103,119,239,0.3)',
        }}>
          <User size={22} color="white" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>My Profile</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            Manage your personal data, skills, emergency contacts, and professional identity
          </p>
        </div>
        
        {/* Buttons right aligned */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {!loading && profile && (
            <button
              onClick={handlePrintCV}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 1rem', fontSize: '0.82rem', borderRadius: '8px', cursor: 'pointer' }}
            >
              <Printer size={14} /> Download Profile CV
            </button>
          )}

          {!editing && !loading && profile && ['personal', 'emergency'].includes(activeTab) && (
            <button
              onClick={() => setEditing(true)}
              className="btn btn-secondary"
              style={{ padding: '0.5rem 1.1rem', background: 'var(--primary-accent)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem', borderRadius: '8px', cursor: 'pointer' }}
            >
              <Edit2 size={14} /> Edit Tab Details
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="alert alert-danger" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {success && (
        <div style={{ padding: '0.75rem 1rem', background: 'var(--success-bg)', color: 'var(--success)', borderRadius: '10px', marginBottom: '1.25rem', display: 'flex', gap: '0.5rem', fontWeight: 600, fontSize: '0.9rem', border: '1px solid rgba(46,189,127,0.2)' }}>
          <CheckCircle size={16} /> {success}
        </div>
      )}

      {loading ? (
        <SkeletonProfile />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', alignItems: 'start' }}>

          {/* ── LEFT IDENTITY PANEL ── */}
          <div className="card" style={{ textAlign: 'center', padding: 0, position: 'relative', overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)' }}>
            {/* Cover Banner */}
            <div style={{
              height: '110px',
              width: '100%',
              background: form.coverImage ? (form.coverImage.startsWith('linear-gradient') ? form.coverImage : `url(${form.coverImage}) center/cover no-repeat`) : 'linear-gradient(135deg, var(--primary-accent) 0%, #3f51b5 100%)',
              position: 'relative'
            }}>
              <button 
                onClick={() => setShowCoverModal(true)}
                style={{
                  position: 'absolute', top: '10px', right: '10px',
                  background: 'rgba(0,0,0,0.5)', color: '#fff',
                  border: 'none', borderRadius: '6px',
                  padding: '4px 8px', fontSize: '0.7rem',
                  fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px',
                  cursor: 'pointer', zIndex: 10, backdropFilter: 'blur(4px)',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.7)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
              >
                <Camera size={12} /> Banner
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
                  width: '96px', height: '96px', borderRadius: '50%',
                  margin: '-48px auto 0.75rem',
                  position: 'relative',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
                  border: '4px solid var(--card-bg, #fff)',
                  background: 'var(--card-bg, #fff)',
                  zIndex: 2,
                }}
                className="avatar-hover-container"
              >
                {form.profileImage ? (
                  <img src={form.profileImage} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{
                    width: '100%', height: '100%',
                    background: 'linear-gradient(135deg, var(--primary-accent) 0%, #3f51b5 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.9rem', fontWeight: 800, color: '#fff',
                  }}>
                    {initials}
                  </div>
                )}
                {/* Overlay on hover */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(0,0,0,0.5)',
                  color: '#fff',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  opacity: 0,
                  transition: 'opacity 0.2s',
                }} className="avatar-edit-overlay">
                  <Camera size={16} />
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, marginTop: '2px', textTransform: 'uppercase' }}>Change</span>
                </div>
              </div>

              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.25rem', color: 'var(--text-primary)' }}>
                {profile ? `${profile.firstName} ${profile.lastName}` : user?.username || 'Admin User'}
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontWeight: 500 }}>
                {profile?.designation || 'System User'}
              </p>

              <div style={{ marginBottom: '0.75rem' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                  padding: '0.35rem 1.1rem', borderRadius: '99px',
                  fontSize: '0.75rem', fontWeight: 700,
                  background: roleStyle.bg, color: roleStyle.color,
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  border: `1px solid ${roleStyle.color}20`,
                }}>
                  <Shield size={11} />
                  {roleStyle.label}
                </span>
              </div>
            </div>

            {/* Social Icons */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {form.socialLinks?.linkedin && (
                <a href={form.socialLinks.linkedin.startsWith('http') ? form.socialLinks.linkedin : `https://${form.socialLinks.linkedin}`} target="_blank" rel="noopener noreferrer" style={{ color: '#0077b5', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(0,119,181,0.08)', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15)'} onMouseLeave={e => e.currentTarget.style.transform = ''}>
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                </a>
              )}
              {form.socialLinks?.github && (
                <a href={form.socialLinks.github.startsWith('http') ? form.socialLinks.github : `https://${form.socialLinks.github}`} target="_blank" rel="noopener noreferrer" style={{ color: '#24292e', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(36,41,46,0.08)', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15)'} onMouseLeave={e => e.currentTarget.style.transform = ''}>
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                </a>
              )}
              {form.socialLinks?.twitter && (
                <a href={form.socialLinks.twitter.startsWith('http') ? form.socialLinks.twitter : `https://${form.socialLinks.twitter}`} target="_blank" rel="noopener noreferrer" style={{ color: '#1da1f2', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(29,161,242,0.08)', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15)'} onMouseLeave={e => e.currentTarget.style.transform = ''}>
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                </a>
              )}
            </div>

            {/* Profile Completeness Tracker */}
            <div style={{
              marginTop: '1.25rem', padding: '1rem', borderRadius: '12px',
              background: 'rgba(103,119,239,0.04)', border: '1px solid rgba(103,119,239,0.12)',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)' }}>PROFILE COMPLETENESS</span>
                <strong style={{ fontSize: '0.82rem', color: 'var(--primary-accent)' }}>{calculateCompleteness()}%</strong>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'rgba(0,0,0,0.04)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${calculateCompleteness()}%`, height: '100%', background: 'linear-gradient(90deg, #6777ef, #2ebd7f)', borderRadius: '3px', transition: 'width 0.5s' }} />
              </div>
              <p style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', margin: '0.4rem 0 0 0', lineHeight: 1.3 }}>
                {calculateCompleteness() < 100 
                  ? 'Complete your address, emergency details, skills, or social links to reach 100%!'
                  : 'Great job! Your profile is fully complete.'}
              </p>
            </div>

            {/* Quick Summary details */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '1.25rem' }}>
              {[
                { label: 'Employee ID', value: profile?.employeeId || '—' },
                { label: 'Account Status', value: profile?.status || 'Active', valueColor: profile?.status === 'Active' ? '#2ebd7f' : '#ff5b5b' },
                { label: 'Work Schedule', value: 'Full Time' },
                ...(tenure ? [{ label: 'Tenure', value: tenure }] : []),
              ].map(stat => (
                <div key={stat.label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.55rem 0.75rem', borderRadius: '8px', background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{stat.label}</span>
                  <strong style={{ fontSize: '0.85rem', color: stat.valueColor }}>{stat.value}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT PANEL AND TABS ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>

            {/* Horizontal Tabs Menu */}
            <div style={{
              display: 'flex', gap: '0.25rem',
              borderBottom: '2px solid var(--border-color)',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
            }}>
              {tabs.map((t) => {
                const Icon = t.icon;
                const isActive = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => { setActiveTab(t.id); setEditing(false); setError(''); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.45rem',
                      padding: '0.85rem 1.25rem',
                      background: 'none', border: 'none', cursor: 'pointer',
                      borderBottom: isActive ? '2px solid var(--primary-accent)' : '2px solid transparent',
                      marginBottom: '-2px',
                      color: isActive ? 'var(--primary-accent)' : 'var(--text-secondary)',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '0.88rem',
                      transition: 'all 0.2s',
                    }}
                  >
                    <Icon size={15} />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Body */}
            <div className="card" style={{ padding: '1.75rem' }}>

              {/* 🏠 TAB: OVERVIEW */}
              {activeTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>About Me / Executive Bio</h3>
                      {!editingBio && (
                        <button
                          onClick={() => setEditingBio(true)}
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.75rem', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                        >
                          <Edit2 size={11} /> Edit Bio
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
                          placeholder="Tell us about yourself, your goals, key expertise, and passions..."
                          style={{ resize: 'none', fontSize: '0.9rem', lineHeight: 1.6, padding: '0.75rem 1rem' }}
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
                            style={{ padding: '0.45rem 1.1rem', fontSize: '0.8rem', cursor: 'pointer' }}
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
                            style={{ padding: '0.45rem 1.1rem', fontSize: '0.8rem', cursor: 'pointer' }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        padding: '1rem', borderRadius: '10px',
                        background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                        fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-primary)',
                        whiteSpace: 'pre-line'
                      }}>
                        {profile?.bio || `📝 Hello! I am ${profile ? `${profile.firstName} ${profile.lastName}` : 'User'}. I work as a ${profile?.designation || 'System Specialist'} in the ${profile?.department?.name || 'Assigned'} department. Passionate about professional growth, driving core objectives, and contributing to high-performance workflows within EMS Hub.`}
                      </div>
                    )}
                  </div>

                  {/* Skills Tag Section */}
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 0.5rem' }}>Skills &amp; Specialties</h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 0.85rem' }}>
                      Add or remove your professional skills. Updates are saved automatically.
                    </p>

                    <form onSubmit={handleAddSkill} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                      <input
                        type="text"
                        placeholder="e.g. React, MERN, Customer Service, Team Leadership..."
                        className="form-control"
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        style={{ flex: 1, padding: '0.6rem 1rem', fontSize: '0.85rem' }}
                      />
                      <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.6rem 1.2rem', cursor: 'pointer' }}>
                        <Plus size={16} /> Add
                      </button>
                    </form>

                    {form.skills.length === 0 ? (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0 }}>
                        No skills listed yet. Add some skills above!
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {form.skills.map((skill, index) => (
                          <div
                            key={index}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                              padding: '0.35rem 0.85rem', borderRadius: '20px',
                              background: 'rgba(103,119,239,0.08)',
                              border: '1px solid rgba(103,119,239,0.2)',
                              color: 'var(--primary-accent)',
                              fontSize: '0.82rem', fontWeight: 600,
                            }}
                          >
                            {skill}
                            <button
                              type="button"
                              onClick={() => handleRemoveSkill(skill)}
                              style={{
                                background: 'none', border: 'none', padding: 0,
                                display: 'flex', alignItems: 'center', cursor: 'pointer',
                                color: 'var(--primary-accent)', opacity: 0.6
                              }}
                              onMouseEnter={e => e.currentTarget.style.opacity = 1}
                              onMouseLeave={e => e.currentTarget.style.opacity = 0.6}
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Highlights/Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                    <div style={{
                      padding: '1.25rem', borderRadius: '12px',
                      background: 'linear-gradient(135deg, rgba(255,177,25,0.06) 0%, rgba(217,70,239,0.03) 100%)',
                      border: '1px solid rgba(255,177,25,0.15)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#ffb119', fontWeight: 700, fontSize: '0.9rem' }}>
                        <Trophy size={16} /> Recognition Hub
                      </div>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        Earn recognition tags, points, and leaderboard rewards directly from HR Managers and Supervisors.
                      </span>
                    </div>

                    <div style={{
                      padding: '1.25rem', borderRadius: '12px',
                      background: 'linear-gradient(135deg, rgba(46,189,127,0.06) 0%, rgba(58,183,232,0.03) 100%)',
                      border: '1px solid rgba(46,189,127,0.15)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#2ebd7f', fontWeight: 700, fontSize: '0.9rem' }}>
                        <Clock size={16} /> Schedule &amp; Hours
                      </div>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        Track daily check-ins, request leave balances, and view attendance records in real time.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 📞 TAB: PERSONAL & CONTACT */}
              {activeTab === 'personal' && (
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <User size={18} color="var(--primary-accent)" /> Contact &amp; Personal Info
                  </h3>

                  {editing ? (
                    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Phone Number</label>
                          <input
                            type="text" className="form-control"
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            placeholder="e.g. 9876543210"
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>Date of Birth</label>
                          <input
                            type="date" className="form-control"
                            value={form.dateOfBirth}
                            onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label>Gender</label>
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
                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem' }}>Home Address</h4>
                        <div className="form-row">
                          <div className="form-group" style={{ flex: '2' }}>
                            <label>Street Address</label>
                            <input
                              type="text" className="form-control"
                              value={form.address.street}
                              onChange={(e) => setForm({ ...form, address: { ...form.address, street: e.target.value } })}
                              placeholder="e.g. 123 Main St, Apt 4B"
                            />
                          </div>
                          <div className="form-group">
                            <label>City</label>
                            <input
                              type="text" className="form-control"
                              value={form.address.city}
                              onChange={(e) => setForm({ ...form, address: { ...form.address, city: e.target.value } })}
                              placeholder="e.g. San Jose"
                            />
                          </div>
                        </div>
                        <div className="form-row" style={{ marginTop: '0.85rem' }}>
                          <div className="form-group">
                            <label>State / Province</label>
                            <input
                              type="text" className="form-control"
                              value={form.address.state}
                              onChange={(e) => setForm({ ...form, address: { ...form.address, state: e.target.value } })}
                              placeholder="e.g. CA"
                            />
                          </div>
                          <div className="form-group">
                            <label>Pincode / Zip</label>
                            <input
                              type="text" className="form-control"
                              value={form.address.pincode}
                              onChange={(e) => setForm({ ...form, address: { ...form.address, pincode: e.target.value } })}
                              placeholder="e.g. 95112"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Social Links Section */}
                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem' }}>Social Profiles</h4>
                        <div className="form-row">
                          <div className="form-group">
                            <label>LinkedIn URL</label>
                            <input
                              type="text" className="form-control"
                              value={form.socialLinks?.linkedin || ''}
                              onChange={(e) => setForm({ ...form, socialLinks: { ...form.socialLinks, linkedin: e.target.value } })}
                              placeholder="linkedin.com/in/username"
                            />
                          </div>
                          <div className="form-group">
                            <label>GitHub URL</label>
                            <input
                              type="text" className="form-control"
                              value={form.socialLinks?.github || ''}
                              onChange={(e) => setForm({ ...form, socialLinks: { ...form.socialLinks, github: e.target.value } })}
                              placeholder="github.com/username"
                            />
                          </div>
                          <div className="form-group">
                            <label>Twitter URL</label>
                            <input
                              type="text" className="form-control"
                              value={form.socialLinks?.twitter || ''}
                              onChange={(e) => setForm({ ...form, socialLinks: { ...form.socialLinks, twitter: e.target.value } })}
                              placeholder="twitter.com/username"
                            />
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                        <button type="submit" className="btn btn-primary" style={{ cursor: 'pointer' }} disabled={saving}>
                          <Save size={15} /> {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          type="button" className="btn btn-secondary"
                          onClick={() => { setEditing(false); setError(''); }}
                          style={{ cursor: 'pointer' }}
                        >
                          <X size={15} /> Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <InfoRow icon={Mail} label="Work Email" value={profile?.email || user?.email} />
                        <InfoRow icon={Phone} label="Phone Number" value={form.phone} accent="#2ebd7f" />
                        <InfoRow
                          icon={Calendar} label="Date of Birth"
                          value={form.dateOfBirth ? new Date(form.dateOfBirth).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }) : undefined}
                          accent="#ffb119"
                        />
                        <InfoRow icon={User} label="Gender" value={form.gender} accent="#d946ef" />
                      </div>

                      {/* Display Address */}
                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                          <MapPin size={15} /> Residential Address
                        </h4>
                        <div style={{
                          padding: '1rem', borderRadius: '10px',
                          background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                          fontSize: '0.88rem', lineHeight: 1.5
                        }}>
                          {form.address.street || form.address.city || form.address.state || form.address.pincode ? (
                            <div>
                               {form.address.street && <div style={{ fontWeight: 600 }}>{form.address.street}</div>}
                              <div>
                                {[form.address.city, form.address.state].filter(Boolean).join(', ')} 
                                {form.address.pincode && ` - ${form.address.pincode}`}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No home address configured. Click Edit at the top to add your address.</span>
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
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Briefcase size={18} color="var(--primary-accent)" /> Career &amp; Employment Info
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                    🔒 Professional details are managed by Human Resources and cannot be modified directly.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <InfoRow icon={Briefcase} label="Designation" value={profile?.designation} accent="#6777ef" />
                    <InfoRow icon={Building2} label="Department" value={profile?.department?.name} accent="#3ab7e8" />
                    <InfoRow
                      icon={DollarSign} label="Monthly Base Salary"
                      value={profile?.salary ? `$${profile.salary.toLocaleString()}` : undefined}
                      accent="#2ebd7f"
                    />
                    <InfoRow
                      icon={Clock} label="Date of Joining"
                      value={profile?.joiningDate ? new Date(profile.joiningDate).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }) : undefined}
                      accent="#ffb119"
                    />
                    <InfoRow icon={Shield} label="Contract Type" value="Permanent" />
                    <InfoRow icon={Calendar} label="Probation Status" value="Completed" accent="#2ebd7f" />
                  </div>
                </div>
              )}

              {/* 🏆 TAB: PERFORMANCE REVIEWS */}
              {activeTab === 'reviews' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Award size={18} color="var(--primary-accent)" /> Performance Ratings &amp; Reviews
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                    View your quarterly performance evaluations and feedback provided by HR and Team Leads.
                  </p>

                  {/* Performance Score Summary */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.25rem', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    <div style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '12px',
                      background: 'linear-gradient(135deg, rgba(103,119,239,0.04) 0%, rgba(46,189,127,0.02) 100%)',
                      textAlign: 'center'
                    }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Average Rating</span>
                      <strong style={{ fontSize: '2.5rem', color: '#ffb119', margin: '0.2rem 0', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        {reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : '—'}
                        {reviews.length > 0 && <Star size={24} fill="#ffb119" color="#ffb119" style={{ marginTop: '-4px' }} />}
                      </strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Based on {reviews.length} reviews</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Core Competency Evaluation</span>
                      {[
                        { skill: 'Technical Capability', val: reviews.length > 0 ? 90 : 85, color: '#6777ef' },
                        { skill: 'Collaboration & Teamwork', val: reviews.length > 0 ? 95 : 90, color: '#2ebd7f' },
                        { skill: 'Execution & Punctuality', val: reviews.length > 0 ? 80 : 85, color: '#ffb119' },
                        { skill: 'Communication Skills', val: reviews.length > 0 ? 90 : 80, color: '#d946ef' },
                      ].map(comp => (
                        <div key={comp.skill} style={{ fontSize: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', fontWeight: 600 }}>
                            <span style={{ color: 'var(--text-secondary)' }}>{comp.skill}</span>
                            <span style={{ color: 'var(--text-primary)' }}>{comp.val}%</span>
                          </div>
                          <div style={{ width: '100%', height: '5px', background: 'rgba(0,0,0,0.04)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${comp.val}%`, height: '100%', background: comp.color, borderRadius: '3px' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Reviews Feed */}
                  <div style={{ marginTop: '0.5rem' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '0.85rem', color: 'var(--text-secondary)' }}>
                      Evaluation History
                    </h4>

                    {reviews.length === 0 ? (
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', padding: '1.5rem', border: '1px dashed var(--border-color)', borderRadius: '10px' }}>
                        No formal performance reviews logged in the system yet.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        {reviews.map((rev) => (
                          <div key={rev._id} style={{
                            padding: '1.25rem', border: '1px solid var(--border-color)', borderRadius: '12px',
                            background: 'var(--bg-primary)', position: 'relative'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.65rem' }}>
                              <div>
                                <strong style={{ fontSize: '0.9rem', display: 'block' }}>Review Period: {rev.reviewPeriod}</strong>
                                <span style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                                  Reviewed on {new Date(rev.reviewDate).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })} by {rev.reviewer?.firstName} {rev.reviewer?.lastName}
                                </span>
                              </div>
                              <div style={{
                                display: 'flex', alignItems: 'center', gap: '0.15rem',
                                padding: '0.25rem 0.6rem', borderRadius: '8px',
                                background: 'rgba(255,177,25,0.1)', color: '#ffb119',
                                fontSize: '0.8rem', fontWeight: 700
                              }}>
                                {rev.rating} <Star size={12} fill="#ffb119" color="#ffb119" />
                              </div>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)', fontStyle: 'italic', lineHeight: 1.5, background: 'var(--bg-secondary)', padding: '0.75rem 1rem', borderRadius: '8px', borderLeft: '3px solid var(--primary-accent)' }}>
                              "{rev.feedback}"
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 💻 TAB: ASSETS & EXPENSES */}
              {activeTab === 'assets' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                  {/* Company hardware section */}
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Laptop size={18} color="var(--primary-accent)" /> Assigned Company Assets
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                      Inventory of hardware and devices currently assigned to your profile.
                    </p>

                    {assets.length === 0 ? (
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '1.25rem', border: '1px dashed var(--border-color)', borderRadius: '10px', textAlign: 'center' }}>
                        No corporate assets currently assigned to your account.
                      </p>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.85rem' }}>
                        {assets.map(asset => (
                          <div key={asset._id} style={{
                            padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '12px',
                            background: 'var(--bg-primary)', display: 'flex', gap: '0.85rem', alignItems: 'center'
                          }}>
                            <div style={{
                              width: '40px', height: '40px', borderRadius: '10px',
                              background: 'rgba(103,119,239,0.1)', color: 'var(--primary-accent)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                            }}>
                              <Laptop size={20} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <strong style={{ fontSize: '0.85rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.name}</strong>
                              <span style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', display: 'block' }}>S/N: {asset.serialNumber}</span>
                              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', fontSize: '0.68rem', fontWeight: 700 }}>
                                <span style={{ color: 'var(--success)' }}>${asset.value}</span>
                                <span style={{ color: 'var(--text-secondary)' }}>·</span>
                                <span style={{ color: '#ffb119' }}>Cond: {asset.condition}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Expenses claims section */}
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <DollarSign size={18} color="#2ebd7f" /> Expense Claims
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                      Track status of software subscriptions, travel, and meals expense reimbursements.
                    </p>

                    {expenses.length === 0 ? (
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '1.25rem', border: '1px dashed var(--border-color)', borderRadius: '10px', textAlign: 'center' }}>
                        No expense reimbursement claims filed yet.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                        {expenses.map(exp => (
                          <div key={exp._id} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '0.75rem 1rem', border: '1px solid var(--border-color)', borderRadius: '10px',
                            background: 'var(--bg-primary)'
                          }}>
                            <div>
                              <strong style={{ fontSize: '0.85rem', display: 'block' }}>{exp.title}</strong>
                              <span style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                                Category: {exp.category} · Claimed on {new Date(exp.date).toLocaleDateString()}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>${exp.amount.toFixed(2)}</strong>
                              <span className={`badge badge-${exp.status.toLowerCase()}`} style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>{exp.status}</span>
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
                  {/* Leave Summary Stats */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Calendar size={18} color="var(--primary-accent)" /> Leave Balances &amp; Requests
                      </h3>
                      <a href="/leaves" className="btn btn-primary" style={{ padding: '0.35rem 0.85rem', fontSize: '0.75rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', borderRadius: '6px' }}>
                        <Plus size={12} /> Apply Leave
                      </a>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                      Manage and track leave types, remaining balances, and approval logs.
                    </p>

                    {/* Leave stats grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.85rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                      {[
                        { label: 'Casual Balance', val: '12 Days', color: '#6777ef' },
                        { label: 'Sick Balance', val: '8 Days', color: '#2ebd7f' },
                        { label: 'Pending Requests', val: leaves.filter(l => l.status === 'Pending').length, color: '#ffb119' },
                        { label: 'Approved (YTD)', val: leaves.filter(l => l.status === 'Approved').length, color: '#3ab7e8' },
                      ].map(stat => (
                        <div key={stat.label} style={{
                          padding: '0.85rem', border: '1px solid var(--border-color)', borderRadius: '10px',
                          background: 'var(--bg-primary)', textAlign: 'center'
                        }}>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>{stat.label}</span>
                          <strong style={{ fontSize: '1.2rem', color: stat.color, display: 'block', marginTop: '0.2rem' }}>{stat.val}</strong>
                        </div>
                      ))}
                    </div>

                    {/* Leaves log */}
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '0.65rem', color: 'var(--text-secondary)' }}>Leave Logs</h4>
                    {leaves.length === 0 ? (
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '1.25rem', border: '1px dashed var(--border-color)', borderRadius: '10px', textAlign: 'center' }}>
                        No leave logs on record.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                        {leaves.map(req => (
                          <div key={req._id} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '0.75rem 1rem', border: '1px solid var(--border-color)', borderRadius: '10px',
                            background: 'var(--bg-primary)'
                          }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <strong style={{ fontSize: '0.85rem' }}>{req.leaveType} Leave</strong>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                  ({Math.round((new Date(req.endDate) - new Date(req.startDate)) / (1000 * 60 * 60 * 24)) + 1} days)
                                </span>
                              </div>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                Range: {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()} · Reason: "{req.reason}"
                              </span>
                            </div>
                            <span className={`badge badge-${req.status.toLowerCase()}`} style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>{req.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Attendance Summary */}
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Clock size={18} color="#2ebd7f" /> Attendance &amp; Punch Rate
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                      Summary metrics for punch compliance and total hours logged.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {[
                          { metric: 'Monthly Present Days', val: '18 Days', pct: 90, color: '#2ebd7f' },
                          { metric: 'Late Punch Count', val: '2 Days', pct: 10, color: '#ffb119' },
                          { metric: 'Avg Work Hours/Day', val: '8.4 Hrs', pct: 84, color: '#6777ef' },
                        ].map(row => (
                          <div key={row.metric} style={{ fontSize: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', fontWeight: 600 }}>
                              <span style={{ color: 'var(--text-secondary)' }}>{row.metric}</span>
                              <strong style={{ color: 'var(--text-primary)' }}>{row.val}</strong>
                            </div>
                            <div style={{ width: '100%', height: '5px', background: 'rgba(0,0,0,0.04)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${row.pct}%`, height: '100%', background: row.color, borderRadius: '3px' }} />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div style={{
                        padding: '1.25rem', border: '1px solid var(--border-color)', borderRadius: '12px',
                        background: 'linear-gradient(135deg, rgba(46,189,127,0.04) 0%, rgba(103,119,239,0.02) 100%)',
                        textAlign: 'center'
                      }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)' }}>PUNCH COMPLIANCE RATE</span>
                        <strong style={{ fontSize: '2.2rem', color: '#2ebd7f', margin: '0.2rem 0', display: 'block' }}>95.4%</strong>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Excellent attendance record</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 🚑 TAB: EMERGENCY CONTACT */}
              {activeTab === 'emergency' && (
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Heart size={18} color="#ef4444" /> Emergency Contacts
                  </h3>

                  {editing ? (
                    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Contact Name</label>
                          <input
                            type="text" className="form-control"
                            value={form.emergencyContact.name}
                            onChange={(e) => setForm({ ...form, emergencyContact: { ...form.emergencyContact, name: e.target.value } })}
                            placeholder="e.g. Jane Doe"
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>Relationship</label>
                          <input
                            type="text" className="form-control"
                            value={form.emergencyContact.relationship}
                            onChange={(e) => setForm({ ...form, emergencyContact: { ...form.emergencyContact, relationship: e.target.value } })}
                            placeholder="e.g. Spouse, Parent, Sibling"
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>Contact Phone</label>
                          <input
                            type="text" className="form-control"
                            value={form.emergencyContact.phone}
                            onChange={(e) => setForm({ ...form, emergencyContact: { ...form.emergencyContact, phone: e.target.value } })}
                            placeholder="e.g. 9876543210"
                            required
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                        <button type="submit" className="btn btn-primary" style={{ background: '#ef4444', border: 'none', cursor: 'pointer' }} disabled={saving}>
                          <Save size={15} /> {saving ? 'Saving...' : 'Save Contact'}
                        </button>
                        <button
                          type="button" className="btn btn-secondary"
                          onClick={() => { setEditing(false); setError(''); }}
                          style={{ cursor: 'pointer' }}
                        >
                          <X size={15} /> Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{
                        padding: '1.25rem', borderRadius: '12px',
                        background: 'rgba(239,68,68,0.03)',
                        border: '1px solid rgba(239,68,68,0.12)',
                        display: 'flex', gap: '1rem', alignItems: 'center'
                      }}>
                        <div style={{
                          width: '44px', height: '44px', borderRadius: '10px',
                          background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          <Heart size={20} />
                        </div>
                        <div>
                          <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0 }}>Primary Emergency Contact</h4>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Used by HR in case of system emergencies.</span>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                        <InfoRow icon={User} label="Contact Name" value={form.emergencyContact.name} accent="#ef4444" />
                        <InfoRow icon={Heart} label="Relationship" value={form.emergencyContact.relationship} accent="#ef4444" />
                        <InfoRow icon={Phone} label="Emergency Phone" value={form.emergencyContact.phone} accent="#ef4444" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 🔒 TAB: SECURITY & ROLE */}
              {activeTab === 'security' && (
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Shield size={18} color="var(--primary-accent)" /> Account Authorization
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <InfoRow icon={User} label="Username" value={user?.username} />
                    <InfoRow icon={Shield} label="Access Role Rules" value={roleStyle.label} accent={roleStyle.color} />
                  </div>

                  <div style={{
                    padding: '1.25rem', borderRadius: '12px',
                    background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                    display: 'flex', flexDirection: 'column', gap: '0.75rem'
                  }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Key size={15} /> System Credentials Information
                    </h4>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      🔑 Your account credentials utilize secure Role-Based Access Control (RBAC) tokens. To update your system username, email, or request password changes, please coordinate with your System Administrator or IT Support Desk.
                    </span>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Preset Avatar Selection Modal */}
      {showAvatarModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '480px', borderRadius: '20px' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Camera size={18} /> Choose Profile Picture
              </h3>
              <button className="modal-close-btn" onClick={() => setShowAvatarModal(false)} style={{ cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <div className="modal-body" style={{ padding: '1.5rem' }}>
              <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', fontWeight: 500 }}>
                Select one of our professional presets:
              </span>

              {/* Presets grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                {AVATAR_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPresetAvatar(preset.url)}
                    style={{
                      background: 'none', border: '2px solid transparent', padding: 0, cursor: 'pointer',
                      borderRadius: '50%', width: '70px', height: '70px', margin: '0 auto',
                      overflow: 'hidden', transition: 'transform 0.2s, border-color 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.15)'; e.currentTarget.style.borderColor = 'var(--primary-accent)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = 'transparent'; }}
                    title={preset.label}
                  >
                    <img src={preset.url} alt={preset.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginBottom: '1rem' }}>
                <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 500 }}>
                  Or upload a local image file:
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <label className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', margin: 0, padding: '0.55rem 1.1rem', fontSize: '0.82rem', cursor: 'pointer', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <Plus size={14} /> Upload Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Supports JPG, PNG (Max 2MB)</span>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 500 }}>
                  Or enter a custom image URL:
                </span>
                <form onSubmit={handleSaveCustomAvatar} style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="url"
                    placeholder="https://example.com/avatar.png"
                    className="form-control"
                    value={customAvatarUrl}
                    onChange={(e) => setCustomAvatarUrl(e.target.value)}
                    style={{ flex: 1, padding: '0.55rem 0.85rem', fontSize: '0.82rem' }}
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.55rem 1rem', cursor: 'pointer' }}>
                    Apply
                  </button>
                </form>
              </div>
            </div>
            
            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', padding: '1rem 1.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAvatarModal(false)} style={{ cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preset Cover Selection Modal */}
      {showCoverModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '480px', borderRadius: '20px' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Camera size={18} /> Choose Cover Banner
              </h3>
              <button className="modal-close-btn" onClick={() => setShowCoverModal(false)} style={{ cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <div className="modal-body" style={{ padding: '1.5rem' }}>
              <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', fontWeight: 500 }}>
                Select one of our preset gradients:
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
                      borderRadius: '8px',
                      height: '50px',
                      width: '100%',
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'transform 0.2s, border-color 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.borderColor = 'var(--primary-accent)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = 'transparent'; }}
                    title={preset.label}
                  />
                ))}
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginBottom: '1rem' }}>
                <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 500 }}>
                  Or upload a local image banner:
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <label className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', margin: 0, padding: '0.55rem 1.1rem', fontSize: '0.82rem', cursor: 'pointer', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <Plus size={14} /> Upload Banner
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

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 500 }}>
                  Or enter a custom banner image URL:
                </span>
                <form onSubmit={(e) => { e.preventDefault(); if (customCoverUrl.trim()) handleSelectCover(customCoverUrl.trim()); setCustomCoverUrl(''); }} style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="url"
                    placeholder="https://example.com/banner.png"
                    className="form-control"
                    value={customCoverUrl}
                    onChange={(e) => setCustomCoverUrl(e.target.value)}
                    style={{ flex: 1, padding: '0.55rem 0.85rem', fontSize: '0.82rem' }}
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.55rem 1rem', cursor: 'pointer' }}>
                    Apply
                  </button>
                </form>
              </div>
            </div>
            
            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', padding: '1rem 1.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowCoverModal(false)} style={{ cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
