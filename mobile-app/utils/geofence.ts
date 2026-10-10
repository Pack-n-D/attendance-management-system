/**
 * Geofencing and Distance Calculation Utility
 * Replicates backend calculate_distance_meters logic in utils.py
 */

export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance);
}

export interface GeofenceValidationResult {
  isValid: boolean;
  distance: number;
  message: string;
}

export function validateGeofence(
  userLat: number | null | undefined,
  userLng: number | null | undefined,
  officeLat: number,
  officeLng: number,
  allowedRadiusMeters: number = 120,
  userAccuracyMeters: number = 0,
  geofenceEnabled: boolean = true
): GeofenceValidationResult {
  if (!geofenceEnabled) {
    return {
      isValid: true,
      distance: 0,
      message: 'Geofence is disabled. Punch permitted from anywhere.',
    };
  }

  if (userLat == null || userLng == null) {
    return {
      isValid: false,
      distance: -1,
      message: 'Location required. Please enable GPS location services to verify office proximity.',
    };
  }

  const distance = calculateDistanceMeters(userLat, userLng, officeLat, officeLng);

  // Generous mobile GPS accuracy buffer to avoid false rejections
  const accuracyBuffer = Math.min(Math.max(userAccuracyMeters || 0, 15), 30);
  const effectiveAllowedRadius = allowedRadiusMeters + accuracyBuffer;

  if (distance <= effectiveAllowedRadius) {
    return {
      isValid: true,
      distance,
      message: `Within office perimeter (${distance}m away).`,
    };
  }

  return {
    isValid: false,
    distance,
    message: `Outside office perimeter (${distance}m away, max allowed is ${allowedRadiusMeters}m). Please punch in from the office or apply for Work From Home.`,
  };
}
