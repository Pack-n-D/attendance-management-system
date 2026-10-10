/**
 * APC Mobile Status Badge Component
 * Renders status pills matching frontend/src/components/StatusBadge.jsx
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../constants/Colors';
import { getStatusLabel } from '../utils/formatters';

interface StatusBadgeProps {
  status?: string | null;
  size?: 'small' | 'medium';
}

export function StatusBadge({ status, size = 'medium' }: StatusBadgeProps) {
  const normalized = status ? String(status).toLowerCase() : 'absent';
  const statusConfig = (Colors.status as any)[normalized] || {
    color: Colors.textSecondary,
    bg: Colors.borderLight,
    border: Colors.border,
    label: getStatusLabel(status),
  };

  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: statusConfig.bg,
          borderColor: statusConfig.border,
          paddingVertical: isSmall ? 3 : 5,
          paddingHorizontal: isSmall ? 8 : 10,
        },
      ]}
    >
      <View
        style={[
          styles.dot,
          {
            backgroundColor: statusConfig.color,
            width: isSmall ? 6 : 8,
            height: isSmall ? 6 : 8,
            borderRadius: isSmall ? 3 : 4,
          },
        ]}
      />
      <Text
        style={[
          styles.text,
          {
            color: statusConfig.color,
            fontSize: isSmall ? 11 : 12,
          },
        ]}
      >
        {statusConfig.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9999,
    borderWidth: 1,
    alignSelf: 'flex-start',
    gap: 6,
  },
  dot: {},
  text: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

export default StatusBadge;
