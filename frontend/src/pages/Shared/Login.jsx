import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../components/Logo';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LogIn, AlertCircle, CheckSquare, Square } from 'lucide-react';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const { login, loading, user, token } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const isExpired = searchParams.get('expired') === '1';

  // 1. Auto-redirect if already logged in
  useEffect(() => {
    if (token && user && !isExpired) {
      if (user.mustChangePassword) {
        navigate('/profile/change-password?forced=1', { replace: true });
      } else if (user.role === 'super_admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/home', { replace: true });
      }
    }
  }, [token, user, isExpired, navigate]);

  // 2. Load saved credentials on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('apc_saved_credentials');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.identifier) setIdentifier(parsed.identifier);
        if (parsed.password) setPassword(parsed.password);
        setRememberMe(true);
      }
    } catch (e) {
      console.warn('Failed to load saved credentials', e);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const loggedInUser = await login(identifier, password);
      if (!loggedInUser) {
        throw new Error('Login failed. Please check your credentials.');
      }

      // Save or clear credentials based on Remember Me choice
      if (rememberMe) {
        localStorage.setItem(
          'apc_saved_credentials',
          JSON.stringify({ identifier, password })
        );
      } else {
        localStorage.removeItem('apc_saved_credentials');
      }

      if (loggedInUser.mustChangePassword) {
        navigate('/profile/change-password?forced=1');
      } else if (loggedInUser.role === 'super_admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/home');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--apc-bg)',
        padding: '1.5rem'
      }}
    >
      <div
        className="apc-card apc-card-elevated"
        style={{ maxWidth: '440px', width: '100%', padding: '2.25rem', borderRadius: 'var(--apc-radius-lg)' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Logo lockup="full" size="large" />
          <h2 style={{ fontSize: '1.4rem', marginTop: '1.25rem', color: 'var(--apc-text-primary)' }}>
            Welcome Back
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--apc-text-secondary)', marginTop: '0.25rem' }}>
            Sign in to access your attendance portal
          </p>
        </div>

        {isExpired && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--apc-warning-bg)',
              border: '1px solid rgba(226, 163, 59, 0.4)',
              borderRadius: 'var(--apc-radius-sm)',
              color: 'var(--apc-warning)',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <AlertCircle size={16} /> Session expired. Please log in again.
          </div>
        )}

        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--apc-danger-bg)',
              border: '1px solid rgba(214, 69, 69, 0.3)',
              borderRadius: 'var(--apc-radius-sm)',
              color: 'var(--apc-danger)',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="on">
          <div className="apc-form-group">
            <label htmlFor="identifier">Employee ID or Email</label>
            <input
              id="identifier"
              name="username"
              type="text"
              className="apc-input"
              placeholder="e.g. JO-DO-99-0001 or employee@apc.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="apc-form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              className="apc-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {/* Remember Credentials Option */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '0.75rem',
              marginBottom: '1rem',
              userSelect: 'none'
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.86rem',
                color: 'var(--apc-text-secondary)',
                cursor: 'pointer'
              }}
            >
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{
                  width: '16px',
                  height: '16px',
                  accentColor: 'var(--apc-primary)',
                  cursor: 'pointer'
                }}
              />
              Remember credentials on this device
            </label>

            {identifier && password && (
              <button
                type="button"
                onClick={() => {
                  setIdentifier('');
                  setPassword('');
                  localStorage.removeItem('apc_saved_credentials');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--apc-text-muted)',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline'
                }}
              >
                Clear
              </button>
            )}
          </div>

          <button
            type="submit"
            className="apc-btn apc-btn-primary apc-btn-block apc-btn-lg"
            style={{ marginTop: '0.5rem' }}
            disabled={loading}
          >
            <LogIn size={18} /> {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
