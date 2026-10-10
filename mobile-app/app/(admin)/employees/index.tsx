/**
 * Super Admin Employee Directory Screen
 * Recreates frontend/src/pages/Admin/EmployeeList.jsx
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../../constants/Colors';
import Card from '../../../components/Card';
import Header from '../../../components/Header';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import StatusBadge from '../../../components/StatusBadge';
import EmptyState from '../../../components/EmptyState';
import LoadingSkeleton from '../../../components/LoadingSkeleton';
import ErrorView from '../../../components/ErrorView';
import { adminService } from '../../../services/adminService';
import { Employee } from '../../../types';
import Config from '../../../constants/Config';

export default function EmployeeListScreen() {
  const router = useRouter();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const loadEmployees = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setErrorMessage(null);
    try {
      const res = await adminService.getEmployees({
        search: search.trim() || undefined,
        department: selectedDept || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      setEmployees(res.employees);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load employee directory.');
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, [search, selectedDept, statusFilter]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const onRefresh = () => {
    setRefreshing(true);
    loadEmployees(true);
  };

  const handleToggleStatus = async (emp: Employee) => {
    try {
      const res = await adminService.toggleEmployeeStatus(emp.id);
      Alert.alert('Status Updated', res.message);
      await loadEmployees(true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update employee status.');
    }
  };

  const renderItem = ({ item }: { item: Employee }) => (
    <Card style={styles.card}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push(`/(admin)/employees/${item.id}`)}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fullName}>{item.fullName || `${item.firstName} ${item.lastName}`}</Text>
            <Text style={styles.idText}>{item.id} • {item.designation}</Text>
            <Text style={styles.deptText}>{item.department}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <StatusBadge status={item.status} size="small" />
            <Text style={styles.todayAttText}>
              Today: {item.todayAttendanceStatus ? item.todayAttendanceStatus.replace('_', ' ') : 'Not Punched'}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.contactRow}>
            <Ionicons name="mail-outline" size={13} color={Colors.textSecondary} />
            <Text style={styles.contactText} numberOfLines={1}>{item.email}</Text>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.toggleBtn}
              onPress={() => handleToggleStatus(item)}
            >
              <Text style={styles.toggleBtnText}>
                {item.status === 'active' ? 'Deactivate' : 'Activate'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.viewBtn}
              onPress={() => router.push(`/(admin)/employees/${item.id}`)}
            >
              <Text style={styles.viewBtnText}>Manage</Text>
              <Ionicons name="chevron-forward" size={14} color={Colors.primaryDark} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Header
        title="Employee Directory"
        rightAction={
          <Button
            title="+ Add"
            onPress={() => router.push('/(admin)/employees/new')}
            variant="primary"
            size="small"
          />
        }
      />

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <Input
          placeholder="Search by name, ID, email, phone..."
          value={search}
          onChangeText={setSearch}
          leftIcon={<Ionicons name="search-outline" size={18} color={Colors.textSecondary} />}
          containerStyle={{ marginBottom: 8 }}
        />

        {/* Department Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsRow}>
          <TouchableOpacity
            style={[styles.filterChip, selectedDept === '' && styles.filterChipActive]}
            onPress={() => setSelectedDept('')}
          >
            <Text style={[styles.filterChipText, selectedDept === '' && styles.filterChipTextActive]}>
              All Depts
            </Text>
          </TouchableOpacity>
          {Config.departments.map((dept: string) => (
            <TouchableOpacity
              key={dept}
              style={[styles.filterChip, selectedDept === dept && styles.filterChipActive]}
              onPress={() => setSelectedDept(dept)}
            >
              <Text style={[styles.filterChipText, selectedDept === dept && styles.filterChipTextActive]}>
                {dept}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingBox}>
          <LoadingSkeleton height={110} style={{ marginBottom: 12 }} />
          <LoadingSkeleton height={110} style={{ marginBottom: 12 }} />
          <LoadingSkeleton height={110} />
        </View>
      ) : errorMessage ? (
        <ErrorView message={errorMessage} onRetry={() => loadEmployees()} />
      ) : (
        <FlatList
          data={employees}
          keyExtractor={(item) => item.id}
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
              title="No Employees Found"
              description="No matching employee records found for your current search or filters."
              actionTitle="+ Add New Employee"
              onAction={() => router.push('/(admin)/employees/new')}
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
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterChipsRow: {
    gap: 8,
    paddingBottom: 4,
  },
  filterChip: {
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  filterChipActive: {
    backgroundColor: Colors.primaryTint,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
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
  card: {
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  fullName: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  idText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  deptText: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  todayAttText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  contactText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: Colors.surfaceSubtle,
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
});
