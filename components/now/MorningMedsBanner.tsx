import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface MorningMedsBannerProps {
  pendingCount: number;
  onConfirmAll: (instanceIds: string[]) => Promise<void>;
  pendingInstanceIds: string[];
}

export function MorningMedsBanner({
  pendingCount,
  onConfirmAll,
  pendingInstanceIds,
}: MorningMedsBannerProps) {
  const { colors } = useTheme();
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  if (pendingCount === 0 || confirmed) return null;

  const handleBatchConfirm = async () => {
    setConfirming(true);
    try {
      await onConfirmAll(pendingInstanceIds);
      setConfirmed(true);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBackground, borderColor: colors.glassBorder }]}>
      <View style={styles.content}>
        <Text style={[styles.emoji]}>💊</Text>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {pendingCount} med{pendingCount !== 1 ? 's' : ''} due now
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Tap to confirm all at once
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.accent }]}
          onPress={handleBatchConfirm}
          disabled={confirming}
          accessibilityLabel={`Confirm all ${pendingCount} medications`}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>
            {confirming ? '...' : 'Confirm All'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  emoji: {
    fontSize: 24,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
