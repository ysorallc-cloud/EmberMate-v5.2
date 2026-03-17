// ============================================================================
// HandoffPromptCard — Contextual card on Now tab after 4pm
// Links to Journal tab
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, BorderRadius, Spacing } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { navigate } from '../../lib/navigate';

interface HandoffPromptCardProps {
  completedCount: number;
}

export const HandoffPromptCard: React.FC<HandoffPromptCardProps> = ({ completedCount }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const hour = new Date().getHours();
  if (hour < 16 || completedCount < 1) return null;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => navigate('/(tabs)/timeline')}
      activeOpacity={0.7}
      accessibilityLabel="Create handoff report for tonight's caregiver"
      accessibilityRole="button"
      testID="handoff-prompt"
    >
      <View style={styles.content}>
        <Text style={styles.icon}>{'\uD83D\uDCCB'}</Text>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Generate handoff report</Text>
          <Text style={styles.subtitle}>
            {completedCount} item{completedCount !== 1 ? 's' : ''} completed
          </Text>
        </View>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigate('/(tabs)/timeline')}
          activeOpacity={0.7}
          accessibilityLabel="Create handoff report"
          accessibilityRole="button"
        >
          <Text style={styles.createButtonText}>Create</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    backgroundColor: c.accentDim,
    borderWidth: 1,
    borderColor: c.accentBorder,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  icon: {
    fontSize: 22,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textBright,
  },
  subtitle: {
    fontSize: 12,
    color: c.textSecondary,
    marginTop: 2,
    lineHeight: 17,
  },
  createButton: {
    backgroundColor: c.accent,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  createButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
