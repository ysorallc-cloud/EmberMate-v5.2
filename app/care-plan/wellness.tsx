// ============================================================================
// WELLNESS CHECK CONFIGURATION
// Configure morning and evening wellness check fields
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
import { useWellnessSettings } from '../../hooks/useWellnessSettings';

// ============================================================================
// FIELD METADATA
// ============================================================================

const MORNING_CORE_FIELDS = [
  { key: 'sleep', label: 'Sleep Quality' },
  { key: 'mood', label: 'Mood' },
  { key: 'energy', label: 'Energy Level' },
];

const MORNING_OPTIONAL_FIELDS = [
  { key: 'orientation', label: 'Orientation', description: 'Alert & oriented, confused, disoriented' },
  { key: 'decisionMaking', label: 'Decision Making', description: 'Own decisions, needs guidance, unable' },
];

const EVENING_CORE_FIELDS = [
  { key: 'mood', label: 'Mood' },
  { key: 'meals', label: 'Meals Tracked' },
  { key: 'dayRating', label: 'Day Rating' },
  { key: 'notes', label: 'Highlights & Concerns' },
];

const EVENING_OPTIONAL_FIELDS = [
  { key: 'painLevel', label: 'Pain Level', description: 'None, mild, moderate, severe' },
  { key: 'alertness', label: 'Alertness', description: 'Alert, confused, drowsy, unresponsive' },
  { key: 'bowelMovement', label: 'Bowel Movement', description: 'Yes, no, unknown' },
  { key: 'bathingStatus', label: 'Bathing Status', description: 'Independent, partial/full assist' },
  { key: 'mobilityStatus', label: 'Mobility Status', description: 'Independent, walker, cane, wheelchair' },
];

const MORNING_TIME_PRESETS = ['06:00', '07:00', '08:00', '09:00'];
const EVENING_TIME_PRESETS = ['19:00', '20:00', '21:00', '22:00'];

