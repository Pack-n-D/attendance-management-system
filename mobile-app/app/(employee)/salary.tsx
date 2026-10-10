/**
 * Monthly Salary Slip Breakdown Screen
 * Recreates MNC Salary Slip viewer from frontend/src/pages/Employee/Home.jsx
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import Card from '../../components/Card';
import Header from '../../components/Header';
import Button from '../../components/Button';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import ErrorView from '../../components/ErrorView';
import { employeeService } from '../../services/employeeService';
import { SalarySlip, Employee } from '../../types';
import { formatCurrency } from '../../utils/formatters';

export default function SalaryScreen() {
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [slip, setSlip] = useState<SalarySlip | null>(null);
  const [emp, setEmp] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadSalary = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setErrorMessage(null);
    try {
      const res = await employeeService.getMySalarySlips(selectedMonth);
      setSlip(res.salarySlip);
      setEmp(res.employee);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate salary slip.');
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    loadSalary();
  }, [loadSalary]);

  const onRefresh = () => {
    setRefreshing(true);
    loadSalary(true);
  };

  const handleShareSlip = async () => {
    if (!slip) return;
    try {
      const text = `📄 AP Corporation (APC) Salary Slip\nEmployee: ${emp?.fullName || slip.employeeName} (${slip.employeeId})\nMonth: ${slip.month}\n\n• Base Salary: ${formatCurrency(slip.baseSalary)}\n• Working Days: ${slip.workingDays}\n• Present Days: ${slip.presentDays}\n• Half Days: ${slip.halfDays}\n• Absent Days: ${slip.absentDays}\n• Paid Leaves: ${slip.paidLeaves}\n• Overtime Hours: ${slip.overtimeHours} hrs (+${formatCurrency(slip.overtimePay)})\n• Unpaid Deductions: -${formatCurrency(slip.unpaidDeductions)}\n• Gross Salary: ${formatCurrency(slip.grossSalary)}\n\n⭐ NET TAKE-HOME SALARY: ${formatCurrency(slip.netSalary)}`;
      await Share.share({ message: text, title: `APC Salary Slip - ${slip.month}` });
    } catch {
      // Ignore
    }
  };

  // Generate previous 6 months list for quick selector
  const availableMonths = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return d.toISOString().slice(0, 7);
  });

  return (
    <View style={styles.container}>
      <Header
        title="Salary Slip"
        rightAction={
          slip ? (
            <TouchableOpacity onPress={handleShareSlip} style={styles.shareBtn}>
              <Ionicons name="share-outline" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
          ) : null
        }
      />

      {/* Month Selector Strip */}
      <View style={styles.monthScroll}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthPills}>
          {availableMonths.map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.monthPill, selectedMonth === m && styles.monthPillActive]}
              onPress={() => setSelectedMonth(m)}
            >
              <Text style={[styles.monthText, selectedMonth === m && styles.monthTextActive]}>
                {m}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
            <LoadingSkeleton height={140} style={{ marginBottom: 16 }} />
            <LoadingSkeleton height={200} style={{ marginBottom: 16 }} />
            <LoadingSkeleton height={100} />
          </View>
        ) : errorMessage ? (
          <ErrorView message={errorMessage} onRetry={() => loadSalary()} />
        ) : slip ? (
          <View>
            {/* Header Summary Banner */}
            <Card style={styles.netCard} elevated>
              <Text style={styles.netLabel}>NET TAKE-HOME SALARY</Text>
              <Text style={styles.netAmount}>{formatCurrency(slip.netSalary)}</Text>
              <Text style={styles.netSubtext}>
                For Month: {slip.month} • Status: {slip.status?.toUpperCase() || 'CALCULATED'}
              </Text>
            </Card>

            {/* Attendance & Days Summary */}
            <Card style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>ATTENDANCE & DAYS BREAKDOWN</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Working Days</Text>
                <Text style={styles.value}>{slip.workingDays} days</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={styles.label}>Present Days</Text>
                <Text style={[styles.value, { color: Colors.success }]}>{slip.presentDays} days</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={styles.label}>Half Days</Text>
                <Text style={[styles.value, { color: Colors.warning }]}>{slip.halfDays} days</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={styles.label}>Paid Leaves</Text>
                <Text style={[styles.value, { color: Colors.info }]}>{slip.paidLeaves} days</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={styles.label}>Absent Days (Unpaid)</Text>
                <Text style={[styles.value, { color: Colors.danger }]}>{slip.absentDays} days</Text>
              </View>
            </Card>

            {/* Earnings & Overtime */}
            <Card style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>EARNINGS & OVERTIME</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Base Monthly Salary</Text>
                <Text style={styles.value}>{formatCurrency(slip.baseSalary)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={styles.label}>Overtime Worked</Text>
                <Text style={styles.value}>{slip.overtimeHours} hrs</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={styles.label}>Overtime Pay (+)</Text>
                <Text style={[styles.value, { color: Colors.success }]}>
                  +{formatCurrency(slip.overtimePay)}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={styles.label}>Gross Earnings</Text>
                <Text style={[styles.value, { fontWeight: '900' }]}>
                  {formatCurrency(slip.grossSalary)}
                </Text>
              </View>
            </Card>

            {/* Deductions */}
            <Card style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>DEDUCTIONS</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Unpaid Absent Days (-)</Text>
                <Text style={[styles.value, { color: Colors.danger }]}>
                  -{formatCurrency(slip.unpaidDeductions)}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={styles.label}>Total Deductions</Text>
                <Text style={[styles.value, { color: Colors.danger, fontWeight: '900' }]}>
                  -{formatCurrency(slip.unpaidDeductions)}
                </Text>
              </View>
            </Card>

            <Button
              title="Share / Export Salary Slip"
              onPress={handleShareSlip}
              variant="outline"
              icon={<Ionicons name="share-social-outline" size={18} color={Colors.primaryDark} />}
              style={{ marginTop: 8 }}
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  shareBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: Colors.surfaceSubtle,
  },
  monthScroll: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: 10,
  },
  monthPills: {
    paddingHorizontal: 16,
    gap: 8,
  },
  monthPill: {
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  monthPillActive: {
    backgroundColor: Colors.primaryTint,
    borderColor: Colors.primary,
  },
  monthText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  monthTextActive: {
    color: '#1A1612',
  },
  content: {
    padding: 16,
    paddingBottom: 36,
  },
  netCard: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryDark,
    padding: 20,
    alignItems: 'center',
    marginBottom: 14,
  },
  netLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#3B332B',
    letterSpacing: 1,
  },
  netAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1A1612',
    marginVertical: 4,
  },
  netSubtext: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3B332B',
  },
  sectionCard: {
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  label: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  value: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 6,
  },
});
