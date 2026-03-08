// ============================================================================
// INFO MODAL
// Lightweight modal for contextual help and clarification
// Used to explain scope differences (e.g., Care Plan vs Adjust Today)
// ============================================================================

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Pressable,
} from 'react-native';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';

interface InfoModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  content: string;
  hint?: string;
}

export function InfoModal({ visible, onClose, title, content, hint }: InfoModalProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose} accessibilityLabel="Close modal" accessibilityRole="button">
        <View style={styles.overlay}>
          <TouchableWithoutFeedback accessibilityLabel="Modal content" accessibilityRole="none">
            <View style={styles.modal}>
              <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityLabel="Close"
                  accessibilityRole="button"
                >
                  <Text style={styles.closeIcon}>×</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.content}>{content}</Text>
              {hint && (
                <View style={styles.hintContainer}>
                  <Text style={styles.hint}>{hint}</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.gotItButton}
                onPress={onClose}
                activeOpacity={0.7}
                accessibilityLabel="Got it"
                accessibilityRole="button"
              >
                <Text style={styles.gotItText}>Got it</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// Info Icon Button - Reusable trigger for the modal
interface InfoIconButtonProps {
  onPress: () => void;
  size?: 'small' | 'medium';
}

export function InfoIconButton({ onPress, size = 'medium' }: InfoIconButtonProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const iconSize = size === 'small' ? 14 : 18;
  const containerSize = size === 'small' ? 20 : 26;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.infoIconButton, { width: containerSize, height: containerSize }]}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityLabel="More information"
      accessibilityRole="button"
    >
      <Text style={[styles.infoIcon, { fontSize: iconSize }]}>ⓘ</Text>
    </TouchableOpacity>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 20,
    maxWidth: 340,
    width: '100%',
    borderWidth: 1,
    borderColor: c.glassActive,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: c.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  closeIcon: {
    fontSize: 24,
    color: c.textHalf,
    lineHeight: 24,
  },
  content: {
    fontSize: 14,
    color: c.textBright,
    lineHeight: 21,
    marginBottom: 12,
  },
  hintContainer: {
    backgroundColor: c.sageLight,
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  hint: {
    fontSize: 13,
    color: c.accent,
    lineHeight: 19,
  },
  gotItButton: {
    backgroundColor: c.glassActive,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  gotItText: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
  },

  // Info Icon Button
  infoIconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
  },
  infoIcon: {
    color: c.textMuted,
  },
});

export default InfoModal;
