/**
 * Authentication Context & Provider
 * Manages secure user session, role-based access, and token lifecycle
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Employee, UserRole } from '../types';
import Config from '../constants/Config';
import { authService } from '../services/authService';
import { setOnUnauthorized, clearAuthSession } from '../services/api';

interface AuthContextType {
  user: Employee | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  mustChangePassword: boolean;
  login: (identifier: string, pass: string) => Promise<Employee>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateLocalUser: (updated: Partial<Employee>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Employee | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore session from SecureStore on startup
  useEffect(() => {
    async function loadStoredSession() {
      try {
        const storedToken = await SecureStore.getItemAsync(Config.storageKeys.token);
        const storedUser = await SecureStore.getItemAsync(Config.storageKeys.user);

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));

          // Silently verify and refresh profile from server
          authService.getCurrentUser()
            .then((fresh) => {
              if (fresh) setUser(fresh);
            })
            .catch(() => {
              // Retain local session if temporarily offline
            });
        }
      } catch (err) {
        console.warn('Session restoration notice:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadStoredSession();

    // Register 401 unauthenticated listener
    setOnUnauthorized(() => {
      setUser(null);
      setToken(null);
    });
  }, []);

  const login = async (identifier: string, pass: string): Promise<Employee> => {
    setIsLoading(true);
    try {
      const res = await authService.login(identifier, pass);
      setToken(res.token);
      setUser(res.user);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setToken(null);
      setIsLoading(false);
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const fresh = await authService.getCurrentUser();
      if (fresh) setUser(fresh);
    } catch (err) {
      console.warn('Failed to refresh user:', err);
    }
  };

  const updateLocalUser = (updated: Partial<Employee>) => {
    setUser((prev) => {
      if (!prev) return null;
      const merged = { ...prev, ...updated };
      SecureStore.setItemAsync(Config.storageKeys.user, JSON.stringify(merged)).catch(() => {});
      return merged;
    });
  };

  const isAuthenticated = !!token && !!user;
  const isAdmin = user?.role === 'super_admin';
  const mustChangePassword = !!user?.mustChangePassword;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated,
        isAdmin,
        mustChangePassword,
        login,
        logout,
        refreshUser,
        updateLocalUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
