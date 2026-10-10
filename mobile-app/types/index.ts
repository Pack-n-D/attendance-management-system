/**
 * TypeScript Type Definitions for APC Attendance Platform
 * Matches backend SQLAlchemy models and API response payloads
 */

export type UserRole = 'super_admin' | 'employee';
export type AccountStatus = 'active' | 'inactive' | 'terminated';

export type AttendanceStatus =
  | 'on_time'
  | 'in_buffer'
  | 'late'
  | 'half_day'
  | 'on_leave'
  | 'absent'
  | 'not_punched';

export type ShiftType = 'full_day' | 'second_half';

export type RequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'withdrawal_requested'
  | 'withdrawn';

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  email: string;
  dob: string;
  dateOfJoining: string;
  designation: string;
  department: string;
  employmentType: string;
  reportingManagerId?: string | null;
  reportingManagerName?: string | null;
  role: UserRole;
  status: AccountStatus;
  profilePhotoUrl?: string | null;
  mustChangePassword?: boolean;
  createdBy?: string | null;
  createdAt?: string | null;
  baseSalary?: number;
  casualLeaveBalance?: number;
  sickLeaveBalance?: number;
  paidLeaveBalance?: number;
  coffBalance?: number;
  todayAttendanceStatus?: AttendanceStatus;
}

export interface AttendanceRecord {
  id: number;
  employeeId: string;
  employeeName?: string | null;
  department?: string | null;
  designation?: string | null;
  date: string; // YYYY-MM-DD
  punchInTime?: string | null; // HH:MM:SS
  punchInPhotoUrl?: string | null;
  punchInLocation?: string | null;
  punchOutTime?: string | null;
  punchOutPhotoUrl?: string | null;
  punchOutLocation?: string | null;
  status: AttendanceStatus;
  shiftType: ShiftType;
  isWfh?: boolean;
  lateReason?: string | null;
  isManualOverride?: boolean;
  adminOverrideBy?: string | null;
  adminOverrideAt?: string | null;
  adminOverrideReason?: string | null;
}

export interface AttendanceRule {
  id?: number;
  idealPunchInTime: string; // HH:MM
  idealPunchOutTime: string; // HH:MM
  bufferMinutesIn: number;
  bufferMinutesOut: number;
  weeklyOffs: string[];
  halfDayThresholdIn: string;
  secondHalfStartTime: string;
  secondHalfEndTime: string;
  secondHalfMinPunchOut: string;
  effectiveFrom?: string | null;
  officeAddress: string;
  officeLat: number;
  officeLng: number;
  allowedRadiusMeters: number;
  geofenceEnabled: boolean;
}

export interface Holiday {
  id: number;
  date: string; // YYYY-MM-DD
  label: string;
  name?: string;
}

export interface LeaveRequest {
  id: number;
  employeeId: string;
  employeeName?: string;
  department?: string | null;
  designation?: string | null;
  startDate: string;
  endDate: string;
  leaveType: string;
  reason: string;
  status: RequestStatus;
  reportingManagerId?: string | null;
  reportingManagerName?: string | null;
  managerComment?: string | null;
  withdrawReason?: string | null;
  reviewedAt?: string | null;
  createdAt?: string | null;
}

export interface WFHRequest {
  id: number;
  employeeId: string;
  employeeName?: string;
  department?: string | null;
  designation?: string | null;
  startDate: string;
  endDate: string;
  reason: string;
  status: RequestStatus;
  reportingManagerId?: string | null;
  reportingManagerName?: string | null;
  managerComment?: string | null;
  withdrawReason?: string | null;
  reviewedAt?: string | null;
  createdAt?: string | null;
}

export interface ReimbursementRequest {
  id: number;
  employeeId: string;
  employeeName?: string;
  department?: string | null;
  designation?: string | null;
  category: string;
  amount: number;
  expenseDate: string;
  description?: string | null;
  receiptPhotoUrl?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  adminComment?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt?: string | null;
}

export interface SalarySlip {
  id?: number;
  employeeId: string;
  employeeName?: string;
  department?: string | null;
  designation?: string | null;
  month: string; // YYYY-MM
  baseSalary: number;
  workingDays: number;
  presentDays: number;
  halfDays: number;
  absentDays: number;
  paidLeaves: number;
  overtimeHours: number;
  overtimePay: number;
  unpaidDeductions: number;
  grossSalary: number;
  netSalary: number;
  status?: string;
  createdAt?: string | null;
}

export interface AuditLog {
  id: number;
  actorId: string;
  actorName: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  timestamp: string;
}

export interface DocumentItem {
  id: number;
  employeeId: string;
  type: string;
  fileUrl: string;
  fileName?: string | null;
  uploadedBy?: string | null;
  uploadedAt?: string | null;
}

export interface TodayAttendanceStatusResponse {
  todayDate: string;
  currentTime: string;
  rule: AttendanceRule;
  record?: AttendanceRecord | null;
  isWfhToday: boolean;
  activeWfh?: WFHRequest | null;
}

export interface DashboardStatsResponse {
  todayDate: string;
  stats: {
    totalEmployees: number;
    present: number;
    late: number;
    absent: number;
    onLeave: number;
  };
  lateArrivalsToday: Array<{
    id: number;
    employeeId: string;
    employeeName: string;
    department: string;
    punchInTime: string;
    lateReason: string;
    photoUrl?: string | null;
  }>;
  pendingLeaveRequests: LeaveRequest[];
  pendingWfhRequests: WFHRequest[];
  trendChart: Array<{
    date: string;
    onTime: number;
    late: number;
    absent: number;
    onLeave: number;
  }>;
}

export interface LoginResponse {
  message: string;
  token: string;
  refreshToken?: string;
  user: Employee;
}
