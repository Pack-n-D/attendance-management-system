/**
 * Super Admin Settings & Attendance Rules Screen
 * Recreates frontend/src/pages/Admin/AttendanceSettings.jsx
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import Card from '../../components/Card';
import Header from '../../components/Header';
import Button from '../../components/Button';
import Input from '../../components/Input';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import ErrorView from '../../components/ErrorView';
import { adminService } from '../../services/adminService';
import { AttendanceRule, Holiday } from '../../types';
import { formatDate } from '../../utils/formatters';

export default function AdminSettingsScreen() {
  const [rule, setRule] = useState<AttendanceRule | null>(null);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states for rules
  const [idealIn, setIdealIn] = useState('09:30');
  const [idealOut, setIdealOut] = useState('18:30');
  const [bufferIn, setBufferIn] = useState('15');
  const [bufferOut, setBufferOut] = useState('15');
  const [halfDayIn, setHalfDayIn] = useState('12:00');
  const [secondHalfStart, setSecondHalfStart] = useState('13:00');
  const [secondHalfOut, setSecondHalfOut] = useState('18:30');

  // Geofence states
  const [officeAddress, setOfficeAddress] = useState('');
  const [officeLat, setOfficeLat] = useState('20.0021966');
  const [officeLng, setOfficeLng] = useState('73.7762006');
  const [allowedRadius, setAllowedRadius] = useState('120');
  const [geofenceEnabled, setGeofenceEnabled] = useState(true);
  const [savingRules, setSavingRules] = useState(false);

  // Holiday Modal
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayLabel, setNewHolidayLabel] = useState('');
  const [addingHoliday, setAddingHoliday] = useState(false);

  const loadSettings = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setErrorMessage(null);
    try {
      const [rulesRes, holidaysRes] = await Promise.all([
        adminService.getAttendanceRules(),
        adminService.getHolidays(),
      ]);

      const r = rulesRes.rule;
      setRule(r);
      setIdealIn(r.idealPunchInTime || '09:30');
      setIdealOut(r.idealPunchOutTime || '18:30');
      setBufferIn(String(r.bufferMinutesIn || 15));
      setBufferOut(String(r.bufferMinutesOut || 15));
      setHalfDayIn(r.halfDayThresholdIn || '12:00');
      setSecondHalfStart(r.secondHalfStartTime || '13:00');
      setSecondHalfOut(r.secondHalfMinPunchOut || '18:30');

      setOfficeAddress(r.officeAddress || '');
      setOfficeLat(String(r.officeLat ?? 20.0021966));
      setOfficeLng(String(r.officeLng ?? 73.7762006));
      setAllowedRadius(String(r.allowedRadiusMeters ?? 120));
      setGeofenceEnabled(r.geofenceEnabled ?? true);

      setHolidays(holidaysRes.holidays);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load platform settings.');
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const onRefresh = () => {
    setRefreshing(true);
    loadSettings(true);
  };

  const handleSaveRules = async () => {
    setSavingRules(true);
    try {
      const payload: Partial<AttendanceRule> = {
        idealPunchInTime: idealIn.trim(),
        idealPunchOutTime: idealOut.trim(),
        bufferMinutesIn: parseInt(bufferIn, 10) || 15,
        bufferMinutesOut: parseInt(bufferOut, 10) || 15,
        halfDayThresholdIn: halfDayIn.trim(),
        secondHalfStartTime: secondHalfStart.trim(),
        secondHalfEndTime: secondHalfOut.trim(),
        secondHalfMinPunchOut: secondHalfOut.trim(),
        officeAddress: officeAddress.trim(),
        officeLat: parseFloat(officeLat) || 20.0021966,
        officeLng: parseFloat(officeLng) || 73.7762006,
        allowedRadiusMeters: parseFloat(allowedRadius) || 120,
        geofenceEnabled,
      };

      const res = await adminService.updateAttendanceRules(payload);
      Alert.alert('Rules Updated', res.message);
      await loadSettings(true);
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Server error.');
    } finally {
      setSavingRules(false);
    }
  };

  const handleAddHoliday = async () => {
    if (!newHolidayDate.trim() || !newHolidayLabel.trim()) {
      Alert.alert('Required', 'Date (YYYY-MM-DD) and label are required.');
      return;
    }

    setAddingHoliday(true);
    try {
      const res = await adminService.addHoliday(newHolidayDate.trim(), newHolidayLabel.trim());
      Alert.alert('Success', res.message);
      setShowHolidayModal(false);
      setNewHolidayDate('');
      setNewHolidayLabel('');
      await loadSettings(true);
    } catch (err: any) {
      Alert.alert('Failed to Add', err.message || 'Server error.');
    } finally {
      setAddingHoliday(false);
    }
  };

  const handleDeleteHoliday = (h: Holiday) => {
    Alert.alert('Delete Holiday', `Remove "${h.label}" on ${h.date}?`, [
      { text: 'Cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await adminService.deleteHoliday(h.id);
            await loadSettings(true);
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Header title="Attendance & Geofence" />

      {loading && !refreshing ? (
        <View style={styles.loadingBox}>
          <LoadingSkeleton height={140} style={{ marginBottom: 14 }} />
          <LoadingSkeleton height={180} style={{ marginBottom: 14 }} />
          <LoadingSkeleton height={120} />
        </View>
      ) : errorMessage ? (
        <ErrorView message={errorMessage} onRetry={() => loadSettings()} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
            />
          }
        >
          {/* Shift Schedule Card */}
          <Card style={styles.sectionCard} elevated>
            <Text style={styles.sectionTitle}>ATTENDANCE SCHEDULE RULES</Text>

            <View style={styles.rowTwoCols}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Ideal In Time"
                  placeholder="09:30"
                  value={idealIn}
                  onChangeText={setIdealIn}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Ideal Out Time"
                  placeholder="18:30"
                  value={idealOut}
                  onChangeText={setIdealOut}
                />
              </View>
            </View>

            <View style={styles.rowTwoCols}>
              <View style={{ flex: 1 }}>
                <Input
                  label="In Buffer (Mins)"
                  placeholder="15"
                  value={bufferIn}
                  onChangeText={setBufferIn}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Out Buffer (Mins)"
                  placeholder="15"
                  value={bufferOut}
                  onChangeText={setBufferOut}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.rowTwoCols}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Half Day Cutoff"
                  placeholder="12:00"
                  value={halfDayIn}
                  onChangeText={setHalfDayIn}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="2nd Half Min Out"
                  placeholder="18:30"
                  value={secondHalfOut}
                  onChangeText={setSecondHalfOut}
                />
              </View>
            </View>
          </Card>

          {/* Geofence & Office Coordinates Card */}
          <Card style={styles.sectionCard} elevated>
            <View style={styles.geofenceHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>OFFICE GEOFENCING & GPS</Text>
                <Text style={styles.geofenceSub}>
                  Restricts attendance punch to office perimeter
                </Text>
              </View>
              <Switch
                value={geofenceEnabled}
                onValueChange={setGeofenceEnabled}
                trackColor={{ false: Colors.border, true: Colors.primary }}
              />
            </View>

            <Input
              label="Office Registered Address"
              value={officeAddress}
              onChangeText={setOfficeAddress}
              multiline
              numberOfLines={2}
            />

            <View style={styles.rowTwoCols}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Office Latitude"
                  value={officeLat}
                  onChangeText={setOfficeLat}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Office Longitude"
                  value={officeLng}
                  onChangeText={setOfficeLng}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <Input
              label="Allowed Radius (Meters)"
              value={allowedRadius}
              onChangeText={setAllowedRadius}
              keyboardType="numeric"
              helperText="Standard radius is 120m with 25m mobile GPS buffer."
            />

            <Button
              title="Save Attendance & Geofence Rules"
              onPress={handleSaveRules}
              loading={savingRules}
              variant="primary"
              style={{ marginTop: 8 }}
            />
          </Card>

          {/* Official Company Holidays */}
          <Card style={styles.sectionCard}>
            <View style={styles.holidaysHeader}>
              <Text style={styles.sectionTitle}>
                COMPANY HOLIDAYS CALENDAR ({holidays.length})
              </Text>
              <Button
                title="+ Add Holiday"
                onPress={() => setShowHolidayModal(true)}
                variant="outline"
                size="small"
              />
            </View>

            {holidays.length > 0 ? (
              holidays.map((h, idx) => (
                <View key={h.id}>
                  {idx > 0 && <View style={styles.divider} />}
                  <View style={styles.holidayRow}>
                    <View style={styles.holidayIcon}>
                      <Ionicons name="sparkles-outline" size={16} color={Colors.primaryDark} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.holidayLabel}>{h.label}</Text>
                      <Text style={styles.holidayDate}>{formatDate(h.date)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteHoliday(h)}>
                      <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyNote}>No holidays configured for this calendar year.</Text>
            )}
          </Card>
        </ScrollView>
      )}

      {/* Add Holiday Modal */}
      <Modal
        visible={showHolidayModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowHolidayModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Official Holiday</Text>
              <TouchableOpacity onPress={() => setShowHolidayModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Input
              label="Holiday Date"
              placeholder="YYYY-MM-DD (e.g. 2026-10-24)"
              value={newHolidayDate}
              onChangeText={setNewHolidayDate}
              required
            />

            <Input
              label="Holiday Name / Label"
              placeholder="e.g. Diwali / New Year"
              value={newHolidayLabel}
              onChangeText={setNewHolidayLabel}
              required
            />

            <Button
              title="Add to Calendar"
              onPress={handleAddHoliday}
              loading={addingHoliday}
              variant="primary"
              style={{ marginTop: 8 }}
            />
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
  loadingBox: {
    padding: 16,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionCard: {
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: 12,
  },
  geofenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  geofenceSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  holidaysHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  holidayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  holidayIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  holidayLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  holidayDate: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 4,
  },
  emptyNote: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontStyle: 'italic',
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
});
