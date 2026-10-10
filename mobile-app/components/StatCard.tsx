/**
 * Stat Metric Card for Executive Dashboard & Attendance Overview
 */

import React, { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../constants/Colors';
import Card from './Card';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  variant = 'neutral',
}: StatCardProps) {
  const getAccentColor = () => {
    switch (variant) {
      case 'primary':
        return Colors.primary;
      case 'success':
        return Colors.success;
      case 'warning':
        return Colors.warning;
      case 'danger':
        return Colors.danger;
      case 'info':
        return Colors.info;
      default:
        return Colors.textPrimary;
    }
  };

  const getBgTint = () => {
    switch (variant) {
      case 'primary':
        return Colors.primaryTint;
      case 'success':
        return Colors.successBg;
      case 'warning':
        return Colors.warningBg;
      case 'danger':
        return Colors.dangerBg;
      case 'info':
        return Colors.infoBg;
      default:
        return Colors.surfaceSubtle;
    }
  };

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {icon && (
          <View style={[styles.iconWrapper, { backgroundColor: getBgTint() }]}>
            {icon}
          </View>
        )}
      </View>

      <Text style={[styles.value, { color: getAccentColor() }]}>
        {value}
      </Text>

      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  value: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 4,
    fontWeight: '500',
  },
});

export default StatCard;
