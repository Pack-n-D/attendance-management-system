/**
 * Official APC Brand Logo Component for Mobile
 * Recreates frontend/src/components/Logo.jsx with exact visual fidelity:
 * - Transparent background
 * - Tilted thin black oval ring (#1A1A1A)
 * - 8-pointed stars (✦)
 * - Forward-slanted bold italic golden orange "APC" (#FAA61A)
 * - Uppercase "ATTENDANCE" wordmark (#75706A)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showSubtitle?: boolean;
  lockup?: 'full' | 'icon';
}

export function Logo({
  size = 'medium',
  showSubtitle = true,
  lockup = 'full',
}: LogoProps) {
  const isSmall = size === 'small';
  const isLarge = size === 'large';

  // Sizing tokens
  const ovalHeight = isLarge ? 48 : isSmall ? 30 : 38;
  const ovalWidth = isLarge ? 116 : isSmall ? 76 : 94;
  const apcFontSize = isLarge ? 24 : isSmall ? 15 : 19;
  const starSize = isLarge ? 11 : isSmall ? 8 : 9;
  const wordmarkFontSize = isLarge ? 13 : isSmall ? 9.5 : 11;

  const shouldShowWordmark = showSubtitle && lockup === 'full';

  return (
    <View style={styles.container}>
      {/* Tilted Oval Ring with APC & Stars */}
      <View
        style={[
          styles.ovalRing,
          {
            height: ovalHeight,
            width: ovalWidth,
            borderRadius: ovalHeight / 2,
          },
        ]}
      >
        {/* Top-Left Star */}
        <Text style={[styles.starSymbol, { fontSize: starSize, top: isLarge ? 4 : 2, left: isLarge ? 8 : 5 }]}>
          ✦
        </Text>

        {/* Slanted Golden Orange APC Text */}
        <Text style={[styles.apcText, { fontSize: apcFontSize }]}>
          APC
        </Text>

        {/* Bottom-Right Star */}
        <Text style={[styles.starSymbol, { fontSize: starSize, bottom: isLarge ? 4 : 2, right: isLarge ? 8 : 5 }]}>
          ✦
        </Text>
      </View>

      {/* Official "ATTENDANCE" Wordmark */}
      {shouldShowWordmark && (
        <Text
          style={[
            styles.attendanceWordmark,
            { fontSize: wordmarkFontSize },
          ]}
        >
          ATTENDANCE
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ovalRing: {
    backgroundColor: 'transparent',
    borderWidth: 1.8,
    borderColor: '#1A1A1A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-12deg' }],
    position: 'relative',
    paddingHorizontal: 12,
  },
  starSymbol: {
    position: 'absolute',
    color: '#1A1A1A',
    fontWeight: '900',
  },
  apcText: {
    color: '#FAA61A',
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 1,
  },
  attendanceWordmark: {
    color: '#75706A',
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});

export default Logo;
