import { useState, useEffect, useRef, useCallback } from 'react';

const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api');

/**
 * useRealtimeNotifications
 * 
 * Uses Server-Sent Events (SSE) for push-based real-time updates from the backend.
 * Falls back to polling if SSE is not available or connection drops.
 * 
 * @param {object} user  - Current user from AuthContext
 * @returns {{ data, connected, lastUpdated, newAlert, clearNewAlert, refresh, connectionStatus }}
 */
const useRealtimeNotifications = (user) => {
  const [data, setData] = useState({
    pendingLeaves: 0,
    newLeaveRequests: [],
    attendanceRate: 0,
    todayPresent: 0,
    todayAbsent: 0,
    totalEmployees: 0,
    activeEmployees: 0,
    upcomingBirthdays: [],
    workAnniversaries: [],
    timestamp: null,
  });

  const [connected, setConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // 'connecting' | 'live' | 'polling' | 'error'
  const [lastUpdated, setLastUpdated] = useState(null);
  const [newAlert, setNewAlert] = useState(false);

  const prevPendingLeaves = useRef(0);
  const esRef = useRef(null);   // EventSource reference
  const pollRef = useRef(null); // polling interval fallback
  const retryRef = useRef(null);
  const retryCount = useRef(0);

  const isAuthorized = !!user;

  const applyData = useCallback((incoming) => {
    setData(incoming);
    setLastUpdated(Date.now());

    // Trigger new-alert if pending leaves count increased
    if (
      prevPendingLeaves.current !== 0 &&
      incoming.pendingLeaves > prevPendingLeaves.current
    ) {
      setNewAlert(true);
    }
    prevPendingLeaves.current = incoming.pendingLeaves;
  }, []);

  /* ── REST fetch (used as initial load + polling fallback) ─── */
  const fetchRest = useCallback(async () => {
    const token = localStorage.getItem('ems_token');
    if (!token) return;
    try {
      const res = await fetch(`${BASE_URL}/notifications/data`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem('ems_token');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success) applyData(json.data);
    } catch (err) {
      console.error('[Notifications REST]', err.message);
    }
  }, [applyData]);

  /* ── SSE connection ─────────────────────────────────────────── */
  const connectSSE = useCallback(() => {
    const token = localStorage.getItem('ems_token');
    if (!token || !isAuthorized) return;

    // Close any existing connection
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    setConnectionStatus('connecting');

    const url = `${BASE_URL}/notifications/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener('notification', (e) => {
      try {
        const payload = JSON.parse(e.data);
        applyData(payload);
        setConnected(true);
        setConnectionStatus('live');
        retryCount.current = 0;

        // Stop polling fallback if SSE is now live
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      } catch (err) {
        console.error('[SSE parse error]', err);
      }
    });

    es.onerror = () => {
      console.warn('[SSE] Connection dropped — switching to polling fallback');
      setConnected(false);
      setConnectionStatus('polling');
      es.close();
      esRef.current = null;

      // Start polling fallback at 10s if not already
      if (!pollRef.current) {
        fetchRest(); // immediate
        pollRef.current = setInterval(fetchRest, 10000);
      }

      // Retry SSE after exponential backoff (max 60s)
      const delay = Math.min(5000 * Math.pow(1.5, retryCount.current), 60000);
      retryCount.current += 1;
      retryRef.current = setTimeout(connectSSE, delay);
    };

    es.onopen = () => {
      setConnected(true);
      setConnectionStatus('live');
    };
  }, [isAuthorized, applyData, fetchRest]);

  /* ── Mount / unmount ────────────────────────────────────────── */
  useEffect(() => {
    if (!user || !isAuthorized) return;

    // Initial REST fetch so data appears instantly
    fetchRest();

    // Start SSE
    connectSSE();

    return () => {
      // Cleanup SSE
      if (esRef.current) { esRef.current.close(); esRef.current = null; }
      // Cleanup polling fallback
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      // Cleanup retry timer
      if (retryRef.current) { clearTimeout(retryRef.current); retryRef.current = null; }
    };
  }, [user, isAuthorized]); // only re-run when user changes

  /* ── Manual refresh ─────────────────────────────────────────── */
  const refresh = useCallback(async () => {
    await fetchRest();
  }, [fetchRest]);

  const clearNewAlert = useCallback(() => setNewAlert(false), []);

  return { data, connected, connectionStatus, lastUpdated, newAlert, clearNewAlert, refresh };
};

export default useRealtimeNotifications;
