// ============================================================================
// UNIFIED CARE REPORT SCREEN
// Consolidates 4 report screens into one with a scope selector:
//   Handoff (from care-brief), Today (from daily-care-report),
//   Visit Prep (from providerPrepBuilder), Full Report (from care-summary-export)
// ============================================================================

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Switch,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';

import { Colors, Spacing, BorderRadius } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import { AuroraBackground } from '../components/aurora/AuroraBackground';
import { GlassCard } from '../components/aurora/GlassCard';
import { SubScreenHeader } from '../components/SubScreenHeader';

// Data sources
import { getMedications, getMedicationLogs, Medication, MedicationLog } from '../utils/medicationStorage';
import { getUpcomingAppointments, Appointment } from '../utils/appointmentStorage';
import { getMedicalInfo, MedicalInfo } from '../utils/medicalInfo';
import { getEmergencyContacts, CareTeamMember } from '../utils/careTeamStorage';
import { getTodayVitalsLog, getTodayMoodLog, getTodayMealsLog, getTodayNotesLog } from '../utils/centralStorage';
import { getCareActivities, CareActivity } from '../utils/collaborativeCare';
import { safeGetItem } from '../utils/safeStorage';
import { StorageKeys } from '../utils/storageKeys';
import { getTodayDateString } from '../services/carePlanGenerator';

// Report utilities
import { buildCareBrief, CareBrief } from '../utils/careSummaryBuilder';
import { generateComprehensiveReport } from '../utils/reportGenerator';
import { generateAndSharePDF, ReportData as PdfReportData, PatientInfo } from '../utils/pdfExport';
import { getAllInsights, InsightData } from '../utils/insightEngine';
import { buildProviderPrep, ProviderPrepData } from '../utils/providerPrepBuilder';
import { logError } from '../utils/devLog';
import { navigate } from '../lib/navigate';
import { logAuditEvent, AuditEventType, AuditSeverity } from '../utils/auditLog';
import { checkFeatureAccess } from '../utils/featureGate';

// ============================================================================
// TYPES
// ============================================================================

type ReportScope = 'handoff' | 'today' | 'visit' | 'full';

interface ScopeOption {
  id: ReportScope;
  label: string;
  icon: string;
}

