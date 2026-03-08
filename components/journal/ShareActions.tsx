import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { logAuditEvent, AuditEventType, AuditSeverity } from '../../utils/auditLog';
import { logError } from '../../utils/devLog';

interface Props {
  onShare: () => void;
  onExport?: () => void;
}

export function ShareActions({ onShare, onExport }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [sharing, setSharing] = useState(false);

  const confirmShare = () => {
    Alert.alert(
      'Share Care Brief?',
      'A redacted summary will be shared (no specific vitals, dosages, or medical details). Only share with trusted caregivers or healthcare providers.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Share',
          onPress: doShare,
        },
      ]
    );
  };

  const doShare = async () => {
    try {
      setSharing(true);
      onShare();
    } catch (error) {
      logError('ShareActions.doShare', error);
    } finally {
      setSharing(false);
    }
  };

  const confirmExport = () => {
    Alert.alert(
      'Export Full Care Brief?',
      'This will open the full Care Brief with sensitive health information including medications, vitals, and medical conditions. Ensure the recipient is authorized to receive this information.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: () => {
            logAuditEvent(AuditEventType.CARE_BRIEF_EXPORTED, 'Care Brief exported as PDF', AuditSeverity.WARNING, { format: 'pdf' });
            onExport?.();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={confirmShare}
        activeOpacity={0.7}
        disabled={sharing}
        accessibilityLabel="Share summary"
        accessibilityRole="button"
        accessibilityState={{ disabled: sharing }}
      >
        {sharing ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : (
          <Text style={styles.primaryButtonText}>{'\uD83D\uDCE4'} Share Summary</Text>
        )}
      </TouchableOpacity>

      {onExport && (
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={confirmExport}
          activeOpacity={0.7}
          accessibilityLabel="Export full care brief"
          accessibilityRole="button"
        >
          <Text style={styles.secondaryButtonText}>{'\uD83D\uDCCB'} Export Full Care Brief</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  primaryButton: {
    backgroundColor: c.sageBorder,
    borderWidth: 1,
    borderColor: c.accentBorder,
    borderRadius: BorderRadius.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: c.accent,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: c.glassActive,
    borderRadius: BorderRadius.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: c.textSecondary,
  },
});
