// ============================================================================
// PROGRESS STRIP - Compact 4-column care plan progress cells
// Mini progress bars with emoji, label, and fraction.
// Tappable to filter the timeline section by category.
// ============================================================================

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import type { StatData, TodayStats } from '../../utils/nowHelpers';
import { getUrgencyStatus, getCategoryUrgencyStatus, type UrgencyStatus } from '../../utils/nowUrgency';
import type { UrgencyTier, UrgencyTone } from '../../utils/urgency';
import { type BucketType, PRIMARY_BUCKETS } from '../../types/carePlanConfig';

// ============================================================================
// BUCKET → TILE MAPPING
// ============================================================================

interface TileItem {
  bucket: BucketType;
  icon: string;
  label: string;
  statKey: keyof TodayStats;
  itemType: string;
}

const BUCKET_TILE_MAP: Record<string, Omit<TileItem, 'bucket'>> = {
  meds:      { icon: '\uD83D\uDC8A', label: 'Meds',     statKey: 'meds',     itemType: 'medication' },
  vitals:    { icon: '\uD83D\uDCCA', label: 'Vitals',   statKey: 'vitals',   itemType: 'vitals' },
  meals:     { icon: '\uD83C\uDF7D\uFE0F', label: 'Meals',    statKey: 'meals',    itemType: 'nutrition' },
  water:     { icon: '\uD83D\uDCA7', label: 'Water',    statKey: 'water',    itemType: 'hydration' },
  sleep:     { icon: '\uD83D\uDE34', label: 'Sleep',    statKey: 'sleep',    itemType: 'sleep' },
  activity:  { icon: '\uD83D\uDEB6', label: 'Activity', statKey: 'activity', itemType: 'activity' },
  wellness:  { icon: '\uD83C\uDF05', label: 'Check',    statKey: 'wellness', itemType: 'wellness' },
  custom:    { icon: '\uD83D\uDCCB', label: 'Tasks',    statKey: 'custom',   itemType: 'custom' },
};

// Use PRIMARY_BUCKETS from types/carePlanConfig as the default

// Bar color per bucket
const BUCKET_BAR_COLOR: Record<string, string> = {
  meds:     '#F59E0B',
  vitals:   '#3B82F6',
  meals:    '#10B981',
  water:    '#38BDF8',
  sleep:    Colors.accent,
  activity: '#F97316',
  wellness: '#EC4899',
  custom:   '#A78BFA',
};

// ============================================================================
// PROPS
// ============================================================================

