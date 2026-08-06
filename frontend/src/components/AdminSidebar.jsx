import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { TrendingUp, Users, PlusCircle, FileSpreadsheet, Settings, Clock, KeyRound } from 'lucide-react';

export default function AdminSidebar() {
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: TrendingUp },
    { path: '/admin/employees', label: 'All Employees', icon: Users },
    { path: '/admin/employees/new', label: 'Create Employee', icon: PlusCircle },
    { path: '/admin/attendance', label: 'Attendance Log', icon: FileSpreadsheet },
    { path: '/admin/settings/attendance-rules', label: 'Attendance Rules', icon: Settings },
    { path: '/profile/change-password', label: 'Change Password', icon: KeyRound },
    { path: '/admin/audit-log', label: 'Audit Log', icon: Clock }
  ];

  return (
    <aside className="apc-sidebar">
      {navItems.map(item => {
        const IconComponent = item.icon;
        const isActive = currentPath === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`apc-nav-item ${isActive ? 'active' : ''}`}
          >
            <IconComponent size={18} /> {item.label}
          </Link>
        );
      })}
    </aside>
  );
}
