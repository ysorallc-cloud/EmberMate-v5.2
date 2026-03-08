import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, Pressable } from 'react-native';
import { GlassCard } from '../../../components/aurora/GlassCard';
import { Colors, Typography, Spacing, BorderRadius } from '../../../theme/theme-tokens';
import { useTheme } from '../../../contexts/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const DisclaimerModal: React.FC<Props> = ({ visible, onClose }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <GlassCard style={styles.card}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              <Text style={styles.title}>Important Information</Text>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>1. Personal Health Tracking Only</Text>
                <Text style={styles.sectionText}>
                  EmberMate is a personal health tracking tool designed to help caregivers
                  organize and monitor daily care activities. It is not a medical device
                  or clinical system.
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>2. Not a Substitute for Professional Care</Text>
                <Text style={styles.sectionText}>
                  This app is for personal tracking and informational purposes only. It is NOT
                  intended to diagnose, treat, cure, or prevent any disease. Always consult
                  qualified healthcare professionals for medical advice.
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>3. Your Data Stays on Your Device</Text>
                <Text style={styles.sectionText}>
                  All health data you enter is stored locally on your device using encryption.
                  EmberMate does not transmit your data to external servers. You are responsible
                  for backing up your device to prevent data loss.
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>4. Your Responsibility</Text>
                <Text style={styles.sectionText}>
                  You are solely responsible for deciding what information to enter. We
                  recommend consulting with your healthcare provider about appropriate tracking methods.
                </Text>
              </View>

              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  By using EmberMate, you explicitly acknowledge and accept these limitations.
                </Text>
              </View>

              <Pressable
                style={styles.closeButton}
                onPress={onClose}
                accessibilityLabel="Close disclaimer"
                accessibilityRole="button"
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </Pressable>
            </ScrollView>
          </GlassCard>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (c: typeof Colors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  card: {
    maxHeight: '100%',
  },
  scrollView: {
    maxHeight: '100%',
  },
  title: {
    ...Typography.h2,
    color: c.textPrimary,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.h3,
    color: c.textPrimary,
    marginBottom: Spacing.sm,
  },
  sectionText: {
    ...Typography.body,
    color: c.textSecondary,
    lineHeight: 22,
  },
  warningBox: {
    backgroundColor: 'rgba(255, 200, 100, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 200, 100, 0.3)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  warningText: {
    ...Typography.body,
    color: 'rgba(255, 220, 150, 1)',
    textAlign: 'center',
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: c.accent,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  closeButtonText: {
    ...Typography.label,
    color: c.textPrimary,
  },
});

export default DisclaimerModal;
