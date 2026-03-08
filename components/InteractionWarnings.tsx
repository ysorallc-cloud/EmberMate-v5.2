import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DrugInteraction } from '../utils/drugInteractions';
import { Colors, Spacing } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';

interface InteractionWarningsProps {
  interactions: DrugInteraction[];
}

export default function InteractionWarnings({ interactions }: InteractionWarningsProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return colors.red;
      case 'moderate':
        return colors.amber;
      case 'low':
        return colors.gold;
      default:
        return colors.textSecondary;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return '\u26A0\uFE0F';
      case 'moderate':
        return '\u26A1';
      case 'low':
        return '\u2139\uFE0F';
      default:
        return '\u2022';
    }
  };

  // Group by severity
  const highRisk = interactions.filter(i => i.severity === 'high');
  const moderateRisk = interactions.filter(i => i.severity === 'moderate');
  const lowRisk = interactions.filter(i => i.severity === 'low');

  const renderInteractionGroup = (
    title: string,
    items: DrugInteraction[],
    severity: 'high' | 'moderate' | 'low'
  ) => {
    if (items.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {items.map((interaction, index) => (
          <View
            key={index}
            style={[
              styles.interactionCard,
              { borderLeftColor: getSeverityColor(severity) }
            ]}
          >
            <View style={styles.interactionHeader}>
              <Text style={styles.severityIcon}>
                {getSeverityIcon(severity)}
              </Text>
              <Text style={styles.drugNames}>
                {interaction.drug1} + {interaction.drug2}
              </Text>
            </View>

            <Text style={styles.description}>
              {interaction.description}
            </Text>

            <View style={styles.recommendationBox}>
              <Text style={styles.recommendationLabel}>Recommendation:</Text>
              <Text style={styles.recommendation}>
                {interaction.recommendation}
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderInteractionGroup('High Risk Interactions', highRisk, 'high')}
      {renderInteractionGroup('Moderate Risk Interactions', moderateRisk, 'moderate')}
      {renderInteractionGroup('Low Risk Interactions', lowRisk, 'low')}
    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    gap: Spacing.lg,
  },
  section: {
    gap: Spacing.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: c.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  interactionCard: {
    backgroundColor: c.surface,
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  interactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  severityIcon: {
    fontSize: 20,
  },
  drugNames: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textPrimary,
    flex: 1,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: c.textSecondary,
  },
  recommendationBox: {
    backgroundColor: c.surfaceAlt,
    borderRadius: 8,
    padding: Spacing.sm,
    marginTop: Spacing.xs,
  },
  recommendationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 4,
  },
  recommendation: {
    fontSize: 13,
    lineHeight: 18,
    color: c.textSecondary,
  },
});
