/**
 * AP Corporation (APC) Mobile Design System - Color Tokens
 * Perfectly mirrors web design tokens from frontend/src/styles/main.css
 */

export const Colors = {
  // Brand Primary (Amber / Saffron Gold)
  primary: '#F5A623',
  primaryDark: '#D9880F',
  primaryLight: '#FBBF24',
  primaryTint: '#FDECC8',
  primaryGradientStart: '#F5A623',
  primaryGradientEnd: '#D9880F',

  // Surfaces & Backgrounds
  background: '#FAF7F2',       // Warm cream/alabaster
  surface: '#FFFFFF',          // Card/sheet white
  surfaceSubtle: '#F4EFE6',    // Warm tinted surface
  surfaceHover: '#F7F3EC',

  // Borders & Dividers
  border: '#E8E2D8',
  borderLight: '#F0ECE4',
  borderFocus: '#F5A623',

  // Typography
  textPrimary: '#2B2620',      // Deep warm charcoal
  textSecondary: '#75706A',    // Muted slate gray
  textTertiary: '#A39E98',     // Subdued caption
  textInverse: '#FFFFFF',

  // Semantic Status Colors
  success: '#2E9E5B',
  successBg: '#E8F6ED',
  successBorder: '#C3E8D2',

  warning: '#E2A33B',
  warningBg: '#FFF8EB',
  warningBorder: '#F9E2B6',

  danger: '#D64545',
  dangerBg: '#FDF2F2',
  dangerBorder: '#F8C8C8',

  info: '#3B82C4',
  infoBg: '#EBF4FC',
  infoBorder: '#C1DCF5',

  // Status mapping
  status: {
    on_time: {
      color: '#2E9E5B',
      bg: '#E8F6ED',
      border: '#C3E8D2',
      label: 'On Time',
    },
    in_buffer: {
      color: '#E2A33B',
      bg: '#FFF8EB',
      border: '#F9E2B6',
      label: 'In Buffer',
    },
    late: {
      color: '#D64545',
      bg: '#FDF2F2',
      border: '#F8C8C8',
      label: 'Late',
    },
    half_day: {
      color: '#D9880F',
      bg: '#FDECC8',
      border: '#F5D38C',
      label: 'Half Day',
    },
    on_leave: {
      color: '#3B82C4',
      bg: '#EBF4FC',
      border: '#C1DCF5',
      label: 'On Leave',
    },
    absent: {
      color: '#D64545',
      bg: '#FDF2F2',
      border: '#F8C8C8',
      label: 'Absent',
    },
    active: {
      color: '#2E9E5B',
      bg: '#E8F6ED',
      border: '#C3E8D2',
      label: 'Active',
    },
    inactive: {
      color: '#75706A',
      bg: '#F0ECE4',
      border: '#DCD6CC',
      label: 'Inactive',
    },
    not_punched: {
      color: '#75706A',
      bg: '#F0ECE4',
      border: '#DCD6CC',
      label: 'Not Punched',
    },
    pending: {
      color: '#E2A33B',
      bg: '#FFF8EB',
      border: '#F9E2B6',
      label: 'Pending Approval',
    },
    approved: {
      color: '#2E9E5B',
      bg: '#E8F6ED',
      border: '#C3E8D2',
      label: 'Approved',
    },
    rejected: {
      color: '#D64545',
      bg: '#FDF2F2',
      border: '#F8C8C8',
      label: 'Rejected',
    },
    withdrawn: {
      color: '#75706A',
      bg: '#F0ECE4',
      border: '#DCD6CC',
      label: 'Withdrawn',
    },
    withdrawal_requested: {
      color: '#D9880F',
      bg: '#FDECC8',
      border: '#F5D38C',
      label: 'Withdraw Requested',
    },
  },
};

export default Colors;
