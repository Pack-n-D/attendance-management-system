/**
 * Super Admin Executive Dashboard Screen
 * Recreates frontend/src/pages/Admin/Dashboard.jsx
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import Colors from '../../constants/Colors';
import Card from '../../components/Card';
import StatCard from '../../components/StatCard';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Logo from '../../components/Logo';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import ErrorView from '../../components/ErrorView';
import { adminService } from '../../services/adminService';
import { DashboardStatsResponse, LeaveRequest, WFHRequest } from '../../types';
import { formatDate, formatTime } from '../../utils/formatters';

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [data, setData] = useState<DashboardStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Review modals
  const [reviewLeave, setReviewLeave] = useState<LeaveRequest | null>(null);
  const [reviewWfh, setReviewWfh] = useState<WFHRequest | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadDashboard = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setErrorMessage(null);
    try {
      const res = await adminService.getDashboard();
      setData(res);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load admin dashboard statistics.');
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard(true);
  };

  const handleReviewLeaveAction = async (action: 'approve' | 'reject') => {
    if (!reviewLeave) return;
    setSubmittingReview(true);
    try {
      const isWithdrawal = reviewLeave.status === 'withdrawal_requested';
      const actualAction = isWithdrawal
        ? action === 'approve'
          ? 'approve_withdrawal'
          : 'reject_withdrawal'
        : action;

      const res = await adminService.reviewLeaveRequest(
        reviewLeave.id,
        actualAction,
        reviewComment.trim()
      );
      Alert.alert('Success', res.message);
      setReviewLeave(null);
      setReviewComment('');
      await loadDashboard(true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to review request.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleReviewWfhAction = async (action: 'approve' | 'reject') => {
    if (!reviewWfh) return;
    setSubmittingReview(true);
    try {
      const isWithdrawal = reviewWfh.status === 'withdrawal_requested';
      const actualAction = isWithdrawal
        ? action === 'approve'
          ? 'approve_withdrawal'
          : 'reject_withdrawal'
        : action;

      const res = await adminService.reviewWFHRequest(
        reviewWfh.id,
        actualAction,
        reviewComment.trim()
      );
      Alert.alert('Success', res.message);
      setReviewWfh(null);
      setReviewComment('');
      await loadDashboard(true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to review request.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Log out of Super Admin session?', [
      { text: 'Cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const stats = data?.stats;

  return (
    <View style={styles.container}>
      {/* Top Admin Navbar */}
      <View style={styles.navbar}>
        <Logo size="small" showSubtitle={false} />
        <View style={styles.navRight}>
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>SUPER ADMIN</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
          </TouchableOpacity>
        </View>
      </View>

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
        {loading && !refreshing ? (
          <View>
            <LoadingSkeleton height={100} style={{ marginBottom: 12 }} />
            <LoadingSkeleton height={140} style={{ marginBottom: 12 }} />
            <LoadingSkeleton height={180} />
          </View>
        ) : errorMessage ? (
          <ErrorView message={errorMessage} onRetry={() => loadDashboard()} />
        ) : (
          <View>
            {/* Header Title */}
            <View style={styles.headerTitleRow}>
              <View>
                <Text style={styles.dashboardTitle}>Operations Overview</Text>
                <Text style={styles.dashboardDate}>
                  {formatDate(data?.todayDate || new Date().toISOString().slice(0, 10))}
                </Text>
              </View>
              <Button
                title="+ New Employee"
                onPress={() => router.push('/(admin)/employees/new')}
                variant="primary"
                size="small"
                icon={<Ionicons name="person-add" size={14} color="#1A1612" />}
              />
            </View>

            {/* Live KPI Metric Cards */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricRow}>
                <StatCard
                  title="Present"
                  value={stats?.present ?? 0}
                  variant="success"
                  icon={<Ionicons name="checkmark-done" size={16} color={Colors.success} />}
                />
                <StatCard
                  title="Late Arrivals"
                  value={stats?.late ?? 0}
                  variant="warning"
                  icon={<Ionicons name="time-outline" size={16} color={Colors.warning} />}
                />
              </View>

              <View style={[styles.metricRow, { marginTop: 8 }]}>
                <StatCard
                  title="Absent"
                  value={stats?.absent ?? 0}
                  variant="danger"
                  icon={<Ionicons name="close-circle-outline" size={16} color={Colors.danger} />}
                />
                <StatCard
                  title="On Leave"
                  value={stats?.onLeave ?? 0}
                  variant="info"
                  icon={<Ionicons name="calendar-outline" size={16} color={Colors.info} />}
                />
              </View>

              <View style={[styles.metricRow, { marginTop: 8 }]}>
                <StatCard
                  title="Active Employees"
                  value={stats?.totalEmployees ?? 0}
                  subtitle="Total registered staff"
                  variant="primary"
                  icon={<Ionicons name="people-outline" size={16} color={Colors.primaryDark} />}
                />
              </View>
            </View>

            {/* Pending Leave Requests Alert */}
            {data?.pendingLeaveRequests && data.pendingLeaveRequests.length > 0 && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>
                    PENDING LEAVE APPROVALS ({data.pendingLeaveRequests.length})
                  </Text>
                  <TouchableOpacity onPress={() => router.push('/(admin)/attendance')}>
                    <Text style={styles.viewAllText}>View All</Text>
                  </TouchableOpacity>
                </View>

                {data.pendingLeaveRequests.slice(0, 3).map((req) => (
                  <Card key={req.id} style={styles.pendingCard}>
                    <View style={styles.pendingHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pendingEmp}>{req.employeeName}</Text>
                        <Text style={styles.pendingDates}>
                          {req.leaveType} • {formatDate(req.startDate)} to {formatDate(req.endDate)}
                        </Text>
                        <Text style={styles.pendingReason} numberOfLines={2}>
                          "{req.reason}"
                        </Text>
                      </View>
                      <Button
                        title="Review"
                        onPress={() => setReviewLeave(req)}
                        variant="primary"
                        size="small"
                      />
                    </View>
                  </Card>
                ))}
              </View>
            )}

            {/* Pending WFH Requests Alert */}
            {data?.pendingWfhRequests && data.pendingWfhRequests.length > 0 && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>
                    PENDING WFH APPROVALS ({data.pendingWfhRequests.length})
                  </Text>
                </View>

                {data.pendingWfhRequests.slice(0, 3).map((wfh) => (
                  <Card key={wfh.id} style={styles.pendingCard}>
                    <View style={styles.pendingHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pendingEmp}>{wfh.employeeName}</Text>
                        <Text style={styles.pendingDates}>
                          Remote WFH • {formatDate(wfh.startDate)} to {formatDate(wfh.endDate)}
                        </Text>
                        <Text style={styles.pendingReason} numberOfLines={2}>
                          "{wfh.reason}"
                        </Text>
                      </View>
                      <Button
                        title="Review"
                        onPress={() => setReviewWfh(wfh)}
                        variant="primary"
                        size="small"
                      />
                    </View>
                  </Card>
                ))}
              </View>
            )}

            {/* Late Arrivals Today */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>
                LATE ARRIVALS TODAY ({data?.lateArrivalsToday?.length || 0})
              </Text>
              {data?.lateArrivalsToday && data.lateArrivalsToday.length > 0 ? (
                data.lateArrivalsToday.map((late) => (
                  <Card key={late.id} style={styles.lateCard}>
                    <View style={styles.lateRow}>
                      {late.photoUrl ? (
                        <Image source={{ uri: late.photoUrl }} style={styles.latePhoto} />
                      ) : (
                        <View style={styles.lateAvatar}>
                          <Ionicons name="person" size={16} color={Colors.warning} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.lateName}>{late.employeeName}</Text>
                        <Text style={styles.lateSub}>
                          {late.department} • Punched in at {formatTime(late.punchInTime)}
                        </Text>
                        <Text style={styles.lateReason}>Reason: {late.lateReason}</Text>
                      </View>
                    </View>
                  </Card>
                ))
              ) : (
                <Card style={styles.emptyCard}>
                  <Ionicons name="checkmark-circle-outline" size={24} color={Colors.success} />
                  <Text style={styles.emptyText}>No late arrivals reported today! Perfect punctuality.</Text>
                </Card>
              )}
            </View>

            {/* 30-Day Trend Summary Strip */}
            {data?.trendChart && data.trendChart.length > 0 && (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>30-DAY ATTENDANCE ACTIVITY</Text>
                <Card style={styles.trendCard}>
                  <Text style={styles.trendSummaryText}>
                    Active monitoring across {data.trendChart.length} business days.
                  </Text>
                  <View style={styles.trendBarsRow}>
                    {data.trendChart.slice(-14).map((day, idx) => {
                      const total = day.onTime + day.late + day.absent + day.onLeave || 1;
                      const onTimePercent = Math.round((day.onTime / total) * 100);
                      return (
                        <View key={day.date} style={styles.barCol}>
                          <View
                            style={[
                              styles.bar,
                              {
                                height: Math.max(12, Math.min(60, onTimePercent * 0.6)),
                                backgroundColor:
                                  day.onTime > 0 ? Colors.success : Colors.border,
                              },
                            ]}
                          />
                          <Text style={styles.barLabel}>{day.date.slice(8)}</Text>
                        </View>
                      );
                    })}
                  </View>
                </Card>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Leave Review Modal */}
      <Modal
        visible={!!reviewLeave}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setReviewLeave(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Admin Review: Leave Request</Text>
              <TouchableOpacity onPress={() => setReviewLeave(null)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {reviewLeave && (
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.modalSubHeader}>Employee: {reviewLeave.employeeName}</Text>
                <Text style={styles.modalSub}>
                  {reviewLeave.leaveType} ({reviewLeave.startDate} to {reviewLeave.endDate})
                </Text>
                <Text style={styles.modalReason}>Reason: {reviewLeave.reason}</Text>
              </View>
            )}

            <Input
              label="Admin Remarks (Optional)"
              placeholder="Add review remarks"
              value={reviewComment}
              onChangeText={setReviewComment}
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Button
                title="Reject"
                onPress={() => handleReviewLeaveAction('reject')}
                variant="danger"
                loading={submittingReview}
                style={{ flex: 1 }}
              />
              <Button
                title="Approve"
                onPress={() => handleReviewLeaveAction('approve')}
                variant="primary"
                loading={submittingReview}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* WFH Review Modal */}
      <Modal
        visible={!!reviewWfh}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setReviewWfh(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Admin Review: WFH Request</Text>
              <TouchableOpacity onPress={() => setReviewWfh(null)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {reviewWfh && (
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.modalSubHeader}>Employee: {reviewWfh.employeeName}</Text>
                <Text style={styles.modalSub}>
                  Remote WFH ({reviewWfh.startDate} to {reviewWfh.endDate})
                </Text>
                <Text style={styles.modalReason}>Reason: {reviewWfh.reason}</Text>
              </View>
            )}

            <Input
              label="Admin Remarks (Optional)"
              placeholder="Add review remarks"
              value={reviewComment}
              onChangeText={setReviewComment}
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Button
                title="Reject"
                onPress={() => handleReviewWfhAction('reject')}
                variant="danger"
                loading={submittingReview}
                style={{ flex: 1 }}
              />
              <Button
                title="Approve"
                onPress={() => handleReviewWfhAction('approve')}
                variant="primary"
                loading={submittingReview}
                style={{ flex: 1 }}
              />
            </View>
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
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  adminBadge: {
    backgroundColor: Colors.primaryTint,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1A1612',
    letterSpacing: 0.5,
  },
  logoutBtn: {
    padding: 6,
  },
  content: {
    padding: 16,
    paddingBottom: 36,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dashboardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  dashboardDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  metricsGrid: {
    marginBottom: 16,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sectionContainer: {
    marginBottom: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  pendingCard: {
    padding: 12,
    marginBottom: 8,
  },
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  pendingEmp: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  pendingDates: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  pendingReason: {
    fontSize: 12,
    color: Colors.textPrimary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  lateCard: {
    padding: 12,
    marginBottom: 8,
  },
  lateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  latePhoto: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  lateAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.warningBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lateName: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  lateSub: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  lateReason: {
    fontSize: 11,
    color: Colors.warning,
    fontWeight: '600',
    marginTop: 2,
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    backgroundColor: Colors.successBg,
    borderColor: Colors.successBorder,
  },
  emptyText: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '600',
    flex: 1,
  },
  trendCard: {
    padding: 14,
  },
  trendSummaryText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  trendBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 70,
  },
  barCol: {
    alignItems: 'center',
    gap: 4,
  },
  bar: {
    width: 14,
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 9,
    color: Colors.textTertiary,
    fontWeight: '700',
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
  modalSubHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  modalSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  modalReason: {
    fontSize: 12,
    color: Colors.textPrimary,
    marginTop: 4,
    fontStyle: 'italic',
  },
});
