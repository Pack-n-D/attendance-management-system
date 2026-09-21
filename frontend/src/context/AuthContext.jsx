import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';

const AuthContext = createContext();

function safeParseJSON(str) {
  if (!str || str === 'undefined' || str === 'null') return null;
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    return safeParseJSON(localStorage.getItem('apc_user'));
  });
  const [token, setToken] = useState(() => {
    const t = localStorage.getItem('apc_token');
    return (t && t !== 'undefined' && t !== 'null') ? t : null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Listen for storage events when logging in/out in another tab
    const handleStorageChange = (e) => {
      if (e.key === 'apc_token' || e.key === 'apc_user') {
        const latestToken = localStorage.getItem('apc_token');
        const latestUser = safeParseJSON(localStorage.getItem('apc_user'));
        setToken(latestToken);
        setUser(latestUser);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    if (token && !user) {
      apiFetch('/auth/me')
        .then(res => {
          if (res && res.user) {
            setUser(res.user);
            localStorage.setItem('apc_user', JSON.stringify(res.user));
          } else {
            logout();
          }
        })
        .catch(() => logout());
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [token]);

  const login = async (identifier, password) => {
    setLoading(true);
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password })
      });
      if (data?.error) {
        throw new Error(data.error);
      }
      const tokenStr = data?.token || data?.access_token;
      if (!tokenStr) {
        throw new Error('Unable to authenticate. Invalid response from server.');
      }
      const userObj = data?.user || null;
      setToken(tokenStr);
      setUser(userObj || null);
      localStorage.setItem('apc_token', tokenStr);
      if (userObj) {
        localStorage.setItem('apc_user', JSON.stringify(userObj));
      }
      return userObj;
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
