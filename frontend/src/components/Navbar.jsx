import React from 'react';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';
import Avatar from './Avatar';
import { LogOut, User, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Safely extract display fields with multiple fallback layers
  let displayName = 'User';
  let avatarInitial = 'U';
  let photoUrl = null;

  try {
    if (user) {
      const fn = user.firstName || user.first_name || '';
      const ln = user.lastName || user.last_name || '';
      displayName = user.fullName || `${fn} ${ln}`.trim() || 'User';
      avatarInitial = (fn || displayName || 'U').charAt(0).toUpperCase() || 'U';
      photoUrl = user.profilePhotoUrl ? getPhotoUrl(user.profilePhotoUrl) : null;
    }
  } catch (e) {
    console.error('Navbar user field error:', e);
  }

  return (
    <header className="apc-header">
      <div style={{ cursor: 'pointer' }} onClick={() => navigate(user?.role === 'super_admin' ? '/admin/dashboard' : '/home')}>
        <Logo lockup="full" size="small" />
      </div>

      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textAlign: 'right' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--apc-text-primary)' }}>
                {displayName}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--apc-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {user.role === 'super_admin' ? (
                  <>
                    <ShieldCheck size={12} color="var(--apc-primary-dark)" /> Super Admin
                  </>
                ) : (
                  <>
                    <User size={12} /> {user.id || ''} ({user.department || 'General'})
                  </>
                )}
              </span>
            </div>

            {/* Profile Avatar */}
            <Avatar src={user?.profilePhotoUrl} name={displayName} size={36} border="1px solid var(--apc-primary)" />
          </div>

          <button
            onClick={handleLogout}
            className="apc-btn apc-btn-secondary"
            style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
            title="Sign out"
          >
            <LogOut size={16} />
            <span className="apc-logout-text">Logout</span>
          </button>
        </div>
      )}
    </header>
  );
}
