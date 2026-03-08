// ============================================================================
// AI INSIGHT CARD - Displays pattern-based, supportive insights
// Read-only, non-nagging, confidence-filtered
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { AIInsight, InsightType } from '../../utils/insightRules';
import { ComponentRole } from '../../types/componentRoles';

// ============================================================================
// TYPES
// ============================================================================

export interface AIInsightCardProps {
  /** The insight to display */
  insight: AIInsight;

  /** Number of additional insights available */
  additionalCount?: number;

  /** Press handler for "see more" action */
  onSeeMore?: () => void;

  /** Component role (always 'display' for insights) */
  __role?: ComponentRole;

  /** Show compact variant */
  compact?: boolean;

  /** Additional container styles */
  style?: ViewStyle;

  /** Test ID for testing */
  testID?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const AIInsightCard: React.FC<AIInsightCardProps> = ({
  insight,
  additionalCount = 0,
  onSeeMore,
  __role = 'display',
  compact = false,
  style,
  testID,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const typeColors = getTypeColors(insight.type, colors);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: typeColors.background, borderColor: typeColors.border },
        compact && styles.containerCompact,
        style,
      ]}
      accessible={true}
      accessibilityRole="none"
      accessibilityLabel={`Insight: ${insight.title}. ${insight.message}`}
      testID={testID}
    >
      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: typeColors.iconBackground }]}>
        <Text style={styles.icon}>{insight.icon}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: typeColors.accent }]}>
            {getTypeLabel(insight.type)}
          </Text>
          {insight.confidence >= 0.9 && (
            <View style={styles.confidenceBadge}>
              <Text style={styles.confidenceText}>High confidence</Text>
            </View>
          )}
        </View>

        <Text style={styles.title}>{insight.title}</Text>
        <Text style={[styles.message, compact && styles.messageCompact]}>
          {insight.message}
        </Text>
      </View>

      {/* Badge for additional insights */}
      {additionalCount > 0 && (
        <TouchableOpacity
          style={styles.badge}
          onPress={onSeeMore}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`${additionalCount} more insights`}
          accessibilityHint="Tap to see more insights"
        >
          <Text style={styles.badgeText}>+{additionalCount}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ============================================================================
// LOADING STATE
// ============================================================================

export const AIInsightCardLoading: React.FC<{
  compact?: boolean;
  style?: ViewStyle;
}> = ({ compact = false, style }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
  <View style={[styles.container, styles.containerLoading, compact && styles.containerCompact, style]}>
    <View style={[styles.iconContainer, styles.iconLoading]}>
      <Text style={styles.icon}>✨</Text>
    </View>
    <View style={styles.content}>
      <Text style={styles.label}>ANALYZING</Text>
      <Text style={styles.loadingText}>Looking for patterns...</Text>
    </View>
  </View>
  );
};

// ============================================================================
// EMPTY STATE
// ============================================================================

export const AIInsightCardEmpty: React.FC<{
  message?: string;
  compact?: boolean;
  style?: ViewStyle;
}> = ({
  message = 'No patterns detected right now',
  compact = false,
  style,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
  <View style={[styles.container, styles.containerEmpty, compact && styles.containerCompact, style]}>
    <View style={[styles.iconContainer, styles.iconEmpty]}>
      <Text style={styles.icon}>✓</Text>
    </View>
    <View style={styles.content}>
      <Text style={[styles.label, { color: colors.green }]}>ALL GOOD</Text>
      <Text style={styles.title}>Everything on track</Text>
      <Text style={[styles.message, compact && styles.messageCompact]}>{message}</Text>
    </View>
  </View>
  );
};

// ============================================================================
// HELPERS
// ============================================================================

function getTypeColors(type: InsightType, c: typeof Colors): {
  background: string;
  border: string;
  accent: string;
  iconBackground: string;
} {
  switch (type) {
    case 'reinforcement':
      return {
        background: c.greenLight,
        border: c.greenBorder,
        accent: c.green,
        iconBackground: c.greenMuted,
      };
    case 'dependency':
      return {
        background: c.amberLight,
        border: c.amberBorder,
        accent: c.amber,
        iconBackground: c.amberMuted,
      };
    case 'pattern':
      return {
        background: c.purpleLight,
        border: c.purpleBorder,
        accent: c.purple,
        iconBackground: c.purpleWash,
      };
    case 'contextual':
    default:
      return {
        background: c.accentLight,
        border: c.accentBorder,
        accent: c.accent,
        iconBackground: c.borderMedium,
      };
  }
}

function getTypeLabel(type: InsightType): string {
  switch (type) {
    case 'reinforcement':
      return 'DOING GREAT';
    case 'dependency':
      return 'TIP';
    case 'pattern':
      return 'PATTERN';
    case 'contextual':
      return 'INSIGHT';
    default:
      return 'INSIGHT';
  }
}

// ============================================================================
// STYLES
// ============================================================================

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md + 2,
    padding: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  containerCompact: {
    padding: 10,
  },
  containerLoading: {
    backgroundColor: c.glass,
    borderColor: c.glassBorder,
  },
  containerEmpty: {
    backgroundColor: c.greenLight,
    borderColor: c.greenBorder,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  iconLoading: {
    backgroundColor: c.glassActive,
  },
  iconEmpty: {
    backgroundColor: c.greenMuted,
  },
  icon: {
    fontSize: 22,
  },
  content: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  confidenceBadge: {
    backgroundColor: c.glassSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  confidenceText: {
    fontSize: 9,
    fontWeight: '500',
    color: c.textSecondary,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 4,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    color: c.textSecondary,
  },
  messageCompact: {
    fontSize: 12,
    lineHeight: 16,
  },
  loadingText: {
    fontSize: 13,
    color: c.textMuted,
    fontStyle: 'italic',
  },
  badge: {
    backgroundColor: c.glassStrong,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textPrimary,
  },
});

export default AIInsightCard;
