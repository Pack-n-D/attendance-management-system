# AP Corporation (APC) Attendance Management Platform
## Mobile API Discovery & Endpoint Mapping

This document provides the complete API mapping between the existing backend production APIs and the Standalone React Native + Expo Mobile Application (`/mobile-app`).

> **Architectural Source of Truth**:
> The mobile client communicates directly with the existing production Flask API and database. There is **zero duplicate database** and **zero schema change**.

---

### 1. Authentication & Identity APIs (`/api/auth`)

| Feature | Existing API | Method | Authentication | Mobile Usage | Notes |
|---|---|---|---|---|---|
| Employee / Admin Login | `/api/auth/login` | POST | Public | Yes (`(auth)/login.tsx`) | Accepts `identifier` (Employee ID or Email) and `password`. Returns JWT `token`, `refreshToken`, and user payload. |
| Current User Profile | `/api/auth/me` | GET | Bearer JWT | Yes (`AuthContext.tsx`) | Restores authenticated session on app launch from SecureStore. |
| Force/Manual Password Change | `/api/auth/change-password` | POST | Bearer JWT | Yes (`(auth)/change-password.tsx`) | Verifies `currentPassword`, DOB check for employees, and updates password hash. Clears `mustChangePassword`. |

---

### 2. Daily Attendance & Geofencing APIs (`/api/attendance`)

| Feature | Existing API | Method | Authentication | Mobile Usage | Notes |
|---|---|---|---|---|---|
| Today's Status & Active Rule | `/api/attendance/today-status` | GET | Bearer JWT | Yes (`(employee)/home.tsx`) | Returns server date, authoritative IST server time, active rule (office lat/lng/radius), today's attendance record, and WFH status. |
| Punch In | `/api/attendance/punch-in` | POST | Bearer JWT | Yes (`(employee)/home.tsx`) | Sends Base64 selfie `photo`, `latitude`, `longitude`, `accuracy`, `location`, `shiftType` (`full_day`/`second_half`), and `lateReason`. Geofence validated on server. |
| Punch Out | `/api/attendance/punch-out` | POST | Bearer JWT | Yes (`(employee)/home.tsx`) | Sends Base64 selfie `photo`, `latitude`, `longitude`, `accuracy`, and `location`. Computes worked duration, overtime hours, and holiday C-Off credits. |
| Organization Attendance Log | `/api/attendance/log` | GET | Bearer JWT | Yes (`(admin)/attendance.tsx`, `(employee)/attendance.tsx`) | Filterable by `search`, `department`, `status`, `startDate`, `endDate`, and `employeeId`. Restricted for employees to own records. |
| Export Attendance CSV | `/api/attendance/export/csv` | GET | Bearer JWT / Query Token | Yes (`(admin)/attendance.tsx`) | Downloads or shares CSV report of all employee attendance records. |

---

### 3. Employee Self-Service APIs (`/api/employee`)

