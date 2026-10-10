# AP Corporation (APC) Attendance Management Platform
## Mobile Testing & Quality Assurance Verification Plan

This document establishes the comprehensive QA checklist, role-based authorization matrix, web-vs-mobile parity criteria, and data consistency verification tests for the Standalone Android + iOS application.

---

## 1. Feature Verification Checklist

### AUTHENTICATION & SECURITY
- [x] **Super Admin Login** (`SUPERADMIN01` / `Admin@123`)
- [x] **Manager Login** (`KA-MU-95-0001` / `Password@123`)
- [x] **Employee Login** (`SH-GO-98-0001` / `Password@123`)
- [x] **Invalid Credentials Handling**: Correctly displays server error message.
- [x] **Session Persistence**: JWT securely saved in `Expo SecureStore` across app restarts.
- [x] **Automatic Session Restoration**: App resumes directly to role portal without re-login.
- [x] **Forced Password Change**: Detects `mustChangePassword=true` and redirects to mandatory change screen.
- [x] **Date of Birth Identity Check**: Verifies employee DOB before allowing password changes.
- [x] **Secure Sign Out**: Destroys SecureStore session and routes to clean login screen.

### EMPLOYEE PORTAL
- [x] **Live Digital Clock**: Real-time IST clock (Maharashtra GMT+5:30) synchronized with server date.
- [x] **Today Status Detection**: Reflects active attendance rule and today's punch record.
- [x] **Shift Type Selection**: Full Day (`09:30 - 18:30`) vs Second Half (`13:00 - 18:30`).
- [x] **GPS Geofence Validation**: Computes proximity to Nashik office perimeter with 25m accuracy buffer.
- [x] **WFH Exemption**: Automatically bypasses office geofence requirement if approved Work From Home for today.
- [x] **Punch In with Selfie**: Launches front camera for selfie verification and sends Base64 photo to `/api/attendance/punch-in`.
- [x] **Late Reason Requirement**: Prompts for late reason if punching in past buffer time.
- [x] **Punch Out with Calculation**: Calculates worked hours, overtime message, and automatic C-Off credits for holiday work.
- [x] **Attendance History**: Monthly summary badges (Present, Late, Absent, On Leave) and list with thumbnails.
- [x] **Leave Application**: Apply for Paid Leave, Casual Leave, Sick Leave, C-Off with date pickers.
- [x] **Leave Withdrawal**: Cancel pending leaves or submit withdrawal request for approved leaves.
- [x] **Work From Home Application**: Apply for remote work days with reason and view status.
- [x] **WFH Withdrawal**: Cancel pending or submit withdrawal for approved WFH.
- [x] **Manager Team Reviews**: If user has direct reports, provides "Team Approvals" tab for leaves and WFH.
- [x] **Expense Reimbursements**: Submit claim with category, amount, date, description, and receipt photo capture.
- [x] **Cancel Reimbursement**: Delete pending claims.
- [x] **MNC Salary Slip**: Itemized monthly breakdown of earnings, deductions, overtime, and net take-home pay.
- [x] **Profile & Avatar**: View profile details, update photo via camera/gallery, and submit update requests to admin.

### SUPER ADMIN PORTAL
- [x] **Executive Dashboard**: Real-time counts (Total Employees, Present, Late, Absent, On Leave).
- [x] **Pending Request Alerts**: Quick-action cards for pending Leaves and WFH with 1-tap review modal.
- [x] **Late Arrivals Feed**: Live feed showing employee name, department, punch in time, photo, and reason.
- [x] **30-Day Trend**: Visual activity indicator across past business days.
- [x] **Employee Directory**: Instant search by name, ID, phone, email, and department chips filter.
- [x] **Create Employee**: Automatic ID generation (e.g. `RA-SH-98-0001`), salary, leave balances, manager assignment, and Welcome Card modal with temporary password.
- [x] **Employee Management**: Profile view, edit details, update photo, upload/delete compliance documents.
- [x] **Password Reset**: Generates random temporary password and enforces change on next login.
- [x] **Status Toggle**: 1-tap activation and deactivation.
- [x] **Employee Deletion**: Removes employee with confirmation prompt.
- [x] **Attendance Log & Overrides**: Organization attendance log with search, filters, manual override modal, and clear record.
- [x] **CSV Export**: Downloads/shares attendance export report.
- [x] **Reimbursement Approvals**: Filter claims by status and review with approve/reject and admin notes.
- [x] **Attendance Rules Configuration**: Ideal in/out times, buffer minutes, second-half timings.
- [x] **Geofence Configuration**: Office latitude/longitude, allowed radius in meters, and geofence toggle.
- [x] **Company Holidays**: List official holidays, add new holiday, and delete holiday.
- [x] **Audit Trail**: Chronological log of recent platform events.

---

## 2. Web Application vs Mobile Application Validation Matrix

| Area | Web Portal | Mobile App | Consistency Check |
|---|---|---|---|
| **Branding** | Saffron `#F5A623`, Cream `#FAF7F2`, Dark `#2B2620` | Saffron `#F5A623`, Cream `#FAF7F2`, Dark `#2B2620` | Exact Match |
| **Authentication** | Bearer JWT via `localStorage` | Bearer JWT via `Expo SecureStore` | Hardware Encrypted & Secure |
| **Source of Truth** | Production Flask API (`/api`) | Production Flask API (`/api`) | Single Source of Truth |
| **Database** | Shared Production SQLite/Postgres | Shared Production SQLite/Postgres | Zero Data Loss |
| **Punch In/Out** | Webcam capture & Geolocation | Native Camera & Expo Location | Identical Base64 payload |
| **Geofence Calculation** | Haversine formula | Haversine formula (`utils/geofence.ts`) | Identical Distance Output |
| **RBAC Authority** | Backend JWT role claims | Backend JWT role claims | Server is Authoritative |
| **Salary Calculation** | Server `calculate_employee_salary_slip` | Server `calculate_employee_salary_slip` | Zero Discrepancy |

---

## 3. Data Consistency & Synchronization Tests

### TEST 1: Web → Mobile Real-Time Sync
1. Open web application as Super Admin.
2. Add a new employee or update attendance rules.
3. Open Mobile App on device/emulator.
4. **Verification**: Pull to refresh on Mobile App shows the updated employee or new attendance rules immediately.

### TEST 2: Mobile → Web Real-Time Sync
1. Open Mobile App as Employee (`SH-GO-98-0001`).
2. Punch in with live selfie photo and submit a reimbursement claim of ₹500 for Petrol.
3. Open Web Application as Super Admin.
4. **Verification**: Web Dashboard immediately reflects Present count +1, displays employee in today's punches with the mobile selfie, and shows the ₹500 Petrol claim in pending reimbursements.

### TEST 3: Simultaneous Multi-Client Safety
1. Both Web and Mobile submit requests simultaneously.
2. Backend serializes transactions with database integrity constraints.
3. **Verification**: Zero duplicate punch records, zero data corruption, server remains authoritative.
