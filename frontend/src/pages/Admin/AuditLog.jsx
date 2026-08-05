import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { apiFetch } from '../../utils/api';
import { Clock, ShieldCheck, Users, PlusCircle, FileSpreadsheet, Settings, Activity } from 'lucide-react';

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/admin/audit-log');
      setLogs(res.auditLogs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="apc-layout-container">
        <aside className="apc-sidebar">
          <a href="/admin/dashboard" className="apc-nav-item">
            <Clock size={18} /> Dashboard
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
          <a href="/admin/audit-log" className="apc-nav-item active">
            <Clock size={18} /> Audit Log
          </a>
        </aside>

        <main className="apc-main-content" style={{ maxWidth: '900px' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h1 style={{ fontSize: '1.6rem' }}>System Audit Trail</h1>
            <p style={{ fontSize: '0.88rem', color: 'var(--apc-text-secondary)' }}>
              Read-only log of all administrative actions, credential resets, and rule updates.
            </p>
          </div>

          <div className="apc-card">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>Loading audit logs...</div>
            ) : logs.length === 0 ? (
              <p style={{ color: 'var(--apc-text-secondary)', padding: '1rem' }}>No audit log entries recorded yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {logs.map(log => (
                  <div
                    key={log.id}
                    style={{
                      padding: '0.85rem 1rem',
                      border: '1px solid var(--apc-border)',
                      borderRadius: 'var(--apc-radius-sm)',
                      background: 'var(--apc-surface)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.5rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Activity size={18} color="var(--apc-primary-dark)" />
                      <div>
                        <strong style={{ fontSize: '0.95rem' }}>{log.action}</strong>
                        <span style={{ fontSize: '0.8rem', color: 'var(--apc-text-secondary)', display: 'block' }}>
                          Actor: <strong>{log.actorName}</strong> ({log.actorId}) · Target: {log.targetType} {log.targetId ? `(${log.targetId})` : ''}
                        </span>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--apc-text-secondary)', fontFamily: 'monospace' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
