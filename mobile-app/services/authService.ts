/**
 * Authentication Service
 * Communicates with /api/auth
 */

import { apiFetch, saveAuthToken, clearAuthSession } from './api';
import * as SecureStore from 'expo-secure-store';
import Config from '../constants/Config';
import { Employee, LoginResponse } from '../types';

export const authService = {
  async login(identifier: string, password: string): Promise<LoginResponse> {
    const data = await apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        identifier: identifier.trim(),
        password,
      }),
    });

    if (data.token) {
      await saveAuthToken(data.token, data.refreshToken);
      await SecureStore.setItemAsync(Config.storageKeys.user, JSON.stringify(data.user));
    }

    return data;
  },

  async getCurrentUser(): Promise<Employee | null> {
    try {
      const data = await apiFetch<{ user: Employee }>('/auth/me');
      if (data.user) {
        await SecureStore.setItemAsync(Config.storageKeys.user, JSON.stringify(data.user));
        return data.user;
      }
      return null;
    } catch {
      // Check stored user if offline
      const stored = await SecureStore.getItemAsync(Config.storageKeys.user);
      if (stored) {
        return JSON.parse(stored);
      }
      return null;
    }
  },

  async changePassword(params: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
    dob?: string;
  }): Promise<{ message: string }> {
    return apiFetch<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async logout(): Promise<void> {
    await clearAuthSession();
  },
};

export default authService;
