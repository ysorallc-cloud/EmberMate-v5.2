// ============================================================================
// PROVIDER PREP SCREEN
// Auto-generated question list from data anomalies + visit summary sheet
// Surfaces contextually within 14 days of an appointment
// ============================================================================

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { format, subDays } from 'date-fns';

import { Colors, Spacing, BorderRadius } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import { AuroraBackground } from '../components/aurora/AuroraBackground';
import { GlassCard } from '../components/aurora/GlassCard';
import { SubScreenHeader } from '../components/SubScreenHeader';

import { getUpcomingAppointments, Appointment } from '../utils/appointmentStorage';
import { getMedications, getMedicationLogs } from '../utils/medicationStorage';
import { getVitals, VitalReading } from '../utils/vitalsStorage';
import { getSymptoms, SymptomLog } from '../utils/symptomStorage';
import { generateProviderQuestions } from '../utils/insightEngine';
import { generateAndSharePDF, generatePreviewHTML } from '../utils/pdfExport';
import { ReportPreviewModal } from '../components/shared/ReportPreviewModal';
import { safeGetItem } from '../utils/safeStorage';
import { StorageKeys } from '../utils/storageKeys';
import { logError } from '../utils/devLog';
import { getTodayDateString } from '../services/carePlanGenerator';
import {
  getPrepChecklist,
  addCustomPrepItem,
  updatePrepChecklistItem,
  removeCustomPrepItem,
} from '../utils/prepChecklistStorage';
import { AppointmentPrepChecklist, PrepChecklistItem } from '../types/schedule';
import {
  generateChangesSinceLastVisit,
  generateDoctorQuestions,
  ChangesSummary,
  DoctorQuestion,
} from '../utils/providerPrepBuilder';

