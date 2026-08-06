import React, { useState } from 'react';

/**
 * Global Logo component for AP Corporation Attendance System.
 * Automatically checks for custom PNG logo at '/logo.png' (placed in public directory),
 * and gracefully falls back to the stylized APC brand lockup if no PNG logo is present.
 */
export default function Logo({ lockup = 'full', size = 'medium', showSubtitle = true, customSrc }) {
  const [imgError, setImgError] = useState(false);
  const logoPath = customSrc || '/logo.png';

  const isSmall = size === 'small';
  const isLarge = size === 'large';
  const fontSize = isLarge ? '2.2rem' : isSmall ? '1.2rem' : '1.5rem';
  const imageHeight = isLarge ? '48px' : isSmall ? '32px' : '40px';

  // If custom PNG logo is available and hasn't failed loading
  if (!imgError) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem' }}>
        <img
          src={logoPath}
          alt="Company Logo"
          onError={() => setImgError(true)}
          style={{
            height: imageHeight,
            width: 'auto',
            maxHeight: imageHeight,
            objectFit: 'contain'
          }}
        />
        {lockup === 'full' && showSubtitle && (
          <span
            style={{
              fontSize: isSmall ? '0.65rem' : '0.72rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: '#75706A'
            }}
          >
            Attendance
          </span>
        )}
      </div>
    );
  }

  // Fallback APC Lockups if PNG logo is not available
  if (lockup === 'icon') {
    return (
      <div
        style={{
          width: isLarge ? '48px' : isSmall ? '32px' : '40px',
          height: isLarge ? '48px' : isSmall ? '32px' : '40px',
          backgroundColor: '#F5A623',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#1A1612',
          fontFamily: 'Inter, sans-serif',
          fontWeight: 900,
          fontStyle: 'italic',
          fontSize: isLarge ? '1.8rem' : isSmall ? '1rem' : '1.4rem',
          boxShadow: '0 2px 6px rgba(245, 166, 35, 0.4)'
        }}
      >
        A
      </div>
    );
  }

  if (lockup === 'monogram') {
    return (
      <div
        style={{
          padding: isSmall ? '4px 8px' : '6px 12px',
          backgroundColor: '#FDECC8',
          border: '1px solid #F5A623',
          borderRadius: '20px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          color: '#D9880F',
          fontFamily: 'Inter, sans-serif',
          fontWeight: 900,
          fontStyle: 'italic',
          fontSize: isSmall ? '0.9rem' : '1.1rem'
        }}
      >
        AP
      </div>
    );
  }

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem' }}>
      {/* Icon Badge */}
      <div
        style={{
          width: isLarge ? '42px' : isSmall ? '28px' : '34px',
          height: isLarge ? '42px' : isSmall ? '28px' : '34px',
          backgroundColor: '#F5A623',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#1A1612',
          fontFamily: 'Inter, sans-serif',
          fontWeight: 900,
          fontStyle: 'italic',
          fontSize: isLarge ? '1.5rem' : isSmall ? '0.9rem' : '1.2rem',
          boxShadow: '0 2px 8px rgba(245, 166, 35, 0.3)'
        }}
      >
        A
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
        <div
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 900,
            fontStyle: 'italic',
            fontSize: fontSize,
            letterSpacing: '-0.5px',
            color: '#2B2620',
            display: 'flex',
            alignItems: 'baseline'
          }}
        >
          <span>A</span>
          <span style={{ position: 'relative', color: '#D9880F', margin: '0 1px' }}>
            P
            <svg
              width="8"
              height="8"
              viewBox="0 0 10 10"
              style={{
                position: 'absolute',
                top: '-2px',
                right: '-3px',
                fill: '#F5A623'
              }}
            >
              <path d="M0,5 Q5,0 10,2 Q5,6 0,5 Z" />
            </svg>
          </span>
          <span>C</span>
        </div>
        {showSubtitle && (
          <span
            style={{
              fontSize: isSmall ? '0.65rem' : '0.72rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: '#75706A'
            }}
          >
            Attendance
          </span>
        )}
      </div>
    </div>
  );
}
