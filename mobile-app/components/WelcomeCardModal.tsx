/**
 * Welcome Card Modal Component
 * Displays temporary credentials and employee ID upon successful creation
 * Replicates frontend/src/components/WelcomeCardModal.jsx
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import Button from './Button';
import Card from './Card';

interface WelcomeCardModalProps {
  visible: boolean;
  onClose: () => void;
  employeeData: {
    employeeId: string;
    fullName: string;
    email: string;
    tempPassword?: string;
    designation?: string;
    department?: string;
  } | null;
}

export function WelcomeCardModal({
  visible,
  onClose,
  employeeData,
}: WelcomeCardModalProps) {
  if (!employeeData) return null;

  const shareCredentials = async () => {
    try {
      const message = `🎉 Welcome to AP Corporation!\n\nEmployee Credentials:\n• Name: ${employeeData.fullName}\n• Employee ID: ${employeeData.employeeId}\n• Email: ${employeeData.email}\n• Temporary Password: ${employeeData.tempPassword || 'Set on first login'}\n\nPlease download the APC Mobile App or login via the web portal and change your password upon first login.`;
      await Share.share({ message, title: 'APC Employee Credentials' });
    } catch {
      // Ignore
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.cardContainer}>
          {/* Header Banner */}
          <View style={styles.banner}>
            <View style={styles.iconCircle}>
              <Ionicons name="checkmark-done" size={28} color="#1A1612" />
            </View>
            <Text style={styles.bannerTitle}>Employee Created!</Text>
            <Text style={styles.bannerSubtitle}>
              Welcome card and temporary credentials
            </Text>
          </View>

          {/* Details Card */}
          <Card style={styles.bodyCard}>
            <View style={styles.row}>
              <Text style={styles.fieldLabel}>Employee ID</Text>
              <Text style={styles.fieldValueHighlight}>{employeeData.employeeId}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <Text style={styles.fieldValue}>{employeeData.fullName}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.fieldLabel}>Department</Text>
              <Text style={styles.fieldValue}>{employeeData.department || '-'}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.fieldLabel}>Email Address</Text>
              <Text style={styles.fieldValue}>{employeeData.email}</Text>
            </View>

            {employeeData.tempPassword ? (
              <>
                <View style={styles.divider} />
                <View style={styles.row}>
                  <Text style={styles.fieldLabel}>Temp Password</Text>
                  <View style={styles.passwordPill}>
                    <Text style={styles.passwordText}>{employeeData.tempPassword}</Text>
                  </View>
                </View>
              </>
            ) : null}
          </Card>

          <Text style={styles.noticeText}>
            ℹ️ The employee will be prompted to change their temporary password upon their first login.
          </Text>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <Button
              title="Share Credentials"
              onPress={shareCredentials}
              variant="outline"
              icon={<Ionicons name="share-social-outline" size={16} color={Colors.primaryDark} />}
              style={{ flex: 1 }}
            />
            <Button
              title="Done"
              onPress={onClose}
              variant="primary"
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  banner: {
    backgroundColor: Colors.primary,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1612',
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#3B332B',
    fontWeight: '600',
    marginTop: 2,
  },
  bodyCard: {
    margin: 16,
    padding: 14,
    backgroundColor: Colors.background,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  fieldLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  fieldValue: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  fieldValueHighlight: {
    fontSize: 14,
    color: Colors.primaryDark,
    fontWeight: '800',
  },
  passwordPill: {
    backgroundColor: Colors.primaryTint,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  passwordText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  noticeText: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
    lineHeight: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
});

export default WelcomeCardModal;
