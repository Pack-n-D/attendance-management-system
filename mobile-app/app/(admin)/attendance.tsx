/**
 * Super Admin Organization Attendance Log & Overrides
 * Recreates frontend/src/pages/Admin/AttendanceLog.jsx
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Alert,
  Share,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import Card from '../../components/Card';
import Header from '../../components/Header';
import Button from '../../components/Button';
import Input from '../../components/Input';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import ErrorView from '../../components/ErrorView';
import AttendanceCalendar from '../../components/AttendanceCalendar';
import { attendanceService } from '../../services/attendanceService';
import { adminService } from '../../services/adminService';
import { AttendanceRecord, ShiftType } from '../../types';
import { formatDate, formatTime } from '../../utils/formatters';

export default function AdminAttendanceLogScreen() {
  const [viewMode, setViewMode] = useState<'logs' | 'calendar'>('logs');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Override Modal
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideEmpId, setOverrideEmpId] = useState('');
  const [overrideDate, setOverrideDate] = useState(new Date().toISOString().slice(0, 10));
  const [overrideStatus, setOverrideStatus] = useState('on_time');
  const [overridePunchIn, setOverridePunchIn] = useState('09:30');
  const [overridePunchOut, setOverridePunchOut] = useState('18:30');
  const [overrideShift, setOverrideShift] = useState<ShiftType>('full_day');
  const [overrideReason, setOverrideReason] = useState('Admin Manual Adjustment');
  const [submittingOverride, setSubmittingOverride] = useState(false);

  const loadLogs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setErrorMessage(null);
    try {
      const res = await attendanceService.getAttendanceLog({
        search: search.trim() || undefined,
        status: statusFilter || undefined,
      });
      setRecords(res.records);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load attendance logs.');
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const onRefresh = () => {
    setRefreshing(true);
    loadLogs(true);
  };

  const handleOpenNewOverride = () => {
    setOverrideEmpId('');
    setOverrideDate(new Date().toISOString().slice(0, 10));
    setOverrideStatus('on_time');
    setOverridePunchIn('09:30');
    setOverridePunchOut('18:30');
    setOverrideReason('Admin Manual Adjustment');
    setShowOverrideModal(true);
  };

  const handleOpenEditOverride = (rec: AttendanceRecord) => {
    setOverrideEmpId(rec.employeeId);
    setOverrideDate(rec.date);
    setOverrideStatus(rec.status);
    setOverridePunchIn(rec.punchInTime?.slice(0, 5) || '09:30');
    setOverridePunchOut(rec.punchOutTime?.slice(0, 5) || '18:30');
    setOverrideShift(rec.shiftType || 'full_day');
    setOverrideReason(rec.lateReason || rec.adminOverrideReason || 'Admin Manual Adjustment');
    setShowOverrideModal(true);
  };

  const handleSubmitOverride = async () => {
    if (!overrideEmpId.trim() || !overrideDate.trim()) {
      Alert.alert('Required', 'Employee ID and date are required.');
      return;
    }

    setSubmittingOverride(true);
    try {
      const res = await adminService.overrideAttendance({
        employeeId: overrideEmpId.trim(),
        date: overrideDate.trim(),
        status: overrideStatus,
        punchInTime: overridePunchIn.trim() || null,
        punchOutTime: overridePunchOut.trim() || null,
        shiftType: overrideShift,
        reason: overrideReason.trim(),
      });

      Alert.alert('Success', res.message);
      setShowOverrideModal(false);
      await loadLogs(true);
    } catch (err: any) {
      Alert.alert('Override Failed', err.message || 'Server error.');
    } finally {
      setSubmittingOverride(false);
    }
  };

  const handleDeleteOverride = (rec: AttendanceRecord) => {
    Alert.alert(
      'Clear Attendance Record',
      `Clear attendance entry for ${rec.employeeName} (${rec.employeeId}) on ${rec.date}?`,
      [
        { text: 'Cancel' },
        {
          text: 'Clear Record',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await adminService.deleteAttendanceOverride(rec.employeeId, rec.date);
              Alert.alert('Success', res.message);
              await loadLogs(true);
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  const handleExportCSV = async () => {
    try {
      const csvUrl = await attendanceService.getExportCSVUrl();
      await Share.share({
        message: `📥 APC Attendance CSV Export Download Link:\n${csvUrl}`,
        title: 'APC Attendance Export CSV',
      });
    } catch {
      // Ignore
    }
  };

  const statusOptions = [
    { label: 'All Statuses', value: '' },
    { label: 'On Time', value: 'on_time' },
    { label: 'In Buffer', value: 'in_buffer' },
    { label: 'Late', value: 'late' },
    { label: 'Half Day', value: 'half_day' },
    { label: 'On Leave', value: 'on_leave' },
    { label: 'Absent', value: 'absent' },
  ];

  const renderItem = ({ item }: { item: AttendanceRecord }) => (
    <Card style={styles.recordCard}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.empName}>{item.employeeName}</Text>
          <Text style={styles.empSub}>{item.employeeId} • {item.department}</Text>
          <Text style={styles.dateText}>{formatDate(item.date)}</Text>
        </View>
        <StatusBadge status={item.status} size="small" />
      </View>

      <View style={styles.timesContainer}>
        <View style={styles.timeBox}>
          <Text style={styles.timeLabel}>PUNCH IN</Text>
          <Text style={styles.timeVal}>{formatTime(item.punchInTime)}</Text>
          {item.punchInLocation && (
            <Text style={styles.locText} numberOfLines={1}>{item.punchInLocation}</Text>
          )}
        </View>

        <View style={styles.timeDivider} />

        <View style={styles.timeBox}>
          <Text style={styles.timeLabel}>PUNCH OUT</Text>
          <Text style={styles.timeVal}>{formatTime(item.punchOutTime)}</Text>
          {item.punchOutLocation && (
            <Text style={styles.locText} numberOfLines={1}>{item.punchOutLocation}</Text>
          )}
        </View>
      </View>

      {item.lateReason && (
        <View style={styles.remarkBox}>
          <Text style={styles.remarkText}>Late Reason: {item.lateReason}</Text>
        </View>
      )}

      {item.isManualOverride && (
        <View style={styles.overrideTag}>
          <Ionicons name="build-outline" size={12} color={Colors.info} />
          <Text style={styles.overrideTagText}>
            Manual Override by {item.adminOverrideBy || 'Admin'}
          </Text>
        </View>
      )}

      {/* Admin Action Buttons */}
      <View style={styles.actionsRow}>
        <Button
          title="Manual Override"
          onPress={() => handleOpenEditOverride(item)}
          variant="outline"
          size="small"
          icon={<Ionicons name="create-outline" size={14} color={Colors.primaryDark} />}
        />
        <Button
          title="Clear"
          onPress={() => handleDeleteOverride(item)}
          variant="ghost"
          size="small"
          icon={<Ionicons name="trash-outline" size={14} color={Colors.danger} />}
          textStyle={{ color: Colors.danger }}
        />
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Header
        title="Attendance Records"
        rightAction={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={handleExportCSV} style={styles.iconBtn}>
              <Ionicons name="download-outline" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Button
              title="+ Override"
              onPress={handleOpenNewOverride}
              variant="primary"
              size="small"
            />
          </View>
        }
      />

      {/* View Mode Toggle: Daily Logs vs Monthly Calendar */}
      <View style={styles.viewToggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, viewMode === 'logs' && styles.toggleBtnActive]}
          onPress={() => setViewMode('logs')}
        >
          <Ionicons
            name="list-outline"
            size={15}
            color={viewMode === 'logs' ? '#FFFFFF' : Colors.textSecondary}
          />
          <Text
            style={[styles.toggleBtnText, viewMode === 'logs' && styles.toggleBtnTextActive]}
          >
            Daily Logs
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleBtn, viewMode === 'calendar' && styles.toggleBtnActive]}
          onPress={() => setViewMode('calendar')}
        >
          <Ionicons
            name="calendar-outline"
            size={15}
            color={viewMode === 'calendar' ? '#FFFFFF' : Colors.textSecondary}
          />
          <Text
            style={[styles.toggleBtnText, viewMode === 'calendar' && styles.toggleBtnTextActive]}
          >
            Monthly Calendar
          </Text>
        </TouchableOpacity>
      </View>

      {viewMode === 'calendar' ? (
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }}>
          <AttendanceCalendar />
        </ScrollView>
      ) : (
        <>
          {/* Filter Strip */}
          <View style={styles.filterSection}>
            <Input
              placeholder="Filter by employee name or ID..."
              value={search}
              onChangeText={setSearch}
              leftIcon={<Ionicons name="search-outline" size={18} color={Colors.textSecondary} />}
              containerStyle={{ marginBottom: 8 }}
            />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusChipsRow}>
              {statusOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.statusChip, statusFilter === opt.value && styles.statusChipActive]}
                  onPress={() => setStatusFilter(opt.value)}
                >
                  <Text style={[styles.statusChipText, statusFilter === opt.value && styles.statusChipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {loading && !refreshing ? (
            <View style={styles.loadingBox}>
              <LoadingSkeleton height={120} style={{ marginBottom: 12 }} />
              <LoadingSkeleton height={120} style={{ marginBottom: 12 }} />
              <LoadingSkeleton height={120} />
            </View>
          ) : errorMessage ? (
            <ErrorView message={errorMessage} onRetry={() => loadLogs()} />
          ) : (
            <FlatList
              data={records}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[Colors.primary]}
                />
              }
              ListHeaderComponent={
                <Text style={styles.recordsHeader}>LOG ENTRIES ({records.length})</Text>
              }
              ListEmptyComponent={
                <EmptyState
                  title="No Attendance Logs"
                  description="No entries matched the query or filter criteria."
                />
              }
            />
          )}
        </>
      )}

      {/* Override Modal */}
      <Modal
        visible={showOverrideModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowOverrideModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manual Attendance Override</Text>
              <TouchableOpacity onPress={() => setShowOverrideModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }}>
              <Input
                label="Employee ID"
                placeholder="e.g. SH-GO-98-0001"
                value={overrideEmpId}
                onChangeText={setOverrideEmpId}
                required
              />

              <Input
                label="Date"
                placeholder="YYYY-MM-DD"
                value={overrideDate}
                onChangeText={setOverrideDate}
                required
              />

              <Text style={styles.label}>Status *</Text>
              <View style={styles.chipsRow}>
                {['on_time', 'in_buffer', 'late', 'half_day', 'on_leave', 'absent'].map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[styles.chip, overrideStatus === st && styles.chipActive]}
                    onPress={() => setOverrideStatus(st)}
                  >
                    <Text style={[styles.chipText, overrideStatus === st && styles.chipTextActive]}>
                      {st.replace('_', ' ').toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Punch In Time"
                    placeholder="HH:MM (e.g. 09:30)"
                    value={overridePunchIn}
                    onChangeText={setOverridePunchIn}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Punch Out Time"
                    placeholder="HH:MM (e.g. 18:30)"
                    value={overridePunchOut}
                    onChangeText={setOverridePunchOut}
                  />
                </View>
              </View>

              <Input
                label="Admin Reason / Remarks"
                placeholder="Explain reason for manual adjustment"
                value={overrideReason}
                onChangeText={setOverrideReason}
              />

              <Button
                title="Save Override Record"
                onPress={handleSubmitOverride}
                loading={submittingOverride}
                variant="primary"
                style={{ marginTop: 8 }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  viewToggleRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.surfaceSubtle,
    gap: 6,
  },
  toggleBtnActive: {
    backgroundColor: Colors.primaryDark,
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  toggleBtnTextActive: {
    color: '#FFFFFF',
  },
  iconBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.surfaceSubtle,
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statusChipsRow: {
    gap: 8,
    paddingBottom: 4,
  },
  statusChip: {
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  statusChipActive: {
    backgroundColor: Colors.primaryTint,
    borderColor: Colors.primary,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  statusChipTextActive: {
    color: '#1A1612',
    fontWeight: '800',
  },
  loadingBox: {
    padding: 16,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  recordsHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  recordCard: {
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  empName: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  empSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  dateText: {
    fontSize: 12,
    color: Colors.primaryDark,
    fontWeight: '700',
    marginTop: 2,
  },
  timesContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  timeBox: {
    flex: 1,
  },
  timeDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 10,
  },
  timeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  timeVal: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  locText: {
    fontSize: 10,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  remarkBox: {
    backgroundColor: Colors.warningBg,
    borderRadius: 6,
    padding: 6,
    marginBottom: 6,
  },
  remarkText: {
    fontSize: 11,
    color: Colors.warning,
    fontWeight: '600',
  },
  overrideTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.infoBg,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  overrideTagText: {
    fontSize: 10,
    color: Colors.info,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  chip: {
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  chipActive: {
    backgroundColor: Colors.primaryTint,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: '#1A1612',
    fontWeight: '800',
  },
});
