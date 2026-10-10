/**
 * AP Corporation (APC) Mobile Application Configuration
 */

export const Config = {
  appName: 'APC Attendance',
  appVersion: '1.0.0',
  companyName: 'AP Corporation',

  // Production API Base URL (can be overridden via EXPO_PUBLIC_API_URL in .env)
  defaultProductionApiUrl: 'https://web-production-f5d6b.up.railway.app/api',

  // Office Location & Geofence Coordinates (Default Nashik Office)
  office: {
    address: 'Flat no.7 Sakar Appartment Pandit Colony Lane, 7, Gangapur Rd, Nashik, Maharashtra 422002',
    latitude: 20.0021966,
    longitude: 73.7762006,
    allowedRadiusMeters: 120,
    accuracyBufferMeters: 25, // Mobile GPS drift buffer
  },

  // Work Schedule Defaults
  schedule: {
    idealPunchIn: '09:30',
    idealPunchOut: '18:30',
    bufferMinutesIn: 15,
    bufferMinutesOut: 15,
    halfDayThreshold: '12:00',
    secondHalfStart: '13:00',
    secondHalfEnd: '18:30',
  },

  // Standard Departments in APC
  departments: [
    'Client Servicing',
    'Management',
    'Engineering',
    'Operations',
    'HR',
    'Sales',
    'Finance',
  ],

  // Leave Types
  leaveTypes: [
    'Paid Leave',
    'Casual Leave',
    'Sick Leave',
    'Compensatory Off (C-Off)',
  ],

  // Expense Reimbursement Categories
  expenseCategories: [
    'Petrol',
    'Hotel',
    'Food',
    'Travel',
    'Internet/Mobile',
    'Client Meeting',
    'Other',
  ],

  // Storage Keys for Expo SecureStore
  storageKeys: {
    token: 'apc_mobile_token',
    refreshToken: 'apc_mobile_refresh_token',
    user: 'apc_mobile_user',
    customApiUrl: 'apc_mobile_api_url',
  },
};

export default Config;
