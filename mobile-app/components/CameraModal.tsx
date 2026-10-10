/**
 * Camera & Image Capture Modal Component
 * Supports live selfie verification for Punch In/Out and receipt capture
 * Output matches the backend base64 photo requirement
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import Button from './Button';

interface CameraModalProps {
  visible: boolean;
  onClose: () => void;
  onPhotoCaptured: (base64Photo: string) => void;
  title?: string;
  subtitle?: string;
  preferFrontCamera?: boolean;
}

export function CameraModal({
  visible,
  onClose,
  onPhotoCaptured,
  title = 'Selfie Verification',
  subtitle = 'Please capture a clear photo of yourself to record attendance.',
  preferFrontCamera = true,
}: CameraModalProps) {
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [base64Data, setBase64Data] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const takePhoto = async () => {
    try {
      setLoading(true);
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Camera Permission Required',
          'Camera access is required to capture verification photos for attendance.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        cameraType: preferFrontCamera
          ? ImagePicker.CameraType.front
          : ImagePicker.CameraType.back,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setPreviewUri(asset.uri);
        const dataUri = asset.base64?.startsWith('data:')
          ? asset.base64
          : `data:image/jpeg;base64,${asset.base64}`;
        setBase64Data(dataUri);
      }
    } catch (err: any) {
      Alert.alert('Camera Error', err.message || 'Unable to open camera');
    } finally {
      setLoading(false);
    }
  };

  const pickFromGallery = async () => {
    try {
      setLoading(true);
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Required', 'Gallery access is needed to select a receipt or photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setPreviewUri(asset.uri);
        const dataUri = asset.base64?.startsWith('data:')
          ? asset.base64
          : `data:image/jpeg;base64,${asset.base64}`;
        setBase64Data(dataUri);
      }
    } catch (err: any) {
      Alert.alert('Gallery Error', err.message || 'Unable to open gallery');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (base64Data) {
      onPhotoCaptured(base64Data);
      handleClose();
    }
  };

  const handleClose = () => {
    setPreviewUri(null);
    setBase64Data(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.sheetSubtitle}>{subtitle}</Text>

          {/* Photo Preview or Capture Area */}
          <View style={styles.previewContainer}>
            {loading ? (
              <ActivityIndicator size="large" color={Colors.primary} />
            ) : previewUri ? (
              <Image source={{ uri: previewUri }} style={styles.previewImage} />
            ) : (
              <View style={styles.placeholder}>
                <Ionicons
                  name={preferFrontCamera ? 'person-circle-outline' : 'camera-outline'}
                  size={72}
                  color={Colors.primaryDark}
                />
                <Text style={styles.placeholderText}>
                  No photo captured yet
                </Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          {previewUri ? (
            <View style={styles.actionsRow}>
              <Button
                title="Retake"
                onPress={takePhoto}
                variant="outline"
                style={{ flex: 1 }}
              />
              <Button
                title="Use Photo"
                onPress={handleConfirm}
                variant="primary"
                style={{ flex: 1 }}
              />
            </View>
          ) : (
            <View style={styles.buttonsColumn}>
              <Button
                title="Open Camera"
                onPress={takePhoto}
                variant="primary"
                icon={<Ionicons name="camera" size={18} color="#1A1612" />}
                style={styles.btnSpacing}
              />
              <Button
                title="Choose from Gallery"
                onPress={pickFromGallery}
                variant="secondary"
                icon={<Ionicons name="images-outline" size={18} color={Colors.textPrimary} />}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  previewContainer: {
    width: '100%',
    height: 240,
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 20,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholder: {
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 8,
    fontWeight: '500',
  },
  buttonsColumn: {
    gap: 10,
  },
  btnSpacing: {
    marginBottom: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
});

export default CameraModal;
