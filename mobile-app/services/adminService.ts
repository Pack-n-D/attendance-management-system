/**
 * Super Admin Management Service
 * Communicates with /api/admin and /api/settings
 */

import { apiFetch } from './api';
import {
  Employee,
  AttendanceRecord,
  AttendanceRule,
  Holiday,
  AuditLog,
  LeaveRequest,
  WFHRequest,
  ReimbursementRequest,
  DashboardStatsResponse,
  DocumentItem,
  SalarySlip,
} from '../types';

export const adminService = {
  // --- Dashboard ---
  async getDashboard(): Promise<DashboardStatsResponse> {
    return apiFetch<DashboardStatsResponse>('/admin/dashboard');
  },

  // --- Employee Directory & CRUD ---
  async generateEmployeeId(firstName: string, lastName: string, dob?: string): Promise<{ employeeId: string }> {
    return apiFetch('/admin/employees/generate-id', {
      method: 'POST',
      body: JSON.stringify({ firstName, lastName, dob }),
    });
  },

  async getEmployees(filters?: {
    search?: string;
    department?: string;
    status?: string;
  }): Promise<{ employees: Employee[] }> {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.department) params.append('department', filters.department);
    if (filters?.status) params.append('status', filters.status);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiFetch(`/admin/employees${qs}`);
  },

  async createEmployee(data: any): Promise<{
    message: string;
    employee: Employee;
    welcomeCard: {
      employeeId: string;
      fullName: string;
      email: string;
      tempPassword: string;
      designation: string;
      department: string;
      dateOfJoining: string;
      profilePhotoUrl?: string | null;
    };
  }> {
    return apiFetch('/admin/employees', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getEmployeeDetail(id: string): Promise<{
    employee: Employee;
    documents: DocumentItem[];
    attendanceLogs: AttendanceRecord[];
    rule: AttendanceRule | null;
  }> {
    return apiFetch(`/admin/employees/${id}`);
  },

  async updateEmployee(id: string, data: any): Promise<{ message: string; employee: Employee }> {
    return apiFetch(`/admin/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async uploadDocument(
    id: string,
    docType: string,
    fileName: string,
    fileData: string
  ): Promise<{ message: string; documents: DocumentItem[] }> {
    return apiFetch(`/admin/employees/${id}/documents`, {
      method: 'POST',
      body: JSON.stringify({ docType, fileName, fileData }),
    });
  },

  async deleteDocument(id: string, docId: number): Promise<{ message: string; documents: DocumentItem[] }> {
    return apiFetch(`/admin/employees/${id}/documents/${docId}`, {
      method: 'DELETE',
    });
  },

  async resetPassword(id: string): Promise<{ message: string; tempPassword: string }> {
    return apiFetch(`/admin/employees/${id}/reset-password`, {
      method: 'POST',
    });
  },

  async toggleEmployeeStatus(id: string): Promise<{ message: string; status: string }> {
    return apiFetch(`/admin/employees/${id}/toggle-status`, {
      method: 'POST',
    });
  },

  async deleteEmployee(id: string): Promise<{ message: string }> {
    return apiFetch(`/admin/employees/${id}`, {
      method: 'DELETE',
    });
  },

  async getEmployeeSalarySlip(id: string, month?: string): Promise<{
    employee: Employee;
    salarySlip: SalarySlip;
  }> {
    const qs = month ? `?month=${month}` : '';
    return apiFetch(`/admin/employees/${id}/salary-slip${qs}`);
  },

  // --- Leave Management ---
  async getAllLeaveRequests(status?: string, search?: string): Promise<{ leaveRequests: LeaveRequest[] }> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiFetch(`/admin/leave-requests${qs}`);
  },

  async reviewLeaveRequest(
    reqId: number,
    action: 'approve' | 'reject' | 'approve_withdrawal' | 'reject_withdrawal',
    comment?: string
  ): Promise<{ message: string; leaveRequest: LeaveRequest }> {
    return apiFetch(`/admin/leave-requests/${reqId}/review`, {
      method: 'POST',
      body: JSON.stringify({ action, comment }),
    });
  },

  // --- WFH Management ---
  async getAllWFHRequests(status?: string, search?: string): Promise<{ wfhRequests: WFHRequest[] }> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiFetch(`/admin/wfh-requests${qs}`);
  },

  async reviewWFHRequest(
    reqId: number,
    action: 'approve' | 'reject' | 'approve_withdrawal' | 'reject_withdrawal',
    comment?: string
  ): Promise<{ message: string; wfhRequest: WFHRequest }> {
    return apiFetch(`/admin/wfh-requests/${reqId}/review`, {
      method: 'POST',
      body: JSON.stringify({ action, comment }),
    });
  },

  // --- Reimbursements ---
  async getAllReimbursements(filters?: {
    status?: string;
    search?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    reimbursements: ReimbursementRequest[];
    stats: {
      totalClaimed: number;
      totalApproved: number;
      totalPending: number;
      totalRejected: number;
      pendingCount: number;
    };
  }> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiFetch(`/admin/reimbursements${qs}`);
  },

  async reviewReimbursement(
    id: number,
    action: 'approve' | 'reject',
    comment?: string
  ): Promise<{ message: string; reimbursement: ReimbursementRequest }> {
    return apiFetch(`/admin/reimbursements/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ action, comment }),
    });
  },

  // --- Attendance Overrides ---
  async overrideAttendance(data: {
    employeeId: string;
    date: string;
    status: string;
    punchInTime?: string | null;
    punchOutTime?: string | null;
    shiftType?: string;
    reason?: string;
  }): Promise<{ message: string; record: AttendanceRecord }> {
    return apiFetch('/admin/attendance/override', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteAttendanceOverride(employeeId: string, date: string): Promise<{ message: string }> {
    return apiFetch(`/admin/attendance/override?employeeId=${employeeId}&date=${date}`, {
      method: 'DELETE',
    });
  },

  // --- Audit Trail ---
  async getAuditLogs(): Promise<{ auditLogs: AuditLog[] }> {
    return apiFetch<{ auditLogs: AuditLog[] }>('/admin/audit-log');
  },

  // --- Settings & Rules ---
  async getAttendanceRules(): Promise<{ rule: AttendanceRule }> {
    return apiFetch<{ rule: AttendanceRule }>('/settings/attendance-rules');
  },

  async updateAttendanceRules(data: Partial<AttendanceRule>): Promise<{ message: string; rule: AttendanceRule }> {
    return apiFetch('/settings/attendance-rules', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // --- Holidays ---
  async getHolidays(): Promise<{ holidays: Holiday[] }> {
    return apiFetch<{ holidays: Holiday[] }>('/settings/holidays');
  },

  async addHoliday(date: string, label: string): Promise<{ message: string; holiday: Holiday }> {
    return apiFetch('/settings/holidays', {
      method: 'POST',
      body: JSON.stringify({ date, label }),
    });
  },

  async deleteHoliday(id: number): Promise<{ message: string }> {
    return apiFetch(`/settings/holidays/${id}`, {
      method: 'DELETE',
    });
  },
};

export default adminService;
