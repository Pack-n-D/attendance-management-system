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

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Live ticking clock state
  const [liveTime, setLiveTime] = useState(new Date());

  useEffect(() => {
    fetchTodayStatus();
    fetchLeaveData();

    const timer = setInterval(() => {
      setLiveTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
                        {req.status === 'pending' ? (
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
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', color: req.status === 'approved' ? 'var(--apc-success)' : 'var(--apc-danger)' }}>
                            {req.status}
                          </span>
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
              {myLeaveRequests.slice(0, 5).map(req => (
                <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.85rem', background: 'var(--apc-surface)', borderRadius: '4px', border: '1px solid var(--apc-border)' }}>
                  <div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{req.leaveType}</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--apc-text-secondary)', marginLeft: '8px' }}>({req.startDate} to {req.endDate})</span>
                    <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--apc-text-secondary)' }}>Manager: {req.reportingManagerName || 'Super Admin'}</span>
                  </div>
                  <span className={`apc-badge apc-badge-${req.status === 'approved' ? 'on_time' : req.status === 'rejected' ? 'late' : 'in_buffer'}`} style={{ textTransform: 'capitalize' }}>
                    {req.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* APPLY FOR LEAVE MODAL */}
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
                    <option value="Paid Leave">Paid Leave</option>
                    <option value="Casual Leave">Casual Leave</option>
                    <option value="Sick Leave">Sick Leave</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
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
