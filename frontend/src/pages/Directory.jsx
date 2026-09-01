import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Users, Search, Building2, Mail, Phone, Filter } from 'lucide-react';
import { SkeletonCardGrid } from '../components/Skeleton';

const Directory = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // grid | dept

  const fetchDirectory = async () => {
    try {
      setLoading(true);
      const params = [];
      if (search) params.push(`search=${encodeURIComponent(search)}`);
      if (deptFilter) params.push(`department=${deptFilter}`);
      const qs = params.length ? `?${params.join('&')}` : '';
      const res = await api.get(`/employees/directory${qs}`);
      if (res.success) setEmployees(res.employees);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepts = async () => {
    try {
      const res = await api.get('/departments');
      if (res.success) setDepartments(res.departments);
    } catch (e) {}
  };

  useEffect(() => { fetchDirectory(); fetchDepts(); }, [search, deptFilter]);

  // Group by department for dept-wise view
  const groupedByDept = employees.reduce((acc, emp) => {
    const deptName = emp.department?.name || 'Unassigned';
    if (!acc[deptName]) acc[deptName] = [];
    acc[deptName].push(emp);
    return acc;
  }, {});

  const getInitials = (f, l) => `${f?.[0] || ''}${l?.[0] || ''}`.toUpperCase();

  const AVATAR_COLORS = [
    'linear-gradient(135deg,#6777ef,#3f51b5)',
    'linear-gradient(135deg,#2ebd7f,#059669)',
    'linear-gradient(135deg,#ffb119,#d97706)',
    'linear-gradient(135deg,#ff5b5b,#dc2626)',
    'linear-gradient(135deg,#3ab7e8,#0284c7)',
    'linear-gradient(135deg,#d946ef,#9333ea)',
  ];

  const EmployeeCard = ({ emp, idx }) => {
    const avatarGrad = AVATAR_COLORS[idx % AVATAR_COLORS.length];
    return (
      <div
        className="emp-card-wrapper"
        style={{ perspective: '800px' }}
      >
        <div
          className="card card-glow"
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            textAlign: 'center', padding: '1.75rem 1rem 1.25rem',
            gap: '0.5rem', position: 'relative', overflow: 'hidden',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.18), 0 0 0 1px rgba(103,119,239,0.2)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = '';
            e.currentTarget.style.boxShadow = '';
          }}
        >
          {/* Decorative top gradient stripe */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
            background: avatarGrad,
          }} />

          {/* Avatar */}
          <div style={{ position: 'relative', marginTop: '0.5rem' }}>
            {emp.profileImage ? (
              <img
                src={emp.profileImage}
                alt={emp.firstName}
                style={{
                  width: '68px', height: '68px', borderRadius: '50%', objectFit: 'cover',
                  border: '3px solid var(--border-color)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                }}
              />
            ) : (
              <div style={{
                width: '68px', height: '68px', borderRadius: '50%',
                background: avatarGrad,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.35rem', fontWeight: 800, color: '#fff',
                boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
                border: '3px solid rgba(255,255,255,0.15)',
              }}>
                {getInitials(emp.firstName, emp.lastName)}
              </div>
            )}
            {/* Status Dot */}
            <span style={{
              position: 'absolute', bottom: '3px', right: '3px',
              width: '14px', height: '14px', borderRadius: '50%',
              background: emp.status === 'Active' ? '#2ebd7f' : '#ff5b5b',
              border: '2px solid var(--bg-secondary)',
              boxShadow: emp.status === 'Active' ? '0 0 8px rgba(46,189,127,0.5)' : '0 0 8px rgba(255,91,91,0.5)',
            }} title={emp.status || 'Active'} />
          </div>

          {/* Name & Designation */}
          <div>
            <strong style={{ fontSize: '0.95rem', display: 'block', lineHeight: 1.3 }}>
              {emp.firstName} {emp.lastName}
            </strong>
            <span style={{ fontSize: '0.78rem', color: 'var(--primary-accent)', fontWeight: 600 }}>
              {emp.designation || 'Employee'}
            </span>
          </div>

          {/* Department Badge */}
          <span style={{
            fontSize: '0.7rem', padding: '0.18rem 0.65rem', borderRadius: '99px',
            background: 'rgba(103,119,239,0.1)', color: 'var(--primary-accent)', fontWeight: 700,
            border: '1px solid rgba(103,119,239,0.15)',
          }}>
            {emp.department?.name || 'Unassigned'}
          </span>

          {/* Divider */}
          <div style={{ width: '100%', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {emp.email && (
              <a
                href={`mailto:${emp.email}`}
                style={{
                  fontSize: '0.75rem', color: 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '0.3rem', textDecoration: 'none', transition: 'color 0.2s',
                  borderRadius: '6px', padding: '0.2rem 0.5rem',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--primary-accent)'; e.currentTarget.style.background = 'rgba(103,119,239,0.06)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
              >
                <Mail size={12} /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>{emp.email}</span>
              </a>
            )}
            {emp.phone && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                <Phone size={12} /> {emp.phone}
              </span>
            )}
          </div>

          {/* Skills */}
          {emp.skills?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', justifyContent: 'center', marginTop: '0.1rem' }}>
              {emp.skills.slice(0, 3).map(skill => (
                <span key={skill} style={{
                  fontSize: '0.64rem', padding: '0.12rem 0.5rem', borderRadius: '99px',
                  background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)', fontWeight: 600,
                }}>
                  {skill}
                </span>
              ))}
              {emp.skills.length > 3 && (
                <span style={{ fontSize: '0.64rem', color: 'var(--text-secondary)', fontWeight: 600 }}>+{emp.skills.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };


  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '14px',
          background: 'linear-gradient(135deg, #3ab7e8 0%, #0284c7 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 15px rgba(58,183,232,0.3)',
        }}>
          <Users size={22} color="white" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Employee Directory</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            {employees.length} active colleagues across {Object.keys(groupedByDept).length} departments
          </p>
        </div>

        {/* View Toggle */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem', background: 'var(--bg-primary)', borderRadius: '10px', padding: '4px', border: '1px solid var(--border-color)' }}>
          {[{ val: 'grid', Icon: Users }, { val: 'dept', Icon: Building2 }].map(({ val, Icon }) => (
            <button key={val} onClick={() => setViewMode(val)}
              style={{
                padding: '0.35rem 0.75rem', borderRadius: '7px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: 600,
                background: viewMode === val ? 'var(--primary-accent)' : 'transparent',
                color: viewMode === val ? '#fff' : 'var(--text-secondary)',
              }}>
              <Icon size={14} /> {val === 'grid' ? 'All' : 'By Dept'}
            </button>
          ))}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="card" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <input type="text" className="form-control" placeholder="Search by name, designation..."
              value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.5rem' }} />
            <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          </div>
          <select className="form-control" value={deptFilter} onChange={e => setDeptFilter(e.target.value)} style={{ width: '200px' }}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
          {(search || deptFilter) && (
            <button className="btn btn-secondary" onClick={() => { setSearch(''); setDeptFilter(''); }}>Clear</button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <SkeletonCardGrid count={8} minWidth="200px" />
      ) : employees.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Users size={48} style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-secondary)' }}>No employees found</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.25rem' }}>
          {employees.map((emp, i) => <EmployeeCard key={emp._id} emp={emp} idx={i} />)}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {Object.entries(groupedByDept).map(([deptName, emps]) => (
            <div key={deptName}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <Building2 size={18} color="var(--primary-accent)" />
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{deptName}</h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{emps.length} members</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border-color)', marginLeft: '0.5rem' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                {emps.map((emp, i) => <EmployeeCard key={emp._id} emp={emp} idx={i} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Directory;
