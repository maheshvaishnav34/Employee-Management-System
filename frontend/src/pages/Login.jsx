import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, AlertCircle, ShieldCheck, Users, BarChart2, Lock, Waves, Sparkles, Droplet } from 'lucide-react';

/* ── Premium Interactive Canvas — Real Stars + Water ── */
const ParticleCanvas = ({ mode = 'stardust' }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let time = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();

    // ── Mouse tracking ──
    const mouse = { x: null, y: null, radius: 150 };

    // ── Realistic Stars ──
    const starColors = [
      [255, 255, 255],   // pure white
      [200, 220, 255],   // cool blue-white
      [255, 240, 200],   // warm golden
      [180, 200, 255],   // blue
      [255, 210, 180],   // orange-warm
      [200, 255, 240],   // teal-white
    ];
    const starCount = 140;
    const stars = Array.from({ length: starCount }, () => {
      const col = starColors[Math.floor(Math.random() * starColors.length)];
      return {
        x: Math.random() * (canvas.width || 1600),
        y: Math.random() * (canvas.height || 900) * 0.85,
        r: Math.random() * 1.6 + 0.3,
        baseR: 0,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.08,
        brightness: Math.random(),
        twinkleSpeed: 0.005 + Math.random() * 0.018,
        col,
        // Large "hero" stars get cross flares
        isHero: Math.random() < 0.12,
        flareLen: 10 + Math.random() * 18,
        shootable: false,
      };
    });
    stars.forEach(s => { s.baseR = s.r; s.r = s.isHero ? s.r * 2 : s.r; });

    // ── Shooting Stars ──
    let shootingStars = [];
    let shootTimer = 0;
    const spawnShooter = () => {
      const side = Math.random() < 0.7 ? 'top' : 'right';
      const x = side === 'top' ? Math.random() * canvas.width : canvas.width + 20;
      const y = side === 'top' ? Math.random() * canvas.height * 0.3 : Math.random() * canvas.height * 0.4;
      const angle = Math.PI / 4 + (Math.random() - 0.5) * 0.6;
      const speed = 8 + Math.random() * 12;
      shootingStars.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        len: 80 + Math.random() * 120,
        o: 1,
        fade: 0.015 + Math.random() * 0.01,
        trail: [],
      });
    };

    // ── Waves ──
    const waves = [
      { yR: 0.78, len: 0.0022, amp: 32, sp: 0.006, ph: 0, r: 88, g: 120, b: 240, a: 0.22 },
      { yR: 0.84, len: 0.0038, amp: 22, sp: 0.011, ph: 1.2, r: 40, g: 170, b: 220, a: 0.18 },
      { yR: 0.89, len: 0.003,  amp: 40, sp: 0.004, ph: 2.5, r: 30, g: 200, b: 160, a: 0.14 },
      { yR: 0.94, len: 0.006,  amp: 14, sp: 0.018, ph: 0.8, r: 60, g: 100, b: 255, a: 0.10 },
    ];

    // ── Bubbles ──
    const bubbles = Array.from({ length: 28 }, () => ({
      x: Math.random() * (canvas.width || 1600),
      y: (canvas.height || 900) + Math.random() * 300,
      r: Math.random() * 4 + 1.5,
      vy: -(Math.random() * 0.7 + 0.25),
      swSp: 0.01 + Math.random() * 0.02,
      swR: 5 + Math.random() * 14,
      ph: Math.random() * Math.PI * 2,
      o: Math.random() * 0.3 + 0.08,
    }));

    // ── Ripples ──
    let ripples = [];
    const addRipple = (x, y) => {
      for (let i = 0; i < 3; i++) {
        ripples.push({
          x, y,
          r: i * 18,
          maxR: Math.max(canvas.width, canvas.height) * (0.25 + i * 0.1),
          speed: 5 + i * 1.5,
          strength: 18 - i * 3,
          o: 1,
          delay: i * 6,
          alive: i * 6,
        });
      }
    };

    const handleGlobalClick = (e) => {
      const card = document.getElementById('login-main-card');
      if (card && card.contains(e.target)) return;
      const sw = document.getElementById('theme-switcher-widget');
      if (sw && sw.contains(e.target)) return;
      const rect = canvas.getBoundingClientRect();
      addRipple(e.clientX - rect.left, e.clientY - rect.top);
    };
    const handleMM = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const handleML = () => { mouse.x = null; mouse.y = null; };

    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('mousemove', handleMM);
    window.addEventListener('mouseout', handleML);
    window.addEventListener('resize', resize);

    // ── Draw a single realistic glowing star ──
    const drawStar = (x, y, r, brightness, col, isHero, flareLen) => {
      const [cr, cg, cb] = col;
      const alpha = brightness;

      // Outer glow (large soft halo)
      const halo = ctx.createRadialGradient(x, y, 0, x, y, r * (isHero ? 14 : 7));
      halo.addColorStop(0, `rgba(${cr},${cg},${cb},${alpha * 0.5})`);
      halo.addColorStop(0.3, `rgba(${cr},${cg},${cb},${alpha * 0.15})`);
      halo.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      ctx.beginPath();
      ctx.arc(x, y, r * (isHero ? 14 : 7), 0, Math.PI * 2);
      ctx.fillStyle = halo;
      ctx.fill();

      // Inner bright core
      const core = ctx.createRadialGradient(x, y, 0, x, y, r * 1.8);
      core.addColorStop(0, `rgba(255,255,255,${alpha})`);
      core.addColorStop(0.5, `rgba(${cr},${cg},${cb},${alpha * 0.8})`);
      core.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      ctx.beginPath();
      ctx.arc(x, y, r * 1.8, 0, Math.PI * 2);
      ctx.fillStyle = core;
      ctx.fill();

      // Cross diffraction flares for hero stars
      if (isHero && brightness > 0.4) {
        const fl = flareLen * brightness;
        ctx.save();
        ctx.globalAlpha = alpha * 0.55;
        ctx.strokeStyle = `rgb(${cr},${cg},${cb})`;
        ctx.lineWidth = 0.9;
        [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4].forEach(angle => {
          const grad = ctx.createLinearGradient(
            x - Math.cos(angle) * fl, y - Math.sin(angle) * fl,
            x + Math.cos(angle) * fl, y + Math.sin(angle) * fl,
          );
          grad.addColorStop(0, `rgba(${cr},${cg},${cb},0)`);
          grad.addColorStop(0.5, `rgba(255,255,255,${alpha * 0.9})`);
          grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
          ctx.beginPath();
          ctx.moveTo(x - Math.cos(angle) * fl, y - Math.sin(angle) * fl);
          ctx.lineTo(x + Math.cos(angle) * fl, y + Math.sin(angle) * fl);
          ctx.strokeStyle = grad;
          ctx.stroke();
        });
        ctx.restore();
      }
    };

    const draw = () => {
      time += 0.016;
      shootTimer += 1;

      // ── 1. Paint deep-space background gradient on canvas ──
      const bgGrad = ctx.createLinearGradient(0, 0, canvas.width * 0.3, canvas.height);
      if (mode === 'ocean') {
        bgGrad.addColorStop(0,   '#050a18');
        bgGrad.addColorStop(0.5, '#091428');
        bgGrad.addColorStop(1,   '#0a1a2e');
      } else if (mode === 'sky') {
        bgGrad.addColorStop(0,   '#03050f');
        bgGrad.addColorStop(0.4, '#070a20');
        bgGrad.addColorStop(1,   '#04060e');
      } else { // stardust
        bgGrad.addColorStop(0,   '#020510');
        bgGrad.addColorStop(0.45,'#06091c');
        bgGrad.addColorStop(1,   '#030715');
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // ── 2. Nebula / Milky Way dust clouds ──
      if (mode === 'sky' || mode === 'stardust') {
        const nebulaData = [
          { x: canvas.width * 0.25, y: canvas.height * 0.35, rx: canvas.width * 0.35, ry: canvas.height * 0.2, col: [103, 80, 200], a: 0.06 },
          { x: canvas.width * 0.7,  y: canvas.height * 0.25, rx: canvas.width * 0.25, ry: canvas.height * 0.15, col: [40, 80, 180], a: 0.05 },
          { x: canvas.width * 0.5,  y: canvas.height * 0.6,  rx: canvas.width * 0.4,  ry: canvas.height * 0.18, col: [80, 40, 140], a: 0.04 },
        ];
        nebulaData.forEach(n => {
          const ng = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, Math.max(n.rx, n.ry));
          const [r, g, b] = n.col;
          ng.addColorStop(0,   `rgba(${r},${g},${b},${n.a})`);
          ng.addColorStop(0.5, `rgba(${r},${g},${b},${n.a * 0.5})`);
          ng.addColorStop(1,   `rgba(${r},${g},${b},0)`);
          ctx.save();
          ctx.scale(n.rx / Math.max(n.rx, n.ry), n.ry / Math.max(n.rx, n.ry));
          ctx.beginPath();
          ctx.arc(
            n.x * Math.max(n.rx, n.ry) / n.rx,
            n.y * Math.max(n.rx, n.ry) / n.ry,
            Math.max(n.rx, n.ry), 0, Math.PI * 2
          );
          ctx.fillStyle = ng;
          ctx.fill();
          ctx.restore();
        });
      }

      // ── 3. Realistic Stars (sky or stardust mode) ──
      if (mode === 'sky' || mode === 'stardust') {
        stars.forEach(s => {
          s.x += s.vx;
          s.y += s.vy;
          if (s.x < 0) s.x = canvas.width;
          if (s.x > canvas.width) s.x = 0;
          if (s.y < 0) s.y = canvas.height * 0.85;
          if (s.y > canvas.height * 0.85) s.y = 0;

          // Mouse deflection
          if (mouse.x !== null && mouse.y !== null) {
            const dx = s.x - mouse.x;
            const dy = s.y - mouse.y;
            const dist = Math.hypot(dx, dy);
            if (dist < mouse.radius) {
              const force = (mouse.radius - dist) / mouse.radius;
              const angle = Math.atan2(dy, dx);
              s.x += Math.cos(angle) * force * 1.8;
              s.y += Math.sin(angle) * force * 1.8;
            }
          }

          // Twinkling
          s.brightness += s.twinkleSpeed;
          if (s.brightness > 1) { s.brightness = 1; s.twinkleSpeed = -Math.abs(s.twinkleSpeed); }
          if (s.brightness < 0.15) { s.brightness = 0.15; s.twinkleSpeed = Math.abs(s.twinkleSpeed); }

          drawStar(s.x, s.y, s.r, s.brightness, s.col, s.isHero, s.flareLen);
        });

        // Constellation lines between nearby stars
        ctx.save();
        stars.forEach((s, i) => {
          stars.slice(i + 1, i + 8).forEach(o => {
            const dist = Math.hypot(s.x - o.x, s.y - o.y);
            if (dist < 90) {
              const alpha = (1 - dist / 90) * 0.055 * ((s.brightness + o.brightness) / 2);
              ctx.beginPath();
              ctx.moveTo(s.x, s.y);
              ctx.lineTo(o.x, o.y);
              ctx.strokeStyle = `rgba(170, 190, 255, ${alpha})`;
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          });
        });
        ctx.restore();
      }

      // ── 4. Shooting Stars ──
      if ((mode === 'sky' || mode === 'stardust') && shootTimer > 220) {
        shootTimer = 0;
        if (Math.random() < 0.7) spawnShooter();
      }
      shootingStars = shootingStars.filter(ss => ss.o > 0);
      shootingStars.forEach(ss => {
        ss.trail.push({ x: ss.x, y: ss.y });
        if (ss.trail.length > 22) ss.trail.shift();
        ss.x += ss.vx;
        ss.y += ss.vy;
        ss.o -= ss.fade;

        if (ss.trail.length > 1) {
          ctx.save();
          for (let i = 1; i < ss.trail.length; i++) {
            const ratio = i / ss.trail.length;
            ctx.beginPath();
            ctx.moveTo(ss.trail[i - 1].x, ss.trail[i - 1].y);
            ctx.lineTo(ss.trail[i].x, ss.trail[i].y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${ss.o * ratio * 0.9})`;
            ctx.lineWidth = ratio * 2.5;
            ctx.stroke();
          }
          ctx.restore();
        }
        // Head glow
        const hg = ctx.createRadialGradient(ss.x, ss.y, 0, ss.x, ss.y, 6);
        hg.addColorStop(0, `rgba(255,255,255,${ss.o})`);
        hg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath();
        ctx.arc(ss.x, ss.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = hg;
        ctx.fill();
      });

      // ── 5. Ripple rings ──
      ripples = ripples.filter(rip => rip.o > 0);
      ripples.forEach(rip => {
        if (rip.alive > 0) { rip.alive--; return; }
        rip.r += rip.speed;
        rip.o = Math.max(0, 1 - rip.r / rip.maxR);

        const grad = ctx.createRadialGradient(rip.x, rip.y, Math.max(0, rip.r - 4), rip.x, rip.y, rip.r + 4);
        grad.addColorStop(0, `rgba(150, 200, 255, 0)`);
        grad.addColorStop(0.5, `rgba(180, 220, 255, ${rip.o * 0.18})`);
        grad.addColorStop(1, `rgba(150, 200, 255, 0)`);
        ctx.beginPath();
        ctx.arc(rip.x, rip.y, rip.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(200, 230, 255, ${rip.o * 0.25})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Ripple pushes stars
        if (mode === 'sky' || mode === 'stardust') {
          stars.forEach(s => {
            const dx = s.x - rip.x;
            const dy = s.y - rip.y;
            const dist = Math.hypot(dx, dy);
            const diff = dist - rip.r;
            if (Math.abs(diff) < 40) {
              const force = (1 - Math.abs(diff) / 40) * rip.strength * rip.o;
              s.x += (dx / (dist || 1)) * force;
              s.y += (dy / (dist || 1)) * force;
              s.brightness = Math.min(1.0, s.brightness + 0.35);
            }
          });
        }
      });

      // ── 6. Water Waves (ocean or stardust) ──
      if (mode === 'ocean' || mode === 'stardust') {
        waves.forEach(w => {
          w.ph += w.sp;
          ctx.beginPath();
          ctx.moveTo(0, canvas.height);
          for (let x = 0; x <= canvas.width; x += 4) {
            const y = Math.sin(x * w.len + w.ph) * w.amp
                    + Math.sin(x * w.len * 1.7 + w.ph * 1.3) * w.amp * 0.3
                    + canvas.height * w.yR;
            ctx.lineTo(x, y);
          }
          ctx.lineTo(canvas.width, canvas.height);
          ctx.closePath();

          // Gradient fill for each wave
          const wg = ctx.createLinearGradient(0, canvas.height * w.yR, 0, canvas.height);
          wg.addColorStop(0,   `rgba(${w.r},${w.g},${w.b},${w.a})`);
          wg.addColorStop(0.5, `rgba(${w.r},${w.g},${w.b},${w.a * 0.6})`);
          wg.addColorStop(1,   `rgba(${w.r},${w.g},${w.b},${w.a * 0.3})`);
          ctx.fillStyle = wg;
          ctx.fill();

          // Bright wave crest
          ctx.beginPath();
          ctx.moveTo(0, canvas.height * w.yR);
          for (let x = 0; x <= canvas.width; x += 4) {
            const y = Math.sin(x * w.len + w.ph) * w.amp
                    + Math.sin(x * w.len * 1.7 + w.ph * 1.3) * w.amp * 0.3
                    + canvas.height * w.yR;
            ctx.lineTo(x, y);
          }
          ctx.strokeStyle = `rgba(${w.r},${w.g},${w.b + 40},${w.a * 1.8})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        });
      }

      // ── 7. Bubbles (ocean or stardust) ──  
      if (mode === 'ocean' || mode === 'stardust') {
        bubbles.forEach(b => {
          b.y += b.vy;
          b.ph += b.swSp;
          const cx = b.x + Math.sin(b.ph) * b.swR;
          if (b.y < -10) {
            b.y = canvas.height + Math.random() * 200;
            b.x = Math.random() * canvas.width;
          }
          const bg = ctx.createRadialGradient(cx - b.r * 0.3, b.y - b.r * 0.3, 0, cx, b.y, b.r);
          bg.addColorStop(0, `rgba(255,255,255,${b.o * 0.5})`);
          bg.addColorStop(0.6, `rgba(100,200,255,${b.o * 0.2})`);
          bg.addColorStop(1, `rgba(50,150,255,${b.o * 0.08})`);
          ctx.beginPath();
          ctx.arc(cx, b.y, b.r, 0, Math.PI * 2);
          ctx.fillStyle = bg;
          ctx.fill();
          ctx.strokeStyle = `rgba(120,210,255,${b.o * 0.55})`;
          ctx.lineWidth = 0.7;
          ctx.stroke();
        });
      }

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('mousemove', handleMM);
      window.removeEventListener('mouseout', handleML);
      window.removeEventListener('resize', resize);
    };
  }, [mode]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  );
};


