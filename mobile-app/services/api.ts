/**
 * APC Mobile Network API Client
 * Secure API communication with the existing backend
 * Stores tokens securely using Expo SecureStore
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Config from '../constants/Config';

// Event emitter callback for 401 unauthenticated
let onUnauthorizedCallback: (() => void) | null = null;

export function setOnUnauthorized(callback: () => void) {
  onUnauthorizedCallback = callback;
}

/**
 * Resolves the active API base URL.
 * Order of priority:
 * 1. Saved custom URL in SecureStore (allows developers/admins to switch between prod and local in-app)
 * 2. EXPO_PUBLIC_API_URL environment variable
 * 3. Default production URL
 */
export async function getApiBaseUrl(): Promise<string> {
  try {
    const custom = await SecureStore.getItemAsync(Config.storageKeys.customApiUrl);
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/$/, '');
    }
  } catch {
    // SecureStore fallback
  }

  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.trim()) {
    const cleaned = envUrl.trim().replace(/\/$/, '');
    return cleaned.endsWith('/api') ? cleaned : `${cleaned}/api`;
  }

  return Config.defaultProductionApiUrl;
}

export async function setCustomApiUrl(url: string | null): Promise<void> {
  if (!url || !url.trim()) {
    await SecureStore.deleteItemAsync(Config.storageKeys.customApiUrl);
  } else {
    await SecureStore.setItemAsync(Config.storageKeys.customApiUrl, url.trim());
  }
}

export async function getAuthToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(Config.storageKeys.token);
  } catch {
    return null;
  }
}

export async function saveAuthToken(token: string, refreshToken?: string): Promise<void> {
  await SecureStore.setItemAsync(Config.storageKeys.token, token);
  if (refreshToken) {
    await SecureStore.setItemAsync(Config.storageKeys.refreshToken, refreshToken);
  }
}

export async function clearAuthSession(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(Config.storageKeys.token);
    await SecureStore.deleteItemAsync(Config.storageKeys.refreshToken);
    await SecureStore.deleteItemAsync(Config.storageKeys.user);
  } catch {
    // Ignore error
  }
}

export interface ApiRequestOptions extends RequestInit {
  timeoutMs?: number;
}

/**
 * Universal apiFetch client matching web frontend apiFetch behavior
 */
export async function apiFetch<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {},
  retries: number = 1
): Promise<T> {
  const baseUrl = await getApiBaseUrl();
  const token = await getAuthToken();

  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const timeoutMs = options.timeoutMs || 15000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeoutId);

    // Auto-retry cold start containers on GET
    if (retries > 0 && (!options.method || options.method.toUpperCase() === 'GET')) {
      await new Promise((r) => setTimeout(r, 1200));
      return apiFetch<T>(endpoint, options, retries - 1);
    }

    if (err.name === 'AbortError') {
      throw new Error('Connection timed out. The server took too long to respond.');
    }

    throw new Error('Unable to connect to attendance server. Please check your internet connection.');
  } finally {
    clearTimeout(timeoutId);
  }

  const rawText = await response.text();
  let data: any = {};

  if (rawText.trim().startsWith('<') || rawText.trim().toLowerCase().startsWith('<!doctype')) {
    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}. The backend may be booting up — please retry in 5 seconds.`);
    }
    throw new Error('API server returned HTML instead of JSON. Please verify the API URL configuration.');
  }

  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    if (!response.ok) {
      throw new Error(`Server error (${response.status}). Please try again later.`);
    }
    throw new Error('Invalid JSON response received from API server.');
  }

  if (!response.ok) {
    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      await clearAuthSession();
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
    }
    throw new Error(data.error || data.message || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export function getFullPhotoUrl(photoUrl?: string | null, baseUrl?: string): string | null {
  if (!photoUrl) return null;
  if (photoUrl.startsWith('data:') || photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
    return photoUrl;
  }
  const rootHost = (baseUrl || Config.defaultProductionApiUrl).replace(/\/api$/, '');
  return `${rootHost}${photoUrl.startsWith('/') ? '' : '/'}${photoUrl}`;
}