interface ProgressRingsProps {
  todayStats: TodayStats;
  enabledBuckets: BucketType[];
  nextUp: any | null;
  instances: any[];
  selectedCategory?: BucketType | null;
  onRingPress?: (bucket: BucketType) => void;
  onManagePress?: () => void;
  patientName?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function getProgressPercent(completed: number, total: number) {
  return total > 0 ? (completed / total) * 100 : 0;
}

// ============================================================================
// STYLES
// ============================================================================

const createStyles = (c: typeof Colors) => StyleSheet.create({
  section: {
    marginBottom: 4,
  },
  // 4-col strip (wraps to second row if >4 tiles)
  strip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },

  // Individual cell — fixed ~24% width for 4-col grid
  cell: {
    width: '23.5%' as any,
    flexGrow: 1,
    backgroundColor: c.glassFaint,
    borderWidth: 1,
    borderColor: c.glassBorder,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  cellInactive: {
    opacity: 0.5,
  },
  cellOverdue: {
    borderColor: 'rgba(239, 68, 68, 0.35)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  cellWarn: {
    borderColor: 'rgba(245, 158, 11, 0.25)',
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
  },
  cellSelected: {
    borderColor: 'rgba(20, 184, 166, 0.5)',
    backgroundColor: 'rgba(20, 184, 166, 0.08)',
  },

  cellIcon: {
    fontSize: 14,
    marginBottom: 4,
  },
  cellLabel: {
    fontSize: 9,
    color: c.textMuted,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  cellFrac: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 16,
  },

  // Mini progress bar
  progressBar: {
    height: 2,
    backgroundColor: c.glassHover,
    borderRadius: 1,
    marginTop: 5,
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1,
  },
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProgressRings({
  todayStats,
  enabledBuckets,
  nextUp,
  instances,
  selectedCategory,
  onRingPress,
  onManagePress,
}: ProgressRingsProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Build dynamic items from enabled buckets
  const tileItems: TileItem[] = useMemo(() => {
    const buckets = enabledBuckets.length > 0 ? enabledBuckets : PRIMARY_BUCKETS;
    const items = buckets
      .filter(b => BUCKET_TILE_MAP[b])
      .map(b => ({ bucket: b, ...BUCKET_TILE_MAP[b] }));

    // Auto-include custom tile if custom instances exist
    const customStat = todayStats.custom;
    if (customStat && customStat.total > 0 && !buckets.includes('custom' as BucketType)) {
      items.push({ bucket: 'custom' as BucketType, ...BUCKET_TILE_MAP.custom });
    }

    return items;
  }, [enabledBuckets, todayStats.custom]);

  // Track critical tiles for above-fold cap
  let criticalTileCount = 0;

  const renderCell = (item: TileItem) => {
    const stat: StatData = todayStats[item.statKey] ?? { completed: 0, total: 0 };
    const percent = getProgressPercent(stat.completed, stat.total);
    const isComplete = stat.total > 0 && stat.completed === stat.total;
    const isInactive = stat.total === 0;
    const isSelected = selectedCategory === item.bucket;

    // Urgency computation
    let nextUpIsCritical = false;
    if (nextUp) {
      const nextUpUrgency = getUrgencyStatus(nextUp.scheduledTime, false, nextUp.itemType);
      nextUpIsCritical = nextUpUrgency.tier === 'critical';
    }

    const urgencyResult = item.itemType
      ? getCategoryUrgencyStatus(instances, item.itemType, stat, {
          hasCriticalNextUp: nextUpIsCritical,
          criticalTileCount,
        })
      : { status: 'NOT_APPLICABLE' as UrgencyStatus, tier: 'info' as UrgencyTier, tone: 'neutral' as UrgencyTone, label: '', isCritical: false };

    if (urgencyResult.isCritical) {
      criticalTileCount++;
    }

    // Bar color
    const barColor = isComplete
      ? colors.green
      : BUCKET_BAR_COLOR[item.bucket] || colors.accent;

    // Count text color
    const countColor = isComplete ? colors.green
      : isInactive ? colors.textMuted
      : urgencyResult.tone === 'danger' ? colors.red
      : urgencyResult.tone === 'warn' ? colors.amber
      : colors.textSecondary;

    // Cell urgency style
    const getCellStyle = () => {
      if (isComplete || isInactive) return null;
      if (urgencyResult.tone === 'danger') return styles.cellOverdue;
      if (urgencyResult.tone === 'warn') return styles.cellWarn;
      return null;
    };

    return (
      <TouchableOpacity
        key={item.bucket}
        style={[
          styles.cell,
          isInactive && styles.cellInactive,
          getCellStyle(),
          isSelected && styles.cellSelected,
        ]}
        onPress={() => onRingPress?.(item.bucket)}
        activeOpacity={0.7}
        accessibilityLabel={`${item.label}. ${stat.completed} of ${stat.total}. Tap to filter.`}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
      >
        <Text style={styles.cellIcon}>{item.icon}</Text>
        <Text style={styles.cellLabel}>{item.label}</Text>
        <Text style={[styles.cellFrac, { color: countColor }]}>
          {stat.total > 0 ? `${stat.completed}/${stat.total}` : '\u2014'}
        </Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min(percent, 100)}%`, backgroundColor: barColor },
            ]}
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.section}>
      <View style={styles.strip}>
        {tileItems.map(item => renderCell(item))}
      </View>
    </View>
  );
}