| Feature | Existing API | Method | Authentication | Mobile Usage | Notes |
|---|---|---|---|---|---|
| Detailed Profile & Docs | `/api/employee/profile` | GET | Bearer JWT | Yes (`(employee)/profile.tsx`) | Returns employee record and uploaded compliance documents (Aadhaar, PAN, etc.). |
| Update Profile Photo | `/api/employee/profile/photo` | POST | Bearer JWT | Yes (`(employee)/profile.tsx`) | Accepts Base64 avatar photo captured via Camera or Photo Library. |
| Request Info Update | `/api/employee/request-update` | POST | Bearer JWT | Yes (`(employee)/profile.tsx`) | Submits change request (e.g. phone, address) to Super Admin with audit log entry. |
| Attendance History & Summary | `/api/employee/attendance-history` | GET | Bearer JWT | Yes (`(employee)/attendance.tsx`) | Returns records plus monthly counts: `present`, `late`, `absent`, `onLeave`, and `totalDays`. |
| Apply Leave | `/api/employee/leave-requests` | POST | Bearer JWT | Yes (`(employee)/leave.tsx`) | Submits leave request (`startDate`, `endDate`, `leaveType`, `reason`). Auto-routed to manager. |
| My Leave Requests | `/api/employee/leave-requests` | GET | Bearer JWT | Yes (`(employee)/leave.tsx`) | Returns history of personal leave applications and approval statuses. |
| Team Leave Requests | `/api/employee/managed-leave-requests` | GET | Bearer JWT | Yes (`(employee)/leave.tsx`) | For reporting managers: lists pending leave requests of direct reports. |
| Cancel / Withdraw Leave | `/api/employee/leave-requests/:id/withdraw` | POST | Bearer JWT | Yes (`(employee)/leave.tsx`) | Cancels pending leave immediately or requests withdrawal for already approved leave. |
| Review Team Leave | `/api/employee/leave-requests/:id/review` | POST | Bearer JWT | Yes (`(employee)/leave.tsx`) | Action: `approve`, `reject`, `approve_withdrawal`, `reject_withdrawal`. Updates leave balances. |
| Apply WFH | `/api/employee/wfh-requests` | POST | Bearer JWT | Yes (`(employee)/wfh.tsx`) | Submits Work From Home application (`startDate`, `endDate`, `reason`). |
| My WFH Requests | `/api/employee/wfh-requests` | GET | Bearer JWT | Yes (`(employee)/wfh.tsx`) | Lists employee's WFH requests and statuses. |
| Team WFH Requests | `/api/employee/managed-wfh-requests` | GET | Bearer JWT | Yes (`(employee)/wfh.tsx`) | For reporting managers: lists pending WFH requests of direct reports. |
| Cancel / Withdraw WFH | `/api/employee/wfh-requests/:id/withdraw` | POST | Bearer JWT | Yes (`(employee)/wfh.tsx`) | Cancels pending or requests withdrawal for approved WFH. |
| Review Team WFH | `/api/employee/wfh-requests/:id/review` | POST | Bearer JWT | Yes (`(employee)/wfh.tsx`) | Action: `approve`, `reject`, `approve_withdrawal`, `reject_withdrawal`. |
| My Salary Slips | `/api/employee/salary-slips` | GET | Bearer JWT | Yes (`(employee)/salary.tsx`) | Generates itemized monthly breakdown: working days, present, half-days, absent, paid leaves, overtime pay, gross salary, deductions, net salary. |
| My Reimbursements | `/api/employee/reimbursements` | GET | Bearer JWT | Yes (`(employee)/reimbursements.tsx`) | Lists claims with `totalClaimed`, `totalApproved`, `totalPending`. |
| Submit Reimbursement Claim | `/api/employee/reimbursements` | POST | Bearer JWT | Yes (`(employee)/reimbursements.tsx`) | Submits expense (`category`, `amount`, `expenseDate`, `description`, Base64 receipt `receiptPhoto`). |
| Cancel Reimbursement Claim | `/api/employee/reimbursements/:id` | DELETE | Bearer JWT | Yes (`(employee)/reimbursements.tsx`) | Cancels pending reimbursement request. |

---

### 4. Super Admin Management APIs (`/api/admin`)

