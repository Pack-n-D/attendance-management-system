import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../../components/Navbar';
import StatusBadge from '../../components/StatusBadge';
import { apiFetch } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Camera, CheckCircle2, Clock, MapPin, AlertTriangle, RefreshCw, Send, Calendar, UserCheck, Check, X, FileText } from 'lucide-react';

export default function Home() {
  const { user } = useAuth();
  const [todayData, setTodayData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Camera stream state
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [lateReason, setLateReason] = useState('');
  const [requiresReason, setRequiresReason] = useState(false);
  const [punchType, setPunchType] = useState('in'); // 'in' or 'out'
  const [submitting, setSubmitting] = useState(false);
  const [confirmationMsg, setConfirmationMsg] = useState(null);

  // Leave Management state
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveType, setLeaveType] = useState('Paid Leave');
  const [leaveReason, setLeaveReason] = useState('');
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [leaveMsg, setLeaveMsg] = useState('');

  const [myLeaveRequests, setMyLeaveRequests] = useState([]);
  const [managedRequests, setManagedRequests] = useState([]);
  const [reviewingId, setReviewingId] = useState(null);

  // Leave Withdrawal state
  const [withdrawModalReq, setWithdrawModalReq] = useState(null);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Live ticking clock state
  const [liveTime, setLiveTime] = useState(new Date());

  // MNC Portal state
  const [activePortalTab, setActivePortalTab] = useState('dashboard'); // 'dashboard' or 'salary'
  const [salaryMonth, setSalaryMonth] = useState(new Date().toISOString().slice(0, 7));
  const [salarySlip, setSalarySlip] = useState(null);
  const [loadingSalary, setLoadingSalary] = useState(false);
  const [profileData, setProfileData] = useState(null);

  useEffect(() => {
    fetchTodayStatus();
    fetchLeaveData();
    fetchProfile();

    const timer = setInterval(() => {
      setLiveTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await apiFetch('/employee/profile');
      if (res.employee) setProfileData(res.employee);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMySalarySlip = async (mStr) => {
    setLoadingSalary(true);
    try {
      const res = await apiFetch(`/employee/salary-slips?month=${mStr}`);
      setSalarySlip(res.salarySlip);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSalary(false);
    }
  };

  useEffect(() => {
    if (activePortalTab === 'salary') {
      fetchMySalarySlip(salaryMonth);
    }
  }, [activePortalTab, salaryMonth]);

  const fetchTodayStatus = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/attendance/today-status');
      setTodayData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveData = async () => {
    try {
      const [myRes, managedRes] = await Promise.all([
        apiFetch('/employee/leave-requests').catch(() => ({ leaveRequests: [] })),
        apiFetch('/employee/managed-leave-requests').catch(() => ({ leaveRequests: [] }))
      ]);
      setMyLeaveRequests(myRes.leaveRequests || []);
      setManagedRequests(managedRes.leaveRequests || []);
    } catch (err) {
      console.error(err);
    }
  };

  const startCamera = async (type) => {
    setPunchType(type);
    setCapturedPhoto(null);
    setShowCameraModal(true);
    setError('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn("Camera stream unavailable, using canvas fallback simulation:", err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCameraModal(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = 400;
    canvas.height = 300;

    if (video && video.srcObject) {
      ctx.drawImage(video, 0, 0, 400, 300);
    } else {
      ctx.fillStyle = '#2B2620';
      ctx.fillRect(0, 0, 400, 300);
      ctx.fillStyle = '#F5A623';
      ctx.font = 'bold 20px Inter';
      ctx.fillText('APC Camera Punch Selfie', 80, 150);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '14px Inter';
      ctx.fillText(new Date().toLocaleTimeString(), 140, 180);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedPhoto(dataUrl);
  };

  const handlePunchSubmit = async () => {
    if (!capturedPhoto) return;
    setSubmitting(true);
    setError('');

    try {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      const clientTimeStr = `${h}:${m}:${s}`;

      const endpoint = punchType === 'in' ? '/attendance/punch-in' : '/attendance/punch-out';
      const body = {
        photo: capturedPhoto,
        lateReason: lateReason,
        clientTime: clientTimeStr
      };

      const res = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(body)
      });

      setConfirmationMsg({
        time: res.recordedTime,
        status: res.status || (todayData?.record?.status),
        message: res.message
      });

      stopCamera();
      fetchTodayStatus();
    } catch (err) {
      if (err.message.includes('Late reason is required')) {
        setRequiresReason(true);
      }
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    setSubmittingLeave(true);
    setLeaveMsg('');
    try {
      const res = await apiFetch('/employee/leave-requests', {
        method: 'POST',
        body: JSON.stringify({
          startDate: leaveStartDate,
          endDate: leaveEndDate,
          leaveType,
          reason: leaveReason
        })
      });

      setLeaveMsg(res.message);
      setLeaveStartDate('');
      setLeaveEndDate('');
      setLeaveReason('');
      setShowLeaveModal(false);
      fetchLeaveData();
    } catch (err) {
      alert("Failed to submit leave request: " + err.message);
    } finally {
      setSubmittingLeave(false);
    }
  };

  const handleReviewLeave = async (reqId, action) => {
    setReviewingId(reqId);
    try {
      await apiFetch(`/employee/leave-requests/${reqId}/review`, {
        method: 'POST',
        body: JSON.stringify({ action })
      });
      fetchLeaveData();
      fetchTodayStatus();
    } catch (err) {
      alert("Review failed: " + err.message);
    } finally {
      setReviewingId(null);
    }
  };

  const handleRequestWithdraw = async (e) => {
    e.preventDefault();
    if (!withdrawModalReq) return;
    setSubmittingWithdraw(true);
    try {
      const res = await apiFetch(`/employee/leave-requests/${withdrawModalReq.id}/withdraw`, {
        method: 'POST',
        body: JSON.stringify({ reason: withdrawReason })
      });
      alert(res.message);
      setWithdrawModalReq(null);
      setWithdrawReason('');
      fetchLeaveData();
      fetchTodayStatus();
    } catch (err) {
      alert("Withdrawal request failed: " + err.message);
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  const handleCancelPendingLeave = async (reqId) => {
    if (!window.confirm("Are you sure you want to cancel this pending leave request?")) return;
    try {
      const res = await apiFetch(`/employee/leave-requests/${reqId}/withdraw`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Cancelled by employee' })
      });
      alert(res.message);
      fetchLeaveData();
      fetchTodayStatus();
    } catch (err) {
      alert("Failed to cancel leave request: " + err.message);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div style={{ padding: '3rem', textAlign: 'center' }}>Loading today's status...</div>
      </>
    );
  }

  const record = todayData?.record;
  const isPunchedIn = record && record.punchInTime;
  const isPunchedOut = record && record.punchOutTime;
  const pendingManagedRequests = managedRequests.filter(r => r.status === 'pending');

  return (
    <>
      <Navbar />
      <main className="apc-main-content" style={{ maxWidth: '680px' }}>
        
        {/* User Greeting & Action Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem' }}>Welcome, {user?.fullName || user?.firstName}!</h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--apc-text-secondary)' }}>
              ID: <strong style={{ fontFamily: 'monospace' }}>{user?.id}</strong> · {user?.department} ({user?.designation})
            </p>
          </div>

          <button onClick={() => setShowLeaveModal(true)} className="apc-btn apc-btn-secondary" style={{ padding: '0.5rem 0.85rem', fontSize: '0.85rem' }}>
            <Calendar size={16} /> Apply for Leave
          </button>
        </div>

        {/* MNC Navigation Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--apc-border)' }}>
          <button
            onClick={() => setActivePortalTab('dashboard')}
            className={`apc-btn ${activePortalTab === 'dashboard' ? 'apc-btn-primary' : 'apc-btn-secondary'}`}
            style={{ borderRadius: '6px 6px 0 0', borderBottom: 'none', padding: '0.5rem 1rem' }}
          >
            <UserCheck size={16} /> Portal Dashboard
          </button>
          <button
            onClick={() => setActivePortalTab('salary')}
            className={`apc-btn ${activePortalTab === 'salary' ? 'apc-btn-primary' : 'apc-btn-secondary'}`}
            style={{ borderRadius: '6px 6px 0 0', borderBottom: 'none', padding: '0.5rem 1rem' }}
          >
            <FileText size={16} /> My Salary Slips
          </button>
        </div>

        {activePortalTab === 'dashboard' && (
          <>
            {/* MNC Leave Balances & C-Off Widget */}
            <div className="apc-card" style={{ marginBottom: '1.5rem', background: 'var(--apc-surface)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                <h3 style={{ fontSize: '1.05rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar size={18} color="var(--apc-primary-dark)" /> MNC Leave & C-Off Balances
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--apc-text-secondary)' }}>Updated Real-Time</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
                <div style={{ padding: '0.75rem', background: 'var(--apc-bg)', borderRadius: 'var(--apc-radius-sm)', border: '1px solid var(--apc-border)', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--apc-text-secondary)', display: 'block' }}>CASUAL LEAVE</span>
                  <strong style={{ fontSize: '1.3rem', color: 'var(--apc-text-primary)' }}>{profileData?.casualLeaveBalance ?? user?.casualLeaveBalance ?? 12}</strong>
                  <span style={{ fontSize: '0.7rem', color: 'var(--apc-text-secondary)', display: 'block' }}>Days Remaining</span>
                </div>

                <div style={{ padding: '0.75rem', background: 'var(--apc-bg)', borderRadius: 'var(--apc-radius-sm)', border: '1px solid var(--apc-border)', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--apc-text-secondary)', display: 'block' }}>SICK LEAVE</span>
                  <strong style={{ fontSize: '1.3rem', color: 'var(--apc-text-primary)' }}>{profileData?.sickLeaveBalance ?? user?.sickLeaveBalance ?? 12}</strong>
                  <span style={{ fontSize: '0.7rem', color: 'var(--apc-text-secondary)', display: 'block' }}>Days Remaining</span>
                </div>

                <div style={{ padding: '0.75rem', background: 'var(--apc-bg)', borderRadius: 'var(--apc-radius-sm)', border: '1px solid var(--apc-border)', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--apc-text-secondary)', display: 'block' }}>PAID LEAVE</span>
                  <strong style={{ fontSize: '1.3rem', color: 'var(--apc-text-primary)' }}>{profileData?.paidLeaveBalance ?? user?.paidLeaveBalance ?? 15}</strong>
                  <span style={{ fontSize: '0.7rem', color: 'var(--apc-text-secondary)', display: 'block' }}>Days Remaining</span>
                </div>

                <div style={{ padding: '0.75rem', background: 'linear-gradient(135deg, rgba(46, 158, 91, 0.12) 0%, rgba(30, 120, 65, 0.04) 100%)', borderRadius: 'var(--apc-radius-sm)', border: '1px solid rgba(46, 158, 91, 0.3)', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--apc-success)', display: 'block', fontWeight: 600 }}>C-OFF BALANCE</span>
                  <strong style={{ fontSize: '1.3rem', color: 'var(--apc-success)' }}>{profileData?.coffBalance ?? user?.coffBalance ?? 0}</strong>
                  <span style={{ fontSize: '0.7rem', color: 'var(--apc-text-secondary)', display: 'block' }}>Holiday Earned</span>
                </div>
              </div>
            </div>

        {/* Live Digital Clock Widget */}
        <div
          className="apc-card"
          style={{
            textAlign: 'center',
            padding: '1rem',
            marginBottom: '1rem',
            background: 'linear-gradient(135deg, rgba(245, 166, 35, 0.08) 0%, rgba(200, 120, 20, 0.02) 100%)',
            border: '1px solid rgba(245, 166, 35, 0.25)'
          }}
        >
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--apc-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
            <Clock size={15} color="var(--apc-primary-dark)" /> LIVE SYSTEM TIME (IST)
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--apc-text-primary)', marginTop: '0.2rem' }}>
            {liveTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--apc-text-secondary)', marginTop: '0.1rem' }}>
            {liveTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* Today's Status Banner Card */}
        <div className="apc-card apc-card-elevated" style={{ textAlign: 'center', padding: '1.75rem 1.5rem', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--apc-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            TODAY'S ATTENDANCE STATUS
          </span>

          <div style={{ marginTop: '0.75rem', marginBottom: '1rem' }}>
            {isPunchedOut ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <StatusBadge status={record.status} />
                <h2 style={{ fontSize: '1.3rem' }}>Day Completed</h2>
                <p style={{ fontSize: '0.88rem', color: 'var(--apc-text-secondary)' }}>
                  Punched In: <strong>{record.punchInTime}</strong> · Punched Out: <strong>{record.punchOutTime}</strong>
                </p>
              </div>
            ) : isPunchedIn ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <StatusBadge status={record.status} />
                <h2 style={{ fontSize: '1.3rem' }}>Punched In at {record.punchInTime}</h2>
                <p style={{ fontSize: '0.88rem', color: 'var(--apc-text-secondary)' }}>
                  Don't forget to punch out when leaving!
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <StatusBadge status="not_punched" />
                <h2 style={{ fontSize: '1.3rem' }}>You Haven't Punched In Today</h2>
                <p style={{ fontSize: '0.88rem', color: 'var(--apc-text-secondary)' }}>
                  Ideal Punch-In: <strong>{todayData?.rule?.idealPunchInTime} AM</strong> ({todayData?.rule?.bufferMinutesIn} min grace buffer)
                </p>
              </div>
            )}
          </div>

          {/* Primary Big Touch Action Button */}
          {!isPunchedOut && (
            <div style={{ marginTop: '1.25rem' }}>
              {!isPunchedIn ? (
                <button
                  onClick={() => startCamera('in')}
                  className="apc-btn apc-btn-primary apc-btn-lg apc-btn-block"
                  style={{
                    padding: '1.1rem',
                    fontSize: '1.15rem',
                    boxShadow: '0 4px 14px rgba(245, 166, 35, 0.45)'
                  }}
                >
                  <Camera size={24} /> PUNCH IN NOW
                </button>
              ) : (
                <button
                  onClick={() => startCamera('out')}
                  className="apc-btn apc-btn-secondary apc-btn-lg apc-btn-block"
                  style={{
                    padding: '1.1rem',
                    fontSize: '1.15rem',
                    borderColor: 'var(--apc-primary-dark)'
                  }}
                >
                  <Clock size={24} /> PUNCH OUT
                </button>
              )}
            </div>
          )}
        </div>

        {/* Confirmation Message */}
        {confirmationMsg && (
          <div
            className="apc-card"
            style={{
              backgroundColor: 'var(--apc-success-bg)',
              border: '1px solid rgba(46, 158, 91, 0.4)',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '1rem'
            }}
          >
            <CheckCircle2 size={28} color="var(--apc-success)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h4 style={{ color: 'var(--apc-success)', fontSize: '1.1rem' }}>Punch Recorded Server-Side</h4>
              <p style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>{confirmationMsg.message}</p>
            </div>
          </div>
        )}

        {leaveMsg && (
          <div className="apc-card" style={{ background: 'var(--apc-primary-tint)', border: '1px solid var(--apc-primary)', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--apc-primary-dark)', fontWeight: 600 }}>{leaveMsg}</p>
          </div>
        )}

        {/* REPORTING MANAGER SECTION: Direct Reports Leave Requests */}
        {managedRequests.length > 0 && (
          <div className="apc-card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--apc-primary)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserCheck size={18} color="var(--apc-primary-dark)" /> Direct Reports Leave Requests ({pendingManagedRequests.length} Pending)
            </h3>

            {managedRequests.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--apc-text-secondary)' }}>No leave requests submitted by direct reports.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {managedRequests.map(req => (
                  <div key={req.id} style={{ padding: '0.85rem', background: 'var(--apc-bg)', border: '1px solid var(--apc-border)', borderRadius: 'var(--apc-radius-sm)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <strong>{req.employeeName}</strong>
                        <span style={{ fontSize: '0.78rem', color: 'var(--apc-text-secondary)', marginLeft: '6px' }}>({req.department})</span>
                        <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--apc-primary-dark)' }}>{req.leaveType}</span>: {req.startDate} to {req.endDate}
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--apc-text-secondary)', marginTop: '0.25rem' }}>
                          <strong>Reason:</strong> {req.reason}
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {req.status === 'withdrawal_requested' ? (
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => handleReviewLeave(req.id, 'approve_withdrawal')}
                              className="apc-btn apc-btn-primary"
                              style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem' }}
                              disabled={reviewingId === req.id}
                            >
                              <Check size={14} /> Approve Withdrawal
                            </button>
                            <button
                              onClick={() => handleReviewLeave(req.id, 'reject_withdrawal')}
                              className="apc-btn apc-btn-danger"
                              style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem' }}
                              disabled={reviewingId === req.id}
                            >
                              <X size={14} /> Reject Withdrawal
                            </button>
                          </div>
                        ) : req.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => handleReviewLeave(req.id, 'approve')}
                              className="apc-btn apc-btn-primary"
                              style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem' }}
                              disabled={reviewingId === req.id}
                            >
                              <Check size={14} /> Approve
                            </button>
                            <button
                              onClick={() => handleReviewLeave(req.id, 'reject')}
                              className="apc-btn apc-btn-danger"
                              style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem' }}
                              disabled={reviewingId === req.id}
                            >
                              <X size={14} /> Reject
                            </button>
                          </>
                        ) : (
                          <StatusBadge status={req.status} />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MY SUBMITTED LEAVE REQUESTS HISTORY */}
        {myLeaveRequests.length > 0 && (
          <div className="apc-card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.05rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={16} color="var(--apc-text-secondary)" /> My Submitted Leave Requests
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {myLeaveRequests.slice(0, 10).map(req => (
                <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.85rem', background: 'var(--apc-surface)', borderRadius: '4px', border: '1px solid var(--apc-border)', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{req.leaveType}</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--apc-text-secondary)', marginLeft: '8px' }}>({req.startDate} to {req.endDate})</span>
                    <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--apc-text-secondary)' }}>
                      Manager: {req.reportingManagerName || 'Super Admin'} {req.withdrawReason ? `· Withdrawal Note: "${req.withdrawReason}"` : ''}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <StatusBadge status={req.status} />
                    {req.status === 'approved' && (
                      <button
                        onClick={() => { setWithdrawModalReq(req); setWithdrawReason(''); }}
                        className="apc-btn apc-btn-secondary"
                        style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                      >
                        Request Withdrawal
                      </button>
                    )}
                    {req.status === 'pending' && (
                      <button
                        onClick={() => handleCancelPendingLeave(req.id)}
                        className="apc-btn apc-btn-danger"
                        style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                      >
                        Cancel Request
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REQUEST LEAVE WITHDRAWAL MODAL */}
        {withdrawModalReq && (
          <div className="apc-modal-overlay">
            <div className="apc-modal" style={{ maxWidth: '440px' }}>
              <h3>Request Leave Withdrawal</h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--apc-text-secondary)', margin: '0.5rem 0 1rem 0' }}>
                Requesting to cancel approved <strong>{withdrawModalReq.leaveType}</strong> ({withdrawModalReq.startDate} to {withdrawModalReq.endDate}). This request will go to <strong>{withdrawModalReq.reportingManagerName || 'Super Admin'}</strong> for approval.
              </p>

              <form onSubmit={handleRequestWithdraw}>
                <div className="apc-form-group">
                  <label htmlFor="withdrawReasonInput">Emergency / Withdrawal Reason <span className="required">*</span></label>
                  <textarea
                    id="withdrawReasonInput"
                    className="apc-textarea"
                    rows={3}
                    placeholder="e.g. Returned from travel early / urgent work requirement"
                    value={withdrawReason}
                    onChange={e => setWithdrawReason(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                  <button type="button" onClick={() => setWithdrawModalReq(null)} className="apc-btn apc-btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="apc-btn apc-btn-primary" disabled={submittingWithdraw}>
                    {submittingWithdraw ? 'Submitting...' : 'Submit Withdrawal Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        </>
        )}

        {/* MY SALARY SLIPS TAB VIEW */}
        {activePortalTab === 'salary' && (
          <div className="apc-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', margin: 0 }}>My Monthly Salary Slips</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--apc-text-secondary)', margin: '2px 0 0 0' }}>
                  Calculated automatically based on your punches, overtime, and approved leaves.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input
                  type="month"
                  className="apc-input"
                  style={{ width: 'auto', padding: '0.35rem 0.65rem' }}
                  value={salaryMonth}
                  onChange={e => setSalaryMonth(e.target.value)}
                />
                <button onClick={() => window.print()} className="apc-btn apc-btn-secondary" style={{ padding: '0.4rem 0.85rem' }}>
                  <FileText size={15} /> Print Payslip
                </button>
              </div>
            </div>

            {loadingSalary ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>Loading payslip breakdown...</div>
            ) : salarySlip ? (
              <div
                style={{
                  border: '2px solid var(--apc-border)',
                  borderRadius: 'var(--apc-radius-md)',
                  padding: '1.5rem',
                  background: '#FFFFFF',
                  color: '#1A1612'
                }}
              >
                {/* MNC Payslip Header */}
                <div style={{ borderBottom: '2px solid var(--apc-primary)', paddingBottom: '1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h2 style={{ color: 'var(--apc-primary-dark)', fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>
                      AP CORPORATION PRIVATE LIMITED
                    </h2>
                    <span style={{ fontSize: '0.8rem', color: 'var(--apc-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      EMPLOYEE SALARY SLIP — {salarySlip.month}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, background: 'var(--apc-primary-tint)', padding: '0.25rem 0.6rem', borderRadius: '4px', border: '1px solid var(--apc-primary)' }}>
                      CONFIRMED PAYSLIP
                    </span>
                  </div>
                </div>

                {/* Employee Info Grid */}
                <div className="apc-payslip-meta-grid" style={{ padding: '0.85rem', background: 'var(--apc-bg)', borderRadius: 'var(--apc-radius-sm)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                  <div><strong>Employee ID:</strong> <br/><span style={{ fontFamily: 'monospace' }}>{user?.id}</span></div>
                  <div><strong>Employee Name:</strong> <br/>{user?.fullName || profileData?.fullName}</div>
                  <div><strong>Department:</strong> <br/>{user?.department}</div>
                  <div><strong>Designation:</strong> <br/>{user?.designation}</div>
                </div>

                {/* Attendance Summary Grid */}
                <h4 style={{ fontSize: '0.95rem', color: 'var(--apc-text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.5px' }}>
                  ATTENDANCE & OVERTIME METRICS
                </h4>
                <div className="apc-payslip-metrics-grid" style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
                  <div style={{ padding: '0.65rem', background: 'var(--apc-surface)', borderRadius: '4px', border: '1px solid var(--apc-border)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--apc-text-secondary)', display: 'block' }}>WORKING DAYS</span>
                    <strong style={{ fontSize: '1.1rem' }}>{salarySlip.workingDays}</strong>
                  </div>
                  <div style={{ padding: '0.65rem', background: 'var(--apc-surface)', borderRadius: '4px', border: '1px solid var(--apc-border)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--apc-text-secondary)', display: 'block' }}>PRESENT DAYS</span>
                    <strong style={{ fontSize: '1.1rem', color: 'var(--apc-success)' }}>{salarySlip.presentDays}</strong>
                  </div>
                  <div style={{ padding: '0.65rem', background: 'var(--apc-surface)', borderRadius: '4px', border: '1px solid var(--apc-border)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--apc-text-secondary)', display: 'block' }}>HALF DAYS</span>
                    <strong style={{ fontSize: '1.1rem', color: 'var(--apc-warning)' }}>{salarySlip.halfDays}</strong>
                  </div>
                  <div style={{ padding: '0.65rem', background: 'var(--apc-surface)', borderRadius: '4px', border: '1px solid var(--apc-border)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--apc-text-secondary)', display: 'block' }}>PAID LEAVES</span>
                    <strong style={{ fontSize: '1.1rem' }}>{salarySlip.paidLeaves}</strong>
                  </div>
                  <div style={{ padding: '0.65rem', background: 'var(--apc-surface)', borderRadius: '4px', border: '1px solid var(--apc-border)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--apc-text-secondary)', display: 'block' }}>OVERTIME HOURS</span>
                    <strong style={{ fontSize: '1.1rem', color: 'var(--apc-primary-dark)' }}>{salarySlip.overtimeHours} hrs</strong>
                  </div>
                </div>

                {/* Financial Table */}
                <h4 style={{ fontSize: '0.95rem', color: 'var(--apc-text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.5px' }}>
                  FINANCIAL BREAKDOWN (INR)
                </h4>
                <div className="apc-table-container" style={{ marginBottom: '1.25rem' }}>
                  <table className="apc-table" style={{ fontSize: '0.88rem' }}>
                    <thead>
                      <tr>
                        <th>EARNINGS ITEM</th>
                        <th style={{ textAlign: 'right' }}>AMOUNT (₹)</th>
                        <th>DEDUCTIONS ITEM</th>
                        <th style={{ textAlign: 'right' }}>AMOUNT (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Base Monthly Salary</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{salarySlip.baseSalary.toLocaleString('en-IN')}</td>
                        <td>Unpaid Absence ({salarySlip.unpaidAbsentDays} days)</td>
                        <td style={{ textAlign: 'right', color: 'var(--apc-danger)', fontWeight: 600 }}>- ₹{salarySlip.unpaidDeductions.toLocaleString('en-IN')}</td>
                      </tr>
                      <tr>
                        <td>Overtime Pay ({salarySlip.overtimeHours} hrs @ 1.5x)</td>
                        <td style={{ textAlign: 'right', color: 'var(--apc-success)', fontWeight: 600 }}>+ ₹{salarySlip.overtimePay.toLocaleString('en-IN')}</td>
                        <td>Taxes / Statutory</td>
                        <td style={{ textAlign: 'right' }}>₹0.00</td>
                      </tr>
                      <tr style={{ background: 'var(--apc-bg)', fontWeight: 'bold' }}>
                        <td>GROSS EARNINGS</td>
                        <td style={{ textAlign: 'right', color: 'var(--apc-primary-dark)' }}>₹{salarySlip.grossSalary.toLocaleString('en-IN')}</td>
                        <td>TOTAL DEDUCTIONS</td>
                        <td style={{ textAlign: 'right', color: 'var(--apc-danger)' }}>- ₹{salarySlip.unpaidDeductions.toLocaleString('en-IN')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Net Salary Highlight Footer */}
                <div style={{ background: 'linear-gradient(135deg, rgba(245, 166, 35, 0.15) 0%, rgba(200, 120, 20, 0.05) 100%)', padding: '1rem 1.25rem', borderRadius: 'var(--apc-radius-sm)', border: '1px solid var(--apc-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--apc-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      TOTAL NET PAYABLE SALARY
                    </span>
                    <p style={{ fontSize: '0.8rem', margin: '2px 0 0 0', color: 'var(--apc-text-secondary)' }}>
                      Direct Bank Transfer / Auto-Disbursed
                    </p>
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--apc-primary-dark)' }}>
                    ₹{salarySlip.netSalary.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--apc-text-secondary)' }}>
                No salary slip calculated for this month.
              </div>
            )}
          </div>
        )}

        {/* Apply Leave Modal */}
        {showLeaveModal && (
          <div className="apc-modal-overlay">
            <div className="apc-modal" style={{ maxWidth: '460px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.15rem' }}>Apply for Leave</h3>
                <button onClick={() => setShowLeaveModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={20} color="var(--apc-text-secondary)" />
                </button>
              </div>

              <form onSubmit={handleApplyLeave}>
                <div className="apc-form-group">
                  <label>Leave Type</label>
                  <select className="apc-select" value={leaveType} onChange={e => setLeaveType(e.target.value)}>
                    <option value="Casual Leave">Casual Leave (Balance: {profileData?.casualLeaveBalance ?? user?.casualLeaveBalance ?? 12})</option>
                    <option value="Sick Leave">Sick Leave (Balance: {profileData?.sickLeaveBalance ?? user?.sickLeaveBalance ?? 12})</option>
                    <option value="Paid Leave">Paid Leave (Balance: {profileData?.paidLeaveBalance ?? user?.paidLeaveBalance ?? 15})</option>
                    <option value="Compensatory Off (C-Off)">Compensatory Off / C-Off (Balance: {profileData?.coffBalance ?? user?.coffBalance ?? 0})</option>
                  </select>
                </div>

                <div className="apc-grid-2col" style={{ gap: '0.75rem' }}>
                  <div className="apc-form-group">
                    <label>Start Date</label>
                    <input
                      type="date"
                      className="apc-input"
                      required
                      value={leaveStartDate}
                      onChange={e => setLeaveStartDate(e.target.value)}
                    />
                  </div>

                  <div className="apc-form-group">
                    <label>End Date</label>
                    <input
                      type="date"
                      className="apc-input"
                      required
                      value={leaveEndDate}
                      onChange={e => setLeaveEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="apc-form-group">
                  <label>Reason for Leave</label>
                  <textarea
                    className="apc-textarea"
                    rows={3}
                    required
                    placeholder="Provide details for your leave request..."
                    value={leaveReason}
                    onChange={e => setLeaveReason(e.target.value)}
                  />
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--apc-text-secondary)', marginBottom: '1rem', background: 'var(--apc-surface)', padding: '0.5rem 0.75rem', borderRadius: '4px' }}>
                  Approval Manager: <strong>{user?.reportingManagerName || 'Super Admin'}</strong>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowLeaveModal(false)} className="apc-btn apc-btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="apc-btn apc-btn-primary" disabled={submittingLeave}>
                    <Send size={16} /> {submittingLeave ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Camera Punch Modal */}
        {showCameraModal && (
          <div className="apc-modal-overlay">
            <div className="apc-modal" style={{ maxWidth: '480px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <Camera size={20} color="var(--apc-primary-dark)" />
                  {punchType === 'in' ? 'Punch In Verification' : 'Punch Out Verification'}
                </h3>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'monospace', background: 'var(--apc-surface)', padding: '0.2rem 0.6rem', borderRadius: '4px', border: '1px solid var(--apc-border)' }}>
                  {liveTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                </span>
              </div>

              {error && (
                <div style={{ color: 'var(--apc-danger)', fontSize: '0.85rem', marginBottom: '0.75rem', fontWeight: 600 }}>
                  <AlertTriangle size={14} inline /> {error}
                </div>
              )}

              {/* Video Stream & Canvas Preview */}
              <div
                style={{
                  width: '100%',
                  height: '260px',
                  backgroundColor: '#1A1612',
                  borderRadius: 'var(--apc-radius-md)',
                  overflow: 'hidden',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {!capturedPhoto ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <img src={capturedPhoto} alt="Captured Punch Selfie" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
                <canvas ref={canvasRef} style={{ display: 'none' }} />
              </div>

              {/* Late Reason Field if punching late */}
              {(requiresReason || punchType === 'in') && (
                <div className="apc-form-group" style={{ marginTop: '1rem' }}>
                  <label htmlFor="lateReason">
                    Reason for Late Punch-In <span className="required">*</span>
                  </label>
                  <textarea
                    id="lateReason"
                    className={`apc-textarea ${requiresReason && !lateReason ? 'invalid' : ''}`}
                    rows={2}
                    placeholder="Briefly state reason (e.g. client meeting, traffic delay)..."
                    value={lateReason}
                    onChange={(e) => setLateReason(e.target.value)}
                  />
                  <p className="apc-helper-text">Required if punching in beyond ideal buffer time.</p>
                </div>
              )}

              {/* Modal Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
                <button onClick={stopCamera} className="apc-btn apc-btn-secondary" disabled={submitting}>
                  Cancel
                </button>

                {!capturedPhoto ? (
                  <button onClick={capturePhoto} className="apc-btn apc-btn-primary">
                    <Camera size={16} /> Take Photo
                  </button>
                ) : (
                  <>
                    <button onClick={() => setCapturedPhoto(null)} className="apc-btn apc-btn-secondary">
                      <RefreshCw size={16} /> Retake
                    </button>
                    <button onClick={handlePunchSubmit} className="apc-btn apc-btn-primary" disabled={submitting}>
                      <Send size={16} /> {submitting ? 'Submitting...' : 'Submit Punch'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