export default function ProviderPrepScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { appointmentId } = useLocalSearchParams<{ appointmentId?: string }>();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [checklist, setChecklist] = useState<AppointmentPrepChecklist | null>(null);
  const [customInput, setCustomInput] = useState('');
  const [daysSinceLastVisit, setDaysSinceLastVisit] = useState(30);
  const [changes, setChanges] = useState<ChangesSummary | null>(null);
  const [doctorQuestions, setDoctorQuestions] = useState<DoctorQuestion[]>([]);
  const [changesExpanded, setChangesExpanded] = useState(true);

  // Visit summary toggles
  const [showVitals, setShowVitals] = useState(true);
  const [showMedAdherence, setShowMedAdherence] = useState(true);
  const [showSymptoms, setShowSymptoms] = useState(true);
  const [showQuestions, setShowQuestions] = useState(true);

  // Preview modal
  const [showPreview, setShowPreview] = useState(false);
  const [previewHTML, setPreviewHTML] = useState('');
  const [exporting, setExporting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [appointmentId])
  );

  const loadData = async () => {
    try {
      setLoading(true);

      const appointments = await getUpcomingAppointments();
      let appt: Appointment | null = null;

      if (appointmentId) {
        appt = appointments.find(a => a.id === appointmentId) ?? appointments[0] ?? null;
      } else {
        appt = appointments[0] ?? null;
      }

      setAppointment(appt);

      if (appt) {
        // Estimate days since last visit (use 30 as default)
        setDaysSinceLastVisit(30);

        // Load persisted prep checklist
        const savedChecklist = await getPrepChecklist(appt);

        // Merge auto-generated insight questions into checklist
        try {
          const providerQs = await generateProviderQuestions(appt.id, 30);
          if (providerQs.length > 0) {
            const existingLabels = new Set(savedChecklist.items.map(i => i.label));
            let updated = false;
            for (const q of providerQs) {
              if (!existingLabels.has(q.question)) {
                savedChecklist.items.push({
                  id: `insight-${q.id}`,
                  label: q.question,
                  checked: true,
                  source: 'auto',
                });
                updated = true;
              }
            }
            if (updated) {
              // Persist the merged checklist
              await updatePrepChecklistItem(appt.id, savedChecklist.items[0].id, savedChecklist.items[0].checked);
            }
          }
        } catch {
          // Insight questions failed — proceed with default checklist
        }

        setChecklist({ ...savedChecklist });

        // Load event-based changes summary
        try {
          const lastVisitDate = subDays(new Date(), 30).toISOString().split('T')[0];
          const changesData = await generateChangesSinceLastVisit(lastVisitDate);
          setChanges(changesData);
          setDoctorQuestions(generateDoctorQuestions(changesData));
          setDaysSinceLastVisit(changesData.daysInPeriod);
        } catch {
          // Event-based summary failed — proceed without it
        }
      }
    } catch (error) {
      logError('ProviderPrepScreen.loadData', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = useCallback(async (itemId: string, checked: boolean) => {
    if (!appointment) return;
    const updated = await updatePrepChecklistItem(appointment.id, itemId, checked);
    if (updated) setChecklist({ ...updated });
  }, [appointment]);

  const addCustomItem = useCallback(async () => {
    const trimmed = customInput.trim();
    if (!trimmed || !appointment) return;
    const updated = await addCustomPrepItem(appointment.id, trimmed);
    if (updated) setChecklist({ ...updated });
    setCustomInput('');
  }, [customInput, appointment]);

  const daysUntilAppointment = useMemo(() => {
    if (!appointment) return 0;
    const apptDate = new Date(appointment.date);
    const now = new Date();
    return Math.max(0, Math.ceil((apptDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  }, [appointment]);

  const buildReportData = useCallback(async () => {
    const patientName = await safeGetItem<string>(StorageKeys.PATIENT_NAME, 'Patient');

    const allQuestions = checklist
      ? checklist.items.filter(i => i.checked).map(i => i.label)
      : [];

    const sections: string[] = [];

    // Appointment header
    if (appointment) {
      sections.push(`Provider: ${appointment.provider || 'Provider'}`);
      sections.push(`Date: ${format(new Date(appointment.date), 'MMMM d, yyyy')}`);
      sections.push(`Specialty: ${appointment.specialty || 'General'}`);
      sections.push('');
    }

    // Vitals Trend
    if (showVitals) {
      try {
        const allVitals = await getVitals();
        const cutoff = subDays(new Date(), 30).toISOString();
        const recent = allVitals.filter(v => v.timestamp >= cutoff);

        if (recent.length > 0) {
          sections.push('Vitals Trend (Last 30 Days):');

          const byType = new Map<string, VitalReading[]>();
          recent.forEach(v => {
            const arr = byType.get(v.type) || [];
            arr.push(v);
            byType.set(v.type, arr);
          });

          byType.forEach((readings, type) => {
            const sorted = readings.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
            const latest = sorted[0];
            const values = sorted.map(r => r.value);
            const min = Math.min(...values);
            const max = Math.max(...values);
            const label = type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

            if (min === max) {
              sections.push(`  ${label}: ${latest.value} ${latest.unit}`);
            } else {
              sections.push(`  ${label}: ${latest.value} ${latest.unit} (range: ${min}\u2013${max})`);
            }
          });
          sections.push('');
        }
      } catch {
        // Vitals fetch failed — skip silently
      }
    }

    // Med Adherence
    if (showMedAdherence) {
      try {
        const meds = await getMedications();
        const logs = await getMedicationLogs();
        const cutoff = subDays(new Date(), 30).toISOString();
        const recentLogs = logs.filter(l => l.timestamp >= cutoff);

        if (meds.length > 0) {
          sections.push('Medication Adherence (Last 30 Days):');

          meds.forEach(med => {
            const medLogs = recentLogs.filter(l => l.medicationId === med.id);
            const taken = medLogs.filter(l => l.taken).length;
            const total = medLogs.length;
            const pct = total > 0 ? Math.round((taken / total) * 100) : 0;
            sections.push(`  ${med.name} ${med.dosage || ''}: ${pct}% (${taken}/${total} doses)`.trim());
          });
          sections.push('');
        }
      } catch {
        // Med adherence fetch failed — skip silently
      }
    }

    // Symptom Log
    if (showSymptoms) {
      try {
        const allSymptoms = await getSymptoms();
        const cutoff = subDays(new Date(), 30).toISOString();
        const recent = allSymptoms.filter(s => s.timestamp >= cutoff);

        if (recent.length > 0) {
          sections.push('Recent Symptoms (Last 30 Days):');

          const byName = new Map<string, SymptomLog[]>();
          recent.forEach(s => {
            const arr = byName.get(s.symptom) || [];
            arr.push(s);
            byName.set(s.symptom, arr);
          });

          byName.forEach((logs, name) => {
            const avgSeverity = Math.round(logs.reduce((sum, l) => sum + l.severity, 0) / logs.length);
            sections.push(`  ${name}: ${logs.length}\u00D7 reported, avg severity ${avgSeverity}/10`);
          });
          sections.push('');
        }
      } catch {
        // Symptom fetch failed — skip silently
      }
    }

    // Questions
    if (showQuestions && allQuestions.length > 0) {
      sections.push('Questions to Ask:');
      allQuestions.forEach((q, i) => sections.push(`  ${i + 1}. ${q}`));
      sections.push('');
    }

    return {
      reportData: {
        title: `Visit Prep - ${appointment?.provider || 'Provider'}`,
        period: format(new Date(), 'MMMM d, yyyy'),
        periodLabel: 'Prepared',
        summary: sections.join('\n'),
        details: allQuestions.map((q: string, i: number) => ({
          label: `Question ${i + 1}`,
          value: q,
        })),
      },
      patient: { name: patientName || 'Patient' },
    };
  }, [appointment, checklist, showVitals, showMedAdherence, showSymptoms, showQuestions]);

  const handlePreview = useCallback(async () => {
    try {
      const { reportData, patient } = await buildReportData();
      const html = generatePreviewHTML(reportData, patient);
      setPreviewHTML(html);
      setShowPreview(true);
    } catch (error) {
      logError('ProviderPrepScreen.handlePreview', error);
      Alert.alert('Preview Error', 'Unable to generate preview. Please try again.');
    }
  }, [buildReportData]);

  const handleExport = useCallback(async () => {
    try {
      setExporting(true);
      const { reportData, patient } = await buildReportData();
      await generateAndSharePDF(reportData, patient);
      setShowPreview(false);
    } catch (error) {
      logError('ProviderPrepScreen.handleExport', error);
      Alert.alert('Export Error', 'Unable to generate PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  }, [buildReportData]);

  if (loading) {
    return (
      <View style={styles.container}>
        <AuroraBackground variant="hub" />
        <View style={{ flex: 1, paddingTop: insets.top }}>
          <SubScreenHeader title="Visit Prep" />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        </View>
      </View>
    );
  }

  if (!appointment) {
    return (
      <View style={styles.container}>
        <AuroraBackground variant="hub" />
        <View style={{ flex: 1, paddingTop: insets.top }}>
          <SubScreenHeader title="Visit Prep" />
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No upcoming appointments found.</Text>
            <Text style={styles.emptySubtext}>Add an appointment to start preparing.</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AuroraBackground variant="hub" />
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <SubScreenHeader
          title="Visit Prep"
                    rightAction={
            <TouchableOpacity
              onPress={handlePreview}
              style={styles.exportButton}
              accessibilityLabel="Preview visit prep report"
              accessibilityRole="button"
            >
              <Text style={styles.exportButtonText}>Export</Text>
            </TouchableOpacity>
          }
        />

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Appointment Header */}
          <GlassCard style={styles.appointmentHeader}>
            <Text style={styles.providerName}>{appointment.provider || 'Provider'}</Text>
            <Text style={styles.appointmentMeta}>
              {appointment.specialty || 'Appointment'} {'\u00B7'} {format(new Date(appointment.date), 'MMMM d, yyyy')}
            </Text>
            <View style={styles.daysRow}>
              <View style={styles.daysPill}>
                <Text style={styles.daysPillText}>
                  {daysUntilAppointment === 0 ? 'Today' : `In ${daysUntilAppointment} day${daysUntilAppointment !== 1 ? 's' : ''}`}
                </Text>
              </View>
              <Text style={styles.dataSince}>
                ~{daysSinceLastVisit} days of data since last visit
              </Text>
            </View>
          </GlassCard>

          {/* Changes since last visit */}
          {changes && (
            <View style={{ marginBottom: 16 }}>
              <TouchableOpacity
                onPress={() => setChangesExpanded(!changesExpanded)}
                activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}
              >
                <Text style={styles.sectionTitle}>Changes Since Last Visit</Text>
                <Text style={{ fontSize: 12, color: colors.textMuted }}>{changesExpanded ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
              {changesExpanded && (
                <GlassCard style={{ gap: 6 }}>
                  {changes.totalEvents === 0 ? (
                    <Text style={{ fontSize: 13, color: colors.textMuted, fontStyle: 'italic' }}>No data to report for this period.</Text>
                  ) : (
                    <>
                      {changes.adherenceRate !== null && (
                        <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                          Medication adherence: {changes.adherenceRate}% ({changes.medicationsMissed} doses missed)
                        </Text>
                      )}
                      {changes.lowHydrationDays > 0 && (
                        <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                          Hydration low on {changes.lowHydrationDays} of {changes.daysInPeriod} days
                        </Text>
                      )}
                      {changes.symptomCounts.map(s => (
                        <Text key={s.name} style={{ fontSize: 13, color: colors.textSecondary }}>
                          {s.name} reported {s.count} time{s.count !== 1 ? 's' : ''}
                        </Text>
                      ))}
                      {changes.vitalsAlerts.map((alert, i) => (
                        <Text key={i} style={{ fontSize: 13, color: colors.textSecondary }}>
                          {alert}
                        </Text>
                      ))}
                    </>
                  )}
                </GlassCard>
              )}
            </View>
          )}

          {/* Suggested questions from event data */}
          {doctorQuestions.length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.sectionTitle}>Suggested Questions</Text>
              {doctorQuestions.map(q => (
                <TouchableOpacity
                  key={q.id}
                  style={[styles.questionCard, q.selected && styles.questionCardChecked]}
                  onPress={() => setDoctorQuestions(prev => prev.map(dq => dq.id === q.id ? { ...dq, selected: !dq.selected } : dq))}
                  activeOpacity={0.7}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: q.selected }}
                >
                  <View style={styles.questionLeft}>
                    <View style={[styles.checkbox, q.selected && styles.checkboxChecked]}>
                      {q.selected && <Text style={styles.checkmark}>{'\u2713'}</Text>}
                    </View>
                  </View>
                  <View style={styles.questionContent}>
                    <Text style={styles.questionText}>{q.question}</Text>
                    <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{q.reason}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Prep Checklist — persisted per appointment */}
          <Text style={styles.sectionTitle}>Questions for Your Provider</Text>
          {(!checklist || checklist.items.length === 0) && (
            <Text style={styles.noQuestionsText}>
              No data-driven questions detected. Add your own below.
            </Text>
          )}

          {checklist && checklist.items.length > 0 && checklist.items.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.questionCard,
                item.checked && styles.questionCardChecked,
              ]}
              onPress={() => toggleItem(item.id, !item.checked)}
              activeOpacity={0.7}
              accessibilityLabel={`${item.checked ? 'Uncheck' : 'Check'}: ${item.label}`}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: item.checked }}
            >
              <View style={styles.questionLeft}>
                <View style={[
                  styles.checkbox,
                  item.checked && styles.checkboxChecked,
                ]}>
                  {item.checked && (
                    <Text style={styles.checkmark}>{'\u2713'}</Text>
                  )}
                </View>
              </View>
              <View style={styles.questionContent}>
                <Text style={styles.questionText}>{item.label}</Text>
              </View>
              {item.source === 'custom' && (
                <TouchableOpacity
                  onPress={async () => {
                    if (!appointment) return;
                    const updated = await removeCustomPrepItem(appointment.id, item.id);
                    if (updated) setChecklist({ ...updated });
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel={`Remove question: ${item.label}`}
                >
                  <Text style={{ fontSize: 16, color: colors.textMuted }}>{'\u2715'}</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))}

          {/* Add custom question */}
          <View style={styles.addQuestionRow}>
            <TextInput
              style={styles.addQuestionInput}
              value={customInput}
              onChangeText={setCustomInput}
              placeholder="Add your own question..."
              placeholderTextColor={colors.textMuted}
              onSubmitEditing={addCustomItem}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[styles.addButton, !customInput.trim() && styles.addButtonDisabled]}
              onPress={addCustomItem}
              disabled={!customInput.trim()}
              accessibilityLabel="Add question"
              accessibilityRole="button"
            >
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          {/* Visit Summary Sheet */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Visit Summary</Text>
          <Text style={styles.sectionSubtitle}>Toggle sections to include in your export</Text>

          <View style={styles.toggleSection}>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Vitals Trend</Text>
              <Switch
                value={showVitals}
                onValueChange={setShowVitals}
                trackColor={{ false: colors.glassDim, true: colors.accentLight }}
                thumbColor={showVitals ? colors.accent : colors.textMuted}
              />
            </View>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Med Adherence</Text>
              <Switch
                value={showMedAdherence}
                onValueChange={setShowMedAdherence}
                trackColor={{ false: colors.glassDim, true: colors.accentLight }}
                thumbColor={showMedAdherence ? colors.accent : colors.textMuted}
              />
            </View>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Symptom Log</Text>
              <Switch
                value={showSymptoms}
                onValueChange={setShowSymptoms}
                trackColor={{ false: colors.glassDim, true: colors.accentLight }}
                thumbColor={showSymptoms ? colors.accent : colors.textMuted}
              />
            </View>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Your Questions</Text>
              <Switch
                value={showQuestions}
                onValueChange={setShowQuestions}
                trackColor={{ false: colors.glassDim, true: colors.accentLight }}
                thumbColor={showQuestions ? colors.accent : colors.textMuted}
              />
            </View>
          </View>

          {/* Export button */}
          <TouchableOpacity
            style={styles.exportFooterButton}
            onPress={handlePreview}
            activeOpacity={0.7}
            accessibilityLabel="Preview visit prep report"
            accessibilityRole="button"
          >
            <Text style={styles.exportFooterText}>Export PDF</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>

        <ReportPreviewModal
          visible={showPreview}
          title="Report Preview"
          infoText="This is a preview of your report. Tap 'Share PDF' to export."
          previewLines={previewHTML ? previewHTML.split('\n').filter(Boolean) : []}
          onExport={handleExport}
          onClose={() => setShowPreview(false)}
          exporting={exporting}
        />
      </View>
    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    color: c.textSecondary,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 13,
    color: c.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  exportButton: {
    backgroundColor: c.accent,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  exportButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textPrimary,
  },

  // Appointment header
  appointmentHeader: {
    marginBottom: 20,
  },
  providerName: {
    fontSize: 18,
    fontWeight: '700',
    color: c.textPrimary,
    marginBottom: 4,
  },
  appointmentMeta: {
    fontSize: 13,
    color: c.textSecondary,
    marginBottom: 10,
  },
  daysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  daysPill: {
    backgroundColor: c.accentLight,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  daysPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: c.accent,
  },
  dataSince: {
    fontSize: 12,
    color: c.textMuted,
  },

  // Questions
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textBright,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: c.textMuted,
    marginBottom: 12,
  },
  noQuestionsText: {
    fontSize: 13,
    color: c.textMuted,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  questionCard: {
    flexDirection: 'row',
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.glassBorder,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: 8,
    gap: 10,
  },
  questionCardChecked: {
    backgroundColor: c.accentFaint,
    borderColor: c.accentBorder,
  },
  questionLeft: {
    marginTop: 2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: c.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: c.accent,
    borderColor: c.accent,
  },
  checkmark: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
  },
  questionContent: {
    flex: 1,
  },
  questionText: {
    fontSize: 14,
    color: c.textBright,
    lineHeight: 20,
  },
  // Add question
  addQuestionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  addQuestionInput: {
    flex: 1,
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.glassBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: c.textBright,
  },
  addButton: {
    backgroundColor: c.accent,
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  addButtonDisabled: {
    opacity: 0.4,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textPrimary,
  },

  // Visit summary toggles
  toggleSection: {
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.glassBorder,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.glassBorder,
  },
  toggleLabel: {
    fontSize: 14,
    color: c.textBright,
  },

  // Export footer
  exportFooterButton: {
    backgroundColor: c.accent,
    borderRadius: BorderRadius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  exportFooterText: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
  },

});
