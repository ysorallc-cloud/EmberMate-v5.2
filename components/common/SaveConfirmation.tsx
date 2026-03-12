// ============================================================================
// SAVE CONFIRMATION OVERLAY
// Shows a brief confirmation toast after saving, then navigates back
// ============================================================================

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';

interface SaveConfirmationProps {
  visible: boolean;
  icon: string;
  title: string;
  preview?: string;
  destinations: Array<{
    icon: string;
    text: string;
  }>;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 3000;

export const SaveConfirmation: React.FC<SaveConfirmationProps> = ({
  visible,
  icon,
  title,
  preview,
  destinations,
  onDismiss,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        onDismiss();
      }, AUTO_DISMISS_MS);

      return () => clearTimeout(timer);
    } else {
      opacity.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  const allDestinations = [
    ...destinations,
    { icon: '🔒', text: 'Stored locally on your device' },
  ];

  return (
    <Pressable style={styles.overlay} onPress={onDismiss}>
      <Animated.View style={[styles.card, { opacity }]}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.title}>{title}</Text>

        {preview ? (
          <Text style={styles.preview} numberOfLines={2}>
            {preview}
          </Text>
        ) : null}

        <View style={styles.destinations}>
          {allDestinations.map((dest, i) => (
            <View key={i} style={styles.destRow}>
              <Text style={styles.destIcon}>{dest.icon}</Text>
              <Text style={styles.destText}>{dest.text}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.tapHint}>Tap anywhere to continue</Text>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  card: {
    backgroundColor: '#1a2a25',
    borderRadius: 20,
    padding: 28,
    marginHorizontal: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    maxWidth: 340,
    width: '100%',
  },
  icon: {
    fontSize: 40,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 6,
    textAlign: 'center',
  },
  preview: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  destinations: {
    width: '100%',
    marginBottom: 16,
  },
  destRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  destIcon: {
    fontSize: 14,
    marginRight: 10,
    width: 20,
    textAlign: 'center',
  },
  destText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    flex: 1,
  },
  tapHint: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
  },
});

export default SaveConfirmation;
