// ============================================================================
// BUCKET CARE PLAN PANEL
// Unified panel showing items from ALL enabled buckets grouped by time-of-day
// Replaces meds-only panels when multiple buckets are enabled
// ============================================================================

import React, { useMemo, useState } from 'react';
import { devLog } from '../../utils/devLog';
import { getTodayDateString } from '../../services/carePlanGenerator';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { navigate } from '../../lib/navigate';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { useCarePlanConfig } from '../../hooks/useCarePlanConfig';
import { useDailyCareInstances } from '../../hooks/useDailyCareInstances';
import {
  BucketType,
  BUCKET_META,
  TimeOfDay,
  TIME_OF_DAY_DEFAULTS,
  WaterBucketConfig,
  VitalsBucketConfig,
  MealsBucketConfig,
  MedsBucketConfig,
  generateWaterReminderTimes,
  formatTimeForDisplay,
} from '../../types/carePlanConfig';

// ============================================================================
// TYPES
// ============================================================================

interface ScheduleItem {
  id: string;
  bucket: BucketType;
  label: string;
  emoji: string;
  time: string; // HH:mm
  timeDisplay: string;
  timeOfDay: TimeOfDay;
  route: string;
  routeParams?: Record<string, string>;
  status: 'pending' | 'done' | 'partial';
  statusText: string;
  // For medications: link to instance
  instanceId?: string;
  medicationId?: string;
}

interface TimeGroup {
  timeOfDay: TimeOfDay;
  displayName: string;
  emoji: string;
  items: ScheduleItem[];
  completedCount: number;
  totalCount: number;
}

interface BucketCarePlanPanelProps {
  // Props can be extended as needed
}

// ============================================================================
// HELPERS
// ============================================================================

const TIME_OF_DAY_CONFIG: Record<TimeOfDay, { displayName: string; emoji: string; order: number }> = {
  morning: { displayName: 'Morning', emoji: '\u{1F305}', order: 0 },
  midday: { displayName: 'Midday', emoji: '\u{2600}\u{FE0F}', order: 1 },
  evening: { displayName: 'Evening', emoji: '\u{1F306}', order: 2 },
  night: { displayName: 'Night', emoji: '\u{1F319}', order: 3 },
  custom: { displayName: 'Other', emoji: '\u{1F4CB}', order: 4 },
};

