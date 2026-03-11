// ============================================================================
// TIMELINE SECTION - Two modes:
// A) Category expanded: inline items with Log buttons (when ring tapped)
// B) Flat "Coming Up Today" chronological list (default, no ring selected)
// ============================================================================

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { navigate } from '../../lib/navigate';
import { MedsBatchPanel } from './MedsBatchPanel';
import { WindowReceipt } from './WindowReceipt';
import {
  parseTimeForDisplay,
  isOverdue,
  groupByTimeWindow,
  getCurrentTimeWindow,
  type TodayStats,
  type StatData,
  type TimeWindow,
} from '../../utils/nowHelpers';
import { getUrgencyStatus } from '../../utils/nowUrgency';
import { getDetailedUrgencyLabel, getTimeDeltaString } from '../../utils/urgency';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import type { BucketType } from '../../types/carePlanConfig';

// ============================================================================
// BUCKET → ITEM TYPE MAPPING
// ============================================================================

const BUCKET_TO_ITEM_TYPE: Record<string, string> = {
  meds: 'medication',
  vitals: 'vitals',
  meals: 'nutrition',
  water: 'hydration',
  sleep: 'sleep',
  activity: 'activity',
  wellness: 'wellness',
  custom: 'custom',
};

const ITEM_TYPE_TO_LABEL: Record<string, string> = {
  medication: 'Meds',
  vitals: 'Vitals',
  nutrition: 'Meals',
  hydration: 'Water',
  sleep: 'Sleep',
  activity: 'Activity',
  wellness: 'Wellness',
  custom: 'Tasks',
};

const BUCKET_TO_ICON: Record<string, string> = {
  meds: '\uD83D\uDC8A',
  vitals: '\uD83D\uDCCA',
  meals: '\uD83C\uDF7D\uFE0F',
  water: '\uD83D\uDCA7',
  sleep: '\uD83D\uDE34',
  activity: '\uD83D\uDEB6',
  wellness: '\uD83C\uDF05',
  custom: '\uD83D\uDCCB',
};

const ITEM_TYPE_TO_DOT_COLOR: Record<string, string> = {
  medication: '#F59E0B',
  vitals: '#67B8A7',
  nutrition: '#10B981',
  hydration: '#38BDF8',
  sleep: Colors.accent,
  activity: '#F97316',
  wellness: '#EC4899',
  custom: '#A78BFA',
};

const TIME_WINDOW_LABELS: Record<TimeWindow, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  night: 'Night',
};

// ============================================================================
// HELPERS
// ============================================================================

function getItemSubtitle(instance: any): string {
  const parts: string[] = [];

  // Time
  const time = parseTimeForDisplay(instance.scheduledTime);
  if (time) parts.push(time);

  // Context from instructions or dosage
  if (instance.instructions) {
    parts.push(instance.instructions);
  } else if (instance.itemDosage) {
    parts.push(instance.itemDosage);
  }

  return parts.join(' \u00B7 ');
}

function getTimeDelta(scheduledTime: string): { text: string; tone: 'late' | 'soon' | 'later' } | null {
  if (!scheduledTime) return null;

  const now = new Date();
  let scheduled = new Date(scheduledTime);
  if (isNaN(scheduled.getTime()) && /^\d{2}:\d{2}$/.test(scheduledTime)) {
    const todayStr = now.toISOString().slice(0, 10);
    scheduled = new Date(`${todayStr}T${scheduledTime}:00`);
  }
  if (isNaN(scheduled.getTime())) return null;

  const diffMs = now.getTime() - scheduled.getTime();

  if (diffMs > 30 * 60 * 1000) {
    return { text: 'overdue', tone: 'late' };
  }

  if (diffMs > 0) {
    return { text: 'due now', tone: 'soon' };
  }

  // Future within 30min
  const diffMin = Math.round(Math.abs(diffMs) / (1000 * 60));
  if (diffMin <= 30) {
    return { text: 'coming up', tone: 'soon' };
  }

  return null;
}

