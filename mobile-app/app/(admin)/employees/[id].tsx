/**
 * Admin Employee Management & Detail Screen
 * Recreates frontend/src/pages/Admin/EmployeeProfile.jsx
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
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../../constants/Colors';
import Card from '../../../components/Card';
import Header from '../../../components/Header';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import StatusBadge from '../../../components/StatusBadge';
import CameraModal from '../../../components/CameraModal';
import LoadingSkeleton from '../../../components/LoadingSkeleton';
import ErrorView from '../../../components/ErrorView';
import AttendanceCalendar from '../../../components/AttendanceCalendar';
import { adminService } from '../../../services/adminService';
import { Employee, DocumentItem, AttendanceRecord, SalarySlip } from '../../../types';
import { formatDate, formatTime, formatCurrency } from '../../../utils/formatters';

export default function EmployeeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Edit details modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editPhone, setEditPhone] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editSalary, setEditSalary] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Salary slip preview modal
  const [showSlipModal, setShowSlipModal] = useState(false);
  const [slipMonth, setSlipMonth] = useState(new Date().toISOString().slice(0, 7));
  const [salarySlip, setSalarySlip] = useState<SalarySlip | null>(null);
  const [loadingSlip, setLoadingSlip] = useState(false);

  // Photo modal
  const [showCamera, setShowCamera] = useState(false);

  const loadData = useCallback(async (silent = false) => {
    if (!id) return;
    if (!silent) setLoading(true);
    setErrorMessage(null);
    try {
      const res = await adminService.getEmployeeDetail(id);
      setEmployee(res.employee);
      setDocuments(res.documents);
      setAttendanceLogs(res.attendanceLogs);

      setEditPhone(res.employee.phone || '');
      setEditDesignation(res.employee.designation || '');
      setEditDepartment(res.employee.department || '');
      setEditSalary(String(res.employee.baseSalary || '0'));
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load employee record.');
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const handleToggleStatus = async () => {
    if (!employee) return;
    try {
      const res = await adminService.toggleEmployeeStatus(employee.id);
      Alert.alert('Success', res.message);
      await loadData(true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update status.');
    }
  };

  const handleResetPassword = () => {
    if (!employee) return;
    Alert.alert(
      'Reset Password',
      `Reset password for ${employee.firstName} ${employee.lastName}? A temporary password will be generated and the employee will be required to change it on login.`,
      [
        { text: 'Cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await adminService.resetPassword(employee.id);
              Alert.alert('Password Reset', `${res.message}\n\nTemporary Password: ${res.tempPassword}`);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to reset password.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteEmployee = () => {
    if (!employee) return;
    Alert.alert(
      'Delete Employee Record',
      `Are you sure you want to permanently delete ${employee.firstName} ${employee.lastName} (${employee.id})? All associated records will be removed.`,
      [
        { text: 'Cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminService.deleteEmployee(employee.id);
              Alert.alert('Deleted', 'Employee record deleted successfully.');
              router.replace('/(admin)/employees');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete employee.');
            }
          },
        },
      ]
    );
  };

  const handleSaveEdit = async () => {
    if (!employee) return;
    setSavingEdit(true);
    try {
      const res = await adminService.updateEmployee(employee.id, {
        phone: editPhone.trim(),
        designation: editDesignation.trim(),
        department: editDepartment.trim(),
        baseSalary: parseFloat(editSalary) || 0,
      });
      Alert.alert('Success', res.message);
      setShowEditModal(false);
      await loadData(true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update employee details.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handlePhotoCaptured = async (b64: string) => {
    if (!employee) return;
    try {
      const res = await adminService.updateEmployee(employee.id, {
        profilePhoto: b64,
      });
      Alert.alert('Success', 'Profile photo updated.');
      await loadData(true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update photo.');
    }
  };

  const handleViewSalarySlip = async () => {
    if (!employee) return;
    setLoadingSlip(true);
    setShowSlipModal(true);
    try {
      const res = await adminService.getEmployeeSalarySlip(employee.id, slipMonth);
      setSalarySlip(res.salarySlip);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to compute salary slip.');
    } finally {
      setLoadingSlip(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Employee Details" showBack={true} />

      {loading && !refreshing ? (
        <View style={styles.loadingBox}>
          <LoadingSkeleton height={140} style={{ marginBottom: 14 }} />
          <LoadingSkeleton height={200} style={{ marginBottom: 14 }} />
          <LoadingSkeleton height={120} />
        </View>
      ) : errorMessage || !employee ? (
        <ErrorView message={errorMessage || 'Employee not found'} onRetry={() => loadData()} />
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
          {/* Profile Header Card */}
          <Card style={styles.profileCard} elevated>
            <View style={styles.avatarRow}>
              <View style={styles.avatarWrapper}>
                {employee.profilePhotoUrl ? (
                  <Image source={{ uri: employee.profilePhotoUrl }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitials}>
                      {employee.firstName?.[0]}
                      {employee.lastName?.[0]}
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.cameraBadge}
                  onPress={() => setShowCamera(true)}
                >
                  <Ionicons name="camera" size={14} color="#1A1612" />
                </TouchableOpacity>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{employee.fullName || `${employee.firstName} ${employee.lastName}`}</Text>
                <Text style={styles.idText}>ID: {employee.id}</Text>
                <Text style={styles.roleSub}>{employee.designation} • {employee.department}</Text>
                <View style={{ marginTop: 6, alignSelf: 'flex-start' }}>
                  <StatusBadge status={employee.status} size="small" />
                </View>
              </View>
            </View>

            {/* Quick Actions Strip */}
            <View style={styles.quickActionsStrip}>
              <Button
                title="Edit Details"
                onPress={() => setShowEditModal(true)}
                variant="outline"
                size="small"
                icon={<Ionicons name="create-outline" size={14} color={Colors.primaryDark} />}
                style={{ flex: 1 }}
              />
              <Button
                title={employee.status === 'active' ? 'Deactivate' : 'Activate'}
                onPress={handleToggleStatus}
                variant="secondary"
                size="small"
                style={{ flex: 1 }}
              />
            </View>
          </Card>

          {/* Details Overview */}
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>CONTACT & EMPLOYMENT</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Email Address</Text>
              <Text style={styles.value}>{employee.email}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.label}>Phone Number</Text>
              <Text style={styles.value}>{employee.phone}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.label}>Date of Birth</Text>
              <Text style={styles.value}>{formatDate(employee.dob)}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.label}>Date of Joining</Text>
              <Text style={styles.value}>{formatDate(employee.dateOfJoining)}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.label}>Base Salary</Text>
              <Text style={[styles.value, { fontWeight: '800' }]}>
                {formatCurrency(employee.baseSalary)} / mo
              </Text>
            </View>
          </Card>

          {/* Leave Balances Card */}
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>LEAVE BALANCES</Text>
            <View style={styles.balanceGrid}>
              <View style={styles.balanceCol}>
                <Text style={styles.balanceNum}>{employee.casualLeaveBalance ?? 12}</Text>
                <Text style={styles.balanceLbl}>Casual</Text>
              </View>
              <View style={styles.balanceCol}>
                <Text style={styles.balanceNum}>{employee.sickLeaveBalance ?? 12}</Text>
                <Text style={styles.balanceLbl}>Sick</Text>
              </View>
              <View style={styles.balanceCol}>
                <Text style={styles.balanceNum}>{employee.paidLeaveBalance ?? 15}</Text>
                <Text style={styles.balanceLbl}>Paid</Text>
              </View>
              <View style={styles.balanceCol}>
                <Text style={styles.balanceNum}>{employee.coffBalance ?? 0}</Text>
                <Text style={styles.balanceLbl}>C-Off</Text>
              </View>
            </View>
          </Card>

          {/* Compliance Documents */}
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>COMPLIANCE DOCUMENTS ({documents.length})</Text>
            {documents.length > 0 ? (
              documents.map((doc, idx) => (
                <View key={doc.id}>
                  {idx > 0 && <View style={styles.divider} />}
                  <View style={styles.docRow}>
                    <Ionicons name="document-attach-outline" size={20} color={Colors.primaryDark} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.docType}>{doc.type.toUpperCase()}</Text>
                      <Text style={styles.docFile}>{doc.fileName || 'Document'}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={async () => {
                        try {
                          await adminService.deleteDocument(employee.id, doc.id);
                          await loadData(true);
                        } catch (err: any) {
                          Alert.alert('Error', err.message);
                        }
                      }}
                    >
                      <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyNote}>No compliance documents uploaded yet.</Text>
            )}
          </Card>

          {/* Salary Slip & Attendance Shortcuts */}
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>REPORTS & STATEMENTS</Text>
            <TouchableOpacity style={styles.actionBtnRow} onPress={handleViewSalarySlip}>
              <Ionicons name="cash-outline" size={20} color={Colors.primaryDark} />
              <Text style={styles.actionBtnText}>Compute & Preview Monthly Salary Slip</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
            </TouchableOpacity>
          </Card>

          {/* Recent Attendance Logs (Up to 5) */}
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>
              RECENT ATTENDANCE LOGS ({attendanceLogs.length})
            </Text>
            {attendanceLogs.slice(0, 5).map((att, idx) => (
              <View key={att.id}>
                {idx > 0 && <View style={styles.divider} />}
                <View style={styles.attRow}>
                  <View>
                    <Text style={styles.attDate}>{formatDate(att.date)}</Text>
                    <Text style={styles.attTimes}>
                      In: {formatTime(att.punchInTime)} • Out: {formatTime(att.punchOutTime)}
                    </Text>
                  </View>
                  <StatusBadge status={att.status} size="small" />
                </View>
              </View>
            ))}
          </Card>

          {/* Attendance Calendar Matrix */}
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>ATTENDANCE CALENDAR MATRIX</Text>
            <AttendanceCalendar initialEmployeeId={employee.id} />
          </Card>

          {/* Danger Zone */}
          <Card style={styles.dangerCard}>
            <Text style={styles.dangerTitle}>ADMINISTRATIVE ACTIONS</Text>
            <Button
              title="Reset Password"
              onPress={handleResetPassword}
              variant="outline"
              icon={<Ionicons name="key-outline" size={16} color={Colors.primaryDark} />}
              style={{ marginBottom: 10 }}
            />
            <Button
              title="Delete Employee Account"
              onPress={handleDeleteEmployee}
              variant="danger"
              icon={<Ionicons name="trash-outline" size={16} color="#FFFFFF" />}
            />
          </Card>
        </ScrollView>
      )}

      {/* Camera Modal */}
      <CameraModal
        visible={showCamera}
        onClose={() => setShowCamera(false)}
        onPhotoCaptured={handlePhotoCaptured}
        title="Update Employee Photo"
        subtitle="Take a photo for official employee records."
        preferFrontCamera={true}
        allowGallery={true}
      />

      {/* Edit Details Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Employee Profile</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Input
              label="Phone Number"
              value={editPhone}
              onChangeText={setEditPhone}
              keyboardType="phone-pad"
            />
            <Input
              label="Designation"
              value={editDesignation}
              onChangeText={setEditDesignation}
            />
            <Input
              label="Department"
              value={editDepartment}
              onChangeText={setEditDepartment}
            />
            <Input
              label="Base Salary (₹)"
              value={editSalary}
              onChangeText={setEditSalary}
              keyboardType="numeric"
            />

            <Button
              title="Save Changes"
              onPress={handleSaveEdit}
              loading={savingEdit}
              variant="primary"
              style={{ marginTop: 8 }}
            />
          </View>
        </View>
      </Modal>

      {/* Salary Slip Modal */}
      <Modal
        visible={showSlipModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSlipModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Salary Slip Preview</Text>
              <TouchableOpacity onPress={() => setShowSlipModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {salarySlip ? (
              <ScrollView style={{ maxHeight: 360 }}>
                <Card style={{ padding: 14, backgroundColor: Colors.surfaceSubtle, marginBottom: 12 }}>
                  <Text style={styles.slipLabel}>Net Salary</Text>
                  <Text style={styles.slipNet}>{formatCurrency(salarySlip.netSalary)}</Text>
                  <Text style={styles.slipSub}>Month: {salarySlip.month} • Base: {formatCurrency(salarySlip.baseSalary)}</Text>
                </Card>

                <View style={styles.row}>
                  <Text style={styles.label}>Working Days</Text>
                  <Text style={styles.value}>{salarySlip.workingDays} days</Text>
                </View>
                <View style={styles.divider} />

                <View style={styles.row}>
                  <Text style={styles.label}>Present Days</Text>
                  <Text style={[styles.value, { color: Colors.success }]}>{salarySlip.presentDays} days</Text>
                </View>
                <View style={styles.divider} />

                <View style={styles.row}>
                  <Text style={styles.label}>Overtime Pay</Text>
                  <Text style={[styles.value, { color: Colors.success }]}>+{formatCurrency(salarySlip.overtimePay)}</Text>
                </View>
                <View style={styles.divider} />

                <View style={styles.row}>
                  <Text style={styles.label}>Unpaid Deductions</Text>
                  <Text style={[styles.value, { color: Colors.danger }]}>-{formatCurrency(salarySlip.unpaidDeductions)}</Text>
                </View>
              </ScrollView>
            ) : null}

            <Button
              title="Close"
              onPress={() => setShowSlipModal(false)}
              variant="secondary"
              style={{ marginTop: 12 }}
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
  profileCard: {
    padding: 18,
    marginBottom: 12,
  },
  avatarRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarImage: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  avatarPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  avatarInitials: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  name: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  idText: {
    fontSize: 12,
    color: Colors.primaryDark,
    fontWeight: '700',
    marginTop: 2,
  },
  roleSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  quickActionsStrip: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 12,
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
  balanceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  balanceCol: {
    alignItems: 'center',
  },
  balanceNum: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  balanceLbl: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  docType: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  docFile: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  emptyNote: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontStyle: 'italic',
  },
  actionBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
  },
  attRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  attDate: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  attTimes: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  dangerCard: {
    padding: 16,
    borderColor: Colors.dangerBorder,
    backgroundColor: Colors.dangerBg,
    marginBottom: 20,
  },
  dangerTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.danger,
    letterSpacing: 0.8,
    marginBottom: 12,
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
  slipLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  slipNet: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginVertical: 4,
  },
  slipSub: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
});
