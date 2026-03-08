// ============================================================================
// INSIGHT CARD - AI-driven insights about care activities
// Shows medication adherence, patterns, and refill risks
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { getAllInsights, Insight } from '../../utils/insights';
import { Medication } from '../../utils/medicationStorage';
import { logError } from '../../utils/devLog';

interface InsightCardProps {
  medications: Medication[];
}

export const InsightCard: React.FC<InsightCardProps> = ({ medications }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInsights();
  }, [medications]);

  const loadInsights = async () => {
    try {
      const data = await getAllInsights(medications);
      setInsights(data);
    } catch (error) {
      logError('InsightCard.loadInsights', error);
    } finally {
      setLoading(false);
    }
  };

  // Show primary insight or default message
  const primaryInsight = insights[0];

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>AI INSIGHTS</Text>
        <Text style={styles.placeholder}>Analyzing patterns...</Text>
      </View>
    );
  }

  if (!primaryInsight) {
    return (
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>✨</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.label}>AI INSIGHTS</Text>
          <Text style={styles.title}>Everything looks good</Text>
          <Text style={styles.description}>
            Medications on track, no patterns detected
          </Text>
        </View>
      </View>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return colors.red;
      case 'medium':
        return colors.gold;
      default:
        return colors.accent;
    }
  };

  const getBorderColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return colors.redBorder;
      case 'medium':
        return colors.goldBorder;
      default:
        return colors.border;
    }
  };

  const getBackgroundColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return colors.redFaint;
      case 'medium':
        return colors.goldLight;
      default:
        return colors.sageDim;
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: getBackgroundColor(primaryInsight.priority),
          borderColor: getBorderColor(primaryInsight.priority),
        },
      ]}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{primaryInsight.icon}</Text>
      </View>

      <View style={styles.content}>
        <Text
          style={[
            styles.label,
            { color: getPriorityColor(primaryInsight.priority) },
          ]}
        >
          AI INSIGHTS
        </Text>
        <Text style={styles.title}>{primaryInsight.title}</Text>
        <Text style={styles.description}>{primaryInsight.description}</Text>
        {primaryInsight.action && (
          <Text style={styles.action}>→ {primaryInsight.action}</Text>
        )}
      </View>

      {insights.length > 1 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>+{insights.length - 1}</Text>
        </View>
      )}
    </View>
  );
};

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: c.glassActive,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 22,
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
    color: c.accent, // Default color for visibility
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    color: c.textSecondary,
    marginBottom: 2,
  },
  action: {
    fontSize: 12,
    color: c.accent,
    marginTop: 4,
    fontWeight: '500',
  },
  placeholder: {
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
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textPrimary,
  },
});
