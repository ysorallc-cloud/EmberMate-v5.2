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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// Svg/Circle removed — ValueRing tiles moved to Today only
import { ScreenHeader } from '../../components/ScreenHeader';
import { getMedicalInfo, MedicalInfo } from '../../utils/medicalInfo';
import { safeGetItem } from '../../utils/safeStorage';
import { StorageKeys } from '../../utils/storageKeys';
import { getMedications } from '../../utils/medicationStorage';
import { hasSampleData } from '../../utils/sampleDataManager';
import { ShareReportSheet } from '../../components/journal/ShareReportSheet';
import {
  generateReflections,
  generateEnhancedNarrative,
  JournalReflection,
} from '../../utils/journalReflections';
import { useCoffeeMoment } from '../../hooks/useCoffeeMoment';
import { CoffeeMomentMinimal } from '../../components/CoffeeMomentMinimal';
import { generateCareInsight, RecentHistory } from '../../utils/careInsights';
import { listLogsInRange } from '../../storage/carePlanRepo';
import { getVitalsInRange } from '../../utils/vitalsStorage';
import { DEFAULT_PATIENT_ID } from '../../types/patient';
import type { TodayStats } from '../../utils/nowHelpers';

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
  const [reflectionsExpanded, setReflectionsExpanded] = useState(false);
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
  const [showShareSheet, setShowShareSheet] = useState(false);
  const coffeeMoment = useCoffeeMoment(0, false);

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
  // COMPUTED VALUES (must be before early returns to keep hooks stable)
  // ============================================================================
  const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const hour = new Date().getHours();
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
  // WATCH INSIGHTS — pattern insights from multi-day history
  // ============================================================================
  const [recentHistory, setRecentHistory] = useState<RecentHistory | null>(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        const end = getTodayDateString();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        const start = startDate.toISOString().split('T')[0];

        const [logs, vitals] = await Promise.all([
          listLogsInRange(DEFAULT_PATIENT_ID, start, end),
          getVitalsInRange(start, end),
        ]);

        const fiveDaysAgo = new Date();
        fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
        const fiveDaysStr = fiveDaysAgo.toISOString().split('T')[0];
        const recentDates = new Set<string>();
        const lunchDates = new Set<string>();
        for (const log of logs) {
          if (log.date >= fiveDaysStr) {
            recentDates.add(log.date);
            if (log.data && 'mealType' in log.data && (log.data as any).mealType === 'lunch') {
              lunchDates.add(log.date);
            }
          }
        }
        const daysWithData = recentDates.size;
        const lunchSkipCount = Math.max(0, Math.min(daysWithData, 5) - lunchDates.size);

        const systolicReadings = vitals.filter(v => v.type === 'systolic');
        const diastolicReadings = vitals.filter(v => v.type === 'diastolic');
        const avgSystolic = systolicReadings.length >= 3
          ? systolicReadings.reduce((sum, v) => sum + v.value, 0) / systolicReadings.length
          : null;
        const avgDiastolic = diastolicReadings.length >= 3
          ? diastolicReadings.reduce((sum, v) => sum + v.value, 0) / diastolicReadings.length
          : null;

        const medLogsByDate = new Map<string, number>();
        const medTotalByDate = new Map<string, number>();
        for (const log of logs) {
          if (log.outcome === 'completed' || log.outcome === 'skipped') {
            medLogsByDate.set(log.date, (medLogsByDate.get(log.date) || 0) + 1);
          }
          medTotalByDate.set(log.date, (medTotalByDate.get(log.date) || 0) + 1);
        }
        let consecutiveMedDays = 0;
        const checkDate = new Date();
        for (let i = 0; i < 14; i++) {
          const dateStr = checkDate.toISOString().split('T')[0];
          const completed = medLogsByDate.get(dateStr) || 0;
          const total = medTotalByDate.get(dateStr) || 0;
          if (total > 0 && completed === total) consecutiveMedDays++;
          else if (total > 0) break;
          checkDate.setDate(checkDate.getDate() - 1);
        }

        setRecentHistory({
          lunchSkipCount,
          avgSystolic,
          avgDiastolic,
          bpReadingCount: Math.max(systolicReadings.length, diastolicReadings.length),
          consecutiveMedDays,
          daysTracked: daysWithData,
        });
      } catch (err) {
        logError('journal.loadHistory', err);
      }
    }
    loadHistory();
  }, []);

  // Pattern/preventative insights belong on Insights tab, not Journal
  const watchInsight = null;

  // ============================================================================
  // EARLY RETURNS (after all hooks to satisfy Rules of Hooks)
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
        <View style={{ flex: 1 }}>
          <ScrollView
            style={s.scrollView}
            contentContainerStyle={[s.scrollContent, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 70 }]}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
            }
          >
            <ScreenHeader title="Journal" subtitle={`${dayName}, ${dateStr}`} />
            <View style={s.errorContainer}>
              <Text style={s.errorIcon}>{'\u26A0\uFE0F'}</Text>
              <Text style={s.errorText}>{error}</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    );
  }

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
    if (brief.sleep.hours != null && brief.sleep.hours > 0) return `${brief.sleep.hours}h`;
    if (brief.sleep.hours === 0) return '\u2014';
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

  // ── Glance stats for share/report builders ──
  const reportGlanceTiles: { bucket: string; label: string; value: string; color: string }[] = [
    { bucket: 'meds',     label: 'Meds',     value: `${medsDone}/${medsTotal}`,   color: dotColorToStyle(getMedsDotColor()) },
    { bucket: 'meals',    label: 'Meals',     value: `${mealsDone}/${mealsTotal}`, color: dotColorToStyle(getMealsDotColor()) },
    { bucket: 'water',    label: 'Water',     value: `${waterGlasses}/8`,          color: dotColorToStyle(getHydrationDotColor()) },
    { bucket: 'wellness', label: 'Wellness',  value: `${wellnessDone}/${wellnessTotal}`, color: dotColorToStyle(getWellnessDotColor()) },
    { bucket: 'sleep',    label: 'Sleep',     value: getSleepValue(),              color: dotColorToStyle(getSleepDotColor()) },
    { bucket: 'vitals',   label: 'BP',        value: getVitalsValue(),             color: dotColorToStyle(getVitalsDotColor()) },
  ];

  // ============================================================================
  // PATIENT CONTEXT
  // ============================================================================

  // ============================================================================
  // RENDER — MAIN
  // ============================================================================
  return (
    <View style={s.container}>
      <AuroraBackground variant="journal" />

      <View style={{ flex: 1 }}>
        <ScrollView
          style={s.scrollView}
          contentContainerStyle={[s.scrollContent, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 70 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
          }
        >
          {/* ─── HEADER ─── */}
          <ScreenHeader
            title="Journal"
            subtitle={`${dayName}, ${dateStr}`}
            style={s.journalHeader}
            rightAction={
              <TouchableOpacity
                style={s.headerShareBtn}
                onPress={() => setShowShareSheet(true)}
                activeOpacity={0.7}
                accessibilityLabel="Share daily summary"
                accessibilityRole="button"
              >
                <Text style={s.headerShareBtnText}>Share</Text>
              </TouchableOpacity>
            }
          />

          {/* ─── SAMPLE DATA INDICATOR ─── */}
          {isSampleMode && (
            <View style={s.sampleIndicator}>
              <Text style={s.sampleIndicatorText}>{'\u{1F4CA}'} Sample data — not real patient information</Text>
            </View>
          )}

          {/* ═══ NARRATIVE ═══ */}
          <Text style={s.narrativeText}>
            {brief
              ? generateEnhancedNarrative(brief, {
                  medsDone, medsTotal, mealsDone, mealsTotal,
                  waterGlasses, wellnessDone, wellnessTotal, hasVitals,
                  patientName: patientName || brief.patient?.name || undefined,
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

          {/* ═══ WHAT STANDS OUT — reflections + watch insights ═══ */}
          {reflections.length > 0 && (
            <>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Keep an Eye On</Text>
              </View>

              {/* Reflections */}
              {(reflectionsExpanded ? reflections : reflections.slice(0, 2)).map((ref) => {
                const isAttention = ref.category === 'nutrition' || ref.category === 'hydration';
                return (
                  <View
                    key={ref.id}
                    style={[
                      s.reflectionCard,
                      isAttention && s.reflectionCardAttention,
                    ]}
                  >
                    <View style={s.reflectionHeader}>
                      <Text style={s.reflectionIcon}>{ref.icon}</Text>
                      <Text style={s.reflectionObservation}>{ref.observation}</Text>
                    </View>
                    {ref.recommendation && (
                      <Text style={s.reflectionRecommendation}>{ref.recommendation}</Text>
                    )}
                  </View>
                );
              })}
              {reflections.length > 2 && !reflectionsExpanded && (
                <TouchableOpacity
                  onPress={() => setReflectionsExpanded(true)}
                  style={s.showMoreLink}
                  activeOpacity={0.7}
                >
                  <Text style={s.showMoreText}>
                    Show {reflections.length - 2} more {'\u203A'}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* ═══ IF YOU'RE HANDING OFF — done ✓ then open ○ ═══ */}
          {brief && (() => {
            const logItems = buildHandoffNotes();
            if (logItems.length === 0) return null;
            const doneItems = logItems.filter(i => i.type === 'done');
            const openItems = logItems.filter(i => i.type === 'watch' || i.type === 'flag');
            return (
              <>
                <View style={s.sectionHeader}>
                  <Text style={s.sectionTitle}>If You're Handing Off</Text>
                </View>
                <View style={s.logCard}>
                  {doneItems.map((item, i) => (
                    <View
                      key={`done-${i}`}
                      style={[
                        s.logRow,
                        (i < doneItems.length - 1 || openItems.length > 0) && s.logRowBorder,
                      ]}
                    >
                      <Text style={s.logStatusIcon}>{'\u2713'}</Text>
                      <Text style={s.logText}>{item.text}</Text>
                    </View>
                  ))}
                  {doneItems.length > 0 && openItems.length > 0 && (
                    <View style={s.handoffDivider} />
                  )}
                  {openItems.map((item, i) => (
                    <View
                      key={`open-${i}`}
                      style={[
                        s.logRow,
                        i < openItems.length - 1 && s.logRowBorder,
                      ]}
                    >
                      <Text style={s.logStatusIcon}>{'\u25CB'}</Text>
                      <Text style={s.logText}>{item.text}</Text>
                    </View>
                  ))}
                </View>
              </>
            );
          })()}

          {/* ═══ COMING UP ═══ */}
          {showAppointment && brief?.nextAppointment && (
            <>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Coming Up</Text>
              </View>
              <View style={s.appointmentCard}>
                <Text style={s.appointmentIcon}>{'\uD83D\uDCC5'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.appointmentTitle}>
                    {brief.nextAppointment.provider
                      ? `${brief.nextAppointment.specialty || 'Appointment'} — ${brief.nextAppointment.provider}`
                      : 'Upcoming Appointment'}
                  </Text>
                  <Text style={s.appointmentDate}>
                    {new Date(brief.nextAppointment.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    {' \u00B7 '}
                    {daysUntilAppt === 0 ? 'Today' : daysUntilAppt === 1 ? 'Tomorrow' : `In ${daysUntilAppt} days`}
                  </Text>
                </View>
              </View>
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
            </>
          )}

          {/* ─── CAREGIVER PAUSE ─── */}
          <TouchableOpacity
            onPress={coffeeMoment.startReset}
            style={s.coffeePauseLink}
            activeOpacity={0.7}
            accessibilityLabel="Take a 1-minute breathing pause"
            accessibilityRole="button"
          >
            <Text style={s.coffeePauseLinkText}>
              {'\u2615'}  Take a 1-minute pause
            </Text>
          </TouchableOpacity>

          {/* ─── TIMESTAMP ─── */}
          {brief && (
            <Text style={s.timestamp}>
              Updated {new Date(brief.generatedAt).toLocaleTimeString('en-US', {
                hour: 'numeric', minute: '2-digit',
              })} {'\u00B7'} Not a medical record
            </Text>
          )}

        </ScrollView>
      </View>

      {brief && (
        <ShareReportSheet
          visible={showShareSheet}
          onClose={() => setShowShareSheet(false)}
          brief={brief}
          patientName={patientName}
          patientAge={patientAge || undefined}
          glanceStats={reportGlanceTiles}
          handoffNotes={buildHandoffNotes()}
        />
      )}
      {coffeeMoment.showModal && (
        <CoffeeMomentMinimal
          visible={coffeeMoment.showModal}
          onClose={coffeeMoment.closeModal}
          microcopy="Pause for a minute"
          duration={60}
          encouragement={coffeeMoment.encouragement}
        />
      )}
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
    paddingHorizontal: 20,
    paddingTop: 4,
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

  // ─── APPOINTMENT CARD ───
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.glassBorder,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
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
  appointmentAdvice: {
    fontSize: 12,
    color: c.amber,
    marginTop: 6,
    lineHeight: 17,
    fontStyle: 'italic',
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
    marginBottom: 4,
    paddingHorizontal: 20,
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
    fontWeight: '600' as const,
    color: c.accent,
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
    backgroundColor: c.glassDim,
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
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
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
  watchCard: {
    flexDirection: 'row',
    backgroundColor: c.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.glassBorder,
    marginBottom: 14,
    overflow: 'hidden',
  },
  watchBorder: {
    width: 3,
    backgroundColor: c.amber,
  },
  watchContent: {
    flex: 1,
    padding: 18,
    gap: 6,
  },
  watchTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: c.amber,
    lineHeight: 20,
  },
  watchMessage: {
    fontSize: 14,
    color: c.textSecondary,
    lineHeight: 20,
    paddingLeft: 28,
  },
  reflectionCard: {
    backgroundColor: c.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.glassBorder,
    padding: 18,
    marginBottom: 14,
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.glassBorder,
    padding: 18,
    marginBottom: 14,
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

  // ─── REFLECTION ATTENTION ───
  reflectionCardAttention: {
    borderColor: c.amberBorder,
  },

  // ─── TODAY'S LOG ───
  logCard: {
    backgroundColor: c.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.glassBorder,
    padding: 14,
    marginBottom: 14,
  },
  logRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  logRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  logIcon: {
    fontSize: 14,
  },
  logStatusIcon: {
    fontSize: 14,
    color: c.textMuted,
    width: 20,
    textAlign: 'center' as const,
  },
  logText: {
    flex: 1,
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 18,
  },
  handoffDivider: {
    height: 1,
    backgroundColor: c.border,
    marginHorizontal: 14,
    marginVertical: 4,
  },

  // ─── CAREGIVER PAUSE LINK ───
  coffeePauseLink: {
    alignSelf: 'center' as const,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: c.glassDim,
    borderWidth: 1,
    borderColor: c.glassBorder,
  },
  coffeePauseLinkText: {
    fontSize: 13,
    color: c.textSecondary,
    fontWeight: '500' as const,
  },

  // ─── TIMESTAMP ───
  timestamp: {
    fontSize: 10,
    color: c.textTertiary,
    textAlign: 'center' as const,
    marginTop: 16,
    lineHeight: 16,
    fontStyle: 'italic' as const,
  },

  // ── Show more link ──
  showMoreLink: {
    alignSelf: 'center' as const,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  showMoreText: {
    fontSize: 13,
    color: c.accent,
    fontWeight: '500' as const,
  },
});
