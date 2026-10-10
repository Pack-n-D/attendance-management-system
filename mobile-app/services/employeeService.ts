/**
 * Employee Portal Service
 * Communicates with /api/employee
 */

import { apiFetch } from './api';
import {
  Employee,
  AttendanceRecord,
  DocumentItem,
  LeaveRequest,
  WFHRequest,
  ReimbursementRequest,
  SalarySlip,
} from '../types';

export const employeeService = {
  async getProfile(): Promise<{ employee: Employee; documents: DocumentItem[] }> {
    return apiFetch<{ employee: Employee; documents: DocumentItem[] }>('/employee/profile');
  },

  async updateProfilePhoto(photoBase64: string): Promise<{ message: string; profilePhotoUrl: string }> {
    return apiFetch('/employee/profile/photo', {
      method: 'POST',
      body: JSON.stringify({ photo: photoBase64 }),
    });
  },

  async requestInfoUpdate(field: string, requestedValue: string, reason: string): Promise<{ message: string }> {
    return apiFetch('/employee/request-update', {
      method: 'POST',
      body: JSON.stringify({ field, requestedValue, reason }),
    });
  },

  async getAttendanceHistory(startDate?: string, endDate?: string): Promise<{
    records: AttendanceRecord[];
    summary: {
      present: number;
      late: number;
      absent: number;
      onLeave: number;
      totalDays: number;
    };
  }> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiFetch(`/employee/attendance-history${qs}`);
  },

  // --- Leaves ---
  async applyLeave(data: {
    startDate: string;
    endDate: string;
    leaveType: string;
    reason: string;
  }): Promise<{ message: string; leaveRequest: LeaveRequest }> {
    return apiFetch('/employee/leave-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getMyLeaveRequests(): Promise<{ leaveRequests: LeaveRequest[] }> {
    return apiFetch('/employee/leave-requests');
  },

  async getManagedLeaveRequests(): Promise<{ leaveRequests: LeaveRequest[] }> {
    return apiFetch('/employee/managed-leave-requests');
  },

  async withdrawLeave(reqId: number, reason?: string): Promise<{ message: string; leaveRequest: LeaveRequest }> {
    return apiFetch(`/employee/leave-requests/${reqId}/withdraw`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async reviewLeave(
    reqId: number,
    action: 'approve' | 'reject' | 'approve_withdrawal' | 'reject_withdrawal',
    comment?: string
  ): Promise<{ message: string; leaveRequest: LeaveRequest }> {
    return apiFetch(`/employee/leave-requests/${reqId}/review`, {
      method: 'POST',
      body: JSON.stringify({ action, comment }),
    });
  },

  // --- Work From Home (WFH) ---
  async applyWFH(data: {
    startDate: string;
    endDate: string;
    reason: string;
  }): Promise<{ message: string; wfhRequest: WFHRequest }> {
    return apiFetch('/employee/wfh-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getMyWFHRequests(): Promise<{ wfhRequests: WFHRequest[] }> {
    return apiFetch('/employee/wfh-requests');
  },

  async getManagedWFHRequests(): Promise<{ wfhRequests: WFHRequest[] }> {
    return apiFetch('/employee/managed-wfh-requests');
  },

  async withdrawWFH(reqId: number, reason?: string): Promise<{ message: string; wfhRequest: WFHRequest }> {
    return apiFetch(`/employee/wfh-requests/${reqId}/withdraw`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async reviewWFH(
    reqId: number,
    action: 'approve' | 'reject' | 'approve_withdrawal' | 'reject_withdrawal',
    comment?: string
  ): Promise<{ message: string; wfhRequest: WFHRequest }> {
    return apiFetch(`/employee/wfh-requests/${reqId}/review`, {
      method: 'POST',
      body: JSON.stringify({ action, comment }),
    });
  },

  // --- Salary Slips ---
  async getMySalarySlips(month?: string): Promise<{
    employee: Employee;
    salarySlip: SalarySlip;
  }> {
    const qs = month ? `?month=${month}` : '';
    return apiFetch(`/employee/salary-slips${qs}`);
  },

  // --- Reimbursements ---
  async getMyReimbursements(): Promise<{
    reimbursements: ReimbursementRequest[];
    totalClaimed: number;
    totalApproved: number;
    totalPending: number;
  }> {
    return apiFetch('/employee/reimbursements');
  },

  async submitReimbursement(data: {
    category: string;
    amount: number;
    expenseDate?: string;
    description?: string;
    receiptPhoto?: string | null;
  }): Promise<{ message: string; reimbursement: ReimbursementRequest }> {
    return apiFetch('/employee/reimbursements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteReimbursement(id: number): Promise<{ message: string }> {
    return apiFetch(`/employee/reimbursements/${id}`, {
      method: 'DELETE',
    });
  },
};

export default employeeService;
