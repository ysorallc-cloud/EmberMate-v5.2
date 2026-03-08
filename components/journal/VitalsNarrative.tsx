import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import type { VitalsDetail } from '../../utils/careSummaryBuilder';

interface Props {
  vitals: VitalsDetail;
  baselines?: Record<string, { range: string }> | null;
}

function formatTime(iso: string): string {
  try {
    const date = new Date(iso);
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
  } catch { /* fall through */ }
  return iso;
}

function buildReadingsString(readings: VitalsDetail['readings']): string {
  if (!readings) return '';
  const parts: string[] = [];
  if (readings.systolic != null && readings.diastolic != null) {
    parts.push(`BP ${readings.systolic}/${readings.diastolic}`);
  }
  if (readings.heartRate != null) parts.push(`HR ${readings.heartRate}`);
  if (readings.glucose != null) parts.push(`Glucose ${readings.glucose}`);
  if (readings.temperature != null) parts.push(`Temp ${readings.temperature}\u00B0`);
  if (readings.oxygen != null) parts.push(`O\u2082 ${readings.oxygen}%`);
  if (readings.weight != null) parts.push(`Weight ${readings.weight} lbs`);
  return parts.join(' \u00B7 ');
}

export function VitalsNarrative({ vitals, baselines }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!vitals.scheduled && !vitals.recorded) return null;

  let text: React.ReactNode;

  if (vitals.recorded && vitals.readings) {
    const readingsStr = buildReadingsString(vitals.readings);
    const timeStr = vitals.recordedAt ? ` recorded at ${formatTime(vitals.recordedAt)}` : '';
    const baselineParts: string[] = [];
    if (baselines) {
      if (baselines.systolic && vitals.readings.systolic != null) {
        baselineParts.push(`BP baseline: ${baselines.systolic.range}`);
      }
      if (baselines.heartRate && vitals.readings.heartRate != null) {
        baselineParts.push(`HR baseline: ${baselines.heartRate.range}`);
      }
      if (baselines.glucose && vitals.readings.glucose != null) {
        baselineParts.push(`Glucose baseline: ${baselines.glucose.range}`);
      }
    }
    text = (
      <>
        <Text style={styles.narrative}>
          <Text style={styles.bold}>{readingsStr}</Text>{timeStr}.
        </Text>
        {baselineParts.length > 0 && (
          <Text style={[styles.narrative, { marginTop: 4 }]}>
            {baselineParts.join(' \u00B7 ')}
          </Text>
        )}
      </>
    );
  } else if (vitals.scheduled && !vitals.recorded) {
    const timeStr = vitals.scheduledTime ? formatTime(vitals.scheduledTime) : 'today';
    text = (
      <Text style={styles.narrative}>
        Check vitals scheduled for {timeStr}{' \u2014 '}
        <Text style={styles.flagged}>not yet recorded.</Text>
      </Text>
    );
  } else if (vitals.recorded) {
    text = (
      <Text style={styles.narrative}>Vitals logged today.</Text>
    );
  }

  return (
    <View style={styles.card}>
      {text}
    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  card: {
    backgroundColor: c.glassHover,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  narrative: {
    fontSize: 14,
    color: c.textSecondary,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '600',
    color: c.textPrimary,
  },
  flagged: {
    color: c.amber,
  },
});
