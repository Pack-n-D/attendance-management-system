import React from 'react';
import Logo from './Logo';
import { Copy, Printer, Check, X } from 'lucide-react';

export default function WelcomeCardModal({ data, onClose }) {
  const [copied, setCopied] = React.useState(false);

  if (!data) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(
      `APC Employee Account Credentials\nEmployee ID: ${data.employeeId}\nTemporary Password: ${data.tempPassword}\nPortal: http://localhost:5173/login`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="apc-modal-overlay">
      <div className="apc-modal" style={{ maxWidth: '560px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.25rem', color: 'var(--apc-text-primary)' }}>Employee Created Successfully!</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} color="var(--apc-text-secondary)" />
          </button>
        </div>

        <p style={{ fontSize: '0.9rem', color: 'var(--apc-text-secondary)', marginBottom: '1rem' }}>
          Hand over or send these credentials to the employee. They will be prompted to set a new password on first login.
        </p>

        {/* Printable Welcome Card */}
        <div className="apc-welcome-card" id="printable-welcome-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
            <Logo lockup="full" size="small" />
            <span style={{ fontSize: '0.75rem', background: '#FFFFFF', padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--apc-border)', fontWeight: 600 }}>
              WELCOME CARD
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--apc-text-secondary)', display: 'block' }}>EMPLOYEE NAME</span>
              <strong style={{ fontSize: '1.1rem' }}>{data.fullName}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--apc-text-secondary)', display: 'block' }}>EMPLOYEE ID</span>
              <strong style={{ fontSize: '1.1rem', color: 'var(--apc-primary-dark)', fontFamily: 'monospace' }}>
                {data.employeeId}
              </strong>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--apc-text-secondary)', display: 'block' }}>DEPARTMENT</span>
              <span>{data.department}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--apc-text-secondary)', display: 'block' }}>DESIGNATION</span>
              <span>{data.designation}</span>
            </div>
          </div>

          <div style={{ background: '#FFFFFF', padding: '0.85rem 1rem', borderRadius: 'var(--apc-radius-sm)', border: '1px solid var(--apc-border)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--apc-text-secondary)', display: 'block', marginBottom: '4px' }}>TEMPORARY PASSWORD</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <code style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--apc-text-primary)' }}>{data.tempPassword}</code>
              <button
                onClick={handleCopy}
                className="apc-btn apc-btn-secondary"
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem' }}
              >
                {copied ? <Check size={14} color="var(--apc-success)" /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
          <button onClick={handlePrint} className="apc-btn apc-btn-secondary">
            <Printer size={16} /> Print Card
          </button>
          <button onClick={onClose} className="apc-btn apc-btn-primary">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
