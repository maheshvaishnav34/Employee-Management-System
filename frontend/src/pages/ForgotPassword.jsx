import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../utils/api';
import { Mail, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState('');

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/auth/forgot-password', { email: email.trim() });
      if (res.success) {
        setSuccess('Reset instructions verified! Redirecting to set your new password...');
        setTimeout(() => {
          navigate(`/reset-password?email=${encodeURIComponent(email.trim())}`);
        }, 1000);
      } else {
        setError(res.message || 'Unable to find account');
      }
    } catch (err) {
      setError(err.message || 'Connection to server failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: '#f8fafc',
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      padding: '2.5rem 1rem'
    }}>

      {/* ── Corporate Blue Waves Background ── */}
      <svg
        viewBox="0 0 1440 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 0
        }}
      >
        <path
          d="M720,0 C980,180 1150,120 1440,320 L1440,900 L0,900 C150,750 350,720 540,820 C850,980 1120,780 1440,680 L1440,0 Z"
          fill="url(#corpBlueGlow1)"
          opacity="0.4"
        />
        <path
          d="M0,280 C320,160 620,380 920,240 C1180,120 1340,210 1440,180 L1440,900 L0,900 Z"
          fill="url(#corpBlueGlow2)"
          opacity="0.3"
        />
        <path
          d="M0,0 C380,80 720,20 1080,140 C1280,210 1380,160 1440,110 L1440,0 Z"
          fill="#eff6ff"
          opacity="0.6"
        />
        <defs>
          <linearGradient id="corpBlueGlow1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#dbeafe" />
            <stop offset="60%" stopColor="#bfdbfe" />
            <stop offset="100%" stopColor="#e0f2fe" />
          </linearGradient>
          <linearGradient id="corpBlueGlow2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e0f2fe" />
            <stop offset="100%" stopColor="#f0f9ff" />
          </linearGradient>
        </defs>
      </svg>

      {/* ── Brand Logo & Header ── */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        marginBottom: '1.5rem',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <div style={{
          width: '74px',
          height: '74px',
          borderRadius: '50%',
          padding: '3px',
          background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
          boxShadow: '0 8px 24px rgba(37, 99, 235, 0.28)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '0.85rem'
        }}>
          <img
            src="/ems_badge_logo.png"
            alt="EMS Badge Logo"
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              objectFit: 'contain',
              backgroundColor: '#ffffff'
            }}
          />
        </div>

        <h1 style={{
          fontSize: '1.75rem',
          fontWeight: 800,
          color: '#0f172a',
          margin: 0,
          letterSpacing: '-0.02em'
        }}>
          Employee Management System
        </h1>
        <p style={{
          fontSize: '0.86rem',
          color: '#64748b',
          margin: '0.3rem 0 0 0',
          fontWeight: 500
        }}>
          Enterprise Workforce & Operations Platform
        </p>
      </div>

      {/* ── Main Clean Card ── */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        width: '100%',
        maxWidth: '460px',
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        padding: '2.25rem 2.5rem',
        boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(226, 232, 240, 0.8)'
      }}>

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{
            fontSize: '1.35rem',
            fontWeight: 800,
            color: '#0f172a',
            margin: '0 0 0.35rem 0'
          }}>
            Forgot Password
          </h2>
          <p style={{
            fontSize: '0.82rem',
            color: '#64748b',
            margin: 0
          }}>
            Enter your work email to reset your credentials
          </p>
        </div>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.55rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fee2e2',
            color: '#dc2626',
            borderRadius: '10px',
            padding: '0.65rem 0.85rem',
            fontSize: '0.82rem',
            marginBottom: '1.25rem'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.55rem',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#16a34a',
            borderRadius: '10px',
            padding: '0.65rem 0.85rem',
            fontSize: '0.82rem',
            marginBottom: '1.25rem'
          }}>
            <CheckCircle size={16} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.35rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: '#334155',
              marginBottom: '0.45rem'
            }}>
              Work Email Address
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              height: '44px',
              backgroundColor: '#ffffff',
              border: focusedField === 'email' ? '1.5px solid #2563eb' : '1.5px solid #cbd5e1',
              borderRadius: '10px',
              padding: '0 0.85rem',
              transition: 'all 0.2s ease',
              boxShadow: focusedField === 'email' ? '0 0 0 3px rgba(37, 99, 235, 0.12)' : 'none'
            }}>
              <Mail size={16} color="#94a3b8" style={{ flexShrink: 0 }} />
              <input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField('')}
                required
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  width: '100%',
                  marginLeft: '0.65rem',
                  fontSize: '0.88rem',
                  color: '#0f172a',
                  fontFamily: 'inherit'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              height: '46px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '0.94rem',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.28)',
              background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)'
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.filter = 'brightness(1.08)'; }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.filter = 'none'; }}
          >
            {loading ? 'Verifying Account...' : 'Continue to Reset Password'}
          </button>
        </form>

        <div style={{
          textAlign: 'center',
          marginTop: '1.45rem',
          fontSize: '0.82rem',
          color: '#64748b'
        }}>
          Remember your password?{' '}
          <Link
            to="/login"
            style={{
              color: '#2563eb',
              fontWeight: 700,
              textDecoration: 'none'
            }}
            onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
            onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
          >
            Back to Sign In
          </Link>
        </div>

      </div>

      <div style={{
        marginTop: '1.75rem',
        fontSize: '0.75rem',
        color: '#94a3b8',
        textAlign: 'center',
        position: 'relative',
        zIndex: 2
      }}>
        © 2026 Employee Management System (EMS). All rights reserved.
      </div>

    </div>
  );
};

export default ForgotPassword;
