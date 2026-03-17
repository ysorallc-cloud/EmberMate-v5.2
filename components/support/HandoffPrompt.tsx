import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius, Typography } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { useDailyCareInstances } from '../../hooks/useDailyCareInstances';
import { getTodayDateString } from '../../services/carePlanGenerator';
import { buildHandoffReport } from '../../utils/handoffReportBuilder';
import { logError } from '../../utils/devLog';

export function HandoffPrompt() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const today = getTodayDateString();
  const { state } = useDailyCareInstances(today);
  const [dismissed, setDismissed] = useState(false);
  const [generating, setGenerating] = useState(false);

  const instances = state?.instances ?? [];
  const overdueItems = instances.filter(
    (i) => i.status === 'pending' && i.scheduledTime && i.scheduledTime < new Date().toISOString()
  );

  // Show when: overdue items exist OR it's after 3 PM (shift change time)
  const currentHour = new Date().getHours();
  const isShiftChangeTime = currentHour >= 15;
  const shouldShow = overdueItems.length > 0 || isShiftChangeTime;

  if (dismissed || !shouldShow) return null;

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      const report = await buildHandoffReport();
      await Share.share({ message: report, title: 'Caregiver Handoff Report' });
    } catch (error) {
      logError('HandoffPrompt.handleGenerateReport', error);
      Alert.alert('Error', 'Failed to generate handoff report. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.icon}>{'\uD83D\uDD04'}</Text>
        <Text style={styles.title}>Handoff Summary</Text>
      </View>
      <Text style={styles.body}>
        {overdueItems.length > 0
          ? `${overdueItems.length} item${overdueItems.length !== 1 ? 's' : ''} still need${overdueItems.length === 1 ? 's' : ''} attention today.`
          : 'Ready to hand off? Generate a report for the next caregiver.'}
      </Text>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.reportButton}
          onPress={handleGenerateReport}
          disabled={generating}
          activeOpacity={0.7}
          accessibilityLabel="Generate handoff report"
          accessibilityRole="button"
        >
          {generating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.reportButtonText}>Generate Report</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => router.push('/(tabs)/timeline')}
          activeOpacity={0.7}
          accessibilityLabel="View care brief"
          accessibilityRole="button"
        >
          <Text style={styles.viewButtonText}>Care Brief</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setDismissed(true)}
          activeOpacity={0.7}
          accessibilityLabel="Dismiss handoff prompt"
          accessibilityRole="button"
        >
          <Text style={styles.dismissText}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    backgroundColor: c.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: c.warning || '#F59E0B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  icon: {
    fontSize: 16,
    marginRight: Spacing.xs,
  },
  title: {
    ...Typography.body,
    fontWeight: '600' as const,
    color: c.textPrimary,
  },
  body: {
    ...Typography.bodySmall,
    color: c.textSecondary,
    marginBottom: Spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  reportButton: {
    backgroundColor: c.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    minWidth: 120,
    alignItems: 'center',
  },
  reportButtonText: {
    ...Typography.bodySmall,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  viewButton: {
    backgroundColor: c.glassActive,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  viewButtonText: {
    ...Typography.bodySmall,
    color: c.accent,
    fontWeight: '600',
  },
  dismissText: {
    ...Typography.bodySmall,
    color: c.textMuted,
  },
});
