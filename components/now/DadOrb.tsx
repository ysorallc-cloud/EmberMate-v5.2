import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../contexts/ThemeContext';

interface LegendItem {
  color: string;
  label: string;
}

interface DadOrbProps {
  patientName: string;
  medsDone: number;
  medsTotal: number;
  careDone: number;
  careTotal: number;
  lastCompleted?: { label: string; time: string } | null;
  legend?: LegendItem[];
}

export function DadOrb({ patientName, medsDone, medsTotal, careDone, careTotal, lastCompleted, legend }: DadOrbProps) {
  const { colors } = useTheme();
  const overallDone = medsDone + careDone;
  const overallTotal = medsTotal + careTotal;

  const statusText = overallDone >= overallTotal && overallTotal > 0
    ? 'All taken care of'
    : overallDone >= overallTotal * 0.7
    ? 'On track today'
    : overallDone >= overallTotal * 0.4
    ? 'Making progress'
    : 'Getting started';

  const statusColor = overallDone >= overallTotal && overallTotal > 0 ? colors.accentGradientEnd : colors.textPrimary;

  const outerRadius = 72;
  const innerRadius = 58;
  const strokeWidth = 7;
  const outerCirc = 2 * Math.PI * outerRadius;
  const innerCirc = 2 * Math.PI * innerRadius;
  const medsPct = medsTotal > 0 ? Math.min(medsDone / medsTotal, 1) : 0;
  const carePct = careTotal > 0 ? Math.min(careDone / careTotal, 1) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.orbWrapper}>
        <Svg width={160} height={160} viewBox="0 0 160 160" style={styles.svg}>
          {/* Track rings */}
          <Circle cx={80} cy={80} r={outerRadius} fill="none" stroke="rgba(91,138,106,0.08)" strokeWidth={strokeWidth} />
          <Circle cx={80} cy={80} r={innerRadius} fill="none" stroke="rgba(212,168,83,0.08)" strokeWidth={strokeWidth} />
          {/* Meds ring (outer) */}
          <Circle
            cx={80} cy={80} r={outerRadius}
            fill="none" stroke={colors.accent}
            strokeWidth={strokeWidth} strokeLinecap="round"
            strokeDasharray={`${outerCirc}`}
            strokeDashoffset={outerCirc * (1 - medsPct)}
          />
          {/* Care ring (inner) */}
          <Circle
            cx={80} cy={80} r={innerRadius}
            fill="none" stroke={colors.amber}
            strokeWidth={strokeWidth} strokeLinecap="round"
            strokeDasharray={`${innerCirc}`}
            strokeDashoffset={innerCirc * (1 - carePct)}
          />
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
              <Text style={[styles.legendLabel, { color: colors.textMuted }]}>{item.label}</Text>
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
    width: 160,
    height: 160,
    position: 'relative',
  },
  svg: {
    transform: [{ rotate: '-90deg' }],
  },
  avatar: {
    position: 'absolute',
    top: 38,
    left: 38,
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  statusText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 14,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendLabel: {
    fontSize: 10,
  },
});