function formatTime(time: string): string {
  const [h, m] = time.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display} ${ampm}`;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function WellnessConfigScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { settings, updateSettings } = useWellnessSettings();

  const handleTimeChange = useCallback(async (period: 'morning' | 'evening', time: string) => {
    await updateSettings({
      ...settings,
      [period]: { ...settings[period], time },
    });
  }, [settings, updateSettings]);

  const handleToggleOptional = useCallback(async (period: 'morning' | 'evening', key: string, value: boolean) => {
    await updateSettings({
      ...settings,
      [period]: {
        ...settings[period],
        optionalChecks: {
          ...settings[period].optionalChecks,
          [key]: value,
        },
      },
    });
  }, [settings, updateSettings]);

  const handleToggleReminder = useCallback(async (period: 'morning' | 'evening', value: boolean) => {
    await updateSettings({
      ...settings,
      [period]: { ...settings[period], reminderEnabled: value },
    });
  }, [settings, updateSettings]);

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
          <Text style={styles.headerLabel}>WELLNESS</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>Wellness Checks</Text>
            <Text style={styles.subtitle}>
              Configure your daily morning and evening check-ins.
            </Text>
          </View>

          {/* ============================================================ */}
          {/* MORNING CHECK */}
          {/* ============================================================ */}
          <Text style={styles.sectionLabel}>MORNING CHECK</Text>

          {/* Time Selector */}
          <View style={styles.timeRow}>
            {MORNING_TIME_PRESETS.map((time) => (
              <TouchableOpacity
                key={time}
                style={[
                  styles.timeChip,
                  settings.morning.time === time && styles.timeChipSelected,
                ]}
                onPress={() => handleTimeChange('morning', time)}
                activeOpacity={0.7}
                accessibilityLabel={`Morning check time ${formatTime(time)}`}
                accessibilityRole="radio"
                accessibilityState={{ selected: settings.morning.time === time }}
              >
                <Text style={[
                  styles.timeChipText,
                  settings.morning.time === time && styles.timeChipTextSelected,
                ]}>
                  {formatTime(time)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Core Fields */}
          {MORNING_CORE_FIELDS.map((field) => (
            <View key={field.key} style={styles.coreRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>{field.label}</Text>
              </View>
              <View style={styles.coreBadge}>
                <Text style={styles.coreBadgeText}>Core</Text>
              </View>
            </View>
          ))}

          {/* Optional Fields */}
          {MORNING_OPTIONAL_FIELDS.map((field) => (
            <View key={field.key} style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>{field.label}</Text>
                <Text style={styles.settingDescription}>{field.description}</Text>
              </View>
              <Switch
                value={settings.morning.optionalChecks[field.key] ?? false}
                onValueChange={(value) => handleToggleOptional('morning', field.key, value)}
                trackColor={{ false: colors.glassStrong, true: colors.accent }}
                thumbColor={(settings.morning.optionalChecks[field.key] ?? false) ? colors.textPrimary : colors.switchThumbOff}
                ios_backgroundColor={colors.glassStrong}
                accessibilityLabel={`Morning ${field.label}`}
                accessibilityRole="switch"
                accessibilityState={{ checked: settings.morning.optionalChecks[field.key] ?? false }}
              />
            </View>
          ))}

          {/* Morning Reminder */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Morning Reminder</Text>
              <Text style={styles.settingDescription}>Push notification at check-in time</Text>
            </View>
            <Switch
              value={settings.morning.reminderEnabled}
              onValueChange={(value) => handleToggleReminder('morning', value)}
              trackColor={{ false: colors.glassStrong, true: colors.accent }}
              thumbColor={settings.morning.reminderEnabled ? colors.textPrimary : colors.switchThumbOff}
              ios_backgroundColor={colors.glassStrong}
              accessibilityLabel="Morning Reminder"
              accessibilityRole="switch"
              accessibilityState={{ checked: settings.morning.reminderEnabled }}
            />
          </View>

          {/* ============================================================ */}
          {/* EVENING CHECK */}
          {/* ============================================================ */}
          <Text style={styles.sectionLabel}>EVENING CHECK</Text>

          {/* Time Selector */}
          <View style={styles.timeRow}>
            {EVENING_TIME_PRESETS.map((time) => (
              <TouchableOpacity
                key={time}
                style={[
                  styles.timeChip,
                  settings.evening.time === time && styles.timeChipSelected,
                ]}
                onPress={() => handleTimeChange('evening', time)}
                activeOpacity={0.7}
                accessibilityLabel={`Evening check time ${formatTime(time)}`}
                accessibilityRole="radio"
                accessibilityState={{ selected: settings.evening.time === time }}
              >
                <Text style={[
                  styles.timeChipText,
                  settings.evening.time === time && styles.timeChipTextSelected,
                ]}>
                  {formatTime(time)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Core Fields */}
          {EVENING_CORE_FIELDS.map((field) => (
            <View key={field.key} style={styles.coreRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>{field.label}</Text>
              </View>
              <View style={styles.coreBadge}>
                <Text style={styles.coreBadgeText}>Core</Text>
              </View>
            </View>
          ))}

          {/* Optional Fields */}
          {EVENING_OPTIONAL_FIELDS.map((field) => (
            <View key={field.key} style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>{field.label}</Text>
                <Text style={styles.settingDescription}>{field.description}</Text>
              </View>
              <Switch
                value={settings.evening.optionalChecks[field.key] ?? false}
                onValueChange={(value) => handleToggleOptional('evening', field.key, value)}
                trackColor={{ false: colors.glassStrong, true: colors.accent }}
                thumbColor={(settings.evening.optionalChecks[field.key] ?? false) ? colors.textPrimary : colors.switchThumbOff}
                ios_backgroundColor={colors.glassStrong}
                accessibilityLabel={`Evening ${field.label}`}
                accessibilityRole="switch"
                accessibilityState={{ checked: settings.evening.optionalChecks[field.key] ?? false }}
              />
            </View>
          ))}

          {/* Evening Reminder */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Evening Reminder</Text>
              <Text style={styles.settingDescription}>Push notification at check-in time</Text>
            </View>
            <Switch
              value={settings.evening.reminderEnabled}
              onValueChange={(value) => handleToggleReminder('evening', value)}
              trackColor={{ false: colors.glassStrong, true: colors.accent }}
              thumbColor={settings.evening.reminderEnabled ? colors.textPrimary : colors.switchThumbOff}
              ios_backgroundColor={colors.glassStrong}
              accessibilityLabel="Evening Reminder"
              accessibilityRole="switch"
              accessibilityState={{ checked: settings.evening.reminderEnabled }}
            />
          </View>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <Text style={styles.infoEmoji}>💡</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>About wellness checks</Text>
              <Text style={styles.infoText}>
                Morning and evening check-ins are always active. Core fields appear every
                time. Toggle optional fields to track additional care details like
                orientation, pain, and mobility.
              </Text>
            </View>
          </View>

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

  // Time row
  timeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  timeChip: {
    flex: 1,
    paddingVertical: Spacing.sm,
    backgroundColor: c.glassFaint,
    borderWidth: 1,
    borderColor: c.glassActive,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  timeChipSelected: {
    borderColor: c.accent,
    backgroundColor: c.sageFaint,
  },
  timeChipText: {
    fontSize: 13,
    color: c.textSecondary,
    fontWeight: '500',
  },
  timeChipTextSelected: {
    color: c.accent,
  },

  // Core row (non-toggleable)
  coreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.glassHover,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  coreBadge: {
    backgroundColor: c.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  coreBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textMuted,
    letterSpacing: 0.5,
  },

  // Setting Row (toggleable)
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
