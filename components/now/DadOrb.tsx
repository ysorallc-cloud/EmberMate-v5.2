import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated as RNAnimated } from 'react-native';
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
  const allDone = overallDone >= overallTotal && overallTotal > 0;

  const statusText = allDone
    ? 'All taken care of'
    : overallDone >= overallTotal * 0.7
    ? 'On track today'
    : overallDone >= overallTotal * 0.4
    ? 'Making progress'
    : 'Getting started';

  const statusColor = allDone ? colors.accentGradientEnd : colors.textPrimary;

  // Subtle pulse animation when all done
  const pulseAnim = useRef(new RNAnimated.Value(1)).current;

  useEffect(() => {
    if (allDone) {
      const pulse = RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(pulseAnim, { toValue: 1.06, duration: 2000, useNativeDriver: true }),
          RNAnimated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [allDone, pulseAnim]);

  const outerRadius = 62;
  const innerRadius = 50;
  const strokeWidth = 6;
  const outerCirc = 2 * Math.PI * outerRadius;
  const innerCirc = 2 * Math.PI * innerRadius;
  const medsPct = medsTotal > 0 ? Math.min(medsDone / medsTotal, 1) : 0;
  const carePct = careTotal > 0 ? Math.min(careDone / careTotal, 1) : 0;

  return (
    <View style={styles.container}>
      <RNAnimated.View style={[styles.orbWrapper, { transform: [{ scale: pulseAnim }] }]}>
        <Svg width={140} height={140} viewBox="0 0 140 140" style={styles.svg}>
          {/* Track rings */}
          <Circle cx={70} cy={70} r={outerRadius} fill="none" stroke="rgba(91,138,106,0.08)" strokeWidth={strokeWidth} />
          <Circle cx={70} cy={70} r={innerRadius} fill="none" stroke="rgba(212,168,83,0.08)" strokeWidth={strokeWidth} />
          {/* Meds ring (outer) */}
          {medsPct > 0 && (
            <Circle
              cx={70} cy={70} r={outerRadius}
              fill="none" stroke={colors.accent}
              strokeWidth={strokeWidth} strokeLinecap="round"
              strokeDasharray={`${outerCirc}`}
              strokeDashoffset={outerCirc * (1 - medsPct)}
            />
          )}
          {/* Care ring (inner) */}
          {carePct > 0 && (
            <Circle
              cx={70} cy={70} r={innerRadius}
              fill="none" stroke={colors.amber}
              strokeWidth={strokeWidth} strokeLinecap="round"
              strokeDasharray={`${innerCirc}`}
              strokeDashoffset={innerCirc * (1 - carePct)}
            />
          )}
        </Svg>
        {/* Avatar center */}
        <View style={[
          styles.avatar,
          {
            backgroundColor: colors.heroGradMid,
            borderColor: allDone ? colors.accent : colors.accentBorder,
          },
          allDone && {
            shadowColor: colors.accent,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.45,
            shadowRadius: 12,
            elevation: 8,
          },
        ]}>
          <Text style={[styles.avatarText, { color: allDone ? colors.accent : colors.amber }]}>
            {patientName !== 'Patient' ? patientName : 'Care'}
          </Text>
        </View>
      </RNAnimated.View>

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
    top: 36,
    left: 36,
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
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
