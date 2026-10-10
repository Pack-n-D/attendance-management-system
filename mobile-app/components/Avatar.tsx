/**
 * Mobile Avatar Component with Automatic Fallback
 * Recreates frontend/src/components/Avatar.jsx:
 * - Attempts to load profile photo via full URL
 * - If image is missing or fails to load, renders stylish initials badge
 */

import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { getFullPhotoUrl } from '../services/api';
import Colors from '../constants/Colors';

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: number;
  fontSize?: number;
  borderWidth?: number;
  borderColor?: string;
  style?: StyleProp<ViewStyle>;
}

export default function Avatar({
  src,
  name,
  size = 36,
  fontSize,
  borderWidth = 1.5,
  borderColor = Colors.primary,
  style,
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  const photoUrl = getFullPhotoUrl(src);
  const initialStr = String(name || 'E').trim();
  const initial = (initialStr.charAt(0) || 'E').toUpperCase();
  const computedFontSize = fontSize || (size >= 80 ? 32 : size >= 50 ? 20 : size >= 36 ? 15 : 12);

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth,
          borderColor,
        },
        style,
      ]}
    >
      {photoUrl && !imgError ? (
        <Image
          source={{ uri: photoUrl }}
          style={{ width: '100%', height: '100%', borderRadius: size / 2 }}
          onError={() => setImgError(true)}
          resizeMode="cover"
        />
      ) : (
        <Text style={[styles.initialText, { fontSize: computedFontSize }]}>
          {initial}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initialText: {
    fontWeight: '800',
    color: '#B45309',
  },
});
