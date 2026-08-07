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
        {/* Tilted Thin Black Oval Ring */}
        <ellipse
          cx="120"
          cy="50"
          rx="106"
          ry="38"
          stroke="#1A1A1A"
          strokeWidth="3"
          transform="rotate(-12 120 50)"
        />

        {/* Top-Left 8-Pointed Black Star */}
        <g transform="translate(18, 16) scale(0.65)">
          <path
            d="M 20 0 L 25 14 L 38 7 L 30 20 L 44 26 L 30 32 L 38 45 L 25 38 L 20 52 L 15 38 L 2 45 L 10 32 L -4 26 L 10 20 L 2 7 L 15 14 Z"
            fill="#1A1A1A"
          />
        </g>

        {/* Bottom-Right 8-Pointed Black Star */}
        <g transform="translate(188, 48) scale(0.65)">
          <path
            d="M 20 0 L 25 14 L 38 7 L 30 20 L 44 26 L 30 32 L 38 45 L 25 38 L 20 52 L 15 38 L 2 45 L 10 32 L -4 26 L 10 20 L 2 7 L 15 14 Z"
            fill="#1A1A1A"
          />
        </g>

        {/* Forward Slanted Bold Italic Golden Orange APC Text */}
        <text
          x="120"
          y="68"
          textAnchor="middle"
          fill="#FAA61A"
          fontFamily="'Arial Black', 'Inter', Arial, sans-serif"
          fontWeight="900"
          fontStyle="italic"
          fontSize="56"
          letterSpacing="1"
        >
          APC
        </text>
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
