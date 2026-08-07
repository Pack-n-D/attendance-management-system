import React, { useState } from 'react';
import { getPhotoUrl } from '../utils/api';

/**
 * Avatar Component with Automatic Fallback.
 * Attempts to load profile photo; if photo fails to load (404/broken link),
 * seamlessly renders a clean styled initial badge circle.
 */
export default function Avatar({ src, name, size = 32, fontSize, border = 'none', className = '', style = {} }) {
  const [imgError, setImgError] = useState(false);

  const photoUrl = getPhotoUrl(src);

  const initialStr = String(name || 'E').trim();
  const initial = initialStr.charAt(0).toUpperCase() || 'E';
  const computedFontSize = fontSize || (size >= 80 ? '2.2rem' : size >= 50 ? '1.4rem' : size >= 40 ? '1.1rem' : '0.85rem');

  return (
    <div
      className={className}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        backgroundColor: 'var(--apc-primary-tint)',
        border: border,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        color: 'var(--apc-primary-dark)',
        overflow: 'hidden',
        flexShrink: 0,
        userSelect: 'none',
        ...style
      }}
    >
      {photoUrl && !imgError ? (
        <img
          src={photoUrl}
          alt={name || 'Avatar'}
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <span style={{ fontSize: computedFontSize, lineHeight: 1 }}>{initial}</span>
      )}
    </div>
  );
}
