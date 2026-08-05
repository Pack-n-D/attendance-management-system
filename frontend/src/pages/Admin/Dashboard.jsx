import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import StatusBadge from '../../components/StatusBadge';
import { apiFetch } from '../../utils/api';
import { useNavigate } from 'react-router-dom';
import { Users, Clock, UserCheck, AlertTriangle, UserMinus, PlusCircle, Settings, FileSpreadsheet, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/admin/dashboard');
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const stats = data?.stats || { totalEmployees: 0, present: 0, late: 0, absent: 0, onLeave: 0 };
  const lateArrivals = data?.lateArrivalsToday || [];
  const trendChart = data?.trendChart || [];

  if (loading) {
    return (
      <>
        <Navbar />
        <div style={{ padding: '3rem', textAlign: 'center' }}>Loading Super Admin Dashboard...</div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="apc-layout-container">
        {/* Admin Sidebar Navigation */}
        <aside className="apc-sidebar">
          <a href="/admin/dashboard" className="apc-nav-item active">
            <TrendingUp size={18} /> Dashboard
          </a>
          <a href="/admin/employees" className="apc-nav-item">
            <Users size={18} /> All Employees
          </a>
          <a href="/admin/employees/new" className="apc-nav-item">
            <PlusCircle size={18} /> Create Employee
          </a>
          <a href="/admin/attendance" className="apc-nav-item">
            <FileSpreadsheet size={18} /> Attendance Log
          </a>
          <a href="/admin/settings/attendance-rules" className="apc-nav-item">
            <Settings size={18} /> Attendance Rules
          </a>
          <a href="/admin/audit-log" className="apc-nav-item">
            <Clock size={18} /> Audit Log
          </a>
        </aside>

        {/* Main Dashboard Content */}
        <main className="apc-main-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ fontSize: '1.6rem' }}>Super Admin Overview</h1>
              <p style={{ fontSize: '0.88rem', color: 'var(--apc-text-secondary)' }}>Today: <strong>{data?.todayDate}</strong></p>
            </div>

            {/* Shortcut Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button onClick={() => navigate('/admin/employees/new')} className="apc-btn apc-btn-primary">
                <PlusCircle size={16} /> Create Employee
              </button>
              <button onClick={() => navigate('/admin/employees')} className="apc-btn apc-btn-secondary">
                <Users size={16} /> All Employees
              </button>
              <button onClick={() => navigate('/admin/settings/attendance-rules')} className="apc-btn apc-btn-secondary">
                <Settings size={16} /> Settings
              </button>
            </div>
          </div>

          {/* Today's KPI Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
            <div className="apc-card" style={{ borderTop: '4px solid var(--apc-success)' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--apc-text-secondary)', fontWeight: 600 }}>PRESENT TODAY</span>
              <h2 style={{ fontSize: '2rem', color: 'var(--apc-success)', marginTop: '0.35rem' }}>{stats.present}</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--apc-text-secondary)' }}>out of {stats.totalEmployees} employees</span>
            </div>

            <div className="apc-card" style={{ borderTop: '4px solid var(--apc-danger)' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--apc-text-secondary)', fontWeight: 600 }}>LATE ARRIVALS</span>
              <h2 style={{ fontSize: '2rem', color: 'var(--apc-danger)', marginTop: '0.35rem' }}>{stats.late}</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--apc-text-secondary)' }}>punched past grace buffer</span>
            </div>

            <div className="apc-card" style={{ borderTop: '4px solid var(--apc-text-secondary)' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--apc-text-secondary)', fontWeight: 600 }}>ABSENT</span>
              <h2 style={{ fontSize: '2rem', color: 'var(--apc-text-primary)', marginTop: '0.35rem' }}>{stats.absent}</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--apc-text-secondary)' }}>not punched yet</span>
            </div>

            <div className="apc-card" style={{ borderTop: '4px solid var(--apc-info)' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--apc-text-secondary)', fontWeight: 600 }}>ON LEAVE</span>
              <h2 style={{ fontSize: '2rem', color: 'var(--apc-info)', marginTop: '0.35rem' }}>{stats.onLeave}</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--apc-text-secondary)' }}>approved leave / holiday</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Late Arrivals Today List */}
            <div className="apc-card">
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={18} color="var(--apc-danger)" /> Late Arrivals Today ({lateArrivals.length})
              </h3>

              {lateArrivals.length === 0 ? (
                <p style={{ fontSize: '0.88rem', color: 'var(--apc-text-secondary)', padding: '1rem 0' }}>
                  No late arrivals reported today!
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {lateArrivals.map(item => (
                    <div key={item.id} style={{ padding: '0.75rem', background: 'var(--apc-bg)', border: '1px solid var(--apc-border)', borderRadius: 'var(--apc-radius-sm)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong>{item.employeeName}</strong>
                          <span style={{ fontSize: '0.78rem', color: 'var(--apc-text-secondary)', marginLeft: '6px' }}>({item.department})</span>
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--apc-danger)' }}>{item.punchInTime}</span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--apc-text-secondary)', marginTop: '0.25rem' }}>
                        <strong>Reason:</strong> {item.lateReason}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 30-Day Attendance Trend Visualizer */}
            <div className="apc-card">
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={18} color="var(--apc-primary-dark)" /> 30-Day Attendance Trend
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                {trendChart.slice(-10).map(t => (
                  <div key={t.date} style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ width: '80px', color: 'var(--apc-text-secondary)', fontFamily: 'monospace' }}>{t.date}</span>
                    <div style={{ flex: 1, display: 'flex', height: '18px', borderRadius: '4px', overflow: 'hidden', background: 'var(--apc-border)' }}>
                      <div style={{ width: `${(t.onTime / (stats.totalEmployees || 1)) * 100}%`, background: 'var(--apc-success)' }} title={`On Time: ${t.onTime}`} />
                      <div style={{ width: `${(t.late / (stats.totalEmployees || 1)) * 100}%`, background: 'var(--apc-danger)' }} title={`Late: ${t.late}`} />
                    </div>
                    <span style={{ fontSize: '0.78rem', width: '60px', textAlign: 'right' }}>{t.onTime} On Time</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
