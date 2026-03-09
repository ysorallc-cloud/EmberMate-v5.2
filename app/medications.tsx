// ============================================================================
// MEDICATIONS LIST - Full medication management
// With "Take All" button, multi-time display, and refill tracking
// ============================================================================

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import { SubScreenHeader } from '../components/SubScreenHeader';
import { MedicationCardSkeleton } from '../components/LoadingSkeleton';
import { getMedications, deleteMedication, calculateAdherence, Medication, markMedicationTaken } from '../utils/medicationStorage';
import { checkInteraction } from '../utils/drugInteractions';
import { logError } from '../utils/devLog';

// ── Types for grouped multi-dose cards ──
interface DoseEntry {
  med: Medication;
  time: string;
  status: 'taken' | 'overdue' | 'pending';
}
interface MedGroup {
  name: string;
  dosage: string;
  doses: DoseEntry[];
  adherenceRate: number | null;
}

function getAdherenceLabel(rate: number, _medName: string, missedWindow?: string): string {
  if (rate >= 90) return `${rate}% adherence this week \u2014 excellent`;
  if (rate >= 80) return `${rate}% adherence this week`;
  if (rate >= 60) return `${rate}% adherence this week${missedWindow ? ` \u2014 often missed ${missedWindow}` : ''}`;
  return `${rate}% adherence this week \u2014 needs attention`;
}

function isMedTimeOverdue(timeStr: string): boolean {
  if (!timeStr) return false;
  const now = new Date();
  const parts = timeStr.split(':');
  if (parts.length < 2) return false;
  const scheduled = new Date();
  scheduled.setHours(parseInt(parts[0]), parseInt(parts[1]), 0, 0);
  return now.getTime() - scheduled.getTime() > 15 * 60 * 1000; // 15 min grace
}

function formatDoseTime(timeStr: string): string {
  if (!timeStr) return 'As needed';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  const hr = parseInt(parts[0]);
  const min = parts[1];
  const period = hr >= 12 ? 'PM' : 'AM';
  return `${hr % 12 || 12}:${min} ${period}`;
}

function getDoseStatusText(dose: DoseEntry): string {
  if (dose.status === 'taken') {
    const takenAt = dose.med.lastTaken
      ? new Date(dose.med.lastTaken).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      : 'earlier';
    return `Taken ${takenAt}`;
  }
  if (dose.status === 'overdue') {
    const now = new Date();
    const parts = dose.time.split(':');
    if (parts.length >= 2) {
      const scheduled = new Date();
      scheduled.setHours(parseInt(parts[0]), parseInt(parts[1]), 0, 0);
      const diffMin = Math.round((now.getTime() - scheduled.getTime()) / 60000);
      if (diffMin >= 60) return `Overdue \u00B7 ${Math.round(diffMin / 60)}h ago`;
      return `Overdue \u00B7 ${diffMin}m ago`;
    }
    return 'Overdue';
  }
  // pending
  const now = new Date();
  const parts = dose.time.split(':');
  if (parts.length >= 2) {
    const scheduled = new Date();
    scheduled.setHours(parseInt(parts[0]), parseInt(parts[1]), 0, 0);
    const diffMin = Math.round((scheduled.getTime() - now.getTime()) / 60000);
    if (diffMin >= 60) return `Due in ${Math.round(diffMin / 60)}h`;
    if (diffMin > 0) return `Due in ${diffMin} min`;
    return 'Due now';
  }
  return 'Pending';
}

