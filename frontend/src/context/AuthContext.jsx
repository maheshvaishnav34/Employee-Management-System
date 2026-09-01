import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('ems_token');
      if (token) {
        try {
          const data = await api.get('/auth/me');
          if (data.success) {
            setUser(data.user);
          } else {
            localStorage.removeItem('ems_token');
          }
        } catch (error) {
          console.error('Auth verification failed:', error.message);
          localStorage.removeItem('ems_token');
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

  const logout = () => {
    localStorage.removeItem('ems_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
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
