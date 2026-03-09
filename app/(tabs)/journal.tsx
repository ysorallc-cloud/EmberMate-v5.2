// ============================================================================
// JOURNAL PAGE - Contextual reflection layer
// Three sections: Today's Story, Reflections, Visit Prep
// ============================================================================

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { navigate } from '../../lib/navigate';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuroraBackground } from '../../components/aurora/AuroraBackground';
import { Colors, BorderRadius } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import {
  buildCareBrief,
  CareBrief,
  MedicationDetail,
} from '../../utils/careSummaryBuilder';
import { logError } from '../../utils/devLog';
import { useEnabledBuckets } from '../../hooks/useCarePlanConfig';
import { getTodayDateString } from '../../services/carePlanGenerator';
import { logAuditEvent, AuditEventType, AuditSeverity } from '../../utils/auditLog';
import { useDataListener } from '../../lib/events';
import { EVENT } from '../../lib/eventNames';
import { isBiometricEnabled, shouldLockSession, requireAuthentication, updateLastActivity, getAutoLockTimeout } from '../../utils/biometricAuth';
import { getNotesLogs, NotesLog } from '../../utils/centralStorage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/ScreenHeader';
import { getMedicalInfo, MedicalInfo } from '../../utils/medicalInfo';
import { safeGetItem } from '../../utils/safeStorage';
import { StorageKeys } from '../../utils/storageKeys';
import { getMedications } from '../../utils/medicationStorage';
import { hasSampleData } from '../../utils/sampleDataManager';
import { ReportPreviewModal } from '../../components/shared/ReportPreviewModal';
import { buildDailySummaryReport, buildClinicalReportData } from '../../utils/reportBuilders';
import { generateAndSharePDF, ReportData } from '../../utils/pdfExport';
import {
  generateReflections,
  generateEnhancedNarrative,
  JournalReflection,
} from '../../utils/journalReflections';

// ============================================================================
// HELPERS
// ============================================================================

