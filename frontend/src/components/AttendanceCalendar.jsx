import React, { useState, useEffect } from 'react';
import { apiFetch, getPhotoUrl } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from './StatusBadge';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  MapPin,
  X,
  Info,
  User,
  Users,
  AlertTriangle,
  Edit3,
  Save,
  Check,
  Trash2,
  Sparkles,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

export default function AttendanceCalendar({ user, currentRule }) {
  const { user: authUser } = useAuth();
  const isAdmin = authUser?.role === 'super_admin' || user?.role === 'super_admin';

  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed (0 = Jan, 8 = Sep)
  
  // Selected Employee (defaults to passed user or logged-in user)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(user?.id || authUser?.id || '');
  const [employeeList, setEmployeeList] = useState([]);
  
  const [records, setRecords] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDayDetail, setSelectedDayDetail] = useState(null);

  // Admin Override Editor State
  const [isEditing, setIsEditing] = useState(false);
  const [editStatus, setEditStatus] = useState('on_time');
  const [editPunchIn, setEditPunchIn] = useState('10:00');
  const [editPunchOut, setEditPunchOut] = useState('18:30');
  const [editShiftType, setEditShiftType] = useState('full_day');
  const [editReason, setEditReason] = useState('');
  const [savingOverride, setSavingOverride] = useState(false);
  const [overrideFeedback, setOverrideFeedback] = useState(null);

  // Month Names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Keep selectedEmployeeId updated if user prop changes
  useEffect(() => {
    if (user?.id && user.id !== selectedEmployeeId) {
      setSelectedEmployeeId(user.id);
    }
  }, [user?.id]);

  // Load employee list for Admins
  useEffect(() => {
    if (isAdmin) {
      apiFetch('/admin/employees')
        .then(res => {
          if (res.employees) {
            setEmployeeList(res.employees);
          }
        })
        .catch(err => console.warn('Could not fetch employee list for calendar dropdown:', err));
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchMonthData(currentYear, currentMonth, selectedEmployeeId || user?.id || authUser?.id);
  }, [currentYear, currentMonth, selectedEmployeeId]);

  const fetchMonthData = async (year, month, targetEmpId) => {
    setLoading(true);
    try {
      const activeEmpId = targetEmpId || user?.id || authUser?.id || '';
      const startDay = '01';
      const lastDate = new Date(year, month + 1, 0).getDate();
      const monthStr = String(month + 1).padStart(2, '0');
      const startDate = `${year}-${monthStr}-${startDay}`;
      const endDate = `${year}-${monthStr}-${String(lastDate).padStart(2, '0')}`;

      const [recRes, holRes, leaveRes] = await Promise.all([
        apiFetch(`/attendance/log?startDate=${startDate}&endDate=${endDate}&employeeId=${activeEmpId}`).catch(() => ({ records: [] })),
        apiFetch('/settings/holidays').catch(() => ({ holidays: [] })),
        apiFetch('/employee/leave-requests').catch(() => ({ leaveRequests: [] }))
      ]);

      // Filter records strictly for the active employee
      const empRecords = (recRes.records || []).filter(r => !activeEmpId || r.employeeId === activeEmpId);
      setRecords(empRecords);
      setHolidays(holRes.holidays || []);
      
      // Filter approved leaves for this employee
      const empLeaves = (leaveRes.leaveRequests || []).filter(r => 
        r.status === 'approved' && (!activeEmpId || r.employeeId === activeEmpId)
      );
      setLeaveRequests(empLeaves);
    } catch (err) {
      console.error('Failed to load month attendance data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleGoToCurrentMonth = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
  };

  // Build calendar matrix for current month
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sunday

  // Helper date string formatter YYYY-MM-DD
  const formatYMD = (d) => {
    const mm = String(currentMonth + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${currentYear}-${mm}-${dd}`;
  };

  // Today in YYYY-MM-DD (IST local)
  const todayYMD = today.toISOString().slice(0, 10);

  // Weekly off rules (default Sunday)
  const rawWeeklyOffs = currentRule?.weeklyOffs;
  const weeklyOffList = Array.isArray(rawWeeklyOffs)
    ? rawWeeklyOffs.map(w => String(w).trim().toLowerCase())
    : (typeof rawWeeklyOffs === 'string'
        ? rawWeeklyOffs.split(',').map(w => w.trim().toLowerCase())
        : ['sunday']);

  const activeEmpId = selectedEmployeeId || user?.id || authUser?.id;
  const activeEmpObj = employeeList.find(e => e.id === activeEmpId);
  const activeEmpName = activeEmpObj 
    ? `${activeEmpObj.firstName} ${activeEmpObj.lastName}` 
    : (user?.fullName || user?.firstName || authUser?.fullName || authUser?.firstName || 'My Calendar');

  // Map data per day
  const dayDetailsMap = {};
  let presentCount = 0;
  let lateCount = 0;
  let leaveCount = 0;
  let holidayCount = 0;
  let absentCount = 0;
  let totalMinutesWorked = 0;

  for (let d = 1; d <= totalDaysInMonth; d++) {
    const dateStr = formatYMD(d);
    const dateObj = new Date(currentYear, currentMonth, d);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const isWeeklyOff = weeklyOffList.includes(dayName);
    const isFuture = dateStr > todayYMD;
    const isToday = dateStr === todayYMD;

    // Check holiday
    const holidayMatch = holidays.find(h => h.date === dateStr);

    // Check leave
    const leaveMatch = leaveRequests.find(l => dateStr >= l.startDate && dateStr <= l.endDate);

    // Check record strictly for active employee
    const recordMatch = records.find(r => r.date === dateStr && (!activeEmpId || r.employeeId === activeEmpId));

    let type = 'future';
    let label = '';
    let bgColor = 'var(--apc-bg)';
    let borderColor = 'var(--apc-border)';
    let textColor = 'var(--apc-text-primary)';
    let badgeText = '';

    if (recordMatch) {
      const st = recordMatch.status;
      if (st === 'on_time' || st === 'in_buffer') {
        type = 'present';
        label = 'Present';
        bgColor = '#DCFCE7'; // Light Green
        borderColor = '#86EFAC';
        textColor = '#14532D';
        badgeText = st === 'in_buffer' ? 'In Buffer' : 'On Time';
        presentCount++;
      } else if (st === 'late' || st === 'half_day') {
        type = 'late';
        label = st === 'half_day' ? 'Half Day' : 'Late';
        bgColor = '#FEF3C7'; // Light Amber
        borderColor = '#FCD34D';
        textColor = '#78350F';
        badgeText = st === 'half_day' ? 'Half Day' : 'Late';
        lateCount++;
      } else if (st === 'on_leave') {
        type = 'leave';
        label = 'Leave';
        bgColor = '#E0E7FF'; // Light Indigo/Blue
        borderColor = '#A5B4FC';
        textColor = '#3730A3';
        badgeText = 'Leave';
        leaveCount++;
      } else if (st === 'absent') {
        type = 'absent';
        label = 'Absent';
        bgColor = '#FEE2E2'; // Light Red
        borderColor = '#FCA5A5';
        textColor = '#7F1D1D';
        badgeText = 'Absent';
        absentCount++;
      }

      // Calculate minutes worked if both punch in & out exist
      if (recordMatch.punchInTime && recordMatch.punchOutTime) {
        try {
          const [h1, m1] = recordMatch.punchInTime.split(':').map(Number);
          const [h2, m2] = recordMatch.punchOutTime.split(':').map(Number);
          let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
          if (diff > 0) totalMinutesWorked += diff;
        } catch (e) {
          // ignore
        }
      }
    } else if (leaveMatch) {
      type = 'leave';
      label = leaveMatch.leaveType || 'Approved Leave';
      bgColor = '#E0E7FF';
      borderColor = '#A5B4FC';
      textColor = '#3730A3';
      badgeText = leaveMatch.leaveType;
      leaveCount++;
    } else if (holidayMatch) {
      type = 'holiday';
      label = holidayMatch.label;
      bgColor = '#F3E8FF'; // Light Purple
      borderColor = '#D8B4FE';
      textColor = '#581C87';
      badgeText = `Holiday: ${holidayMatch.label}`;
      holidayCount++;
    } else if (isWeeklyOff) {
      type = 'weekly_off';
      label = 'Weekly Off';
      bgColor = '#F1F5F9'; // Soft Slate Gray
      borderColor = '#CBD5E1';
      textColor = '#475569';
      badgeText = 'Sunday Off';
      holidayCount++;
    } else if (isToday) {
      type = 'today_pending';
      label = 'Today';
      bgColor = '#FFFBEB';
      borderColor = '#F59E0B';
      textColor = '#92400E';
      badgeText = 'Not Punched Yet';
    } else if (!isFuture) {
      // Past working day with no punch and no approved leave -> ABSENT
      type = 'absent';
      label = 'Absent';
      bgColor = '#FEE2E2'; // Light Red
      borderColor = '#FCA5A5';
      textColor = '#7F1D1D';
      badgeText = 'Absent';
      absentCount++;
    } else {
      type = 'future';
      label = '';
      bgColor = 'var(--apc-surface)';
      borderColor = 'var(--apc-border)';
      textColor = 'var(--apc-text-secondary)';
    }

    dayDetailsMap[d] = {
      day: d,
      dateStr,
      dateObj,
      type,
      label,
      bgColor,
      borderColor,
      textColor,
      badgeText,
      record: recordMatch,
      holiday: holidayMatch,
      leave: leaveMatch,
      isWeeklyOff,
      isToday,
      isFuture
    };
  }

  const totalHoursWorked = (totalMinutesWorked / 60).toFixed(1);

  // Open Day Detail and initialize editor state
  const handleOpenDayModal = (info) => {
    setSelectedDayDetail(info);
    setIsEditing(false);
    setOverrideFeedback(null);

    if (info.record) {
      setEditStatus(info.record.status || 'on_time');
      setEditPunchIn(info.record.punchInTime ? info.record.punchInTime.slice(0, 5) : '10:00');
      setEditPunchOut(info.record.punchOutTime ? info.record.punchOutTime.slice(0, 5) : '18:30');
      setEditShiftType(info.record.shiftType || 'full_day');
      setEditReason(info.record.adminOverrideReason || info.record.lateReason || '');
    } else if (info.type === 'absent') {
      setEditStatus('on_time');
      setEditPunchIn('10:00');
      setEditPunchOut('18:30');
      setEditShiftType('full_day');
      setEditReason('Forgot punch / System downtime - Admin manual approval');
    } else {
      setEditStatus('on_time');
      setEditPunchIn('10:00');
      setEditPunchOut('18:30');
      setEditShiftType('full_day');
      setEditReason('');
    }
  };

  // 1-Click Quick Override action for Admin
  const handleQuickOverride = async (statusPreset, defaultIn, defaultOut, defaultShift, defaultReason) => {
    if (!activeEmpId || !selectedDayDetail) return;
    setSavingOverride(true);
    setOverrideFeedback(null);
    try {
      const res = await apiFetch('/admin/attendance/override', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: activeEmpId,
          date: selectedDayDetail.dateStr,
          status: statusPreset,
          punchInTime: defaultIn,
          punchOutTime: defaultOut,
          shiftType: defaultShift || 'full_day',
          reason: defaultReason || `Admin manual override to ${statusPreset}`
        })
      });

      setOverrideFeedback({ type: 'success', text: res.message || 'Updated successfully!' });
      await fetchMonthData(currentYear, currentMonth, activeEmpId);

      if (res.record) {
        setSelectedDayDetail(prev => ({
          ...prev,
          type: statusPreset === 'on_time' || statusPreset === 'in_buffer' ? 'present' : (statusPreset === 'late' || statusPreset === 'half_day' ? 'late' : statusPreset),
          record: res.record,
          badgeText: statusPreset.replace('_', ' ').toUpperCase()
        }));
      } else if (statusPreset === 'clear') {
        setSelectedDayDetail(null);
      }
      setIsEditing(false);
    } catch (err) {
      setOverrideFeedback({ type: 'error', text: err.message || 'Failed to update attendance' });
    } finally {
      setSavingOverride(false);
    }
  };

  // Custom Form Save
  const handleSaveCustomOverride = async (e) => {
    if (e) e.preventDefault();
    if (!activeEmpId || !selectedDayDetail) return;
    setSavingOverride(true);
    setOverrideFeedback(null);

    const isNoPunchStatus = editStatus === 'absent' || editStatus === 'on_leave' || editStatus === 'clear';

    try {
      const res = await apiFetch('/admin/attendance/override', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: activeEmpId,
          date: selectedDayDetail.dateStr,
          status: editStatus,
          punchInTime: isNoPunchStatus ? null : editPunchIn,
          punchOutTime: isNoPunchStatus ? null : editPunchOut,
          shiftType: editShiftType,
          reason: editReason || 'Admin Manual Override'
        })
      });

      setOverrideFeedback({ type: 'success', text: res.message || 'Saved successfully!' });
      await fetchMonthData(currentYear, currentMonth, activeEmpId);

      if (res.record) {
        setSelectedDayDetail(prev => ({
          ...prev,
          type: editStatus === 'on_time' || editStatus === 'in_buffer' ? 'present' : (editStatus === 'late' || editStatus === 'half_day' ? 'late' : editStatus),
          record: res.record,
          badgeText: editStatus.replace('_', ' ').toUpperCase()
        }));
      } else if (editStatus === 'clear') {
        setSelectedDayDetail(null);
      }
      setIsEditing(false);
    } catch (err) {
      setOverrideFeedback({ type: 'error', text: err.message || 'Failed to save changes' });
    } finally {
      setSavingOverride(false);
    }
  };

  return (
    <div className="apc-attendance-calendar-wrapper">
      {/* Calendar Header Card */}
      <div className="apc-card" style={{ marginBottom: '1.25rem', padding: '1.25rem' }}>
        
        {/* Admin Employee Selector Bar (Shown for super_admin) */}
        {isAdmin && employeeList.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: 'var(--apc-bg)', borderRadius: '6px', border: '1px solid var(--apc-border)', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={16} color="var(--apc-primary)" />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Viewing Attendance Calendar For:</span>
            </div>
            <select
              className="apc-select"
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem', minWidth: '240px' }}
            >
              <option value={authUser?.id}>👤 Me ({authUser?.fullName || authUser?.firstName} - Admin)</option>
              {employeeList.filter(e => e.id !== authUser?.id).map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} ({emp.id}) · {emp.department}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Navigation Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CalendarIcon size={22} color="var(--apc-primary)" />
            <div>
              <h2 style={{ fontSize: '1.3rem', margin: 0, fontWeight: 700 }}>
                {monthNames[currentMonth]} {currentYear}
              </h2>
              <span style={{ fontSize: '0.78rem', color: 'var(--apc-text-secondary)' }}>
                Employee: <strong>{activeEmpName}</strong> ({activeEmpId})
                {isAdmin && (
                  <span style={{ marginLeft: '8px', color: 'var(--apc-primary-dark)', fontWeight: 600, background: 'rgba(245, 166, 35, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                    Admin Edit Enabled ✏️ (Click any day to change status)
                  </span>
                )}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={handlePrevMonth}
              className="apc-btn apc-btn-secondary apc-btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0.4rem 0.75rem' }}
              title="Previous Month"
            >
              <ChevronLeft size={16} /> Prev Month
            </button>

            <button
              onClick={handleGoToCurrentMonth}
              className="apc-btn apc-btn-secondary apc-btn-sm"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
            >
              Current Month
            </button>

            <button
              onClick={handleNextMonth}
              className="apc-btn apc-btn-secondary apc-btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0.4rem 0.75rem' }}
              title="Next Month"
            >
              Next Month <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Monthly Attendance Analytics Overview */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.6rem', marginBottom: '1rem' }}>
          {/* Present */}
          <div style={{ padding: '0.65rem 0.5rem', background: '#DCFCE7', borderRadius: '8px', border: '1px solid #86EFAC', textAlign: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: '#14532D', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>PRESENT</span>
            <strong style={{ fontSize: '1.25rem', color: '#15803D' }}>{presentCount}</strong>
            <span style={{ fontSize: '0.68rem', color: '#166534', display: 'block' }}>Days On Time</span>
          </div>

          {/* Late / Half Day */}
          <div style={{ padding: '0.65rem 0.5rem', background: '#FEF3C7', borderRadius: '8px', border: '1px solid #FCD34D', textAlign: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: '#78350F', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>LATE / BUFFER</span>
            <strong style={{ fontSize: '1.25rem', color: '#B45309' }}>{lateCount}</strong>
            <span style={{ fontSize: '0.68rem', color: '#92400E', display: 'block' }}>Days</span>
          </div>

          {/* Leaves */}
          <div style={{ padding: '0.65rem 0.5rem', background: '#E0E7FF', borderRadius: '8px', border: '1px solid #A5B4FC', textAlign: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: '#3730A3', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>LEAVES</span>
            <strong style={{ fontSize: '1.25rem', color: '#4F46E5' }}>{leaveCount}</strong>
            <span style={{ fontSize: '0.68rem', color: '#4338CA', display: 'block' }}>Approved Days</span>
          </div>

          {/* Holidays & Offs */}
          <div style={{ padding: '0.65rem 0.5rem', background: '#F3E8FF', borderRadius: '8px', border: '1px solid #D8B4FE', textAlign: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: '#581C87', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>OFF / HOLIDAY</span>
            <strong style={{ fontSize: '1.25rem', color: '#7E22CE' }}>{holidayCount}</strong>
            <span style={{ fontSize: '0.68rem', color: '#6B21A8', display: 'block' }}>Weekly Offs</span>
          </div>

          {/* Absent */}
          <div style={{ padding: '0.65rem 0.5rem', background: '#FEE2E2', borderRadius: '8px', border: '1px solid #FCA5A5', textAlign: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: '#7F1D1D', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>ABSENT</span>
            <strong style={{ fontSize: '1.25rem', color: '#B91C1C' }}>{absentCount}</strong>
            <span style={{ fontSize: '0.68rem', color: '#991B1B', display: 'block' }}>Unrecorded</span>
          </div>

          {/* Total Worked Hours */}
          <div style={{ padding: '0.65rem 0.5rem', background: 'var(--apc-bg)', borderRadius: '8px', border: '1px solid var(--apc-border)', textAlign: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--apc-text-secondary)', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>WORKED TIME</span>
            <strong style={{ fontSize: '1.25rem', color: 'var(--apc-text-primary)' }}>{totalHoursWorked}h</strong>
            <span style={{ fontSize: '0.68rem', color: 'var(--apc-text-secondary)', display: 'block' }}>Total Recorded</span>
          </div>
        </div>

        {/* Color Legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', padding: '0.6rem 0.85rem', background: 'var(--apc-bg)', borderRadius: '6px', border: '1px solid var(--apc-border)', fontSize: '0.78rem' }}>
          <span style={{ fontWeight: 600, color: 'var(--apc-text-secondary)' }}>Color Legend:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#DCFCE7', border: '1px solid #86EFAC', display: 'inline-block' }}></span>
            <span>Present / On Time (Light Green)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#FEF3C7', border: '1px solid #FCD34D', display: 'inline-block' }}></span>
            <span>Late / Half Day (Amber)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#E0E7FF', border: '1px solid #A5B4FC', display: 'inline-block' }}></span>
            <span>Leave (Blue)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#F3E8FF', border: '1px solid #D8B4FE', display: 'inline-block' }}></span>
            <span>Holiday / Sunday (Purple)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#FEE2E2', border: '1px solid #FCA5A5', display: 'inline-block' }}></span>
            <span>Absent (Light Red)</span>
          </div>
          {isAdmin && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginLeft: 'auto', color: 'var(--apc-primary-dark)', fontWeight: 600 }}>
              <Edit3 size={12} />
              <span>Admin: Click any day to edit status</span>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Calendar Grid */}
      <div className="apc-card" style={{ padding: '1rem', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--apc-text-secondary)' }}>
            <RefreshCw size={24} className="spin" style={{ marginBottom: '8px', display: 'inline-block' }} />
            <div>Loading {monthNames[currentMonth]} {currentYear} attendance records...</div>
          </div>
        ) : (
          <div style={{ minWidth: '600px' }}>
            {/* Days of Week Header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', marginBottom: '6px', textAlign: 'center' }}>
              {daysOfWeek.map((day, idx) => (
                <div
                  key={day}
                  style={{
                    padding: '0.45rem',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    color: idx === 0 ? 'var(--apc-danger, #EF4444)' : 'var(--apc-text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Cells Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
              {/* Empty padding cells for days before month start */}
              {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                <div
                  key={`pad-${idx}`}
                  style={{
                    minHeight: '85px',
                    background: 'transparent',
                    opacity: 0.25,
                    borderRadius: '8px'
                  }}
                />
              ))}

              {/* Month Day Cells */}
              {Array.from({ length: totalDaysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const info = dayDetailsMap[dayNum];
                if (!info) return null;

                const isClickable = isAdmin || info.record || info.leave || info.holiday || info.type === 'absent' || info.isToday;
                const isManuallyOverridden = info.record?.isManualOverride;

                return (
                  <div
                    key={`day-${dayNum}`}
                    onClick={() => isClickable && handleOpenDayModal(info)}
                    style={{
                      minHeight: '85px',
                      padding: '0.5rem 0.45rem',
                      background: info.bgColor,
                      border: `1.5px solid ${info.isToday ? '#F59E0B' : info.borderColor}`,
                      borderRadius: '8px',
                      cursor: isClickable ? 'pointer' : 'default',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                      position: 'relative',
                      boxShadow: info.isToday ? '0 0 0 2px rgba(245, 158, 11, 0.4)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (isClickable) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (isClickable) {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = info.isToday ? '0 0 0 2px rgba(245, 158, 11, 0.4)' : 'none';
                      }
                    }}
                  >
                    {/* Day Number, Today Tag & Override Indicator */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          color: info.textColor
                        }}
                      >
                        {dayNum}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        {isManuallyOverridden && (
                          <span
                            title={`Admin Override: ${info.record.adminOverrideReason || 'Manual adjustment'}`}
                            style={{
                              background: '#3B82F6',
                              color: '#FFFFFF',
                              fontSize: '0.58rem',
                              fontWeight: 700,
                              padding: '1px 4px',
                              borderRadius: '3px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px'
                            }}
                          >
                            <ShieldCheck size={9} /> Override
                          </span>
                        )}
                        {info.isToday && (
                          <span
                            style={{
                              background: '#F59E0B',
                              color: '#FFFFFF',
                              fontSize: '0.62rem',
                              fontWeight: 700,
                              padding: '1px 5px',
                              borderRadius: '4px',
                              textTransform: 'uppercase'
                            }}
                          >
                            Today
                          </span>
                        )}
                        {isAdmin && (
                          <span className="admin-edit-hint" style={{ opacity: 0.5, fontSize: '0.65rem' }}>
                            <Edit3 size={11} color={info.textColor} />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status Content */}
                    <div style={{ marginTop: '0.3rem', fontSize: '0.72rem' }}>
                      {info.type === 'present' && (
                        <div>
                          <span style={{ fontWeight: 700, color: '#15803D', display: 'block' }}>
                            ✓ {info.badgeText}
                          </span>
                          <span style={{ color: '#166534', fontSize: '0.68rem', display: 'block' }}>
                            In: {info.record?.punchInTime?.slice(0, 5) || '10:00'}
                          </span>
                          {info.record?.punchOutTime && (
                            <span style={{ color: '#166534', fontSize: '0.68rem', display: 'block' }}>
                              Out: {info.record.punchOutTime?.slice(0, 5)}
                            </span>
                          )}
                        </div>
                      )}

                      {info.type === 'late' && (
                        <div>
                          <span style={{ fontWeight: 700, color: '#B45309', display: 'block' }}>
                            ⚠️ {info.badgeText}
                          </span>
                          <span style={{ color: '#92400E', fontSize: '0.68rem', display: 'block' }}>
                            In: {info.record?.punchInTime?.slice(0, 5) || '10:45'}
                          </span>
                          {info.record?.punchOutTime && (
                            <span style={{ color: '#92400E', fontSize: '0.68rem', display: 'block' }}>
                              Out: {info.record.punchOutTime?.slice(0, 5)}
                            </span>
                          )}
                        </div>
                      )}

                      {info.type === 'leave' && (
                        <div>
                          <span style={{ fontWeight: 700, color: '#4338CA', display: 'block' }}>
                            🏖️ Leave
                          </span>
                          <span style={{ color: '#4338CA', fontSize: '0.66rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {info.badgeText}
                          </span>
                        </div>
                      )}

                      {info.type === 'holiday' && (
                        <div>
                          <span style={{ fontWeight: 700, color: '#6B21A8', display: 'block' }}>
                            🎉 Holiday
                          </span>
                          <span style={{ color: '#6B21A8', fontSize: '0.66rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {info.holiday?.label}
                          </span>
                        </div>
                      )}

                      {info.type === 'weekly_off' && (
                        <div style={{ color: '#64748B', fontWeight: 600 }}>
                          🌴 Weekly Off
                        </div>
                      )}

                      {info.type === 'absent' && (
                        <div style={{ color: '#DC2626', fontWeight: 700 }}>
                          ✕ Absent
                        </div>
                      )}

                      {info.type === 'today_pending' && !info.record && (
                        <div style={{ color: '#D97706', fontWeight: 600, fontSize: '0.68rem' }}>
                          Pending Punch
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* DAY DETAIL & ADMIN OVERRIDE POPUP MODAL */}
      {selectedDayDetail && (
        <div className="apc-modal-overlay" onClick={() => setSelectedDayDetail(null)}>
          <div
            className="apc-modal"
            style={{ maxWidth: '540px', width: '92%', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--apc-border)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', margin: 0 }}>
                  {selectedDayDetail.dateObj.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </h3>
                <span style={{ fontSize: '0.82rem', color: 'var(--apc-text-secondary)' }}>
                  Date: <strong>{selectedDayDetail.dateStr}</strong> · {activeEmpName} ({activeEmpId})
                </span>
              </div>
              <button
                onClick={() => setSelectedDayDetail(null)}
                className="apc-btn apc-btn-secondary"
                style={{ padding: '0.3rem 0.5rem' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Feedback Alert if any */}
            {overrideFeedback && (
              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: '6px',
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: overrideFeedback.type === 'success' ? '#DCFCE7' : '#FEE2E2',
                  border: `1px solid ${overrideFeedback.type === 'success' ? '#86EFAC' : '#FCA5A5'}`,
                  color: overrideFeedback.type === 'success' ? '#14532D' : '#7F1D1D'
                }}
              >
                {overrideFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{overrideFeedback.text}</span>
              </div>
            )}

            {/* Current Status overview */}
            <div
              style={{
                padding: '0.85rem',
                background: selectedDayDetail.bgColor,
                border: `1px solid ${selectedDayDetail.borderColor}`,
                borderRadius: '8px',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <span style={{ fontSize: '0.78rem', color: selectedDayDetail.textColor, textTransform: 'uppercase', fontWeight: 600 }}>
                  CURRENT ATTENDANCE STATUS
                </span>
                <h4 style={{ margin: '2px 0 0 0', color: selectedDayDetail.textColor, fontSize: '1.15rem' }}>
                  {selectedDayDetail.badgeText || selectedDayDetail.label || 'No Record'}
                </h4>
              </div>
              {selectedDayDetail.record && (
                <StatusBadge status={selectedDayDetail.record.status} />
              )}
            </div>

            {/* Admin Override Alert Notification */}
            {selectedDayDetail.record?.isManualOverride && (
              <div style={{ padding: '0.75rem', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.82rem', color: '#1E40AF' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, marginBottom: '2px' }}>
                  <ShieldCheck size={16} color="#2563EB" />
                  <span>Admin Manual Override Applied</span>
                </div>
                <p style={{ margin: '2px 0 0 0' }}>
                  <strong>Modified by:</strong> {selectedDayDetail.record.adminOverrideBy || 'Super Admin'}
                  {selectedDayDetail.record.adminOverrideAt ? ` on ${new Date(selectedDayDetail.record.adminOverrideAt).toLocaleDateString()}` : ''}
                </p>
                {selectedDayDetail.record.adminOverrideReason && (
                  <p style={{ margin: '4px 0 0 0', color: '#1D4ED8' }}>
                    <strong>Note:</strong> {selectedDayDetail.record.adminOverrideReason}
                  </p>
                )}
              </div>
            )}

            {/* ADMIN ACTIONS & OVERRIDE PANEL (Only for Super Admin) */}
            {isAdmin && (
              <div style={{ marginBottom: '1.25rem', padding: '0.85rem', background: 'var(--apc-bg)', borderRadius: '8px', border: '1px solid var(--apc-primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Edit3 size={16} color="var(--apc-primary)" />
                    <strong style={{ fontSize: '0.9rem', color: 'var(--apc-text-primary)' }}>
                      Admin Override & Corrections
                    </strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditing(!isEditing)}
                    className="apc-btn apc-btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '0.25rem 0.6rem' }}
                  >
                    {isEditing ? 'Hide Custom Editor' : 'Custom Times / Details'}
                  </button>
                </div>

                {/* 1-Click Quick Presets */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: isEditing ? '0.85rem' : '0' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--apc-text-secondary)', fontWeight: 600 }}>1-CLICK QUICK OVERRIDE PRESETS:</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.45rem' }}>
                    
                    {/* Mark Present */}
                    <button
                      type="button"
                      disabled={savingOverride}
                      onClick={() => handleQuickOverride('on_time', '10:00:00', '18:30:00', 'full_day', 'Marked Present by Admin')}
                      className="apc-btn"
                      style={{ background: '#DCFCE7', color: '#14532D', border: '1px solid #86EFAC', padding: '0.4rem 0.5rem', fontSize: '0.78rem', fontWeight: 700, justifyContent: 'center' }}
                    >
                      <Check size={14} /> Mark Present (Full)
                    </button>

                    {/* Mark Late */}
                    <button
                      type="button"
                      disabled={savingOverride}
                      onClick={() => handleQuickOverride('late', '10:45:00', '18:30:00', 'full_day', 'Marked Late by Admin')}
                      className="apc-btn"
                      style={{ background: '#FEF3C7', color: '#78350F', border: '1px solid #FCD34D', padding: '0.4rem 0.5rem', fontSize: '0.78rem', fontWeight: 700, justifyContent: 'center' }}
                    >
                      <Clock size={14} /> Mark Late
                    </button>

                    {/* Mark Half Day */}
                    <button
                      type="button"
                      disabled={savingOverride}
                      onClick={() => handleQuickOverride('half_day', '13:00:00', '18:30:00', 'second_half', 'Marked Half Day by Admin')}
                      className="apc-btn"
                      style={{ background: '#FFEDD5', color: '#9A3412', border: '1px solid #FDBA74', padding: '0.4rem 0.5rem', fontSize: '0.78rem', fontWeight: 700, justifyContent: 'center' }}
                    >
                      <Clock size={14} /> Mark Half Day
                    </button>

                    {/* Mark Leave */}
                    <button
                      type="button"
                      disabled={savingOverride}
                      onClick={() => handleQuickOverride('on_leave', null, null, 'full_day', 'Approved Leave by Admin')}
                      className="apc-btn"
                      style={{ background: '#E0E7FF', color: '#3730A3', border: '1px solid #A5B4FC', padding: '0.4rem 0.5rem', fontSize: '0.78rem', fontWeight: 700, justifyContent: 'center' }}
                    >
                      🏖️ Mark Leave
                    </button>

                    {/* Mark Absent */}
                    <button
                      type="button"
                      disabled={savingOverride}
                      onClick={() => handleQuickOverride('absent', null, null, 'full_day', 'Marked Absent by Admin')}
                      className="apc-btn"
                      style={{ background: '#FEE2E2', color: '#7F1D1D', border: '1px solid #FCA5A5', padding: '0.4rem 0.5rem', fontSize: '0.78rem', fontWeight: 700, justifyContent: 'center' }}
                    >
                      ✕ Mark Absent
                    </button>

                    {/* Clear / Reset */}
                    {selectedDayDetail.record && (
                      <button
                        type="button"
                        disabled={savingOverride}
                        onClick={() => {
                          if (window.confirm('Are you sure you want to clear/reset this attendance record?')) {
                            handleQuickOverride('clear', null, null, 'full_day', 'Record cleared by Admin');
                          }
                        }}
                        className="apc-btn apc-btn-secondary"
                        style={{ padding: '0.4rem 0.5rem', fontSize: '0.78rem', justifyContent: 'center', color: 'var(--apc-danger)' }}
                      >
                        <Trash2 size={13} /> Clear Record
                      </button>
                    )}
                  </div>
                </div>

                {/* Detailed Custom Editor Form */}
                {isEditing && (
                  <form onSubmit={handleSaveCustomOverride} style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px dashed var(--apc-border)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '0.65rem' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '3px' }}>
                          Status
                        </label>
                        <select
                          className="apc-select"
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          style={{ padding: '0.35rem 0.5rem', fontSize: '0.82rem', width: '100%' }}
                        >
                          <option value="on_time">Present (On Time)</option>
                          <option value="in_buffer">Present (In Buffer)</option>
                          <option value="late">Late Arrival</option>
                          <option value="half_day">Half Day / Second Half</option>
                          <option value="on_leave">Approved Leave</option>
                          <option value="absent">Absent / Unrecorded</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '3px' }}>
                          Shift Type
                        </label>
                        <select
                          className="apc-select"
                          value={editShiftType}
                          onChange={(e) => setEditShiftType(e.target.value)}
                          style={{ padding: '0.35rem 0.5rem', fontSize: '0.82rem', width: '100%' }}
                        >
                          <option value="full_day">Full Day</option>
                          <option value="second_half">Second Half / Afternoon</option>
                        </select>
                      </div>
                    </div>

                    {editStatus !== 'absent' && editStatus !== 'on_leave' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '0.65rem' }}>
                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '3px' }}>
                            Punch In Time
                          </label>
                          <input
                            type="time"
                            className="apc-input"
                            value={editPunchIn}
                            onChange={(e) => setEditPunchIn(e.target.value)}
                            style={{ padding: '0.35rem 0.5rem', fontSize: '0.82rem' }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '3px' }}>
                            Punch Out Time
                          </label>
                          <input
                            type="time"
                            className="apc-input"
                            value={editPunchOut}
                            onChange={(e) => setEditPunchOut(e.target.value)}
                            style={{ padding: '0.35rem 0.5rem', fontSize: '0.82rem' }}
                          />
                        </div>
                      </div>
                    )}

                    <div style={{ marginBottom: '0.85rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '3px' }}>
                        Admin Reason / Note
                      </label>
                      <input
                        type="text"
                        className="apc-input"
                        placeholder="e.g. Employee forgot punch / System downtime / Client site duty"
                        value={editReason}
                        onChange={(e) => setEditReason(e.target.value)}
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.82rem' }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="apc-btn apc-btn-secondary"
                        style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingOverride}
                        className="apc-btn apc-btn-primary"
                        style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem' }}
                      >
                        <Save size={14} /> {savingOverride ? 'Saving...' : 'Save Override'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Detailed Info for Regular Days */}
            {selectedDayDetail.record ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Punch In Details */}
                <div style={{ padding: '0.75rem', background: 'var(--apc-bg)', borderRadius: '6px', border: '1px solid var(--apc-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: 'var(--apc-text-primary)', fontSize: '0.9rem' }}>
                      🟢 Punch In:
                    </span>
                    <strong style={{ fontSize: '1rem', fontFamily: 'monospace' }}>
                      {selectedDayDetail.record.punchInTime || 'Not Recorded'}
                    </strong>
                  </div>
                  {selectedDayDetail.record.punchInLocation && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: 'var(--apc-text-secondary)', marginTop: '4px' }}>
                      <MapPin size={13} /> {selectedDayDetail.record.punchInLocation}
                    </div>
                  )}
                  {selectedDayDetail.record.lateReason && (
                    <div style={{ marginTop: '6px', padding: '6px 8px', background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '4px', fontSize: '0.8rem', color: '#92400E' }}>
                      <strong>Late Reason / Remarks:</strong> {selectedDayDetail.record.lateReason}
                    </div>
                  )}
                  {selectedDayDetail.record.punchInPhotoUrl && (
                    <div style={{ marginTop: '8px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--apc-text-secondary)', display: 'block', marginBottom: '4px' }}>Punch In Selfie:</span>
                      <img
                        src={getPhotoUrl(selectedDayDetail.record.punchInPhotoUrl)}
                        alt="Punch In Selfie"
                        style={{ width: '100%', maxHeight: '160px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--apc-border)' }}
                      />
                    </div>
                  )}
                </div>

                {/* Punch Out Details */}
                <div style={{ padding: '0.75rem', background: 'var(--apc-bg)', borderRadius: '6px', border: '1px solid var(--apc-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: 'var(--apc-text-primary)', fontSize: '0.9rem' }}>
                      🔴 Punch Out:
                    </span>
                    <strong style={{ fontSize: '1rem', fontFamily: 'monospace' }}>
                      {selectedDayDetail.record.punchOutTime || 'Not Punched Out'}
                    </strong>
                  </div>
                  {selectedDayDetail.record.punchOutLocation && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: 'var(--apc-text-secondary)', marginTop: '4px' }}>
                      <MapPin size={13} /> {selectedDayDetail.record.punchOutLocation}
                    </div>
                  )}
                  {selectedDayDetail.record.punchOutPhotoUrl && (
                    <div style={{ marginTop: '8px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--apc-text-secondary)', display: 'block', marginBottom: '4px' }}>Punch Out Selfie:</span>
                      <img
                        src={getPhotoUrl(selectedDayDetail.record.punchOutPhotoUrl)}
                        alt="Punch Out Selfie"
                        style={{ width: '100%', maxHeight: '160px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--apc-border)' }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : selectedDayDetail.leave ? (
              <div style={{ padding: '0.85rem', background: 'var(--apc-bg)', borderRadius: '6px', border: '1px solid var(--apc-border)' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--apc-primary-dark)' }}>{selectedDayDetail.leave.leaveType}</h4>
                <p style={{ fontSize: '0.85rem', margin: '0 0 0.25rem 0' }}>
                  <strong>Duration:</strong> {selectedDayDetail.leave.startDate} to {selectedDayDetail.leave.endDate}
                </p>
                <p style={{ fontSize: '0.85rem', margin: '0', color: 'var(--apc-text-secondary)' }}>
                  <strong>Reason:</strong> {selectedDayDetail.leave.reason || 'No reason provided'}
                </p>
              </div>
            ) : selectedDayDetail.holiday ? (
              <div style={{ padding: '0.85rem', background: 'var(--apc-bg)', borderRadius: '6px', border: '1px solid var(--apc-border)' }}>
                <h4 style={{ margin: '0 0 0.25rem 0', color: '#6B21A8' }}>{selectedDayDetail.holiday.label}</h4>
                <p style={{ fontSize: '0.85rem', margin: 0, color: 'var(--apc-text-secondary)' }}>
                  Official AP Corporation Office Holiday.
                </p>
              </div>
            ) : selectedDayDetail.type === 'absent' ? (
              <div style={{ padding: '0.85rem', background: '#FEE2E2', borderRadius: '6px', border: '1px solid #FCA5A5', color: '#7F1D1D' }}>
                <p style={{ margin: 0, fontSize: '0.88rem' }}>
                  No punch record or approved leave was logged for this regular working day.
                </p>
                {isAdmin && (
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', fontWeight: 600 }}>
                    💡 Tip: Click "Mark Present (Full)" above to immediately convert this absence to Present.
                  </p>
                )}
              </div>
            ) : (
              <div style={{ padding: '0.85rem', background: 'var(--apc-bg)', borderRadius: '6px', border: '1px solid var(--apc-border)', color: 'var(--apc-text-secondary)', fontSize: '0.88rem' }}>
                {selectedDayDetail.label || 'No scheduled activity.'}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button
                type="button"
                onClick={() => setSelectedDayDetail(null)}
                className="apc-btn apc-btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
