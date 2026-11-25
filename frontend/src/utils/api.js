const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const notifyServiceUnavailable = (detail = {}) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ems:service-unavailable', { detail }));
  }
};

const isNetworkFailure = (error) => {
  const msg = String(error?.message || '');
  return (
    error?.name === 'TypeError' ||
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError') ||
    msg.includes('Load failed')
  );
};

const getHeaders = () => {
  const token = localStorage.getItem('ems_token');
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (response) => {
  if (response.status === 401) {
    localStorage.removeItem('ems_token');
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  let data = null;
  let isJson = false;
  try {
    data = await response.json();
    isJson = true;
  } catch (e) {
    isJson = false;
  }

  if (response.status === 502 || response.status === 503 || response.status === 504) {
    const message = data?.message || 'The server is currently unable to handle your request due to temporary overload or maintenance.';
    notifyServiceUnavailable({ status: response.status, reason: data?.reason || 'server_unavailable', message });
    throw new Error(message);
  }

  // Vite dev proxy returns 500 with empty/non-JSON body when backend port 5000 is down
  if (!isJson && response.status >= 500) {
    const message = 'Cannot connect to server. Please ensure backend is running.';
    notifyServiceUnavailable({ status: 503, reason: 'server_unreachable', message });
    throw new Error(message);
  }

  if (!isJson) {
    throw new Error('Server response error. Please check if backend is running.');
  }

  if (!response.ok) {
    const errorMsg = data.message || 'Something went wrong';
    throw new Error(errorMsg);
  }
  return data;
};

const requestWithFallback = async (endpoint, options) => {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    return await handleResponse(response);
  } catch (error) {
    if (isNetworkFailure(error)) {
      const message = 'Cannot connect to server. Please ensure backend is running on port 5000.';
      notifyServiceUnavailable({ status: 503, reason: 'network_error', message });
      throw new Error(message);
    }
    throw error;
  }
};

export const api = {
  get: (endpoint) =>
    requestWithFallback(endpoint, {
      method: 'GET',
      headers: getHeaders(),
    }),

  post: (endpoint, body) =>
    requestWithFallback(endpoint, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    }),

  put: (endpoint, body) =>
    requestWithFallback(endpoint, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(body),
    }),

  delete: (endpoint) =>
    requestWithFallback(endpoint, {
      method: 'DELETE',
      headers: getHeaders(),
    }),
};
