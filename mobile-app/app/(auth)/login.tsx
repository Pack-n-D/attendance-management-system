/**
 * Mobile Login Screen
 * Recreates frontend/src/pages/Shared/Login.jsx with native components
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import Colors from '../../constants/Colors';
import Logo from '../../components/Logo';
import Card from '../../components/Card';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { getApiBaseUrl, setCustomApiUrl } from '../../services/api';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // API Config modal state
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [apiUrl, setApiUrl] = useState('');

  useEffect(() => {
    getApiBaseUrl().then(setApiUrl);
  }, []);

  const handleLogin = async () => {
    if (!identifier.trim() || !password) {
      setErrorMessage('Please enter both Employee ID / Email and password.');
      return;
    }

    setErrorMessage('');
    setLoading(true);

    try {
      const user = await login(identifier.trim(), password);
      if (user.mustChangePassword) {
        router.replace('/(auth)/change-password');
      } else if (user.role === 'super_admin') {
        router.replace('/(admin)/dashboard');
      } else {
        router.replace('/(employee)/home');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (id: string, pass: string) => {
    setIdentifier(id);
    setPassword(pass);
    setErrorMessage('');
  };

  const handleSaveApiUrl = async () => {
    try {
      await setCustomApiUrl(apiUrl);
      setShowApiConfig(false);
      Alert.alert('Success', 'API URL updated successfully.');
    } catch {
      Alert.alert('Error', 'Failed to save API URL.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top Branding Section */}
        <View style={styles.brandContainer}>
          <Logo size="large" />
          <Text style={styles.welcomeText}>Welcome to APC Attendance</Text>
          <Text style={styles.subtitleText}>
            Sign in with your employee credentials to mark attendance and manage requests.
          </Text>
        </View>

        {/* Login Card */}
        <Card style={styles.loginCard} elevated>
          {errorMessage ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={Colors.danger} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <Input
            label="Employee ID or Email"
            placeholder="e.g. SH-GO-98-0001 or admin@apc.com"
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            autoCorrect={false}
            leftIcon={<Ionicons name="person-outline" size={18} color={Colors.textSecondary} />}
          />

          <Input
            label="Password"
            placeholder="Enter password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            leftIcon={<Ionicons name="lock-closed-outline" size={18} color={Colors.textSecondary} />}
            rightIcon={
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={Colors.textSecondary}
                />
              </TouchableOpacity>
            }
          />

          <Button
            title="Sign In to Portal"
            onPress={handleLogin}
            loading={loading}
            variant="primary"
            style={styles.signInBtn}
          />

          {/* Quick Fill Test Accounts */}
          <View style={styles.demoSection}>
            <Text style={styles.demoLabel}>QUICK TEST ACCOUNTS:</Text>
            <View style={styles.demoChipsRow}>
              <TouchableOpacity
                style={styles.demoChip}
                onPress={() => fillDemo('SUPERADMIN01', 'Admin@123')}
              >
                <Text style={styles.demoChipText}>Super Admin</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.demoChip}
                onPress={() => fillDemo('KA-MU-95-0001', 'Password@123')}
              >
                <Text style={styles.demoChipText}>Manager</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.demoChip}
                onPress={() => fillDemo('SH-GO-98-0001', 'Password@123')}
              >
                <Text style={styles.demoChipText}>Employee</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card>

        {/* Server Config Accordion */}
        <TouchableOpacity
          style={styles.serverConfigToggle}
          onPress={() => setShowApiConfig(!showApiConfig)}
        >
          <Ionicons name="server-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.serverConfigText}>
            Server API: {apiUrl.replace(/https?:\/\//, '')}
          </Text>
          <Ionicons
            name={showApiConfig ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={Colors.textSecondary}
          />
        </TouchableOpacity>

        {showApiConfig && (
          <Card style={styles.apiConfigCard}>
            <Text style={styles.apiConfigTitle}>Configure Backend API URL</Text>
            <Input
              value={apiUrl}
              onChangeText={setApiUrl}
              autoCapitalize="none"
              placeholder="https://example.com/api"
            />
            <Button
              title="Save API URL"
              onPress={handleSaveApiUrl}
              size="small"
              variant="outline"
            />
          </Card>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 48,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 18,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    maxWidth: 300,
  },
  loginCard: {
    padding: 20,
    backgroundColor: Colors.surface,
    borderRadius: 14,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerBg,
    borderColor: Colors.dangerBorder,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    fontSize: 12,
    color: Colors.danger,
    fontWeight: '600',
    flex: 1,
  },
  signInBtn: {
    marginTop: 6,
  },
  demoSection: {
    marginTop: 22,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 14,
  },
  demoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textTertiary,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  demoChipsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  demoChip: {
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  demoChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  serverConfigToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 24,
  },
  serverConfigText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  apiConfigCard: {
    marginTop: 12,
    padding: 14,
  },
  apiConfigTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
});
