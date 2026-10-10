/**
 * Expense Reimbursement Management Screen
 * Supports claiming expenses with receipt photos, status tracking, and deletion
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
import CameraModal from '../../components/CameraModal';
import EmptyState from '../../components/EmptyState';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import ErrorView from '../../components/ErrorView';
import { employeeService } from '../../services/employeeService';
import { ReimbursementRequest } from '../../types';
import Config from '../../constants/Config';
import { formatDate, formatCurrency } from '../../utils/formatters';

export default function ReimbursementsScreen() {
  const [claims, setClaims] = useState<ReimbursementRequest[]>([]);
  const [stats, setStats] = useState({
    totalClaimed: 0,
    totalApproved: 0,
    totalPending: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Claim modal
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [category, setCategory] = useState('Petrol');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [receiptPhoto, setReceiptPhoto] = useState<string | null>(null);
  const [showReceiptCamera, setShowReceiptCamera] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadReimbursements = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setErrorMessage(null);
    try {
      const res = await employeeService.getMyReimbursements();
      setClaims(res.reimbursements);
      setStats({
        totalClaimed: res.totalClaimed,
        totalApproved: res.totalApproved,
        totalPending: res.totalPending,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load reimbursements.');
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadReimbursements();
  }, [loadReimbursements]);

  const onRefresh = () => {
    setRefreshing(true);
    loadReimbursements(true);
  };

  const handleSubmitClaim = async () => {
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid expense amount greater than 0.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await employeeService.submitReimbursement({
        category,
        amount: numAmount,
        expenseDate,
        description: description.trim(),
        receiptPhoto,
      });

      Alert.alert('Expense Claim Submitted 🎉', res.message);
      setShowClaimModal(false);
      setAmount('');
      setDescription('');
      setReceiptPhoto(null);
      await loadReimbursements(true);
    } catch (err: any) {
      Alert.alert('Submission Error', err.message || 'Failed to submit reimbursement claim.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClaim = (id: number) => {
    Alert.alert(
      'Cancel Reimbursement',
      'Are you sure you want to cancel this pending expense claim?',
      [
        { text: 'No' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await employeeService.deleteReimbursement(id);
              Alert.alert('Success', 'Claim cancelled successfully.');
              await loadReimbursements(true);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to cancel claim.');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: ReimbursementRequest }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.categoryTitle}>{item.category}</Text>
          <Text style={styles.expenseDate}>{formatDate(item.expenseDate)}</Text>
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
          <Text style={styles.receiptLabel}>Receipt attached</Text>
        </View>
      ) : null}

      {item.adminComment ? (
        <View style={styles.adminRemarkBox}>
          <Text style={styles.adminRemarkText}>Admin Note: {item.adminComment}</Text>
        </View>
      ) : null}

      {item.status === 'pending' && (
        <Button
          title="Cancel Claim"
          onPress={() => handleDeleteClaim(item.id)}
          variant="ghost"
          size="small"
          style={styles.cancelBtn}
        />
      )}
    </Card>
  );

  return (
    <View style={styles.container}>
      <Header
        title="Expense Claims"
        rightAction={
          <Button
            title="+ Claim"
            onPress={() => setShowClaimModal(true)}
            variant="primary"
            size="small"
          />
        }
      />

      {loading && !refreshing ? (
        <View style={styles.loadingBox}>
          <LoadingSkeleton height={80} style={{ marginBottom: 12 }} />
          <LoadingSkeleton height={110} style={{ marginBottom: 12 }} />
          <LoadingSkeleton height={110} />
        </View>
      ) : errorMessage ? (
        <ErrorView message={errorMessage} onRetry={() => loadReimbursements()} />
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
                  title="Approved"
                  value={formatCurrency(stats.totalApproved)}
                  variant="success"
                />
              </View>
              <View style={[styles.statsRow, { marginTop: 8 }]}>
                <StatCard
                  title="Pending"
                  value={formatCurrency(stats.totalPending)}
                  variant="warning"
                />
              </View>
              <Text style={styles.historyHeader}>CLAIM HISTORY ({claims.length})</Text>
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              title="No Reimbursement Claims"
              description="You have not submitted any expense reimbursement claims yet."
              actionTitle="Submit Expense Claim"
              onAction={() => setShowClaimModal(true)}
            />
          }
        />
      )}

      {/* Claim Modal */}
      <Modal
        visible={showClaimModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowClaimModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Submit Expense Claim</Text>
              <TouchableOpacity onPress={() => setShowClaimModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Category Chips */}
            <Text style={styles.label}>Expense Category:</Text>
            <View style={styles.chipsRow}>
              {Config.expenseCategories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, category === cat && styles.chipActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input
              label="Amount (₹)"
              placeholder="e.g. 750.00"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              required
            />

            <Input
              label="Expense Date"
              placeholder="YYYY-MM-DD"
              value={expenseDate}
              onChangeText={setExpenseDate}
              required
            />

            <Input
              label="Description / Purpose"
              placeholder="e.g. Client visit travel petrol"
              value={description}
              onChangeText={setDescription}
            />

            {/* Receipt Photo Section */}
            <View style={styles.receiptPickerRow}>
              {receiptPhoto ? (
                <View style={styles.receiptPreviewBox}>
                  <Image source={{ uri: receiptPhoto }} style={styles.receiptThumbLarge} />
                  <TouchableOpacity
                    style={styles.removeReceiptBtn}
                    onPress={() => setReceiptPhoto(null)}
                  >
                    <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                    <Text style={styles.removeText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Button
                  title="Attach Receipt Photo"
                  onPress={() => setShowReceiptCamera(true)}
                  variant="outline"
                  size="small"
                  icon={<Ionicons name="camera-outline" size={16} color={Colors.primaryDark} />}
                  style={{ alignSelf: 'flex-start', marginVertical: 8 }}
                />
              )}
            </View>

            <Button
              title="Submit Claim"
              onPress={handleSubmitClaim}
              loading={submitting}
              variant="primary"
              style={{ marginTop: 10 }}
            />
          </View>
        </View>
      </Modal>

      {/* Receipt Photo Modal */}
      <CameraModal
        visible={showReceiptCamera}
        onClose={() => setShowReceiptCamera(false)}
        onPhotoCaptured={(b64) => setReceiptPhoto(b64)}
        title="Capture Receipt Photo"
        subtitle="Take a clear photo of the bill or expense voucher."
        preferFrontCamera={false}
      />
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
  statsSection: {
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  historyHeader: {
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
  categoryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  expenseDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  amountText: {
    fontSize: 15,
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
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  adminRemarkBox: {
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
  },
  adminRemarkText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  cancelBtn: {
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
  receiptPickerRow: {
    marginVertical: 4,
  },
  receiptPreviewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 8,
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 8,
  },
  receiptThumbLarge: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  removeReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  removeText: {
    fontSize: 12,
    color: Colors.danger,
    fontWeight: '700',
  },
});
