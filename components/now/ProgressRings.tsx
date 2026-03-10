// ============================================================================
// PROGRESS RINGS - Circular SVG rings per care bucket
// Tappable to filter the timeline section by category.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import type { StatData, TodayStats } from '../../utils/nowHelpers';
import { getUrgencyStatus, getCategoryUrgencyStatus, type UrgencyStatus } from '../../utils/nowUrgency';
import type { UrgencyTier, UrgencyTone } from '../../utils/urgency';
import { type BucketType, PRIMARY_BUCKETS } from '../../types/carePlanConfig';

// ============================================================================
// BUCKET CONFIG
// ============================================================================

interface TileItem {
  bucket: BucketType;
  icon: string;
  label: string;
  statKey: keyof TodayStats;
  itemType: string;
}

const BUCKET_TILE_MAP: Record<string, Omit<TileItem, 'bucket'>> = {
  meds:      { icon: '💊', label: 'Meds',     statKey: 'meds',     itemType: 'medication' },
  vitals:    { icon: '📊', label: 'Vitals',   statKey: 'vitals',   itemType: 'vitals' },
  meals:     { icon: '🍽️', label: 'Meals',    statKey: 'meals',    itemType: 'nutrition' },
  water:     { icon: '💧', label: 'Water',    statKey: 'water',    itemType: 'hydration' },
  sleep:     { icon: '😴', label: 'Sleep',    statKey: 'sleep',    itemType: 'sleep' },
  activity:  { icon: '🚶', label: 'Activity', statKey: 'activity', itemType: 'activity' },
  wellness:  { icon: '🌅', label: 'Check',    statKey: 'wellness', itemType: 'wellness' },
  custom:    { icon: '📋', label: 'Tasks',    statKey: 'custom',   itemType: 'custom' },
};

const BUCKET_RING_COLOR: Record<string, string> = {
  meds:     '#60A5FA',  // accent blue
  vitals:   '#67E8F9',  // cyan
  meals:    '#FBBF24',  // amber
  water:    '#38BDF8',  // sky
  sleep:    '#C084FC',  // purple
  activity: '#F97316',  // orange
  wellness: '#EC4899',  // pink
  custom:   '#A78BFA',  // violet
};

// ============================================================================
// SINGLE RING COMPONENT
// ============================================================================

const RING_SIZE = 52;
const STROKE_WIDTH = 4;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function Ring({
  pct,
  color,
  label,
  val,
  isSelected,
  isInactive,
  urgencyTone,
  onPress,
}: {
  pct: number;
  color: string;
  label: string;
  val: string;
  isSelected: boolean;
  isInactive: boolean;
  urgencyTone: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const dashArray = Math.min(pct / 100, 1) * CIRCUMFERENCE;
  const ringColor = isInactive
    ? 'rgba(255,255,255,0.12)'
    : urgencyTone === 'danger'
    ? colors.redBright
    : urgencyTone === 'warn'
    ? colors.amber
    : color;

  const valColor = isInactive
    ? colors.textMuted
    : urgencyTone === 'danger'
    ? colors.redBright
    : urgencyTone === 'warn'
    ? colors.amber
    : pct === 100
    ? colors.green
    : colors.textPrimary;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${val}. Tap to filter.`}
      accessibilityState={{ selected: isSelected }}
      style={[
        styles.ringWrapper,
        isSelected && { backgroundColor: ringColor + '1A', borderRadius: 14 },
      ]}
    >
      <Svg
        width={RING_SIZE}
        height={RING_SIZE}
        style={{ transform: [{ rotate: '-90deg' }] }}
      >
        {/* Track */}
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={STROKE_WIDTH}
        />
        {/* Progress arc */}
        {!isInactive && dashArray > 0 && (
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={ringColor}
            strokeWidth={STROKE_WIDTH}
            strokeDasharray={`${dashArray} ${CIRCUMFERENCE}`}
            strokeLinecap="round"
          />
        )}
      </Svg>

      {/* Center value */}
      <View style={styles.ringCenter} pointerEvents="none">
        <Text style={[styles.ringVal, { color: valColor }]}>{val}</Text>
      </View>

      {/* Label below ring */}
      <Text style={styles.ringLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

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
// MAIN COMPONENT
// ============================================================================

export function ProgressRings({
  todayStats,
  enabledBuckets,
  instances,
  nextUp,
  selectedCategory,
  onRingPress,
}: ProgressRingsProps) {
  const { colors } = useTheme();

  const tileItems: TileItem[] = useMemo(() => {
    const buckets = enabledBuckets.length > 0 ? enabledBuckets : PRIMARY_BUCKETS;
    const items = buckets
      .filter(b => BUCKET_TILE_MAP[b])
      .map(b => ({ bucket: b, ...BUCKET_TILE_MAP[b] }));
    const customStat = todayStats.custom;
    if (customStat && customStat.total > 0 && !buckets.includes('custom' as BucketType)) {
      items.push({ bucket: 'custom' as BucketType, ...BUCKET_TILE_MAP.custom });
    }
    return items;
  }, [enabledBuckets, todayStats.custom]);

  let criticalTileCount = 0;

  return (
    <View style={styles.strip}>
      {tileItems.map(item => {
        const stat: StatData = todayStats[item.statKey] ?? { completed: 0, total: 0 };
        const pct = stat.total > 0 ? (stat.completed / stat.total) * 100 : 0;
        const isInactive = stat.total === 0;
        const isSelected = selectedCategory === item.bucket;

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
          : {
              status: 'NOT_APPLICABLE' as UrgencyStatus,
              tier: 'info' as UrgencyTier,
              tone: 'neutral' as UrgencyTone,
              label: '',
              isCritical: false,
            };

        if (urgencyResult.isCritical) criticalTileCount++;

        const val = stat.total > 0
          ? pct === 100 ? '✓' : `${stat.completed}/${stat.total}`
          : '—';

        const ringColor = BUCKET_RING_COLOR[item.bucket] || colors.accent;

        return (
          <Ring
            key={item.bucket}
            pct={pct}
            color={ringColor}
            label={item.label}
            val={val}
            isSelected={isSelected}
            isInactive={isInactive}
            urgencyTone={urgencyResult.tone}
            onPress={() => onRingPress?.(item.bucket)}
          />
        );
      })}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 4,
  },
  ringWrapper: {
    alignItems: 'center',
    padding: 6,
    minWidth: 70,
  },
  ringCenter: {
    position: 'absolute',
    top: 6,
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringVal: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  ringLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: 'rgba(238,242,255,0.45)',
    textTransform: 'uppercase',
    marginTop: 5,
  },
});
