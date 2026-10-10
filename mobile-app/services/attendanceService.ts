/**
 * Attendance Service
 * Communicates with /api/attendance
 */

import { apiFetch, getApiBaseUrl, getAuthToken } from './api';
import {
  AttendanceRecord,
  TodayAttendanceStatusResponse,
  ShiftType,
} from '../types';

export interface PunchInParams {
  photo?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  location?: string | null;
  lateReason?: string | null;
  shiftType?: ShiftType;
}

export interface PunchOutParams {
  photo?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  location?: string | null;
}

export const attendanceService = {
  async getTodayStatus(): Promise<TodayAttendanceStatusResponse> {
    return apiFetch<TodayAttendanceStatusResponse>('/attendance/today-status');
  },

  async punchIn(params: PunchInParams): Promise<{
    message: string;
    recordedTime: string;
    status: string;
    isWfh: boolean;
    record: AttendanceRecord;
  }> {
    return apiFetch('/attendance/punch-in', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async punchOut(params: PunchOutParams): Promise<{
    message: string;
    recordedTime: string;
    record: AttendanceRecord;
  }> {
    return apiFetch('/attendance/punch-out', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async getAttendanceLog(filters?: {
    search?: string;
    department?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    employeeId?: string;
  }): Promise<{ records: AttendanceRecord[] }> {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.department) params.append('department', filters.department);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.employeeId) params.append('employeeId', filters.employeeId);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    return apiFetch<{ records: AttendanceRecord[] }>(`/attendance/log${queryString}`);
  },

  async getExportCSVUrl(): Promise<string> {
    const baseUrl = await getApiBaseUrl();
    const token = await getAuthToken();
    return `${baseUrl}/attendance/export/csv?token=${token}`;
  },
};

export default attendanceService;