function getTimeOfDayFromHHmm(time: string): TimeOfDay {
  const [hours] = time.split(':').map(Number);
  if (hours >= 5 && hours < 12) return 'morning';
  if (hours >= 12 && hours < 17) return 'midday';
  if (hours >= 17 && hours < 21) return 'evening';
  return 'night';
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

// Bucket config routes
const BUCKET_CONFIG_ROUTES: Record<BucketType, string> = {
  meds: '/medication-form',
  vitals: '/care-plan/vitals',
  meals: '/care-plan/meals',
  water: '/care-plan/water',
  sleep: '/care-plan/sleep',
  activity: '/care-plan/activity',
  wellness: '/log-morning-wellness',
  appointments: '/appointments',
};

// Placeholder config for unconfigured buckets
interface BucketPlaceholder {
  bucket: BucketType;
  title: string;
  subtitle: string;
  emoji: string;
  route: string;
}

export function BucketCarePlanPanel(_props: BucketCarePlanPanelProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { config, enabledBuckets, loading: configLoading } = useCarePlanConfig();
  const { state: instancesState, loading: instancesLoading } = useDailyCareInstances();

  const [expandedGroups, setExpandedGroups] = useState<Set<TimeOfDay>>(new Set(['morning', 'midday', 'evening']));

  // DEBUG: Log enabled buckets on render
  devLog('[BucketCarePlanPanel] enabledBuckets:', enabledBuckets);
  devLog('[BucketCarePlanPanel] config:', config ? Object.keys(config) : 'null');

  // Generate schedule items from all enabled buckets
  const { scheduleItems, timeGroups, stats, bucketsWithItems, placeholders } = useMemo(() => {
    if (!config || configLoading) {
      return { scheduleItems: [], timeGroups: [], stats: { total: 0, done: 0 }, bucketsWithItems: new Set<BucketType>(), placeholders: [] };
    }

    const items: ScheduleItem[] = [];
    const today = getTodayDateString();
    const bucketsWithItemsSet = new Set<BucketType>();

    // 1. MEDICATIONS - Use regimen instances if available, otherwise from config
    if (enabledBuckets.includes('meds')) {
      const medsConfig = config.meds as MedsBucketConfig;
      let addedMedItems = false;

      if (instancesState && instancesState.instances.length > 0) {
        // Use regimen-based instances
        const medInstances = instancesState.instances.filter(i => i.itemType === 'medication');
        for (const instance of medInstances) {
          const timeOfDay = getTimeOfDayFromHHmm(instance.scheduledTime.split('T')[1]?.substring(0, 5) || '08:00');
          items.push({
            id: `med-${instance.id}`,
            bucket: 'meds',
            label: instance.itemName,
            emoji: instance.itemEmoji || '\u{1F48A}',
            time: instance.scheduledTime,
            timeDisplay: formatTimeForDisplay(instance.scheduledTime),
            timeOfDay,
            route: '/log-medication-plan-item',
            routeParams: {
              medicationId: instance.carePlanItemId,
              instanceId: instance.id,
              scheduledTime: instance.scheduledTime,
              itemName: instance.itemName,
              itemDosage: instance.itemDosage || '',
            },
            status: instance.status === 'completed' ? 'done' : 'pending',
            statusText: instance.status === 'completed' ? '\u2713 Taken' : 'Tap to log',
            instanceId: instance.id,
            medicationId: instance.carePlanItemId,
          });
          addedMedItems = true;
        }
      } else if (medsConfig?.medications && medsConfig.medications.length > 0) {
        // Fallback to config-based meds (no regimen instances)
        for (const med of medsConfig.medications.filter(m => m.active)) {
          for (const tod of med.timesOfDay || ['morning']) {
            const time = med.scheduledTimeHHmm || TIME_OF_DAY_DEFAULTS[tod] || '08:00';
            items.push({
              id: `med-${med.id}-${tod}`,
              bucket: 'meds',
              label: `${med.name} ${med.dosage}`,
              emoji: '\u{1F48A}',
              time,
              timeDisplay: formatTimeForDisplay(time),
              timeOfDay: tod,
              route: '/medication-confirm',
              routeParams: { medicationId: med.id },
              status: 'pending', // Would need log lookup for actual status
              statusText: 'Tap to log',
              medicationId: med.id,
            });
            addedMedItems = true;
          }
        }
      }
      if (addedMedItems) bucketsWithItemsSet.add('meds');
    }

    // 2. VITALS - Generate prompts based on timesOfDay
    if (enabledBuckets.includes('vitals')) {
      const vitalsConfig = config.vitals as VitalsBucketConfig;
      const times = vitalsConfig?.timesOfDay;
      const vitalTypes = vitalsConfig?.vitalTypes;

      // Only add items if vitals is configured (has times or types set)
      if (times && times.length > 0 && vitalTypes && vitalTypes.length > 0) {
        for (const tod of times) {
          const time = TIME_OF_DAY_DEFAULTS[tod] || '08:00';
          items.push({
            id: `vitals-${tod}`,
            bucket: 'vitals',
            label: `Check vitals (${vitalTypes.map(v => v.toUpperCase()).join(', ')})`,
            emoji: '\u{1F4CA}',
            time,
            timeDisplay: formatTimeForDisplay(time),
            timeOfDay: tod,
            route: '/quick-log?expand=vitals',
            routeParams: { preselectedTypes: vitalTypes.join(',') },
            status: 'pending',
            statusText: 'Tap to log',
          });
        }
        bucketsWithItemsSet.add('vitals');
      }
    }

    // 3. MEALS - Generate prompts for each meal time
    if (enabledBuckets.includes('meals')) {
      const mealsConfig = config.meals as MealsBucketConfig;
      const mealTimes = mealsConfig?.timesOfDay;

      const mealNames: Record<TimeOfDay, string> = {
        morning: 'Breakfast',
        midday: 'Lunch',
        evening: 'Dinner',
        night: 'Snack',
        custom: 'Meal',
      };

      // Only add items if meals is configured (has times set)
      if (mealTimes && mealTimes.length > 0) {
        for (const tod of mealTimes) {
          const time = TIME_OF_DAY_DEFAULTS[tod] || '12:00';
          items.push({
            id: `meal-${tod}`,
            bucket: 'meals',
            label: mealNames[tod] || 'Meal',
            emoji: '\u{1F37D}\u{FE0F}',
            time,
            timeDisplay: formatTimeForDisplay(time),
            timeOfDay: tod,
            route: '/log-meal',
            routeParams: { mealType: tod },
            status: 'pending',
            statusText: 'Tap to log',
          });
        }
        bucketsWithItemsSet.add('meals');
      }
    }

    // 4. WATER - Generate prompts based on reminder frequency
    if (enabledBuckets.includes('water')) {
      const waterConfig = config.water as WaterBucketConfig;
      const frequency = waterConfig?.reminderFrequency || 'none';
      const dailyGoal = waterConfig?.dailyGoalGlasses;
      const reminderTimes = generateWaterReminderTimes(frequency, waterConfig?.reminderTimes);

      // Only show items if water has a daily goal set (considered "configured")
      if (dailyGoal && dailyGoal > 0) {
        if (reminderTimes.length > 0) {
          for (const time of reminderTimes) {
            const tod = getTimeOfDayFromHHmm(time);
            items.push({
              id: `water-${time}`,
              bucket: 'water',
              label: 'Drink water',
              emoji: '\u{1F4A7}',
              time,
              timeDisplay: formatTimeForDisplay(time),
              timeOfDay: tod,
              route: '/quick-log?expand=hydration',
              routeParams: { quickLog: 'true' },
              status: 'pending',
              statusText: `Goal: ${dailyGoal} ${waterConfig?.units || 'glasses'}`,
            });
          }
        } else {
          // Show single water entry if no reminders but goal is set
          items.push({
            id: 'water-daily',
            bucket: 'water',
            label: 'Water intake',
            emoji: '\u{1F4A7}',
            time: '12:00',
            timeDisplay: 'Anytime',
            timeOfDay: 'midday',
            route: '/quick-log?expand=hydration',
            status: 'pending',
            statusText: `Goal: ${dailyGoal} ${waterConfig?.units || 'glasses'}`,
          });
        }
        bucketsWithItemsSet.add('water');
      }
    }

    // 5. Generate placeholders for enabled buckets that have no items
    const placeholdersList: BucketPlaceholder[] = [];
    for (const bucket of enabledBuckets) {
      if (!bucketsWithItemsSet.has(bucket)) {
        const meta = BUCKET_META[bucket];
        placeholdersList.push({
          bucket,
          title: `Set up ${meta.name}`,
          subtitle: 'Not configured yet',
          emoji: meta.emoji,
          route: BUCKET_CONFIG_ROUTES[bucket],
        });
      }
    }

    // Sort items by time
    items.sort((a, b) => a.time.localeCompare(b.time));

    // Group by time of day
    const groupsMap = new Map<TimeOfDay, ScheduleItem[]>();
    for (const item of items) {
      const existing = groupsMap.get(item.timeOfDay) || [];
      existing.push(item);
      groupsMap.set(item.timeOfDay, existing);
    }

    // Convert to array and sort by time of day order
    const groups: TimeGroup[] = Array.from(groupsMap.entries())
      .map(([tod, groupItems]) => ({
        timeOfDay: tod,
        displayName: TIME_OF_DAY_CONFIG[tod].displayName,
        emoji: TIME_OF_DAY_CONFIG[tod].emoji,
        items: groupItems,
        completedCount: groupItems.filter(i => i.status === 'done').length,
        totalCount: groupItems.length,
      }))
      .sort((a, b) => TIME_OF_DAY_CONFIG[a.timeOfDay].order - TIME_OF_DAY_CONFIG[b.timeOfDay].order);

    const totalDone = items.filter(i => i.status === 'done').length;

    return {
      scheduleItems: items,
      timeGroups: groups,
      stats: { total: items.length, done: totalDone },
      bucketsWithItems: bucketsWithItemsSet,
      placeholders: placeholdersList,
    };
  }, [config, configLoading, enabledBuckets, instancesState]);

  const toggleGroup = (tod: TimeOfDay) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(tod)) {
        next.delete(tod);
      } else {
        next.add(tod);
      }
      return next;
    });
  };

  const handleItemPress = (item: ScheduleItem) => {
    if (item.routeParams) {
      navigate({ pathname: item.route, params: item.routeParams });
    } else {
      navigate(item.route);
    }
  };

  // Empty state - only if no buckets enabled at all
  if (!configLoading && enabledBuckets.length === 0) {
    return (
      <View style={styles.emptyPanel}>
        <Text style={styles.emptyTitle}>No Care Plan set up</Text>
        <Text style={styles.emptySubtitle}>
          Enable tracking categories to see your daily schedule
        </Text>
        <TouchableOpacity
          style={styles.setupButton}
          onPress={() => navigate('/care-plan')}
          accessibilityLabel="Set up Care Plan"
          accessibilityRole="button"
        >
          <Text style={styles.setupButtonText}>Set up Care Plan</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Care Plan</Text>
          <Text style={styles.subtitle}>
            {stats.total > 0 ? `${stats.done}/${stats.total} completed` : 'Configure your buckets below'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigate('/care-plan')}
            accessibilityLabel="Care Plan settings"
            accessibilityRole="button"
          >
            <Text style={styles.settingsIcon}>{'\u2699\uFE0F'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Enabled Buckets Strip */}
      <View style={styles.bucketChipsContainer}>
        {enabledBuckets.map(bucket => {
          const meta = BUCKET_META[bucket];
          const hasItems = bucketsWithItems.has(bucket);
          return (
            <TouchableOpacity
              key={bucket}
              style={[styles.bucketChip, hasItems && styles.bucketChipConfigured]}
              onPress={() => navigate(BUCKET_CONFIG_ROUTES[bucket])}
              activeOpacity={0.7}
              accessibilityLabel={`${meta.name}${hasItems ? '' : ', needs setup'}`}
              accessibilityRole="button"
            >
              <Text style={styles.bucketChipEmoji}>{meta.emoji}</Text>
              {!hasItems && <Text style={styles.bucketChipBadge}>!</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Time Groups */}
      {timeGroups.map(group => (
        <View key={group.timeOfDay} style={styles.groupSection}>
          {/* Group Header */}
          <TouchableOpacity
            style={styles.groupHeader}
            onPress={() => toggleGroup(group.timeOfDay)}
            activeOpacity={0.7}
            accessibilityLabel={`${group.displayName}, ${group.completedCount} of ${group.totalCount} items completed`}
            accessibilityRole="togglebutton"
            accessibilityState={{ expanded: expandedGroups.has(group.timeOfDay) }}
          >
            <View style={styles.groupHeaderLeft}>
              <Text style={styles.groupEmoji}>{group.emoji}</Text>
              <View>
                <Text style={styles.groupName}>{group.displayName}</Text>
                <Text style={styles.groupProgress}>
                  {group.completedCount}/{group.totalCount} items
                </Text>
              </View>
            </View>
            <Text style={styles.expandIcon}>
              {expandedGroups.has(group.timeOfDay) ? '\u25BC' : '\u25B6'}
            </Text>
          </TouchableOpacity>

          {/* Items */}
          {expandedGroups.has(group.timeOfDay) && (
            <View style={styles.itemsList}>
              {group.items.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.itemRow, item.status === 'done' && styles.itemRowDone]}
                  onPress={() => handleItemPress(item)}
                  activeOpacity={0.7}
                  accessibilityLabel={`${item.label}, ${item.timeDisplay}, ${item.statusText}`}
                  accessibilityRole="button"
                >
                  <View style={styles.itemLeft}>
                    <Text style={styles.itemEmoji}>{item.emoji}</Text>
                    <View style={styles.itemContent}>
                      <Text style={[styles.itemLabel, item.status === 'done' && styles.itemLabelDone]}>
                        {item.label}
                      </Text>
                      <Text style={styles.itemTime}>{item.timeDisplay}</Text>
                    </View>
                  </View>
                  <View style={styles.itemRight}>
                    <Text style={[styles.itemStatus, item.status === 'done' && styles.itemStatusDone]}>
                      {item.statusText}
                    </Text>
                    <Text style={styles.itemChevron}>{'\u203A'}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      ))}

      {/* Placeholders for unconfigured buckets */}
      {placeholders.length > 0 && (
        <View style={styles.placeholdersSection}>
          <Text style={styles.placeholdersHeader}>NEEDS SETUP</Text>
          {placeholders.map(placeholder => (
            <TouchableOpacity
              key={placeholder.bucket}
              style={styles.placeholderRow}
              onPress={() => navigate(placeholder.route)}
              activeOpacity={0.7}
              accessibilityLabel={`${placeholder.title}, ${placeholder.subtitle}`}
              accessibilityRole="button"
            >
              <View style={styles.placeholderLeft}>
                <Text style={styles.placeholderEmoji}>{placeholder.emoji}</Text>
                <View style={styles.placeholderContent}>
                  <Text style={styles.placeholderTitle}>{placeholder.title}</Text>
                  <Text style={styles.placeholderSubtitle}>{placeholder.subtitle}</Text>
                </View>
              </View>
              <View style={styles.placeholderRight}>
                <Text style={styles.placeholderTime}>Anytime</Text>
                <Text style={styles.placeholderCta}>{`Configure \u203A`}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* All Complete */}
      {stats.done === stats.total && stats.total > 0 && (
        <View style={styles.completeMessage}>
          <Text style={styles.completeEmoji}>{'\u{1F389}'}</Text>
          <Text style={styles.completeText}>All done for today!</Text>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const createStyles = (c: typeof Colors) => StyleSheet.create({
  panel: {
    backgroundColor: c.sageTint,
    borderWidth: 1,
    borderColor: c.sageBorder,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },

  // Empty State
  emptyPanel: {
    backgroundColor: c.glassFaint,
    borderWidth: 1,
    borderColor: c.glassActive,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textSecondary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: c.textHalf,
    textAlign: 'center',
    marginBottom: 16,
  },
  setupButton: {
    backgroundColor: c.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  setupButtonText: {
    color: c.background,
    fontSize: 14,
    fontWeight: '600',
  },
  configureButton: {
    paddingVertical: 8,
  },
  configureButtonText: {
    color: c.accent,
    fontSize: 14,
    fontWeight: '500',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: c.textHalf,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  adjustTodayButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  adjustTodayText: {
    fontSize: 12,
    color: c.accent,
    fontWeight: '500',
  },
  settingsButton: {
    padding: 4,
  },
  settingsIcon: {
    fontSize: 18,
    opacity: 0.6,
  },

  // Group Section
  groupSection: {
    marginBottom: 8,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  groupEmoji: {
    fontSize: 20,
  },
  groupName: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textPrimary,
  },
  groupProgress: {
    fontSize: 11,
    color: c.textHalf,
    marginTop: 2,
  },
  expandIcon: {
    fontSize: 10,
    color: c.textMuted,
  },

  // Items List
  itemsList: {
    marginLeft: 30,
    borderLeftWidth: 1,
    borderLeftColor: c.glassActive,
    paddingLeft: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: c.surfaceElevated,
  },
  itemRowDone: {
    opacity: 0.6,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  itemEmoji: {
    fontSize: 14,
    width: 20,
    textAlign: 'center',
  },
  itemContent: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 13,
    color: c.textAlmostFull,
  },
  itemLabelDone: {
    color: c.textTertiary,
    textDecorationLine: 'line-through',
  },
  itemTime: {
    fontSize: 11,
    color: c.textMuted,
    marginTop: 2,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemStatus: {
    fontSize: 11,
    color: c.sageStrong,
  },
  itemStatusDone: {
    color: c.green,
  },
  itemChevron: {
    fontSize: 12,
    color: c.textPlaceholder,
  },

  // Bucket Chips Strip
  bucketChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  bucketChip: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: c.glassHover,
    borderWidth: 1,
    borderColor: c.glassSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bucketChipConfigured: {
    backgroundColor: c.sageLight,
    borderColor: c.sageGlow,
  },
  bucketChipEmoji: {
    fontSize: 16,
  },
  bucketChipBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: c.amber,
    color: '#000',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 14,
    overflow: 'hidden',
  },

  // Placeholders Section
  placeholdersSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  placeholdersHeader: {
    fontSize: 10,
    fontWeight: '600',
    color: c.textMuted,
    letterSpacing: 1,
    marginBottom: 8,
  },
  placeholderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
    borderWidth: 1,
    borderColor: c.amberHint,
    borderRadius: 10,
    marginBottom: 8,
  },
  placeholderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  placeholderEmoji: {
    fontSize: 18,
    width: 24,
    textAlign: 'center',
  },
  placeholderContent: {
    flex: 1,
  },
  placeholderTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: c.amber,
  },
  placeholderSubtitle: {
    fontSize: 11,
    color: c.textMuted,
    marginTop: 2,
  },
  placeholderRight: {
    alignItems: 'flex-end',
  },
  placeholderTime: {
    fontSize: 11,
    color: c.textMuted,
    marginBottom: 2,
  },
  placeholderCta: {
    fontSize: 12,
    color: c.amber,
    fontWeight: '500',
  },

  // Complete Message
  completeMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 8,
  },
  completeEmoji: {
    fontSize: 20,
  },
  completeText: {
    fontSize: 14,
    fontWeight: '500',
    color: c.green,
  },
});

export default BucketCarePlanPanel;
