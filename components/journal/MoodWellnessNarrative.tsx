import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import type { MoodDetail } from '../../utils/careSummaryBuilder';

interface Props {
  mood: MoodDetail;
}

export function MoodWellnessNarrative({ mood }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const hasContent = mood.entries.length > 0 || mood.morningWellness || mood.eveningWellness;
  if (!hasContent) return null;

  const parts: React.ReactNode[] = [];

  // Morning wellness
  if (mood.morningWellness) {
    const mw = mood.morningWellness;
    let morningText = `Morning wellness check: Sleep ${mw.sleepQuality}/5, Mood ${mw.mood}.`;
    if (mw.orientation && mw.orientation !== 'Alert & Oriented') {
      morningText = `Morning wellness check: Sleep ${mw.sleepQuality}/5, Mood ${mw.mood}. Orientation: ${mw.orientation}.`;
    }
    parts.push(
      <Text key="morning" style={styles.narrative}>{morningText}</Text>
    );
  }

  // Mood trajectory from wellness checks
  const wellnessMoodEntries = mood.entries.filter(e => e.source === 'morning-wellness' || e.source === 'evening-wellness');
  if (wellnessMoodEntries.length > 1) {
    const first = wellnessMoodEntries[0].label;
    const last = wellnessMoodEntries[wellnessMoodEntries.length - 1].label;
    if (first !== last) {
      parts.push(
        <Text key="mood-arc" style={styles.narrative}>
          Mood: <Text style={styles.bold}>{first} {'\u2192'} {last}</Text>.
        </Text>
      );
    }
  }

  // Evening wellness
  if (mood.eveningWellness) {
    const ew = mood.eveningWellness;
    let eveningText = `Evening wellness check: Day rated ${ew.dayRating}/5.`;
    if (ew.painLevel && ew.painLevel !== 'None') {
      eveningText += ` Pain: ${ew.painLevel}.`;
    }
    parts.push(
      <Text key="evening" style={styles.narrative}>{eveningText}</Text>
    );
  } else if (new Date().getHours() >= 20) {
    parts.push(
      <Text key="no-evening" style={[styles.narrative, styles.muted]}>
        No evening wellness check yet.
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
  muted: {
    color: c.textMuted,
    fontStyle: 'italic',
  },
});