function getDotColor(instance: any): string {
  const itemIsOverdue = isOverdue(instance.scheduledTime);
  if (itemIsOverdue) {
    const urgencyInfo = getUrgencyStatus(instance.scheduledTime, false, instance.itemType);
    if (urgencyInfo.tone === 'danger') return Colors.red;
    return Colors.amber;
  }

  // Check if due soon (within 30 min)
  const now = new Date();
  let scheduled = new Date(instance.scheduledTime);
  if (isNaN(scheduled.getTime()) && /^\d{2}:\d{2}$/.test(instance.scheduledTime)) {
    const todayStr = now.toISOString().slice(0, 10);
    scheduled = new Date(`${todayStr}T${instance.scheduledTime}:00`);
  }
  if (!isNaN(scheduled.getTime())) {
    const diffMin = (scheduled.getTime() - now.getTime()) / (1000 * 60);
    if (diffMin <= 30 && diffMin > 0) return Colors.amber;
  }

  // Later - use category color but muted
  return ITEM_TYPE_TO_DOT_COLOR[instance.itemType] || 'rgba(255, 255, 255, 0.25)';
}

// ============================================================================
// PROPS
// ============================================================================

interface TimelineSectionProps {
  allPending: any[];
  completed: any[];
  hasRegimenInstances: boolean;
  selectedCategory: BucketType | null;
  onClearCategory: () => void;
  onItemPress: (instance: any) => void;
  onBatchMedConfirm?: (instanceIds: string[]) => Promise<void>;
  todayStats: TodayStats;
  enabledBuckets: BucketType[];
  waterGlasses?: number;
  waterGoal?: number;
  onWaterUpdate?: (glasses: number) => void;
  onStartRoutine?: (window: TimeWindow) => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TimelineSection({
  allPending,
  completed,
  hasRegimenInstances,
  selectedCategory,
  onClearCategory,
  onItemPress,
  onBatchMedConfirm,
  todayStats,
  enabledBuckets,
  waterGlasses = 0,
  waterGoal = 8,
  onWaterUpdate,
  onStartRoutine,
}: TimelineSectionProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  if (!hasRegimenInstances && selectedCategory !== 'water') return null;
  if (allPending.length === 0 && completed.length === 0 && selectedCategory !== 'water') return null;

  // ============================================================================
  // MODE W — Water Inline Counter
  // ============================================================================

  if (selectedCategory === 'water') {
    const progressPercent = Math.min((waterGlasses / waterGoal) * 100, 100);

    return (
      <View style={[styles.categoryContainer, styles.categoryContainerDefault]}>
        <View style={styles.categoryHeader}>
          <View style={styles.categoryHeaderLeft}>
            <Text style={styles.categoryIcon}>{'\uD83D\uDCA7'}</Text>
            <Text style={styles.categoryLabel}>Water</Text>
            <Text style={styles.categoryCount}>{waterGlasses}/{waterGoal} glasses</Text>
          </View>
          <TouchableOpacity
            onPress={onClearCategory}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Close Water details"
            accessibilityRole="button"
          >
            <Text style={styles.categoryClose}>{'\u2715'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.waterCounterRow}>
          <TouchableOpacity
            style={styles.waterButton}
            onPress={() => onWaterUpdate?.(Math.max(0, waterGlasses - 1))}
            disabled={waterGlasses === 0}
            accessibilityLabel="Remove one glass"
            accessibilityRole="button"
          >
            <Text style={[styles.waterButtonText, waterGlasses === 0 && { opacity: 0.3 }]}>{'\u2212'}</Text>
          </TouchableOpacity>

          <View style={styles.waterDisplay}>
            <Text style={styles.waterNumber}>{waterGlasses}</Text>
          </View>

          <TouchableOpacity
            style={styles.waterButton}
            onPress={() => onWaterUpdate?.(waterGlasses + 1)}
            accessibilityLabel="Add one glass"
            accessibilityRole="button"
          >
            <Text style={styles.waterButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.waterProgressBar}>
          <View style={[styles.waterProgressFill, { width: `${progressPercent}%` }]} />
        </View>
        <Text style={styles.waterProgressText}>
          {waterGlasses >= waterGoal ? '\u2713 Goal reached!' : `${waterGoal - waterGlasses} more to go`}
        </Text>
      </View>
    );
  }

  // ============================================================================
  // MODE A — Category Expanded
  // ============================================================================

  if (selectedCategory !== null) {
    const itemType = BUCKET_TO_ITEM_TYPE[selectedCategory] || selectedCategory;
    const icon = BUCKET_TO_ICON[selectedCategory] || '\uD83D\uDD14';
    const label = ITEM_TYPE_TO_LABEL[itemType] || selectedCategory;
    const statKey = selectedCategory as keyof TodayStats;
    const stat: StatData = todayStats[statKey] ?? { completed: 0, total: 0 };
    const categoryPending = allPending.filter(i => i.itemType === itemType);
    const categoryCompleted = completed.filter(i => i.itemType === itemType);

    // Merge and sort chronologically for display
    const categoryAll = [...categoryPending, ...categoryCompleted].sort((a, b) => {
      const timeA = a.scheduledTime || '';
      const timeB = b.scheduledTime || '';
      return timeA.localeCompare(timeB);
    });

    // Meds batch panel
    if (selectedCategory === 'meds' && onBatchMedConfirm) {
      return (
        <MedsBatchPanel
          pendingMeds={categoryPending}
          completedMeds={categoryCompleted}
          onBatchConfirm={onBatchMedConfirm}
          onItemPress={onItemPress}
          stat={stat}
          onClose={onClearCategory}
        />
      );
    }

    return (
      <View style={[
        styles.categoryContainer,
        styles.categoryContainerDefault,
      ]}>
        <View style={styles.categoryHeader}>
          <View style={styles.categoryHeaderLeft}>
            <Text style={styles.categoryIcon}>{icon}</Text>
            <Text style={styles.categoryLabel}>{label}</Text>
            <Text style={styles.categoryCount}>{stat.completed}/{stat.total}</Text>
          </View>
          <TouchableOpacity
            onPress={onClearCategory}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel={`Close ${label} details`}
            accessibilityRole="button"
          >
            <Text style={styles.categoryClose}>{'\u2715'}</Text>
          </TouchableOpacity>
        </View>

        {categoryPending.length === 0 && categoryCompleted.length === 0 && (
          <Text style={styles.categoryEmptyText}>No items for {label} today</Text>
        )}

        {categoryAll.map((instance) => {
          const timeDisplay = parseTimeForDisplay(instance.scheduledTime);
          const isPending = instance.status === 'pending' || !instance.status;
          const isMissed = instance.status === 'missed';
          const isDone = instance.status === 'completed' || instance.status === 'skipped';
          const itemIsOverdue = isPending && isOverdue(instance.scheduledTime);

          // Overdue pending → render as missed
          if (itemIsOverdue || isMissed) {
            return (
              <TouchableOpacity
                key={instance.id}
                style={styles.categoryItemRow}
                onPress={() => onItemPress(instance)}
                activeOpacity={0.7}
                accessibilityLabel={`${instance.itemName}, Missed. Tap to log late.`}
                accessibilityRole="button"
              >
                <View style={[styles.statusCircle, styles.statusCircleMissed]}>
                  <Text style={styles.statusCircleMissedText}>{'\u2014'}</Text>
                </View>
                <View style={styles.categoryItemDetails}>
                  <Text style={styles.categoryItemNameMissed}>{instance.itemName}</Text>
                  <Text style={styles.categoryItemTimeDone}>
                    {timeDisplay ? `${timeDisplay} \u00B7 Missed` : 'Missed'}
                  </Text>
                </View>
                <Text style={styles.logLateText}>Log Late</Text>
              </TouchableOpacity>
            );
          }

          // Pending (not overdue) → show Log button
          if (isPending) {
            const urgencyInfo = getUrgencyStatus(instance.scheduledTime, false, instance.itemType);
            const statusLabel = urgencyInfo.itemUrgency
              ? getDetailedUrgencyLabel(urgencyInfo.itemUrgency)
              : urgencyInfo.label;
            const timeDelta = urgencyInfo.itemUrgency
              ? getTimeDeltaString(urgencyInfo.itemUrgency)
              : null;

            return (
              <View key={instance.id} style={styles.categoryItemRow}>
                <View style={[styles.statusCircle, styles.statusCirclePending]}>
                  <Text style={styles.statusCircleText}>{'\u25CB'}</Text>
                </View>
                <View style={styles.categoryItemDetails}>
                  <Text style={styles.categoryItemName}>{instance.itemName}</Text>
                  <Text style={styles.categoryItemTime}>
                    {timeDisplay ? `${timeDisplay} \u00B7 ${statusLabel}` : statusLabel}
                    {timeDelta ? ` \u00B7 ${timeDelta}` : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.logButton}
                  onPress={() => onItemPress(instance)}
                  activeOpacity={0.7}
                  accessibilityLabel={`Log ${instance.itemName}`}
                  accessibilityRole="button"
                >
                  <Text style={styles.logButtonText}>Log</Text>
                </TouchableOpacity>
              </View>
            );
          }

          // Done/skipped
          const statusText = instance.status === 'skipped' ? 'Skipped' : 'Done';
          return (
            <View key={instance.id} style={styles.categoryItemRow}>
              <View style={[styles.statusCircle, styles.statusCircleDone]}>
                <Text style={styles.statusCircleDoneText}>{'\u2713'}</Text>
              </View>
              <View style={styles.categoryItemDetails}>
                <Text style={styles.categoryItemNameDone}>{instance.itemName}</Text>
                <Text style={styles.categoryItemTimeDone}>
                  {timeDisplay ? `${timeDisplay} \u00B7 ${statusText}` : statusText}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  }

  // ============================================================================
  // MODE B — Clean Timeline with collapsible time groups
  // ============================================================================

  return (
    <TimelineModeBContent
      allPending={allPending}
      completed={completed}
      onItemPress={onItemPress}
      onStartRoutine={onStartRoutine}
    />
  );
}

// ============================================================================
// MODE B — Collapsible Time-Grouped Timeline
// ============================================================================

function TimelineModeBContent({
  allPending,
  completed,
  onItemPress,
  onStartRoutine,
}: {
  allPending: any[];
  completed: any[];
  onItemPress: (instance: any) => void;
  onStartRoutine?: (window: TimeWindow) => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const allItems = [...allPending, ...completed];
  const grouped = groupByTimeWindow(allItems);

  // Default collapse: morning, afternoon, evening start collapsed; night stays open
  const [collapsedWindows, setCollapsedWindows] = useState<Set<TimeWindow>>(() => {
    const defaultCollapsed: TimeWindow[] = ['morning', 'afternoon', 'evening'];
    const windowGroups = groupByTimeWindow([...allPending, ...completed]);
    // Collapse morning/afternoon/evening if they have items, leave empty windows out
    return new Set(defaultCollapsed.filter(w => windowGroups[w].length > 0));
  });

  const toggleWindow = (window: TimeWindow) => {
    setCollapsedWindows(prev => {
      const next = new Set(prev);
      if (next.has(window)) next.delete(window);
      else next.add(window);
      return next;
    });
  };

  const currentWindow = getCurrentTimeWindow();
  const windowOrder: TimeWindow[] = ['morning', 'afternoon', 'evening', 'night'];

  return (
    <>
      {/* Time-grouped list — section header is rendered by now.tsx SectionHeaderRow */}
      {windowOrder.map((window) => {
        const items = grouped[window];
        if (items.length === 0) return null;

        const isCurrent = window === currentWindow;
        const isCollapsed = collapsedWindows.has(window);
        const pendingCount = items.filter(i => i.status === 'pending').length;
        const doneCount = items.length - pendingCount;

        // Dot color must match what the expanded children show:
        // Green only when every item is completed/skipped (no missed, no pending)
        // Red when any pending item is overdue OR any item is missed
        // Amber otherwise (has pending items)
        const hasMissedItems = items.some(i => i.status === 'missed');
        const allDone = !hasMissedItems && items.every(i =>
          i.status === 'completed' || i.status === 'skipped'
        );
        const hasOverdueItems = hasMissedItems || items.some(i =>
          i.status === 'pending' && isOverdue(i.scheduledTime)
        );

        return (
          <View key={window} style={styles.timeGroup}>
            {/* Collapsible header */}
            <TouchableOpacity
              style={[
                styles.timeGroupHeader,
                isCurrent && styles.timeGroupHeaderCurrent,
              ]}
              onPress={() => toggleWindow(window)}
              activeOpacity={0.7}
              accessibilityLabel={`${TIME_WINDOW_LABELS[window]}, ${pendingCount} remaining, ${doneCount} done. ${isCollapsed ? 'Expand' : 'Collapse'}`}
              accessibilityRole="button"
              accessibilityState={{ expanded: !isCollapsed }}
            >
              <View style={[
                styles.windowDot,
                allDone ? styles.windowDotGreen
                  : hasOverdueItems ? styles.windowDotRed
                  : styles.windowDotAmber,
              ]} />
              <Text style={[
                styles.timeGroupTitle,
                isCurrent && styles.timeGroupTitleCurrent,
              ]}>
                {TIME_WINDOW_LABELS[window]}
              </Text>
              <Text style={styles.timeGroupCount}>
                {pendingCount > 0 ? `${pendingCount} remaining` : `Complete \u2713`}
              </Text>
              {isCurrent && pendingCount > 0 && onStartRoutine && (
                <TouchableOpacity
                  onPress={() => onStartRoutine(window)}
                  style={styles.startRoutineButton}
                  activeOpacity={0.7}
                  accessibilityLabel={`Start ${TIME_WINDOW_LABELS[window]} routine`}
                  accessibilityRole="button"
                >
                  <Text style={styles.startRoutineText}>Start</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            {/* Items */}
            {!isCollapsed && (
              <View style={styles.timeGroupItems}>
                {items.map((instance, index) => {
                  const isDone = instance.status === 'completed' || instance.status === 'skipped';
                  const isMissed = instance.status === 'missed';
                  const isFinished = isDone || isMissed;

                  if (isFinished) {
                    const statusText = isMissed ? 'Missed' : instance.status === 'skipped' ? 'Skipped' : 'Done';
                    const Wrapper = isMissed ? TouchableOpacity : View;
                    const wrapperProps = isMissed
                      ? { onPress: () => onItemPress(instance), activeOpacity: 0.7 }
                      : {};
                    return (
                      <Wrapper
                        key={instance.id}
                        {...wrapperProps}
                        style={[
                          styles.timelineItem,
                          !isMissed && styles.timelineItemDone,
                          index < items.length - 1 && styles.timelineItemBorder,
                        ]}
                        accessibilityLabel={`${instance.itemName}, ${statusText}${isMissed ? '. Tap to log late.' : ''}`}
                      >
                        <View style={styles.timelineDotWrap}>
                          <View style={[
                            styles.timelineDotDone,
                            isMissed && styles.timelineDotMissed,
                          ]}>
                            <Text style={[styles.timelineDotDoneIcon, isMissed && styles.timelineDotMissedIcon]}>
                              {isMissed ? '\u2014' : '\u2713'}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.timelineItemBody}>
                          <Text style={isMissed ? styles.timelineNameMissed : styles.timelineNameDone} numberOfLines={1}>{instance.itemName}</Text>
                          <Text style={styles.timelineSubDone}>
                            {parseTimeForDisplay(instance.scheduledTime) || statusText}
                          </Text>
                        </View>
                        {isMissed ? (
                          <Text style={styles.logLateText}>Log Late</Text>
                        ) : (
                          <Text style={[styles.timelineStatusText]}>
                            {statusText}
                          </Text>
                        )}
                      </Wrapper>
                    );
                  }

                  // Pending item
                  const subtitle = getItemSubtitle(instance);
                  const delta = getTimeDelta(instance.scheduledTime);
                  const dotColor = getDotColor(instance);

                  return (
                    <TouchableOpacity
                      key={instance.id}
                      style={[
                        styles.timelineItem,
                        index < items.length - 1 && styles.timelineItemBorder,
                      ]}
                      onPress={() => onItemPress(instance)}
                      activeOpacity={0.7}
                      accessibilityLabel={`${instance.itemName}, ${subtitle}`}
                      accessibilityRole="button"
                    >
                      <View style={styles.timelineDotWrap}>
                        <View style={[styles.timelineDot, { backgroundColor: dotColor }]} />
                      </View>
                      <View style={styles.timelineItemBody}>
                        <Text style={styles.timelineName} numberOfLines={1}>{instance.itemName}</Text>
                        {subtitle ? (
                          <Text style={styles.timelineSub} numberOfLines={1}>{subtitle}</Text>
                        ) : null}
                      </View>
                      <View style={styles.timelineLogButton}>
                        <Text style={styles.timelineLogButtonText}>Log</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
    </>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const createStyles = (c: typeof Colors) => StyleSheet.create({
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  timelineSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: c.glassHover,
  },
  adjustTodayLink: {
    fontSize: 12,
    fontWeight: '500',
    color: c.accent,
  },

  // ============================================================================
  // MODE A — Category Expanded
  // ============================================================================
  categoryContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    marginBottom: 12,
  },
  categoryContainerDefault: {
    borderColor: c.accent,
    backgroundColor: c.accentDim,
  },
  categoryContainerOverdue: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: c.redFaint,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryIcon: {
    fontSize: 18,
  },
  categoryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
  },
  categoryCount: {
    fontSize: 13,
    fontWeight: '500',
    color: c.textMuted,
  },
  categoryClose: {
    fontSize: 16,
    color: c.textMuted,
    padding: 4,
  },
  categoryEmptyText: {
    fontSize: 13,
    color: c.textMuted,
    textAlign: 'center',
    paddingVertical: 12,
  },
  categoryItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: c.glassHover,
    gap: 10,
  },
  statusCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  statusCirclePending: {
    borderColor: c.textMuted,
    backgroundColor: 'transparent',
  },
  statusCircleOverdue: {
    borderColor: c.red,
    backgroundColor: c.redFaint,
  },
  statusCircleDone: {
    borderColor: c.green,
    backgroundColor: 'rgba(16, 185, 129, 0.10)',
  },
  statusCircleText: {
    fontSize: 12,
    color: c.textMuted,
  },
  statusCircleDoneText: {
    fontSize: 12,
    color: c.green,
    fontWeight: '600',
  },
  statusCircleMissed: {
    borderColor: c.amber,
    backgroundColor: 'rgba(245, 158, 11, 0.10)',
  },
  statusCircleMissedText: {
    fontSize: 12,
    color: c.amber,
    fontWeight: '600',
  },
  categoryItemDetails: {
    flex: 1,
  },
  categoryItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 2,
  },
  categoryItemNameDone: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textTertiary,
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },
  categoryItemNameMissed: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textTertiary,
    marginBottom: 2,
  },
  categoryItemTime: {
    fontSize: 12,
    color: c.textMuted,
  },
  categoryItemTimeOverdue: {
    color: c.red,
  },
  categoryItemTimeDone: {
    fontSize: 12,
    color: c.textMuted,
  },
  logButton: {
    backgroundColor: c.glassActive,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
  },
  logButtonOverdue: {
    backgroundColor: c.redMuted,
  },
  logButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textPrimary,
  },

  // ============================================================================
  // MODE B — Clean Timeline
  // ============================================================================
  timeGroup: {
    marginBottom: 12,
  },
  timeGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 3,
    paddingHorizontal: 4,
    marginTop: 2,
  },
  timeGroupHeaderCurrent: {
    backgroundColor: c.accentDim,
    borderRadius: 8,
  },
  windowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  windowDotGreen: {
    backgroundColor: c.green,
  },
  windowDotAmber: {
    backgroundColor: c.amber,
  },
  windowDotRed: {
    backgroundColor: c.red,
  },
  timeGroupChevron: {
    fontSize: 8,
    color: c.textMuted,
    width: 12,
  },
  timeGroupTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: c.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  timeGroupTitleCurrent: {
    color: c.accent,
  },
  timeGroupCount: {
    flex: 1,
    fontSize: 11,
    color: c.textMuted,
    fontWeight: '500',
  },
  startRoutineButton: {
    backgroundColor: c.accent,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  startRoutineText: {
    fontSize: 11,
    fontWeight: '600',
    color: c.background,
  },
  timeGroupItems: {
    marginLeft: 4,
    paddingLeft: 16,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.04)',
  },

  // Timeline item (pending)
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 10,
  },
  timelineItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: c.glassFaint,
  },
  timelineDotWrap: {
    width: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  timelineItemBody: {
    flex: 1,
  },
  timelineName: {
    fontSize: 13,
    fontWeight: '500',
    color: c.textPrimary,
    marginBottom: 1,
  },
  timelineSub: {
    fontSize: 10,
    color: c.textMuted,
  },

  // Log button for pending items in time windows
  timelineLogButton: {
    backgroundColor: 'rgba(20, 184, 166, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.15)',
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  timelineLogButtonText: {
    fontSize: 9,
    fontWeight: '600',
    color: c.accent,
  },

  // Timeline badges (right side)
  timelineBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.glassActive,
  },
  timelineBadgeLate: {
    borderColor: 'rgba(239, 68, 68, 0.35)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  timelineBadgeSoon: {
    borderColor: 'rgba(245, 158, 11, 0.35)',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  timelineBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textMuted,
  },
  timelineBadgeTextLate: {
    color: '#FCA5A5',
  },
  timelineBadgeTextSoon: {
    color: c.amber,
  },

  // Timeline item (done/missed)
  timelineItemDone: {
    opacity: 0.5,
  },
  timelineDotDone: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotMissed: {
    backgroundColor: 'rgba(245, 158, 11, 0.7)',
  },
  timelineDotDoneIcon: {
    fontSize: 0,
    fontWeight: '700',
    color: c.green,
  },
  timelineDotMissedIcon: {
    color: c.amber,
  },
  timelineNameDone: {
    fontSize: 13,
    fontWeight: '500',
    color: c.textMuted,
    textDecorationLine: 'line-through',
    textDecorationColor: c.glassSubtle,
    marginBottom: 1,
  },
  timelineNameMissed: {
    fontSize: 13,
    fontWeight: '500',
    color: c.textMuted,
    marginBottom: 1,
  },
  timelineSubDone: {
    fontSize: 10,
    color: c.textMuted,
  },
  timelineStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(16, 185, 129, 0.5)',
  },
  timelineStatusMissed: {
    color: 'rgba(245, 158, 11, 0.6)',
  },
  logLateText: {
    fontSize: 11,
    color: c.accent,
    fontWeight: '500',
    borderWidth: 1,
    borderColor: c.glassBorder,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },

  // ============================================================================
  // Water Inline Counter
  // ============================================================================
  waterCounterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 16,
  },
  waterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.glassBorder,
    borderWidth: 1,
    borderColor: c.glassSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterButtonText: {
    fontSize: 24,
    fontWeight: '300',
    color: c.accent,
  },
  waterDisplay: {
    alignItems: 'center',
  },
  waterNumber: {
    fontSize: 48,
    fontWeight: '200',
    color: c.textPrimary,
  },
  waterProgressBar: {
    height: 6,
    backgroundColor: c.glassBorder,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 4,
    marginBottom: 8,
  },
  waterProgressFill: {
    height: '100%',
    backgroundColor: '#38BDF8',
    borderRadius: 3,
  },
  waterProgressText: {
    fontSize: 12,
    color: c.textMuted,
    textAlign: 'center',
  },
});
