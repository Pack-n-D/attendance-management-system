import React from 'react';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';
import { LogOut, User, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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
                {user.fullName || `${user.firstName} ${user.lastName}`}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--apc-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {user.role === 'super_admin' ? (
                  <>
                    <ShieldCheck size={12} color="var(--apc-primary-dark)" /> Super Admin
                  </>
                ) : (
                  <>
                    <User size={12} /> {user.id} ({user.department})
                  </>
                )}
              </span>
            </div>

            {/* Profile Avatar */}
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'var(--apc-primary-tint)',
                border: '1px solid var(--apc-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                color: 'var(--apc-primary-dark)',
                overflow: 'hidden'
              }}
            >
              {user.profilePhotoUrl ? (
                <img src={user.profilePhotoUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                user.firstName ? user.firstName[0].toUpperCase() : 'U'
              )}
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="apc-btn apc-btn-secondary"
            style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
            title="Sign out"
          >
            <LogOut size={16} />
            <span style={{ display: window.innerWidth > 600 ? 'inline' : 'none' }}>Logout</span>
          </button>
        </div>
      )}
    </header>
  );
}
