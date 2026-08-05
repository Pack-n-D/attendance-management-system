import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import StatusBadge from '../../components/StatusBadge';
import { apiFetch, exportAttendanceCSV } from '../../utils/api';
import { Download, Search, FileSpreadsheet, Users, PlusCircle, Settings, Clock } from 'lucide-react';

export default function AttendanceLog() {
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLog();
  }, [search, department, status, startDate, endDate]);

  const fetchLog = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (department) params.append('department', department);
      if (status) params.append('status', status);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await apiFetch(`/attendance/log?${params.toString()}`);
      setRecords(res.records);
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
          <a href="/admin/attendance" className="apc-nav-item active">
            <FileSpreadsheet size={18} /> Attendance Log
          </a>
          <a href="/admin/settings/attendance-rules" className="apc-nav-item">
            <Settings size={18} /> Attendance Rules
          </a>
          <a href="/admin/audit-log" className="apc-nav-item">
            <Clock size={18} /> Audit Log
          </a>
        </aside>

        <main className="apc-main-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ fontSize: '1.6rem' }}>Org-Wide Attendance Logs</h1>
              <p style={{ fontSize: '0.88rem', color: 'var(--apc-text-secondary)' }}>Master log of all punches across AP Corporation</p>
            </div>

            <button onClick={() => exportAttendanceCSV()} className="apc-btn apc-btn-secondary">
              <Download size={16} /> Export CSV
            </button>
          </div>

          {/* Filter Bar */}
          <div className="apc-card" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
              <input
                type="text"
                className="apc-input"
                placeholder="Search employee..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />

              <select className="apc-select" value={department} onChange={e => setDepartment(e.target.value)}>
                <option value="">All Departments</option>
                <option value="Creative">Creative</option>
                <option value="Client Servicing">Client Servicing</option>
                <option value="Media Buying">Media Buying</option>
                <option value="Finance">Finance</option>
                <option value="HR">HR</option>
              </select>

              <select className="apc-select" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="on_time">On Time</option>
                <option value="in_buffer">In Buffer</option>
                <option value="late">Late</option>
                <option value="on_leave">On Leave</option>
                <option value="absent">Absent</option>
              </select>

              <input
                type="date"
                className="apc-input"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                placeholder="From Date"
              />

              <input
                type="date"
                className="apc-input"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                placeholder="To Date"
              />
            </div>
          </div>

          {/* Master Log Table */}
          <div className="apc-table-container">
            <table className="apc-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Employee</th>
                  <th>ID</th>
                  <th>Department</th>
                  <th>Punch In</th>
                  <th>Punch Out</th>
                  <th>Status</th>
                  <th>Late Reason</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>Loading logs...</td></tr>
                ) : records.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--apc-text-secondary)' }}>No records match the filter criteria.</td></tr>
                ) : (
                  records.map(r => (
                    <tr key={r.id}>
                      <td><strong>{r.date}</strong></td>
                      <td>{r.employeeName}</td>
                      <td><code style={{ fontWeight: 'bold' }}>{r.employeeId}</code></td>
                      <td>{r.department}</td>
                      <td>{r.punchInTime || '—'}</td>
                      <td>{r.punchOutTime || '—'}</td>
                      <td><StatusBadge status={r.status} /></td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--apc-text-secondary)' }}>{r.lateReason || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </>
  );
}
