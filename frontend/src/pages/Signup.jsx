import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

const Signup = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    gender: 'Male',
    designation: 'Software Developer',
    department: 'Engineering',
    role: 'employee',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const { setUser } = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setError('');
      setSuccess('');
      setLoading(true);

      const res = await api.post('/auth/register', formData);
      if (res.success) {
        setSuccess('Account created successfully! Logging in...');
        localStorage.setItem('ems_token', res.token);
        setUser(res.user);
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      } else {
        setError(res.message || 'Registration failed');
      }
    } catch (err) {
      setError(err.message || 'Connection to server failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen" style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #e5effa 0%, #cfe3f5 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Outer dual-pane card wrapper */}
      <div style={{
        width: '940px',
        maxWidth: '95%',
        height: '680px',
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.08)',
        display: 'flex',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.4)'
      }}>
        
        {/* Left Half: Sign-up Form (52% width) */}
        <div style={{
          width: '52%',
          padding: '2rem 3rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          backgroundColor: '#ffffff',
          overflowY: 'auto'
        }}>
          
          <h2 style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: '#111111',
            fontFamily: "'Outfit', sans-serif",
            marginBottom: '0.25rem'
          }}>
            Create account
          </h2>
          <p style={{
            fontSize: '0.825rem',
            color: '#718096',
            marginBottom: '1.25rem'
          }}>
            Enter details to create your EMS workspace profile
          </p>

          {error && (
            <div className="alert alert-danger" style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.8rem', marginBottom: '1rem' }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {success && (
            <div className="alert alert-success" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', marginBottom: '1rem' }}>
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            
            {/* First and Last Name row */}
            <div className="form-row">
              <div style={{ position: 'relative' }}>
                <label style={{
                  position: 'absolute',
                  left: '12px',
                  top: '-10px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  backgroundColor: '#ffffff',
                  padding: '0 4px',
                  color: '#718096',
                  zIndex: 2,
                }}>
                  First Name *
                </label>
                <input
                  type="text"
                  name="firstName"
                  className="form-control"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  style={{
                    padding: '0.75rem 0.85rem',
                    fontSize: '0.9rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    backgroundColor: '#ffffff',
                    color: '#1e293b'
                  }}
                  required
                />
              </div>
              
              <div style={{ position: 'relative' }}>
                <label style={{
                  position: 'absolute',
                  left: '12px',
                  top: '-10px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  backgroundColor: '#ffffff',
                  padding: '0 4px',
                  color: '#718096',
                  zIndex: 2,
                }}>
                  Last Name *
                </label>
                <input
                  type="text"
                  name="lastName"
                  className="form-control"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  style={{
                    padding: '0.75rem 0.85rem',
                    fontSize: '0.9rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    backgroundColor: '#ffffff',
                    color: '#1e293b'
                  }}
                  required
                />
              </div>
            </div>

            {/* Email Input */}
            <div style={{ position: 'relative' }}>
              <label style={{
                position: 'absolute',
                left: '12px',
                top: '-10px',
                fontSize: '0.7rem',
                fontWeight: 600,
                backgroundColor: '#ffffff',
                padding: '0 4px',
                color: '#718096',
                zIndex: 2,
              }}>
                Work Email *
              </label>
              <input
                type="email"
                name="email"
                className="form-control"
                placeholder="name@company.com"
                value={formData.email}
                onChange={handleInputChange}
                style={{
                  padding: '0.75rem 0.85rem',
                  fontSize: '0.9rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  color: '#1e293b'
                }}
                required
              />
            </div>

            {/* Password Input */}
            <div style={{ position: 'relative' }}>
              <label style={{
                position: 'absolute',
                left: '12px',
                top: '-10px',
                fontSize: '0.7rem',
                fontWeight: 600,
                backgroundColor: '#ffffff',
                padding: '0 4px',
                color: '#718096',
                zIndex: 2,
              }}>
                Security Password *
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                className="form-control"
                placeholder="Min 6 characters"
                value={formData.password}
                onChange={handleInputChange}
                style={{
                  padding: '0.75rem 2.5rem 0.75rem 0.85rem',
                  fontSize: '0.9rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  color: '#1e293b'
                }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  padding: '4px'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Phone, Gender, Designation row */}
            <div className="form-row">
              <div style={{ position: 'relative' }}>
                <label style={{
                  position: 'absolute',
                  left: '12px',
                  top: '-10px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  backgroundColor: '#ffffff',
                  padding: '0 4px',
                  color: '#718096',
                  zIndex: 2,
                }}>
                  Phone Number
                </label>
                <input
                  type="text"
                  name="phone"
                  className="form-control"
                  placeholder="e.g. 1234567890"
                  value={formData.phone}
                  onChange={handleInputChange}
                  style={{
                    padding: '0.75rem 0.85rem',
                    fontSize: '0.9rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    backgroundColor: '#ffffff',
                    color: '#1e293b'
                  }}
                />
              </div>

              <div style={{ position: 'relative' }}>
                <label style={{
                  position: 'absolute',
                  left: '12px',
                  top: '-10px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  backgroundColor: '#ffffff',
                  padding: '0 4px',
                  color: '#718096',
                  zIndex: 2,
                }}>
                  Designation / Title
                </label>
                <input
                  type="text"
                  name="designation"
                  className="form-control"
                  value={formData.designation}
                  onChange={handleInputChange}
                  style={{
                    padding: '0.75rem 0.85rem',
                    fontSize: '0.9rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    backgroundColor: '#ffffff',
                    color: '#1e293b'
                  }}
                />
              </div>
            </div>

            {/* Gender field */}
            <div style={{ position: 'relative' }}>
              <label style={{
                position: 'absolute',
                left: '12px',
                top: '-10px',
                fontSize: '0.7rem',
                fontWeight: 600,
                backgroundColor: '#ffffff',
                padding: '0 4px',
                color: '#718096',
                zIndex: 2,
              }}>
                Gender
              </label>
              <select
                name="gender"
                className="form-control"
                value={formData.gender}
                onChange={handleInputChange}
                style={{
                  padding: '0.75rem 0.85rem',
                  fontSize: '0.9rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  color: '#1e293b'
                }}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Department and System Role row */}
            <div className="form-row">
              <div style={{ position: 'relative' }}>
                <label style={{
                  position: 'absolute',
                  left: '12px',
                  top: '-10px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  backgroundColor: '#ffffff',
                  padding: '0 4px',
                  color: '#718096',
                  zIndex: 2,
                }}>
                  Department Name
                </label>
                <select
                  name="department"
                  className="form-control"
                  value={formData.department}
                  onChange={handleInputChange}
                  style={{
                    padding: '0.75rem 0.85rem',
                    fontSize: '0.9rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    backgroundColor: '#ffffff',
                    color: '#1e293b'
                  }}
                >
                  <option value="Engineering">Engineering</option>
                  <option value="Human Resources">Human Resources</option>
                  <option value="Sales">Sales</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Design">Design</option>
                </select>
              </div>

              <div style={{ position: 'relative' }}>
                <label style={{
                  position: 'absolute',
                  left: '12px',
                  top: '-10px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  backgroundColor: '#ffffff',
                  padding: '0 4px',
                  color: '#718096',
                  zIndex: 2,
                }}>
                  Access Role
                </label>
                <select
                  name="role"
                  className="form-control"
                  value={formData.role}
                  onChange={handleInputChange}
                  style={{
                    padding: '0.75rem 0.85rem',
                    fontSize: '0.9rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    backgroundColor: '#ffffff',
                    color: '#1e293b'
                  }}
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Department Manager</option>
                  <option value="hr">HR Admin</option>
                  <option value="admin">Super Admin</option>
                </select>
              </div>
            </div>

            {/* Custom copper-bronze-to-violet gradient register button */}
            <button
              type="submit"
              className="btn"
              style={{
                width: '100%',
                padding: '0.85rem',
                fontSize: '0.95rem',
                fontWeight: 700,
                color: '#ffffff',
                background: 'linear-gradient(135deg, #8a7a6b 0%, #6b5c7b 100%)',
                borderRadius: '8px',
                boxShadow: '0 8px 20px rgba(107, 92, 123, 0.3)',
                marginTop: '0.25rem'
              }}
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Register'}
            </button>
          </form>

          {/* Sign In Redirect link */}
          <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.825rem', color: '#64748b' }}>
            Already have an account? <Link to="/login" style={{ color: '#6777ef', fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
          </div>

        </div>

        {/* Right Half: Premium SVG Graphic Vase Illustration (48% width) */}
        <div style={{
          width: '48%',
          backgroundColor: '#efebe3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}>
          {/* Custom vector illustration SVG mirroring the flower pot art precisely */}
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 320 450"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: 'block' }}
          >
            <path
              d="M30 320C60 280 180 320 220 340C260 360 310 400 300 450L0 450L0 350C10 340 20 330 30 320Z"
              fill="#e2dfd6"
              opacity="0.75"
            />
            <path
              d="M180 120C240 100 320 180 300 240C280 300 220 320 160 280C100 240 120 140 180 120Z"
              fill="#e7e3da"
              opacity="0.6"
            />

            {/* Pink Coral Sun */}
            <circle cx="205" cy="180" r="54" fill="#f89974" opacity="0.8" />

            {/* Vase / Pot Base */}
            <path d="M190 262C190 258 220 258 220 262V270H190V262Z" fill="#005d63" />
            <path d="M190 270C178 270 174 340 190 355H220C236 340 232 270 220 270H190Z" fill="#006b72" />
            
            {/* Decorative vase patterns */}
            <path d="M195 280V345" stroke="#005a61" strokeWidth="1.5" />
            <path d="M202 275V350" stroke="#005a61" strokeWidth="1.5" />
            <path d="M208 274V352" stroke="#005d63" strokeWidth="1.5" />
            <path d="M215 275V350" stroke="#005a61" strokeWidth="1.5" />
            <path d="M222 280V345" stroke="#005a61" strokeWidth="1.5" />

            {/* Vase Handles */}
            <path d="M179 295C175 295 174 315 179 315" stroke="#005d63" strokeWidth="2" fill="none" />
            <path d="M231 295C235 295 236 315 231 315" stroke="#005d63" strokeWidth="2" fill="none" />

            {/* Green Leafy Stems emerging from pot */}
            <path d="M205 260V195" stroke="#13271d" strokeWidth="1.5" />
            
            {/* Leaf 1 */}
            <path d="M205 240C190 240 185 220 188 200C198 220 200 230 205 235Z" fill="#13271d" opacity="0.85" />
            <path d="M205 240C190 240 185 220 188 200" stroke="#13271d" strokeWidth="1.5" />

            {/* Leaf 2 */}
            <path d="M205 245C220 245 225 225 222 205C212 225 210 235 205 240Z" fill="#13271d" opacity="0.85" />
            <path d="M205 245C220 245 225 225 222 205" stroke="#13271d" strokeWidth="1.5" />

            {/* Leaf 3 */}
            <path d="M205 220C188 220 182 195 188 175C198 195 202 210 205 215Z" fill="#13271d" opacity="0.85" />
            <path d="M205 220C188 220 182 195 188 175" stroke="#13271d" strokeWidth="1.5" />

            {/* Leaf 4 */}
            <path d="M205 225C222 225 228 200 222 180C212 200 208 215 205 220Z" fill="#13271d" opacity="0.85" />
            <path d="M205 225C222 225 228 200 222 180" stroke="#13271d" strokeWidth="1.5" />

            {/* Daisy Flower petals (Center x=205, y=180) */}
            <g transform="translate(205, 180)">
              <polygon points="0,-16 -4,-4 0,0 4,-4" fill="#ffffff" />
              <polygon points="0,16 -4,4 0,0 4,4" fill="#ffffff" />
              <polygon points="-16,0 -4,-4 0,0 -4,4" fill="#ffffff" />
              <polygon points="16,0 4,-4 0,0 4,4" fill="#ffffff" />
              <polygon points="-11,-11 -6,-2 0,0 -2,-6" fill="#ffffff" />
              <polygon points="11,11 6,2 0,0 2,6" fill="#ffffff" />
              <polygon points="-11,11 -6,2 0,0 -2,6" fill="#ffffff" />
              <polygon points="11,-11 6,-2 0,0 2,-6" fill="#ffffff" />
              <polygon points="-6,-15 -2,-3 0,0 -3,-3" fill="#ffffff" opacity="0.9"/>
              <polygon points="6,15 2,3 0,0 3,3" fill="#ffffff" opacity="0.9"/>
              <polygon points="-15,6 -3,-2 0,0 -3,2" fill="#ffffff" opacity="0.9"/>
              <polygon points="15,-6 3,2 0,0 3,-2" fill="#ffffff" opacity="0.9"/>
              <circle cx="0" cy="0" r="4.5" fill="#cf5c43" />
            </g>

            {/* Abstract floor lines */}
            <ellipse cx="205" cy="370" rx="30" ry="4" stroke="#dcd9d2" strokeWidth="1" />
            <ellipse cx="205" cy="378" rx="45" ry="5" stroke="#dcd9d2" strokeWidth="1" />
            <ellipse cx="205" cy="386" rx="55" ry="6" stroke="#dcd9d2" strokeWidth="1" opacity="0.5" />
          </svg>

        </div>

      </div>
    </div>
  );
};

export default Signup;
