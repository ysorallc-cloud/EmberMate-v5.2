// ============================================================================
// SLEEP BUCKET CONFIGURATION
// Configure sleep tracking in the Care Plan
// ============================================================================

import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { useCarePlanConfig } from '../../hooks/useCarePlanConfig';
import {
  BucketConfig,
  PRIORITY_OPTIONS,
} from '../../types/carePlanConfig';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SleepBucketScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    config,
    loading,
    toggleBucket,
    updateBucket,
  } = useCarePlanConfig();

  const sleepConfig = config?.sleep as BucketConfig | undefined;
  const enabled = sleepConfig?.enabled ?? false;
  const priority = sleepConfig?.priority ?? 'recommended';

  const handleToggleEnabled = useCallback(async (value: boolean) => {
    await toggleBucket('sleep', value);
  }, [toggleBucket]);

  const handleChangePriority = useCallback(async (newPriority: 'required' | 'recommended' | 'optional') => {
    await updateBucket('sleep', { priority: newPriority });
  }, [updateBucket]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerLabel}>SLEEP</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>Sleep</Text>
            <Text style={styles.subtitle}>
              Links rest quality to symptoms and energy.
            </Text>
          </View>

          {/* Enable Toggle */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Track Sleep</Text>
              <Text style={styles.settingDescription}>
                Enable sleep tracking in your Care Plan
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={handleToggleEnabled}
              trackColor={{ false: colors.glassStrong, true: colors.accent }}
              thumbColor={enabled ? colors.textPrimary : colors.switchThumbOff}
              ios_backgroundColor={colors.glassStrong}
              accessibilityLabel="Track Sleep"
              accessibilityRole="switch"
              accessibilityState={{ checked: enabled }}
            />
          </View>

          {enabled && (
            <>
              {/* Priority Selector */}
              <Text style={styles.sectionLabel}>PRIORITY</Text>
              <View style={styles.priorityContainer}>
                {PRIORITY_OPTIONS.map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.priorityOption,
                      priority === option.value && styles.priorityOptionSelected,
                    ]}
                    onPress={() => handleChangePriority(option.value)}
                    activeOpacity={0.7}
                    accessibilityLabel={`${option.label} priority: ${option.description}`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: priority === option.value }}
                  >
                    <Text style={[
                      styles.priorityLabel,
                      priority === option.value && styles.priorityLabelSelected,
                    ]}>
                      {option.label}
                    </Text>
                    <Text style={styles.priorityDescription}>{option.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* What to Track */}
              <Text style={styles.sectionLabel}>WHAT TO TRACK</Text>
              <View style={styles.featuresContainer}>
                <View style={styles.featureItem}>
                  <Text style={styles.featureEmoji}>🛏️</Text>
                  <View style={styles.featureInfo}>
                    <Text style={styles.featureLabel}>Sleep Duration</Text>
                    <Text style={styles.featureDescription}>
                      How many hours of sleep
                    </Text>
                  </View>
                  <View style={styles.checkboxActive}>
                    <Text style={styles.checkmark}>✓</Text>
                  </View>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.featureEmoji}>⭐</Text>
                  <View style={styles.featureInfo}>
                    <Text style={styles.featureLabel}>Sleep Quality</Text>
                    <Text style={styles.featureDescription}>
                      Rate how restful it was
                    </Text>
                  </View>
                  <View style={styles.checkboxActive}>
                    <Text style={styles.checkmark}>✓</Text>
                  </View>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.featureEmoji}>📝</Text>
                  <View style={styles.featureInfo}>
                    <Text style={styles.featureLabel}>Sleep Notes</Text>
                    <Text style={styles.featureDescription}>
                      Optional notes about the night
                    </Text>
                  </View>
                  <View style={styles.checkboxActive}>
                    <Text style={styles.checkmark}>✓</Text>
                  </View>
                </View>
              </View>

              {/* Info Card */}
              <View style={styles.infoCard}>
                <Text style={styles.infoEmoji}>💡</Text>
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>Morning check-in</Text>
                  <Text style={styles.infoText}>
                    Sleep is best logged in the morning when you wake up.
                    It only takes a moment to record how you slept.
                  </Text>
                </View>
              </View>

              {/* Notifications Setting */}
              <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Sleep Log Reminder</Text>
                  <Text style={styles.settingDescription}>
                    Get reminded each morning to log sleep
                  </Text>
                </View>
                <Switch
                  value={sleepConfig?.notificationsEnabled ?? false}
                  onValueChange={(value) => updateBucket('sleep', { notificationsEnabled: value })}
                  trackColor={{ false: colors.glassStrong, true: colors.accent }}
                  thumbColor={(sleepConfig?.notificationsEnabled ?? false) ? colors.textPrimary : colors.switchThumbOff}
                  ios_backgroundColor={colors.glassStrong}
                  accessibilityLabel="Sleep Log Reminder"
                  accessibilityRole="switch"
                  accessibilityState={{ checked: sleepConfig?.notificationsEnabled ?? false }}
                />
              </View>
            </>
          )}

          {/* Bottom spacing */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  gradient: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Platform.OS === 'android' ? 20 : 0,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    backgroundColor: c.backgroundElevated,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: c.textPrimary,
  },
  headerLabel: {
    fontSize: 11,
    color: c.textMuted,
    letterSpacing: 1,
    fontWeight: '600',
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 40,
  },

  // Title
  titleSection: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '300',
    color: c.textPrimary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    color: c.textSecondary,
    lineHeight: 22,
  },

  // Section Labels
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textHalf,
    letterSpacing: 1,
    marginBottom: Spacing.md,
    marginTop: Spacing.xl,
  },

  // Setting Row
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: c.glassFaint,
    borderWidth: 1,
    borderColor: c.glassActive,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  settingInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: c.textSecondary,
  },

  // Priority
  priorityContainer: {
    gap: Spacing.sm,
  },
  priorityOption: {
    backgroundColor: c.glassFaint,
    borderWidth: 1,
    borderColor: c.glassActive,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  priorityOptionSelected: {
    borderColor: c.accent,
    backgroundColor: c.sageFaint,
  },
  priorityLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 2,
  },
  priorityLabelSelected: {
    color: c.accent,
  },
  priorityDescription: {
    fontSize: 13,
    color: c.textSecondary,
  },

  // Features
  featuresContainer: {
    gap: Spacing.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.glassFaint,
    borderWidth: 1,
    borderColor: c.glassActive,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  featureEmoji: {
    fontSize: 24,
  },
  featureInfo: {
    flex: 1,
  },
  featureLabel: {
    fontSize: 15,
    color: c.textPrimary,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 13,
    color: c.textSecondary,
  },
  checkboxActive: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: c.background,
    fontSize: 14,
    fontWeight: '700',
  },

  // Info Card
  infoCard: {
    flexDirection: 'row',
    backgroundColor: c.purpleMuted,
    borderWidth: 1,
    borderColor: c.purpleStrong,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  infoEmoji: {
    fontSize: 24,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: c.purpleBright,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 18,
  },
});
