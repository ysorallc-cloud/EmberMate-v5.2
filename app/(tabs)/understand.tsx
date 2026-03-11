// ============================================================================
// UNDERSTAND PAGE - "Insights" — plain-language insight sections
//
// Layout:
// 1. Time range selector (7d / 14d / 30d)
// 2. Watch — things that need attention
// 3. Improving — positive trends
// 4. Missing — data gaps
// 5. Patterns — correlations in plain language
// ============================================================================

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { navigate } from '../../lib/navigate';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { AuroraBackground } from '../../components/aurora/AuroraBackground';
import { ScreenHeader } from '../../components/ScreenHeader';
import { TimeRange } from '../../utils/understandInsights';
import { logError } from '../../utils/devLog';
import { useDataListener } from '../../lib/events';
import { generateAllInsights, InsightResults, computePeriodSummary, PeriodSummary } from '../../utils/insightTextGenerator';
import { InsightSection } from '../../components/insights/InsightSection';
import { getOrCreateCarePlanConfig } from '../../storage/carePlanConfigRepo';

// ============================================================================
// TIME RANGE TOGGLE
// ============================================================================

function TimeRangeToggle({ value, onChange }: { value: TimeRange; onChange: (r: TimeRange) => void }) {
  const options: { range: TimeRange; label: string }[] = [
    { range: 7, label: '7d' },
    { range: 14, label: '14d' },
    { range: 30, label: '30d' },
  ];

  return (
    <View style={_styles.timeRangeContainer}>
      {options.map(({ range, label }) => (
        <TouchableOpacity
          key={range}
          style={[_styles.timeRangePill, value === range && _styles.timeRangePillActive]}
          onPress={() => onChange(range)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`${label} range`}
          accessibilityState={{ selected: value === range }}
        >
          <Text style={[_styles.timeRangeText, value === range && _styles.timeRangeTextActive]}>
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const _styles = StyleSheet.create({
  timeRangeContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 6,
    padding: 2,
  },
  timeRangePill: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  timeRangePillActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  timeRangeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  timeRangeTextActive: {
    color: Colors.textPrimary,
  },
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function UnderstandScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>(14);
  const [insights, setInsights] = useState<InsightResults | null>(null);
  const [summary, setSummary] = useState<PeriodSummary | null>(null);

  const loadInsights = useCallback(async () => {
    try {
      setLoading(true);
      const config = await getOrCreateCarePlanConfig('default');
      const [results, periodSummary] = await Promise.all([
        generateAllInsights(config, timeRange),
        computePeriodSummary(timeRange),
      ]);
      setInsights(results);
      setSummary(periodSummary);
    } catch (err) {
      logError('Insights.loadInsights', err);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useFocusEffect(
    useCallback(() => {
      loadInsights();
    }, [loadInsights])
  );

  useDataListener(loadInsights);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInsights();
    setRefreshing(false);
  }, [loadInsights]);

  const periodEnd = new Date();
  const periodStart = new Date();
  periodStart.setDate(periodEnd.getDate() - timeRange);
  const periodLabel = `${periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} \u2013 ${periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  return (
    <View style={styles.container}>
      <AuroraBackground variant="hub" />

      <View style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 8 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
        >
          {/* Header */}
          <ScreenHeader
            title="Insights"
            subtitle={periodLabel}
            purpose="Patterns and trends over time."
            rightAction={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <TimeRangeToggle value={timeRange} onChange={setTimeRange} />
                <TouchableOpacity
                  onPress={() => navigate('/settings')}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Settings"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <View style={styles.settingsGear}>
                    <Text style={styles.settingsGearText}>{'\u2699\uFE0F'}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            }
          />

          {/* Insight Sections */}
          {loading ? (
            <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
          ) : insights ? (
            <View style={styles.insightSections}>
              {/* Period Summary */}
              {summary && summary.totalInstances > 0 && (
                <View style={styles.summaryCard}>
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryStat}>
                      <Text style={styles.summaryValue}>{summary.completionRate}%</Text>
                      <Text style={styles.summaryLabel}>Completed</Text>
                    </View>
                    <View style={styles.summaryStat}>
                      <Text style={styles.summaryValue}>{summary.activeDays}/{summary.totalDays}</Text>
                      <Text style={styles.summaryLabel}>Active days</Text>
                    </View>
                    <View style={styles.summaryStat}>
                      <Text style={styles.summaryValue}>{summary.totalInstances}</Text>
                      <Text style={styles.summaryLabel}>Tasks logged</Text>
                    </View>
                  </View>
                </View>
              )}
              <InsightSection category="watch" insights={insights.watch} />
              <InsightSection category="improving" insights={insights.improving} />
              <InsightSection category="pattern" insights={insights.patterns} />
              <InsightSection category="missing" insights={insights.missing} />

              {/* Empty state */}
              {insights.watch.length === 0 &&
               insights.improving.length === 0 &&
               insights.patterns.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>{'\uD83D\uDCCA'}</Text>
                  <Text style={styles.emptyTitle}>Insights are building</Text>
                  <Text style={styles.emptyBody}>
                    Keep logging for a few more days and patterns will start to appear here.
                  </Text>
                </View>
              )}
            </View>
          ) : null}

          {/* Footer */}
          <Text style={styles.footerNote}>
            Analysis based on {timeRange} days of data {'\u00B7'} Not a medical diagnosis
          </Text>

          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // Settings gear
  settingsGear: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.glassBorder,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  settingsGearText: {
    fontSize: 18,
  },

  // Period summary
  summaryCard: {
    backgroundColor: c.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.glassBorder,
    padding: 20,
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
  },
  summaryStat: {
    alignItems: 'center' as const,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '600' as const,
    color: c.textPrimary,
    letterSpacing: -0.5,
  },
  summaryLabel: {
    fontSize: 11,
    color: c.textMuted,
    marginTop: 6,
    letterSpacing: 0.5,
  },

  // Insight sections
  insightSections: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // Empty state
  emptyState: {
    alignItems: 'center' as const,
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptyBody: {
    fontSize: 14,
    color: c.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
    lineHeight: 20,
  },

  // Footer
  footerNote: {
    fontSize: 11,
    color: c.textTertiary,
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
});
