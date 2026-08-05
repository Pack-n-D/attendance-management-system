import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../components/Logo';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LogIn, KeyRound, AlertCircle, Sparkles } from 'lucide-react';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const isExpired = searchParams.get('expired') === '1';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const user = await login(identifier, password);
      if (user.mustChangePassword) {
        navigate('/profile/change-password?forced=1');
      } else if (user.role === 'super_admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/home');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    }
  };

  const handleFillDemoAdmin = () => {
    setIdentifier('admin@apc.com');
    setPassword('Admin@123');
  };

  const handleFillDemoEmployee = () => {
    setIdentifier('JO-DO-99-0001');
    setPassword('Employee@123');
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

        <form onSubmit={handleSubmit}>
          <div className="apc-form-group">
            <label htmlFor="identifier">Employee ID or Email</label>
            <input
              id="identifier"
              type="text"
              className="apc-input"
              placeholder="e.g. JO-DO-99-0001 or admin@apc.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>

          <div className="apc-form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="apc-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="apc-btn apc-btn-primary apc-btn-block apc-btn-lg"
            style={{ marginTop: '1.25rem' }}
            disabled={loading}
          >
            <LogIn size={18} /> {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
