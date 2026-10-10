/**
 * Camera & Image Capture Modal Component
 * Supports live selfie verification for Punch In/Out with Front and Back camera switching
 * Gallery upload is disabled by default for strict live attendance integrity
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
  allowGallery?: boolean; // Default false for attendance security
}

export function CameraModal({
  visible,
  onClose,
  onPhotoCaptured,
  title = 'Photo Verification',
  subtitle = 'Please capture a clear live photo to verify attendance.',
  preferFrontCamera = true,
  allowGallery = false,
}: CameraModalProps) {
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [base64Data, setBase64Data] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>(
    preferFrontCamera ? 'front' : 'back'
  );

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
        cameraType:
          cameraFacing === 'front'
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

          {/* Camera Lens Toggle (Front Selfie vs Back Camera) */}
          <View style={styles.cameraToggleContainer}>
            <Text style={styles.cameraToggleLabel}>Select Camera:</Text>
            <View style={styles.cameraToggleRow}>
              <TouchableOpacity
                style={[
                  styles.toggleOption,
                  cameraFacing === 'front' && styles.toggleOptionActive,
                ]}
                onPress={() => setCameraFacing('front')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="person-circle-outline"
                  size={18}
                  color={cameraFacing === 'front' ? Colors.primaryDark : Colors.textSecondary}
                />
                <Text
                  style={[
                    styles.toggleOptionText,
                    cameraFacing === 'front' && styles.toggleOptionTextActive,
                  ]}
                >
                  Front (Selfie)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.toggleOption,
                  cameraFacing === 'back' && styles.toggleOptionActive,
                ]}
                onPress={() => setCameraFacing('back')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="camera-outline"
                  size={18}
                  color={cameraFacing === 'back' ? Colors.primaryDark : Colors.textSecondary}
                />
                <Text
                  style={[
                    styles.toggleOptionText,
                    cameraFacing === 'back' && styles.toggleOptionTextActive,
                  ]}
                >
                  Back Camera
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Photo Preview or Capture Area */}
          <View style={styles.previewContainer}>
            {loading ? (
              <ActivityIndicator size="large" color={Colors.primary} />
            ) : previewUri ? (
              <Image source={{ uri: previewUri }} style={styles.previewImage} />
            ) : (
              <View style={styles.placeholder}>
                <Ionicons
                  name={cameraFacing === 'front' ? 'person-circle-outline' : 'camera-outline'}
                  size={64}
                  color={Colors.primaryDark}
                />
                <Text style={styles.placeholderText}>
                  {cameraFacing === 'front'
                    ? 'Front selfie camera ready'
                    : 'Back camera ready'}
                </Text>
                <Text style={styles.placeholderSubtext}>
                  Live camera capture only
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
                title={`Open ${cameraFacing === 'front' ? 'Selfie Camera' : 'Back Camera'}`}
                onPress={takePhoto}
                variant="primary"
                icon={<Ionicons name="camera" size={18} color="#1A1612" />}
                style={allowGallery ? styles.btnSpacing : undefined}
              />
              {allowGallery && (
                <Button
                  title="Choose from Gallery"
                  onPress={pickFromGallery}
                  variant="secondary"
                  icon={<Ionicons name="images-outline" size={18} color={Colors.textPrimary} />}
                />
              )}
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
    marginBottom: 4,
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
    marginBottom: 12,
    lineHeight: 18,
  },
  cameraToggleContainer: {
    marginBottom: 14,
  },
  cameraToggleLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cameraToggleRow: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: Colors.surfaceSubtle,
    padding: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  toggleOptionActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  toggleOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  toggleOptionTextActive: {
    color: Colors.primaryDark,
    fontWeight: '800',
  },
  previewContainer: {
    width: '100%',
    height: 220,
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 14,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  placeholderSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  buttonsColumn: {
    gap: 10,
  },
  btnSpacing: {
    marginBottom: 4,
  },
});

export default CameraModal;
