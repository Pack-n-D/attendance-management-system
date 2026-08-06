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
        {/* Counter-Clockwise Tilted Oval Ring */}
        <ellipse
          cx="120"
          cy="50"
          rx="108"
          ry="42"
          stroke="#1F1F1F"
          strokeWidth="4"
          transform="rotate(-9 120 50)"
        />

        {/* Top-Left 8-Pointed Star */}
        <g transform="translate(14, 10) scale(0.75)">
          <path
            d="M 20 0 L 25 14 L 38 7 L 30 20 L 44 26 L 30 32 L 38 45 L 25 38 L 20 52 L 15 38 L 2 45 L 10 32 L -4 26 L 10 20 L 2 7 L 15 14 Z"
            fill="#1F1F1F"
          />
        </g>

        {/* Bottom-Right 8-Pointed Star */}
        <g transform="translate(192, 44) scale(0.75)">
          <path
            d="M 20 0 L 25 14 L 38 7 L 30 20 L 44 26 L 30 32 L 38 45 L 25 38 L 20 52 L 15 38 L 2 45 L 10 32 L -4 26 L 10 20 L 2 7 L 15 14 Z"
            fill="#1F1F1F"
          />
        </g>

        {/* Center Bold Italic Yellow APC Text */}
        <text
          x="120"
          y="66"
          textAnchor="middle"
          fill="#F5A623"
          fontFamily="Inter, sans-serif, Arial"
          fontWeight="900"
          fontStyle="italic"
          fontSize="56"
          letterSpacing="0.5"
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
