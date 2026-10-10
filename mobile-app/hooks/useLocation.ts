/**
 * Custom hook for GPS location & office geofencing validation
 */

import { useState, useCallback } from 'react';
import * as Location from 'expo-location';
import { calculateDistanceMeters, validateGeofence, GeofenceValidationResult } from '../utils/geofence';
import Config from '../constants/Config';
import { AttendanceRule } from '../types';

export type LocationStatus = 'idle' | 'locating' | 'success' | 'denied' | 'error';

export interface LocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  status: LocationStatus;
  errorMessage: string | null;
  distanceFromOffice: number | null;
  geofenceResult: GeofenceValidationResult | null;
}

export function useLocation(rule?: AttendanceRule | null) {
  const [state, setState] = useState<LocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    status: 'idle',
    errorMessage: null,
    distanceFromOffice: null,
    geofenceResult: null,
  });

  const refreshLocation = useCallback(async (): Promise<{
    latitude: number;
    longitude: number;
    accuracy: number;
    geofenceResult: GeofenceValidationResult;
  } | null> => {
    setState((prev) => ({ ...prev, status: 'locating', errorMessage: null }));

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        const errorMsg = 'Location permission was denied. Please grant location access in device settings to verify office geofence.';
        setState((prev) => ({
          ...prev,
          status: 'denied',
          errorMessage: errorMsg,
        }));
        return null;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude, accuracy } = position.coords;

      const officeLat = rule?.officeLat ?? Config.office.latitude;
      const officeLng = rule?.officeLng ?? Config.office.longitude;
      const allowedRadius = rule?.allowedRadiusMeters ?? Config.office.allowedRadiusMeters;
      const geofenceEnabled = rule?.geofenceEnabled ?? true;

      const distance = calculateDistanceMeters(latitude, longitude, officeLat, officeLng);
      const geofenceRes = validateGeofence(
        latitude,
        longitude,
        officeLat,
        officeLng,
        allowedRadius,
        accuracy ?? 0,
        geofenceEnabled
      );

      setState({
        latitude,
        longitude,
        accuracy,
        status: 'success',
        errorMessage: null,
        distanceFromOffice: distance,
        geofenceResult: geofenceRes,
      });

      return {
        latitude,
        longitude,
        accuracy: accuracy ?? 0,
        geofenceResult: geofenceRes,
      };
    } catch (err: any) {
      const msg = err.message || 'Failed to determine GPS location. Please ensure location services are turned on.';
      setState((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: msg,
      }));
      return null;
    }
  }, [rule]);

  return {
    ...state,
    refreshLocation,
  };
}

export default useLocation;
