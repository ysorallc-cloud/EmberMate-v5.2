// ============================================================================
// WATER BUCKET CONFIGURATION
// Configure hydration tracking in the Care Plan
// ============================================================================

import React, { useCallback, useState, useMemo } from 'react';
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
  WaterBucketConfig,
  PRIORITY_OPTIONS,
  WaterReminderFrequency,
  WATER_REMINDER_OPTIONS,
} from '../../types/carePlanConfig';

// ============================================================================
// GOAL SELECTOR COMPONENT
// ============================================================================

interface GoalOption {
  value: number;
  label: string;
}

const GOAL_OPTIONS: GoalOption[] = [
  { value: 4, label: '4 glasses' },
  { value: 6, label: '6 glasses' },
  { value: 8, label: '8 glasses' },
  { value: 10, label: '10 glasses' },
  { value: 12, label: '12 glasses' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function WaterBucketScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    config,
    loading,
    toggleBucket,
    updateBucket,
  } = useCarePlanConfig();

  const waterConfig = config?.water as WaterBucketConfig | undefined;
  const enabled = waterConfig?.enabled ?? false;
  const priority = waterConfig?.priority ?? 'recommended';
  const dailyGoalGlasses = waterConfig?.dailyGoalGlasses ?? 8;
  const units = waterConfig?.units ?? 'glasses';
  const reminderFrequency = waterConfig?.reminderFrequency ?? 'none';

  const handleToggleEnabled = useCallback(async (value: boolean) => {
    await toggleBucket('water', value);
  }, [toggleBucket]);

  const handleChangePriority = useCallback(async (newPriority: 'required' | 'recommended' | 'optional') => {
    await updateBucket('water', { priority: newPriority });
  }, [updateBucket]);

  const handleChangeGoal = useCallback(async (goal: number) => {
    await updateBucket('water', { dailyGoalGlasses: goal } as Partial<WaterBucketConfig>);
  }, [updateBucket]);

  const handleChangeUnits = useCallback(async (newUnits: string) => {
    await updateBucket('water', { units: newUnits });
  }, [updateBucket]);

  const handleChangeReminderFrequency = useCallback(async (frequency: WaterReminderFrequency) => {
    await updateBucket('water', { reminderFrequency: frequency } as Partial<WaterBucketConfig>);
  }, [updateBucket]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} accessibilityLabel="Go back" accessibilityRole="button">
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerLabel}>WATER</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>Water</Text>
            <Text style={styles.subtitle}>
              Supports hydration goals and explains fatigue or headaches.
            </Text>
          </View>

          {/* Enable Toggle */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Track Water Intake</Text>
              <Text style={styles.settingDescription}>
                Enable hydration tracking in your Care Plan
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={handleToggleEnabled}
              trackColor={{ false: colors.glassStrong, true: colors.accent }}
              thumbColor={enabled ? colors.textPrimary : colors.switchThumbOff}
              ios_backgroundColor={colors.glassStrong}
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
                    accessibilityLabel={`${option.label} priority, ${option.description}`}
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

              {/* Daily Goal */}
              <Text style={styles.sectionLabel}>DAILY GOAL</Text>
              <View style={styles.goalContainer}>
                <View style={styles.goalDisplay}>
                  <Text style={styles.goalEmoji}>💧</Text>
                  <Text style={styles.goalValue}>{dailyGoalGlasses}</Text>
                  <Text style={styles.goalUnits}>{units}</Text>
                </View>
                <View style={styles.goalOptions}>
                  {GOAL_OPTIONS.map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.goalOption,
                        dailyGoalGlasses === option.value && styles.goalOptionSelected,
                      ]}
                      onPress={() => handleChangeGoal(option.value)}
                      activeOpacity={0.7}
                      accessibilityLabel={`${option.label} daily goal`}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: dailyGoalGlasses === option.value }}
                    >
                      <Text style={[
                        styles.goalOptionLabel,
                        dailyGoalGlasses === option.value && styles.goalOptionLabelSelected,
                      ]}>
                        {option.value}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.goalHint}>
                  About {Math.round(dailyGoalGlasses * 8)} oz or {Math.round(dailyGoalGlasses * 0.24)} liters
                </Text>
              </View>

              {/* Units */}
              <Text style={styles.sectionLabel}>UNITS</Text>
              <View style={styles.unitsContainer}>
                {[
                  { value: 'glasses', label: 'Glasses', subtext: '~8 oz each' },
                  { value: 'oz', label: 'Ounces', subtext: 'Fluid oz' },
                  { value: 'ml', label: 'Milliliters', subtext: 'Metric' },
                ].map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.unitOption,
                      units === option.value && styles.unitOptionSelected,
                    ]}
                    onPress={() => handleChangeUnits(option.value)}
                    activeOpacity={0.7}
                    accessibilityLabel={`${option.label}, ${option.subtext}`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: units === option.value }}
                  >
                    <Text style={[
                      styles.unitLabel,
                      units === option.value && styles.unitLabelSelected,
                    ]}>
                      {option.label}
                    </Text>
                    <Text style={styles.unitSubtext}>{option.subtext}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Reminder Frequency */}
              <Text style={styles.sectionLabel}>REMINDER FREQUENCY</Text>
              <Text style={styles.sectionDescription}>
                Get prompts to drink water throughout the day
              </Text>
              <View style={styles.reminderContainer}>
                {WATER_REMINDER_OPTIONS.filter(o => o.value !== 'custom').map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.reminderOption,
                      reminderFrequency === option.value && styles.reminderOptionSelected,
                    ]}
                    onPress={() => handleChangeReminderFrequency(option.value)}
                    activeOpacity={0.7}
                    accessibilityLabel={`${option.label}, ${option.description}`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: reminderFrequency === option.value }}
                  >
                    <Text style={[
                      styles.reminderLabel,
                      reminderFrequency === option.value && styles.reminderLabelSelected,
                    ]}>
                      {option.label}
                    </Text>
                    <Text style={styles.reminderDescription}>{option.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Notifications Setting */}
              <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Hydration Reminders</Text>
                  <Text style={styles.settingDescription}>
                    Get periodic reminders to drink water
                  </Text>
                </View>
                <Switch
                  value={waterConfig?.notificationsEnabled ?? false}
                  onValueChange={(value) => updateBucket('water', { notificationsEnabled: value })}
                  trackColor={{ false: colors.glassStrong, true: colors.accent }}
                  thumbColor={(waterConfig?.notificationsEnabled ?? false) ? colors.textPrimary : colors.switchThumbOff}
                  ios_backgroundColor={colors.glassStrong}
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

  // Goal
  goalContainer: {
    backgroundColor: c.glassFaint,
    borderWidth: 1,
    borderColor: c.glassActive,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  goalDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  goalEmoji: {
    fontSize: 32,
  },
  goalValue: {
    fontSize: 48,
    fontWeight: '300',
    color: c.accent,
  },
  goalUnits: {
    fontSize: 18,
    color: c.textSecondary,
    marginTop: 12,
  },
  goalOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  goalOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginHorizontal: 4,
    backgroundColor: c.glassFaint,
    borderWidth: 1,
    borderColor: c.glassActive,
    borderRadius: BorderRadius.sm,
  },
  goalOptionSelected: {
    borderColor: c.accent,
    backgroundColor: c.sageBorder,
  },
  goalOptionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: c.textSecondary,
  },
  goalOptionLabelSelected: {
    color: c.accent,
  },
  goalHint: {
    textAlign: 'center',
    fontSize: 12,
    color: c.textMuted,
  },

  // Units
  unitsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  unitOption: {
    flex: 1,
    backgroundColor: c.glassFaint,
    borderWidth: 1,
    borderColor: c.glassActive,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  unitOptionSelected: {
    borderColor: c.accent,
    backgroundColor: c.sageFaint,
  },
  unitLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 2,
  },
  unitLabelSelected: {
    color: c.accent,
  },
  unitSubtext: {
    fontSize: 11,
    color: c.textMuted,
  },

  // Reminder Frequency
  sectionDescription: {
    fontSize: 13,
    color: c.textSecondary,
    marginBottom: Spacing.md,
    marginTop: -Spacing.sm,
  },
  reminderContainer: {
    gap: Spacing.sm,
  },
  reminderOption: {
    backgroundColor: c.glassFaint,
    borderWidth: 1,
    borderColor: c.glassActive,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  reminderOptionSelected: {
    borderColor: c.accent,
    backgroundColor: c.sageFaint,
  },
  reminderLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 2,
  },
  reminderLabelSelected: {
    color: c.accent,
  },
  reminderDescription: {
    fontSize: 13,
    color: c.textSecondary,
  },
});
