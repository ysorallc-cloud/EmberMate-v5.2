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
    watch: '#FF6B6B',
    good: colors.accent,
    info: colors.textSecondary,
  }[insight.severity];

  const cardBorderColor = {
    watch: colors.redBorder,
    good: colors.greenBorder,
    info: colors.accentBorder,
  }[insight.severity];

  const cardBg = {
    watch: colors.redLight,
    good: colors.greenLight,
    info: colors.accentDim,
  }[insight.severity];

  const Wrapper = expandable ? TouchableOpacity : View;

  return (
    <Wrapper
      style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorderColor, borderLeftColor: cardBorderColor }]}
      {...(expandable ? { onPress: () => setExpanded(!expanded) } : {})}
      accessibilityRole={expandable ? 'button' : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.icon}>{insight.icon}</Text>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: severityColor }]}>
            {insight.title}
          </Text>
          <Text style={styles.body}>{insight.body}</Text>
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
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderLeftWidth: 3,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  icon: {
    fontSize: 20,
    marginTop: 2,
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
