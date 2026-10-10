/**
 * Official APC Brand Logo Component for Mobile
 * Recreates the official AP Corporation oval star brand identity
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../constants/Colors';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showSubtitle?: boolean;
}

export function Logo({ size = 'medium', showSubtitle = true }: LogoProps) {
  const isSmall = size === 'small';
  const isLarge = size === 'large';

  const badgeHeight = isLarge ? 50 : isSmall ? 32 : 40;
  const badgeWidth = isLarge ? 110 : isSmall ? 70 : 88;
  const apcFontSize = isLarge ? 26 : isSmall ? 16 : 20;

  return (
    <View style={styles.container}>
      {/* Oval Brand Emblem */}
      <View
        style={[
          styles.ovalBadge,
          {
            height: badgeHeight,
            width: badgeWidth,
            borderRadius: badgeHeight / 2,
          },
        ]}
      >
        <Text style={[styles.starSymbol, isSmall && styles.starSmall]}>✦</Text>
        <Text style={[styles.apcWordmark, { fontSize: apcFontSize }]}>APC</Text>
        <Text style={[styles.starSymbol, isSmall && styles.starSmall]}>✦</Text>
      </View>

      {/* Subtitle Lockup */}
      {showSubtitle && (
        <View style={styles.textContainer}>
          <Text style={[styles.brandTitle, isSmall && styles.brandTitleSmall]}>
            AP CORPORATION
          </Text>
          <Text style={[styles.brandSubtitle, isSmall && styles.brandSubtitleSmall]}>
            ATTENDANCE SYSTEM
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ovalBadge: {
    backgroundColor: '#1E1B18',
    borderWidth: 2,
    borderColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    gap: 4,
    transform: [{ rotate: '-4deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  starSymbol: {
    color: '#E8E2D8',
    fontSize: 10,
  },
  starSmall: {
    fontSize: 8,
  },
  apcWordmark: {
    color: Colors.primary,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 1.5,
  },
  textContainer: {
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  brandTitleSmall: {
    fontSize: 11,
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  brandSubtitleSmall: {
    fontSize: 8,
  },
});

export default Logo;
