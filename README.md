# APC Attendance Management Platform

A full-stack attendance management system for AP Corporation (APC) built with **React (Vite) + CSS Variables Design System** on the frontend and **Python Flask + SQLAlchemy + SQLite** on the backend.

---

## Brand & Design Tokens
Implemented in CSS variables (`/frontend/src/styles/main.css`):
- `--apc-primary: #F5A623` (Warm Orange-Yellow)
- `--apc-primary-dark: #D9880F`
- `--apc-primary-tint: #FDECC8`
- `--apc-bg: #FAF7F2` (Warm Off-White)
- `--apc-surface: #FFFFFF`
- `--apc-border: #E8E2D8`
- `--apc-text-primary: #2B2620`
- `--apc-text-secondary: #75706A`
- `--apc-success: #2E9E5B`
- `--apc-warning: #E2A33B`
- `--apc-danger: #D64545`
- `--apc-info: #3B82C4`

Logo: "APC" wordmark in Inter Extra Bold Italic with P parrot silhouette concept and 3 lockups (Full wordmark, "AP" monogram badge, "A" app icon).

---

## Features Implemented

### 1. Super Admin Portal (`/admin/dashboard`)
- **Dashboard**: Today's Present/Late/Absent/On-Leave counts as stat cards, late arrivals list with reasons, 30-day attendance trend visualizer.
- **Create Employee**: 2-Step wizard with persistent step indicator ("Step 1 of 2: Details", "Step 2 of 2: Credentials").
  - Auto-generated human-parseable Employee ID (`JO-DO-99-0004`).
  - Password generator with always-visible compliance rules.
  - Printable / Downloadable **Welcome Card**.
- **Employee Directory**: Data-dense table with photo, name, ID, department, status, and today's attendance status. Search, filters, and CSV export.
- **Employee Profile**: Overview (inline edit), Documents (view/download), Attendance Log, and Account controls (reset password, deactivate).
- **Attendance Settings**: Ideal punch-in/out pickers, buffer minutes, weekly off toggles, holiday calendar manager, half-day threshold, live preview calculation line ("punch-in after 10:06 AM will be marked Late").
- **Org-Wide Attendance Log**: Master grid with filters and CSV export.
- **Audit Log**: Read-only timeline of all administrative actions.

### 2. Employee Portal (`/home`) — Mobile-First
- **Home Screen**: Large contextual Punch In / Punch Out button, live camera stream video capture with preview/retake, server-calculated timestamp, required late reason prompt when past grace buffer, today's status card.
- **Attendance History**: Calendar view with color-coded status badges + Table view toggle, monthly summary stats.
- **Profile**: View-only admin fields, profile photo editor, uploaded documents read-only view, "Request Info Update" trigger.
- **Change Password**: Sequential fields with Date of Birth verification, 5 failed attempts cooldown lock, forced password change on first login.

---

## Quick Start Guide

### Step 1: Initialize Backend (Python Flask)
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
python seed.py
python app.py
```
Backend will run on `http://127.0.0.1:5000`.

### Step 2: Initialize Frontend (React Vite)
In a second terminal:
```bash
cd frontend
npm install
npm run dev
```
Frontend will run on `http://localhost:5173`.

---

## Seeded Demo Credentials

| Role | Employee ID / Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@apc.com` | `Admin@123` | Full access to all admin tools & settings |
| **Employee (Demo 1)** | `JO-DO-99-0001` | `Employee@123` | John Doe — Creative Director |
| **Employee (Demo 2)** | `SA-SM-98-0002` | `Employee@123` | Sarah Smith — Senior Media Buyer |
| **Employee (Demo 3)** | `RA-SH-97-0003` | `Employee@123` | Rahul Sharma (Requires first-time password change) |
