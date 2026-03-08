// ============================================================================
// PATTERNS SHEET
// Full-screen modal showing all correlation cards (not just top 3)
// ============================================================================

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { GlassCard } from '../aurora/GlassCard';
import type { CorrelationCard, ConfidenceLevel } from '../../utils/understandInsights';

// ============================================================================
// TYPES
// ============================================================================

interface PatternsSheetProps {
  visible: boolean;
  onClose: () => void;
  correlationCards: CorrelationCard[];
  timeRange: number;
}

// ============================================================================
// CONFIDENCE BADGE (inline — matches Understand tab style)
// ============================================================================

function ConfidenceBadge({ level, colors }: { level: ConfidenceLevel; colors: typeof Colors }) {
  const config = {
    strong: { color: colors.sageStrong, bg: colors.sageBorder },
    emerging: { color: colors.amberBrightStrong, bg: 'rgba(251, 191, 36, 0.15)' },
    early: { color: 'rgba(148, 163, 184, 0.8)', bg: 'rgba(148, 163, 184, 0.15)' },
  };

  const labels = {
    strong: 'Strong pattern',
    emerging: 'Emerging pattern',
    early: 'Emerging pattern',
  };

  const { color, bg } = config[level];

  return (
    <View style={[styles.confidenceBadge, { backgroundColor: bg }]}>
      <View style={[styles.confidenceDot, { backgroundColor: color }]} />
      <Text style={[styles.confidenceText, { color }]}>{labels[level]}</Text>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PatternsSheet({ visible, onClose, correlationCards, timeRange }: PatternsSheetProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>All Patterns</Text>
              <Text style={styles.subtitle}>
                {correlationCards.length} pattern{correlationCards.length !== 1 ? 's' : ''} detected over {timeRange} days
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close patterns sheet"
            >
              <Text style={styles.closeText}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Pattern Cards */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {correlationCards.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No patterns yet</Text>
                <Text style={styles.emptyText}>
                  Keep tracking to reveal connections in your data.
                </Text>
              </View>
            ) : (
              correlationCards.map((card) => (
                <GlassCard key={card.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{card.title}</Text>
                    <ConfidenceBadge level={card.confidence} colors={colors} />
                  </View>
                  <Text style={styles.cardInsight}>{card.insight}</Text>
                  <Text style={styles.cardDataPoints}>
                    Based on {card.dataPoints} days of data
                  </Text>
                  {card.suggestion && !card.suggestionDismissed && (
                    <View style={styles.suggestionContainer}>
                      <Text style={styles.suggestionLabel}>You could try</Text>
                      <Text style={styles.suggestionText}>{card.suggestion}</Text>
                    </View>
                  )}
                </GlassCard>
              ))
            )}

            {/* Disclaimer */}
            {correlationCards.length > 0 && (
              <Text style={styles.disclaimer}>
                Patterns suggest connections, not causes. Discuss with your care team before making changes.
              </Text>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: c.textSecondary,
  },
  closeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  closeText: {
    fontSize: 16,
    fontWeight: '600',
    color: c.accent,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.xl,
    gap: 12,
  },

  // Cards
  card: {
    padding: 16,
    backgroundColor: c.glassFaint,
    borderColor: c.glassActive,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textPrimary,
  },
  cardInsight: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.75)',
    lineHeight: 21,
    marginBottom: 8,
  },
  cardDataPoints: {
    fontSize: 11,
    color: c.textMuted,
  },

  // Suggestion
  suggestionContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  suggestionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: c.amberBrightStrong,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  suggestionText: {
    fontSize: 13,
    color: c.textTertiary,
    lineHeight: 19,
    fontStyle: 'italic',
  },

  // Confidence Badge
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 5,
  },
  confidenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  confidenceText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: c.textSecondary,
    textAlign: 'center',
  },

  // Disclaimer
  disclaimer: {
    fontSize: 11,
    color: c.textHalf,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingTop: 12,
  },
});
