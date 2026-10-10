/**
 * Application Gateway Screen
 * Directs user according to authentication state and role
 */

import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import Colors from '../constants/Colors';
import Logo from '../components/Logo';

export default function Index() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user, mustChangePassword } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !user) {
      router.replace('/(auth)/login');
      return;
    }

    if (mustChangePassword) {
      router.replace('/(auth)/change-password');
      return;
    }

    if (user.role === 'super_admin') {
      router.replace('/(admin)/dashboard');
    } else {
      router.replace('/(employee)/home');
    }
  }, [isAuthenticated, isLoading, user, mustChangePassword, router]);

  return (
    <View style={styles.container}>
      <Logo size="large" />
      <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: {
    marginTop: 28,
  },
});
