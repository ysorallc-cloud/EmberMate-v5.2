// ============================================================================
// SAMPLE DATA TRANSITION SCREEN
// Guided transition from sample data to real data
// ============================================================================

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuroraBackground } from '../components/aurora/AuroraBackground';
import { Colors, Spacing, BorderRadius } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import { clearSampleData } from '../utils/sampleDataManager';
import { logError } from '../utils/devLog';

const TRANSITION_POINTS = [
  { icon: '\u{1F9F9}', text: 'All sample medications, vitals, and logs will be removed' },
  { icon: '\u{1F4CB}', text: 'Your care plan settings and preferences stay' },
  { icon: '\u{1F4DD}', text: 'You\u2019ll start fresh with a clean timeline' },
  { icon: '\u{1F504}', text: 'This cannot be undone' },
];

export default function SampleDataTransition() {
  const router = useRouter();
  const [isClearing, setIsClearing] = useState(false);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleClear = async () => {
    setIsClearing(true);
    try {
      await clearSampleData();
      // Brief pause so the user sees the loading state
      await new Promise(resolve => setTimeout(resolve, 500));
      router.replace('/(tabs)/today');
    } catch (error) {
      logError('SampleDataTransition.handleClear', error);
      setIsClearing(false);
    }
  };

  if (isClearing) {
    return (
      <View style={styles.container}>
        <AuroraBackground variant="settings" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingEmoji}>{'\u{1F525}'}</Text>
          <ActivityIndicator size="large" color={colors.accent} style={styles.loadingSpinner} />
          <Text style={styles.loadingText}>Clearing sample data...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AuroraBackground variant="settings" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.content}>
          <Text style={styles.emoji}>{'\u{1F525}'}</Text>
          <Text style={styles.title}>Ready to use your own data?</Text>
          <Text style={styles.subtitle}>
            We'll clear the demo content and walk you through setting up your real care plan.
          </Text>

          <View style={styles.pointsSection}>
            <Text style={styles.pointsSectionTitle}>HERE'S WHAT HAPPENS</Text>
            {TRANSITION_POINTS.map((point, index) => (
              <View key={index} style={styles.pointRow}>
                <Text style={styles.pointIcon}>{point.icon}</Text>
                <Text style={styles.pointText}>{point.text}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleClear}
            activeOpacity={0.8}
            accessibilityLabel="Clear sample data and set up"
            accessibilityRole="button"
          >
            <Text style={styles.primaryButtonText}>Clear sample data & set up {'\u2192'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityLabel="Go back to exploring"
            accessibilityRole="button"
          >
            <Text style={styles.secondaryButtonText}>Go back to exploring</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  emoji: {
    fontSize: 56,
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: '300',
    color: c.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  subtitle: {
    fontSize: 15,
    color: c.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xxxl,
    paddingHorizontal: Spacing.md,
  },
  pointsSection: {
    width: '100%',
  },
  pointsSectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textTertiary,
    letterSpacing: 1.5,
    marginBottom: Spacing.lg,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  pointIcon: {
    fontSize: 18,
    marginTop: 1,
  },
  pointText: {
    fontSize: 14,
    color: c.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.lg,
    gap: 10,
  },
  primaryButton: {
    backgroundColor: c.accent,
    borderRadius: BorderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textPrimary,
  },
  secondaryButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    color: c.textTertiary,
  },
  // Loading state
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60,
  },
  loadingEmoji: {
    fontSize: 56,
    marginBottom: Spacing.xl,
  },
  loadingSpinner: {
    marginBottom: Spacing.lg,
  },
  loadingText: {
    fontSize: 16,
    color: c.textSecondary,
    fontWeight: '500',
  },
});
