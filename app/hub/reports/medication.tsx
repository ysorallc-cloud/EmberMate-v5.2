// ============================================================================
// MEDICATION ADHERENCE REPORT
// V3: Clinical report for healthcare providers
// Wired to real user data from medicationStorage
// ============================================================================

import React, { useState, useCallback, useMemo } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { AuroraBackground } from '../../../components/aurora/AuroraBackground';
import { GlassCard } from '../../../components/aurora/GlassCard';
import { SubScreenHeader } from '../../../components/SubScreenHeader';
import { Colors, Spacing, Typography, BorderRadius } from '../../../theme/theme-tokens';
import { useTheme } from '../../../contexts/ThemeContext';
import { getMedications, getMedicationLogs, calculateAdherence, Medication, MedicationLog } from '../../../utils/medicationStorage';
import { logError } from '../../../utils/devLog';

interface MedReport {
  name: string;
  schedule: string;
  adherence: number;
  missed: number;
  late: number;
}

const getAdherenceColor = (adherence: number) => {
  if (adherence >= 95) return Colors.green;
  if (adherence >= 85) return Colors.amber;
  return Colors.red;
};

const getTimeSlotLabel = (slot: string) => {
  switch (slot) {
    case 'morning': return 'Morning';
    case 'afternoon': return 'Afternoon';
    case 'evening': return 'Evening';
    case 'bedtime': return 'Bedtime';
    default: return slot;
  }
};

