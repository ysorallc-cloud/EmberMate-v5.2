// ============================================================================
// INSIGHT SECTION — Groups insight cards under a collapsible category header
// ============================================================================

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { InsightCard } from './InsightCard';
import { CollapsibleSection } from '../common/CollapsibleSection';
import type { InsightText, InsightCategory } from '../../types/insightText';
import { Spacing } from '../../theme/theme-tokens';

const SECTION_CONFIG: Record<InsightCategory, { title: string }> = {
  watch: { title: 'Something to watch' },
  improving: { title: 'Improving' },
  missing: { title: 'Missing data' },
  pattern: { title: 'Patterns noticed' },
};

interface Props {
  category: InsightCategory;
  insights: InsightText[];
}

export function InsightSection({ category, insights }: Props) {
  if (insights.length === 0) return null;

  const config = SECTION_CONFIG[category];
  const defaultExpanded = category === 'watch';

  return (
    <View style={styles.section}>
      <CollapsibleSection
        title={config.title}
        badge={`${insights.length}`}
        defaultExpanded={defaultExpanded}
      >
        {insights.map(insight => (
          <InsightCard
            key={insight.id}
            insight={insight}
            expandable={category === 'pattern'}
          />
        ))}
      </CollapsibleSection>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.lg,
  },
});
