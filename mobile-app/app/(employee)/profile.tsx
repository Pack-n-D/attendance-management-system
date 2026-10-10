/**
 * Employee Profile Screen
 * Recreates frontend/src/pages/Employee/Profile.jsx
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
import Header from '../../components/Header';
import Button from '../../components/Button';
import Input from '../../components/Input';
import CameraModal from '../../components/CameraModal';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import ErrorView from '../../components/ErrorView';
import { employeeService } from '../../services/employeeService';
import { Employee, DocumentItem } from '../../types';
import { formatDate } from '../../utils/formatters';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, updateLocalUser } = useAuth();

  const [profile, setProfile] = useState<Employee | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Photo modal
  const [showPhotoCamera, setShowPhotoCamera] = useState(false);
  const [updatingPhoto, setUpdatingPhoto] = useState(false);

  // Info update request modal
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateField, setUpdateField] = useState('Phone Number');
  const [requestedValue, setRequestedValue] = useState('');
  const [updateReason, setUpdateReason] = useState('');
  const [submittingUpdate, setSubmittingUpdate] = useState(false);

  const loadProfile = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setErrorMessage(null);
    try {
      const res = await employeeService.getProfile();
      if (res && res.employee) {
        setProfile(res.employee);
        setDocuments(res.documents || []);
      }
    } catch (err: any) {
      console.warn('Profile fetch notice:', err.message);
      setErrorMessage(err.message || 'Failed to load employee profile.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProfile(true);
  };

  const handlePhotoCaptured = async (b64: string) => {
    setUpdatingPhoto(true);
    try {
      const res = await employeeService.updateProfilePhoto(b64);
      Alert.alert('Success', 'Profile photo updated successfully.');
      updateLocalUser({ profilePhotoUrl: res.profilePhotoUrl });
      await loadProfile(true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update photo.');
    } finally {
      setUpdatingPhoto(false);
    }
  };

  const handleSendUpdateRequest = async () => {
    if (!requestedValue.trim()) {
      Alert.alert('Required', 'Please enter the requested new value.');
      return;
    }

    setSubmittingUpdate(true);
    try {
      const res = await employeeService.requestInfoUpdate(
        updateField,
        requestedValue.trim(),
        updateReason.trim()
      );
      Alert.alert('Request Sent', res.message);
      setShowUpdateModal(false);
      setRequestedValue('');
      setUpdateReason('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit update request.');
    } finally {
      setSubmittingUpdate(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of the APC Portal?', [
      { text: 'Cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const emp = profile || user;

  return (
    <View style={styles.container}>
      <Header title="My Profile" />

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
        {!emp && loading && !refreshing ? (
          <View>
            <LoadingSkeleton height={140} style={{ marginBottom: 16 }} />
            <LoadingSkeleton height={180} />
          </View>
        ) : errorMessage && !emp ? (
          <ErrorView message={errorMessage} onRetry={() => loadProfile()} />
        ) : (
          <View>
            {/* Profile Avatar Card */}
            <Card style={styles.avatarCard} elevated>
              <View style={styles.avatarWrapper}>
                {emp?.profilePhotoUrl ? (
                  <Image source={{ uri: emp.profilePhotoUrl }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitials}>
                      {emp?.firstName?.[0]}
                      {emp?.lastName?.[0]}
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.editPhotoBadge}
                  onPress={() => setShowPhotoCamera(true)}
                >
                  <Ionicons name="camera" size={14} color="#1A1612" />
                </TouchableOpacity>
              </View>

              <Text style={styles.fullName}>{emp?.fullName || `${emp?.firstName} ${emp?.lastName}`}</Text>
              <Text style={styles.designationText}>{emp?.designation} • {emp?.department}</Text>
              <View style={styles.idBadge}>
                <Text style={styles.idText}>ID: {emp?.id}</Text>
              </View>
            </Card>

            {/* General Info Card */}
            <Card style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>EMPLOYEE DETAILS</Text>
                <TouchableOpacity onPress={() => setShowUpdateModal(true)}>
                  <Text style={styles.requestLink}>Request Update</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Email Address</Text>
                <Text style={styles.value}>{emp?.email}</Text>
              </View>
              <View style={styles.divider} />

              <View style={styles.row}>
                <Text style={styles.label}>Phone Number</Text>
                <Text style={styles.value}>{emp?.phone}</Text>
              </View>
              <View style={styles.divider} />

              <View style={styles.row}>
                <Text style={styles.label}>Date of Birth</Text>
                <Text style={styles.value}>{formatDate(emp?.dob)}</Text>
              </View>
              <View style={styles.divider} />

              <View style={styles.row}>
                <Text style={styles.label}>Date of Joining</Text>
                <Text style={styles.value}>{formatDate(emp?.dateOfJoining)}</Text>
              </View>
              <View style={styles.divider} />

              <View style={styles.row}>
                <Text style={styles.label}>Employment Type</Text>
                <Text style={styles.value}>{emp?.employmentType || 'Full-time'}</Text>
              </View>
            </Card>

            {/* Reporting Manager */}
            {emp?.reportingManagerName && (
              <Card style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>REPORTING MANAGER</Text>
                <View style={styles.managerRow}>
                  <Ionicons name="person-circle-outline" size={32} color={Colors.primaryDark} />
                  <View>
                    <Text style={styles.managerName}>{emp.reportingManagerName}</Text>
                    <Text style={styles.managerSub}>Direct Approver for Leaves & WFH</Text>
                  </View>
                </View>
              </Card>
            )}

            {/* Documents Section */}
            {documents.length > 0 && (
              <Card style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>COMPLIANCE DOCUMENTS ({documents.length})</Text>
                {documents.map((doc, idx) => (
                  <View key={doc.id}>
                    {idx > 0 && <View style={styles.divider} />}
                    <View style={styles.docRow}>
                      <Ionicons name="document-text-outline" size={20} color={Colors.primaryDark} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.docType}>{doc.type.toUpperCase()}</Text>
                        <Text style={styles.docName}>{doc.fileName || 'Uploaded Document'}</Text>
                      </View>
                      <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                    </View>
                  </View>
                ))}
              </Card>
            )}

            {/* Account Settings & Security */}
            <Card style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>SECURITY & SESSION</Text>
              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => router.push('/(auth)/change-password')}
              >
                <Ionicons name="key-outline" size={20} color={Colors.textPrimary} />
                <Text style={styles.actionText}>Change Password</Text>
                <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity style={styles.actionRow} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
                <Text style={[styles.actionText, { color: Colors.danger }]}>Sign Out</Text>
                <Ionicons name="chevron-forward" size={18} color={Colors.danger} />
              </TouchableOpacity>
            </Card>
          </View>
        )}
      </ScrollView>

      {/* Camera Modal for Photo Update */}
      <CameraModal
        visible={showPhotoCamera}
        onClose={() => setShowPhotoCamera(false)}
        onPhotoCaptured={handlePhotoCaptured}
        title="Update Profile Photo"
        subtitle="Take a photo or choose from gallery to update your avatar."
        preferFrontCamera={true}
      />

      {/* Info Update Modal */}
      <Modal
        visible={showUpdateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowUpdateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Info Update</Text>
              <TouchableOpacity onPress={() => setShowUpdateModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Input
              label="Field to Update"
              value={updateField}
              onChangeText={setUpdateField}
              placeholder="e.g. Phone Number, Address"
              required
            />

            <Input
              label="Requested New Value"
              value={requestedValue}
              onChangeText={setRequestedValue}
              placeholder="Enter updated value"
              required
            />

            <Input
              label="Reason for Change"
              value={updateReason}
              onChangeText={setUpdateReason}
              placeholder="Brief reason for admin review"
              multiline
              numberOfLines={2}
            />

            <Button
              title="Submit Request to Admin"
              onPress={handleSendUpdateRequest}
              loading={submittingUpdate}
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
  content: {
    padding: 16,
    paddingBottom: 36,
  },
  avatarCard: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 14,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  editPhotoBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  fullName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  designationText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  idBadge: {
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  idText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  sectionCard: {
    padding: 16,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
  },
  requestLink: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryDark,
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
  managerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  managerName: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  managerSub: {
    fontSize: 11,
    color: Colors.textSecondary,
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
  docName: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
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
});
