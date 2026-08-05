import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Shared Pages
import Login from './pages/Shared/Login';

// Employee Pages
import Home from './pages/Employee/Home';
import AttendanceHistory from './pages/Employee/AttendanceHistory';
import Profile from './pages/Employee/Profile';
import ChangePassword from './pages/Employee/ChangePassword';

// Admin Pages
import Dashboard from './pages/Admin/Dashboard';
import EmployeeList from './pages/Admin/EmployeeList';
import CreateEmployee from './pages/Admin/CreateEmployee';
import EmployeeProfile from './pages/Admin/EmployeeProfile';
import AttendanceLog from './pages/Admin/AttendanceLog';
import AttendanceSettings from './pages/Admin/AttendanceSettings';
import AuditLog from './pages/Admin/AuditLog';

// Protected Route Wrapper
function ProtectedRoute({ children, allowedRoles }) {
  const { user, token } = useAuth();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // Handle forced password change redirect
  const isChangePasswordPage = window.location.hash.toLowerCase().includes('/profile/change');
  if (user.mustChangePassword && !isChangePasswordPage) {
    return <Navigate to="/profile/change-password?forced=1" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'super_admin' ? '/admin/dashboard' : '/home'} replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public entry */}
          <Route path="/login" element={<Login />} />

          {/* Employee Portal Routes */}
          <Route
            path="/home"
            element={
              <ProtectedRoute allowedRoles={['employee', 'super_admin']}>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance"
            element={
              <ProtectedRoute allowedRoles={['employee', 'super_admin']}>
                <AttendanceHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute allowedRoles={['employee', 'super_admin']}>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/change-password"
            element={
              <ProtectedRoute allowedRoles={['employee', 'super_admin']}>
                <ChangePassword />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/change%20password"
            element={
              <ProtectedRoute allowedRoles={['employee', 'super_admin']}>
                <ChangePassword />
              </ProtectedRoute>
            }
          />

          {/* Super Admin Portal Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/employees"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <EmployeeList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/employees/new"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <CreateEmployee />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/employees/:id"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <EmployeeProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/attendance"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <AttendanceLog />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings/attendance-rules"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <AttendanceSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit-log"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <AuditLog />
              </ProtectedRoute>
            }
          />

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