export default function MedicationReport() {
  const [loading, setLoading] = useState(true);
  const [adherence7Day, setAdherence7Day] = useState(0);
  const [adherence30Day, setAdherence30Day] = useState(0);
  const [medReports, setMedReports] = useState<MedReport[]>([]);
  const [patterns, setPatterns] = useState<{ text: string; type: 'info' | 'warning' }[]>([]);
  const [sideEffects, setSideEffects] = useState<{ date: string; symptom: string; linkedMed: string; note: string }[]>([]);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useFocusEffect(useCallback(() => {
    loadReport();
  }, []));

  const loadReport = async () => {
    try {
      setLoading(true);
      const meds = await getMedications();
      const activeMeds = meds.filter(m => m.active);
      const logs = await getMedicationLogs();

      if (activeMeds.length === 0) {
        setLoading(false);
        return;
      }

      // Group meds by name to avoid duplicates (same med at different times)
      const medNames = [...new Set(activeMeds.map(m => m.name))];

      // Calculate per-medication adherence
      const reports: MedReport[] = [];
      let total7 = 0;
      let total30 = 0;

      for (const name of medNames) {
        const medsForName = activeMeds.filter(m => m.name === name);
        const firstMed = medsForName[0];
        const slots = medsForName.map(m => getTimeSlotLabel(m.timeSlot)).join(', ');

        // Calculate adherence for each dose of this medication
        let adh7Sum = 0;
        let adh30Sum = 0;
        for (const med of medsForName) {
          adh7Sum += await calculateAdherence(med.id, 7);
          adh30Sum += await calculateAdherence(med.id, 30);
        }
        const adh7 = Math.round(adh7Sum / medsForName.length);
        const adh30 = Math.round(adh30Sum / medsForName.length);

        // Count missed doses in last 30 days
        const cutoff30 = new Date();
        cutoff30.setDate(cutoff30.getDate() - 30);
        const medIds = medsForName.map(m => m.id);
        const recentLogs = logs.filter(
          l => medIds.includes(l.medicationId) && new Date(l.timestamp) >= cutoff30
        );
        const takenCount = recentLogs.filter(l => l.taken).length;
        const expectedDoses = 30 * medsForName.length;
        const missed = Math.max(0, expectedDoses - takenCount);

        reports.push({
          name: `${firstMed.name} ${firstMed.dosage}`,
          schedule: medsForName.length > 1 ? `${medsForName.length}x daily (${slots})` : `Once daily (${slots})`,
          adherence: adh30,
          missed,
          late: 0,
        });

        total7 += adh7;
        total30 += adh30;
      }

      setAdherence7Day(medNames.length > 0 ? Math.round(total7 / medNames.length) : 0);
      setAdherence30Day(medNames.length > 0 ? Math.round(total30 / medNames.length) : 0);
      setMedReports(reports);

      // Generate patterns
      const detectedPatterns: { text: string; type: 'info' | 'warning' }[] = [];
      const lowAdherence = reports.filter(r => r.adherence < 85);
      if (lowAdherence.length > 0) {
        detectedPatterns.push({
          text: `${lowAdherence.map(r => r.name).join(', ')} ${lowAdherence.length === 1 ? 'has' : 'have'} adherence below 85% - consider setting reminders.`,
          type: 'warning',
        });
      }
      const highAdherence = reports.filter(r => r.adherence >= 95);
      if (highAdherence.length > 0) {
        detectedPatterns.push({
          text: `${highAdherence.length} medication${highAdherence.length !== 1 ? 's' : ''} maintained at 95%+ adherence.`,
          type: 'info',
        });
      }
      if (reports.length > 0 && detectedPatterns.length === 0) {
        detectedPatterns.push({ text: 'Keep tracking to discover adherence patterns.', type: 'info' });
      }
      setPatterns(detectedPatterns);

      // Side effects from logs with notes
      const effectsFromLogs = logs
        .filter(l => l.notes && l.notes.trim().length > 0)
        .slice(-5)
        .map(l => {
          const med = meds.find(m => m.id === l.medicationId);
          const date = new Date(l.timestamp);
          return {
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            symptom: l.notes!.substring(0, 50),
            linkedMed: med?.name || 'Unknown',
            note: l.taken ? 'Noted after taking dose' : 'Dose skipped',
          };
        });
      setSideEffects(effectsFromLogs);
    } catch (error) {
      logError('MedicationReport.loadReport', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <AuroraBackground variant="reports" />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
            <SubScreenHeader title="Medication Adherence" emoji="💊" />
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={styles.loadingText}>Analyzing medication data...</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  if (medReports.length === 0) {
    return (
      <View style={styles.container}>
        <AuroraBackground variant="reports" />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
            <SubScreenHeader title="Medication Adherence" emoji="💊" />
            <GlassCard style={styles.emptyCard}>
              <Text style={styles.emptyText}>No active medications to report on. Add medications from the Care Plan to see adherence data here.</Text>
            </GlassCard>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

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
            title="Medication Adherence"
            emoji="💊"
          />

          {/* Adherence Overview */}
          <View style={styles.overviewRow}>
            <GlassCard style={styles.statCard}>
              <Text style={[styles.statValue, { color: getAdherenceColor(adherence7Day) }]}>
                {adherence7Day}%
              </Text>
              <Text style={styles.statLabel}>7-Day</Text>
            </GlassCard>
            <GlassCard style={styles.statCard}>
              <Text style={[styles.statValue, { color: getAdherenceColor(adherence30Day) }]}>
                {adherence30Day}%
              </Text>
              <Text style={styles.statLabel}>30-Day</Text>
            </GlassCard>
          </View>

          {/* By Medication */}
          <Text style={styles.sectionTitle}>BY MEDICATION</Text>
          <GlassCard noPadding>
            {medReports.map((med, i) => (
              <View key={i} style={[
                styles.medRow,
                i < medReports.length - 1 && styles.medRowBorder,
              ]}>
                <View style={styles.medContent}>
                  <View style={styles.medHeader}>
                    <View style={styles.medInfo}>
                      <Text style={styles.medName}>{med.name}</Text>
                      <Text style={styles.medSchedule}>{med.schedule}</Text>
                    </View>
                    <Text style={[styles.medAdherence, { color: getAdherenceColor(med.adherence) }]}>
                      {med.adherence}%
                    </Text>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.progressBar}>
                    <View style={[
                      styles.progressFill,
                      {
                        width: `${med.adherence}%`,
                        backgroundColor: getAdherenceColor(med.adherence),
                      },
                    ]} />
                  </View>

                  {/* Details */}
                  <View style={styles.medDetails}>
                    {med.missed > 0 && (
                      <Text style={styles.medDetail}>
                        Missed: {med.missed} dose{med.missed > 1 ? 's' : ''}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </GlassCard>

          {/* Patterns */}
          {patterns.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>PATTERNS & INSIGHTS</Text>
              {patterns.map((pattern, i) => (
                <GlassCard key={i} style={[
                  styles.patternCard,
                  pattern.type === 'warning' && styles.patternWarning,
                ]}>
                  <View style={styles.patternContent}>
                    <Text style={styles.patternIcon}>
                      {pattern.type === 'info' ? 'i' : '!'}
                    </Text>
                    <Text style={styles.patternText}>{pattern.text}</Text>
                  </View>
                </GlassCard>
              ))}
            </>
          )}

          {/* Side Effects / Notes */}
          {sideEffects.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>RECENT NOTES</Text>
              <GlassCard noPadding>
                {sideEffects.map((effect, i) => (
                  <View key={i} style={[
                    styles.effectRow,
                    i < sideEffects.length - 1 && styles.effectRowBorder,
                  ]}>
                    <View style={styles.effectHeader}>
                      <Text style={styles.effectSymptom}>{effect.symptom}</Text>
                      <Text style={styles.effectDate}>{effect.date}</Text>
                    </View>
                    <Text style={styles.effectNote}>
                      {effect.linkedMed} - {effect.note}
                    </Text>
                  </View>
                ))}
              </GlassCard>
            </>
          )}

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

  // Loading
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    gap: Spacing.lg,
  },
  loadingText: {
    ...Typography.bodySmall,
    color: c.textSecondary,
  },

  // Empty
  emptyCard: {
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  emptyText: {
    ...Typography.body,
    color: c.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Overview
  overviewRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.xl,
  },
  statValue: {
    ...Typography.displayMedium,
    fontWeight: '600',
    marginBottom: 4,
  },
  statLabel: {
    ...Typography.bodySmall,
    color: c.textMuted,
  },

  // Section
  sectionTitle: {
    ...Typography.caption,
    color: c.textMuted,
    marginBottom: Spacing.md,
  },

  // Medication Rows
  medRow: {
    padding: Spacing.lg,
  },
  medRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: c.borderLight,
  },
  medContent: {
    width: '100%',
  },
  medHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    ...Typography.body,
    color: c.textPrimary,
    fontWeight: '500',
    marginBottom: 2,
  },
  medSchedule: {
    ...Typography.bodySmall,
    color: c.textMuted,
  },
  medAdherence: {
    ...Typography.h2,
    fontWeight: '600',
  },

  // Progress Bar
  progressBar: {
    height: 6,
    backgroundColor: c.glass,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Details
  medDetails: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  medDetail: {
    ...Typography.captionSmall,
    color: c.textMuted,
  },

  // Patterns
  patternCard: {
    marginBottom: Spacing.md,
  },
  patternWarning: {
    backgroundColor: `${c.amber}10`,
    borderColor: `${c.amber}30`,
  },
  patternContent: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  patternIcon: {
    fontSize: 20,
  },
  patternText: {
    ...Typography.bodySmall,
    color: c.textPrimary,
    flex: 1,
    lineHeight: 20,
  },

  // Side Effects
  effectRow: {
    padding: Spacing.lg,
  },
  effectRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: c.borderLight,
  },
  effectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  effectSymptom: {
    ...Typography.body,
    color: c.textPrimary,
  },
  effectDate: {
    ...Typography.bodySmall,
    color: c.textMuted,
  },
  effectNote: {
    ...Typography.bodySmall,
    color: c.textSecondary,
  },
});
