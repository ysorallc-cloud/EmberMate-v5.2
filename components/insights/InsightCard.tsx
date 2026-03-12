// ============================================================================
// INSIGHT CARD — Plain-language insight display
// Simple card: icon + title + body text. No charts. No scores.
// ============================================================================

import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import type { InsightText } from '../../types/insightText';

interface Props {
  insight: InsightText;
  expandable?: boolean;
}

export function InsightCard({ insight, expandable = false }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [expanded, setExpanded] = useState(false);

  const severityColor = {
    watch: colors.amber,
    good: colors.accent,
    info: colors.textSecondary,
  }[insight.severity];

  const dotColor = {
    watch: colors.amber,
    good: colors.green,
    info: colors.textMuted,
  }[insight.severity];

  const Wrapper = expandable ? TouchableOpacity : View;

  return (
    <Wrapper
      style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.glassBorder }]}
      {...(expandable ? { onPress: () => setExpanded(!expanded) } : {})}
      accessibilityRole={expandable ? 'button' : undefined}
    >
      <View style={styles.header}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: severityColor }]}>
            {insight.title}
          </Text>
          <Text style={styles.body}>{insight.body}</Text>
          {insight.whyItMatters && (
            <Text style={styles.whyItMatters}>{insight.whyItMatters}</Text>
          )}
          {insight.pattern && (
            <View style={styles.patternRow}>
              <Text style={styles.patternIcon}>{'\uD83D\uDD17'}</Text>
              <Text style={styles.patternText}>{insight.pattern}</Text>
            </View>
          )}
        </View>
      </View>
      {expandable && expanded && insight.dateRange && (
        <View style={styles.expandedContent}>
          <Text style={styles.dateRange}>
            {insight.dateRange.start} — {insight.dateRange.end}
          </Text>
        </View>
      )}
    </Wrapper>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  body: {
    fontSize: 14,
    color: c.textSecondary,
    lineHeight: 20,
  },
  whyItMatters: {
    fontSize: 12,
    color: c.textSecondary,
    lineHeight: 18,
    marginTop: 8,
    fontStyle: 'italic' as const,
  },
  patternRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginTop: 8,
  },
  patternIcon: {
    fontSize: 12,
  },
  patternText: {
    fontSize: 12,
    color: c.accent,
    fontWeight: '500' as const,
  },
  expandedContent: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: c.glassBorder,
  },
  dateRange: {
    fontSize: 12,
    color: c.textMuted,
  },
});
