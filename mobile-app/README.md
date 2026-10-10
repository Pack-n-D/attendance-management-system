# AP Corporation (APC) — Standalone Mobile Application (Android + iOS)

A separate standalone React Native + Expo mobile application for **AP Corporation (APC) Attendance Management Platform**.

Communicates directly with the existing production backend API and database, ensuring **zero data loss, one single source of truth, and strict role-based access control (RBAC)** across both Web and Mobile.

---

## 📱 Features

- **Genuine React Native Native UI** (Zero WebViews).
- **Exact APC Brand Identity**: Warm saffron gold (`#F5A623`), warm alabaster cream (`#FAF7F2`), deep charcoal (`#2B2620`), and status pill badges.
- **Hardware-Encrypted Auth**: Tokens stored securely in `Expo SecureStore` (no plain text passwords or AsyncStorage).
- **Selfie Verification**: Live front-camera capture for punch-in and punch-out.
- **GPS Office Geofencing**: Validates proximity to the office (120m perimeter with GPS drift buffer), with automatic bypass for approved Work From Home (WFH).
- **Complete Employee Self-Service**:
  - Live IST digital clock & today's punch state.
  - Full Day (`09:30 - 18:30`) vs Second Half (`13:00 - 18:30`) shift punch.
  - Attendance history log with monthly summary cards.
  - Leave application, withdrawal, and team approvals for reporting managers.
  - Work From Home (WFH) application, withdrawal, and manager approvals.
  - Expense Reimbursement claims with camera receipt attachment.
  - MNC itemized monthly Salary Slips (base salary, working days, deductions, overtime, net pay) with share action.
  - Profile photo update, compliance documents, and admin update requests.
- **Super Admin Management**:
  - Executive Dashboard with live attendance counters (Present, Late, Absent, On Leave).
  - Late arrivals feed with photos and reasons.
  - 1-tap approvals for pending leave and WFH requests.
  - Employee directory with search, department filtering, and active/inactive toggles.
  - New employee onboarding with auto-generated ID and temporary password Welcome Card.
  - Employee management: details edit, compliance document upload/delete, password reset, and deletion.
  - Attendance log with manual overrides and CSV export.
  - Reimbursement approval review with admin remarks.
  - Office geofence coordinates and rules configuration.
  - Official company holidays calendar management.
  - Organization audit trail.

---

## 🛠️ Technology Stack

- **Framework**: React Native 0.86 + Expo SDK 57
- **Language**: TypeScript
- **Routing**: Expo Router (file-based navigation with tabs and stacks)
- **Security**: Expo SecureStore
- **Hardware / Device APIs**:
  - `expo-location` (GPS geofencing)
  - `expo-image-picker` (Camera & Photo Library)
  - `expo-sharing` & `expo-file-system` (Report sharing)
- **Icons**: `@expo/vector-icons` (Ionicons) + `lucide-react-native`

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+ recommended)
- Expo Go on physical device (iOS App Store or Google Play Store) or an Android Emulator / iOS Simulator.

### 2. Installation
```bash
cd mobile-app
npm install
```

### 3. Environment Configuration
Copy the example environment file:
```bash
cp .env.example .env
```
Default production backend:
```env
EXPO_PUBLIC_API_URL=https://web-production-f5d6b.up.railway.app/api
```
For local testing with backend running on host:
- **Android Emulator**: `http://10.0.2.2:5000/api`
- **iOS Simulator / Web**: `http://localhost:5000/api`
- **Physical Device over Wi-Fi**: `http://<YOUR_LAN_IP>:5000/api`

*(Note: You can also change the API URL directly inside the mobile login screen without rebuilding!)*

### 4. Start Expo Development Server
```bash
npx expo start
```
This generates an interactive QR code and Expo URL. Open the camera app on your iPhone or the Expo Go app on Android to open the project!

---

## 🤖 Building Android & iOS

The project is preconfigured with `eas.json` for Expo Application Services (EAS).

### Install EAS CLI
```bash
npm install -g eas-cli
```

### Build Android APK (For Direct Device Testing)
```bash
cd mobile-app
eas build -p android --profile preview
```
This produces a downloadable, installable `.apk` file ready to install on any Android phone.

### Build Android Production App Bundle (Google Play)
```bash
cd mobile-app
eas build -p android --profile production
```

### Build iOS Simulator Build
```bash
cd mobile-app
eas build -p ios --profile preview
```

### Build iOS Production Release (Apple App Store)
```bash
cd mobile-app
eas build -p ios --profile production
```
*(Requires active Apple Developer Program account).*

---

## 🔑 Demo Test Credentials

| Role | Employee ID | Password |
|---|---|---|
| **Super Admin** | `SUPERADMIN01` | `Admin@123` |
| **Team Manager** | `KA-MU-95-0001` | `Password@123` |
| **Employee** | `SH-GO-98-0001` | `Password@123` |

*(Convenient quick-fill buttons are provided on the login screen for 1-tap testing).*
