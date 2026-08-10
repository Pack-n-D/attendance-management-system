const DEFAULT_PROD_API = 'https://web-production-f5d6b.up.railway.app';
const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? '/api'
    : `${DEFAULT_PROD_API}/api`;

export function getPhotoUrl(photoUrl) {
  if (!photoUrl) return null;
  if (photoUrl.startsWith('data:') || photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
    return photoUrl;
  }
  const backendHost = API_BASE.replace(/\/api$/, '');
  return `${backendHost}${photoUrl.startsWith('/') ? '' : '/'}${photoUrl}`;
}

export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('apc_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  let data = {};
  const text = await response.text();
  if (text.trim().startsWith('<') || text.trim().toLowerCase().startsWith('<!doctype')) {
    if (!response.ok) {
      throw new Error(`Server error (${response.status}). Backend is applying database updates — please retry in 10 seconds.`);
    }
    throw new Error('Backend API URL misconfigured. Received HTML page instead of JSON API response.');
  }

  try {
    data = text ? JSON.parse(text) : {};
  } catch (parseErr) {
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}. Backend may be restarting — please try again in 30 seconds.`);
    }
    throw new Error('Invalid JSON response received from API server.');
  }

  if (!response.ok) {
    // Check if token expired or unauthorized
    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      localStorage.removeItem('apc_token');
      localStorage.removeItem('apc_user');
      window.location.hash = '#/login?expired=1';
    }
    throw new Error(data.error || `Request failed (${response.status}). Please try again.`);
  }

  return data;
}

export function exportAttendanceCSV() {
  const token = localStorage.getItem('apc_token');
  window.open(`${API_BASE}/attendance/export/csv?token=${token}`, '_blank');
}