function formatTime(t: string): string {
  if (!t) return '';
  if (t.includes('T')) {
    const date = new Date(t);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  const parts = t.split(':');
  if (parts.length < 2) return t;
  const hr = parseInt(parts[0]);
  const min = parts[1];
  const period = hr >= 12 ? 'PM' : 'AM';
  return `${hr % 12 || 12}:${min} ${period}`;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function JournalTab() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => createStyles(colors), [colors]);
  const [brief, setBrief] = useState<CareBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [todayNotes, setTodayNotes] = useState<NotesLog[]>([]);
  const { enabledBuckets } = useEnabledBuckets();
  const [medicalInfo, setMedicalInfo] = useState<MedicalInfo | null>(null);
  const [patientName, setPatientName] = useState('');
  const [patientGender, setPatientGender] = useState<string | null>(null);
  const [patientAge, setPatientAge] = useState<string | null>(null);
  const [activeMedCount, setActiveMedCount] = useState(0);
  const [isSampleMode, setIsSampleMode] = useState(false);
  const [showDailyPreview, setShowDailyPreview] = useState(false);
  const [showClinicalPreview, setShowClinicalPreview] = useState(false);
  const [dailyReport, setDailyReport] = useState<{ reportData: ReportData; previewLines: string[] } | null>(null);
  const [clinicalReport, setClinicalReport] = useState<{ reportData: ReportData; previewLines: string[] } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [journalTab, setJournalTab] = useState<'story' | 'reflections' | 'visit'>('story');

  const loadReport = useCallback(async () => {
    try {
      setError(null);
      const data = await buildCareBrief();
      setBrief(data);

      try {
        const allNotes = await getNotesLogs();
        const today = new Date().toDateString();
        const filtered = allNotes.filter(
          (n) => new Date(n.timestamp).toDateString() === today
        );
        setTodayNotes(filtered);
      } catch {
        setTodayNotes([]);
      }

      // Load patient context for patient card + share
      try {
        const [mi, name, ageVal, genderVal, meds] = await Promise.all([
          getMedicalInfo(),
          safeGetItem<string>(StorageKeys.PATIENT_NAME, ''),
          safeGetItem<string | null>(StorageKeys.PATIENT_AGE ?? '@embermate_patient_age', null),
          safeGetItem<string | null>(StorageKeys.PATIENT_GENDER, null),
          getMedications(),
        ]);
        setMedicalInfo(mi);
        setPatientName(name || '');
        setPatientAge(ageVal);
        setPatientGender(genderVal);
        setActiveMedCount(meds?.length ?? 0);
      } catch {
        // Non-critical — patient card just won't show
      }

    } catch (err) {
      logError('JournalTab.loadReport', err);
      setError('Unable to load today\u2019s care summary. Pull down to retry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReport();
    logAuditEvent(AuditEventType.CARE_BRIEF_VIEWED, 'Care Brief viewed', AuditSeverity.INFO);
  }, [loadReport]);

  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLoadDoneRef = useRef(0);
  useDataListener(useCallback((category) => {
    if (![
      EVENT.DAILY_INSTANCES, EVENT.CARE_PLAN_ITEMS, EVENT.LOGS, EVENT.VITALS,
      EVENT.WATER, EVENT.SYMPTOMS, EVENT.MOOD, EVENT.WELLNESS, EVENT.MEDICATION,
      EVENT.NOTES, EVENT.CARE_PLAN, EVENT.CARE_PLAN_CONFIG, EVENT.SAMPLE_DATA_CLEARED,
      EVENT.APPOINTMENTS,
    ].includes(category as any)) return;
    // Suppress config events that are self-generated by ensureDailyInstances sync
    if (['carePlanItems', 'carePlanConfig'].includes(category) && Date.now() - lastLoadDoneRef.current < 2000) return;
    if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    reloadTimerRef.current = setTimeout(() => { loadReport().finally(() => { lastLoadDoneRef.current = Date.now(); }); }, 500);
    if (category === EVENT.SAMPLE_DATA_CLEARED) {
      setIsSampleMode(false);
    }
  }, [loadReport]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadReport();
    setRefreshing(false);
  }, [loadReport]);

  // Auth gate
  useFocusEffect(
    useCallback(() => {
      const checkAuth = async () => {
        try {
          const enabled = await isBiometricEnabled();
          if (enabled) {
            const timeout = await getAutoLockTimeout();
            const stale = await shouldLockSession(timeout);
            setAuthRequired(stale);
          } else {
            setAuthRequired(false);
          }
        } catch (error) {
          logError('JournalTab.checkAuth', error);
          setAuthRequired(false);
        }
      };
      checkAuth();
      hasSampleData().then(setIsSampleMode);
    }, [])
  );

  const handleAuthenticate = async () => {
    const success = await requireAuthentication();
    if (success) {
      await updateLastActivity();
      setAuthRequired(false);
    }
  };

  // ============================================================================
  // RENDER — AUTH GATE
  // ============================================================================

  if (authRequired) {
    return (
      <View style={s.container}>
        <AuroraBackground variant="journal" />
        <View style={s.authGateContainer}>
          <Text style={s.authGateIcon}>{'\uD83D\uDD12'}</Text>
          <Text style={s.authGateTitle}>Care Brief Protected</Text>
          <Text style={s.authGateSubtitle}>
            Authenticate to view sensitive health information
          </Text>
          <TouchableOpacity
            style={s.authGateButton}
            onPress={handleAuthenticate}
            accessibilityLabel="Authenticate to view Care Brief"
            accessibilityRole="button"
          >
            <Text style={s.authGateButtonText}>Authenticate</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  if (loading && !brief) {
    return (
      <View style={s.container}>
        <AuroraBackground variant="journal" />
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={s.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (error && !brief) {
    return (
      <View style={s.container}>
        <AuroraBackground variant="journal" />
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <ScrollView
            style={s.scrollView}
            contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 70 }]}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
            }
          >
            <ScreenHeader title="Journal" subtitle={`${dayName}, ${dateStr}`} purpose="What today's care means." />
            <View style={s.errorContainer}>
              <Text style={s.errorIcon}>{'\u26A0\uFE0F'}</Text>
              <Text style={s.errorText}>{error}</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  const medsDone = brief?.medications.filter(m => m.status === 'completed' || m.status === 'skipped').length ?? 0;
  const medsTotal = brief?.medications.length ?? 0;
  const allMedsDone = medsDone === medsTotal && medsTotal > 0;
  const medsMissed = brief?.medications.filter(m => m.status === 'missed').length ?? 0;

  const mealsDone = brief?.meals.meals.filter(m => m.status === 'completed' || m.status === 'skipped').length ?? 0;
  const mealsTotal = brief?.meals.total ?? 0;
  const mealsMissed = brief?.meals.meals.filter(m => m.status === 'missed').length ?? 0;

  const hasVitals = brief?.vitals.recorded ?? false;
  const wellnessDone = brief?.wellnessChecks.done ?? 0;
  const wellnessTotal = brief?.wellnessChecks.total ?? 0;
  const hasMorning = brief?.mood.morningWellness != null;
  const hasEvening = brief?.mood.eveningWellness != null;

  const waterGlasses = brief?.hydration.glasses ?? 0;

  // Appointment
  const daysUntilAppt = brief?.nextAppointment
    ? Math.max(0, Math.ceil((new Date(brief.nextAppointment.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;
  const showAppointment = brief?.nextAppointment && daysUntilAppt != null && daysUntilAppt <= 7;

  // ============================================================================
  // REFLECTIONS (generated where computed stats are available)
  // ============================================================================
  const reflections: JournalReflection[] = brief
    ? generateReflections(brief, {
        medsDone, medsTotal, mealsDone, mealsTotal,
        waterGlasses, wellnessDone, wellnessTotal,
        hasVitals, hasMorning, hasEvening,
      })
    : [];

  // ============================================================================
  // HELPERS FOR SHARE (glanceStats + handoffNotes still needed by report builder)
  // ============================================================================
  type DotColor = 'green' | 'amber' | 'red' | 'muted';

  function getMedsDotColor(): DotColor {
    if (medsTotal === 0) return 'muted';
    if (medsMissed > 0) return 'red';
    if (allMedsDone) return 'green';
    return 'amber';
  }

  function getMealsDotColor(): DotColor {
    if (mealsTotal === 0) return 'muted';
    if (mealsMissed > 0) return 'red';
    if (mealsDone >= mealsTotal && mealsTotal > 0) return 'green';
    return 'amber';
  }

  function getHydrationDotColor(): DotColor {
    if (waterGlasses >= 8) return 'green';
    if (waterGlasses === 0) return 'muted';
    return 'amber';
  }

  function getWellnessDotColor(): DotColor {
    if (wellnessTotal === 0) return 'muted';
    if (wellnessDone >= wellnessTotal) return 'green';
    if (wellnessDone > 0) return 'amber';
    return 'muted';
  }

  function getSleepDotColor(): DotColor {
    if (!brief?.sleep.logged) return 'muted';
    return 'green';
  }

  function getSleepValue(): string {
    if (!brief?.sleep.logged) return '\u2014';
    if (brief.sleep.hours != null) return `${brief.sleep.hours}h`;
    return 'Logged';
  }

  function getVitalsDotColor(): DotColor {
    if (!hasVitals) return 'muted';
    const r = brief?.vitals?.readings;
    if (r && ((r.systolic ?? 0) > 140 || (r.diastolic ?? 0) > 90 || ((r.oxygen ?? 100) < 92))) return 'red';
    return 'green';
  }

  function getVitalsValue(): string {
    if (!hasVitals) return '\u2014';
    const r = brief?.vitals?.readings;
    if (r?.systolic != null && r?.diastolic != null) return `${r.systolic}/${r.diastolic}`;
    return 'Logged';
  }

  function dotColorToStyle(dc: DotColor) {
    switch (dc) {
      case 'green': return colors.green;
      case 'amber': return colors.amberBright;
      case 'red': return colors.redBright;
      default: return colors.textTertiary;
    }
  }

  // Handoff notes for share report
  type HandoffType = 'done' | 'watch' | 'flag';
  interface HandoffItem { icon: string; text: string; type: HandoffType; }

  function buildHandoffNotes(): HandoffItem[] {
    if (!brief) return [];
    const items: HandoffItem[] = [];

    const seenMeds = new Set<string>();
    for (const med of brief.medications) {
      if ((med.status === 'completed' || med.status === 'skipped') && med.takenAt) {
        const timeStr = formatTime(med.takenAt);
        const dedupKey = `${med.name}|${timeStr}`;
        if (seenMeds.has(dedupKey)) continue;
        seenMeds.add(dedupKey);
        items.push({
          icon: '\uD83D\uDC8A',
          text: `${med.name} taken at ${timeStr}`,
          type: 'done',
        });
      }
    }

    if (brief.attentionItems) {
      for (const ai of brief.attentionItems) {
        const text = ai.text || '';
        let type: HandoffType = 'watch';
        if (/miss|skip|overdue/i.test(text)) type = 'flag';
        const icon = type === 'flag' ? '\uD83D\uDED1' : '\uD83D\uDC41\uFE0F';
        items.push({ icon, text, type });
      }
    }

    if (brief.interpretations?.medications) {
      items.push({ icon: '\uD83D\uDC8A', text: brief.interpretations.medications, type: 'watch' });
    }
    if (brief.interpretations?.vitals) {
      items.push({ icon: '\uD83C\uDF21\uFE0F', text: brief.interpretations.vitals, type: 'watch' });
    }
    if (brief.interpretations?.nutrition) {
      items.push({ icon: '\uD83C\uDF5E', text: brief.interpretations.nutrition, type: 'watch' });
    }

    return items;
  }

  // Glance stats for share report
  const allGlanceTiles: { bucket: string; label: string; value: string; color: string }[] = [
    { bucket: 'meds',     label: 'Meds',     value: `${medsDone}/${medsTotal}`,   color: dotColorToStyle(getMedsDotColor()) },
    { bucket: 'meals',    label: 'Meals',     value: `${mealsDone}/${mealsTotal}`, color: dotColorToStyle(getMealsDotColor()) },
    { bucket: 'water',    label: 'Water',     value: `${waterGlasses}/8`,          color: dotColorToStyle(getHydrationDotColor()) },
    { bucket: 'wellness', label: 'Wellness',  value: `${wellnessDone}/${wellnessTotal}`, color: dotColorToStyle(getWellnessDotColor()) },
    { bucket: 'sleep',    label: 'Sleep',     value: getSleepValue(),              color: dotColorToStyle(getSleepDotColor()) },
    { bucket: 'vitals',   label: 'BP',        value: getVitalsValue(),             color: dotColorToStyle(getVitalsDotColor()) },
  ];

  const glanceStats = enabledBuckets.length > 0
    ? allGlanceTiles.filter(t => enabledBuckets.includes(t.bucket as any))
    : allGlanceTiles;

  // ============================================================================
  // SHARE / REPORT HANDLERS
  // ============================================================================
  function handleShareDaily() {
    if (!brief) return;
    const result = buildDailySummaryReport(
      brief,
      dateStr,
      dayName,
      glanceStats,
      buildHandoffNotes(),
    );
    setDailyReport(result);
    setShowDailyPreview(true);
  }

  function handleShareClinical() {
    if (!brief) return;
    const result = buildClinicalReportData(brief);
    setClinicalReport(result);
    setShowClinicalPreview(true);
  }

  function handleDailyExport() {
    if (!dailyReport) return;
    Alert.alert(
      'Share Daily Summary',
      'This PDF contains health information. Only share with trusted caregivers or healthcare providers.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Share PDF',
          onPress: async () => {
            setExporting(true);
            try {
              await generateAndSharePDF(dailyReport.reportData, {
                name: patientName || undefined,
                age: patientAge || undefined,
              });
              setShowDailyPreview(false);
            } catch { /* user cancelled or error handled in util */ }
            setExporting(false);
          },
        },
      ],
    );
  }

  function handleClinicalExport() {
    if (!clinicalReport) return;
    Alert.alert(
      'Share Clinical Report',
      'This PDF contains full medical history, medications, and vitals. Only share with healthcare providers.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Share PDF',
          style: 'destructive',
          onPress: async () => {
            setExporting(true);
            try {
              await generateAndSharePDF(clinicalReport.reportData, {
                name: patientName || undefined,
                age: patientAge || undefined,
              });
              setShowClinicalPreview(false);
            } catch { /* user cancelled or error handled in util */ }
            setExporting(false);
          },
        },
      ],
    );
  }

  // ============================================================================
  // PATIENT CONTEXT
  // ============================================================================
  const activeDiagnoses = (medicalInfo?.diagnoses ?? []).filter(d => d.status === 'active');
  const allergies = medicalInfo?.allergies ?? [];
  const showPatientCard = patientName.length > 0;

  // ============================================================================
  // RENDER — MAIN
  // ============================================================================
  return (
    <View style={s.container}>
      <AuroraBackground variant="journal" />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          style={s.scrollView}
          contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 70 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
          }
        >
          {/* ─── HEADER ─── */}
          <ScreenHeader
            title="Journal"
            subtitle={`${dayName}, ${dateStr}`}
            purpose="What today's care means."
            style={s.journalHeader}
            rightAction={
              <View style={s.headerButtons}>
                <TouchableOpacity
                  style={s.headerShareBtn}
                  onPress={handleShareDaily}
                  activeOpacity={0.7}
                  accessibilityLabel="Share daily summary"
                  accessibilityRole="button"
                >
                  <Text style={s.headerShareBtnText}>{'\uD83D\uDCCB'} Share</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.headerReportBtn}
                  onPress={handleShareClinical}
                  activeOpacity={0.7}
                  accessibilityLabel="Clinical report"
                  accessibilityRole="button"
                >
                  <Text style={s.headerReportBtnText}>{'\uD83E\uDE7A'} Report</Text>
                </TouchableOpacity>
              </View>
            }
          />

          {/* ─── TAB BAR ─── */}
          <View style={s.journalTabs}>
            {(['story', 'reflections', 'visit'] as const).map(tab => (
              <TouchableOpacity
                key={tab}
                style={[s.journalTab, journalTab === tab && s.journalTabActive]}
                onPress={() => setJournalTab(tab)}
                accessibilityRole="tab"
                accessibilityState={{ selected: journalTab === tab }}
              >
                <Text style={[s.journalTabText, journalTab === tab && s.journalTabTextActive]}>
                  {tab === 'story' ? "Today's Story" : tab === 'reflections' ? 'Reflections' : 'Visit Prep'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ─── SAMPLE DATA INDICATOR ─── */}
          {isSampleMode && (
            <View style={s.sampleIndicator}>
              <Text style={s.sampleIndicatorText}>{'\u{1F4CA}'} Sample data — not real patient information</Text>
            </View>
          )}

          {/* ─── PATIENT CONTEXT CARD ─── */}
          {showPatientCard && (
            <TouchableOpacity
              style={s.patientCard}
              onPress={() => navigate('/patient')}
              activeOpacity={0.7}
              accessibilityLabel={`Patient: ${patientName}. Tap to view profile.`}
              accessibilityRole="button"
            >
              <View style={s.patientCardAvatar}>
                <Text style={s.patientCardAvatarText}>{patientName.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={s.patientCardInfo}>
                <View style={s.patientCardNameRow}>
                  <Text style={s.patientCardName}>{patientName}</Text>
                  {patientAge != null && (
                    <Text style={s.patientCardAge}>{patientAge} y/o</Text>
                  )}
                  {allergies.length > 0 && (
                    <View style={s.allergyBadge}>
                      <Text style={s.allergyBadgeText}>{'\u26A0'} {allergies[0]}</Text>
                    </View>
                  )}
                </View>
                {activeDiagnoses.length > 0 && (
                  <Text style={s.patientCardConditions} numberOfLines={1}>
                    {activeDiagnoses.map(d => d.condition).join(' \u00B7 ')}
                  </Text>
                )}
              </View>
              <Text style={s.patientCardChevron}>{'\u203A'}</Text>
            </TouchableOpacity>
          )}

          {/* ═══ TAB: TODAY'S STORY ═══ */}
          {journalTab === 'story' && (
            <>
              {/* Day at a Glance grid */}
              <View style={s.glanceGrid}>
                {glanceStats.map(stat => (
                  <View key={stat.bucket} style={[s.glanceTile, { backgroundColor: stat.color + '18', borderColor: stat.color + '35' }]}>
                    <Text style={[s.glanceTileValue, { color: stat.color }]}>{stat.value}</Text>
                    <Text style={s.glanceTileLabel}>{stat.label}</Text>
                  </View>
                ))}
              </View>

              {/* Narrative text */}
              <Text style={s.narrativeText}>
                {brief
                  ? generateEnhancedNarrative(brief, {
                      medsDone, medsTotal, mealsDone, mealsTotal,
                      waterGlasses, wellnessDone, wellnessTotal, hasVitals,
                    })
                  : ''}
              </Text>

              {/* First-use guidance when nothing logged today */}
              {medsTotal === 0 && mealsTotal === 0 && waterGlasses === 0 && !hasMorning && !hasEvening && !hasVitals && (
                <View style={s.firstUseCard}>
                  <Text style={s.firstUseTitle}>Your journal builds as you log</Text>
                  <Text style={s.firstUseText}>
                    Track medications, meals, vitals, or mood from the Now tab and your daily summary will appear here.
                  </Text>
                </View>
              )}
            </>
          )}

          {/* ═══ TAB: REFLECTIONS ═══ */}
          {journalTab === 'reflections' && (
            <>
              {reflections.length > 0 ? reflections.map((ref) => (
                <View key={ref.id} style={s.reflectionCard}>
                  <View style={s.reflectionHeader}>
                    <Text style={s.reflectionIcon}>{ref.icon}</Text>
                    <Text style={s.reflectionObservation}>{ref.observation}</Text>
                  </View>
                  {ref.recommendation && (
                    <Text style={s.reflectionRecommendation}>{ref.recommendation}</Text>
                  )}
                </View>
              )) : (
                <View style={s.firstUseCard}>
                  <Text style={s.firstUseTitle}>Reflections appear as you log</Text>
                  <Text style={s.firstUseText}>
                    Log medications, meals, and vitals from the Now tab and personalized reflections will appear here.
                  </Text>
                </View>
              )}
            </>
          )}

          {/* ═══ TAB: VISIT PREP ═══ */}
          {journalTab === 'visit' && (
            <>
              {/* Upcoming appointment */}
              {showAppointment && brief?.nextAppointment && (
                <View style={s.appointmentCard}>
                  <Text style={s.appointmentIcon}>{'\uD83D\uDCC5'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.appointmentTitle}>
                      {brief.nextAppointment.title || 'Upcoming Appointment'}
                    </Text>
                    <Text style={s.appointmentDate}>
                      {daysUntilAppt === 0 ? 'Today' : daysUntilAppt === 1 ? 'Tomorrow' : `In ${daysUntilAppt} days`}
                    </Text>
                  </View>
                </View>
              )}

              {/* Visit Prep CTA */}
              <TouchableOpacity
                style={s.visitPrepCard}
                onPress={() => navigate('/provider-prep')}
                activeOpacity={0.7}
                accessibilityLabel="Prepare for your next provider visit"
                accessibilityRole="button"
              >
                <Text style={s.visitPrepIcon}>{'\uD83D\uDCCB'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.visitPrepTitle}>Visit Prep</Text>
                  <Text style={s.visitPrepSubtitle}>Prepare for your next provider visit</Text>
                </View>
                <Text style={s.visitPrepArrow}>{'\u203A'}</Text>
              </TouchableOpacity>

              {/* Recent vitals readings */}
              {hasVitals && brief?.vitals?.readings && (
                <View style={s.recentReadingsCard}>
                  <Text style={s.recentReadingsTitle}>Recent Readings</Text>
                  {brief.vitals.readings.systolic != null && (
                    <Text style={s.recentReadingRow}>
                      Blood Pressure: {brief.vitals.readings.systolic}/{brief.vitals.readings.diastolic} mmHg
                    </Text>
                  )}
                  {brief.vitals.readings.heartRate != null && (
                    <Text style={s.recentReadingRow}>
                      Heart Rate: {brief.vitals.readings.heartRate} bpm
                    </Text>
                  )}
                  {brief.vitals.readings.oxygen != null && (
                    <Text style={s.recentReadingRow}>
                      Oxygen: {brief.vitals.readings.oxygen}%
                    </Text>
                  )}
                </View>
              )}
            </>
          )}

          {/* ─── TIMESTAMP ─── */}
          {brief && (
            <Text style={s.timestamp}>
              Updated {new Date(brief.generatedAt).toLocaleTimeString('en-US', {
                hour: 'numeric', minute: '2-digit',
              })} {'\u00B7'} Not a medical record
            </Text>
          )}

        </ScrollView>
      </SafeAreaView>

      <ReportPreviewModal
        visible={showDailyPreview}
        title="Daily Summary"
        infoText="Preview of your daily journal. Tap 'Share PDF' to export."
        previewLines={dailyReport?.previewLines ?? []}
        onExport={handleDailyExport}
        onClose={() => setShowDailyPreview(false)}
        exporting={exporting}
      />
      <ReportPreviewModal
        visible={showClinicalPreview}
        title="Clinical Report"
        infoText="30-day clinical summary for healthcare providers."
        previewLines={clinicalReport?.previewLines ?? []}
        onExport={handleClinicalExport}
        onClose={() => setShowClinicalPreview(false)}
        exporting={exporting}
      />
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: c.textSecondary,
    fontSize: 16,
    marginTop: 10,
  },
  errorContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  errorIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: c.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Auth Gate
  authGateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  authGateIcon: { fontSize: 48, marginBottom: 16 },
  authGateTitle: { fontSize: 20, fontWeight: '600', color: c.textPrimary, marginBottom: 8 },
  authGateSubtitle: { fontSize: 14, color: c.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  authGateButton: { backgroundColor: c.accent, paddingHorizontal: 32, paddingVertical: 14, borderRadius: BorderRadius.lg },
  authGateButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },

  // ─── JOURNAL TABS ───
  journalTabs: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
    marginTop: 4,
  },
  journalTab: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: c.glassDim,
    borderWidth: 1,
    borderColor: c.glassBorder,
  },
  journalTabActive: {
    backgroundColor: c.accentDim,
    borderColor: c.accentBorder,
  },
  journalTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textMuted,
  },
  journalTabTextActive: {
    color: c.accent,
  },

  // ─── DAY AT A GLANCE GRID ───
  glanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  glanceTile: {
    width: '30%' as any,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  glanceTileValue: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  glanceTileLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: c.textMuted,
    textTransform: 'uppercase',
    marginTop: 5,
  },

  // ─── APPOINTMENT CARD ───
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.glassBorder,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    gap: 12,
  },
  appointmentIcon: {
    fontSize: 24,
  },
  appointmentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
  },
  appointmentDate: {
    fontSize: 12,
    color: c.textSecondary,
    marginTop: 2,
  },

  // ─── RECENT READINGS ───
  recentReadingsCard: {
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.glassBorder,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  recentReadingsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 8,
  },
  recentReadingRow: {
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 22,
  },

  // ─── SAMPLE DATA INDICATOR ───
  sampleIndicator: {
    backgroundColor: c.accentLight,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  sampleIndicatorText: {
    fontSize: 12,
    fontWeight: '500',
    color: c.purpleBright,
  },

  // ─── HEADER ───
  journalHeader: {
    borderBottomWidth: 1,
    borderBottomColor: c.glassBorder,
    marginBottom: 8,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  headerShareBtn: {
    backgroundColor: c.accentDim,
    borderWidth: 1,
    borderColor: c.accentBorder,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  headerShareBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: c.accent,
  },
  headerReportBtn: {
    backgroundColor: c.purpleFaint,
    borderWidth: 1,
    borderColor: c.purpleBorder,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  headerReportBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: c.purpleBright,
  },

  // ─── PATIENT CONTEXT CARD ───
  patientCard: {
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.glassBorder,
    borderRadius: 10,
    padding: 10,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  patientCardAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: c.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientCardAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.accent,
  },
  patientCardInfo: {
    flex: 1,
    minWidth: 0,
  },
  patientCardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  patientCardName: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textPrimary,
  },
  patientCardAge: {
    fontSize: 10,
    color: c.textSecondary,
  },
  allergyBadge: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  allergyBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#EF4444',
  },
  patientCardConditions: {
    fontSize: 11,
    color: c.textSecondary,
  },
  patientCardChevron: {
    fontSize: 14,
    color: c.textSecondary,
  },

  // ─── SECTION HEADER ───
  sectionHeader: {
    paddingTop: 18,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },

  // ─── DIVIDER ───
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginHorizontal: -16,
  },

  // ─── SECTION 1: NARRATIVE ───
  narrativeText: {
    fontSize: 16.5,
    color: c.textPrimary,
    lineHeight: 27,
    marginBottom: 20,
    marginTop: 8,
  },

  // ─── FIRST-USE GUIDANCE ───
  firstUseCard: {
    backgroundColor: 'rgba(255, 140, 148, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 148, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  firstUseTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: c.accent,
    marginBottom: 4,
  },
  firstUseText: {
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 19,
  },

  // ─── REFLECTIONS ───
  reflectionCard: {
    backgroundColor: c.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.glassBorder,
    padding: 14,
    marginBottom: 10,
  },
  reflectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  reflectionIcon: {
    fontSize: 18,
    marginTop: 2,
  },
  reflectionObservation: {
    flex: 1,
    fontSize: 15,
    color: c.textPrimary,
    lineHeight: 22,
  },
  reflectionRecommendation: {
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 19,
    marginTop: 8,
    marginLeft: 28,
    fontStyle: 'italic',
  },

  // ─── VISIT PREP ───
  visitPrepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.glassBorder,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  visitPrepIcon: {
    fontSize: 24,
  },
  visitPrepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textPrimary,
  },
  visitPrepSubtitle: {
    fontSize: 13,
    color: c.textSecondary,
    marginTop: 2,
  },
  visitPrepArrow: {
    fontSize: 22,
    color: c.textMuted,
  },

  // ─── TIMESTAMP ───
  timestamp: {
    fontSize: 10,
    color: c.textTertiary,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 16,
    fontStyle: 'italic',
  },
});
