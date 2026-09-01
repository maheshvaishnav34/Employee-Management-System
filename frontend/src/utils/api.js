const BASE_URL = 'http://127.0.0.1:5000/api';

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
  
  let data;
  try {
    data = await response.json();
  } catch (e) {
    throw new Error('Server response error. Please check if backend is running.');
  }
  
  if (!response.ok) {
    const errorMsg = data.message || 'Something went wrong';
    throw new Error(errorMsg);
  }
  return data;
};

export const api = {
  get: async (endpoint) => {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: getHeaders(),
      });
      return handleResponse(response);
    } catch (error) {
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Cannot connect to server. Please ensure backend is running on port 5000.');
      }
      throw error;
    }
  },

  post: async (endpoint, body) => {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      return handleResponse(response);
    } catch (error) {
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Cannot connect to server. Please ensure backend is running on port 5000.');
      }
      throw error;
    }
  },

  put: async (endpoint, body) => {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  },

  delete: async (endpoint) => {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
};
