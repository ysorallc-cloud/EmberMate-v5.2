// ============================================================================
// CORRELATION REPORT SCREEN
// Insights drill-down - analytical, not declarative
// Shows detected patterns with qualified language only
// 100% local processing - no database, no cloud
// ============================================================================

import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import { detectCorrelations, hasSufficientData, DetectedPattern } from '../utils/correlationDetector';
import { BackButton } from '../components/common/BackButton';
import { logError } from '../utils/devLog';

// Sample data for preview mode
const SAMPLE_PATTERNS: DetectedPattern[] = [
  {
    id: 'sample-sleep-mood',
    variable1: 'sleep',
    variable2: 'mood',
    coefficient: 0.72,
    confidence: 'high',
    dataPoints: 14,
    insight: 'Days with 7+ hours of sleep appear to be followed by higher mood ratings. This pattern has been consistent over the tracking period.',
    action: 'Continue tracking sleep and mood to see if this pattern holds.',
  },
  {
    id: 'sample-hydration-fatigue',
    variable1: 'hydration',
    variable2: 'fatigue',
    coefficient: -0.58,
    confidence: 'moderate',
    dataPoints: 12,
    insight: 'Lower water intake days seem to correlate with higher fatigue levels. This relationship appears moderately consistent.',
    action: 'Track water intake alongside energy levels to observe this connection.',
  },
];

