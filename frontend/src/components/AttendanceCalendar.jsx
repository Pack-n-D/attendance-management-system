import React, { useState, useEffect } from 'react';
import { apiFetch, getPhotoUrl } from '../utils/api';
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
  Coffee,
  AlertTriangle
} from 'lucide-react';

export default function AttendanceCalendar({ user, currentRule }) {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed (0 = Jan, 8 = Sep)
  const [records, setRecords] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDayDetail, setSelectedDayDetail] = useState(null);

  // Month Names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  useEffect(() => {
    fetchMonthData(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  const fetchMonthData = async (year, month) => {
    setLoading(true);
    try {
      // Calculate start and end date for the month
      const startDay = '01';
      const lastDate = new Date(year, month + 1, 0).getDate();
      const monthStr = String(month + 1).padStart(2, '0');
      const startDate = `${year}-${monthStr}-${startDay}`;
      const endDate = `${year}-${monthStr}-${String(lastDate).padStart(2, '0')}`;

      const [recRes, holRes, leaveRes] = await Promise.all([
        apiFetch(`/attendance/log?startDate=${startDate}&endDate=${endDate}`).catch(() => ({ records: [] })),
        apiFetch('/settings/holidays').catch(() => ({ holidays: [] })),
        apiFetch('/employee/leave-requests').catch(() => ({ leaveRequests: [] }))
      ]);

      setRecords(recRes.records || []);
      setHolidays(holRes.holidays || []);
      setLeaveRequests((leaveRes.leaveRequests || []).filter(r => r.status === 'approved'));
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

    // Check record
    const recordMatch = records.find(r => r.date === dateStr);

    let type = 'future'; // 'present', 'late', 'leave', 'holiday', 'weekly_off', 'absent', 'future', 'not_punched_yet'
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
        badgeText = 'On Time';
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

  return (
    <div className="apc-attendance-calendar-wrapper">
      {/* Calendar Header Card */}
      <div className="apc-card" style={{ marginBottom: '1.25rem', padding: '1.25rem' }}>
        {/* Navigation Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CalendarIcon size={22} color="var(--apc-primary)" />
            <h2 style={{ fontSize: '1.3rem', margin: 0, fontWeight: 700 }}>
              {monthNames[currentMonth]} {currentYear}
            </h2>
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
        </div>
      </div>

      {/* Interactive Calendar Grid */}
      <div className="apc-card" style={{ padding: '1rem', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--apc-text-secondary)' }}>
            Loading {monthNames[currentMonth]} {currentYear} attendance records...
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

                const isClickable = info.record || info.leave || info.holiday || info.type === 'absent' || info.isToday;

                return (
                  <div
                    key={`day-${dayNum}`}
                    onClick={() => isClickable && setSelectedDayDetail(info)}
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
                    {/* Day Number & Today Tag */}
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
                    </div>

                    {/* Status Content */}
                    <div style={{ marginTop: '0.3rem', fontSize: '0.72rem' }}>
                      {info.type === 'present' && (
                        <div>
                          <span style={{ fontWeight: 700, color: '#15803D', display: 'block' }}>
                            ✓ {info.badgeText}
                          </span>
                          <span style={{ color: '#166534', fontSize: '0.68rem', display: 'block' }}>
                            In: {info.record.punchInTime?.slice(0, 5)}
                          </span>
                          {info.record.punchOutTime && (
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
                            In: {info.record.punchInTime?.slice(0, 5)}
                          </span>
                          {info.record.punchOutTime && (
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

      {/* DAY DETAIL POPUP MODAL */}
      {selectedDayDetail && (
        <div className="apc-modal-overlay" onClick={() => setSelectedDayDetail(null)}>
          <div
            className="apc-modal"
            style={{ maxWidth: '480px', width: '90%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
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
                  Date: {selectedDayDetail.dateStr}
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

            {/* Status overview */}
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
                  ATTENDANCE STATUS
                </span>
                <h4 style={{ margin: '2px 0 0 0', color: selectedDayDetail.textColor, fontSize: '1.1rem' }}>
                  {selectedDayDetail.badgeText || selectedDayDetail.label || 'No Record'}
                </h4>
              </div>
              {selectedDayDetail.record && (
                <StatusBadge status={selectedDayDetail.record.status} />
              )}
            </div>

            {/* Detailed Info */}
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
                      <strong>Late Reason:</strong> {selectedDayDetail.record.lateReason}
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
