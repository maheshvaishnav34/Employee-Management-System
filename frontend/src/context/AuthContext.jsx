import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext();

const getStoredUser = () => {
  try {
    const token = localStorage.getItem('ems_token');
    const stored = localStorage.getItem('ems_user');
    if (token && stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error parsing stored user:', e);
  }
  return null;
};

export const AuthProvider = ({ children }) => {
  const initialUser = getStoredUser();
  const [user, setUserState] = useState(initialUser);
  const [loading, setLoading] = useState(!initialUser && !!localStorage.getItem('ems_token'));

  const setUser = (newUser) => {
    setUserState(newUser);
    if (newUser) {
      try { localStorage.setItem('ems_user', JSON.stringify(newUser)); } catch (e) {}
    } else {
      localStorage.removeItem('ems_user');
    }
  };

  // Background token verification on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('ems_token');
      if (token) {
        try {
          const data = await api.get('/auth/me');
          if (data.success && data.user) {
            setUser(data.user);
          } else {
            localStorage.removeItem('ems_token');
            localStorage.removeItem('ems_user');
            setUserState(null);
          }
        } catch (error) {
          console.error('Auth verification failed:', error.message);
          // Only clear if 401 unauthorized
          if (error.message?.includes('401') || error.message?.includes('token') || error.message?.includes('unauthorized')) {
            localStorage.removeItem('ems_token');
            localStorage.removeItem('ems_user');
            setUserState(null);
          }
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const data = await api.post('/auth/login', { email, password });
      if (data.success) {
        localStorage.setItem('ems_token', data.token);
        setUser(data.user);
        return { success: true };
      }
      return { success: false, message: data.message };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const googleLogin = async (payload) => {
    try {
      const data = await api.post('/auth/google', payload);
      if (data.success) {
        localStorage.setItem('ems_token', data.token);
        setUser(data.user);
        return { success: true };
      }
      return { success: false, message: data.message };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('ems_token');
    localStorage.removeItem('ems_user');
    setUserState(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, googleLogin, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
