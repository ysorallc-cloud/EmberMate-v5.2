// ============================================================================
// VITALS BUCKET CONFIGURATION
// Configure vitals tracking in the Care Plan
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
  VitalsBucketConfig,
  VitalType,
  VITAL_TYPE_OPTIONS,
  PRIORITY_OPTIONS,
} from '../../types/carePlanConfig';

// ============================================================================
// VITAL TYPE ITEM COMPONENT
// ============================================================================

interface VitalTypeItemProps {
  vital: { value: VitalType; label: string; emoji: string };
  selected: boolean;
  onToggle: () => void;
}

function VitalTypeItem({ vital, selected, onToggle }: VitalTypeItemProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <TouchableOpacity
      style={[styles.vitalItem, selected && styles.vitalItemSelected]}
      onPress={onToggle}
      activeOpacity={0.7}
      accessibilityLabel={`${vital.label}, ${selected ? 'selected' : 'not selected'}`}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
    >
      <Text style={styles.vitalEmoji}>{vital.emoji}</Text>
      <Text style={[styles.vitalLabel, selected && styles.vitalLabelSelected]}>
        {vital.label}
      </Text>
      <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
        {selected && <Text style={styles.checkmark}>✓</Text>}
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function VitalsBucketScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    config,
    loading,
    toggleBucket,
    updateBucket,
  } = useCarePlanConfig();

  const vitalsConfig = config?.vitals as VitalsBucketConfig | undefined;
  const enabled = vitalsConfig?.enabled ?? false;
  const priority = vitalsConfig?.priority ?? 'recommended';
  const vitalTypes = vitalsConfig?.vitalTypes ?? ['bp', 'hr'];
  const frequency = vitalsConfig?.frequency ?? 'daily';

  const handleToggleEnabled = useCallback(async (value: boolean) => {
    await toggleBucket('vitals', value);
  }, [toggleBucket]);

  const handleChangePriority = useCallback(async (newPriority: 'required' | 'recommended' | 'optional') => {
    await updateBucket('vitals', { priority: newPriority });
  }, [updateBucket]);

  const handleToggleVitalType = useCallback(async (vitalType: VitalType) => {
    const currentTypes = vitalTypes || [];
    const newTypes = currentTypes.includes(vitalType)
      ? currentTypes.filter(t => t !== vitalType)
      : [...currentTypes, vitalType];

    // Ensure at least one vital type is selected
    if (newTypes.length > 0) {
      await updateBucket('vitals', { vitalTypes: newTypes } as Partial<VitalsBucketConfig>);
    }
  }, [vitalTypes, updateBucket]);

  const handleChangeFrequency = useCallback(async (newFrequency: 'daily' | 'weekly' | 'as_needed') => {
    await updateBucket('vitals', { frequency: newFrequency } as Partial<VitalsBucketConfig>);
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
          <Text style={styles.headerLabel}>VITALS</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>Vitals</Text>
            <Text style={styles.subtitle}>
              Makes trends visible over time, even when each reading seems normal.
            </Text>
          </View>

          {/* Enable Toggle */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Track Vitals</Text>
              <Text style={styles.settingDescription}>
                Enable vitals tracking in your Care Plan
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={handleToggleEnabled}
              trackColor={{ false: colors.glassStrong, true: colors.accent }}
              thumbColor={enabled ? colors.textPrimary : colors.switchThumbOff}
              ios_backgroundColor={colors.glassStrong}
              accessibilityLabel="Track Vitals"
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

              {/* Vital Types */}
              <Text style={styles.sectionLabel}>WHAT TO TRACK</Text>
              <View style={styles.vitalsGrid}>
                {VITAL_TYPE_OPTIONS.map(vital => (
                  <VitalTypeItem
                    key={vital.value}
                    vital={vital}
                    selected={vitalTypes.includes(vital.value)}
                    onToggle={() => handleToggleVitalType(vital.value)}
                  />
                ))}
              </View>

              {/* Frequency */}
              <Text style={styles.sectionLabel}>FREQUENCY</Text>
              <View style={styles.frequencyContainer}>
                {[
                  { value: 'daily', label: 'Daily', description: 'Check vitals every day' },
                  { value: 'weekly', label: 'Weekly', description: 'Check vitals once a week' },
                  { value: 'as_needed', label: 'As Needed', description: 'Log when symptoms arise' },
                ].map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.frequencyOption,
                      frequency === option.value && styles.frequencyOptionSelected,
                    ]}
                    onPress={() => handleChangeFrequency(option.value as 'daily' | 'weekly' | 'as_needed')}
                    activeOpacity={0.7}
                    accessibilityLabel={`${option.label} frequency, ${option.description}`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: frequency === option.value }}
                  >
                    <Text style={[
                      styles.frequencyLabel,
                      frequency === option.value && styles.frequencyLabelSelected,
                    ]}>
                      {option.label}
                    </Text>
                    <Text style={styles.frequencyDescription}>{option.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Notifications Setting */}
              <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Vitals Reminders</Text>
                  <Text style={styles.settingDescription}>
                    Get notified when it's time to check vitals
                  </Text>
                </View>
                <Switch
                  value={vitalsConfig?.notificationsEnabled ?? false}
                  onValueChange={(value) => updateBucket('vitals', { notificationsEnabled: value })}
                  trackColor={{ false: colors.glassStrong, true: colors.accent }}
                  thumbColor={(vitalsConfig?.notificationsEnabled ?? false) ? colors.textPrimary : colors.switchThumbOff}
                  ios_backgroundColor={colors.glassStrong}
                  accessibilityLabel="Vitals reminders"
                  accessibilityRole="switch"
                  accessibilityState={{ checked: vitalsConfig?.notificationsEnabled ?? false }}
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

  // Vitals Grid
  vitalsGrid: {
    gap: Spacing.sm,
  },
  vitalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.glassFaint,
    borderWidth: 1,
    borderColor: c.glassActive,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  vitalItemSelected: {
    borderColor: c.accent,
    backgroundColor: c.sageFaint,
  },
  vitalEmoji: {
    fontSize: 24,
  },
  vitalLabel: {
    flex: 1,
    fontSize: 15,
    color: c.textPrimary,
  },
  vitalLabelSelected: {
    color: c.accent,
    fontWeight: '500',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: c.textPlaceholder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: c.accent,
    borderColor: c.accent,
  },
  checkmark: {
    color: c.background,
    fontSize: 14,
    fontWeight: '700',
  },

  // Frequency
  frequencyContainer: {
    gap: Spacing.sm,
  },
  frequencyOption: {
    backgroundColor: c.glassFaint,
    borderWidth: 1,
    borderColor: c.glassActive,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  frequencyOptionSelected: {
    borderColor: c.accent,
    backgroundColor: c.sageFaint,
  },
  frequencyLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 2,
  },
  frequencyLabelSelected: {
    color: c.accent,
  },
  frequencyDescription: {
    fontSize: 13,
    color: c.textSecondary,
  },
});
