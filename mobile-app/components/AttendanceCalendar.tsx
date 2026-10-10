/**
 * AttendanceCalendar Component for Mobile
 * Recreates frontend/src/components/AttendanceCalendar.jsx with exact visual styles & behavior
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
import StatusBadge from './StatusBadge';
import { useAuth } from '../context/AuthContext';
import { attendanceService } from '../services/attendanceService';
import { adminService } from '../services/adminService';
import { apiFetch } from '../services/api';
import { AttendanceRecord, Holiday, LeaveRequest, Employee } from '../types';
import { formatDate, formatTime } from '../utils/formatters';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CELL_SIZE = Math.floor((SCREEN_WIDTH - 48) / 7);

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

  // View mode: 'calendar' or 'list'
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

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
          setEmployeeList(res.employees);
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

      const [logRes, holRes, leaveRes] = await Promise.all([
        apiFetch<{ records: AttendanceRecord[] }>(
          `/attendance/log?startDate=${startDate}&endDate=${endDate}&employeeId=${activeEmpId}`
        ).catch(() => ({ records: [] })),
        apiFetch<{ holidays: Holiday[] }>('/settings/holidays').catch(() => ({ holidays: [] })),
        apiFetch<{ leaveRequests: LeaveRequest[] }>('/employee/leave-requests').catch(() => ({ leaveRequests: [] })),
      ]);

      const fetchedRecords: AttendanceRecord[] = logRes.records || [];
      const fetchedHolidays: Holiday[] = holRes.holidays || [];
      const fetchedLeaves: LeaveRequest[] = (leaveRes.leaveRequests || []).filter(
        (l: LeaveRequest) => l.status === 'approved' && (!activeEmpId || l.employeeId === activeEmpId)
      );

      setRecords(fetchedRecords);
      setHolidays(fetchedHolidays);
      setLeaveRequests(fetchedLeaves);
    } catch (err: any) {
      console.warn('Attendance calendar fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [currentYear, currentMonth, activeEmpId]);

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
    let bgColor = '#FAF7F2';
    let borderColor = '#E8E3DD';
    let textColor = '#2B2620';
    let badgeText = '';

    if (recordMatch) {
      const st = recordMatch.status;
      if (st === 'on_time' || st === 'in_buffer') {
        type = 'present';
        label = 'Present';
        bgColor = '#DCFCE7';
        borderColor = '#86EFAC';
        textColor = '#14532D';
        badgeText = st === 'in_buffer' ? 'Buffer' : 'Present';
        presentCount++;
      } else if (st === 'late' || st === 'half_day') {
        type = 'late';
        label = st === 'half_day' ? 'Half Day' : 'Late';
        bgColor = '#FEF3C7';
        borderColor = '#FCD34D';
        textColor = '#78350F';
        badgeText = st === 'half_day' ? 'Half' : 'Late';
        lateCount++;
      } else if (st === 'on_leave') {
        type = 'leave';
        label = 'Leave';
        bgColor = '#E0E7FF';
        borderColor = '#A5B4FC';
        textColor = '#3730A3';
        badgeText = 'Leave';
        leaveCount++;
      } else if (st === 'absent') {
        type = 'absent';
        label = 'Absent';
        bgColor = '#FEE2E2';
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
      badgeText = 'Leave';
      leaveCount++;
    } else if (holidayMatch) {
      type = 'holiday';
      label = holidayMatch.name || holidayMatch.label;
      bgColor = '#F3E8FF';
      borderColor = '#D8B4FE';
      textColor = '#6B21A8';
      badgeText = 'Holiday';
    } else if (isWeeklyOff) {
      type = 'off';
      label = 'Weekly Off';
      bgColor = '#F3F4F6';
      borderColor = '#E5E7EB';
      textColor = '#6B7280';
      badgeText = 'Off';
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
              <Text style={styles.empSelectorLabel}>Viewing Calendar For:</Text>
              <Text style={styles.empSelectorValue} numberOfLines={1}>
                {activeEmpObj
                  ? `${activeEmpObj.firstName} ${activeEmpObj.lastName} (${activeEmpObj.department})`
                  : 'Me (Admin)'}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        </Card>
      )}

      {/* Month Navigation & Mode Switcher Header Card */}
      <Card style={styles.headerCard}>
        <View style={styles.navRow}>
          <TouchableOpacity
            style={styles.navArrow}
            onPress={handlePrevMonth}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color={Colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.monthTitleBox}>
            <Text style={styles.monthTitle}>
              {MONTH_NAMES[currentMonth]} {currentYear}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.navArrow}
            onPress={handleNextMonth}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-forward" size={20} color={Colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.todayButton}
            onPress={handleGoToday}
            activeOpacity={0.7}
          >
            <Text style={styles.todayButtonText}>Today</Text>
          </TouchableOpacity>
        </View>

        {/* View Mode Toggle: Calendar Grid vs List */}
        <View style={styles.viewToggleRow}>
          <TouchableOpacity
            style={[
              styles.toggleTab,
              viewMode === 'calendar' && styles.toggleTabActive,
            ]}
            onPress={() => setViewMode('calendar')}
          >
            <Ionicons
              name="grid-outline"
              size={15}
              color={viewMode === 'calendar' ? '#FFFFFF' : Colors.textSecondary}
            />
            <Text
              style={[
                styles.toggleTabText,
                viewMode === 'calendar' && styles.toggleTabTextActive,
              ]}
            >
              Calendar Grid
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleTab, viewMode === 'list' && styles.toggleTabActive]}
            onPress={() => setViewMode('list')}
          >
            <Ionicons
              name="list-outline"
              size={15}
              color={viewMode === 'list' ? '#FFFFFF' : Colors.textSecondary}
            />
            <Text
              style={[
                styles.toggleTabText,
                viewMode === 'list' && styles.toggleTabTextActive,
              ]}
            >
              Logs List
            </Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Monthly Metrics KPI Strip */}
      <View style={styles.metricsStrip}>
        <View style={[styles.metricCard, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]}>
          <Text style={[styles.metricCount, { color: '#14532D' }]}>{presentCount}</Text>
          <Text style={[styles.metricLabel, { color: '#14532D' }]}>Present</Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' }]}>
          <Text style={[styles.metricCount, { color: '#78350F' }]}>{lateCount}</Text>
          <Text style={[styles.metricLabel, { color: '#78350F' }]}>Late</Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: '#E0E7FF', borderColor: '#A5B4FC' }]}>
          <Text style={[styles.metricCount, { color: '#3730A3' }]}>{leaveCount}</Text>
          <Text style={[styles.metricLabel, { color: '#3730A3' }]}>Leave</Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
          <Text style={[styles.metricCount, { color: '#7F1D1D' }]}>{absentCount}</Text>
          <Text style={[styles.metricLabel, { color: '#7F1D1D' }]}>Absent</Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}>
          <Text style={[styles.metricCount, { color: '#334155' }]}>{totalHoursWorked}h</Text>
          <Text style={[styles.metricLabel, { color: '#334155' }]}>Hours</Text>
        </View>
      </View>

      {/* Main Content Area */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading attendance matrix...</Text>
        </View>
      ) : viewMode === 'calendar' ? (
        /* Calendar Grid View */
        <Card style={styles.calendarCard}>
          {/* Days of Week Header */}
          <View style={styles.weekHeader}>
            {DAYS_OF_WEEK.map((day) => (
              <View key={day} style={styles.weekCol}>
                <Text
                  style={[
                    styles.weekColText,
                    day === 'Sun' && { color: Colors.danger },
                  ]}
                >
                  {day}
                </Text>
              </View>
            ))}
          </View>

          {/* Matrix Cells */}
          <View style={styles.matrix}>
            {/* Blank leading offsets */}
            {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
              <View key={`empty-${idx}`} style={styles.cellEmpty} />
            ))}

            {/* Actual day cells */}
            {Array.from({ length: totalDaysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const info = dayDetailsMap[dayNum];
              if (!info) return null;

              return (
                <TouchableOpacity
                  key={`day-${dayNum}`}
                  style={[
                    styles.cell,
                    {
                      backgroundColor: info.bgColor,
                      borderColor: info.isToday ? Colors.primaryDark : info.borderColor,
                      borderWidth: info.isToday ? 2 : 1,
                    },
                  ]}
                  onPress={() => setSelectedDay(info)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.cellDayNum,
                      { color: info.textColor },
                      info.isToday && { fontWeight: '900' },
                    ]}
                  >
                    {dayNum}
                  </Text>

                  {info.badgeText ? (
                    <Text
                      style={[styles.cellBadgeText, { color: info.textColor }]}
                      numberOfLines={1}
                    >
                      {info.badgeText}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Color Legend */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#86EFAC' }]} />
              <Text style={styles.legendText}>Present</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FCD34D' }]} />
              <Text style={styles.legendText}>Late / Half</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#A5B4FC' }]} />
              <Text style={styles.legendText}>Leave</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#D8B4FE' }]} />
              <Text style={styles.legendText}>Holiday</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FCA5A5' }]} />
              <Text style={styles.legendText}>Absent</Text>
            </View>
          </View>
        </Card>
      ) : (
        /* Detailed List View */
        <Card style={styles.listCard}>
          {Array.from({ length: totalDaysInMonth })
            .map((_, idx) => dayDetailsMap[idx + 1])
            .filter((info) => info && !info.isFuture)
            .reverse()
            .map((info) => (
              <TouchableOpacity
                key={`list-${info.day}`}
                style={styles.listRow}
                onPress={() => setSelectedDay(info)}
              >
                <View style={styles.listDateCol}>
                  <Text style={styles.listDayNum}>{info.day}</Text>
                  <Text style={styles.listMonthName}>
                    {MONTH_NAMES[currentMonth].slice(0, 3)}
                  </Text>
                </View>

                <View style={{ flex: 1, paddingHorizontal: 12 }}>
                  <Text style={styles.listLabelText}>{info.label}</Text>
                  {info.record ? (
                    <Text style={styles.listPunchSubtext}>
                      In: {formatTime(info.record.punchInTime)} • Out:{' '}
                      {formatTime(info.record.punchOutTime)}
                    </Text>
                  ) : info.holiday ? (
                    <Text style={styles.listPunchSubtext}>
                      🎉 {info.holiday.name}
                    </Text>
                  ) : info.isWeeklyOff ? (
                    <Text style={styles.listPunchSubtext}>Weekly Holiday</Text>
                  ) : (
                    <Text style={[styles.listPunchSubtext, { color: Colors.danger }]}>
                      No punch registered
                    </Text>
                  )}
                </View>

                <View
                  style={[
                    styles.listStatusBadge,
                    { backgroundColor: info.bgColor, borderColor: info.borderColor },
                  ]}
                >
                  <Text style={[styles.listStatusText, { color: info.textColor }]}>
                    {info.badgeText || info.label}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
        </Card>
      )}

      {/* Day Details Modal */}
      {selectedDay && (
        <Modal
          visible={!!selectedDay}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedDay(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalDateText}>
                    {formatDate(selectedDay.dateStr)}
                  </Text>
                  <Text style={styles.modalDaySubtext}>
                    Day {selectedDay.day} • {selectedDay.label}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedDay(null)}
                  style={styles.modalCloseBtn}
                >
                  <Ionicons name="close" size={22} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 420 }}>
                {selectedDay.record ? (
                  <View style={styles.recordDetailBox}>
                    <View style={styles.punchTimesRow}>
                      <View style={styles.punchBox}>
                        <Text style={styles.punchBoxLabel}>PUNCH IN</Text>
                        <Text style={styles.punchBoxVal}>
                          {formatTime(selectedDay.record.punchInTime)}
                        </Text>
                        {selectedDay.record.punchInLocation && (
                          <Text style={styles.punchLocText} numberOfLines={1}>
                            📍 {selectedDay.record.punchInLocation}
                          </Text>
                        )}
                        {selectedDay.record.punchInPhotoUrl && (
                          <Image
                            source={{ uri: selectedDay.record.punchInPhotoUrl }}
                            style={styles.modalSelfie}
                          />
                        )}
                      </View>

                      <View style={styles.punchBox}>
                        <Text style={styles.punchBoxLabel}>PUNCH OUT</Text>
                        <Text style={styles.punchBoxVal}>
                          {formatTime(selectedDay.record.punchOutTime)}
                        </Text>
                        {selectedDay.record.punchOutLocation && (
                          <Text style={styles.punchLocText} numberOfLines={1}>
                            📍 {selectedDay.record.punchOutLocation}
                          </Text>
                        )}
                        {selectedDay.record.punchOutPhotoUrl && (
                          <Image
                            source={{ uri: selectedDay.record.punchOutPhotoUrl }}
                            style={styles.modalSelfie}
                          />
                        )}
                      </View>
                    </View>

                    {selectedDay.record.lateReason && (
                      <View style={styles.reasonBox}>
                        <Text style={styles.reasonLabel}>Late Reason:</Text>
                        <Text style={styles.reasonText}>
                          {selectedDay.record.lateReason}
                        </Text>
                      </View>
                    )}

                    {selectedDay.record.isWfh && (
                      <View style={[styles.reasonBox, { backgroundColor: '#EFF6FF' }]}>
                        <Text style={[styles.reasonLabel, { color: '#1D4ED8' }]}>
                          Remote Work (WFH):
                        </Text>
                        <Text style={[styles.reasonText, { color: '#1E40AF' }]}>
                          Verified Remote Attendance
                        </Text>
                      </View>
                    )}
                  </View>
                ) : selectedDay.holiday ? (
                  <View style={styles.infoBanner}>
                    <Ionicons name="sparkles" size={24} color="#6B21A8" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.infoBannerTitle}>
                        {selectedDay.holiday.name}
                      </Text>
                      <Text style={styles.infoBannerSub}>Official Company Holiday</Text>
                    </View>
                  </View>
                ) : selectedDay.isWeeklyOff ? (
                  <View style={styles.infoBanner}>
                    <Ionicons name="cafe-outline" size={24} color="#4B5563" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.infoBannerTitle}>Weekly Off</Text>
                      <Text style={styles.infoBannerSub}>Scheduled Weekend Rest</Text>
                    </View>
                  </View>
                ) : (
                  <View style={[styles.infoBanner, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name="alert-circle-outline" size={24} color="#DC2626" />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.infoBannerTitle, { color: '#991B1B' }]}>
                        Absent / No Punch
                      </Text>
                      <Text style={[styles.infoBannerSub, { color: '#B91C1C' }]}>
                        No punch recorded on this working day.
                      </Text>
                    </View>
                  </View>
                )}

                {/* Admin Override Controls */}
                {isAdmin && !readOnly && (
                  <View style={styles.adminActionSection}>
                    <Text style={styles.adminSectionTitle}>ADMIN OVERRIDE</Text>
                    <View style={styles.overrideButtonsRow}>
                      <TouchableOpacity
                        style={[styles.overrideBtn, { backgroundColor: '#DCFCE7' }]}
                        onPress={() =>
                          handleQuickOverride('on_time', '10:00', '18:30')
                        }
                        disabled={savingOverride}
                      >
                        <Text style={[styles.overrideBtnText, { color: '#14532D' }]}>
                          ✓ Mark Present
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.overrideBtn, { backgroundColor: '#FEF3C7' }]}
                        onPress={() =>
                          handleQuickOverride('half_day', '13:00', '18:30')
                        }
                        disabled={savingOverride}
                      >
                        <Text style={[styles.overrideBtnText, { color: '#78350F' }]}>
                          ½ Mark Half Day
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.overrideBtn, { backgroundColor: '#E0E7FF' }]}
                        onPress={() =>
                          handleQuickOverride('on_leave', '00:00', '00:00')
                        }
                        disabled={savingOverride}
                      >
                        <Text style={[styles.overrideBtnText, { color: '#3730A3' }]}>
                          ✉ Mark Leave
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </ScrollView>

              <Button
                title="Close"
                onPress={() => setSelectedDay(null)}
                variant="secondary"
                style={{ marginTop: 12 }}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Admin Employee Picker Modal */}
      {showEmpPicker && (
        <Modal
          visible={showEmpPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowEmpPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '80%' }]}>
              <Text style={styles.pickerModalTitle}>Select Employee Calendar</Text>
              <ScrollView>
                <TouchableOpacity
                  style={[
                    styles.pickerItem,
                    activeEmpId === (user?.id || '') && styles.pickerItemActive,
                  ]}
                  onPress={() => {
                    setActiveEmpId(user?.id || '');
                    setShowEmpPicker(false);
                  }}
                >
                  <Text style={styles.pickerItemName}>👤 Me (Admin)</Text>
                </TouchableOpacity>

                {employeeList.map((emp) => (
                  <TouchableOpacity
                    key={emp.id}
                    style={[
                      styles.pickerItem,
                      activeEmpId === emp.id && styles.pickerItemActive,
                    ]}
                    onPress={() => {
                      setActiveEmpId(emp.id);
                      setShowEmpPicker(false);
                    }}
                  >
                    <Text style={styles.pickerItemName}>
                      {emp.firstName} {emp.lastName}
                    </Text>
                    <Text style={styles.pickerItemDept}>
                      {emp.id} • {emp.department}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Button
                title="Cancel"
                onPress={() => setShowEmpPicker(false)}
                variant="outline"
                style={{ marginTop: 12 }}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  adminBarCard: {
    padding: 10,
    marginBottom: 10,
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
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  headerCard: {
    padding: 12,
    marginBottom: 10,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  navArrow: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitleBox: {
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  todayButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: Colors.primaryTint,
  },
  todayButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  viewToggleRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 8,
    padding: 3,
    gap: 4,
  },
  toggleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 6,
    gap: 6,
  },
  toggleTabActive: {
    backgroundColor: Colors.primaryDark,
  },
  toggleTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  toggleTabTextActive: {
    color: '#FFFFFF',
  },
  metricsStrip: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  metricCard: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  metricCount: {
    fontSize: 15,
    fontWeight: '900',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  calendarCard: {
    padding: 10,
    marginBottom: 20,
  },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 6,
  },
  weekCol: {
    flex: 1,
    alignItems: 'center',
  },
  weekColText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
  },
  matrix: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cellEmpty: {
    width: `${100 / 7}%`,
    height: 52,
  },
  cell: {
    width: `${100 / 7}%`,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    padding: 2,
    marginVertical: 2,
  },
  cellDayNum: {
    fontSize: 13,
    fontWeight: '700',
  },
  cellBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    marginTop: 2,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  listCard: {
    padding: 10,
    marginBottom: 20,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  listDateCol: {
    width: 44,
    alignItems: 'center',
    backgroundColor: Colors.surfaceSubtle,
    paddingVertical: 6,
    borderRadius: 6,
  },
  listDayNum: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  listMonthName: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  listLabelText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  listPunchSubtext: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  listStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  listStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 10,
  },
  modalDateText: {
    fontSize: 17,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  modalDaySubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  recordDetailBox: {
    gap: 12,
  },
  punchTimesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  punchBox: {
    flex: 1,
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  punchBoxLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  punchBoxVal: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginVertical: 4,
  },
  punchLocText: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  modalSelfie: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginTop: 8,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  reasonBox: {
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
  },
  reasonText: {
    fontSize: 12,
    color: '#78350F',
    marginTop: 2,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: '#F3E8FF',
    borderRadius: 10,
  },
  infoBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#6B21A8',
  },
  infoBannerSub: {
    fontSize: 12,
    color: '#7E22CE',
    marginTop: 2,
  },
  adminActionSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  adminSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  overrideButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  overrideBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  overrideBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  pickerModalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  pickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerItemActive: {
    backgroundColor: Colors.primaryTint,
    borderRadius: 6,
  },
  pickerItemName: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  pickerItemDept: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