const SCOPE_OPTIONS: ScopeOption[] = [
  { id: 'handoff', label: 'Handoff', icon: '\uD83D\uDD04' },
  { id: 'today', label: 'Today', icon: '\uD83D\uDCCB' },
  { id: 'visit', label: 'Visit Prep', icon: '\uD83E\uDE7A' },
  { id: 'full', label: 'Full Report', icon: '\uD83D\uDCCA' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CareReportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const initialScope = (params.scope as ReportScope) || 'handoff';

  const [scope, setScope] = useState<ReportScope>(initialScope);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Shared data
  const [patientName, setPatientName] = useState('Patient');
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medicationLogs, setMedicationLogs] = useState<MedicationLog[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [medicalInfo, setMedicalInfo] = useState<MedicalInfo | null>(null);
  const [emergencyContacts, setEmergencyContacts] = useState<CareTeamMember[]>([]);
  const [careBrief, setCareBrief] = useState<CareBrief | null>(null);
  const [insights, setInsights] = useState<InsightData[]>([]);
  const [providerPrep, setProviderPrep] = useState<ProviderPrepData | null>(null);

  // Today-specific data
  const [vitalsLog, setVitalsLog] = useState<any>(null);
  const [moodLog, setMoodLog] = useState<any>(null);
  const [mealsLog, setMealsLog] = useState<any>(null);
  const [notesLog, setNotesLog] = useState<any>(null);
  const [careActivities, setCareActivities] = useState<CareActivity[]>([]);
  const [caregiverName, setCaregiverName] = useState('Primary Caregiver');

  // Full report sections
  const [sections, setSections] = useState({
    demographics: true,
    medications: true,
    adherence: true,
    vitals: true,
    symptoms: true,
    appointments: true,
    contacts: true,
  });

  // Visit prep state
  const [checkedQuestions, setCheckedQuestions] = useState<Set<string>>(new Set());

  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const loadData = useCallback(async () => {
    try {
      const [name, cgName, meds, allLogs, appts, mi, contacts, brief, allInsights, prep, vitals, mood, meals, notes, activities] = await Promise.all([
        safeGetItem<string | null>(StorageKeys.PATIENT_NAME, null),
        safeGetItem<string | null>(StorageKeys.CAREGIVER_NAME, null),
        getMedications(),
        getMedicationLogs(),
        getUpcomingAppointments(),
        getMedicalInfo(),
        getEmergencyContacts(),
        buildCareBrief(),
        getAllInsights(),
        buildProviderPrep(),
        getTodayVitalsLog(),
        getTodayMoodLog(),
        getTodayMealsLog(),
        getTodayNotesLog(),
        getCareActivities(10),
      ]);

      if (name) setPatientName(name);
      if (cgName) setCaregiverName(cgName);
      setMedications(meds.filter(m => m.active));
      setMedicationLogs(allLogs);
      setAppointments(appts);
      setMedicalInfo(mi);
      setEmergencyContacts(contacts);
      setCareBrief(brief);
      setInsights(allInsights);
      setProviderPrep(prep);
      setVitalsLog(vitals);
      setMoodLog(mood);
      setMealsLog(meals);
      setNotesLog(notes);
      setCareActivities(activities);
    } catch (err) {
      logError('CareReportScreen.loadData', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadData();
  }, [loadData]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // ========================================================================
  // EXPORT HANDLER
  // ========================================================================

  const handleExport = useCallback(async () => {
    Alert.alert(
      'Export Care Report?',
      'This report contains sensitive health information. Only share with trusted caregivers or healthcare providers.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Export', onPress: doExport },
      ]
    );
  }, [scope, careBrief, patientName, sections]);

  const doExport = useCallback(async () => {
    try {
      const gate = await checkFeatureAccess('pdf_export');
      if (!gate.allowed) {
        router.push('/upgrade');
        return;
      }

      setExporting(true);
      await logAuditEvent(
        AuditEventType.CARE_BRIEF_EXPORTED,
        `Care report exported: ${scope}`,
        AuditSeverity.WARNING,
        { format: 'pdf', scope }
      );

      if (scope === 'handoff') {
        const report = await generateComprehensiveReport();
        const reportData: PdfReportData = {
          title: 'Care Handoff Report',
          period: 'Past 7-30 days',
          periodLabel: `Report generated ${new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`,
          summary: report.clinicalSummary,
          details: [
            { label: 'Overall Status', value: report.redFlags.length === 0 ? 'Stable' : report.redFlags.filter(f => f.severity === 'high').length > 0 ? 'Needs Attention' : 'Watch' },
            { label: 'Medication Adherence (7-day)', value: `${report.medicationAdherence.overallAdherence}%` },
            { label: 'Active Alerts', value: `${report.redFlags.length} item${report.redFlags.length !== 1 ? 's' : ''}` },
            { label: 'Blood Pressure Range', value: report.vitalsStability.trends.bloodPressure.range },
            { label: 'Heart Rate Range', value: report.vitalsStability.trends.heartRate.range },
            { label: 'O2 Saturation Range', value: report.vitalsStability.trends.oxygenSaturation.range },
            { label: 'Primary Concerns', value: report.concerns.length > 0 ? report.concerns.slice(0, 2).join('; ') : 'None' },
          ],
          generatedAt: report.generatedAt,
        };
        await generateAndSharePDF(reportData, { name: patientName });
      } else if (scope === 'today') {
        await exportTodayReport();
      } else if (scope === 'visit') {
        await exportVisitPrepReport();
      } else {
        await exportFullReport();
      }
    } catch (error) {
      logError('CareReportScreen.doExport', error);
      Alert.alert('Error', 'Failed to generate report. Please try again.');
    } finally {
      setExporting(false);
    }
  }, [scope, careBrief, patientName, sections]);

  const exportTodayReport = async () => {
    if (!careBrief) return;
    const details: Array<{ label: string; value: string }> = [];
    const taken = medications.filter(m => m.taken).length;
    details.push({ label: 'Medications', value: `${taken}/${medications.length} taken` });
    if (vitalsLog) {
      if (vitalsLog.systolic && vitalsLog.diastolic) details.push({ label: 'Blood Pressure', value: `${vitalsLog.systolic}/${vitalsLog.diastolic} mmHg` });
      if (vitalsLog.heartRate) details.push({ label: 'Heart Rate', value: `${vitalsLog.heartRate} bpm` });
    }
    const reportData: PdfReportData = {
      title: 'Daily Care Report',
      period: 'Today',
      periodLabel: `Generated on ${new Date().toLocaleDateString()}`,
      summary: careBrief.statusNarrative || 'Daily care summary',
      details,
      generatedAt: new Date(),
    };
    await generateAndSharePDF(reportData, { name: patientName });
  };

  const exportVisitPrepReport = async () => {
    if (!careBrief) return;
    const details: Array<{ label: string; value: string }> = [];
    if (providerPrep) {
      details.push({ label: 'Appointment', value: `${providerPrep.appointment.specialty} with ${providerPrep.appointment.provider}` });
      details.push({ label: 'Date', value: providerPrep.appointment.date });
      providerPrep.questions.forEach(q => {
        details.push({ label: 'Question', value: q.question });
      });
    }
    medications.forEach(med => {
      details.push({ label: med.name, value: `${med.dosage || 'No dosage'} - ${med.taken ? 'taken' : 'pending'}` });
    });
    const reportData: PdfReportData = {
      title: 'Visit Prep Report',
      period: 'Provider Preparation',
      periodLabel: `Generated on ${new Date().toLocaleDateString()}`,
      summary: careBrief.handoffNarrative || 'Visit preparation summary',
      details,
      generatedAt: new Date(),
    };
    await generateAndSharePDF(reportData, { name: patientName });
  };

  const exportFullReport = async () => {
    if (!careBrief) return;
    const details: Array<{ label: string; value: string }> = [];

    if (sections.demographics) {
      details.push({ label: 'Patient', value: careBrief.patient.name || 'Not recorded' });
      if (careBrief.patient.age) details.push({ label: 'Age', value: careBrief.patient.age });
      if (careBrief.patient.gender) details.push({ label: 'Gender', value: careBrief.patient.gender });
      details.push({ label: 'Conditions', value: careBrief.patient.conditions?.length ? careBrief.patient.conditions.join(', ') : 'None recorded' });
      details.push({ label: 'Allergies', value: careBrief.patient.allergies?.length ? careBrief.patient.allergies.join(', ') : 'None recorded' });

      // Surgeries
      if (careBrief.medicalInfo?.surgeries?.length) {
        const surgeryList = careBrief.medicalInfo.surgeries
          .map(s => `${s.procedure}${s.date ? ` (${s.date})` : ''}`)
          .join(', ');
        details.push({ label: 'Surgeries', value: surgeryList });
      }

      // Emergency contact
      if (careBrief.medicalInfo?.emergencyNotes) {
        details.push({ label: 'Emergency Info', value: careBrief.medicalInfo.emergencyNotes });
      }
    }
    if (sections.medications) {
      careBrief.medications.forEach(med => {
        details.push({ label: med.name, value: `${med.dosage || 'No dosage'} - ${med.status}` });
      });
    }
    if (sections.adherence && careBrief.interpretations.medications) {
      details.push({ label: 'Medication Notes', value: careBrief.interpretations.medications });
    }
    if (sections.vitals) {
      const r = careBrief.vitals?.readings;
      if (r) {
        if (r.systolic && r.diastolic) details.push({ label: 'Blood Pressure', value: `${r.systolic}/${r.diastolic} mmHg` });
        if (r.heartRate) details.push({ label: 'Heart Rate', value: `${r.heartRate} bpm` });
        if (r.oxygen) details.push({ label: 'O2 Saturation', value: `${r.oxygen}%` });
      }
    }

    const reportData: PdfReportData = {
      title: 'Full Care Summary',
      period: 'Report Period',
      periodLabel: `Generated on ${new Date().toLocaleDateString()}`,
      summary: careBrief.handoffNarrative || careBrief.statusNarrative || 'Care summary for healthcare provider review',
      details,
      notes: careBrief.attentionItems.length > 0
        ? 'Attention Items:\n' + careBrief.attentionItems.map(a => `- ${a.text}${a.detail ? ' - ' + a.detail : ''}`).join('\n')
        : undefined,
      generatedAt: new Date(),
    };
    await generateAndSharePDF(reportData, { name: careBrief.patient.name || undefined, age: careBrief.patient.age || undefined });
  };

  // ========================================================================
  // DERIVED DATA
  // ========================================================================

  // Use CareBrief medication data (same source as Today page and Journal)
  // Fall back to legacy medicationStorage only if CareBrief is unavailable
  const briefMeds = careBrief?.medications ?? [];
  const activeMeds = medications; // Keep for Visit Prep and Full Report (need dosage, schedule info)

  const takenCount = briefMeds.length > 0
    ? briefMeds.filter(m => m.status === 'completed' || m.status === 'skipped').length
    : activeMeds.filter(m => m.taken).length;

  const missedMeds = briefMeds.length > 0
    ? medications.filter(med => {
        const briefMed = briefMeds.find(b => b.name.toLowerCase() === med.name.toLowerCase());
        return briefMed ? briefMed.status === 'pending' || briefMed.status === 'missed' : false;
      })
    : activeMeds.filter(m => !m.taken);

  const totalScheduledMeds = briefMeds.length > 0 ? briefMeds.length : activeMeds.length;
  const upcomingAppts = appointments.filter(a => {
    const daysUntil = Math.ceil((new Date(a.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil >= 0 && daysUntil <= 7;
  });

  const watchForItems = useMemo(() => {
    return insights.filter(i => i.severity === 'warning' || i.severity === 'alert');
  }, [insights]);

  // ========================================================================
  // RENDER
  // ========================================================================

  if (loading) {
    return (
      <View style={styles.container}>
        <AuroraBackground variant="hub" />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <SubScreenHeader title="Care Report" emoji={'\uD83D\uDCCB'} />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.loadingText}>Loading report...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AuroraBackground variant="hub" />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <SubScreenHeader
          title="Care Report"
          emoji={'\uD83D\uDCCB'}
          rightAction={
            <TouchableOpacity
              style={styles.exportButton}
              onPress={handleExport}
              disabled={exporting}
              accessibilityLabel="Share report"
              accessibilityRole="button"
            >
              <Text style={styles.exportButtonText}>
                {exporting ? 'Exporting...' : 'Share'}
              </Text>
            </TouchableOpacity>
          }
        />

        {/* Scope Selector */}
        <View style={styles.scopeSelector}>
          {SCOPE_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.id}
              style={[styles.scopeButton, scope === opt.id && styles.scopeButtonActive]}
              onPress={() => setScope(opt.id)}
              accessibilityLabel={opt.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: scope === opt.id }}
            >
              <Text style={styles.scopeIcon}>{opt.icon}</Text>
              <Text style={[styles.scopeLabel, scope === opt.id && styles.scopeLabelActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
        >
          {scope === 'handoff' && <HandoffView
            patientName={patientName}
            medications={activeMeds}
            takenCount={takenCount}
            missedMeds={missedMeds}
            totalScheduledMeds={totalScheduledMeds}
            appointments={appointments}
            upcomingAppts={upcomingAppts}
            medicalInfo={medicalInfo}
            emergencyContacts={emergencyContacts}
            careBrief={careBrief}
            watchForItems={watchForItems}
          />}

          {scope === 'today' && <TodayView
            patientName={patientName}
            caregiverName={caregiverName}
            medications={activeMeds}
            vitalsLog={vitalsLog}
            mealsLog={mealsLog}
            notesLog={notesLog}
            appointments={appointments}
            careActivities={careActivities}
            careBrief={careBrief}
          />}

          {scope === 'visit' && <VisitPrepView
            providerPrep={providerPrep}
            medications={activeMeds}
            careBrief={careBrief}
            checkedQuestions={checkedQuestions}
            onToggleQuestion={(id) => {
              setCheckedQuestions(prev => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              });
            }}
          />}

          {scope === 'full' && <FullReportView
            careBrief={careBrief}
            sections={sections}
            onToggleSection={(key) => setSections(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
          />}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ============================================================================
// HANDOFF VIEW
// ============================================================================

function HandoffView({
  patientName, medications, takenCount, missedMeds, totalScheduledMeds, appointments, upcomingAppts,
  medicalInfo, emergencyContacts, careBrief, watchForItems,
}: {
  patientName: string;
  medications: Medication[];
  takenCount: number;
  missedMeds: Medication[];
  totalScheduledMeds: number;
  appointments: Appointment[];
  upcomingAppts: Appointment[];
  medicalInfo: MedicalInfo | null;
  emergencyContacts: CareTeamMember[];
  careBrief: CareBrief | null;
  watchForItems: InsightData[];
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const totalMeds = totalScheduledMeds || medications.length;
  const statusLevel = missedMeds.length === 0 ? 'stable'
    : missedMeds.length >= totalMeds * 0.5 ? 'concerning'
    : 'attention';
  const statusText = statusLevel === 'stable' ? 'Stable'
    : statusLevel === 'concerning' ? 'Concerning'
    : 'Needs Attention';

  const clinicalSummary = useMemo(() => {
    const parts: string[] = [];
    if (totalMeds === 0) parts.push('No medications scheduled');
    else if (takenCount === 0) parts.push(`No medications logged today (${totalMeds} scheduled)`);
    else if (missedMeds.length > 0) parts.push(`${missedMeds.length} doses not logged`);
    else parts.push('All scheduled medications logged');

    if (upcomingAppts.length > 0) {
      const next = upcomingAppts[0];
      const daysUntil = Math.ceil((new Date(next.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil === 0) parts.push(`${next.specialty} appointment today`);
      else if (daysUntil <= 3) parts.push(`${next.specialty} follow-up in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`);
    }
    return parts.length > 0 ? parts.join('; ') + '.' : 'No current concerns.';
  }, [totalMeds, takenCount, missedMeds, upcomingAppts]);

  return (
    <>
      {/* Status Banner */}
      <GlassCard style={styles.statusBanner}>
        <View style={styles.statusRow}>
          <View style={[
            styles.statusDot,
            statusLevel === 'stable' && { backgroundColor: colors.green },
            statusLevel === 'attention' && { backgroundColor: colors.amber },
            statusLevel === 'concerning' && { backgroundColor: colors.red },
          ]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.statusLabel}>CURRENT STATUS</Text>
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
        </View>
      </GlassCard>

      {/* Clinical Summary */}
      <GlassCard style={styles.sectionCard}>
        <Text style={styles.sectionLabel}>CLINICAL SUMMARY</Text>
        <Text style={styles.sectionBody}>{clinicalSummary}</Text>
      </GlassCard>

      {/* Needs Attention */}
      {(missedMeds.length > 0 || upcomingAppts.some(a => {
        const d = Math.ceil((new Date(a.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        return d <= 3;
      })) && (
        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>NEEDS ATTENTION</Text>
          {missedMeds.length > 0 && (
            <View style={styles.attentionItem}>
              <Text style={styles.attentionTitle}>Medication Logging</Text>
              <Text style={styles.attentionDetail}>
                {takenCount === 0 ? `No medications logged today. ${totalMeds} scheduled.` : `${missedMeds.length} dose${missedMeds.length !== 1 ? 's' : ''} not logged yet.`}
              </Text>
            </View>
          )}
          {upcomingAppts.filter(a => Math.ceil((new Date(a.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) <= 3).slice(0, 1).map((appt, i) => {
            const daysUntil = Math.ceil((new Date(appt.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            return (
              <View key={i} style={styles.attentionItem}>
                <Text style={styles.attentionTitle}>Upcoming Appointment</Text>
                <Text style={styles.attentionDetail}>
                  {appt.specialty} {daysUntil === 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`}
                </Text>
              </View>
            );
          })}
        </GlassCard>
      )}

      {/* Watch For (from insights) */}
      {watchForItems.length > 0 && (
        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>WATCH FOR</Text>
          {watchForItems.slice(0, 3).map(insight => (
            <View key={insight.id} style={styles.attentionItem}>
              <Text style={styles.attentionTitle}>{insight.title}</Text>
              <Text style={styles.attentionDetail}>{insight.context}</Text>
            </View>
          ))}
        </GlassCard>
      )}

      {/* Coming Up */}
      {upcomingAppts.length > 0 && (
        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>COMING UP (NEXT 7 DAYS)</Text>
          {upcomingAppts.slice(0, 3).map((appt, i) => (
            <View key={appt.id || i} style={styles.upcomingItem}>
              <Text style={styles.upcomingDate}>
                {new Date(appt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}
                {appt.time && ` AT ${appt.time}`}
              </Text>
              <Text style={styles.upcomingTitle}>{appt.specialty} - {appt.provider}</Text>
            </View>
          ))}
        </GlassCard>
      )}

      {/* Critical Context */}
      <GlassCard style={styles.sectionCard}>
        <Text style={styles.sectionLabel}>CRITICAL CONTEXT</Text>
        <View style={styles.contextRow}>
          <Text style={styles.contextLabel}>Allergies</Text>
          <Text style={styles.contextValue}>
            {medicalInfo?.allergies?.length ? medicalInfo.allergies.join(', ') : 'None reported'}
          </Text>
        </View>
        <View style={styles.contextRow}>
          <Text style={styles.contextLabel}>Active Diagnoses</Text>
          <Text style={styles.contextValue}>
            {medicalInfo?.diagnoses?.filter(d => d.status === 'active').length
              ? medicalInfo.diagnoses.filter(d => d.status === 'active').map(d => d.condition).join(', ')
              : 'Not specified'}
          </Text>
        </View>
        <View style={styles.contextRow}>
          <Text style={styles.contextLabel}>Emergency Contact</Text>
          <Text style={styles.contextValue}>
            {emergencyContacts.length > 0
              ? emergencyContacts.map(c => `${c.name}${c.phone ? ` (${c.phone})` : ''}`).join(', ')
              : 'Not configured'}
          </Text>
        </View>
      </GlassCard>
    </>
  );
}

// ============================================================================
// TODAY VIEW
// ============================================================================

function TodayView({
  patientName, caregiverName, medications, vitalsLog, mealsLog, notesLog, appointments, careActivities, careBrief,
}: {
  patientName: string;
  caregiverName: string;
  medications: Medication[];
  vitalsLog: any;
  mealsLog: any;
  notesLog: any;
  appointments: Appointment[];
  careActivities: CareActivity[];
  careBrief: CareBrief | null;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  // Use CareBrief medication status (aligned with Today page)
  const briefMeds = careBrief?.medications ?? [];
  const takenCount = briefMeds.length > 0
    ? briefMeds.filter(m => m.status === 'completed' || m.status === 'skipped').length
    : medications.filter(m => m.taken).length;
  const mealsLogged = mealsLog?.meals?.length || 0;
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const appointmentsToday = appointments.filter(a => a.date === todayStr).length;

  const vitalsData = useMemo(() => {
    const items: Array<{ type: string; value: string; unit: string; withinRange: boolean | null }> = [];
    if (!vitalsLog) return items;
    if (vitalsLog.systolic && vitalsLog.diastolic) {
      items.push({ type: 'Blood Pressure', value: `${vitalsLog.systolic}/${vitalsLog.diastolic}`, unit: 'mmHg', withinRange: vitalsLog.systolic < 130 && vitalsLog.diastolic < 80 });
    }
    if (vitalsLog.heartRate) {
      items.push({ type: 'Heart Rate', value: String(vitalsLog.heartRate), unit: 'bpm', withinRange: vitalsLog.heartRate >= 60 && vitalsLog.heartRate <= 100 });
    }
    if (vitalsLog.oxygenSaturation) {
      items.push({ type: 'O2 Saturation', value: String(vitalsLog.oxygenSaturation), unit: '%', withinRange: vitalsLog.oxygenSaturation >= 95 });
    }
    if (vitalsLog.temperature) {
      items.push({ type: 'Temperature', value: String(vitalsLog.temperature), unit: '\u00B0F', withinRange: vitalsLog.temperature >= 97.0 && vitalsLog.temperature <= 99.0 });
    }
    return items;
  }, [vitalsLog]);

  const notes = useMemo(() => {
    const items: Array<{ text: string; timestamp: string }> = [];
    if (notesLog?.notes && Array.isArray(notesLog.notes)) {
      notesLog.notes.forEach((note: any) => {
        if (note.text) {
          items.push({
            text: note.text,
            timestamp: note.timestamp ? format(new Date(note.timestamp), 'h:mm a') : 'Today',
          });
        }
      });
    }
    return items;
  }, [notesLog]);

  const todayActivities = useMemo(() => {
    return careActivities.filter(a => format(new Date(a.timestamp), 'yyyy-MM-dd') === todayStr);
  }, [careActivities, todayStr]);

  return (
    <>
      {/* Summary */}
      <GlassCard style={styles.sectionCard}>
        <Text style={styles.sectionLabel}>TODAY AT A GLANCE</Text>
        <Text style={styles.patientMeta}>{patientName} | {format(new Date(), 'MMMM d, yyyy')}</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{takenCount}/{medications.length}</Text>
            <Text style={styles.summaryItemLabel}>Meds Taken</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{vitalsData.length > 0 ? 'Yes' : 'No'}</Text>
            <Text style={styles.summaryItemLabel}>Vitals</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{mealsLogged}</Text>
            <Text style={styles.summaryItemLabel}>Meals</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{appointmentsToday}</Text>
            <Text style={styles.summaryItemLabel}>Appts</Text>
          </View>
        </View>
      </GlassCard>

      {/* Medications */}
      {medications.length > 0 && (
        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>MEDICATIONS</Text>
          {medications.map((med, i) => {
            const briefMed = briefMeds.find(b => b.name.toLowerCase() === med.name.toLowerCase());
            const isTaken = briefMed
              ? (briefMed.status === 'completed' || briefMed.status === 'skipped')
              : med.taken;
            const statusLabel = briefMed
              ? (briefMed.status === 'completed' ? 'Taken' : briefMed.status === 'skipped' ? 'Skipped' : briefMed.status === 'missed' ? 'Missed' : 'Pending')
              : (med.taken ? 'Taken' : 'Pending');

            return (
              <View key={med.id || i} style={styles.listItem}>
                <View style={styles.listItemRow}>
                  <Text style={styles.listItemName}>{med.name}</Text>
                  <Text style={[
                    styles.listItemStatus,
                    isTaken ? styles.statusTaken : styles.statusPending,
                  ]}>
                    {statusLabel}
                  </Text>
                </View>
                <Text style={styles.listItemDetail}>{med.dosage || 'As directed'}</Text>
              </View>
            );
          })}
        </GlassCard>
      )}

      {/* Vitals */}
      {vitalsData.length > 0 && (
        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>VITALS</Text>
          {vitalsData.map((vital, i) => (
            <View key={i} style={styles.listItem}>
              <Text style={styles.listItemName}>{vital.type}: {vital.value} {vital.unit}</Text>
              {vital.withinRange !== null && (
                <Text style={[styles.rangeNote, vital.withinRange ? styles.rangeNormal : styles.rangeAbnormal]}>
                  {vital.withinRange ? 'Within usual range' : 'Outside usual range'}
                </Text>
              )}
            </View>
          ))}
        </GlassCard>
      )}

      {/* Notes */}
      {notes.length > 0 && (
        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>CAREGIVER NOTES</Text>
          {notes.map((note, i) => (
            <View key={i} style={styles.listItem}>
              <Text style={styles.noteTime}>{note.timestamp}</Text>
              <Text style={styles.noteText}>{note.text}</Text>
            </View>
          ))}
        </GlassCard>
      )}

      {/* Team Activity */}
      {todayActivities.length > 0 && (
        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>CARE TEAM ACTIVITY</Text>
          {todayActivities.map((act, i) => (
            <View key={i} style={styles.listItem}>
              <Text style={styles.listItemName}>
                {format(new Date(act.timestamp), 'h:mm a')} - {act.performedBy}
              </Text>
              <Text style={styles.listItemDetail}>{act.details?.action || act.type}</Text>
            </View>
          ))}
        </GlassCard>
      )}

      <Text style={styles.disclaimer}>
        Personal tracking summary — not a medical record.
      </Text>
    </>
  );
}

// ============================================================================
// VISIT PREP VIEW
// ============================================================================

function VisitPrepView({
  providerPrep, medications, careBrief, checkedQuestions, onToggleQuestion,
}: {
  providerPrep: ProviderPrepData | null;
  medications: Medication[];
  careBrief: CareBrief | null;
  checkedQuestions: Set<string>;
  onToggleQuestion: (id: string) => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  if (!providerPrep) {
    return (
      <GlassCard style={styles.sectionCard}>
        <Text style={styles.emptyIcon}>{'\uD83E\uDE7A'}</Text>
        <Text style={styles.emptyTitle}>No Upcoming Appointments</Text>
        <Text style={styles.emptyText}>
          Visit prep will appear here when you have an appointment within the next 7 days.
        </Text>
      </GlassCard>
    );
  }

  return (
    <>
      {/* Appointment Info */}
      <GlassCard style={styles.sectionCard}>
        <Text style={styles.sectionLabel}>APPOINTMENT</Text>
        <Text style={styles.visitProvider}>{providerPrep.appointment.specialty}</Text>
        <Text style={styles.visitDetail}>
          {providerPrep.appointment.provider} | {providerPrep.appointment.date}
          {providerPrep.appointment.daysUntil === 0 ? ' (Today)' : providerPrep.appointment.daysUntil === 1 ? ' (Tomorrow)' : ` (In ${providerPrep.appointment.daysUntil} days)`}
        </Text>
      </GlassCard>

      {/* Questions Checklist */}
      <GlassCard style={styles.sectionCard}>
        <Text style={styles.sectionLabel}>QUESTIONS TO ASK</Text>
        {providerPrep.questions.map(q => (
          <TouchableOpacity
            key={q.id}
            style={styles.questionItem}
            onPress={() => onToggleQuestion(q.id)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: checkedQuestions.has(q.id) }}
          >
            <View style={[styles.checkbox, checkedQuestions.has(q.id) && styles.checkboxChecked]}>
              {checkedQuestions.has(q.id) && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={[styles.questionText, checkedQuestions.has(q.id) && styles.questionTextChecked]}>
              {q.question}
            </Text>
          </TouchableOpacity>
        ))}
      </GlassCard>

      {/* Current Medications */}
      <GlassCard style={styles.sectionCard}>
        <Text style={styles.sectionLabel}>CURRENT MEDICATIONS</Text>
        {medications.map((med, i) => (
          <View key={med.id || i} style={styles.listItem}>
            <Text style={styles.listItemName}>{med.name}</Text>
            <Text style={styles.listItemDetail}>{med.dosage || 'As directed'}</Text>
          </View>
        ))}
        {medications.length === 0 && (
          <Text style={styles.emptyText}>No medications tracked</Text>
        )}
      </GlassCard>

      {/* Attention Items */}
      {careBrief && careBrief.attentionItems.length > 0 && (
        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>BRING TO PROVIDER'S ATTENTION</Text>
          {careBrief.attentionItems.map((item, i) => (
            <View key={i} style={styles.attentionItem}>
              <Text style={styles.attentionTitle}>{item.text}</Text>
              {item.detail && <Text style={styles.attentionDetail}>{item.detail}</Text>}
            </View>
          ))}
        </GlassCard>
      )}

      {/* Full Prep link (Task 4.5) */}
      <TouchableOpacity
        style={styles.fullPrepButton}
        onPress={() => navigate('/provider-prep')}
        activeOpacity={0.7}
        accessibilityLabel="Open full provider prep with auto-generated questions"
        accessibilityRole="button"
      >
        <Text style={styles.fullPrepText}>Full Prep {'\u203A'}</Text>
        <Text style={styles.fullPrepSubtext}>Auto-generated questions from your data</Text>
      </TouchableOpacity>
    </>
  );
}

// ============================================================================
// FULL REPORT VIEW
// ============================================================================

function FullReportView({
  careBrief, sections, onToggleSection,
}: {
  careBrief: CareBrief | null;
  sections: Record<string, boolean>;
  onToggleSection: (key: string) => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const sectionItems = [
    { key: 'demographics', label: 'Patient information & demographics' },
    { key: 'medications', label: 'Complete medication list with dosages' },
    { key: 'adherence', label: 'Adherence trends & patterns' },
    { key: 'vitals', label: 'Recent vitals & measurements' },
    { key: 'symptoms', label: 'Symptom logs & correlations' },
    { key: 'appointments', label: 'Upcoming appointments' },
    { key: 'contacts', label: 'Care team contacts' },
  ];

  return (
    <>
      <GlassCard style={styles.sectionCard}>
        <Text style={styles.sectionLabel}>CHOOSE WHAT TO INCLUDE</Text>
        <Text style={styles.sectionSubtext}>Toggle sections off to minimize shared data</Text>
        {sectionItems.map(item => (
          <View key={item.key} style={styles.toggleItem}>
            <Text style={[styles.toggleLabel, !sections[item.key] && styles.toggleLabelDisabled]}>
              {item.label}
            </Text>
            <Switch
              value={sections[item.key]}
              onValueChange={() => onToggleSection(item.key)}
              trackColor={{ false: colors.borderMedium, true: colors.accentBorder }}
              thumbColor={sections[item.key] ? colors.accent : colors.textMuted}
              accessibilityLabel={`Include ${item.label}`}
            />
          </View>
        ))}
      </GlassCard>

      <GlassCard style={styles.sectionCard}>
        <View style={styles.privacyRow}>
          <Text style={styles.privacyIcon}>{'\uD83D\uDD12'}</Text>
          <Text style={styles.privacyText}>
            Reports are generated locally on your device and never stored on our servers.
            You control who receives this information.
          </Text>
        </View>
      </GlassCard>

      <Text style={styles.fullReportHint}>
        Tap "Share" above to generate and export the report with your selected sections.
      </Text>
    </>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: c.textMuted,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 16,
  },

  // Export button
  exportButton: {
    backgroundColor: `${c.accent}20`,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: `${c.accent}40`,
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.accent,
  },

  // Scope Selector
  scopeSelector: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: 8,
  },
  scopeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    gap: 4,
  },
  scopeButtonActive: {
    backgroundColor: `${c.accent}20`,
    borderColor: c.accent,
  },
  scopeIcon: {
    fontSize: 18,
  },
  scopeLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: c.textMuted,
  },
  scopeLabelActive: {
    color: c.accent,
    fontWeight: '600',
  },

  // Section Cards
  sectionCard: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: c.textHalf,
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  sectionBody: {
    fontSize: 15,
    lineHeight: 22,
    color: c.textPrimary,
  },
  sectionSubtext: {
    fontSize: 13,
    color: c.textTertiary,
    marginBottom: 14,
  },

  // Status Banner
  statusBanner: {
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: c.textMuted,
    marginBottom: 2,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textPrimary,
  },

  // Attention Items
  attentionItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  attentionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 2,
  },
  attentionDetail: {
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 18,
  },

  // Upcoming Items
  upcomingItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  upcomingDate: {
    fontSize: 11,
    fontWeight: '700',
    color: c.blue,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  upcomingTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: c.textPrimary,
  },

  // Context
  contextRow: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  contextLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: c.textMuted,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  contextValue: {
    fontSize: 14,
    color: c.textSecondary,
  },

  // Today view
  patientMeta: {
    fontSize: 13,
    color: c.textMuted,
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '600',
    color: c.textPrimary,
  },
  summaryItemLabel: {
    fontSize: 10,
    color: c.textMuted,
    marginTop: 2,
  },

  // List Items
  listItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  listItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textPrimary,
  },
  listItemDetail: {
    fontSize: 12,
    color: c.textMuted,
    marginTop: 2,
  },
  listItemStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTaken: {
    color: c.green,
  },
  statusPending: {
    color: c.amber,
  },

  // Range notes
  rangeNote: {
    fontSize: 12,
    marginTop: 2,
  },
  rangeNormal: {
    color: c.green,
  },
  rangeAbnormal: {
    color: c.red,
  },

  // Notes
  noteTime: {
    fontSize: 11,
    color: c.textMuted,
  },
  noteText: {
    fontSize: 14,
    color: c.textPrimary,
    marginTop: 2,
  },

  // Disclaimer
  disclaimer: {
    fontSize: 11,
    color: c.textMuted,
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },

  // Visit Prep
  visitProvider: {
    fontSize: 18,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 4,
  },
  visitDetail: {
    fontSize: 14,
    color: c.textSecondary,
  },
  questionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: c.accent,
    borderColor: c.accent,
  },
  checkmark: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '700',
  },
  questionText: {
    flex: 1,
    fontSize: 14,
    color: c.textPrimary,
    lineHeight: 20,
  },
  questionTextChecked: {
    color: c.textMuted,
    textDecorationLine: 'line-through',
  },

  // Empty state
  emptyIcon: {
    fontSize: 40,
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: c.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: c.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Full report
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  toggleLabel: {
    fontSize: 14,
    color: c.textSecondary,
    flex: 1,
    marginRight: 12,
  },
  toggleLabelDisabled: {
    color: c.textMuted,
    textDecorationLine: 'line-through',
  },
  privacyRow: {
    flexDirection: 'row',
    gap: 10,
  },
  privacyIcon: {
    fontSize: 18,
  },
  privacyText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: c.textTertiary,
  },
  fullReportHint: {
    fontSize: 13,
    color: c.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  fullPrepButton: {
    backgroundColor: c.accentFaint,
    borderWidth: 1,
    borderColor: c.accentBorder,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: 4,
  },
  fullPrepText: {
    fontSize: 15,
    fontWeight: '600',
    color: c.accent,
  },
  fullPrepSubtext: {
    fontSize: 12,
    color: c.textMuted,
    marginTop: 2,
  },
});
