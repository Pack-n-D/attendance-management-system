import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import StatusBadge from '../../components/StatusBadge';
import AdminSidebar from '../../components/AdminSidebar';
import { apiFetch, exportAttendanceCSV } from '../../utils/api';
import { DEPARTMENTS } from '../../utils/constants';
import { Download, Calendar, Check, X, Clock } from 'lucide-react';

export default function AttendanceLog() {
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' or 'leaves'

  // Attendance Log state
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Leave Requests state
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveStatusFilter, setLeaveStatusFilter] = useState('');
  const [reviewingId, setReviewingId] = useState(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeTab === 'attendance') {
      fetchLog();
    } else {
      fetchLeaveRequests();
    }
  }, [activeTab, search, department, status, startDate, endDate, leaveStatusFilter]);

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

  const fetchLeaveRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (leaveStatusFilter) params.append('status', leaveStatusFilter);

      const res = await apiFetch(`/admin/leave-requests?${params.toString()}`);
      setLeaveRequests(res.leaveRequests || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminReviewLeave = async (reqId, action) => {
    setReviewingId(reqId);
    try {
      await apiFetch(`/admin/leave-requests/${reqId}/review`, {
        method: 'POST',
        body: JSON.stringify({ action })
      });
      fetchLeaveRequests();
    } catch (err) {
      alert("Review failed: " + err.message);
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <>
      <Navbar />
      <div className="apc-layout-container">
        <AdminSidebar />

        <main className="apc-main-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ fontSize: '1.6rem' }}>Org-Wide Attendance & Leave Logs</h1>
              <p style={{ fontSize: '0.88rem', color: 'var(--apc-text-secondary)' }}>Master records & leave approvals across AP Corporation</p>
            </div>

            <button onClick={() => exportAttendanceCSV()} className="apc-btn apc-btn-secondary">
              <Download size={16} /> Export CSV
            </button>
          </div>

          {/* Navigation Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--apc-border)' }}>
            <button
              onClick={() => setActiveTab('attendance')}
              className={`apc-btn ${activeTab === 'attendance' ? 'apc-btn-primary' : 'apc-btn-secondary'}`}
              style={{ borderRadius: '6px 6px 0 0', borderBottom: 'none' }}
            >
              <Clock size={16} /> Daily Attendance Logs
            </button>
            <button
              onClick={() => setActiveTab('leaves')}
              className={`apc-btn ${activeTab === 'leaves' ? 'apc-btn-primary' : 'apc-btn-secondary'}`}
              style={{ borderRadius: '6px 6px 0 0', borderBottom: 'none' }}
            >
              <Calendar size={16} /> Leave Approvals & History
            </button>
          </div>

          {/* TAB 1: ATTENDANCE LOG */}
          {activeTab === 'attendance' && (
            <>
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
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
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
            </>
          )}

          {/* TAB 2: LEAVE REQUESTS */}
          {activeTab === 'leaves' && (
            <>
              <div className="apc-card" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    className="apc-input"
                    style={{ maxWidth: '240px' }}
                    placeholder="Search employee..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />

                  <select className="apc-select" style={{ maxWidth: '180px' }} value={leaveStatusFilter} onChange={e => setLeaveStatusFilter(e.target.value)}>
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div className="apc-table-container">
                <table className="apc-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>Leave Type</th>
                      <th>Dates</th>
                      <th>Reason</th>
                      <th>Assigned Manager</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>Loading leave requests...</td></tr>
                    ) : leaveRequests.length === 0 ? (
                      <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--apc-text-secondary)' }}>No leave requests found.</td></tr>
                    ) : (
                      leaveRequests.map(r => (
                        <tr key={r.id}>
                          <td><strong>{r.employeeName}</strong></td>
                          <td>{r.department}</td>
                          <td><strong style={{ color: 'var(--apc-primary-dark)' }}>{r.leaveType}</strong></td>
                          <td>{r.startDate} to {r.endDate}</td>
                          <td style={{ fontSize: '0.85rem', color: 'var(--apc-text-secondary)' }}>{r.reason}</td>
                          <td>{r.reportingManagerName || 'Super Admin'}</td>
                          <td>
                            <span className={`apc-badge apc-badge-${r.status === 'approved' ? 'on_time' : r.status === 'rejected' ? 'late' : 'in_buffer'}`} style={{ textTransform: 'capitalize' }}>
                              {r.status}
                            </span>
                          </td>
                          <td>
                            {r.status === 'pending' ? (
                              <div style={{ display: 'flex', gap: '0.35rem' }}>
                                <button
                                  onClick={() => handleAdminReviewLeave(r.id, 'approve')}
                                  className="apc-btn apc-btn-primary"
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                  disabled={reviewingId === r.id}
                                >
                                  <Check size={12} /> Approve
                                </button>
                                <button
                                  onClick={() => handleAdminReviewLeave(r.id, 'reject')}
                                  className="apc-btn apc-btn-danger"
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                  disabled={reviewingId === r.id}
                                >
                                  <X size={12} /> Reject
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.8rem', color: 'var(--apc-text-secondary)' }}>—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}
