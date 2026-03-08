// ============================================================================
// ACTIVITY BUCKET CONFIGURATION
// Configure activity tracking in the Care Plan
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

export default function ActivityBucketScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    config,
    loading,
    toggleBucket,
    updateBucket,
  } = useCarePlanConfig();

  const activityConfig = config?.activity as BucketConfig | undefined;
  const enabled = activityConfig?.enabled ?? false;
  const priority = activityConfig?.priority ?? 'optional';

  const handleToggleEnabled = useCallback(async (value: boolean) => {
    await toggleBucket('activity', value);
  }, [toggleBucket]);

  const handleChangePriority = useCallback(async (newPriority: 'required' | 'recommended' | 'optional') => {
    await updateBucket('activity', { priority: newPriority });
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
          <Text style={styles.headerLabel}>ACTIVITY</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>Activity</Text>
            <Text style={styles.subtitle}>
              Shows how movement connects to energy, mood, and overall wellness.
            </Text>
          </View>

          {/* Enable Toggle */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Track Activity</Text>
              <Text style={styles.settingDescription}>
                Enable activity tracking in your Care Plan
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={handleToggleEnabled}
              trackColor={{ false: colors.glassStrong, true: colors.accent }}
              thumbColor={enabled ? colors.textPrimary : colors.switchThumbOff}
              ios_backgroundColor={colors.glassStrong}
              accessibilityLabel="Track Activity"
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

              {/* Activity Types */}
              <Text style={styles.sectionLabel}>ACTIVITY TYPES</Text>
              <View style={styles.activitiesGrid}>
                {[
                  { emoji: '🚶', label: 'Walking', description: 'Daily walks and steps' },
                  { emoji: '🏃', label: 'Exercise', description: 'Workouts and gym sessions' },
                  { emoji: '🧘', label: 'Stretching', description: 'Yoga and flexibility' },
                  { emoji: '🏊', label: 'Swimming', description: 'Pool or water activities' },
                  { emoji: '🚴', label: 'Cycling', description: 'Bike rides' },
                  { emoji: '🧹', label: 'Housework', description: 'Cleaning and chores' },
                ].map(activity => (
                  <View key={activity.label} style={styles.activityItem}>
                    <Text style={styles.activityEmoji}>{activity.emoji}</Text>
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityLabel}>{activity.label}</Text>
                      <Text style={styles.activityDescription}>{activity.description}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Info Card */}
              <View style={styles.infoCard}>
                <Text style={styles.infoEmoji}>💡</Text>
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>Every bit counts</Text>
                  <Text style={styles.infoText}>
                    Activity doesn't have to be intense exercise. Walking around
                    the house, doing chores, or gentle stretching all contribute
                    to overall wellness and can be tracked here.
                  </Text>
                </View>
              </View>

              {/* Notifications Setting */}
              <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Activity Reminders</Text>
                  <Text style={styles.settingDescription}>
                    Get gentle reminders to move or log activity
                  </Text>
                </View>
                <Switch
                  value={activityConfig?.notificationsEnabled ?? false}
                  onValueChange={(value) => updateBucket('activity', { notificationsEnabled: value })}
                  trackColor={{ false: colors.glassStrong, true: colors.accent }}
                  thumbColor={(activityConfig?.notificationsEnabled ?? false) ? colors.textPrimary : colors.switchThumbOff}
                  ios_backgroundColor={colors.glassStrong}
                  accessibilityLabel="Activity Reminders"
                  accessibilityRole="switch"
                  accessibilityState={{ checked: activityConfig?.notificationsEnabled ?? false }}
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

  // Activities Grid
  activitiesGrid: {
    gap: Spacing.sm,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.glassFaint,
    borderWidth: 1,
    borderColor: c.glassActive,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  activityEmoji: {
    fontSize: 24,
  },
  activityInfo: {
    flex: 1,
  },
  activityLabel: {
    fontSize: 15,
    color: c.textPrimary,
    marginBottom: 2,
  },
  activityDescription: {
    fontSize: 13,
    color: c.textSecondary,
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
