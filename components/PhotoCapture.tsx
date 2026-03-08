import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import { savePhoto } from '../utils/photoStorage';
import { logError } from '../utils/devLog';

export interface PhotoCaptureProps {
  type: 'medication' | 'wound' | 'document' | 'other';
  onPhotoSaved: () => void;
  medicationId?: string;
}

export default function PhotoCapture({ type, onPhotoSaved, medicationId }: PhotoCaptureProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const requestPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is needed to take photos.');
      return false;
    }
    return true;
  };

  const takePhoto = async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await savePhoto(result.assets[0].uri, type, { relatedId: medicationId });
        onPhotoSaved();
      }
    } catch (error) {
      logError('PhotoCapture.takePhoto', error);
      Alert.alert('Error', 'Failed to save photo');
    }
  };

  const pickFromLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await savePhoto(result.assets[0].uri, type, { relatedId: medicationId });
        onPhotoSaved();
      }
    } catch (error) {
      logError('PhotoCapture.pickFromLibrary', error);
      Alert.alert('Error', 'Failed to save photo');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={takePhoto}
        accessibilityLabel={`Take ${type} photo with camera`}
        accessibilityRole="button"
      >
        <Text style={styles.buttonIcon}>{'\uD83D\uDCF7'}</Text>
        <Text style={styles.buttonText}>Take Photo</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={pickFromLibrary}
        accessibilityLabel={`Choose ${type} photo from library`}
        accessibilityRole="button"
      >
        <Text style={styles.buttonIcon}>{'\uD83D\uDDBC\uFE0F'}</Text>
        <Text style={styles.buttonText}>Choose from Library</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  button: {
    flex: 1,
    backgroundColor: c.surface,
    borderRadius: 12,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: c.border,
  },
  buttonIcon: {
    fontSize: 32,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textPrimary,
  },
});
