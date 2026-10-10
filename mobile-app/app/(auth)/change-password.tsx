/**
 * Force or Voluntary Change Password Screen
 * Recreates frontend/src/pages/Employee/ChangePassword.jsx
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import Colors from '../../constants/Colors';
import Card from '../../components/Card';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Header from '../../components/Header';
import { authService } from '../../services/authService';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { user, refreshUser, logout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [dob, setDob] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isEmployee = user?.role === 'employee';
  const isForced = user?.mustChangePassword;

  const handleSubmit = async () => {
    if (!currentPassword) {
      setErrorMessage('Current password is required.');
      return;
    }

    if (isEmployee && !dob.trim()) {
      setErrorMessage('Date of Birth is required for identity verification.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New passwords do not match.');
      return;
    }

    setErrorMessage('');
    setLoading(true);

    try {
      const res = await authService.changePassword({
        currentPassword,
        dob: dob.trim(),
        newPassword,
        confirmPassword,
      });

      Alert.alert(
        'Password Changed Successfully',
        res.message || 'Please log in with your new credentials.',
        [
          {
            text: 'OK',
            onPress: async () => {
              await logout();
              router.replace('/(auth)/login');
            },
          },
        ]
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to change password. Please check your current password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <Header
        title={isForced ? 'Mandatory Password Setup' : 'Change Password'}
        showBack={!isForced}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {isForced ? (
          <View style={styles.noticeBox}>
            <Ionicons name="shield-checkmark-outline" size={20} color={Colors.warning} />
            <Text style={styles.noticeText}>
              Security requirement: You must change your temporary password before accessing the attendance system.
            </Text>
          </View>
        ) : null}

        <Card style={styles.card}>
          {errorMessage ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={Colors.danger} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <Input
            label="Current Password"
            placeholder="Enter temporary or current password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            required
          />

          {isEmployee && (
            <Input
              label="Date of Birth (Identity Verification)"
              placeholder="YYYY-MM-DD (e.g. 1998-08-20)"
              value={dob}
              onChangeText={setDob}
              helperText="Must match your official employee record."
              required
            />
          )}

          <Input
            label="New Password"
            placeholder="At least 8 characters"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            required
          />

          <Input
            label="Confirm New Password"
            placeholder="Re-enter new password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            required
          />

          <View style={styles.rulesBox}>
            <Text style={styles.rulesTitle}>PASSWORD REQUIREMENTS:</Text>
            <Text style={styles.ruleItem}>• Minimum 8 characters in length</Text>
            <Text style={styles.ruleItem}>• At least 1 uppercase and 1 lowercase letter</Text>
            <Text style={styles.ruleItem}>• At least 1 number and 1 special character</Text>
          </View>

          <Button
            title="Update Password"
            onPress={handleSubmit}
            loading={loading}
            variant="primary"
            style={styles.submitBtn}
          />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
  },
  noticeBox: {
    flexDirection: 'row',
    backgroundColor: Colors.warningBg,
    borderColor: Colors.warningBorder,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: '#8A5D00',
    lineHeight: 18,
    fontWeight: '600',
  },
  card: {
    padding: 18,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerBg,
    borderColor: Colors.dangerBorder,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
    gap: 8,
  },
  errorText: {
    fontSize: 12,
    color: Colors.danger,
    fontWeight: '600',
    flex: 1,
  },
  rulesBox: {
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 8,
    padding: 12,
    marginVertical: 12,
  },
  rulesTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  ruleItem: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  submitBtn: {
    marginTop: 8,
  },
});
