import React, { useState } from 'react';
import { RefreshCw, Info, ServerCrash } from 'lucide-react';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const ServiceUnavailable = ({ info, onRecovered }) => {
  const [checking, setChecking] = useState(false);
  const [retryFeedback, setRetryFeedback] = useState('');

  const handleRetry = async () => {
    if (checking) return;
    setChecking(true);
    setRetryFeedback('');

    try {
      const response = await fetch(`${BASE_URL}/health`, {
        method: 'GET',
        cache: 'no-store',
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        if (data?.status === 'ok' || response.status === 200) {
          if (typeof onRecovered === 'function') {
            onRecovered();
          } else {
            window.location.reload();
          }
          return;
        }
      }

      const checkedAt = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setRetryFeedback(`Server is still unavailable (checked at ${checkedAt}).`);
    } catch {
      const checkedAt = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setRetryFeedback(`Unable to reach server (checked at ${checkedAt}).`);
    } finally {
      setChecking(false);
    }
  };

  const description =
    info?.message ||
    'The server is currently unable to handle your request due to temporary overload or maintenance.';

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: 'var(--bg-primary, #f8fafc)',
        color: 'var(--text-primary, #0f172a)',
        position: 'relative',
        overflow: 'hidden',
        padding: '1.5rem 2rem',
      }}
    >
      {/* Subtle decorative background waves */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-140px',
          right: '-140px',
          width: '440px',
          height: '440px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,99,235,0.12) 0%, rgba(37,99,235,0) 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: '-160px',
          left: '-140px',
          width: '420px',
          height: '420px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.10) 0%, rgba(59,130,246,0) 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Top Brand Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          maxWidth: '1120px',
          width: '100%',
          margin: '0 auto',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img
            src="/ems_logo.png"
            alt="EMS Logo"
            style={{ width: '42px', height: '42px', objectFit: 'contain', borderRadius: '10px' }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1d4ed8', lineHeight: 1.1 }}>
              EMS
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-secondary, #475569)' }}>
              Employee Management System
            </div>
          </div>
        </div>

        <div
          style={{
            paddingLeft: '1rem',
            borderLeft: '2px solid var(--border-color, #cbd5e1)',
            fontSize: '0.88rem',
            fontWeight: 500,
            color: 'var(--text-secondary, #475569)',
          }}
        >
          Manage &bull; Track &bull; Grow
        </div>
      </header>

      {/* Main Centered Content */}
      <main
        style={{
          maxWidth: '640px',
          width: '100%',
          margin: '2rem auto',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Cloud + Server Rack + Alert SVG Illustration */}
        <div style={{ marginBottom: '0.75rem' }}>
          <svg
            width="230"
            height="145"
            viewBox="0 0 230 145"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label="Server unavailable illustration"
          >
            {/* Cloud backdrop */}
            <path
              d="M46 122H184C199.464 122 212 109.464 212 94C212 79.776 201.391 68.027 187.643 66.235C184.452 40.168 162.238 20 135.3 20C115.66 20 98.545 30.733 89.493 46.665C85.641 44.961 81.384 44 76.9 44C59.834 44 46 57.834 46 74.9C46 76.021 46.06 77.129 46.178 78.219C32.391 80.525 22 92.517 22 106.9C22 115.239 32.745 122 46 122Z"
              fill="#DBEAFE"
            />
            {/* Server Rack */}
            <rect x="76" y="34" width="76" height="24" rx="6" fill="#60A5FA" />
            <rect x="76" y="62" width="76" height="24" rx="6" fill="#3B82F6" />
            <rect x="76" y="90" width="76" height="24" rx="6" fill="#2563EB" />
            {/* Rack dots & bars */}
            <circle cx="88" cy="46" r="2.5" fill="#EFF6FF" />
            <circle cx="96" cy="46" r="2.5" fill="#EFF6FF" />
            <circle cx="104" cy="46" r="2.5" fill="#EFF6FF" />
            <rect x="128" y="44" width="14" height="4" rx="2" fill="#1E40AF" />

            <circle cx="88" cy="74" r="2.5" fill="#EFF6FF" />
            <circle cx="96" cy="74" r="2.5" fill="#EFF6FF" />
            <circle cx="104" cy="74" r="2.5" fill="#EFF6FF" />
            <rect x="128" y="72" width="14" height="4" rx="2" fill="#1E3A8A" />

            <circle cx="88" cy="102" r="2.5" fill="#EFF6FF" />
            <circle cx="96" cy="102" r="2.5" fill="#EFF6FF" />
            <circle cx="104" cy="102" r="2.5" fill="#EFF6FF" />
            <rect x="128" y="100" width="14" height="4" rx="2" fill="#1E3A8A" />

            {/* Alert Exclamation Badge */}
            <circle cx="158" cy="70" r="23" fill="#FEE2E2" stroke="#EF4444" strokeWidth="4" />
            <rect x="155.5" y="57" width="5" height="16" rx="2.5" fill="#DC2626" />
            <circle cx="158" cy="79" r="3" fill="#DC2626" />

            {/* Accent lines */}
            <line x1="176" y1="24" x2="181" y2="14" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" />
            <line x1="186" y1="30" x2="196" y2="23" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" />
            <line x1="190" y1="41" x2="201" y2="41" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>

        <h1
          style={{
            fontSize: 'clamp(3.25rem, 6vw, 4.5rem)',
            fontWeight: 900,
            lineHeight: 1,
            margin: '0 0 0.35rem',
            color: 'var(--text-primary, #0f296b)',
            letterSpacing: '-0.03em',
          }}
        >
          503
        </h1>

        <h2
          style={{
            fontSize: 'clamp(1.35rem, 2.5vw, 1.85rem)',
            fontWeight: 800,
            margin: '0 0 0.75rem',
            color: 'var(--text-primary, #0f296b)',
          }}
        >
          Service Unavailable
        </h2>

        <p
          style={{
            fontSize: '1rem',
            lineHeight: 1.55,
            color: 'var(--text-secondary, #475569)',
            maxWidth: '500px',
            margin: '0 0 1.5rem',
          }}
        >
          {description}
        </p>

        {/* Info Box */}
        <div
          style={{
            width: '100%',
            background: 'var(--card-bg, #eff6ff)',
            border: '1px solid var(--border-color, #bfdbfe)',
            borderRadius: '14px',
            padding: '1.1rem 1.35rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem',
            textAlign: 'left',
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
            marginBottom: '1.6rem',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#2563eb',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: '2px',
            }}
          >
            <Info size={18} />
          </div>
          <div>
            <div
              style={{
                fontWeight: 700,
                fontSize: '0.96rem',
                color: 'var(--text-primary, #1e3a8a)',
                marginBottom: '0.35rem',
              }}
            >
              What you can do:
            </div>
            <ul
              style={{
                margin: 0,
                paddingLeft: '1.15rem',
                fontSize: '0.92rem',
                lineHeight: 1.6,
                color: 'var(--text-secondary, #334155)',
              }}
            >
              <li>Please try again after some time.</li>
              <li>If the problem persists, contact your system administrator.</li>
            </ul>
          </div>
        </div>

        {/* Try Again Button */}
        <button
          type="button"
          onClick={handleRetry}
          disabled={checking}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.82rem 2rem',
            borderRadius: '999px',
            border: 'none',
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            color: '#ffffff',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: checking ? 'wait' : 'pointer',
            boxShadow: '0 8px 20px rgba(37, 99, 235, 0.28)',
            opacity: checking ? 0.85 : 1,
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
        >
          <RefreshCw size={18} className={checking ? 'spin' : ''} />
          {checking ? 'Checking Server...' : 'Try Again'}
        </button>

        {retryFeedback && (
          <div
            style={{
              marginTop: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.84rem',
              color: '#dc2626',
              fontWeight: 500,
            }}
          >
            <ServerCrash size={15} />
            <span>{retryFeedback}</span>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-color, #cbd5e1)',
          paddingTop: '1rem',
          textAlign: 'center',
          fontSize: '0.84rem',
          color: 'var(--text-secondary, #475569)',
          maxWidth: '1120px',
          width: '100%',
          margin: '0 auto',
          position: 'relative',
          zIndex: 1,
        }}
      >
        EMS &bull; Employee Management System
      </footer>
    </div>
  );
};

export default ServiceUnavailable;
