/**
 * AttendanceCalendar Component for Mobile
 * Exactly recreates frontend/src/components/AttendanceCalendar.jsx layout & visual styling:
 * - Top Card: Month Header with Calendar Icon, Employee ID & Name subtitle, Navigation (< Prev, Current, Next >)
 * - 6-KPI Analytics Grid: Present (Green), Late / Buffer (Amber), Leaves (Blue), Off / Holiday (Purple), Absent (Red), Worked Time (Slate)
 * - Color Legend Strip with swatches
 * - Bottom Card: 7-column calendar matrix with Red SUN header, Day numbers, TODAY badge, and exact status pills
 * - Day Detail & Admin Override Modal
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import Card from './Card';
import Button from './Button';
import { useAuth } from '../context/AuthContext';
import { adminService } from '../services/adminService';
import { apiFetch, getPhotoUrl } from '../services/api';
import { AttendanceRecord, Holiday, LeaveRequest, Employee } from '../types';

const SCREEN_WIDTH = Dimensions.get('window').width;
// Table cell width for 7-column grid
const CELL_WIDTH = 86;
const CELL_HEIGHT = 88;
const CALENDAR_MIN_WIDTH = CELL_WIDTH * 7 + 12;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface AttendanceCalendarProps {
  initialEmployeeId?: string;
  readOnly?: boolean;
}

export default function AttendanceCalendar({
  initialEmployeeId,
  readOnly = false,
}: AttendanceCalendarProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'super_admin';

  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed

  // Active employee for calendar
  const [activeEmpId, setActiveEmpId] = useState<string>(
    initialEmployeeId || user?.id || ''
  );
  const [employeeList, setEmployeeList] = useState<Employee[]>([]);
  const [showEmpPicker, setShowEmpPicker] = useState(false);

  // Data
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected Day Detail Modal
  const [selectedDay, setSelectedDay] = useState<any | null>(null);
  const [savingOverride, setSavingOverride] = useState(false);

  useEffect(() => {
    if (initialEmployeeId) {
      setActiveEmpId(initialEmployeeId);
    }
  }, [initialEmployeeId]);

  // Load employee list for Admins
  useEffect(() => {
    if (isAdmin) {
      adminService
        .getEmployees()
        .then((res) => {
          setEmployeeList(res.employees || []);
        })
        .catch(() => {});
    }
  }, [isAdmin]);

  const loadMonthData = useCallback(async () => {
    setLoading(true);
    try {
      const year = currentYear;
      const month = currentMonth;
      const startDay = '01';
      const lastDate = new Date(year, month + 1, 0).getDate();
      const monthStr = String(month + 1).padStart(2, '0');
      const startDate = `${year}-${monthStr}-${startDay}`;
      const endDate = `${year}-${monthStr}-${String(lastDate).padStart(2, '0')}`;

      const targetEmp = activeEmpId || user?.id || '';

      const [logRes, holRes, leaveRes] = await Promise.all([
        apiFetch<{ records: AttendanceRecord[] }>(
          `/attendance/log?startDate=${startDate}&endDate=${endDate}&employeeId=${targetEmp}`
        ).catch(() => ({ records: [] })),
        apiFetch<{ holidays: Holiday[] }>('/settings/holidays').catch(() => ({ holidays: [] })),
        apiFetch<{ leaveRequests: LeaveRequest[] }>('/employee/leave-requests').catch(() => ({ leaveRequests: [] })),
      ]);

      const fetchedRecords: AttendanceRecord[] = (logRes.records || []).filter(
        (r: AttendanceRecord) => !targetEmp || r.employeeId === targetEmp
      );
      const fetchedHolidays: Holiday[] = holRes.holidays || [];
      const fetchedLeaves: LeaveRequest[] = (leaveRes.leaveRequests || []).filter(
        (l: LeaveRequest) => l.status === 'approved' && (!targetEmp || l.employeeId === targetEmp)
      );

      setRecords(fetchedRecords);
      setHolidays(fetchedHolidays);
      setLeaveRequests(fetchedLeaves);
    } catch (err: any) {
      console.warn('Attendance calendar fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [currentYear, currentMonth, activeEmpId, user?.id]);

  useEffect(() => {
    loadMonthData();
  }, [loadMonthData]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleGoToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
  };

  // Matrix generation
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
  const todayYMD = today.toISOString().slice(0, 10);

  const formatYMD = (d: number) => {
    const mm = String(currentMonth + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${currentYear}-${mm}-${dd}`;
  };

  // Compute stats
  let presentCount = 0;
  let lateCount = 0;
  let leaveCount = 0;
  let holidayCount = 0;
  let absentCount = 0;
  let totalMinutesWorked = 0;

  const dayDetailsMap: Record<number, any> = {};

  for (let d = 1; d <= totalDaysInMonth; d++) {
    const dateStr = formatYMD(d);
    const dateObj = new Date(currentYear, currentMonth, d);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const isWeeklyOff = dayName === 'sunday';
    const isFuture = dateStr > todayYMD;
    const isToday = dateStr === todayYMD;

    const holidayMatch = holidays.find((h) => h.date === dateStr);
    const leaveMatch = leaveRequests.find(
      (l) => dateStr >= l.startDate && dateStr <= l.endDate
    );
    const recordMatch = records.find(
      (r) => r.date === dateStr && (!activeEmpId || r.employeeId === activeEmpId)
    );

    let type = 'future';
    let label = '';
    let bgColor = '#FFFFFF';
    let borderColor = '#E2E8F0';
    let textColor = '#2B2620';
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
        bgColor = '#E0E7FF'; // Light Blue/Indigo
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

      if (recordMatch.punchInTime && recordMatch.punchOutTime) {
        try {
          const [h1, m1] = recordMatch.punchInTime.split(':').map(Number);
          const [h2, m2] = recordMatch.punchOutTime.split(':').map(Number);
          const diff = h2 * 60 + m2 - (h1 * 60 + m1);
          if (diff > 0) totalMinutesWorked += diff;
        } catch {
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
      label = holidayMatch.name || holidayMatch.label;
      bgColor = '#F3E8FF';
      borderColor = '#D8B4FE';
      textColor = '#581C87';
      badgeText = holidayMatch.name || holidayMatch.label || 'Holiday';
      holidayCount++;
    } else if (isWeeklyOff) {
      type = 'weekly_off';
      label = 'Weekly Off';
      bgColor = '#F1F5F9';
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
      badgeText = 'Pending Punch';
    } else if (!isFuture) {
      type = 'absent';
      label = 'Absent';
      bgColor = '#FEE2E2';
      borderColor = '#FCA5A5';
      textColor = '#7F1D1D';
      badgeText = 'Absent';
      absentCount++;
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
      isFuture,
    };
  }

  const totalHoursWorked = (totalMinutesWorked / 60).toFixed(1);

  // Admin Quick Override
  const handleQuickOverride = async (
    statusPreset: string,
    punchIn: string,
    punchOut: string
  ) => {
    if (!isAdmin || !selectedDay) return;
    setSavingOverride(true);
    try {
      await apiFetch('/admin/attendance/override', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: activeEmpId,
          date: selectedDay.dateStr,
          status: statusPreset,
          punchInTime: punchIn,
          punchOutTime: punchOut,
          shiftType: 'full_day',
          reason: `Admin override on mobile to ${statusPreset}`,
        }),
      });
      Alert.alert('Updated', `Attendance marked as ${statusPreset}.`);
      await loadMonthData();
      setSelectedDay(null);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update attendance.');
    } finally {
      setSavingOverride(false);
    }
  };

  const activeEmpObj = employeeList.find((e) => e.id === activeEmpId);
  const activeEmpName = activeEmpObj
    ? `${activeEmpObj.firstName} ${activeEmpObj.lastName}`
    : (user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Employee');
  const displayEmpId = activeEmpId || user?.id || '';

  return (
    <View style={styles.container}>
      {/* Admin Employee Selector (If Admin) */}
      {isAdmin && employeeList.length > 0 && (
        <Card style={styles.adminBarCard}>
          <TouchableOpacity
            style={styles.empSelectorButton}
            onPress={() => setShowEmpPicker(true)}
          >
            <Ionicons name="people-outline" size={18} color={Colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.empSelectorLabel}>Viewing Attendance Calendar For:</Text>
              <Text style={styles.empSelectorValue} numberOfLines={1}>
                {activeEmpObj
                  ? `${activeEmpObj.firstName} ${activeEmpObj.lastName} (${activeEmpObj.id})`
                  : `Me (${user?.firstName || 'Admin'})`}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        </Card>
      )}

      {/* TOP CARD: Overview, Subtitle, Navigation, KPI Metrics & Legend */}
      <Card style={styles.overviewCard}>
        {/* Header Row: Calendar Icon, Month/Year Title, Employee Subtitle */}
        <View style={styles.headerInfoRow}>
          <Ionicons name="calendar-outline" size={26} color="#F59E0B" style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.monthTitle}>
              {MONTH_NAMES[currentMonth]} {currentYear}
            </Text>
            <Text style={styles.employeeSubtitle}>
              Employee: <Text style={styles.employeeSubtitleBold}>{activeEmpName}</Text> ({displayEmpId})
            </Text>
          </View>
        </View>

        {/* Navigation Buttons Row: < Prev Month, Current Month, Next Month > */}
        <View style={styles.navButtonsRow}>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={handlePrevMonth}
            activeOpacity={0.7}
          >
            <Text style={styles.navBtnText}>‹ Prev Month</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navBtn}
            onPress={handleGoToday}
            activeOpacity={0.7}
          >
            <Text style={styles.navBtnText}>Current Month</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navBtn}
            onPress={handleNextMonth}
            activeOpacity={0.7}
          >
            <Text style={styles.navBtnText}>Next Month ›</Text>
          </TouchableOpacity>
        </View>

        {/* 6-KPI Analytics Metrics Grid */}
        <View style={styles.kpiGrid}>
          {/* 1. Present */}
          <View style={[styles.kpiCard, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]}>
            <Text style={[styles.kpiHeaderLabel, { color: '#14532D' }]}>PRESENT</Text>
            <Text style={[styles.kpiValue, { color: '#15803D' }]}>{presentCount}</Text>
            <Text style={[styles.kpiSubLabel, { color: '#166534' }]}>Days On Time</Text>
          </View>

          {/* 2. Late / Buffer */}
          <View style={[styles.kpiCard, { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' }]}>
            <Text style={[styles.kpiHeaderLabel, { color: '#78350F' }]}>LATE / BUFFER</Text>
            <Text style={[styles.kpiValue, { color: '#B45309' }]}>{lateCount}</Text>
            <Text style={[styles.kpiSubLabel, { color: '#92400E' }]}>Days</Text>
          </View>

          {/* 3. Leaves */}
          <View style={[styles.kpiCard, { backgroundColor: '#E0E7FF', borderColor: '#A5B4FC' }]}>
            <Text style={[styles.kpiHeaderLabel, { color: '#3730A3' }]}>LEAVES</Text>
            <Text style={[styles.kpiValue, { color: '#4F46E5' }]}>{leaveCount}</Text>
            <Text style={[styles.kpiSubLabel, { color: '#4338CA' }]}>Approved Days</Text>
          </View>

          {/* 4. Off / Holiday */}
          <View style={[styles.kpiCard, { backgroundColor: '#F3E8FF', borderColor: '#D8B4FE' }]}>
            <Text style={[styles.kpiHeaderLabel, { color: '#581C87' }]}>OFF / HOLIDAY</Text>
            <Text style={[styles.kpiValue, { color: '#7E22CE' }]}>{holidayCount}</Text>
            <Text style={[styles.kpiSubLabel, { color: '#6B21A8' }]}>Weekly Offs</Text>
          </View>

          {/* 5. Absent */}
          <View style={[styles.kpiCard, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
            <Text style={[styles.kpiHeaderLabel, { color: '#7F1D1D' }]}>ABSENT</Text>
            <Text style={[styles.kpiValue, { color: '#B91C1C' }]}>{absentCount}</Text>
            <Text style={[styles.kpiSubLabel, { color: '#991B1B' }]}>Unrecorded</Text>
          </View>

          {/* 6. Worked Time */}
          <View style={[styles.kpiCard, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}>
            <Text style={[styles.kpiHeaderLabel, { color: '#64748B' }]}>WORKED TIME</Text>
            <Text style={[styles.kpiValue, { color: '#1E293B' }]}>{totalHoursWorked}h</Text>
            <Text style={[styles.kpiSubLabel, { color: '#64748B' }]}>Total Recorded</Text>
          </View>
        </View>

        {/* Color Legend Bar */}
        <View style={styles.legendContainer}>
          <Text style={styles.legendTitle}>Color Legend:</Text>
          <View style={styles.legendItemsWrap}>
            <View style={styles.legendEntry}>
              <View style={[styles.legendBox, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]} />
              <Text style={styles.legendEntryText}>Present / On Time (Light Green)</Text>
            </View>
            <View style={styles.legendEntry}>
              <View style={[styles.legendBox, { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' }]} />
              <Text style={styles.legendEntryText}>Late / Half Day (Amber)</Text>
            </View>
            <View style={styles.legendEntry}>
              <View style={[styles.legendBox, { backgroundColor: '#E0E7FF', borderColor: '#A5B4FC' }]} />
              <Text style={styles.legendEntryText}>Leave (Blue)</Text>
            </View>
            <View style={styles.legendEntry}>
              <View style={[styles.legendBox, { backgroundColor: '#F3E8FF', borderColor: '#D8B4FE' }]} />
              <Text style={styles.legendEntryText}>Holiday / Sunday (Purple)</Text>
            </View>
            <View style={styles.legendEntry}>
              <View style={[styles.legendBox, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]} />
              <Text style={styles.legendEntryText}>Absent (Light Red)</Text>
            </View>
          </View>
        </View>
      </Card>

      {/* BOTTOM CARD: Interactive Calendar Matrix Grid */}
      <Card style={styles.gridCard}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading {MONTH_NAMES[currentMonth]} attendance records...</Text>
          </View>
        ) : (
          <View>
            {/* Scroll Hint */}
            <View style={styles.scrollHintRow}>
              <Ionicons name="swap-horizontal" size={14} color={Colors.textSecondary} />
              <Text style={styles.scrollHintText}>Swipe horizontally to see all 7 days (Sun - Sat)</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{ flexGrow: 0 }}>
              <View style={{ minWidth: CALENDAR_MIN_WIDTH, paddingBottom: 6 }}>
                {/* Days of Week Header */}
                <View style={styles.weekHeaderRow}>
                  {DAYS_OF_WEEK.map((day, idx) => (
                    <View key={day} style={styles.weekHeaderCell}>
                      <Text
                        style={[
                          styles.weekHeaderText,
                          idx === 0 && { color: '#EF4444' }, // SUN in Red
                        ]}
                      >
                        {day.toUpperCase()}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Matrix Day Cells */}
                <View style={styles.matrixGrid}>
                  {/* Leading blank offset cells */}
                  {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                    <View key={`empty-${idx}`} style={styles.dayCellEmpty} />
                  ))}

                  {/* Actual Month Days */}
                  {Array.from({ length: totalDaysInMonth }).map((_, idx) => {
                    const dayNum = idx + 1;
                    const info = dayDetailsMap[dayNum];
                    if (!info) return null;

                    return (
                      <TouchableOpacity
                        key={`day-${dayNum}`}
                        style={[
                          styles.dayCell,
                          {
                            backgroundColor: info.bgColor,
                            borderColor: info.isToday ? '#F59E0B' : info.borderColor,
                            borderWidth: info.isToday ? 2 : 1,
                          },
                        ]}
                        onPress={() => setSelectedDay(info)}
                        activeOpacity={0.75}
                      >
                        {/* Day Number and Today Pill */}
                        <View style={styles.dayCellTopRow}>
                          <Text
                            style={[
                              styles.dayCellNumber,
                              { color: info.textColor },
                              info.isToday && { color: '#92400E', fontWeight: '900' },
                            ]}
                          >
                            {dayNum}
                          </Text>

                          {info.isToday && (
                            <View style={styles.todayPill}>
                              <Text style={styles.todayPillText}>TODAY</Text>
                            </View>
                          )}
                        </View>

                        {/* Status Label & Times */}
                        <View style={styles.dayCellBody}>
                          {info.type === 'present' && (
                            <View>
                              <Text style={[styles.dayStatusLabel, { color: '#15803D' }]} numberOfLines={1}>
                                ✓ {info.badgeText}
                              </Text>
                              <Text style={[styles.dayTimeLabel, { color: '#166534' }]}>
                                In: {info.record?.punchInTime?.slice(0, 5) || '10:00'}
                              </Text>
                              {info.record?.punchOutTime && (
                                <Text style={[styles.dayTimeLabel, { color: '#166534' }]}>
                                  Out: {info.record.punchOutTime.slice(0, 5)}
                                </Text>
                              )}
                            </View>
                          )}

                          {info.type === 'late' && (
                            <View>
                              <Text style={[styles.dayStatusLabel, { color: '#B45309' }]} numberOfLines={1}>
                                ⚠️ {info.badgeText}
                              </Text>
                              <Text style={[styles.dayTimeLabel, { color: '#92400E' }]}>
                                In: {info.record?.punchInTime?.slice(0, 5) || '10:45'}
                              </Text>
                              {info.record?.punchOutTime && (
                                <Text style={[styles.dayTimeLabel, { color: '#92400E' }]}>
                                  Out: {info.record.punchOutTime.slice(0, 5)}
                                </Text>
                              )}
                            </View>
                          )}

                          {info.type === 'leave' && (
                            <View>
                              <Text style={[styles.dayStatusLabel, { color: '#4338CA' }]} numberOfLines={1}>
                                🏖 Leave
                              </Text>
                              <Text style={[styles.dayTimeLabel, { color: '#4338CA' }]} numberOfLines={1}>
                                {info.badgeText}
                              </Text>
                            </View>
                          )}

                          {info.type === 'holiday' && (
                            <View>
                              <Text style={[styles.dayStatusLabel, { color: '#581C87' }]} numberOfLines={1}>
                                🎉 Holiday
                              </Text>
                              <Text style={[styles.dayTimeLabel, { color: '#581C87' }]} numberOfLines={1}>
                                {info.holiday?.name || info.holiday?.label || 'Holiday'}
                              </Text>
                            </View>
                          )}

                          {info.type === 'weekly_off' && (
                            <View>
                              <Text style={[styles.dayStatusLabel, { color: '#475569' }]} numberOfLines={1}>
                                🌴 Weekly Off
                              </Text>
                            </View>
                          )}

                          {info.type === 'absent' && (
                            <View>
                              <Text style={[styles.dayStatusLabel, { color: '#DC2626' }]} numberOfLines={1}>
                                ✕ Absent
                              </Text>
                            </View>
                          )}

                          {info.type === 'today_pending' && !info.record && (
                            <View>
                              <Text style={[styles.dayStatusLabel, { color: '#D97706' }]} numberOfLines={1}>
                                Pending Punch
                              </Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>
          </View>
        )}
      </Card>

      {/* DAY DETAIL & ADMIN OVERRIDE MODAL */}
      {selectedDay && (
        <Modal
          visible={!!selectedDay}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setSelectedDay(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalDateTitle}>
                    {selectedDay.dateObj.toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                  <Text style={styles.modalDateSub}>
                    {selectedDay.isToday ? 'Today' : selectedDay.label}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedDay(null)}
                  style={styles.modalCloseBtn}
                >
                  <Ionicons name="close" size={22} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>

              {/* Day Punch Information */}
              <View style={styles.modalDetailsBox}>
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Status:</Text>
                  <Text style={[styles.modalDetailValue, { color: selectedDay.textColor, fontWeight: '800' }]}>
                    {selectedDay.badgeText || selectedDay.label}
                  </Text>
                </View>

                {selectedDay.record ? (
                  <>
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalDetailLabel}>Punch In:</Text>
                      <Text style={styles.modalDetailValue}>
                        {selectedDay.record.punchInTime || 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalDetailLabel}>Punch Out:</Text>
                      <Text style={styles.modalDetailValue}>
                        {selectedDay.record.punchOutTime || 'N/A'}
                      </Text>
                    </View>
                    {selectedDay.record.locationName && (
                      <View style={styles.modalDetailRow}>
                        <Text style={styles.modalDetailLabel}>Location:</Text>
                        <Text style={styles.modalDetailValue} numberOfLines={2}>
                          {selectedDay.record.locationName}
                        </Text>
                      </View>
                    )}

                    {/* Verification Photo Preview if exists */}
                    {(selectedDay.record.punchInPhotoUrl || selectedDay.record.punchInPhoto) && (
                      <View style={{ marginTop: 10, alignItems: 'center' }}>
                        <Text style={[styles.modalDetailLabel, { marginBottom: 6, alignSelf: 'flex-start' }]}>
                          Verification Selfie:
                        </Text>
                        <Image
                          source={{
                            uri: selectedDay.record.punchInPhoto?.startsWith('data:')
                              ? selectedDay.record.punchInPhoto
                              : getPhotoUrl(selectedDay.record.punchInPhotoUrl || selectedDay.record.punchInPhoto),
                          }}
                          style={styles.modalSelfiePreview}
                        />
                      </View>
                    )}
                  </>
                ) : (
                  <View style={{ paddingVertical: 10 }}>
                    <Text style={{ fontSize: 13, color: Colors.textSecondary, fontStyle: 'italic' }}>
                      {selectedDay.holiday
                        ? `Official Holiday: ${selectedDay.holiday.name || selectedDay.holiday.label}`
                        : selectedDay.leave
                        ? `Approved Leave: ${selectedDay.leave.leaveType}`
                        : selectedDay.isWeeklyOff
                        ? 'Company Weekly Off (Sunday)'
                        : selectedDay.isToday
                        ? 'No punch recorded yet today.'
                        : 'Unrecorded past working day (Marked Absent).'}
                    </Text>
                  </View>
                )}
              </View>

              {/* Admin Quick Override Actions */}
              {isAdmin && !readOnly && (
                <View style={styles.adminActionArea}>
                  <Text style={styles.adminActionTitle}>Admin Quick Actions:</Text>
                  {savingOverride ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <View style={styles.adminActionButtonsGrid}>
                      <Button
                        title="Mark Present"
                        onPress={() => handleQuickOverride('on_time', '10:00:00', '18:30:00')}
                        variant="primary"
                        size="small"
                      />
                      <Button
                        title="Mark Half Day"
                        onPress={() => handleQuickOverride('half_day', '10:00:00', '14:00:00')}
                        variant="secondary"
                        size="small"
                      />
                      <Button
                        title="Mark Leave"
                        onPress={() => handleQuickOverride('on_leave', '', '')}
                        variant="outline"
                        size="small"
                      />
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        </Modal>
      )}

      {/* Admin Employee Picker Modal */}
      {isAdmin && (
        <Modal
          visible={showEmpPicker}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowEmpPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { maxHeight: '75%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalDateTitle}>Select Employee</Text>
                <TouchableOpacity onPress={() => setShowEmpPicker(false)}>
                  <Ionicons name="close" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ marginTop: 10 }}>
                <TouchableOpacity
                  style={[
                    styles.pickerRow,
                    activeEmpId === user?.id && styles.pickerRowActive,
                  ]}
                  onPress={() => {
                    setActiveEmpId(user?.id || '');
                    setShowEmpPicker(false);
                  }}
                >
                  <Text style={styles.pickerRowName}>👤 Me (Admin)</Text>
                  <Text style={styles.pickerRowSub}>{user?.email}</Text>
                </TouchableOpacity>

                {employeeList.map((emp) => (
                  <TouchableOpacity
                    key={emp.id}
                    style={[
                      styles.pickerRow,
                      activeEmpId === emp.id && styles.pickerRowActive,
                    ]}
                    onPress={() => {
                      setActiveEmpId(emp.id);
                      setShowEmpPicker(false);
                    }}
                  >
                    <Text style={styles.pickerRowName}>
                      {emp.firstName} {emp.lastName} ({emp.id})
                    </Text>
                    <Text style={styles.pickerRowSub}>
                      {emp.department} • {emp.designation || 'Staff'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  adminBarCard: {
    padding: 10,
    backgroundColor: Colors.surface,
  },
  empSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  empSelectorLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  empSelectorValue: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  overviewCard: {
    padding: 16,
    backgroundColor: Colors.surface,
    gap: 14,
  },
  headerInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  monthTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1E1B18',
  },
  employeeSubtitle: {
    fontSize: 12,
    color: '#75706A',
    marginTop: 2,
  },
  employeeSubtitleBold: {
    fontWeight: '700',
    color: '#1E1B18',
  },
  navButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  navBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  kpiCard: {
    width: '31.5%',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiHeaderLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
    textAlign: 'center',
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 2,
  },
  kpiSubLabel: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  legendContainer: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    padding: 10,
    gap: 8,
  },
  legendTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  legendItemsWrap: {
    gap: 6,
  },
  legendEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendBox: {
    width: 12,
    height: 12,
    borderRadius: 3,
    borderWidth: 1,
  },
  legendEntryText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  gridCard: {
    padding: 12,
    backgroundColor: Colors.surface,
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  scrollHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  scrollHintText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  weekHeaderRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  weekHeaderCell: {
    width: CELL_WIDTH,
    alignItems: 'center',
    paddingVertical: 4,
  },
  weekHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  matrixGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    width: CALENDAR_MIN_WIDTH,
  },
  dayCellEmpty: {
    width: CELL_WIDTH,
    height: CELL_HEIGHT,
    backgroundColor: 'transparent',
    opacity: 0.1,
  },
  dayCell: {
    width: CELL_WIDTH,
    minHeight: CELL_HEIGHT,
    padding: 6,
    borderRadius: 8,
    justifyContent: 'space-between',
  },
  dayCellTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayCellNumber: {
    fontSize: 13,
    fontWeight: '800',
  },
  todayPill: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  todayPillText: {
    color: '#FFFFFF',
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  dayCellBody: {
    marginTop: 4,
    gap: 2,
  },
  dayStatusLabel: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  dayTimeLabel: {
    fontSize: 8.5,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 420,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 12,
  },
  modalDateTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  modalDateSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalDetailsBox: {
    paddingVertical: 14,
    gap: 8,
  },
  modalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalDetailLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  modalDetailValue: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  modalSelfiePreview: {
    width: 140,
    height: 140,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  adminActionArea: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 8,
  },
  adminActionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  adminActionButtonsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  pickerRow: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerRowActive: {
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 8,
  },
  pickerRowName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  pickerRowSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
