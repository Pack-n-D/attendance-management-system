import React, { useState } from 'react';

/**
 * APC Oval Star Brand Logo component for AP Corporation Attendance System.
 * Renders the official APC Oval with 8-Point Stars and Yellow Wordmark.
 */
export default function Logo({ lockup = 'full', size = 'medium', showSubtitle = true, customSrc }) {
  const [imgError, setImgError] = useState(false);
  const isSmall = size === 'small';
  const isLarge = size === 'large';

  const logoHeight = isLarge ? '54px' : isSmall ? '34px' : '42px';
  const logoWidth = isLarge ? '130px' : isSmall ? '82px' : '102px';

  // If a custom image URL or static logo.png is loaded successfully
  if (customSrc && !imgError) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem' }}>
        <img
          src={customSrc}
          alt="APC Company Logo"
          onError={() => setImgError(true)}
          style={{
            height: logoHeight,
            width: 'auto',
            maxHeight: logoHeight,
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

  // Official APC Vector Brand Logo (Oval + Stars + Yellow APC)
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem' }}>
      <svg
        style={{ height: logoHeight, width: logoWidth, flexShrink: 0 }}
        viewBox="0 0 240 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Tilted Thin Oval Ring */}
        <ellipse
          cx="120"
          cy="50"
          rx="106"
          ry="38"
          stroke="#1A1A1A"
          strokeWidth="2.5"
          transform="rotate(-11 120 50)"
        />

        {/* Top-Left 8-Pointed Star on Ring */}
        <g transform="translate(18, 16) scale(0.65)">
          <path
            d="M 20 0 L 25 14 L 38 7 L 30 20 L 44 26 L 30 32 L 38 45 L 25 38 L 20 52 L 15 38 L 2 45 L 10 32 L -4 26 L 10 20 L 2 7 L 15 14 Z"
            fill="#1A1A1A"
          />
        </g>

        {/* Bottom-Right 8-Pointed Star on Ring */}
        <g transform="translate(188, 48) scale(0.65)">
          <path
            d="M 20 0 L 25 14 L 38 7 L 30 20 L 44 26 L 30 32 L 38 45 L 25 38 L 20 52 L 15 38 L 2 45 L 10 32 L -4 26 L 10 20 L 2 7 L 15 14 Z"
            fill="#1A1A1A"
          />
        </g>

        {/* Center Bold Slanted Orange-Yellow APC Text */}
        <g transform="translate(120, 50)">
          <text
            x="0"
            y="18"
            textAnchor="middle"
            fill="#F8A71A"
            fontFamily="Inter, 'Arial Black', -apple-system, sans-serif"
            fontWeight="900"
            fontStyle="italic"
            fontSize="54"
            letterSpacing="-1"
            transform="skewX(-8)"
          >
            APC
          </text>
        </g>
      </svg>

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
