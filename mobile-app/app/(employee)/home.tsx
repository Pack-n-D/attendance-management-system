/**
 * Employee Home Dashboard & Punch In/Out Screen
 * Recreates frontend/src/pages/Employee/Home.jsx
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import Colors from '../../constants/Colors';
import Card from '../../components/Card';
import Button from '../../components/Button';
import StatusBadge from '../../components/StatusBadge';
import CameraModal from '../../components/CameraModal';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import ErrorView from '../../components/ErrorView';
import Input from '../../components/Input';
import Logo from '../../components/Logo';
import { attendanceService } from '../../services/attendanceService';
import { useLocation } from '../../hooks/useLocation';
import {
  TodayAttendanceStatusResponse,
  AttendanceRecord,
  ShiftType,
} from '../../types';
import { formatDate, formatTime, getGreeting } from '../../utils/formatters';

export default function EmployeeHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();

  const [todayData, setTodayData] = useState<TodayAttendanceStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Punch actions
  const [showCamera, setShowCamera] = useState(false);
  const [punchActionType, setPunchActionType] = useState<'in' | 'out'>('in');
  const [shiftType, setShiftType] = useState<ShiftType>('full_day');
  const [lateReason, setLateReason] = useState('');
  const [submittingPunch, setSubmittingPunch] = useState(false);

  // Live clock
  const [currentTime, setCurrentTime] = useState(new Date());

  // Geolocation
  const locationHook = useLocation(todayData?.rule);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setErrorMessage(null);
    try {
      const data = await attendanceService.getTodayStatus();
      setTodayData(data);
      await refreshUser();
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to load today attendance status.');
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, [refreshUser]);

  useEffect(() => {
    loadData();
    locationHook.refreshLocation();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadData(true), locationHook.refreshLocation()]);
  };

  const record: AttendanceRecord | null | undefined = todayData?.record;
  const hasPunchedIn = !!record?.punchInTime;
  const hasPunchedOut = !!record?.punchOutTime;
  const isWfhToday = !!todayData?.isWfhToday;

  const handleStartPunch = (type: 'in' | 'out') => {
    setPunchActionType(type);
    setShowCamera(true);
  };

  const handlePhotoCaptured = async (base64Photo: string) => {
    setSubmittingPunch(true);

    try {
      // Re-check GPS location
      const loc = await locationHook.refreshLocation();
      const lat = loc?.latitude;
      const lng = loc?.longitude;
      const accuracy = loc?.accuracy;

      if (punchActionType === 'in') {
        const res = await attendanceService.punchIn({
          photo: base64Photo,
          latitude: lat,
          longitude: lng,
          accuracy,
          shiftType,
          lateReason: lateReason.trim() || undefined,
        });

        Alert.alert('Punch In Successful 🎉', res.message);
      } else {
        const res = await attendanceService.punchOut({
          photo: base64Photo,
          latitude: lat,
          longitude: lng,
          accuracy,
        });

        Alert.alert('Punch Out Successful ⏱️', res.message);
      }

      setLateReason('');
      await loadData(true);
    } catch (err: any) {
      Alert.alert('Punch Failed', err.message || 'Server rejected punch request.');
    } finally {
      setSubmittingPunch(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSkeleton height={140} style={{ marginBottom: 16 }} />
        <LoadingSkeleton height={220} style={{ marginBottom: 16 }} />
        <LoadingSkeleton height={180} />
      </View>
    );
  }

  if (errorMessage && !todayData) {
    return <ErrorView message={errorMessage} onRetry={() => loadData()} />;
  }

  return (
    <View style={styles.container}>
      {/* Top Navbar */}
      <View style={[styles.navbar, { paddingTop: Math.max(insets.top, 14) }]}>
        <Logo size="small" showSubtitle={false} />
        <TouchableOpacity
          style={styles.profileBadge}
          onPress={() => router.push('/(employee)/profile')}
        >
          <Ionicons name="person-circle-outline" size={26} color={Colors.textPrimary} />
          <Text style={styles.profileName} numberOfLines={1}>
            {user?.firstName || 'Employee'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Welcome Greeting & Live Clock Card */}
        <Card style={styles.clockCard} elevated>
          <View style={styles.greetingRow}>
            <View>
              <Text style={styles.greetingText}>
                {getGreeting()}, {user?.firstName}!
              </Text>
              <Text style={styles.dateSubtext}>
                {formatDate(todayData?.todayDate || new Date().toISOString().slice(0, 10))}
              </Text>
            </View>
            <StatusBadge status={record?.status || 'not_punched'} />
          </View>

          {/* Large Live Digital Clock */}
          <View style={styles.clockBox}>
            <Text style={styles.clockDigits}>
              {currentTime.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true,
              })}
            </Text>
            <Text style={styles.clockTz}>IST (Maharashtra GMT+5:30)</Text>
          </View>
        </Card>

        {/* Geofence / Remote WFH Status Banner */}
        <View style={styles.statusBanner}>
          <Ionicons
            name={
              isWfhToday
                ? 'home-outline'
                : locationHook.geofenceResult?.isValid
                ? 'checkmark-circle-outline'
                : 'location-outline'
            }
            size={18}
            color={
              isWfhToday
                ? Colors.info
                : locationHook.geofenceResult?.isValid
                ? Colors.success
                : Colors.warning
            }
          />
          <Text style={styles.statusBannerText} numberOfLines={2}>
            {isWfhToday
              ? 'Work From Home Approved (Remote punch authorized)'
              : locationHook.status === 'locating'
              ? 'Verifying office GPS perimeter...'
              : locationHook.distanceFromOffice != null
              ? `Office Proximity: ${locationHook.distanceFromOffice}m (${
                  locationHook.geofenceResult?.isValid ? 'Inside office' : 'Outside perimeter'
                })`
              : 'GPS verification ready for punch'}
          </Text>
          <TouchableOpacity onPress={() => locationHook.refreshLocation()}>
            <Ionicons name="refresh-outline" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Main Punch Action Card */}
        <Card style={styles.punchCard} elevated>
          <Text style={styles.punchCardTitle}>TODAY'S ATTENDANCE</Text>

          {/* Shift Type Selection (Only shown before punch in) */}
          {!hasPunchedIn && (
            <View style={styles.shiftContainer}>
              <Text style={styles.shiftLabel}>Select Shift Type:</Text>
              <View style={styles.shiftButtonsRow}>
                <TouchableOpacity
                  style={[
                    styles.shiftPill,
                    shiftType === 'full_day' && styles.shiftPillActive,
                  ]}
                  onPress={() => setShiftType('full_day')}
                >
                  <Ionicons
                    name="sunny-outline"
                    size={14}
                    color={shiftType === 'full_day' ? '#1A1612' : Colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.shiftPillText,
                      shiftType === 'full_day' && styles.shiftPillTextActive,
                    ]}
                  >
                    Full Day (09:30 - 18:30)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.shiftPill,
                    shiftType === 'second_half' && styles.shiftPillActive,
                  ]}
                  onPress={() => setShiftType('second_half')}
                >
                  <Ionicons
                    name="partly-sunny-outline"
                    size={14}
                    color={shiftType === 'second_half' ? '#1A1612' : Colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.shiftPillText,
                      shiftType === 'second_half' && styles.shiftPillTextActive,
                    ]}
                  >
                    Second Half (13:00 - 18:30)
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Late reason field if after buffer */}
              <Input
                label="Late Reason (Optional / If past buffer time)"
                placeholder="e.g. Client visit, traffic delay"
                value={lateReason}
                onChangeText={setLateReason}
                containerStyle={{ marginTop: 12 }}
              />
            </View>
          )}

          {/* Punch Buttons */}
          <View style={styles.punchButtonsRow}>
            <Button
              title={hasPunchedIn ? `In at ${formatTime(record?.punchInTime)}` : 'Punch In'}
              onPress={() => handleStartPunch('in')}
              disabled={hasPunchedIn || submittingPunch}
              loading={submittingPunch && punchActionType === 'in'}
              variant="primary"
              size="large"
              icon={<Ionicons name="enter-outline" size={20} color="#1A1612" />}
              style={{ flex: 1 }}
            />

            <Button
              title={
                hasPunchedOut
                  ? `Out at ${formatTime(record?.punchOutTime)}`
                  : 'Punch Out'
              }
              onPress={() => handleStartPunch('out')}
              disabled={!hasPunchedIn || hasPunchedOut || submittingPunch}
              loading={submittingPunch && punchActionType === 'out'}
              variant={hasPunchedIn && !hasPunchedOut ? 'danger' : 'secondary'}
              size="large"
              icon={<Ionicons name="exit-outline" size={20} color={hasPunchedIn && !hasPunchedOut ? '#FFFFFF' : Colors.textPrimary} />}
              style={{ flex: 1 }}
            />
          </View>

          {/* Today's Punch Details */}
          {hasPunchedIn && (
            <View style={styles.recordDetails}>
              <View style={styles.recordRow}>
                <Text style={styles.recordLabel}>Punch In Time:</Text>
                <Text style={styles.recordValue}>{formatTime(record?.punchInTime)}</Text>
              </View>

              {record?.punchInLocation && (
                <View style={styles.recordRow}>
                  <Text style={styles.recordLabel}>In Location:</Text>
                  <Text style={styles.recordValueSub} numberOfLines={1}>
                    {record.punchInLocation}
                  </Text>
                </View>
              )}

              {hasPunchedOut && (
                <>
                  <View style={styles.recordRow}>
                    <Text style={styles.recordLabel}>Punch Out Time:</Text>
                    <Text style={styles.recordValue}>{formatTime(record?.punchOutTime)}</Text>
                  </View>
                  {record?.punchOutLocation && (
                    <View style={styles.recordRow}>
                      <Text style={styles.recordLabel}>Out Location:</Text>
                      <Text style={styles.recordValueSub} numberOfLines={1}>
                        {record.punchOutLocation}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          )}
        </Card>

        {/* Leave Balances Strip */}
        <Text style={styles.sectionHeader}>LEAVE BALANCES</Text>
        <View style={styles.balanceRow}>
          <Card style={styles.balanceCard}>
            <Text style={styles.balanceCount}>{user?.casualLeaveBalance ?? 12}</Text>
            <Text style={styles.balanceName}>Casual</Text>
          </Card>
          <Card style={styles.balanceCard}>
            <Text style={styles.balanceCount}>{user?.sickLeaveBalance ?? 12}</Text>
            <Text style={styles.balanceName}>Sick</Text>
          </Card>
          <Card style={styles.balanceCard}>
            <Text style={styles.balanceCount}>{user?.paidLeaveBalance ?? 15}</Text>
            <Text style={styles.balanceName}>Paid</Text>
          </Card>
          <Card style={styles.balanceCard}>
            <Text style={styles.balanceCount}>{user?.coffBalance ?? 0}</Text>
            <Text style={styles.balanceName}>C-Off</Text>
          </Card>
        </View>

        {/* Quick Actions Grid */}
        <Text style={styles.sectionHeader}>QUICK ACTIONS</Text>
        <View style={styles.shortcutsGrid}>
          <TouchableOpacity
            style={styles.shortcutBtn}
            onPress={() => router.push('/(employee)/leave')}
          >
            <View style={[styles.shortcutIconBg, { backgroundColor: Colors.warningBg }]}>
              <Ionicons name="briefcase-outline" size={20} color={Colors.warning} />
            </View>
            <Text style={styles.shortcutTitle}>Apply Leave</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shortcutBtn}
            onPress={() => router.push('/(employee)/wfh')}
          >
            <View style={[styles.shortcutIconBg, { backgroundColor: Colors.infoBg }]}>
              <Ionicons name="laptop-outline" size={20} color={Colors.info} />
            </View>
            <Text style={styles.shortcutTitle}>Apply WFH</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shortcutBtn}
            onPress={() => router.push('/(employee)/reimbursements')}
          >
            <View style={[styles.shortcutIconBg, { backgroundColor: Colors.successBg }]}>
              <Ionicons name="receipt-outline" size={20} color={Colors.success} />
            </View>
            <Text style={styles.shortcutTitle}>Claim Expense</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shortcutBtn}
            onPress={() => router.push('/(employee)/salary')}
          >
            <View style={[styles.shortcutIconBg, { backgroundColor: Colors.primaryTint }]}>
              <Ionicons name="cash-outline" size={20} color={Colors.primaryDark} />
            </View>
            <Text style={styles.shortcutTitle}>Salary Slip</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Camera Capture Modal */}
      <CameraModal
        visible={showCamera}
        onClose={() => setShowCamera(false)}
        onPhotoCaptured={handlePhotoCaptured}
        title={punchActionType === 'in' ? 'Punch In Selfie' : 'Punch Out Selfie'}
        subtitle="Capture a live face verification photo to record your punch."
        preferFrontCamera={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: Colors.background,
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceSubtle,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  profileName: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
    maxWidth: 90,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  clockCard: {
    padding: 18,
    marginBottom: 12,
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  greetingText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  dateSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  clockBox: {
    alignItems: 'center',
    backgroundColor: Colors.surfaceSubtle,
    paddingVertical: 14,
    borderRadius: 10,
  },
  clockDigits: {
    fontSize: 30,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  clockTz: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    gap: 8,
  },
  statusBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  punchCard: {
    padding: 16,
    marginBottom: 16,
  },
  punchCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  shiftContainer: {
    marginBottom: 14,
  },
  shiftLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  shiftButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  shiftPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 4,
  },
  shiftPillActive: {
    backgroundColor: Colors.primaryTint,
    borderColor: Colors.primary,
  },
  shiftPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  shiftPillTextActive: {
    color: '#1A1612',
    fontWeight: '800',
  },
  punchButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  recordDetails: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
    gap: 6,
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  recordValue: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  recordValueSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    maxWidth: 200,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 6,
  },
  balanceRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  balanceCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  balanceCount: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  balanceName: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  shortcutsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  shortcutBtn: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  shortcutIconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
});