| Feature | Existing API | Method | Authentication | Mobile Usage | Notes |
|---|---|---|---|---|---|
| Executive Dashboard Stats | `/api/admin/dashboard` | GET | Bearer JWT (Admin) | Yes (`(admin)/dashboard.tsx`) | Live counts (`totalEmployees`, `present`, `late`, `absent`, `onLeave`), late arrivals feed, 30-day trend chart, pending leave & WFH requests. |
| Auto-Generate Employee ID | `/api/admin/employees/generate-id` | POST | Bearer JWT (Admin) | Yes (`(admin)/employees/new.tsx`) | Generates standardized APC Employee ID (e.g., `SH-GO-98-0001`). |
| Employee Directory | `/api/admin/employees` | GET | Bearer JWT (Admin) | Yes (`(admin)/employees/index.tsx`) | Search by name/ID/email/phone, filter by department and status. Includes today's attendance status. |
| Create Employee | `/api/admin/employees` | POST | Bearer JWT (Admin) | Yes (`(admin)/employees/new.tsx`) | Creates new employee with initial salary, leave balances, manager, and generates Welcome Card with temporary password. |
| Employee Detail | `/api/admin/employees/:id` | GET | Bearer JWT (Admin) | Yes (`(admin)/employees/[id].tsx`) | Full profile, uploaded documents, attendance history logs. |
| Update Employee | `/api/admin/employees/:id` | PUT | Bearer JWT (Admin) | Yes (`(admin)/employees/[id].tsx`) | Updates profile details, salary, leave balances, and manager. |
| Upload Employee Document | `/api/admin/employees/:id/documents` | POST | Bearer JWT (Admin) | Yes (`(admin)/employees/[id].tsx`) | Uploads Aadhaar, PAN, Education, or Other verification documents. |
| Delete Document | `/api/admin/employees/:id/documents/:doc_id` | DELETE | Bearer JWT (Admin) | Yes (`(admin)/employees/[id].tsx`) | Deletes employee document. |
| Reset Employee Password | `/api/admin/employees/:id/reset-password` | POST | Bearer JWT (Admin) | Yes (`(admin)/employees/[id].tsx`) | Resets password to random temporary password and sets `mustChangePassword=true`. |
| Toggle Active/Inactive | `/api/admin/employees/:id/toggle-status` | POST | Bearer JWT (Admin) | Yes (`(admin)/employees/index.tsx`, `[id].tsx`) | Toggles employee status between active and inactive. |
| Delete Employee Record | `/api/admin/employees/:id` | DELETE | Bearer JWT (Admin) | Yes (`(admin)/employees/[id].tsx`) | Permanently deletes employee and associated records (except Super Admin). |
| All Org Leave Requests | `/api/admin/leave-requests` | GET | Bearer JWT (Admin) | Yes (`(admin)/dashboard.tsx`, `(admin)/leave.tsx`) | Organization-wide leave requests with filter by status and search. |
| Admin Review Leave Request | `/api/admin/leave-requests/:id/review` | POST | Bearer JWT (Admin) | Yes (`(admin)/dashboard.tsx`) | Approve/reject leave or leave withdrawal across the company. |
| All Org WFH Requests | `/api/admin/wfh-requests` | GET | Bearer JWT (Admin) | Yes (`(admin)/dashboard.tsx`) | Organization-wide WFH requests. |
| Admin Review WFH Request | `/api/admin/wfh-requests/:id/review` | POST | Bearer JWT (Admin) | Yes (`(admin)/dashboard.tsx`) | Approve/reject WFH or WFH withdrawal across the company. |
| All Reimbursements | `/api/admin/reimbursements` | GET | Bearer JWT (Admin) | Yes (`(admin)/reimbursements.tsx`) | All employee claims with statistics and status filters. |
| Review Reimbursement | `/api/admin/reimbursements/:id/review` | POST | Bearer JWT (Admin) | Yes (`(admin)/reimbursements.tsx`) | Approve or reject claim with admin comment. |
| Admin Attendance Override | `/api/admin/attendance/override` | POST | Bearer JWT (Admin) | Yes (`(admin)/attendance.tsx`) | Manually add/override punch-in/out times, status (`on_time`, `in_buffer`, `late`, `half_day`, `on_leave`, `absent`, or `clear`). |
| Delete Attendance Override | `/api/admin/attendance/override` | DELETE | Bearer JWT (Admin) | Yes (`(admin)/attendance.tsx`) | Clears an override record for employee and date. |
| Organization Audit Logs | `/api/admin/audit-log` | GET | Bearer JWT (Admin) | Yes (`(admin)/audit.tsx`) | Chronological audit trail of all platform activities with timestamps and actors. |
| View Employee Salary Slip | `/api/admin/employees/:id/salary-slip` | GET | Bearer JWT (Admin) | Yes (`(admin)/employees/[id].tsx`) | Computes and previews salary slip for any employee for any month. |

---

### 5. Settings & Geofencing Rules APIs (`/api/settings`)

| Feature | Existing API | Method | Authentication | Mobile Usage | Notes |
|---|---|---|---|---|---|
| Get Active Attendance Rules | `/api/settings/attendance-rules` | GET | Bearer JWT | Yes (`(admin)/settings.tsx`, `(employee)/home.tsx`) | Returns ideal punch times, buffers, office lat/lng (`20.003972`, `73.776836`), allowed radius (120m), geofence toggle. |
| Update Attendance Rules | `/api/settings/attendance-rules` | POST/PUT | Bearer JWT (Admin) | Yes (`(admin)/settings.tsx`) | Configures office location, geofence radius, weekly offs, second half timings. |
| Holidays List | `/api/settings/holidays` | GET | Bearer JWT | Yes (`(admin)/settings.tsx`) | Official company holidays calendar. |
| Add Holiday | `/api/settings/holidays` | POST | Bearer JWT (Admin) | Yes (`(admin)/settings.tsx`) | Adds new holiday with `date` and `label`. |
| Delete Holiday | `/api/settings/holidays/:id` | DELETE | Bearer JWT (Admin) | Yes (`(admin)/settings.tsx`) | Deletes holiday from official calendar. |
