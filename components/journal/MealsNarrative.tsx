import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import type { MealsDetail } from '../../utils/careSummaryBuilder';

interface Props {
  meals: MealsDetail;
  fluidTarget?: number | null;
  swallowingIssues?: boolean | null;
  hydrationGlasses?: number | null;
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

export function MealsNarrative({ meals, fluidTarget, swallowingIssues, hydrationGlasses }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const hasHydration = hydrationGlasses != null && hydrationGlasses > 0;
  if (meals.total === 0 && !hasHydration) return null;

  const completed = meals.meals.filter(m => m.status === 'completed');
  const pending = meals.meals.filter(m => m.status === 'pending');
  const allCompleted = completed.length === meals.total;
  const noneCompleted = completed.length === 0;

  const parts: React.ReactNode[] = [];

  if (allCompleted) {
    const details = completed.map(m => {
      let desc = m.name;
      if (m.appetite) desc += ` (${m.appetite})`;
      return desc;
    }).join(', ');
    parts.push(
      <Text key="all" style={styles.narrative}>
        <Text style={styles.bold}>All meals logged today.</Text> {details}.
      </Text>
    );
  } else if (noneCompleted) {
    const names = pending.map(m => m.name).join(', ');
    parts.push(
      <Text key="none" style={styles.narrative}>
        No meals logged yet. {names} scheduled.
      </Text>
    );
  } else {
    for (const m of completed) {
      let text = `${m.name} logged`;
      if (m.appetite) text += ` (${m.appetite})`;
      text += '.';
      parts.push(
        <Text key={`c-${m.name}`} style={styles.narrative}>
          <Text style={styles.bold}>{m.name}</Text> logged{m.appetite ? ` (${m.appetite})` : ''}.
        </Text>
      );
    }
    for (const m of pending) {
      const timeStr = m.scheduledTime ? formatTime(m.scheduledTime) : 'today';
      parts.push(
        <Text key={`p-${m.name}`} style={styles.narrative}>
          <Text style={styles.bold}>{m.name}</Text> scheduled for {timeStr}{' \u2014 '}
          <Text style={styles.flagged}>not yet logged.</Text>
        </Text>
      );
    }
  }

  // Hydration tracking
  if (hasHydration) {
    const targetStr = fluidTarget ? ` / ${fluidTarget} oz target` : '';
    parts.push(
      <Text key="hydration" style={[styles.narrative, { marginTop: 4 }]}>
        Fluid intake: {hydrationGlasses} glasses{targetStr}.
      </Text>
    );
  }

  // Swallowing issues flag (Tier 3)
  if (swallowingIssues) {
    parts.push(
      <Text key="swallowing" style={[styles.narrative, styles.flagged, { marginTop: 4 }]}>
        Swallowing difficulties noted.
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
