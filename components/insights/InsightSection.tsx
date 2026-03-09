// ============================================================================
// INSIGHT SECTION — Groups insight cards under a category header
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors, Spacing } from '../../theme/theme-tokens';
import { InsightCard } from './InsightCard';
import type { InsightText, InsightCategory } from '../../types/insightText';

const SECTION_CONFIG: Record<InsightCategory, { title: string; icon: string }> = {
  watch: { title: 'Something to watch', icon: '\u26A0\uFE0F' },
  improving: { title: 'Improving', icon: '\u2705' },
  missing: { title: 'Missing data', icon: '\u2753' },
  pattern: { title: 'Patterns noticed', icon: '\uD83D\uDD0D' },
};

interface Props {
  category: InsightCategory;
  insights: InsightText[];
}

const SECTION_DOT_COLOR: Record<InsightCategory, (c: typeof Colors) => string> = {
  watch: (c) => c.redBright,
  improving: (c) => c.green,
  pattern: (c) => c.accent,
  missing: (c) => c.textMuted,
};

export function InsightSection({ category, insights }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const config = SECTION_CONFIG[category];
  const dotColor = SECTION_DOT_COLOR[category](colors);

  if (insights.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionHeaderBar, { backgroundColor: dotColor }]} />
        <Text style={[styles.sectionTitle, { color: dotColor }]}>
          {config.title.toUpperCase()}
        </Text>
      </View>
      {insights.map(insight => (
        <InsightCard
          key={insight.id}
          insight={insight}
          expandable={category === 'pattern'}
        />
      ))}
    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  sectionHeaderBar: {
    width: 3,
    height: 16,
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2.5,
  },
});
