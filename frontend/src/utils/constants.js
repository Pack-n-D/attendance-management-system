export const DEPARTMENTS = [
  'Creative',
  'CRM',
  'SCM',
  'Finance',
  'HR',
  'Marketing',
  'Sales',
  'Operations',
  'Product',
  'Digital Marketing',
  'Management',
  'Designing',
  'Admin',
  'Client Servicing',
  'Media Buying',
  'IT'
];

export const DEFAULT_OFFICE_CONFIG = {
  address: 'Flat no.7 Sakar Appartment Pandit Colony Lane, 7, Gangapur Rd, Nashik, Maharashtra 422002',
  lat: 20.0024286,
  lng: 73.776293,
  allowedRadiusMeters: 40.0,
  geofenceEnabled: true
};

export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return Infinity;
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