export default function MedicationsScreen() {
  const router = useRouter();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [interactions, setInteractions] = useState<any[]>([]);
  const [adherenceRates, setAdherenceRates] = useState<{ [key: string]: number }>({});
  const [takingAll, setTakingAll] = useState(false);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useFocusEffect(useCallback(() => {
    loadData();
  }, []));

  const loadData = async () => {
    try {
      setLoading(true);
      const meds = await getMedications();
      const activeMeds = meds.filter(m => m.active);
      setMedications(activeMeds);

      // Calculate adherence for each medication
      const rates: { [key: string]: number } = {};
      for (const med of activeMeds) {
        const adherence = await calculateAdherence(med.id, 7);
        rates[med.id] = adherence;
      }
      setAdherenceRates(rates);

      // Check for interactions between all pairs
      const interactionResults: any[] = [];
      for (let i = 0; i < activeMeds.length; i++) {
        for (let j = i + 1; j < activeMeds.length; j++) {
          const interaction = checkInteraction(activeMeds[i].name, activeMeds[j].name);
          if (interaction) {
            interactionResults.push(interaction);
          }
        }
      }
      setInteractions(interactionResults);
    } catch (error) {
      logError('MedicationsScreen.loadData', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const handleAddMedication = () => {
    router.push('/medication-form');
  };

  const handleMedicationPress = (medication: Medication) => {
    router.push(`/medication-form?id=${medication.id}`);
  };

  const handleDeleteMedication = (medication: Medication) => {
    Alert.alert(
      'Delete Medication',
      `Remove ${medication.name} from your list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteMedication(medication.id);
            await loadData();
          },
        },
      ]
    );
  };

  const getAdherencePercent = (medication: Medication) => {
    // Return calculated adherence rate, or null if no data
    return adherenceRates[medication.id] || null;
  };

  // Expanded state for multi-dose cards
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = useCallback((key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Group medications by name+dosage for multi-dose cards
  const groupedMedications = useMemo((): MedGroup[] => {
    const groups: Record<string, MedGroup> = {};
    for (const med of medications) {
      const key = `${med.name.toLowerCase()}-${med.dosage.toLowerCase()}`;
      if (!groups[key]) {
        groups[key] = {
          name: med.name,
          dosage: med.dosage,
          doses: [],
          adherenceRate: adherenceRates[med.id] ?? null,
        };
      }
      const time = med.time || '';
      groups[key].doses.push({
        med,
        time,
        status: med.taken ? 'taken' : isMedTimeOverdue(time) ? 'overdue' : 'pending',
      });
      // Update adherence if we have a rate for any med in the group
      if (adherenceRates[med.id] != null && groups[key].adherenceRate == null) {
        groups[key].adherenceRate = adherenceRates[med.id];
      }
    }
    return Object.values(groups);
  }, [medications, adherenceRates]);

  // Separate medications into "due now" and "taken today"
  const { dueMeds, takenMeds, dueCount } = useMemo(() => {
    const due = medications.filter(m => !m.taken);
    const taken = medications.filter(m => m.taken);
    return {
      dueMeds: due,
      takenMeds: taken,
      dueCount: due.length,
    };
  }, [medications]);

  // Handle "Take All" button
  const handleTakeAll = async () => {
    if (dueMeds.length === 0) return;

    Alert.alert(
      'Take All Medications',
      `Mark ${dueMeds.length} medication${dueMeds.length > 1 ? 's' : ''} as taken?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Take All',
          onPress: async () => {
            setTakingAll(true);
            try {
              for (const med of dueMeds) {
                await markMedicationTaken(med.id, true);
              }
              await loadData();
              Alert.alert('Done', `${dueMeds.length} medications marked as taken.`);
            } catch (error) {
              logError('MedicationsScreen.handleTakeAll', error);
              Alert.alert('Error', 'Failed to mark medications as taken.');
            } finally {
              setTakingAll(false);
            }
          },
        },
      ]
    );
  };

  // Handle marking a single medication as taken
  const handleTakeMedication = async (medication: Medication) => {
    try {
      await markMedicationTaken(medication.id, true);
      await loadData();
    } catch (error) {
      logError('MedicationsScreen.handleTakeMedication', error);
      Alert.alert('Error', 'Failed to mark medication as taken.');
    }
  };

  // Format medication times for display
  const formatMedicationTimes = (medication: Medication): string[] => {
    const times: string[] = [];
    if (medication.time) {
      times.push(medication.time);
    }
    // Show second time if medication has morning and evening slots
    if (medication.timeSlot === 'morning' && times.length > 0) {
      // Some medications may need evening dose too - could be extended with more data
    }
    return times.length > 0 ? times : ['As needed'];
  };

  // Check if medication needs refill (simulated - would come from medication data)
  const getRefillStatus = (medication: Medication): { needsRefill: boolean; daysLeft?: number } => {
    // Simulate refill tracking - in real implementation, this would come from medication data
    if (medication.name.toLowerCase().includes('statin') || medication.name.toLowerCase().includes('atorvastatin')) {
      return { needsRefill: true, daysLeft: 7 };
    }
    return { needsRefill: false };
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        {/* Header */}
        <SubScreenHeader
          title="Medications"
          emoji="💊"
          rightAction={
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddMedication}
              accessibilityLabel="Add medication"
              accessibilityRole="button"
            >
              <Text style={styles.addIcon}>+</Text>
            </TouchableOpacity>
          }
        />

        <SectionList
          style={styles.content}
          sections={(() => {
            if (loading || groupedMedications.length === 0) return [];
            return [{ key: 'all', title: `ALL MEDICATIONS (${groupedMedications.length})`, data: groupedMedications }];
          })()}
          keyExtractor={(item) => `${item.name}-${item.dosage}`}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item: group }) => {
            const isMultiDose = group.doses.length > 1;
            const groupKey = `${group.name}-${group.dosage}`;
            const isExpanded = expandedGroups.has(groupKey);
            const allTaken = group.doses.every(d => d.status === 'taken');
            const hasOverdue = group.doses.some(d => d.status === 'overdue');

            // Accent bar color: green if all taken, red if overdue, blue default
            const accentColor = allTaken ? colors.green : hasOverdue ? colors.redBright : colors.accent;

            return (
              <View style={styles.medCard}>
                {/* Left accent bar */}
                <View style={[styles.medAccentBar, { backgroundColor: accentColor }]} />
                <View style={styles.medCardContent}>
                  {/* Header row */}
                  <TouchableOpacity
                    style={styles.medGroupHeader}
                    onPress={() => isMultiDose ? toggleGroup(groupKey) : handleMedicationPress(group.doses[0].med)}
                    accessibilityLabel={`${group.name}, ${group.dosage}${isMultiDose ? `, ${group.doses.length} doses today` : ''}`}
                    accessibilityRole="button"
                    accessibilityState={isMultiDose ? { expanded: isExpanded } : undefined}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.medName, allTaken && styles.medNameTaken]}>{group.name}</Text>
                      <Text style={styles.medDosage}>
                        {group.dosage}
                        {isMultiDose ? ` \u00B7 ${group.doses.length} doses today` : ''}
                      </Text>
                      {group.adherenceRate != null && (
                        <Text style={[
                          styles.adherenceText,
                          { color: group.adherenceRate >= 80 ? colors.green : group.adherenceRate >= 60 ? colors.amber : colors.redBright }
                        ]}>
                          {getAdherenceLabel(group.adherenceRate, group.name)}
                        </Text>
                      )}
                    </View>
                    {isMultiDose && (
                      <Text style={styles.groupChevron}>{isExpanded ? '\u25BC' : '\u25B6'}</Text>
                    )}
                    {!isMultiDose && (
                      group.doses[0].status === 'taken' ? (
                        <View style={styles.medCheckboxDone}>
                          <Text style={styles.checkmarkIcon}>{'\u2713'}</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.doseLogBtn}
                          onPress={() => handleTakeMedication(group.doses[0].med)}
                          accessibilityLabel={`Log ${group.name}`}
                          accessibilityRole="button"
                        >
                          <Text style={styles.doseLogBtnText}>
                            {group.doses[0].status === 'overdue' ? 'Log now' : 'Log'}
                          </Text>
                        </TouchableOpacity>
                      )
                    )}
                  </TouchableOpacity>

                  {/* Single-dose inline status */}
                  {!isMultiDose && (
                    <Text style={styles.singleDoseStatus}>
                      {formatDoseTime(group.doses[0].time)} \u00B7 {getDoseStatusText(group.doses[0])}
                    </Text>
                  )}

                  {/* Multi-dose expanded rows */}
                  {isMultiDose && isExpanded && (
                    <View style={styles.doseRows}>
                      {group.doses.map((dose, i) => {
                        const dotColor = dose.status === 'taken' ? colors.green
                          : dose.status === 'overdue' ? colors.redBright : colors.amber;
                        return (
                          <View key={i} style={[styles.doseRow, i < group.doses.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
                            <View style={[styles.doseDot, { backgroundColor: dotColor }]} />
                            <Text style={styles.doseTime}>{formatDoseTime(dose.time)}</Text>
                            <Text style={[styles.doseStatusText, { color: dotColor }]}>
                              {getDoseStatusText(dose)}
                            </Text>
                            {dose.status !== 'taken' && (
                              <TouchableOpacity
                                style={styles.doseLogBtn}
                                onPress={() => handleTakeMedication(dose.med)}
                                accessibilityLabel={`Log ${group.name} ${formatDoseTime(dose.time)} dose`}
                                accessibilityRole="button"
                              >
                                <Text style={styles.doseLogBtnText}>
                                  {dose.status === 'overdue' ? 'Log now' : 'Log'}
                                </Text>
                              </TouchableOpacity>
                            )}
                            {dose.status === 'taken' && (
                              <View style={styles.doseTakenCheck}>
                                <Text style={{ fontSize: 12, color: colors.green }}>{'\u2713'}</Text>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              </View>
            );
          }}
          ListHeaderComponent={
            <>
              {/* Interaction Warning */}
              {interactions.length > 0 && (
                <TouchableOpacity
                  style={styles.warningBanner}
                  onPress={() => router.push('/medication-interactions')}
                  accessibilityLabel={`Interaction alert. ${interactions.length} potential interaction${interactions.length > 1 ? 's' : ''} detected. View details`}
                  accessibilityRole="button"
                >
                  <Text style={styles.warningIcon}>⚠️</Text>
                  <View style={styles.warningContent}>
                    <Text style={styles.warningTitle}>Interaction Alert</Text>
                    <Text style={styles.warningText}>
                      {interactions.length} potential interaction{interactions.length > 1 ? 's' : ''} detected
                      {' • '}
                      <Text style={styles.warningLink}>View details →</Text>
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Loading */}
              {loading && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>LOADING MEDICATIONS...</Text>
                  <MedicationCardSkeleton />
                  <MedicationCardSkeleton />
                  <MedicationCardSkeleton />
                </View>
              )}

              {/* Empty State */}
              {!loading && medications.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>💊</Text>
                  <Text style={styles.emptyTitle}>No medications yet</Text>
                  <Text style={styles.emptyText}>
                    Add your first medication to start tracking adherence and managing your care.
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyButton}
                    onPress={handleAddMedication}
                    accessibilityLabel="Add medication"
                    accessibilityRole="button"
                  >
                    <Text style={styles.emptyButtonText}>Add Medication</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Take All Button */}
              {!loading && dueCount > 0 && (
                <TouchableOpacity
                  style={[styles.takeAllButton, takingAll && styles.takeAllButtonDisabled]}
                  onPress={handleTakeAll}
                  disabled={takingAll}
                  activeOpacity={0.7}
                  accessibilityLabel={`Take all due medications. ${dueCount} medication${dueCount > 1 ? 's' : ''} due now`}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: takingAll }}
                >
                  <Text style={styles.takeAllIcon}>✓</Text>
                  <View style={styles.takeAllContent}>
                    <Text style={styles.takeAllTitle}>Take All Due Medications</Text>
                    <Text style={styles.takeAllSubtitle}>
                      {dueCount} medication{dueCount > 1 ? 's' : ''} due now
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </>
          }
        />
      </LinearGradient>
    </SafeAreaView>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  gradient: {
    flex: 1,
  },

  // ADD BUTTON
  addButton: {
    width: 44,
    height: 44,
    backgroundColor: c.accentLight,
    borderWidth: 1,
    borderColor: c.accentBorder,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIcon: {
    fontSize: 24,
    color: c.accent,
  },

  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },

  // WARNING BANNER
  warningBanner: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  warningIcon: {
    fontSize: 20,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: c.error,
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 18,
  },
  warningLink: {
    color: c.error,
    fontWeight: '500',
  },

  // SECTION
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: c.textMuted,
    marginBottom: 12,
  },

  // TAKE ALL BUTTON
  takeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: c.greenMuted,
    borderWidth: 2,
    borderColor: c.success,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  takeAllButtonDisabled: {
    opacity: 0.6,
  },
  takeAllIcon: {
    fontSize: 32,
    color: c.success,
  },
  takeAllContent: {
    flex: 1,
  },
  takeAllTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: c.success,
    marginBottom: 2,
  },
  takeAllSubtitle: {
    fontSize: 13,
    color: '#6ee7b7',
  },

  // MEDICATION CARDS — Grouped multi-dose
  medCard: {
    flexDirection: 'row',
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  medAccentBar: {
    width: 4,
  },
  medCardContent: {
    flex: 1,
    padding: 14,
  },
  medGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  groupChevron: {
    fontSize: 12,
    color: c.textMuted,
  },
  singleDoseStatus: {
    fontSize: 12,
    color: c.textMuted,
    marginTop: 6,
  },
  doseRows: {
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    paddingTop: 8,
  },
  doseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  doseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  doseTime: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textPrimary,
    width: 72,
  },
  doseStatusText: {
    flex: 1,
    fontSize: 12,
  },
  doseLogBtn: {
    backgroundColor: c.accentLight,
    borderWidth: 1,
    borderColor: c.accentBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  doseLogBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: c.accent,
  },
  doseTakenCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: c.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adherenceText: {
    fontSize: 11,
    marginTop: 4,
  },
  medCardTaken: {
    opacity: 0.7,
  },
  medCardCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  medCheckboxDone: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: c.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkIcon: {
    color: c.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  medIconBox: {
    width: 48,
    height: 48,
    backgroundColor: c.accentLight,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medIcon: {
    fontSize: 24,
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    fontSize: 16,
    fontWeight: '500',
    color: c.textPrimary,
    marginBottom: 4,
  },
  medNameTaken: {
    textDecorationLine: 'line-through',
    color: c.textSecondary,
  },
  medDosage: {
    fontSize: 14,
    color: c.textSecondary,
    marginBottom: 8,
  },
  medFrequency: {
    fontSize: 13,
    color: c.textTertiary,
  },
  takenTime: {
    fontSize: 12,
    color: c.textMuted,
  },

  // TIME BADGES
  timeBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  timeBadge: {
    backgroundColor: c.glassActive,
    borderWidth: 1,
    borderColor: c.glassStrong,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  timeBadgeNow: {
    backgroundColor: c.greenMuted,
    borderColor: 'rgba(16, 185, 129, 0.5)',
  },
  timeBadgeText: {
    fontSize: 11,
    color: c.textSecondary,
    fontWeight: '600',
  },
  timeBadgeTextNow: {
    color: c.success,
  },

  // REFILL WARNING
  refillWarning: {
    backgroundColor: c.amberMuted,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.5)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  refillWarningText: {
    fontSize: 12,
    color: c.amber,
    fontWeight: '600',
  },

  // ADHERENCE BADGE
  adherenceBadge: {
    backgroundColor: c.greenHint,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  adherenceBadgeText: {
    fontSize: 12,
    color: c.success,
    fontWeight: '600',
  },

  // ADHERENCE BAR (legacy, kept for reference)
  medAdherence: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(232, 155, 95, 0.1)',
  },
  adherenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  adherenceLabel: {
    fontSize: 12,
    color: c.textTertiary,
    fontWeight: '500',
  },
  adherenceValue: {
    fontSize: 13,
    color: c.success,
    fontWeight: '600',
  },
  adherenceBar: {
    height: 4,
    backgroundColor: 'rgba(232, 155, 95, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  adherenceBarFill: {
    height: '100%',
    backgroundColor: c.success,
    borderRadius: 2,
  },

  // EMPTY STATE
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
    opacity: 0.3,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: c.textPrimary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: c.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: c.accentLight,
    borderWidth: 1,
    borderColor: c.accentBorder,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: c.accent,
  },
});