/* ── Feature highlight pill ── */
const FeatureItem = ({ icon: Icon, text }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '0.65rem',
    padding: '0.55rem 0.9rem', borderRadius: '10px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.15)',
    backdropFilter: 'blur(8px)',
    fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.9)',
  }}>
    <Icon size={16} style={{ flexShrink: 0, color: '#fff' }} />
    {text}
  </div>
);

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [focusedField, setFocusedField] = useState('');
  const [bgMode, setBgMode] = useState('stardust'); // 'stardust' | 'ocean' | 'sky'

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleRoleSelect = (role) => {
    setError('');
    if (role === 'admin') { setEmail('admin@ems.com'); setPassword('admin123'); }
    else if (role === 'hr') { setEmail('hr@ems.com'); setPassword('hr1234'); }
    else if (role === 'manager') { setEmail('manager@ems.com'); setPassword('manager123'); }
    else if (role === 'employee') { setEmail('employee@ems.com'); setPassword('emp1234'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in all credentials'); return; }
    try {
      setError('');
      setLoading(true);
      const res = await login(email, password);
      if (res.success) { navigate('/dashboard'); }
      else { setError(res.message || 'Invalid credentials'); }
    } catch (err) {
      setError('Connection to auth server failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      width: '100vw', height: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #1a1f3e 0%, #0f172a 100%)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Floating Theme Switcher widget */}
      <div id="theme-switcher-widget" style={{
        position: 'absolute', top: '24px', right: '24px',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '24px', padding: '4px',
        display: 'flex', gap: '4px', zIndex: 10,
        backdropFilter: 'blur(16px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      }}>
        {[
          { mode: 'stardust', label: 'Stardust Ocean', icon: Droplet },
          { mode: 'ocean', label: 'Deep Ocean', icon: Waves },
          { mode: 'sky', label: 'Starry Sky', icon: Sparkles },
        ].map(item => {
          const Icon = item.icon;
          const isActive = bgMode === item.mode;
          return (
            <button
              key={item.mode}
              type="button"
              onClick={() => setBgMode(item.mode)}
              style={{
                background: isActive ? 'linear-gradient(135deg, #6777ef 0%, #3f51b5 100%)' : 'transparent',
                color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.65)',
                border: 'none', borderRadius: '20px',
                padding: '0.55rem 1rem', fontSize: '0.78rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: '0.45rem',
                cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                outline: 'none',
              }}
            >
              <Icon size={14} />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Mesh gradient blobs */}
      <div style={{
        position: 'absolute', width: '600px', height: '600px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(103,119,239,0.25) 0%, transparent 70%)',
        top: '-200px', left: '-100px', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', width: '500px', height: '500px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(46,189,127,0.15) 0%, transparent 70%)',
        bottom: '-150px', right: '-100px', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', width: '300px', height: '300px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,177,25,0.12) 0%, transparent 70%)',
        top: '40%', right: '15%', pointerEvents: 'none',
      }} />

      {/* Particle canvas */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <ParticleCanvas mode={bgMode} />
      </div>

      {/* Main card */}
      <div id="login-main-card" style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '28px',
        boxShadow: '0 30px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)',
        display: 'flex', overflow: 'hidden',
        backdropFilter: 'blur(20px)',
        position: 'relative', zIndex: 1,
      }}>

        {/* ── LEFT: Form Panel ── */}
        <div className="login-left-panel" style={{
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #6777ef 0%, #3f51b5 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(103,119,239,0.4)',
            }}>
              <ShieldCheck size={20} color="white" />
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#111', letterSpacing: '-0.02em' }}>EMS Hub</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>Employee Management System</div>
            </div>
          </div>

          <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#111', marginBottom: '0.35rem', letterSpacing: '-0.02em' }}>
            Welcome back 👋
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.75rem' }}>
            Sign in to your workspace
          </p>

          {/* Quick Login Badges */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
            {[
              { role: 'admin', label: 'Super Admin', bg: '#ff5b5b', shadow: 'rgba(255,91,91,0.3)' },
              { role: 'hr',    label: 'HR Admin',    bg: '#ffb119', shadow: 'rgba(255,177,25,0.3)' },
              { role: 'manager', label: 'Department Manager',   bg: '#a78bfa', shadow: 'rgba(167,139,250,0.3)' },
              { role: 'employee', label: 'Employee', bg: '#2ebd7f', shadow: 'rgba(46,189,127,0.3)' },
            ].map(({ role, label, bg, shadow }) => (
              <button
                key={role}
                type="button"
                onClick={() => handleRoleSelect(role)}
                style={{
                  background: bg, color: '#fff',
                  padding: '0.35rem 0.9rem',
                  fontSize: '0.78rem', borderRadius: '99px', fontWeight: 700,
                  border: 'none', cursor: 'pointer',
                  boxShadow: `0 3px 10px ${shadow}`,
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 6px 16px ${shadow}`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `0 3px 10px ${shadow}`; }}
              >
                {label}
              </button>
            ))}
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', alignSelf: 'center', marginLeft: '0.25rem' }}>← quick fill</span>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.7rem 1rem', borderRadius: '10px', marginBottom: '1.25rem',
              background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
              color: '#ef4444', fontSize: '0.85rem', fontWeight: 500,
            }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Email */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '0.4rem' }}>
                Email Address
              </label>
              <input
                type="email"
                className="form-control"
                placeholder="admin@ems.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField('')}
                style={{
                  padding: '0.85rem 1rem', fontSize: '0.9rem',
                  border: `1.5px solid ${focusedField === 'email' ? '#6777ef' : '#e2e8f0'}`,
                  borderRadius: '10px', background: '#fff', color: '#1e293b',
                  transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
                  boxShadow: focusedField === 'email' ? '0 0 0 3px rgba(103,119,239,0.12)' : 'none',
                  outline: 'none',
                }}
                required
              />
            </div>

            {/* Password */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151' }}>Password</label>
                <span style={{ fontSize: '0.75rem', color: '#6777ef', fontWeight: 600, cursor: 'pointer' }}>
                  Forgot Password?
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-control"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField('')}
                  style={{
                    padding: '0.85rem 2.75rem 0.85rem 1rem', fontSize: '0.9rem',
                    border: `1.5px solid ${focusedField === 'password' ? '#6777ef' : '#e2e8f0'}`,
                    borderRadius: '10px', background: '#fff', color: '#1e293b',
                    transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
                    boxShadow: focusedField === 'password' ? '0 0 0 3px rgba(103,119,239,0.12)' : 'none',
                    outline: 'none', width: '100%',
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8',
                    padding: '4px', display: 'flex',
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                style={{ width: '15px', height: '15px', accentColor: '#6777ef', cursor: 'pointer' }}
              />
              <label htmlFor="rememberMe" style={{ fontSize: '0.82rem', color: '#64748b', cursor: 'pointer', userSelect: 'none' }}>
                Keep me signed in
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '0.9rem',
                fontSize: '0.95rem', fontWeight: 700, color: '#fff',
                background: loading
                  ? 'rgba(103,119,239,0.7)'
                  : 'linear-gradient(135deg, #6777ef 0%, #3f51b5 100%)',
                borderRadius: '12px', border: 'none',
                boxShadow: loading ? 'none' : '0 6px 20px rgba(103,119,239,0.4)',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
            >
              {loading ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.7s linear infinite' }}>
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                  Authenticating...
                </>
              ) : (
                <><Lock size={16} /> Sign In</>
              )}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.82rem', color: '#64748b' }}>
            Don't have an account?{' '}
            <Link to="/signup" style={{ color: '#6777ef', fontWeight: 700, textDecoration: 'none' }}>
              Sign up
            </Link>
          </div>
        </div>

        {/* ── RIGHT: Feature Showcase Panel ── */}
        <div className="login-right-panel" style={{
        }}>
          {/* Decorative circles */}
          <div style={{
            position: 'absolute', top: '-40px', right: '-40px',
            width: '200px', height: '200px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          }} />
          <div style={{
            position: 'absolute', bottom: '-60px', left: '-30px',
            width: '250px', height: '250px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
          }} />

          {/* Heading */}
          <div>
            <h2 style={{
              fontSize: '1.8rem', fontWeight: 900, color: '#fff',
              lineHeight: 1.25, marginBottom: '0.75rem',
              textShadow: '0 2px 20px rgba(0,0,0,0.3)',
            }}>
              Everything you need<br />to manage your team
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.65 }}>
              A complete HR platform built for modern organizations.
              From attendance to payroll — all in one place.
            </p>
          </div>

          {/* Feature pills */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <FeatureItem icon={Users} text="Employee & Department Management" />
            <FeatureItem icon={BarChart2} text="Attendance Tracking & Analytics" />
            <ShieldCheck size={16} style={{ color: '#fff', display: 'none' }} />
            <FeatureItem icon={ShieldCheck} text="Role-Based Access Control" />
          </div>

          {/* Stats preview */}
          <div style={{ display: 'flex', gap: '1rem' }}>
            {[
              { val: '10+', label: 'Modules' },
              { val: '4',   label: 'User Roles' },
              { val: '99%', label: 'Uptime' },
            ].map(s => (
              <div key={s.label} style={{
                flex: 1, textAlign: 'center',
                padding: '0.85rem', borderRadius: '14px',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)', fontWeight: 600, marginTop: '0.3rem' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Bottom note */}
          <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
            EMS Hub v2.0 · Secure · Fast · Reliable
          </p>
        </div>

      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Login;
