import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import StatusBadge from '../../components/StatusBadge';
import AdminSidebar from '../../components/AdminSidebar';
import { apiFetch } from '../../utils/api';
import { useNavigate } from 'react-router-dom';
import { Users, Clock, AlertTriangle, PlusCircle, Settings, TrendingUp, Calendar, Check, X } from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboard();
    fetchPendingLeaves();
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

  const fetchPendingLeaves = async () => {
    try {
      const res = await apiFetch('/admin/leave-requests?status=pending');
      setPendingLeaves(res.leaveRequests || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdminReviewLeave = async (reqId, action) => {
    setReviewingId(reqId);
    try {
      await apiFetch(`/admin/leave-requests/${reqId}/review`, {
        method: 'POST',
        body: JSON.stringify({ action })
      });
      fetchPendingLeaves();
      fetchDashboard();
    } catch (err) {
      alert("Review failed: " + err.message);
    } finally {
      setReviewingId(null);
    }
  };

  const stats = data?.stats || { totalEmployees: 0, present: 0, late: 0, absent: 0, onLeave: 0 };
  const lateArrivals = data?.lateArrivalsToday || [];
  const trendChart = data?.trendChart || [];
  const pendingLeavesList = (data?.pendingLeaveRequests && data.pendingLeaveRequests.length > 0) ? data.pendingLeaveRequests : pendingLeaves;

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
        <AdminSidebar />

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

          {/* Org-Wide Pending Leave Approvals Section */}
          {pendingLeavesList.length > 0 && (
            <div className="apc-card" style={{ marginBottom: '1.75rem', borderLeft: '4px solid var(--apc-primary)' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={18} color="var(--apc-primary-dark)" /> Pending Leave Requests for Approval ({pendingLeavesList.length})
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                {pendingLeavesList.map(req => {
                  const isWithdrawal = req.status === 'withdrawal_requested';
                  return (
                    <div key={req.id} style={{ padding: '0.85rem', background: 'var(--apc-bg)', border: `1px solid ${isWithdrawal ? 'var(--apc-warning)' : 'var(--apc-border)'}`, borderRadius: 'var(--apc-radius-sm)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <strong>{req.employeeName}</strong>
                            <span style={{ fontSize: '0.78rem', color: 'var(--apc-text-secondary)' }}>({req.department})</span>
                            {isWithdrawal && (
                              <span style={{ fontSize: '0.72rem', background: 'var(--apc-warning-bg)', color: 'var(--apc-warning)', border: '1px solid rgba(226, 163, 59, 0.4)', padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                WITHDRAWAL REQUEST
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.85rem', marginTop: '0.25rem', color: 'var(--apc-primary-dark)', fontWeight: 600 }}>
                            {req.leaveType}: {req.startDate} to {req.endDate}
                          </div>
                          <p style={{ fontSize: '0.8rem', color: 'var(--apc-text-secondary)', marginTop: '0.2rem', margin: '2px 0' }}>
                            <strong>Reason:</strong> {req.reason}
                          </p>
                          {isWithdrawal && req.withdrawReason && (
                            <p style={{ fontSize: '0.8rem', color: 'var(--apc-danger)', margin: '2px 0' }}>
                              <strong>Withdrawal Note:</strong> {req.withdrawReason}
                            </p>
                          )}
                          <span style={{ fontSize: '0.75rem', color: 'var(--apc-text-secondary)', display: 'block', marginTop: '2px' }}>
                            Manager: {req.reportingManagerName || 'Super Admin'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                          {isWithdrawal ? (
                            <>
                              <button
                                onClick={() => handleAdminReviewLeave(req.id, 'approve_withdrawal')}
                                className="apc-btn apc-btn-primary"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}
                                disabled={reviewingId === req.id}
                              >
                                <Check size={14} /> Approve Withdrawal
                              </button>
                              <button
                                onClick={() => handleAdminReviewLeave(req.id, 'reject_withdrawal')}
                                className="apc-btn apc-btn-danger"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}
                                disabled={reviewingId === req.id}
                              >
                                <X size={14} /> Reject Withdrawal
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleAdminReviewLeave(req.id, 'approve')}
                                className="apc-btn apc-btn-primary"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}
                                disabled={reviewingId === req.id}
                              >
                                <Check size={14} /> Approve
                              </button>
                              <button
                                onClick={() => handleAdminReviewLeave(req.id, 'reject')}
                                className="apc-btn apc-btn-danger"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}
                                disabled={reviewingId === req.id}
                              >
                                <X size={14} /> Reject
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="apc-grid-2col" style={{ gap: '1.5rem' }}>
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
