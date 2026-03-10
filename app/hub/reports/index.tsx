// ============================================================================
// REPORTS HUB - Clinical & Wellness Reports
// V3: Centralized reports access
// Filters by enabled Care Plan buckets
// ============================================================================

import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { navigate } from '../../../lib/navigate';
import { AuroraBackground } from '../../../components/aurora/AuroraBackground';
import { GlassCard } from '../../../components/aurora/GlassCard';
import { SubScreenHeader } from '../../../components/SubScreenHeader';
import { SectionHeader } from '../../../components/aurora/SectionHeader';
import { Colors, Spacing, Typography, BorderRadius } from '../../../theme/theme-tokens';
import { useTheme } from '../../../contexts/ThemeContext';
import { useEnabledBuckets } from '../../../hooks/useCarePlanConfig';
import { BucketType } from '../../../types/carePlanConfig';

// Report definition with required buckets for filtering
interface Report {
  id: string;
  icon: string;
  name: string;
  badge: string;
  color: string;
  route: string;
  requiredBuckets?: BucketType[]; // If any of these enabled, show report. Empty/undefined = always show
}

interface ReportCategory {
  title: string;
  description: string;
  reports: Report[];
}

const REPORT_CATEGORIES: ReportCategory[] = [
  {
    title: 'Clinical Reports',
    description: 'For healthcare providers',
    reports: [
      { id: 'medication', icon: '💊', name: 'Medication Adherence', badge: '94%', color: Colors.amber, route: '/hub/reports/medication', requiredBuckets: ['meds'] },
      { id: 'vitals', icon: '🫀', name: 'Vitals Stability', badge: 'Coming soon', color: Colors.rose, route: '', requiredBuckets: ['vitals'] },
      { id: 'symptoms', icon: '🩺', name: 'Symptom Timeline', badge: 'Coming soon', color: Colors.purple, route: '', requiredBuckets: ['wellness'] },
      { id: 'nutrition', icon: '🥗', name: 'Hydration & Nutrition', badge: 'Coming soon', color: Colors.green, route: '', requiredBuckets: ['meals', 'water'] },
    ],
  },
  {
    title: 'Wellness Reports',
    description: 'Mood, sleep & patterns',
    reports: [
      { id: 'wellness', icon: '😊', name: 'Sleep, Energy & Mood', badge: 'Coming soon', color: Colors.purple, route: '', requiredBuckets: ['wellness', 'sleep'] },
      { id: 'correlation', icon: '🧠', name: 'Correlation Insights', badge: 'View patterns', color: Colors.sky, route: '/correlation-report' }, // Always show - cross-bucket
    ],
  },
  {
    title: 'Care Reports',
    description: 'For visits & family',
    reports: [
      { id: 'redflags', icon: '🚨', name: 'Red Flags & Alerts', badge: 'Coming soon', color: Colors.red, route: '' }, // Always show
      { id: 'visitprep', icon: '📋', name: 'Visit Prep Report', badge: 'Coming soon', color: Colors.accent, route: '' }, // Always show
    ],
  },
];

