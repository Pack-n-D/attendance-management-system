import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../../components/Navbar';
import StatusBadge from '../../components/StatusBadge';
import AttendanceCalendar from '../../components/AttendanceCalendar';
import { apiFetch } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { DEFAULT_OFFICE_CONFIG, calculateDistanceMeters } from '../../utils/constants';
import { Camera, CheckCircle2, Clock, MapPin, AlertTriangle, RefreshCw, Send, Calendar, UserCheck, Check, X, FileText, Receipt, Plus, Trash2, DollarSign, Image, Home as HomeIcon, Laptop } from 'lucide-react';

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
  const [shiftType, setShiftType] = useState('full_day'); // 'full_day' or 'second_half'
  const [submitting, setSubmitting] = useState(false);
  const [confirmationMsg, setConfirmationMsg] = useState(null);

  // Geolocation & Geofencing state
  const [userLocation, setUserLocation] = useState({ latitude: null, longitude: null });
  const [locationStatus, setLocationStatus] = useState('idle'); // 'idle' | 'locating' | 'success' | 'denied' | 'error'
  const [locationError, setLocationError] = useState('');
  const [distanceFromOffice, setDistanceFromOffice] = useState(null);
  const [isOutsideGeofence, setIsOutsideGeofence] = useState(false);

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

  // Work From Home (WFH) Management state
  const [showWfhModal, setShowWfhModal] = useState(false);
  const [wfhStartDate, setWfhStartDate] = useState('');
  const [wfhEndDate, setWfhEndDate] = useState('');
  const [wfhReason, setWfhReason] = useState('');
  const [submittingWfh, setSubmittingWfh] = useState(false);
  const [wfhMsg, setWfhMsg] = useState('');

  const [myWfhRequests, setMyWfhRequests] = useState([]);
  const [managedWfhRequests, setManagedWfhRequests] = useState([]);
  const [reviewingWfhId, setReviewingWfhId] = useState(null);

  // WFH Withdrawal state
  const [withdrawWfhModalReq, setWithdrawWfhModalReq] = useState(null);
  const [withdrawWfhReason, setWithdrawWfhReason] = useState('');
  const [submittingWfhWithdraw, setSubmittingWfhWithdraw] = useState(false);

  // Reimbursement State
  const [myReimbursements, setMyReimbursements] = useState([]);
  const [reimbStats, setReimbStats] = useState({ totalClaimed: 0, totalApproved: 0, totalPending: 0 });
  const [loadingReimb, setLoadingReimb] = useState(false);
  const [showReimbModal, setShowReimbModal] = useState(false);
  const [reimbCategory, setReimbCategory] = useState('Petrol');
  const [reimbAmount, setReimbAmount] = useState('');
  const [reimbExpenseDate, setReimbExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [reimbDescription, setReimbDescription] = useState('');
  const [reimbReceiptPhoto, setReimbReceiptPhoto] = useState(null);
  const [submittingReimb, setSubmittingReimb] = useState(false);
  const [reimbMsg, setReimbMsg] = useState('');
  const [deletingReimbId, setDeletingReimbId] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Live ticking clock & real-time sync state
  const [liveTime, setLiveTime] = useState(new Date());
  const lastSyncDateRef = useRef(new Date().toDateString());

  // MNC Portal state
  const [activePortalTab, setActivePortalTab] = useState('dashboard'); // 'dashboard', 'reimbursements', 'salary'
  const [salaryMonth, setSalaryMonth] = useState(new Date().toISOString().slice(0, 7));
  const [salarySlip, setSalarySlip] = useState(null);
  const [loadingSalary, setLoadingSalary] = useState(false);
  const [profileData, setProfileData] = useState(null);

  const fetchTodayStatus = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await apiFetch('/attendance/today-status');
      setTodayData(data);
      lastSyncDateRef.current = new Date().toDateString();
      setError('');
    } catch (err) {
      if (!silent) setError(err.message);
      console.warn("Status fetch notice:", err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayStatus(false);
    fetchLeaveData();
    fetchProfile();
    fetchMyReimbursements();

    // 1. Live ticking clock with automatic midnight date-rollover detection
    const timer = setInterval(() => {
      const now = new Date();
      setLiveTime(now);

      // If midnight has passed and local date rolled over to a new day, auto-sync today's state
      if (now.toDateString() !== lastSyncDateRef.current) {
        lastSyncDateRef.current = now.toDateString();
        fetchTodayStatus(true);
      }
    }, 1000);

    // 2. Tab visibility & window focus handlers for mobile sleep/wake and tab switching
    const handleTabResume = () => {
      if (document.visibilityState === 'visible') {
        fetchTodayStatus(true);
        fetchLeaveData();
      }
    };

    const handleOnline = () => {
      fetchTodayStatus(true);
      setError('');
    };

    document.addEventListener('visibilitychange', handleTabResume);
    window.addEventListener('focus', handleTabResume);
    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleTabResume);
      window.removeEventListener('focus', handleTabResume);
      window.removeEventListener('online', handleOnline);
    };
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

  const fetchMyReimbursements = async () => {
    setLoadingReimb(true);
    try {
      const res = await apiFetch('/employee/reimbursements');
      setMyReimbursements(res.reimbursements || []);
      setReimbStats({
        totalClaimed: res.totalClaimed || 0,
        totalApproved: res.totalApproved || 0,
        totalPending: res.totalPending || 0
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingReimb(false);
    }
  };

  const handleSubmitReimbursement = async (e) => {
    e.preventDefault();
    setSubmittingReimb(true);
    setReimbMsg('');
    try {
      const res = await apiFetch('/employee/reimbursements', {
        method: 'POST',
        body: JSON.stringify({
          category: reimbCategory,
          amount: parseFloat(reimbAmount),
          expenseDate: reimbExpenseDate,
          description: reimbDescription,
          receiptPhoto: reimbReceiptPhoto
        })
      });
      setReimbMsg(res.message);
      setReimbAmount('');
      setReimbDescription('');
      setReimbReceiptPhoto(null);
      fetchMyReimbursements();
      setTimeout(() => {
        setShowReimbModal(false);
        setReimbMsg('');
      }, 1500);
    } catch (err) {
      setReimbMsg(`Error: ${err.message}`);
    } finally {
      setSubmittingReimb(false);
    }
  };

  const handleDeleteReimbursement = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this reimbursement request?")) return;
    setDeletingReimbId(id);
    try {
      await apiFetch(`/employee/reimbursements/${id}`, { method: 'DELETE' });
      fetchMyReimbursements();
    } catch (err) {
      alert("Failed to cancel: " + err.message);
    } finally {
      setDeletingReimbId(null);
    }
  };

  const handleReceiptUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setReimbReceiptPhoto(reader.result);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (activePortalTab === 'salary') {
      fetchMySalarySlip(salaryMonth);
    } else if (activePortalTab === 'reimbursements') {
      fetchMyReimbursements();
    }
  }, [activePortalTab, salaryMonth]);

  const fetchLeaveData = async () => {
    try {
      const [myRes, managedRes, myWfhRes, managedWfhRes] = await Promise.all([
        apiFetch('/employee/leave-requests').catch(() => ({ leaveRequests: [] })),
        apiFetch('/employee/managed-leave-requests').catch(() => ({ leaveRequests: [] })),
        apiFetch('/employee/wfh-requests').catch(() => ({ wfhRequests: [] })),
        apiFetch('/employee/managed-wfh-requests').catch(() => ({ wfhRequests: [] }))
      ]);
      setMyLeaveRequests(myRes.leaveRequests || []);
      setManagedRequests(managedRes.leaveRequests || []);
      setMyWfhRequests(myWfhRes.wfhRequests || []);
      setManagedWfhRequests(managedWfhRes.wfhRequests || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUserLocation = (currentRule) => {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      setLocationError('Geolocation is not supported by your device browser.');
      return;
    }

    setLocationStatus('locating');
    setLocationError('');
    setIsOutsideGeofence(false);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy || 0);
        setUserLocation({ latitude: lat, longitude: lng, accuracy });

        const ruleToUse = currentRule || todayData?.rule;
        const officeLat = ruleToUse?.officeLat ?? DEFAULT_OFFICE_CONFIG.lat;
        const officeLng = ruleToUse?.officeLng ?? DEFAULT_OFFICE_CONFIG.lng;
        const radius = ruleToUse?.allowedRadiusMeters ?? DEFAULT_OFFICE_CONFIG.allowedRadiusMeters;
        const isGeoEnabled = ruleToUse?.geofenceEnabled ?? DEFAULT_OFFICE_CONFIG.geofenceEnabled;

        const rawDist = calculateDistanceMeters(lat, lng, officeLat, officeLng);
        
        // Deduct indoor mobile GPS accuracy buffer (up to 40m tolerance)
        const accuracyDeduction = Math.min(accuracy, 40);
        const effectiveDist = Math.max(0, rawDist - accuracyDeduction);
        const distRounded = Math.round(rawDist);
        setDistanceFromOffice(distRounded);

        if (isGeoEnabled && effectiveDist > radius) {
          setIsOutsideGeofence(true);
          setLocationStatus('error');
          setLocationError(`You are outside the Company area (${distRounded}m from office). Punching is allowed only within ${Math.round(radius)}m radius.`);
        } else {
          setIsOutsideGeofence(false);
          setLocationStatus('success');
        }
      },
      (err) => {
        console.warn("Geolocation error:", err);
        setLocationStatus(err.code === 1 ? 'denied' : 'error');
        if (err.code === 1) {
          setLocationError("Location access was denied. Please turn on location / GPS on your device to punch.");
        } else {
          setLocationError("Unable to acquire high-accuracy GPS location. Please turn on location on your device.");
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const startCamera = async (type) => {
    setPunchType(type);
    setCapturedPhoto(null);
    setLateReason('');
    setRequiresReason(false);
    
    // Auto-default shift type: morning is Full Day, afternoon is Second Half
    const nowHour = new Date().getHours();
    setShiftType(nowHour >= 12 ? 'second_half' : 'full_day');
    
    setShowCameraModal(true);
    setError('');
    fetchUserLocation(todayData?.rule);

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
      const isGeoEnabled = todayData?.rule?.geofenceEnabled ?? DEFAULT_OFFICE_CONFIG.geofenceEnabled;
      const isWfhToday = Boolean(todayData?.isWfhToday);
      const radiusLimit = Math.round(todayData?.rule?.allowedRadiusMeters || 120);

      if (!isWfhToday && isGeoEnabled && isOutsideGeofence) {
        setError(`You are outside the Company area (${distanceFromOffice}m away). Punching is allowed only within ${radiusLimit}m of AP Corporation office.`);
        setSubmitting(false);
        return;
      }

      if (!isWfhToday && isGeoEnabled && (locationStatus === 'denied' || (locationStatus === 'error' && !userLocation.latitude))) {
        setError("Location access is required to punch. Please turn on location/GPS on your device and retry.");
        setSubmitting(false);
        return;
      }

      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      const clientTimeStr = `${h}:${m}:${s}`;

      const endpoint = punchType === 'in' ? '/attendance/punch-in' : '/attendance/punch-out';
      const body = {
        photo: capturedPhoto,
        lateReason: lateReason,
        clientTime: clientTimeStr,
        shiftType: punchType === 'in' ? shiftType : undefined,
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        accuracy: userLocation.accuracy,
        location: isWfhToday
          ? (userLocation.latitude ? `Work From Home (GPS: ${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)})` : 'Work From Home (Remote)')
          : (distanceFromOffice != null ? `AP Corporation Office, Nashik (${distanceFromOffice}m away)` : undefined)
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

  // --- WFH Handlers ---
  const handleApplyWfh = async (e) => {
    e.preventDefault();
    setSubmittingWfh(true);
    setWfhMsg('');
    try {
      const res = await apiFetch('/employee/wfh-requests', {
        method: 'POST',
        body: JSON.stringify({
          startDate: wfhStartDate,
          endDate: wfhEndDate,
          reason: wfhReason
        })
      });

      setWfhMsg(res.message);
      setWfhStartDate('');
      setWfhEndDate('');
      setWfhReason('');
      setShowWfhModal(false);
      fetchLeaveData();
      fetchTodayStatus(true);
    } catch (err) {
      alert("Failed to submit Work From Home request: " + err.message);
    } finally {
      setSubmittingWfh(false);
    }
  };

  const handleReviewWfh = async (reqId, action) => {
    setReviewingWfhId(reqId);
    try {
      await apiFetch(`/employee/wfh-requests/${reqId}/review`, {
        method: 'POST',
        body: JSON.stringify({ action })
      });
      fetchLeaveData();
      fetchTodayStatus(true);
    } catch (err) {
      alert("WFH Review failed: " + err.message);
    } finally {
      setReviewingWfhId(null);
    }
  };

  const handleRequestWfhWithdraw = async (e) => {
    e.preventDefault();
    if (!withdrawWfhModalReq) return;
    setSubmittingWfhWithdraw(true);
    try {
      const res = await apiFetch(`/employee/wfh-requests/${withdrawWfhModalReq.id}/withdraw`, {
        method: 'POST',
        body: JSON.stringify({ reason: withdrawWfhReason })
      });
      alert(res.message);
      setWithdrawWfhModalReq(null);
      setWithdrawWfhReason('');
      fetchLeaveData();
      fetchTodayStatus(true);
    } catch (err) {
      alert("WFH withdrawal request failed: " + err.message);
    } finally {
      setSubmittingWfhWithdraw(false);
    }
  };

  const handleCancelPendingWfh = async (reqId) => {
    if (!window.confirm("Are you sure you want to cancel this pending Work From Home request?")) return;
    try {
      const res = await apiFetch(`/employee/wfh-requests/${reqId}/withdraw`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Cancelled by employee' })
      });
      alert(res.message);
      fetchLeaveData();
      fetchTodayStatus(true);
    } catch (err) {
      alert("Failed to cancel WFH request: " + err.message);
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
  const pendingManagedRequests = managedRequests.filter(r => r.status === 'pending' || r.status === 'withdrawal_requested');
  const pendingManagedWfh = managedWfhRequests.filter(r => r.status === 'pending' || r.status === 'withdrawal_requested');

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

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowWfhModal(true)}
              className="apc-btn apc-btn-secondary"
              style={{
                padding: '0.5rem 0.85rem',
                fontSize: '0.85rem',
                background: '#EDE9FE',
                color: '#6D28D9',
                borderColor: 'rgba(109, 40, 217, 0.35)',
                fontWeight: 600
              }}
            >
              <HomeIcon size={16} /> Apply for WFH
            </button>
            <button onClick={() => setShowReimbModal(true)} className="apc-btn apc-btn-primary" style={{ padding: '0.5rem 0.85rem', fontSize: '0.85rem' }}>
              <Plus size={16} /> Claim Reimbursement
            </button>
            <button onClick={() => setShowLeaveModal(true)} className="apc-btn apc-btn-secondary" style={{ padding: '0.5rem 0.85rem', fontSize: '0.85rem' }}>
              <Calendar size={16} /> Apply for Leave
            </button>
          </div>
        </div>

        {/* MNC Navigation Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--apc-border)', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActivePortalTab('dashboard')}
            className={`apc-btn ${activePortalTab === 'dashboard' ? 'apc-btn-primary' : 'apc-btn-secondary'}`}
            style={{ borderRadius: '6px 6px 0 0', borderBottom: 'none', padding: '0.5rem 1rem' }}
          >
            <UserCheck size={16} /> Portal Dashboard
          </button>
          <button
            onClick={() => setActivePortalTab('calendar')}
            className={`apc-btn ${activePortalTab === 'calendar' ? 'apc-btn-primary' : 'apc-btn-secondary'}`}
            style={{ borderRadius: '6px 6px 0 0', borderBottom: 'none', padding: '0.5rem 1rem' }}
          >
            <Calendar size={16} /> Attendance Calendar
          </button>
          <button
            onClick={() => setActivePortalTab('reimbursements')}
            className={`apc-btn ${activePortalTab === 'reimbursements' ? 'apc-btn-primary' : 'apc-btn-secondary'}`}
            style={{ borderRadius: '6px 6px 0 0', borderBottom: 'none', padding: '0.5rem 1rem' }}
          >
            <Receipt size={16} /> Reimbursements {reimbStats.totalPending > 0 && <span style={{ background: '#D97706', color: '#fff', fontSize: '0.7rem', padding: '1px 6px', borderRadius: '10px', marginLeft: '4px' }}>{myReimbursements.filter(r => r.status === 'pending').length}</span>}
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
            <Clock size={15} color="var(--apc-primary-dark)" /> LIVE SYSTEM TIME (MAHARASHTRA / IST)
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--apc-text-primary)', marginTop: '0.2rem' }}>
            {liveTime.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--apc-text-secondary)', marginTop: '0.1rem' }}>
            {liveTime.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
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
                <div>
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
                  <div style={{ marginTop: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => startCamera('out')}
                      className="apc-btn apc-btn-secondary apc-btn-sm"
                      style={{ fontSize: '0.82rem', color: 'var(--apc-text-secondary)' }}
                    >
                      <Clock size={14} /> Already Punched In? Click to Punch Out
                    </button>
                  </div>
                </div>
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

        {/* WFH Active Today Banner */}
        {todayData?.isWfhToday && (
          <div
            className="apc-card"
            style={{
              background: 'linear-gradient(135deg, rgba(109, 40, 217, 0.12) 0%, rgba(139, 92, 246, 0.04) 100%)',
              border: '1px solid rgba(109, 40, 217, 0.35)',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              padding: '1rem'
            }}
          >
            <div style={{ background: '#EDE9FE', borderRadius: '50%', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <HomeIcon size={22} color="#6D28D9" />
            </div>
            <div>
              <h4 style={{ color: '#6D28D9', margin: 0, fontSize: '0.98rem' }}>🏠 Work From Home (WFH) Active Today</h4>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: 'var(--apc-text-secondary)' }}>
                Your WFH profile is active ({todayData?.activeWfh?.startDate} to {todayData?.activeWfh?.endDate}). Office geofence restriction is <strong>waived</strong> — you can punch in & punch out remotely from anywhere!
              </p>
            </div>
          </div>
        )}

        {wfhMsg && (
          <div className="apc-card" style={{ background: '#EDE9FE', border: '1px solid rgba(109, 40, 217, 0.35)', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.9rem', color: '#6D28D9', fontWeight: 600, margin: 0 }}>{wfhMsg}</p>
          </div>
        )}

        {leaveMsg && (
          <div className="apc-card" style={{ background: 'var(--apc-primary-tint)', border: '1px solid var(--apc-primary)', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--apc-primary-dark)', fontWeight: 600, margin: 0 }}>{leaveMsg}</p>
          </div>
        )}

        {/* REPORTING MANAGER SECTION: Direct Reports WFH Requests */}
        {managedWfhRequests.length > 0 && (
          <div className="apc-card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid #6D28D9' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <HomeIcon size={18} color="#6D28D9" /> Direct Reports Work From Home Requests ({pendingManagedWfh.length} Pending)
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {managedWfhRequests.map(req => (
                <div key={req.id} style={{ padding: '0.85rem', background: 'var(--apc-bg)', border: '1px solid var(--apc-border)', borderRadius: 'var(--apc-radius-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <strong>{req.employeeName}</strong>
                      <span style={{ fontSize: '0.78rem', color: 'var(--apc-text-secondary)', marginLeft: '6px' }}>({req.department})</span>
                      <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                        <span style={{ fontWeight: 600, color: '#6D28D9' }}>Work From Home</span>: {req.startDate} to {req.endDate}
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--apc-text-secondary)', marginTop: '0.25rem' }}>
                        <strong>Reason:</strong> {req.reason}
                      </p>
                      {req.withdrawReason && (
                        <p style={{ fontSize: '0.78rem', color: '#D97706', margin: '0.2rem 0 0 0' }}>
                          <strong>Withdrawal Reason:</strong> {req.withdrawReason}
                        </p>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {req.status === 'withdrawal_requested' ? (
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => handleReviewWfh(req.id, 'approve_withdrawal')}
                            className="apc-btn apc-btn-primary"
                            style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem' }}
                            disabled={reviewingWfhId === req.id}
                          >
                            <Check size={14} /> Approve Withdrawal
                          </button>
                          <button
                            onClick={() => handleReviewWfh(req.id, 'reject_withdrawal')}
                            className="apc-btn apc-btn-danger"
                            style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem' }}
                            disabled={reviewingWfhId === req.id}
                          >
                            <X size={14} /> Reject Withdrawal
                          </button>
                        </div>
                      ) : req.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => handleReviewWfh(req.id, 'approve')}
                            className="apc-btn apc-btn-primary"
                            style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem', background: '#6D28D9', borderColor: '#6D28D9' }}
                            disabled={reviewingWfhId === req.id}
                          >
                            <Check size={14} /> Approve WFH
                          </button>
                          <button
                            onClick={() => handleReviewWfh(req.id, 'reject')}
                            className="apc-btn apc-btn-danger"
                            style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem' }}
                            disabled={reviewingWfhId === req.id}
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

        {/* MY SUBMITTED WORK FROM HOME REQUESTS HISTORY */}
        {myWfhRequests.length > 0 && (
          <div className="apc-card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.05rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <HomeIcon size={16} color="#6D28D9" /> My Work From Home (WFH) Requests
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {myWfhRequests.slice(0, 10).map(req => (
                <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.85rem', background: 'var(--apc-surface)', borderRadius: '4px', border: '1px solid var(--apc-border)', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#6D28D9' }}>Work From Home</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--apc-text-secondary)', marginLeft: '8px' }}>({req.startDate} to {req.endDate})</span>
                    <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--apc-text-secondary)' }}>
                      Reason: "{req.reason}" · Manager: {req.reportingManagerName || 'Super Admin'} {req.withdrawReason ? `· Withdrawal Note: "${req.withdrawReason}"` : ''}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <StatusBadge status={req.status} />
                    {req.status === 'approved' && (
                      <button
                        onClick={() => { setWithdrawWfhModalReq(req); setWithdrawWfhReason(''); }}
                        className="apc-btn apc-btn-secondary"
                        style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                      >
                        Request Withdrawal
                      </button>
                    )}
                    {req.status === 'pending' && (
                      <button
                        onClick={() => handleCancelPendingWfh(req.id)}
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

        {/* REQUEST WFH WITHDRAWAL MODAL */}
        {withdrawWfhModalReq && (
          <div className="apc-modal-overlay">
            <div className="apc-modal" style={{ maxWidth: '440px' }}>
              <h3>Request WFH Withdrawal</h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--apc-text-secondary)', margin: '0.5rem 0 1rem 0' }}>
                Requesting to cancel approved <strong>Work From Home</strong> ({withdrawWfhModalReq.startDate} to {withdrawWfhModalReq.endDate}). This request will go to <strong>{withdrawWfhModalReq.reportingManagerName || 'Super Admin'}</strong> for approval.
              </p>

              <form onSubmit={handleRequestWfhWithdraw}>
                <div className="apc-form-group">
                  <label htmlFor="withdrawWfhReasonInput">Emergency / Reason for Coming to Office <span className="required">*</span></label>
                  <textarea
                    id="withdrawWfhReasonInput"
                    className="apc-textarea"
                    rows={3}
                    placeholder="e.g. Reporting back to office / project meeting in-person"
                    value={withdrawWfhReason}
                    onChange={e => setWithdrawWfhReason(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                  <button type="button" onClick={() => setWithdrawWfhModalReq(null)} className="apc-btn apc-btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="apc-btn apc-btn-primary" disabled={submittingWfhWithdraw}>
                    {submittingWfhWithdraw ? 'Submitting...' : 'Submit WFH Withdrawal'}
                  </button>
                </div>
              </form>
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

        {/* REIMBURSEMENTS TAB VIEW */}
        {activePortalTab === 'reimbursements' && (
          <div className="apc-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Receipt size={18} color="var(--apc-primary)" /> My Expense Reimbursements
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--apc-text-secondary)', margin: '2px 0 0 0' }}>
                  Claim official travel, petrol, hotel & client expenses. Approved claims credit into your monthly salary.
                </p>
              </div>

              <button onClick={() => setShowReimbModal(true)} className="apc-btn apc-btn-primary" style={{ padding: '0.45rem 0.9rem' }}>
                <Plus size={16} /> New Reimbursement Claim
              </button>
            </div>

            {/* Reimbursement Stats Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ padding: '0.85rem', background: 'var(--apc-bg)', borderRadius: 'var(--apc-radius-sm)', border: '1px solid var(--apc-border)', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--apc-text-secondary)', display: 'block' }}>TOTAL CLAIMED</span>
                <strong style={{ fontSize: '1.25rem', color: 'var(--apc-text-primary)' }}>₹{reimbStats.totalClaimed.toLocaleString('en-IN')}</strong>
                <span style={{ fontSize: '0.7rem', color: 'var(--apc-text-secondary)', display: 'block' }}>{myReimbursements.length} Claims</span>
              </div>

              <div style={{ padding: '0.85rem', background: 'rgba(46, 158, 91, 0.08)', borderRadius: 'var(--apc-radius-sm)', border: '1px solid rgba(46, 158, 91, 0.3)', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#1E6B3C', display: 'block' }}>APPROVED (CREDITED)</span>
                <strong style={{ fontSize: '1.25rem', color: 'var(--apc-success)' }}>₹{reimbStats.totalApproved.toLocaleString('en-IN')}</strong>
                <span style={{ fontSize: '0.7rem', color: '#1E6B3C', display: 'block' }}>In Salary Slip</span>
              </div>

              <div style={{ padding: '0.85rem', background: 'rgba(245, 166, 35, 0.08)', borderRadius: 'var(--apc-radius-sm)', border: '1px solid rgba(245, 166, 35, 0.3)', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#B45309', display: 'block' }}>PENDING APPROVAL</span>
                <strong style={{ fontSize: '1.25rem', color: '#D97706' }}>₹{reimbStats.totalPending.toLocaleString('en-IN')}</strong>
                <span style={{ fontSize: '0.7rem', color: '#B45309', display: 'block' }}>Awaiting Admin</span>
              </div>
            </div>

            {/* Claims History List */}
            <h4 style={{ fontSize: '0.95rem', color: 'var(--apc-text-secondary)', textTransform: 'uppercase', marginBottom: '0.65rem', letterSpacing: '0.5px' }}>
              REIMBURSEMENT CLAIMS HISTORY
            </h4>

            {loadingReimb ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--apc-text-secondary)' }}>Loading claims...</div>
            ) : myReimbursements.length === 0 ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', background: 'var(--apc-bg)', borderRadius: 'var(--apc-radius-sm)', border: '1px dashed var(--apc-border)' }}>
                <Receipt size={36} color="var(--apc-text-secondary)" style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
                <p style={{ margin: 0, color: 'var(--apc-text-secondary)', fontSize: '0.9rem' }}>No reimbursement claims submitted yet.</p>
                <button onClick={() => setShowReimbModal(true)} className="apc-btn apc-btn-secondary" style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>
                  <Plus size={15} /> Submit Your First Claim
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {myReimbursements.map(r => (
                  <div
                    key={r.id}
                    style={{
                      padding: '1rem',
                      borderRadius: 'var(--apc-radius-sm)',
                      background: 'var(--apc-surface)',
                      border: '1px solid var(--apc-border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.75rem'
                    }}
                  >
                    <div style={{ minWidth: '220px', flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <strong style={{ fontSize: '1rem', color: 'var(--apc-text-primary)' }}>{r.category}</strong>
                        <span style={{ fontSize: '0.8rem', color: 'var(--apc-text-secondary)' }}>• {r.expenseDate}</span>
                        <StatusBadge status={r.status} />
                      </div>
                      
                      {r.description && (
                        <p style={{ margin: '0.2rem 0', fontSize: '0.84rem', color: 'var(--apc-text-secondary)' }}>
                          {r.description}
                        </p>
                      )}

                      {r.adminComment && (
                        <div style={{ marginTop: '0.35rem', fontSize: '0.78rem', background: 'var(--apc-bg)', padding: '0.3rem 0.5rem', borderRadius: '4px', borderLeft: '3px solid var(--apc-primary)' }}>
                          <strong>Admin Note:</strong> {r.adminComment}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      {r.receiptPhotoUrl && (
                        <a
                          href={r.receiptPhotoUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.78rem',
                            color: 'var(--apc-primary-dark)',
                            textDecoration: 'none',
                            padding: '0.3rem 0.6rem',
                            background: 'var(--apc-bg)',
                            borderRadius: '4px',
                            border: '1px solid var(--apc-border)'
                          }}
                        >
                          <Image size={14} /> Receipt
                        </a>
                      )}

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: r.status === 'approved' ? 'var(--apc-success)' : 'var(--apc-text-primary)' }}>
                          ₹{r.amount.toLocaleString('en-IN')}
                        </div>
                        {r.status === 'approved' && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--apc-success)', display: 'block' }}>
                            ✓ In Payslip
                          </span>
                        )}
                      </div>

                      {r.status === 'pending' && (
                        <button
                          onClick={() => handleDeleteReimbursement(r.id)}
                          disabled={deletingReimbId === r.id}
                          className="apc-btn apc-btn-secondary"
                          style={{ padding: '0.35rem 0.5rem', color: 'var(--apc-danger)' }}
                          title="Cancel Request"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
                        <td>Overtime Pay ({salarySlip.overtimeHours} hrs @ ₹150/hr)</td>
                        <td style={{ textAlign: 'right', color: 'var(--apc-success)', fontWeight: 600 }}>+ ₹{salarySlip.overtimePay.toLocaleString('en-IN')}</td>
                        <td>Taxes / Statutory</td>
                        <td style={{ textAlign: 'right' }}>₹0.00</td>
                      </tr>

                      {/* Approved Reimbursement Line Item */}
                      {salarySlip.totalReimbursements > 0 && (
                        <tr style={{ background: 'rgba(46, 158, 91, 0.08)' }}>
                          <td>
                            <strong style={{ color: '#1E6B3C' }}>Reimbursement Credit (Approved)</strong>
                            {salarySlip.reimbursementsList && salarySlip.reimbursementsList.length > 0 && (
                              <div style={{ fontSize: '0.78rem', color: 'var(--apc-text-secondary)', marginTop: '2px' }}>
                                Note: {salarySlip.reimbursementsList.map(r => `${r.category}: ₹${r.amount}`).join(' + ')}
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: 'right', color: 'var(--apc-success)', fontWeight: 700 }}>
                            + ₹{salarySlip.totalReimbursements.toLocaleString('en-IN')}
                          </td>
                          <td>—</td>
                          <td style={{ textAlign: 'right' }}>—</td>
                        </tr>
                      )}

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
                      Direct Bank Transfer / Auto-Disbursed {salarySlip.totalReimbursements > 0 ? `(Includes ₹${salarySlip.totalReimbursements} Reimbursements)` : ''}
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

        {/* ATTENDANCE CALENDAR TAB VIEW */}
        {activePortalTab === 'calendar' && (
          <AttendanceCalendar user={user} currentRule={todayData?.rule} />
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

        {/* Apply for Work From Home (WFH) Modal */}
        {showWfhModal && (
          <div className="apc-modal-overlay">
            <div className="apc-modal" style={{ maxWidth: '460px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, color: '#6D28D9' }}>
                  <HomeIcon size={20} color="#6D28D9" /> Apply for Work From Home
                </h3>
                <button onClick={() => setShowWfhModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={20} color="var(--apc-text-secondary)" />
                </button>
              </div>

              <div style={{ background: '#EDE9FE', border: '1px solid rgba(109, 40, 217, 0.25)', borderRadius: '6px', padding: '0.65rem 0.85rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#5B21B6' }}>
                💡 <strong>How WFH Works:</strong> Once your reporting manager or admin approves this request, you will be able to punch in and punch out from <strong>anywhere</strong> without company office location restriction.
              </div>

              <form onSubmit={handleApplyWfh}>
                <div className="apc-grid-2col" style={{ gap: '0.75rem' }}>
                  <div className="apc-form-group">
                    <label>Start Date <span className="required">*</span></label>
                    <input
                      type="date"
                      className="apc-input"
                      required
                      value={wfhStartDate}
                      onChange={e => setWfhStartDate(e.target.value)}
                    />
                  </div>

                  <div className="apc-form-group">
                    <label>End Date <span className="required">*</span></label>
                    <input
                      type="date"
                      className="apc-input"
                      required
                      value={wfhEndDate}
                      onChange={e => setWfhEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="apc-form-group">
                  <label>Reason for Work From Home <span className="required">*</span></label>
                  <textarea
                    className="apc-textarea"
                    rows={3}
                    required
                    placeholder="e.g. Remote client assignments / bad weather / family emergency..."
                    value={wfhReason}
                    onChange={e => setWfhReason(e.target.value)}
                  />
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--apc-text-secondary)', marginBottom: '1rem', background: 'var(--apc-surface)', padding: '0.5rem 0.75rem', borderRadius: '4px' }}>
                  Approval Manager: <strong>{user?.reportingManagerName || 'Super Admin'}</strong>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowWfhModal(false)} className="apc-btn apc-btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="apc-btn apc-btn-primary" style={{ background: '#6D28D9', borderColor: '#6D28D9' }} disabled={submittingWfh}>
                    <Send size={16} /> {submittingWfh ? 'Submitting...' : 'Submit WFH Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}


        {/* Claim Reimbursement Modal */}
        {showReimbModal && (
          <div className="apc-modal-overlay">
            <div className="apc-modal" style={{ maxWidth: '480px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <Receipt size={20} color="var(--apc-primary)" /> Claim Expense Reimbursement
                </h3>
                <button onClick={() => setShowReimbModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={20} color="var(--apc-text-secondary)" />
                </button>
              </div>

              {reimbMsg && (
                <div style={{
                  padding: '0.75rem',
                  borderRadius: 'var(--apc-radius-sm)',
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                  background: reimbMsg.startsWith('Error') ? 'rgba(229, 57, 53, 0.12)' : 'rgba(46, 158, 91, 0.12)',
                  color: reimbMsg.startsWith('Error') ? 'var(--apc-danger)' : 'var(--apc-success)',
                  border: `1px solid ${reimbMsg.startsWith('Error') ? 'var(--apc-danger)' : 'var(--apc-success)'}`
                }}>
                  {reimbMsg}
                </div>
              )}

              <form onSubmit={handleSubmitReimbursement}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
                  <div className="apc-form-group">
                    <label>Expense Category <span className="required">*</span></label>
                    <select
                      className="apc-select"
                      required
                      value={reimbCategory}
                      onChange={e => setReimbCategory(e.target.value)}
                    >
                      <option value="Petrol">⛽ Petrol / Fuel</option>
                      <option value="Hotel">🏨 Hotel / Accommodation</option>
                      <option value="Food">🍽️ Food & Meals</option>
                      <option value="Travel">✈️ Travel / Cab / Bus</option>
                      <option value="Internet/Mobile">📱 Mobile / Internet Bill</option>
                      <option value="Client Meeting">🤝 Client Entertainment</option>
                      <option value="Office Supplies">📦 Office Supplies</option>
                      <option value="Other">📝 Other Expense</option>
                    </select>
                  </div>

                  <div className="apc-form-group">
                    <label>Amount (₹) <span className="required">*</span></label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      className="apc-input"
                      required
                      placeholder="e.g. 300"
                      value={reimbAmount}
                      onChange={e => setReimbAmount(e.target.value)}
                    />
                  </div>
                </div>

                <div className="apc-form-group">
                  <label>Expense Date <span className="required">*</span></label>
                  <input
                    type="date"
                    className="apc-input"
                    required
                    value={reimbExpenseDate}
                    onChange={e => setReimbExpenseDate(e.target.value)}
                  />
                </div>

                <div className="apc-form-group">
                  <label>Description / Notes</label>
                  <textarea
                    className="apc-textarea"
                    rows={2}
                    placeholder="e.g. Petrol for site visit to client office / Hotel stay in Pune..."
                    value={reimbDescription}
                    onChange={e => setReimbDescription(e.target.value)}
                  />
                </div>

                <div className="apc-form-group">
                  <label>Attach Bill / Receipt Photo (Optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="apc-input"
                    onChange={handleReceiptUpload}
                  />
                  {reimbReceiptPhoto && (
                    <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <img src={reimbReceiptPhoto} alt="Receipt preview" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--apc-border)' }} />
                      <span style={{ fontSize: '0.8rem', color: 'var(--apc-success)' }}>✓ Receipt image attached</span>
                    </div>
                  )}
                </div>

                <div style={{ fontSize: '0.78rem', color: 'var(--apc-text-secondary)', marginBottom: '1.25rem', background: 'var(--apc-surface)', padding: '0.5rem 0.75rem', borderRadius: '4px' }}>
                  ℹ️ Once approved by Admin, this ₹{reimbAmount || '0'} will be automatically credited to your monthly salary slip.
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowReimbModal(false)} className="apc-btn apc-btn-secondary" disabled={submittingReimb}>
                    Cancel
                  </button>
                  <button type="submit" className="apc-btn apc-btn-primary" disabled={submittingReimb}>
                    <Send size={16} /> {submittingReimb ? 'Submitting...' : 'Submit Claim'}
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
                  {liveTime.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                </span>
              </div>

              {error && (
                <div style={{ color: 'var(--apc-danger)', fontSize: '0.85rem', marginBottom: '0.75rem', fontWeight: 600 }}>
                  {error}
                </div>
              )}

              {/* Geofence / WFH Location Status Indicator Banner */}
              <div
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--apc-radius-sm)',
                  fontSize: '0.82rem',
                  marginBottom: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                  background: todayData?.isWfhToday
                    ? '#EDE9FE'
                    : locationStatus === 'success'
                    ? 'rgba(46, 158, 91, 0.12)'
                    : locationStatus === 'locating'
                    ? 'var(--apc-surface)'
                    : 'rgba(229, 57, 53, 0.12)',
                  border: todayData?.isWfhToday
                    ? '1px solid rgba(109, 40, 217, 0.35)'
                    : locationStatus === 'success'
                    ? '1px solid rgba(46, 158, 91, 0.4)'
                    : locationStatus === 'locating'
                    ? '1px solid var(--apc-border)'
                    : '1px solid rgba(229, 57, 53, 0.4)',
                  color: todayData?.isWfhToday
                    ? '#6D28D9'
                    : locationStatus === 'success'
                    ? '#1E6B3C'
                    : locationStatus === 'locating'
                    ? 'var(--apc-text-primary)'
                    : '#C62828'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                  {todayData?.isWfhToday ? (
                    <>
                      <HomeIcon size={18} color="#6D28D9" />
                      <div>
                        <strong style={{ color: '#6D28D9' }}>Work From Home (WFH) Active</strong>
                        <span style={{ display: 'block', fontSize: '0.76rem', color: '#5B21B6' }}>
                          Company office radius check is waived · Remote punching enabled from anywhere
                        </span>
                        {userLocation?.latitude && (
                          <span style={{ display: 'block', fontSize: '0.7rem', color: '#6D28D9', fontFamily: 'monospace' }}>
                            Remote GPS: {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      {locationStatus === 'locating' && <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} />}
                      {locationStatus === 'success' && <MapPin size={16} color="#1E6B3C" />}
                      {(locationStatus === 'error' || locationStatus === 'denied') && <AlertTriangle size={16} color="#C62828" />}
                      
                      <div>
                        {locationStatus === 'locating' && <strong>Acquiring High-Precision GPS Lock...</strong>}
                        {locationStatus === 'success' && (
                          <>
                            <strong style={{ color: '#1E6B3C' }}>Location Verified: Company Area</strong>
                            <span style={{ display: 'block', fontSize: '0.76rem', color: '#2E7D32' }}>
                              AP Corporation Office · <strong>{distanceFromOffice}m</strong> away {userLocation?.accuracy ? `(±${userLocation.accuracy}m GPS precision)` : ''}
                            </span>
                            {userLocation?.latitude && (
                              <span style={{ display: 'block', fontSize: '0.7rem', color: '#4CAF50', fontFamily: 'monospace' }}>
                                GPS: {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}
                              </span>
                            )}
                          </>
                        )}
                        {locationStatus === 'denied' && (
                          <>
                            <strong>Location Access Disabled / Denied</strong>
                            <span style={{ display: 'block', fontSize: '0.76rem', color: '#C62828' }}>
                              Please turn on Location / GPS on your device to verify company area.
                            </span>
                          </>
                        )}
                        {locationStatus === 'error' && (
                          <>
                            <strong>{isOutsideGeofence ? "Outside Company Area" : "Location Check Failed"}</strong>
                            <span style={{ display: 'block', fontSize: '0.76rem', color: '#C62828' }}>
                              {locationError || "Turn on device location to punch attendance."}
                            </span>
                            {userLocation?.latitude && (
                              <span style={{ display: 'block', fontSize: '0.7rem', color: '#E53935', fontFamily: 'monospace', marginTop: '2px' }}>
                                Live GPS: {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)} {userLocation?.accuracy ? `(±${userLocation.accuracy}m precision)` : ''}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {!todayData?.isWfhToday && (locationStatus === 'denied' || locationStatus === 'error') && (
                  <button
                    type="button"
                    onClick={() => fetchUserLocation(todayData?.rule)}
                    className="apc-btn apc-btn-secondary"
                    style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', flexShrink: 0 }}
                  >
                    <RefreshCw size={12} /> Turn On / Retry
                  </button>
                )}
              </div>

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

              {/* Shift Selection Toggle on Punch In */}
              {punchType === 'in' && (
                <div style={{ marginTop: '0.85rem', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '0.4rem', color: 'var(--apc-text-primary)' }}>
                    Select Punch Shift Type:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setShiftType('full_day')}
                      style={{
                        padding: '0.5rem 0.75rem',
                        borderRadius: 'var(--apc-radius-sm)',
                        border: shiftType === 'full_day' ? '2px solid var(--apc-primary)' : '1px solid var(--apc-border)',
                        background: shiftType === 'full_day' ? 'var(--apc-primary-tint)' : 'var(--apc-surface)',
                        color: shiftType === 'full_day' ? 'var(--apc-primary-dark)' : 'var(--apc-text-primary)',
                        fontWeight: shiftType === 'full_day' ? 700 : 500,
                        cursor: 'pointer',
                        fontSize: '0.82rem',
                        textAlign: 'center'
                      }}
                    >
                      ☀️ Full Day Shift <br/>
                      <span style={{ fontSize: '0.72rem', opacity: 0.8 }}>(10:00 AM - 6:30 PM)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShiftType('second_half')}
                      style={{
                        padding: '0.5rem 0.75rem',
                        borderRadius: 'var(--apc-radius-sm)',
                        border: shiftType === 'second_half' ? '2px solid #2E9E5B' : '1px solid var(--apc-border)',
                        background: shiftType === 'second_half' ? 'rgba(46, 158, 91, 0.12)' : 'var(--apc-surface)',
                        color: shiftType === 'second_half' ? '#1E6B3C' : 'var(--apc-text-primary)',
                        fontWeight: shiftType === 'second_half' ? 700 : 500,
                        cursor: 'pointer',
                        fontSize: '0.82rem',
                        textAlign: 'center'
                      }}
                    >
                      🌙 Second Half (Half Day) <br/>
                      <span style={{ fontSize: '0.72rem', opacity: 0.8 }}>(1:00 PM - 6:30 PM)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Late Reason Field only when actually required by system */}
              {requiresReason && (
                <div className="apc-form-group" style={{ marginTop: '0.75rem' }}>
                  <label htmlFor="lateReason" style={{ color: '#D97706', fontWeight: 600 }}>
                    Reason for Late Punch-In <span className="required">*</span>
                  </label>
                  <textarea
                    id="lateReason"
                    className={`apc-textarea ${!lateReason ? 'invalid' : ''}`}
                    rows={2}
                    placeholder="Briefly state reason for late arrival (e.g. client visit, traffic delay)..."
                    value={lateReason}
                    onChange={(e) => setLateReason(e.target.value)}
                  />
                  <p className="apc-helper-text" style={{ color: '#D97706' }}>
                    Your punch-in is past the shift buffer time. Please provide a brief reason to complete punch-in.
                  </p>
                </div>
              )}

              {/* Modal Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
                <button onClick={stopCamera} className="apc-btn apc-btn-secondary" disabled={submitting}>
                  Cancel
                </button>

                {!capturedPhoto ? (
                  <button
                    onClick={capturePhoto}
                    className="apc-btn apc-btn-primary"
                    disabled={
                      !todayData?.isWfhToday &&
                      (isOutsideGeofence ||
                      ((todayData?.rule?.geofenceEnabled ?? DEFAULT_OFFICE_CONFIG.geofenceEnabled) && locationStatus !== 'success'))
                    }
                  >
                    <Camera size={16} /> Take Photo
                  </button>
                ) : (
                  <>
                    <button onClick={() => setCapturedPhoto(null)} className="apc-btn apc-btn-secondary">
                      <RefreshCw size={16} /> Retake
                    </button>
                    <button
                      onClick={handlePunchSubmit}
                      className="apc-btn apc-btn-primary"
                      disabled={
                        submitting ||
                        (!todayData?.isWfhToday &&
                        (isOutsideGeofence ||
                        ((todayData?.rule?.geofenceEnabled ?? DEFAULT_OFFICE_CONFIG.geofenceEnabled) && locationStatus !== 'success')))
                      }
                    >
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
