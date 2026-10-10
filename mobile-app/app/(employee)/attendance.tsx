/**
 * Employee Attendance History Screen
 * Recreates frontend/src/pages/Employee/AttendanceHistory.jsx
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import Card from '../../components/Card';
import Header from '../../components/Header';
import StatusBadge from '../../components/StatusBadge';
import StatCard from '../../components/StatCard';
import EmptyState from '../../components/EmptyState';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import ErrorView from '../../components/ErrorView';
import { employeeService } from '../../services/employeeService';
import { AttendanceRecord } from '../../types';
import { formatDate, formatTime } from '../../utils/formatters';

export default function AttendanceHistoryScreen() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState({
    present: 0,
    late: 0,
    absent: 0,
    onLeave: 0,
    totalDays: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadHistory = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setErrorMessage(null);
    try {
      const res = await employeeService.getAttendanceHistory();
      setRecords(res.records);
      setSummary(res.summary);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to load attendance history.');
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const onRefresh = () => {
    setRefreshing(true);
    loadHistory(true);
  };

  const renderItem = ({ item }: { item: AttendanceRecord }) => (
    <Card style={styles.recordCard}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.recordDate}>{formatDate(item.date)}</Text>
          <Text style={styles.shiftLabel}>
            {item.shiftType === 'second_half' ? 'Second Half / Half Day' : 'Full Day'}
            {item.isWfh ? ' • Remote WFH' : ''}
          </Text>
        </View>
        <StatusBadge status={item.status} />
      </View>

      <View style={styles.timesContainer}>
        <View style={styles.timeBox}>
          <Text style={styles.timeLabel}>PUNCH IN</Text>
          <Text style={styles.timeVal}>{formatTime(item.punchInTime)}</Text>
          {item.punchInLocation && (
            <Text style={styles.locText} numberOfLines={1}>
              {item.punchInLocation}
            </Text>
          )}
        </View>

        <View style={styles.timeDivider} />

        <View style={styles.timeBox}>
          <Text style={styles.timeLabel}>PUNCH OUT</Text>
          <Text style={styles.timeVal}>{formatTime(item.punchOutTime)}</Text>
          {item.punchOutLocation && (
            <Text style={styles.locText} numberOfLines={1}>
              {item.punchOutLocation}
            </Text>
          )}
        </View>
      </View>

      {item.lateReason && (
        <View style={styles.lateReasonBox}>
          <Ionicons name="chatbubble-ellipses-outline" size={14} color={Colors.warning} />
          <Text style={styles.lateReasonText}>Reason: {item.lateReason}</Text>
        </View>
      )}

      {item.punchInPhotoUrl && (
        <View style={styles.photoRow}>
          <Image
            source={{ uri: item.punchInPhotoUrl }}
            style={styles.selfieThumbnail}
          />
          <Text style={styles.verifiedText}>Verified with selfie</Text>
        </View>
      )}
    </Card>
  );

  return (
    <View style={styles.container}>
      <Header title="Attendance History" />

      {loading && !refreshing ? (
        <View style={styles.loadingBox}>
          <LoadingSkeleton height={80} style={{ marginBottom: 12 }} />
          <LoadingSkeleton height={130} style={{ marginBottom: 12 }} />
          <LoadingSkeleton height={130} />
        </View>
      ) : errorMessage ? (
        <ErrorView message={errorMessage} onRetry={() => loadHistory()} />
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
            <View style={styles.summarySection}>
              <Text style={styles.summaryTitle}>MONTHLY SUMMARY</Text>
              <View style={styles.statsRow}>
                <StatCard
                  title="Present"
                  value={summary.present}
                  variant="success"
                  icon={<Ionicons name="checkmark-done" size={16} color={Colors.success} />}
                />
                <StatCard
                  title="Late"
                  value={summary.late}
                  variant="warning"
                  icon={<Ionicons name="time-outline" size={16} color={Colors.warning} />}
                />
              </View>
              <View style={[styles.statsRow, { marginTop: 8 }]}>
                <StatCard
                  title="Absent"
                  value={summary.absent}
                  variant="danger"
                  icon={<Ionicons name="close-circle-outline" size={16} color={Colors.danger} />}
                />
                <StatCard
                  title="On Leave"
                  value={summary.onLeave}
                  variant="info"
                  icon={<Ionicons name="calendar-outline" size={16} color={Colors.info} />}
                />
              </View>
              <Text style={styles.recordsHeader}>ATTENDANCE RECORDS ({records.length})</Text>
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              title="No Attendance Records"
              description="No attendance entries recorded for this period yet."
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingBox: {
    padding: 16,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  summarySection: {
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  recordsHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginTop: 18,
    marginBottom: 10,
  },
  recordCard: {
    padding: 16,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  recordDate: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  shiftLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  timesContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 8,
    padding: 12,
  },
  timeBox: {
    flex: 1,
  },
  timeDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 12,
  },
  timeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  timeVal: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  locText: {
    fontSize: 10,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  lateReasonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warningBg,
    borderRadius: 6,
    padding: 8,
    marginTop: 10,
    gap: 6,
  },
  lateReasonText: {
    fontSize: 11,
    color: Colors.warning,
    fontWeight: '600',
    flex: 1,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  selfieThumbnail: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  verifiedText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
});