export default function CorrelationReportScreen() {
  const router = useRouter();
  const [patterns, setPatterns] = useState<DetectedPattern[]>([]);
  const [sufficient, setSufficient] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showingSample, setShowingSample] = useState(false);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useFocusEffect(useCallback(() => {
    loadCorrelations();
  }, []));

  const loadCorrelations = async () => {
    try {
      setLoading(true);

      // Check data sufficiency
      const hasSufficient = await hasSufficientData();
      setSufficient(hasSufficient);

      if (hasSufficient) {
        // Detect correlations (all local processing)
        const detected = await detectCorrelations();
        setPatterns(detected);
        setShowingSample(false);
      } else {
        // Show sample data for new users
        setPatterns(SAMPLE_PATTERNS);
        setShowingSample(true);
      }
    } catch (error) {
      logError('CorrelationReportScreen.loadCorrelations', error);
      // Show sample data on error
      setPatterns(SAMPLE_PATTERNS);
      setShowingSample(true);
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceBadgeColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return Colors.greenBright;
      case 'moderate': return Colors.amber;
      case 'low': return '#94A3B8';
      default: return '#94A3B8';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd]} style={styles.gradient}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <BackButton />
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Correlation Report</Text>
              <Text style={styles.headerSubtitle}>Pattern analysis from tracked data</Text>
            </View>
          </View>

          {/* Content */}
          <View style={styles.content}>

            {/* Important Disclaimer (Always Visible) */}
            <View style={styles.disclaimer}>
              <Ionicons name="information-circle" size={20} color={colors.blue} style={{ marginRight: 8 }} />
              <Text style={styles.disclaimerText}>
                Correlations show observations, not causes. Always discuss patterns with your care team before making decisions.
              </Text>
            </View>

            {/* Loading State */}
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={styles.loadingText}>Analyzing patterns...</Text>
              </View>
            )}

            {/* Sample Data Banner */}
            {!loading && showingSample && (
              <View style={styles.sampleBanner}>
                <View style={styles.sampleBannerContent}>
                  <Text style={styles.sampleBannerIcon}>✨</Text>
                  <View style={styles.sampleBannerText}>
                    <Text style={styles.sampleBannerTitle}>Preview Mode</Text>
                    <Text style={styles.sampleBannerSubtitle}>
                      This is sample data showing what patterns will look like. Track for 14+ days to see your real correlations.
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Detected Patterns */}
            {!loading && patterns.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>DETECTED PATTERNS</Text>
                <Text style={styles.sectionSubtitle}>
                  Based on {patterns[0]?.dataPoints || 0}+ days of tracked data
                </Text>

                {patterns.map((pattern, index) => (
                  <View key={pattern.id} style={styles.patternCard}>
                    {/* Pattern Header */}
                    <View style={styles.patternHeader}>
                      <Text style={styles.patternName}>
                        {pattern.variable1.charAt(0).toUpperCase() + pattern.variable1.slice(1)} & {pattern.variable2.charAt(0).toUpperCase() + pattern.variable2.slice(1)}
                      </Text>
                      <View style={[styles.confidenceBadge, { backgroundColor: `${getConfidenceBadgeColor(pattern.confidence)}20` }]}>
                        <Text style={[styles.confidenceText, { color: getConfidenceBadgeColor(pattern.confidence) }]}>
                          {pattern.confidence} confidence
                        </Text>
                      </View>
                    </View>

                    {/* Insight (Qualified Language) */}
                    <Text style={styles.patternInsight}>{pattern.insight}</Text>

                    {/* Action (Tracking-Focused) */}
                    <View style={styles.patternAction}>
                      <Ionicons name="analytics-outline" size={16} color={colors.textMuted} style={{ marginRight: 6 }} />
                      <Text style={styles.patternActionText}>{pattern.action}</Text>
                    </View>

                    {/* Correlation Strength Indicator */}
                    <View style={styles.strengthIndicator}>
                      <Text style={styles.strengthLabel}>Correlation strength:</Text>
                      <View style={styles.strengthBar}>
                        <View
                          style={[
                            styles.strengthFill,
                            {
                              width: `${Math.abs(pattern.coefficient) * 100}%`,
                              backgroundColor: Math.abs(pattern.coefficient) > 0.6 ? Colors.greenBright : Colors.amber
                            }
                          ]}
                        />
                      </View>
                      <Text style={styles.strengthValue}>
                        {(Math.abs(pattern.coefficient) * 100).toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* No Patterns Detected */}
            {!loading && !showingSample && patterns.length === 0 && (
              <View style={styles.noPatterns}>
                <Ionicons name="checkmark-circle-outline" size={64} color={colors.textMuted} style={{ opacity: 0.3, marginBottom: 16 }} />
                <Text style={styles.noPatternsTitle}>No Strong Patterns Detected</Text>
                <Text style={styles.noPatternsText}>
                  Your tracked data shows no significant correlations at this time. Continue tracking to see if patterns emerge.
                </Text>
              </View>
            )}

            {/* Chart Placeholder */}
            {!loading && patterns.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>TREND VISUALIZATION</Text>
                <View style={styles.chartPlaceholder}>
                  <Ionicons name="bar-chart" size={48} color={colors.textMuted} style={{ opacity: 0.3, marginBottom: 12 }} />
                  <Text style={styles.chartPlaceholderText}>
                    Multi-line trend chart will display here
                  </Text>
                  <Text style={styles.chartPlaceholderNote}>
                    (Requires chart library integration)
                  </Text>
                </View>
              </View>
            )}

            <View style={{ height: 40 }} />
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  gradient: { flex: 1 },
  scrollView: { flex: 1, paddingHorizontal: Spacing.xl },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 20 : 0,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
    backButton: {
    width: 44,
    height: 44,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: c.textPrimary,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: c.textMuted,
  },

  // Content
  content: {
    paddingBottom: Spacing.xxl,
  },

  // Sample Banner
  sampleBanner: {
    backgroundColor: c.purpleLight,
    borderWidth: 1,
    borderColor: c.purpleStrong,
    borderRadius: 14,
    padding: 14,
    marginBottom: Spacing.lg,
  },
  sampleBannerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  sampleBannerIcon: {
    fontSize: 18,
    marginTop: 2,
  },
  sampleBannerText: {
    flex: 1,
  },
  sampleBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: c.purpleBright,
    marginBottom: 4,
  },
  sampleBannerSubtitle: {
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 18,
  },

  // Disclaimer
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: c.blueTint,
    borderLeftWidth: 4,
    borderLeftColor: c.blue,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 20,
  },

  // Loading
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: Spacing.lg,
    fontSize: 14,
    color: c.textMuted,
  },

  // Insufficient Data
  insufficientData: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: Spacing.xl,
  },
  insufficientTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: Spacing.sm,
  },
  insufficientText: {
    fontSize: 14,
    color: c.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  insufficientEncouragement: {
    fontSize: 13,
    color: c.accent,
    fontWeight: '600',
  },

  // Section
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: c.textPrimary,
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: c.textMuted,
    marginBottom: Spacing.lg,
  },

  // Pattern Card
  patternCard: {
    backgroundColor: 'rgba(45, 59, 45, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 116, 0.3)',
    borderLeftWidth: 4,
    borderLeftColor: c.accent,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  patternHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  patternName: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textPrimary,
    flex: 1,
  },
  confidenceBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  patternInsight: {
    fontSize: 14,
    color: c.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  patternAction: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(45, 59, 45, 0.5)',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  patternActionText: {
    flex: 1,
    fontSize: 12,
    color: c.textMuted,
    lineHeight: 18,
  },
  strengthIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  strengthLabel: {
    fontSize: 11,
    color: c.textMuted,
    textTransform: 'uppercase',
  },
  strengthBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(45, 59, 45, 0.5)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 3,
  },
  strengthValue: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textPrimary,
  },

  // No Patterns
  noPatterns: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: Spacing.xl,
  },
  noPatternsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: Spacing.sm,
  },
  noPatternsText: {
    fontSize: 14,
    color: c.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Chart Placeholder
  chartPlaceholder: {
    backgroundColor: 'rgba(45, 59, 45, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 116, 0.2)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    alignItems: 'center',
    minHeight: 250,
    justifyContent: 'center',
  },
  chartPlaceholderText: {
    fontSize: 14,
    color: c.textSecondary,
    marginBottom: 4,
  },
  chartPlaceholderNote: {
    fontSize: 12,
    color: c.textMuted,
    fontStyle: 'italic',
  },
});
