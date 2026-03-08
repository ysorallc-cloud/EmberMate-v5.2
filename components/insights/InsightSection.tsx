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

export function InsightSection({ category, insights }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const config = SECTION_CONFIG[category];

  if (insights.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {config.icon}  {config.title}
      </Text>
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
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: Spacing.sm,
  },
});
