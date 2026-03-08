// ============================================================================
// CARE PLAN PANEL
// Main panel component for Care Plan on Record page
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { navigate } from '../../lib/navigate';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { DayState, DayStateRoutine, DayStateItem } from '../../types/dayState';

// ============================================================================
// TYPES
// ============================================================================

interface CarePlanPanelProps {
  dayState: DayState;
  onItemOverride: (routineId: string, itemId: string, done: boolean) => Promise<void>;
  onClearOverride: (routineId: string, itemId: string) => Promise<void>;
  onSetupPress?: () => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CarePlanPanel({
  dayState,
  onItemOverride,
  onClearOverride,
  onSetupPress,
}: CarePlanPanelProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const [expandedRoutines, setExpandedRoutines] = useState<Set<string>>(
    new Set(dayState.routines.filter(r => r.status === 'available').map(r => r.routineId))
  );

  const toggleRoutine = (routineId: string) => {
    setExpandedRoutines(prev => {
      const next = new Set(prev);
      if (next.has(routineId)) {
        next.delete(routineId);
      } else {
        next.add(routineId);
      }
      return next;
    });
  };

  const handleItemPress = (item: DayStateItem) => {
    navigate(item.link);
  };

  const handleItemLongPress = (routineId: string, item: DayStateItem) => {
    const options = item.status === 'done'
      ? ['Mark as not done', 'Cancel']
      : ['Mark as done', 'Cancel'];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 1,
          title: item.label,
        },
        async (buttonIndex) => {
          if (buttonIndex === 0) {
            const newDone = item.status !== 'done';
            await onItemOverride(routineId, item.itemId, newDone);
          }
        }
      );
    } else {
      Alert.alert(
        item.label,
        undefined,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: item.status === 'done' ? 'Mark as not done' : 'Mark as done',
            onPress: async () => {
              const newDone = item.status !== 'done';
              await onItemOverride(routineId, item.itemId, newDone);
            },
          },
        ]
      );
    }
  };

  // Empty state
  if (dayState.routines.length === 0) {
    return (
      <View style={styles.emptyPanel}>
        <Text style={styles.emptyTitle}>No Care Plan set up</Text>
        <Text style={styles.emptySubtitle}>
          Set up a Care Plan to track daily routines
        </Text>
        {onSetupPress && (
          <TouchableOpacity
            style={styles.setupButton}
            onPress={onSetupPress}
            accessibilityLabel="Set up Care Plan"
            accessibilityRole="button"
          >
            <Text style={styles.setupButtonText}>Set up Care Plan</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Care Plan</Text>
          <Text style={styles.subtitle}>Items for today</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.adjustTodayButton}
            onPress={() => navigate('/today-scope')}
            accessibilityLabel="Adjust today's care plan"
            accessibilityRole="button"
          >
            <Text style={styles.adjustTodayText}>Adjust Today</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigate('/care-plan')}
            accessibilityLabel="Care plan settings"
            accessibilityRole="button"
          >
            <Text style={styles.settingsIcon}>{'\u2699\uFE0F'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Next Up Row */}
      {dayState.nextAction && (
        <TouchableOpacity
          style={styles.nextUpRow}
          onPress={() => {
            if (dayState.nextAction?.link) {
              navigate(dayState.nextAction.link);
            }
          }}
          accessibilityLabel={`Next action: ${dayState.nextAction.label}`}
          accessibilityRole="button"
        >
          <Text style={styles.nextUpLabel}>Next:</Text>
          <Text style={styles.nextUpText}>
            {dayState.nextAction.emoji} {dayState.nextAction.label}
          </Text>
          <Text style={styles.nextUpChevron}>{'\u203A'}</Text>
        </TouchableOpacity>
      )}

      {/* Routines */}
      {dayState.routines.map(routine => (
        <RoutineSection
          key={routine.routineId}
          routine={routine}
          expanded={expandedRoutines.has(routine.routineId)}
          onToggle={() => toggleRoutine(routine.routineId)}
          onItemPress={handleItemPress}
          onItemLongPress={(item) => handleItemLongPress(routine.routineId, item)}
          colors={colors}
        />
      ))}

      {/* All Complete Message */}
      {dayState.allComplete && (
        <View style={styles.completeMessage}>
          <Text style={styles.completeEmoji}>{'\uD83C\uDF89'}</Text>
          <Text style={styles.completeText}>All done for today!</Text>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// ROUTINE SECTION
// ============================================================================

interface RoutineSectionProps {
  routine: DayStateRoutine;
  expanded: boolean;
  onToggle: () => void;
  onItemPress: (item: DayStateItem) => void;
  onItemLongPress: (item: DayStateItem) => void;
  colors: typeof Colors;
}

function RoutineSection({
  routine,
  expanded,
  onToggle,
  onItemPress,
  onItemLongPress,
  colors,
}: RoutineSectionProps) {
  const styles = useMemo(() => createStyles(colors), [colors]);
  const statusColor = getStatusColor(routine.status, colors);

  // Get upcoming (not done) items for preview when collapsed
  const upcomingItems = routine.items.filter(item => item.status !== 'done');
  const previewItems = upcomingItems.slice(0, 2);
  const remainingCount = upcomingItems.length - previewItems.length;

  return (
    <View style={styles.routineSection}>
      {/* Routine Header */}
      <TouchableOpacity
        style={styles.routineHeader}
        onPress={onToggle}
        activeOpacity={0.7}
        accessibilityLabel={`${routine.name}, ${routine.completedCount} of ${routine.totalCount} items complete`}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <View style={styles.routineHeaderLeft}>
          <Text style={styles.routineEmoji}>{routine.emoji}</Text>
          <View>
            <Text style={styles.routineName}>{routine.name}</Text>
            <Text style={[styles.routineProgress, { color: statusColor }]}>
              {routine.completedCount}/{routine.totalCount} items
            </Text>
          </View>
        </View>
        <View style={styles.routineHeaderRight}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>
              {routine.status === 'completed' ? '\u2713 Done' :
               routine.status === 'available' ? 'Now' : 'Later'}
            </Text>
          </View>
          <Text style={styles.expandIcon}>{expanded ? '\u25BC' : '\u25B6'}</Text>
        </View>
      </TouchableOpacity>

      {/* Preview when collapsed - shows next 1-2 items */}
      {!expanded && previewItems.length > 0 && (
        <View style={styles.previewSection}>
          {previewItems.map(item => (
            <TouchableOpacity
              key={item.itemId}
              style={styles.previewItem}
              onPress={() => onItemPress(item)}
              activeOpacity={0.7}
              accessibilityLabel={`${item.label}, ${item.statusText}`}
              accessibilityRole="button"
            >
              <Text style={styles.previewEmoji}>{item.emoji || '\u2022'}</Text>
              <Text style={styles.previewLabel} numberOfLines={1}>
                {item.label}
              </Text>
              <Text style={styles.previewStatus}>{item.statusText}</Text>
            </TouchableOpacity>
          ))}
          {remainingCount > 0 && (
            <TouchableOpacity
              style={styles.previewMore}
              onPress={onToggle}
              accessibilityLabel={`Show ${remainingCount} more items`}
              accessibilityRole="button"
            >
              <Text style={styles.previewMoreText}>
                +{remainingCount} more
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Routine Items (expanded) */}
      {expanded && (
        <View style={styles.routineItems}>
          {routine.items.map(item => (
            <RoutineItem
              key={item.itemId}
              item={item}
              onPress={() => onItemPress(item)}
              onLongPress={() => onItemLongPress(item)}
              colors={colors}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ============================================================================
// ROUTINE ITEM
// ============================================================================

interface RoutineItemProps {
  item: DayStateItem;
  onPress: () => void;
  onLongPress: () => void;
  colors: typeof Colors;
}

function RoutineItem({ item, onPress, onLongPress, colors }: RoutineItemProps) {
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isDone = item.status === 'done';

  return (
    <TouchableOpacity
      style={[styles.routineItem, isDone && styles.routineItemDone]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={500}
      activeOpacity={0.7}
      accessibilityLabel={`${item.label}, ${item.statusText}${item.isOverridden ? ', manually overridden' : ''}`}
      accessibilityRole="button"
      accessibilityState={{ checked: isDone }}
      accessibilityHint="Long press to toggle completion"
    >
      <View style={styles.routineItemLeft}>
        <Text style={styles.routineItemEmoji}>{item.emoji || '\u2022'}</Text>
        <Text style={[styles.routineItemLabel, isDone && styles.routineItemLabelDone]}>
          {item.label}
        </Text>
      </View>
      <View style={styles.routineItemRight}>
        <Text style={[
          styles.routineItemStatus,
          isDone && styles.routineItemStatusDone,
          item.isOverridden && styles.routineItemStatusOverride,
        ]}>
          {item.statusText}
          {item.isOverridden && ' *'}
        </Text>
        <Text style={styles.routineItemChevron}>{'\u203A'}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function getStatusColor(status: DayStateRoutine['status'], colors: typeof Colors): string {
  switch (status) {
    case 'completed': return colors.green;
    case 'available': return colors.amber;
    case 'upcoming': return colors.textHalf;
    default: return colors.textHalf;
  }
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

  // Next Up Row
  nextUpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  nextUpLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: c.amber,
    marginRight: 8,
  },
  nextUpText: {
    flex: 1,
    fontSize: 13,
    color: c.textBright,
  },
  nextUpChevron: {
    fontSize: 14,
    color: c.amber,
  },

  // Routine Section
  routineSection: {
    marginBottom: 8,
  },
  routineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  routineHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  routineEmoji: {
    fontSize: 20,
  },
  routineName: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textPrimary,
  },
  routineProgress: {
    fontSize: 11,
    marginTop: 2,
  },
  routineHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  expandIcon: {
    fontSize: 10,
    color: c.textMuted,
  },

  // Preview Section (collapsed state)
  previewSection: {
    marginLeft: 30,
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: c.border,
    paddingBottom: 4,
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  previewEmoji: {
    fontSize: 12,
    width: 18,
    textAlign: 'center',
    opacity: 0.7,
  },
  previewLabel: {
    flex: 1,
    fontSize: 12,
    color: c.textTertiary,
  },
  previewStatus: {
    fontSize: 10,
    color: 'rgba(94, 234, 212, 0.6)',
  },
  previewMore: {
    paddingVertical: 4,
    paddingLeft: 26,
  },
  previewMoreText: {
    fontSize: 11,
    color: c.textMuted,
  },

  // Routine Items (expanded)
  routineItems: {
    marginLeft: 30,
    borderLeftWidth: 1,
    borderLeftColor: c.glassActive,
    paddingLeft: 12,
  },
  routineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: c.surfaceElevated,
  },
  routineItemDone: {
    opacity: 0.6,
  },
  routineItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  routineItemEmoji: {
    fontSize: 14,
    width: 20,
    textAlign: 'center',
  },
  routineItemLabel: {
    fontSize: 13,
    color: c.textAlmostFull,
  },
  routineItemLabelDone: {
    color: c.textTertiary,
    textDecorationLine: 'line-through',
  },
  routineItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routineItemStatus: {
    fontSize: 11,
    color: c.sageStrong,
  },
  routineItemStatusDone: {
    color: c.green,
  },
  routineItemStatusOverride: {
    fontStyle: 'italic',
  },
  routineItemChevron: {
    fontSize: 12,
    color: c.textPlaceholder,
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

export default CarePlanPanel;