export default function ReportsHub() {
  const { enabledBuckets } = useEnabledBuckets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Filter reports by enabled buckets
  // If no buckets enabled (no Care Plan), show all reports
  // If requiredBuckets is empty/undefined, always show the report
  // If requiredBuckets has values, show only if ANY of them are enabled
  const filteredCategories = useMemo(() => {
    return REPORT_CATEGORIES.map(category => ({
      ...category,
      reports: category.reports.filter(report => {
        // No bucket filter configured - always show
        if (!report.requiredBuckets || report.requiredBuckets.length === 0) {
          return true;
        }
        // No buckets enabled in Care Plan - show all
        if (enabledBuckets.length === 0) {
          return true;
        }
        // Show if ANY required bucket is enabled
        return report.requiredBuckets.some(bucket => enabledBuckets.includes(bucket));
      }),
    })).filter(category => category.reports.length > 0); // Remove empty categories
  }, [enabledBuckets]);

  return (
    <View style={styles.container}>
      <AuroraBackground variant="reports" />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <SubScreenHeader
            title="Reports"
            emoji="📊"
          />

          {/* Intro */}
          <GlassCard style={styles.introCard}>
            <Text style={styles.introText}>
              Professional reports for healthcare providers, family updates, and visit preparation.
            </Text>
          </GlassCard>

          {/* Report Categories - filtered by enabled Care Plan buckets */}
          {filteredCategories.map((category, ci) => (
            <View key={ci} style={styles.section}>
              <SectionHeader title={category.title} />
              <Text style={styles.categoryDescription}>{category.description}</Text>

              <GlassCard noPadding>
                {category.reports.map((report, i) => (
                  <TouchableOpacity
                    key={report.id}
                    style={[
                      styles.reportRow,
                      i < category.reports.length - 1 && styles.reportRowBorder,
                    ]}
                    onPress={() => {
                      if (!report.route) {
                        Alert.alert(
                          `${report.name}`,
                          'This report is coming in a future update.',
                          [{ text: 'OK' }]
                        );
                        return;
                      }
                      navigate(report.route);
                    }}
                    activeOpacity={0.7}
                    accessibilityLabel={`${report.name} report, ${report.badge}`}
                    accessibilityRole="button"
                  >
                    <View style={[
                      styles.reportIcon,
                      { backgroundColor: `${report.color}15` },
                    ]}>
                      <Text style={styles.reportIconText}>{report.icon}</Text>
                    </View>
                    <View style={styles.reportContent}>
                      <Text style={styles.reportName}>{report.name}</Text>
                      {report.badge && (
                        <View style={[
                          styles.badge,
                          { backgroundColor: `${report.color}20`, borderColor: `${report.color}40` },
                        ]}>
                          <Text style={[styles.badgeText, { color: report.color }]}>
                            {report.badge}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.reportArrow}>›</Text>
                  </TouchableOpacity>
                ))}
              </GlassCard>
            </View>
          ))}

          {/* Export All */}
          <TouchableOpacity style={styles.exportAllButton} onPress={() => navigate('/care-report?scope=full')} accessibilityLabel="Export all reports as PDF package" accessibilityRole="button">
            <GlassCard style={styles.exportAllCard}>
              <View style={styles.exportAllContent}>
                <Text style={styles.exportAllIcon}>📦</Text>
                <View style={styles.exportAllText}>
                  <Text style={styles.exportAllTitle}>Export All Reports</Text>
                  <Text style={styles.exportAllSubtitle}>PDF package for appointments</Text>
                </View>
              </View>
            </GlassCard>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.xl,
  },

  // Intro
  introCard: {
    backgroundColor: `${c.purple}08`,
    borderColor: `${c.purple}20`,
    marginBottom: Spacing.xxl,
  },
  introText: {
    ...Typography.bodySmall,
    color: c.textSecondary,
    lineHeight: 22,
  },

  // Sections
  section: {
    marginBottom: Spacing.xxl,
  },
  categoryDescription: {
    ...Typography.bodySmall,
    color: c.textMuted,
    marginBottom: Spacing.md,
  },

  // Report Rows
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  reportRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: c.borderLight,
  },
  reportIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportIconText: {
    fontSize: 22,
  },
  reportContent: {
    flex: 1,
  },
  reportName: {
    ...Typography.body,
    color: c.textPrimary,
    marginBottom: 4,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    ...Typography.captionSmall,
    fontWeight: '600',
  },
  reportArrow: {
    fontSize: 20,
    color: c.textMuted,
  },

  // Export All
  exportAllButton: {
    marginTop: Spacing.lg,
  },
  exportAllCard: {
    backgroundColor: `${c.accent}10`,
    borderColor: `${c.accent}30`,
  },
  exportAllContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  exportAllIcon: {
    fontSize: 32,
  },
  exportAllText: {
    flex: 1,
  },
  exportAllTitle: {
    ...Typography.body,
    color: c.textPrimary,
    fontWeight: '500',
  },
  exportAllSubtitle: {
    ...Typography.bodySmall,
    color: c.textSecondary,
  },
});
