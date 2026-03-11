import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../contexts/ThemeContext';

interface LegendItem {
  color: string;
  label: string;
}

interface DadOrbStats {
  meds:   { done: number; total: number };
  vitals: { done: number; total: number };
  meals:  { done: number; total: number };
  check:  { done: number; total: number };
}

interface DadOrbProps {
  patientName: string;
  stats: DadOrbStats;
  lastCompleted?: { label: string; time: string } | null;
  legend?: LegendItem[];
}

const RING_COLORS = {
  meds:   { solid: '#5B8A6A', track: 'rgba(91,138,106,0.08)' },
  vitals: { solid: '#67B8A7', track: 'rgba(103,184,167,0.08)' },
  meals:  { solid: '#D4A853', track: 'rgba(212,168,83,0.08)' },
  check:  { solid: '#EC4899', track: 'rgba(236,72,153,0.08)' },
};

const RING_RADII = [62, 52, 42, 32];
const STROKE_WIDTH = 5.5;

export function DadOrb({ patientName, stats, lastCompleted, legend }: DadOrbProps) {
  const { colors } = useTheme();

  const overallDone = stats.meds.done + stats.vitals.done + stats.meals.done + stats.check.done;
  const overallTotal = stats.meds.total + stats.vitals.total + stats.meals.total + stats.check.total;

  const statusText = overallDone >= overallTotal && overallTotal > 0
    ? 'All taken care of'
    : overallDone >= overallTotal * 0.7
    ? 'On track today'
    : overallDone >= overallTotal * 0.4
    ? 'Making progress'
    : 'Getting started';

  const statusColor = overallDone >= overallTotal && overallTotal > 0 ? colors.accentGradientEnd : colors.textPrimary;

  const rings = [
    { key: 'meds',   r: RING_RADII[0], color: RING_COLORS.meds,   stat: stats.meds },
    { key: 'vitals', r: RING_RADII[1], color: RING_COLORS.vitals, stat: stats.vitals },
    { key: 'meals',  r: RING_RADII[2], color: RING_COLORS.meals,  stat: stats.meals },
    { key: 'check',  r: RING_RADII[3], color: RING_COLORS.check,  stat: stats.check },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.orbWrapper}>
        <Svg width={140} height={140} viewBox="0 0 140 140" style={styles.svg}>
          {/* Track rings */}
          {rings.map(({ key, r, color }) => (
            <Circle key={`track-${key}`} cx={70} cy={70} r={r} fill="none" stroke={color.track} strokeWidth={STROKE_WIDTH} />
          ))}
          {/* Progress rings */}
          {rings.map(({ key, r, color, stat }) => {
            const circ = 2 * Math.PI * r;
            const pct = stat.total > 0 ? Math.min(stat.done / stat.total, 1) : 0;
            if (pct === 0) return null;
            return (
              <Circle
                key={`prog-${key}`}
                cx={70} cy={70} r={r}
                fill="none" stroke={color.solid}
                strokeWidth={STROKE_WIDTH} strokeLinecap="round"
                strokeDasharray={`${circ}`}
                strokeDashoffset={circ * (1 - pct)}
              />
            );
          })}
        </Svg>
        {/* Avatar center */}
        <View style={[styles.avatar, {
          backgroundColor: colors.heroGradMid,
          borderColor: colors.accentBorder,
        }]}>
          <Text style={[styles.avatarText, { color: colors.amber }]}>
            {patientName !== 'Patient' ? patientName : 'Care'}
          </Text>
        </View>
      </View>

      {/* Status */}
      <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>

      {/* Legend */}
      {legend && legend.length > 0 && (
        <View style={styles.legend}>
          {legend.map((item) => (
            <View key={item.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>{item.label}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 6,
  },
  orbWrapper: {
    width: 140,
    height: 140,
    position: 'relative',
  },
  svg: {
    transform: [{ rotate: '-90deg' }],
  },
  avatar: {
    position: 'absolute',
    top: 48,
    left: 48,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  statusText: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendLabel: {
    fontSize: 11,
  },
});
