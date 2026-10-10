/**
 * Employee Leave Management Screen
 * Supports applying for leaves, tracking history, withdrawal, and manager reviews
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import Colors from '../../constants/Colors';
import Card from '../../components/Card';
import Header from '../../components/Header';
import Button from '../../components/Button';
import Input from '../../components/Input';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import ErrorView from '../../components/ErrorView';
import { employeeService } from '../../services/employeeService';
import { LeaveRequest } from '../../types';
import Config from '../../constants/Config';
import { formatDate } from '../../utils/formatters';

export default function LeaveScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'my' | 'team'>('my');

  const [myLeaves, setMyLeaves] = useState<LeaveRequest[]>([]);
  const [teamLeaves, setTeamLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Apply leave modal
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [leaveType, setLeaveType] = useState('Paid Leave');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Review modal
  const [reviewReq, setReviewReq] = useState<LeaveRequest | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadLeaves = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setErrorMessage(null);
    try {
      const myRes = await employeeService.getMyLeaveRequests();
      setMyLeaves(myRes.leaveRequests);

      // Check if user manages anyone or is admin
      try {
        const teamRes = await employeeService.getManagedLeaveRequests();
        setTeamLeaves(teamRes.leaveRequests);
      } catch {
        // Not a manager
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load leave requests.');
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLeaves();
  }, [loadLeaves]);

  const onRefresh = () => {
    setRefreshing(true);
    loadLeaves(true);
  };

  const handleApplyLeave = async () => {
    if (!startDate.trim() || !endDate.trim() || !reason.trim()) {
      Alert.alert('Missing Fields', 'Start date, end date, and reason are required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await employeeService.applyLeave({
        startDate: startDate.trim(),
        endDate: endDate.trim(),
        leaveType,
        reason: reason.trim(),
      });

      Alert.alert('Leave Submitted', res.message);
      setShowApplyModal(false);
      setStartDate('');
      setEndDate('');
      setReason('');
      await loadLeaves(true);
    } catch (err: any) {
      Alert.alert('Submission Error', err.message || 'Failed to submit leave.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = (req: LeaveRequest) => {
    Alert.alert(
      'Withdraw Leave',
      req.status === 'pending'
        ? 'Are you sure you want to cancel this pending leave request?'
        : 'Request withdrawal for this approved leave?',
      [
        { text: 'No' },
        {
          text: 'Yes, Withdraw',
          style: 'destructive',
          onPress: async () => {
            try {
              await employeeService.withdrawLeave(req.id, 'Employee requested cancellation');
              Alert.alert('Success', 'Leave request updated.');
              await loadLeaves(true);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to withdraw leave.');
            }
          },
        },
      ]
    );
  };

  const handleReviewAction = async (action: 'approve' | 'reject') => {
    if (!reviewReq) return;
    setSubmittingReview(true);
    try {
      const isWithdrawal = reviewReq.status === 'withdrawal_requested';
      const actualAction = isWithdrawal
        ? action === 'approve'
          ? 'approve_withdrawal'
          : 'reject_withdrawal'
        : action;

      const res = await employeeService.reviewLeave(
        reviewReq.id,
        actualAction,
        reviewComment.trim()
      );

      Alert.alert('Success', res.message);
      setReviewReq(null);
      setReviewComment('');
      await loadLeaves(true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to review request.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const hasTeamRequests = teamLeaves.length > 0;

  const renderItem = ({ item }: { item: LeaveRequest }) => {
    const isTeam = activeTab === 'team';
    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.leaveType}>{item.leaveType}</Text>
            {isTeam && item.employeeName ? (
              <Text style={styles.empName}>Employee: {item.employeeName}</Text>
            ) : null}
            <Text style={styles.dateRange}>
              {formatDate(item.startDate)} → {formatDate(item.endDate)}
            </Text>
          </View>
          <StatusBadge status={item.status} />
        </View>

        <Text style={styles.reasonText}>{item.reason}</Text>

        {item.managerComment ? (
          <View style={styles.commentBox}>
            <Text style={styles.commentText}>Manager: {item.managerComment}</Text>
          </View>
        ) : null}

        {/* Action Buttons */}
        {!isTeam && (item.status === 'pending' || item.status === 'approved') && (
          <Button
            title={item.status === 'pending' ? 'Cancel Request' : 'Request Withdrawal'}
            onPress={() => handleWithdraw(item)}
            variant="ghost"
            size="small"
            style={styles.actionBtn}
          />
        )}

        {isTeam && (item.status === 'pending' || item.status === 'withdrawal_requested') && (
          <Button
            title="Review Request"
            onPress={() => setReviewReq(item)}
            variant="primary"
            size="small"
            style={styles.actionBtn}
          />
        )}
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Leave Management"
        rightAction={
          <Button
            title="+ Apply"
            onPress={() => setShowApplyModal(true)}
            variant="primary"
            size="small"
          />
        }
      />

      {/* Tabs if user has managed requests */}
      {hasTeamRequests && (
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'my' && styles.tabActive]}
            onPress={() => setActiveTab('my')}
          >
            <Text style={[styles.tabText, activeTab === 'my' && styles.tabTextActive]}>
              My Requests ({myLeaves.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'team' && styles.tabActive]}
            onPress={() => setActiveTab('team')}
          >
            <Text style={[styles.tabText, activeTab === 'team' && styles.tabTextActive]}>
              Team Approvals ({teamLeaves.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {loading && !refreshing ? (
        <View style={styles.loadingBox}>
          <LoadingSkeleton height={120} style={{ marginBottom: 12 }} />
          <LoadingSkeleton height={120} />
        </View>
      ) : errorMessage ? (
        <ErrorView message={errorMessage} onRetry={() => loadLeaves()} />
      ) : (
        <FlatList
          data={activeTab === 'my' ? myLeaves : teamLeaves}
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
          ListEmptyComponent={
            <EmptyState
              title={activeTab === 'my' ? 'No Leave Requests' : 'No Team Requests'}
              description={
                activeTab === 'my'
                  ? 'You have not submitted any leave requests yet.'
                  : 'No pending leave requests from direct reports.'
              }
              actionTitle={activeTab === 'my' ? 'Apply for Leave' : undefined}
              onAction={activeTab === 'my' ? () => setShowApplyModal(true) : undefined}
            />
          }
        />
      )}

      {/* Apply Leave Modal */}
      <Modal
        visible={showApplyModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowApplyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Apply for Leave</Text>
              <TouchableOpacity onPress={() => setShowApplyModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Leave Type Selector Chips */}
            <Text style={styles.pickerLabel}>Leave Type:</Text>
            <View style={styles.chipsRow}>
              {Config.leaveTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.chip, leaveType === type && styles.chipActive]}
                  onPress={() => setLeaveType(type)}
                >
                  <Text style={[styles.chipText, leaveType === type && styles.chipTextActive]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input
              label="Start Date"
              placeholder="YYYY-MM-DD (e.g. 2026-10-15)"
              value={startDate}
              onChangeText={setStartDate}
              required
            />

            <Input
              label="End Date"
              placeholder="YYYY-MM-DD (e.g. 2026-10-17)"
              value={endDate}
              onChangeText={setEndDate}
              required
            />

            <Input
              label="Reason for Leave"
              placeholder="Enter brief reason"
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={3}
              required
            />

            <Button
              title="Submit Leave Application"
              onPress={handleApplyLeave}
              loading={submitting}
              variant="primary"
              style={{ marginTop: 8 }}
            />
          </View>
        </View>
      </Modal>

      {/* Manager Review Modal */}
      <Modal
        visible={!!reviewReq}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setReviewReq(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Review Leave Request</Text>
              <TouchableOpacity onPress={() => setReviewReq(null)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {reviewReq && (
              <View style={{ marginBottom: 14 }}>
                <Text style={styles.empName}>Employee: {reviewReq.employeeName}</Text>
                <Text style={styles.dateRange}>
                  {reviewReq.leaveType} ({reviewReq.startDate} to {reviewReq.endDate})
                </Text>
                <Text style={styles.reasonText}>Reason: {reviewReq.reason}</Text>
              </View>
            )}

            <Input
              label="Manager Comment (Optional)"
              placeholder="Add review remarks"
              value={reviewComment}
              onChangeText={setReviewComment}
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Button
                title="Reject"
                onPress={() => handleReviewAction('reject')}
                variant="danger"
                loading={submittingReview}
                style={{ flex: 1 }}
              />
              <Button
                title="Approve"
                onPress={() => handleReviewAction('approve')}
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
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: 16,
  },
  tab: {
    paddingVertical: 12,
    marginRight: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primaryDark,
  },
  loadingBox: {
    padding: 16,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  leaveType: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  empName: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryDark,
    marginTop: 2,
  },
  dateRange: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  reasonText: {
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 18,
    marginTop: 4,
  },
  commentBox: {
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
  },
  commentText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  actionBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
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
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  pickerLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  chipActive: {
    backgroundColor: Colors.primaryTint,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: '#1A1612',
    fontWeight: '800',
  },
});
