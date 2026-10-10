/**
 * Super Admin Reimbursement Approvals Screen
 * Recreates frontend/src/pages/Admin/Reimbursements.jsx
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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import Card from '../../components/Card';
import Header from '../../components/Header';
import Button from '../../components/Button';
import Input from '../../components/Input';
import StatusBadge from '../../components/StatusBadge';
import StatCard from '../../components/StatCard';
import EmptyState from '../../components/EmptyState';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import ErrorView from '../../components/ErrorView';
import { adminService } from '../../services/adminService';
import { ReimbursementRequest } from '../../types';
import { formatDate, formatCurrency } from '../../utils/formatters';

export default function AdminReimbursementsScreen() {
  const [claims, setClaims] = useState<ReimbursementRequest[]>([]);
  const [stats, setStats] = useState({
    totalClaimed: 0,
    totalApproved: 0,
    totalPending: 0,
    totalRejected: 0,
    pendingCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('pending');
  const [search, setSearch] = useState('');

  // Review Modal
  const [reviewClaim, setReviewClaim] = useState<ReimbursementRequest | null>(null);
  const [adminComment, setAdminComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadClaims = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setErrorMessage(null);
    try {
      const res = await adminService.getAllReimbursements({
        status: statusFilter || undefined,
        search: search.trim() || undefined,
      });
      setClaims(res.reimbursements);
      setStats(res.stats);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load reimbursements.');
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    loadClaims();
  }, [loadClaims]);

  const onRefresh = () => {
    setRefreshing(true);
    loadClaims(true);
  };

  const handleReviewAction = async (action: 'approve' | 'reject') => {
    if (!reviewClaim) return;
    setSubmittingReview(true);
    try {
      const res = await adminService.reviewReimbursement(
        reviewClaim.id,
        action,
        adminComment.trim()
      );
      Alert.alert('Success', res.message);
      setReviewClaim(null);
      setAdminComment('');
      await loadClaims(true);
    } catch (err: any) {
      Alert.alert('Review Failed', err.message || 'Server error.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const renderItem = ({ item }: { item: ReimbursementRequest }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.empName}>{item.employeeName}</Text>
          <Text style={styles.categorySub}>{item.category} • {formatDate(item.expenseDate)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.amountText}>{formatCurrency(item.amount)}</Text>
          <StatusBadge status={item.status} size="small" />
        </View>
      </View>

      {item.description ? (
        <Text style={styles.descText}>{item.description}</Text>
      ) : null}

      {item.receiptPhotoUrl ? (
        <View style={styles.receiptRow}>
          <Image source={{ uri: item.receiptPhotoUrl }} style={styles.receiptThumb} />
          <Text style={styles.receiptLabel}>Receipt Attached</Text>
        </View>
      ) : null}

      {item.adminComment ? (
        <View style={styles.commentBox}>
          <Text style={styles.commentText}>Admin Note: {item.adminComment}</Text>
        </View>
      ) : null}

      {item.status === 'pending' && (
        <Button
          title="Review Claim"
          onPress={() => setReviewClaim(item)}
          variant="primary"
          size="small"
          style={styles.reviewBtn}
        />
      )}
    </Card>
  );

  return (
    <View style={styles.container}>
      <Header title="Expense Approvals" />

      {/* Filter Tabs */}
      <View style={styles.filterBar}>
        {['pending', 'approved', 'rejected', ''].map((st) => (
          <TouchableOpacity
            key={st || 'all'}
            style={[styles.filterTab, statusFilter === st && styles.filterTabActive]}
            onPress={() => setStatusFilter(st)}
          >
            <Text style={[styles.filterTabText, statusFilter === st && styles.filterTabTextActive]}>
              {st ? st.toUpperCase() : 'ALL'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingBox}>
          <LoadingSkeleton height={80} style={{ marginBottom: 12 }} />
          <LoadingSkeleton height={120} style={{ marginBottom: 12 }} />
          <LoadingSkeleton height={120} />
        </View>
      ) : errorMessage ? (
        <ErrorView message={errorMessage} onRetry={() => loadClaims()} />
      ) : (
        <FlatList
          data={claims}
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
            <View style={styles.statsSection}>
              <View style={styles.statsRow}>
                <StatCard
                  title="Claimed"
                  value={formatCurrency(stats.totalClaimed)}
                  variant="primary"
                />
                <StatCard
                  title="Pending"
                  value={formatCurrency(stats.totalPending)}
                  variant="warning"
                />
              </View>
              <View style={[styles.statsRow, { marginTop: 8 }]}>
                <StatCard
                  title="Approved"
                  value={formatCurrency(stats.totalApproved)}
                  variant="success"
                />
                <StatCard
                  title="Rejected"
                  value={formatCurrency(stats.totalRejected)}
                  variant="danger"
                />
              </View>
              <Text style={styles.sectionTitle}>
                {statusFilter.toUpperCase() || 'ALL'} CLAIMS ({claims.length})
              </Text>
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              title="No Claims Found"
              description={`No ${statusFilter || ''} reimbursement claims found.`}
            />
          }
        />
      )}

      {/* Review Modal */}
      <Modal
        visible={!!reviewClaim}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setReviewClaim(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Review Expense Claim</Text>
              <TouchableOpacity onPress={() => setReviewClaim(null)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {reviewClaim && (
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.modalEmpName}>{reviewClaim.employeeName}</Text>
                <Text style={styles.modalAmount}>{formatCurrency(reviewClaim.amount)}</Text>
                <Text style={styles.modalSub}>
                  {reviewClaim.category} • Date: {reviewClaim.expenseDate}
                </Text>
                {reviewClaim.description ? (
                  <Text style={styles.modalDesc}>"{reviewClaim.description}"</Text>
                ) : null}

                {reviewClaim.receiptPhotoUrl ? (
                  <Image source={{ uri: reviewClaim.receiptPhotoUrl }} style={styles.receiptModalImage} />
                ) : null}
              </View>
            )}

            <Input
              label="Admin Remarks"
              placeholder="e.g. Verified with client visit voucher"
              value={adminComment}
              onChangeText={setAdminComment}
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Button
                title="Reject Claim"
                onPress={() => handleReviewAction('reject')}
                variant="danger"
                loading={submittingReview}
                style={{ flex: 1 }}
              />
              <Button
                title="Approve Claim"
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
  filterBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: 16,
  },
  filterTab: {
    paddingVertical: 12,
    marginRight: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterTabActive: {
    borderBottomColor: Colors.primary,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  filterTabTextActive: {
    color: Colors.primaryDark,
    fontWeight: '800',
  },
  loadingBox: {
    padding: 16,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  statsSection: {
    marginBottom: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginTop: 18,
    marginBottom: 10,
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
  empName: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  categorySub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  descText: {
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 18,
    marginTop: 4,
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  receiptThumb: {
    width: 36,
    height: 36,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  receiptLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
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
  reviewBtn: {
    marginTop: 12,
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
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  modalEmpName: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  modalAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.primaryDark,
    marginVertical: 4,
  },
  modalSub: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  modalDesc: {
    fontSize: 12,
    color: Colors.textPrimary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  receiptModalImage: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    marginTop: 8,
    resizeMode: 'cover',
  },
});
