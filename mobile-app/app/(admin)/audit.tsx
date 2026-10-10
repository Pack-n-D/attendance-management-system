/**
 * Super Admin Organization Audit Trail Screen
 * Recreates frontend/src/pages/Admin/AuditLog.jsx
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import Card from '../../components/Card';
import Header from '../../components/Header';
import EmptyState from '../../components/EmptyState';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import ErrorView from '../../components/ErrorView';
import { adminService } from '../../services/adminService';
import { AuditLog } from '../../types';

export default function AdminAuditLogScreen() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadAuditLogs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setErrorMessage(null);
    try {
      const res = await adminService.getAuditLogs();
      setLogs(res.auditLogs);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load audit logs.');
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAuditLogs(true);
  };

  const formatTimestamp = (iso?: string) => {
    if (!iso) return '-';
    try {
      const d = new Date(iso);
      return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return iso;
    }
  };

  const renderItem = ({ item }: { item: AuditLog }) => (
    <Card style={styles.logCard}>
      <View style={styles.logHeader}>
        <View style={styles.actorBadge}>
          <Ionicons name="person-outline" size={12} color={Colors.primaryDark} />
          <Text style={styles.actorName}>{item.actorName || item.actorId}</Text>
        </View>
        <Text style={styles.timestampText}>{formatTimestamp(item.timestamp)}</Text>
      </View>

      <Text style={styles.actionText}>{item.action}</Text>

      <View style={styles.targetRow}>
        <Text style={styles.targetLabel}>Target: {item.targetType}</Text>
        {item.targetId ? <Text style={styles.targetId}>#{item.targetId}</Text> : null}
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Header title="Audit Trail" subtitle="System Event Logs" />

      {loading && !refreshing ? (
        <View style={styles.loadingBox}>
          <LoadingSkeleton height={90} style={{ marginBottom: 12 }} />
          <LoadingSkeleton height={90} style={{ marginBottom: 12 }} />
          <LoadingSkeleton height={90} />
        </View>
      ) : errorMessage ? (
        <ErrorView message={errorMessage} onRetry={() => loadAuditLogs()} />
      ) : (
        <FlatList
          data={logs}
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
            <Text style={styles.headerCount}>RECENT EVENTS ({logs.length})</Text>
          }
          ListEmptyComponent={
            <EmptyState
              title="No Audit Logs"
              description="No audit logs recorded in the system yet."
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
  headerCount: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  logCard: {
    padding: 14,
    marginBottom: 10,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  actorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryTint,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  actorName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1A1612',
  },
  timestampText: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontWeight: '500',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 18,
    marginBottom: 6,
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 6,
  },
  targetLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  targetId: {
    fontSize: 11,
    color: Colors.primaryDark,
    fontWeight: '700',
  },
});
