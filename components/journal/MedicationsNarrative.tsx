import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import type { MedicationDetail } from '../../utils/careSummaryBuilder';

interface Props {
  medications: MedicationDetail[];
  showPurpose?: boolean;
}

function formatTime(isoOrHHmm: string): string {
  try {
    const date = new Date(isoOrHHmm);
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
  } catch { /* fall through */ }
  return isoOrHHmm;
}

export function MedicationsNarrative({ medications, showPurpose }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (medications.length === 0) return null;

  const completed = medications.filter(m => m.status === 'completed');
  const pending = medications.filter(m => m.status === 'pending');
  const skipped = medications.filter(m => m.status === 'skipped');
  const missed = medications.filter(m => m.status === 'missed');
  const allCompleted = completed.length === medications.length;

  const parts: React.ReactNode[] = [];

  if (allCompleted) {
    const details = completed.map(m => {
      const time = m.takenAt ? formatTime(m.takenAt) : formatTime(m.scheduledTime);
      return `${m.name}${m.dosage ? ` ${m.dosage}` : ''} at ${time}`;
    }).join(', ');
    parts.push(
      <Text key="all" style={styles.narrative}>
        <Text style={styles.bold}>All medications taken today.</Text> {details}.
      </Text>
    );
  } else {
    completed.forEach((m, i) => {
      const time = m.takenAt ? formatTime(m.takenAt) : formatTime(m.scheduledTime);
      parts.push(
        <Text key={`c-${i}-${m.name}`} style={styles.narrative}>
          <Text style={styles.bold}>{m.name}</Text>
          {m.dosage ? ` ${m.dosage}` : ''} taken at {time}.
        </Text>
      );
    });
    pending.forEach((m, i) => {
      parts.push(
        <Text key={`p-${i}-${m.name}`} style={styles.narrative}>
          <Text style={styles.bold}>{m.name}</Text>
          {m.dosage ? ` ${m.dosage}` : ''} scheduled for {formatTime(m.scheduledTime)}{' \u2014 '}
          <Text style={styles.flagged}>not yet logged.</Text>
        </Text>
      );
    });
    [...skipped, ...missed].forEach((m, i) => {
      parts.push(
        <Text key={`s-${i}-${m.name}`} style={styles.narrative}>
          <Text style={styles.bold}>{m.name}</Text>
          {m.dosage ? ` ${m.dosage}` : ''}{' \u2014 '}skipped.
        </Text>
      );
    });
  }

  // Side effects
  const withSideEffects = medications.filter(m => m.sideEffects && m.sideEffects.length > 0);
  if (withSideEffects.length > 0) {
    const effects = withSideEffects.flatMap(m => m.sideEffects!);
    parts.push(
      <Text key="effects" style={[styles.narrative, { marginTop: 4 }]}>
        Side effects noted: {effects.join(', ')}.
      </Text>
    );
  }

  return (
    <View style={styles.card}>
      {parts}
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
    marginBottom: 2,
  },
  bold: {
    fontWeight: '600',
    color: c.textPrimary,
  },
  flagged: {
    color: c.amber,
  },
});
