import React, { useState } from 'react';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound, ShieldAlert, CheckCircle2, Lock } from 'lucide-react';

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [dob, setDob] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const isForced = searchParams.get('forced') === '1' || user?.mustChangePassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword,
          dob,
          newPassword,
          confirmPassword
        })
      });

      setSuccess(res.message);
      setTimeout(() => {
        logout();
        navigate('/login?changed=1');
      }, 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="apc-main-content" style={{ maxWidth: '480px' }}>
        <div className="apc-card apc-card-elevated" style={{ padding: '2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'var(--apc-primary-tint)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '0.75rem'
              }}
            >
              <KeyRound size={24} color="var(--apc-primary-dark)" />
            </div>
            <h2 style={{ fontSize: '1.3rem' }}>{isForced ? 'Password Change Required' : 'Change Password'}</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--apc-text-secondary)', marginTop: '0.25rem' }}>
              {isForced
                ? 'For security reasons, you must set a new password on first login.'
                : 'Update your account password securely below.'}
            </p>
          </div>

          {error && (
            <div
              style={{
                padding: '0.75rem',
                backgroundColor: 'var(--apc-danger-bg)',
                border: '1px solid rgba(214, 69, 69, 0.3)',
                borderRadius: 'var(--apc-radius-sm)',
                color: 'var(--apc-danger)',
                fontSize: '0.85rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <ShieldAlert size={16} /> {error}
            </div>
          )}

          {success && (
            <div
              style={{
                padding: '0.75rem',
                backgroundColor: 'var(--apc-success-bg)',
                border: '1px solid rgba(46, 158, 91, 0.3)',
                borderRadius: 'var(--apc-radius-sm)',
                color: 'var(--apc-success)',
                fontSize: '0.85rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <CheckCircle2 size={16} /> {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Step 1: Current Password */}
            <div className="apc-form-group">
              <label htmlFor="currentPassword">
                Current / Temporary Password <span className="required">*</span>
              </label>
              <input
                id="currentPassword"
                type="password"
                className="apc-input"
                required
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
              />
            </div>

            {/* Step 2: Date of Birth verification */}
            {user?.role === 'employee' && (
              <div className="apc-form-group">
                <label htmlFor="dob">
                  Date of Birth (Identity Verification) <span className="required">*</span>
                </label>
                <input
                  id="dob"
                  type="date"
                  className="apc-input"
                  required
                  value={dob}
                  onChange={e => setDob(e.target.value)}
                />
                <p className="apc-helper-text">Must match your registered Date of Birth.</p>
              </div>
            )}

            {/* Step 3: New Password */}
            <div className="apc-form-group">
              <label htmlFor="newPassword">
                New Password <span className="required">*</span>
              </label>
              <input
                id="newPassword"
                type="password"
                className="apc-input"
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
              {/* Always visible rule text */}
              <div style={{ backgroundColor: 'var(--apc-bg)', padding: '0.6rem 0.75rem', borderRadius: 'var(--apc-radius-sm)', border: '1px solid var(--apc-border)', marginTop: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--apc-text-primary)', display: 'block', marginBottom: '2px' }}>
                  PASSWORD SECURITY REQUIREMENTS:
                </span>
                <span style={{ fontSize: '0.73rem', color: 'var(--apc-text-secondary)', display: 'block' }}>
                  • At least 8 characters<br />
                  • At least 1 uppercase letter (A-Z)<br />
                  • At least 1 number (0-9)<br />
                  • At least 1 special character (!@#$%^&*)<br />
                  • No spaces allowed
                </span>
              </div>
            </div>

            {/* Step 4: Confirm Password */}
            <div className="apc-form-group">
              <label htmlFor="confirmPassword">
                Confirm New Password <span className="required">*</span>
              </label>
              <input
                id="confirmPassword"
                type="password"
                className="apc-input"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="apc-btn apc-btn-primary apc-btn-block" disabled={loading} style={{ marginTop: '1.25rem' }}>
              <Lock size={16} /> {loading ? 'Updating Password...' : 'Set New Password'}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
