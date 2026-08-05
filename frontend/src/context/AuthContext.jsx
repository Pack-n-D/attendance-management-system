import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('apc_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('apc_token'));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token && !user) {
      apiFetch('/auth/me')
        .then(res => {
          setUser(res.user);
          localStorage.setItem('apc_user', JSON.stringify(res.user));
        })
        .catch(() => logout());
    }
  }, [token]);

  const login = async (identifier, password) => {
    setLoading(true);
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password })
      });
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('apc_token', data.token);
      localStorage.setItem('apc_user', JSON.stringify(data.user));
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('apc_token');
    localStorage.removeItem('apc_user');
  };

  const updateUserProfile = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('apc_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUserProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
