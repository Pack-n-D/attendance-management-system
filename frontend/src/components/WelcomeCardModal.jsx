import React from 'react';
import Logo from './Logo';
import { Printer, X, User } from 'lucide-react';

export default function WelcomeCardModal({ data, onClose }) {
  if (!data) return null;

  const handlePrint = () => {
    window.print();
  };

  // Helper to extract initials
  const initials = data.fullName
    ? data.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'EMP';

  return (
    <div className="apc-modal-overlay">
      <div className="apc-modal" style={{ maxWidth: '580px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '1.25rem', color: 'var(--apc-text-primary)' }}>Employee ID Card Generated</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} color="var(--apc-text-secondary)" />
          </button>
        </div>

        <p style={{ fontSize: '0.88rem', color: 'var(--apc-text-secondary)', marginBottom: '1.25rem' }}>
          Official employee ID card details for <strong>{data.fullName}</strong>.
        </p>

        {/* Printable Employee ID Card */}
        <div className="apc-welcome-card" id="printable-welcome-card" style={{ position: 'relative', overflow: 'hidden' }}>
          {/* Card Top Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px dashed var(--apc-border)' }}>
            <Logo lockup="full" size="small" />
            <span style={{
              fontSize: '0.72rem',
              background: 'var(--apc-primary-dark)',
              color: '#FFFFFF',
              padding: '4px 10px',
              borderRadius: '20px',
              fontWeight: 700,
              letterSpacing: '0.5px'
            }}>
              EMPLOYEE ID CARD
            </span>
          </div>

          {/* Card Content Layout: Left details + Right Employee Photo */}
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            
            {/* Left Section: Details */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--apc-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>EMPLOYEE NAME</span>
                <strong style={{ fontSize: '1.15rem', color: 'var(--apc-text-primary)' }}>{data.fullName}</strong>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--apc-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>EMPLOYEE ID</span>
                <strong style={{ fontSize: '1.1rem', color: 'var(--apc-primary-dark)', fontFamily: 'monospace', background: 'var(--apc-primary-tint)', padding: '2px 6px', borderRadius: '4px' }}>
                  {data.employeeId}
                </strong>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--apc-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>DEPARTMENT</span>
                <span style={{ fontWeight: 600 }}>{data.department}</span>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--apc-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>DESIGNATION</span>
                <span style={{ fontWeight: 600 }}>{data.designation}</span>
              </div>

              {data.dateOfJoining && (
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--apc-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>DATE OF JOINING</span>
                  <span style={{ fontSize: '0.88rem' }}>{data.dateOfJoining}</span>
                </div>
              )}
            </div>

            {/* Right Corner: Employee Photo */}
            <div style={{
              width: '100px',
              height: '115px',
              borderRadius: '8px',
              border: '2px solid var(--apc-primary)',
              background: '#FFFFFF',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              flexShrink: 0
            }}>
              {data.profilePhotoUrl ? (
                <img
                  src={data.profilePhotoUrl}
                  alt={data.fullName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{
                  width: '100%',
                  height: '100%',
                  background: 'var(--apc-primary-tint)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--apc-primary-dark)'
                }}>
                  <User size={36} style={{ marginBottom: '4px', opacity: 0.7 }} />
                  <span style={{ fontSize: '1rem', fontWeight: 800 }}>{initials}</span>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Modal Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
          <button onClick={handlePrint} className="apc-btn apc-btn-secondary">
            <Printer size={16} /> Print ID Card
          </button>
          <button onClick={onClose} className="apc-btn apc-btn-primary">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
