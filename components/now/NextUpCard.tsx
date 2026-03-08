// ============================================================================
// NEXT UP STRIP — Compact status bar at top of Now tab
// Three states: overdue items (red, with category hint), next upcoming, all caught up
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { parseTimeForDisplay, getTimeWindow } from '../../utils/nowHelpers';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';

// Map itemType back to display label for hint text
const ITEM_TYPE_TO_DISPLAY: Record<string, string> = {
  medication: 'Meds',
  vitals: 'Vitals',
  nutrition: 'Meals',
  hydration: 'Water',
  sleep: 'Sleep',
  activity: 'Activity',
  wellness: 'Wellness',
};

interface NextUpStripProps {
  overdueCount: number;
  totalPending: number;
  completedCount: number;
  nextPendingItem: any | null;
  hasRegimenInstances: boolean;
  overdueByCategory?: Record<string, number>;
  onViewTasks?: (window: string) => void;
  overdueItems?: any[];
}

export function NextUpCard({
  overdueCount,
  totalPending,
  completedCount,
  nextPendingItem,
  hasRegimenInstances,
  overdueByCategory,
  onViewTasks,
  overdueItems,
}: NextUpStripProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // No care plan — don't render
  if (!hasRegimenInstances) return null;

  // All caught up
  if (totalPending === 0 && completedCount > 0) {
    return (
      <View style={styles.stripDone}>
        <Text style={styles.doneCheck}>{'\u2713'}</Text>
        <Text style={styles.doneText}>All caught up for today</Text>
      </View>
    );
  }

  // Nothing scheduled at all
  if (totalPending === 0 && completedCount === 0) return null;

  // Overdue items — red tint with category hint
  if (overdueCount > 0) {
    // Find the category with the most overdue items for hint text
    let hintCategory = '';
    if (overdueByCategory) {
      let maxCount = 0;
      for (const [itemType, count] of Object.entries(overdueByCategory)) {
        if (count > maxCount) {
          maxCount = count;
          hintCategory = ITEM_TYPE_TO_DISPLAY[itemType] || itemType;
        }
      }
    }

    const handleOverduePress = () => {
      if (onViewTasks && overdueItems && overdueItems.length > 0) {
        const window = getTimeWindow(overdueItems[0].scheduledTime);
        onViewTasks(window);
      }
    };

    return (
      <TouchableOpacity
        style={styles.stripOverdue}
        onPress={handleOverduePress}
        activeOpacity={onViewTasks ? 0.7 : 1}
        accessible={true}
        accessibilityLabel={`${overdueCount} ${overdueCount === 1 ? 'item' : 'items'} overdue${hintCategory ? `. Tap ${hintCategory} to catch up` : ''}`}
        accessibilityRole="button"
      >
        <View style={styles.stripContent}>
          <View style={styles.overdueBadge}>
            <Text style={styles.overdueBadgeText}>{overdueCount}</Text>
          </View>
          <View style={styles.stripTextContainer}>
            <Text style={styles.overdueLabel}>
              {overdueCount === 1 ? 'item overdue' : 'items overdue'}
            </Text>
            {hintCategory ? (
              <Text style={styles.overdueHint} numberOfLines={1}>
                overdue {'\u00B7'} tap {hintCategory} to catch up
              </Text>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Next upcoming (nothing overdue)
  if (nextPendingItem) {
    const nextTime = parseTimeForDisplay(nextPendingItem.scheduledTime);
    const nextName = nextPendingItem.itemName || '';

    return (
      <View
        style={styles.stripDefault}
        accessible={true}
        accessibilityLabel={`Next up: ${nextName}${nextTime ? ` at ${nextTime}` : ''}`}
      >
        <View style={styles.stripTextContainer}>
          <Text style={styles.nextUpLabel}>NEXT UP</Text>
          <Text style={styles.nextUpDetail} numberOfLines={1}>
            {nextName}{nextTime ? ` \u00B7 ${nextTime}` : ''}
          </Text>
        </View>
      </View>
    );
  }

  // Pending but no specific next item
  return (
    <View style={styles.stripDefault}>
      <Text style={styles.nextUpDetail}>
        {totalPending} item{totalPending === 1 ? '' : 's'} remaining today
      </Text>
    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  // Overdue strip — red tint
  stripOverdue: {
    backgroundColor: c.redFaint,
    borderWidth: 1,
    borderColor: c.redBorder,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stripContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  overdueBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: c.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overdueBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  stripTextContainer: {
    flex: 1,
  },
  overdueLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: c.red,
  },
  overdueHint: {
    fontSize: 12,
    color: c.textMuted,
    marginTop: 1,
  },

  // Default strip — glass
  stripDefault: {
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nextUpLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: c.accent,
    letterSpacing: 1,
    marginBottom: 2,
  },
  nextUpDetail: {
    fontSize: 14,
    fontWeight: '500',
    color: c.textPrimary,
  },

  // All done strip — glass with green
  stripDone: {
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  doneCheck: {
    fontSize: 16,
    color: c.green,
    fontWeight: '700',
    marginRight: 8,
  },
  doneText: {
    fontSize: 14,
    fontWeight: '500',
    color: c.green,
  },
});
