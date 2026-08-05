const API_BASE = '/api';

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

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // Check if token expired or unauthorized
    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      localStorage.removeItem('apc_token');
      localStorage.removeItem('apc_user');
      window.location.href = '/login?expired=1';
    }
    throw new Error(data.error || 'Request failed. Please try again.');
  }

  return data;
}

export function exportAttendanceCSV() {
  const token = localStorage.getItem('apc_token');
  window.open(`${API_BASE}/attendance/export/csv?token=${token}`, '_blank');
}
