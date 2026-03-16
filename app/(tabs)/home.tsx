// ============================================================================
// HOME PAGE - What needs attention right now
// Progress Rings + Next Action + Quick status
// ============================================================================

import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { navigate } from '../../lib/navigate';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { getMedications, getMedicationLogs, Medication } from '../../utils/medicationStorage';
import { getDailyTracking } from '../../utils/dailyTrackingStorage';
import {
  getTodayVitalsLog,
  getTodayMealsLog,
  updateTodayWaterLog,
  getTodayWaterLog,
} from '../../utils/centralStorage';
import { safeGetItem } from '../../utils/safeStorage';
import { StorageKeys } from '../../utils/storageKeys';
import { updatePatient } from '../../storage/patientRegistry';
import { recordVisit } from '../../utils/lastVisitTracker';

// Prompt Components
import {
  OnboardingPrompt,
} from '../../components/prompts';

// Aurora Components
import { AuroraBackground } from '../../components/aurora/AuroraBackground';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PatientSwitcherModal } from '../../components/now/PatientSwitcherModal';
import { usePatient } from '../../contexts/PatientContext';
// CarePlan System
import { useCarePlan } from '../../hooks/useCarePlan';
import { useCareTasks } from '../../hooks/useCareTasks';
import { useAppointments } from '../../hooks/useAppointments';
import { useCarePlanConfig } from '../../hooks/useCarePlanConfig';
import { useCoffeeMoment } from '../../hooks/useCoffeeMoment';
import { CoffeeMomentMinimal } from '../../components/CoffeeMomentMinimal';
import { getTodayDateString } from '../../services/carePlanGenerator';
import { BucketType } from '../../types/carePlanConfig';

// Urgency System
import {
  isClinicalCritical,
  UPCOMING_WINDOW_MINUTES,
} from '../../utils/urgency';

// Extracted utilities
import {
  type TodayStats,
  type StatData,
  isOverdue,
  OVERDUE_GRACE_MINUTES,
} from '../../utils/nowHelpers';
// Extracted hooks
import { useNowPrompts } from '../../hooks/useNowPrompts';

// Extracted components
import { ProgressRings } from '../../components/now/ProgressRings';
import { MorningMedsBanner } from '../../components/now/MorningMedsBanner';
import { NextActionCard } from '../../components/now/NextActionCard';
import { SetupGuideCard } from '../../components/now/SetupGuideCard';

import { logError } from '../../utils/devLog';
import { useDataListener, emitDataUpdate } from '../../lib/events';
import { EVENT } from '../../lib/eventNames';
import { buildCareBrief, CareBrief } from '../../utils/careSummaryBuilder';
import { hasSampleData } from '../../utils/sampleDataManager';
import { SampleDataBanner } from '../../components/common/SampleDataBanner';

export default function HomeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Track today's date
  const [today, setToday] = useState(() => getTodayDateString());

  // Single source of truth: useCareTasks wraps useDailyCareInstances
  const {
    state: careTasksState,
    instanceState: instancesState,
    loading: instancesLoading,
    completeInstance,
    refresh: refreshCareTasks,
  } = useCareTasks(today);

  // CarePlan hook
  const { carePlan, refresh: refreshCarePlan } = useCarePlan(today);

  // Appointments hook
  const { nextAppointment } = useAppointments();

  // Bucket-based Care Plan Config hook
  const { hasCarePlan: hasBucketCarePlan, loading: carePlanConfigLoading, enabledBuckets } = useCarePlanConfig();

  // Determine which system to use
  const hasRegimenInstances = instancesState && instancesState.instances.length > 0;

  const [medications, setMedications] = useState<Medication[]>([]);
  const [dailyTracking, setDailyTracking] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Category filter state (tappable rings)
  const [selectedCategory, setSelectedCategory] = useState<BucketType | null>(null);

  const handleRingPress = useCallback((bucket: BucketType) => {
    setSelectedCategory(prev => prev === bucket ? null : bucket);
  }, []);

  // Legacy stats state - fallback when no regimen instances
  const [legacyStats, setLegacyStats] = useState<TodayStats>({
    meds: { completed: 0, total: 0 },
    vitals: { completed: 0, total: 4 },
    meals: { completed: 0, total: 3 },
  });

  // Water stats from direct storage
  const [waterGlasses, setWaterGlasses] = useState(0);
  const [patientName, setPatientName] = useState('Patient');

  // Sample data mode
  const [isSampleMode, setIsSampleMode] = useState(false);

  const [showPatientSwitcher, setShowPatientSwitcher] = useState(false);
  const { activePatient } = usePatient();
  const waterGoal = 8;

  const handleWaterUpdate = useCallback(async (newGlasses: number) => {
    try {
      setWaterGlasses(newGlasses);
      await updateTodayWaterLog(newGlasses);
      emitDataUpdate(EVENT.WATER);
    } catch (error) {
      logError('home.handleWaterUpdate', error);
    }
  }, []);

  // ============================================================================
  // SINGLE SOURCE OF TRUTH: Compute stats from useCareTasks hook
  // ============================================================================
  const todayStats = useMemo((): TodayStats => {
    if (instancesState && instancesState.instances.length > 0 && instancesState.date === today) {
      const getTypeStats = (itemType: string): StatData => {
        const typeInstances = instancesState.instances.filter(i => i.itemType === itemType);
        const completed = typeInstances.filter(i => i.status === 'completed' || i.status === 'skipped').length;
        return { completed, total: typeInstances.length };
      };

      const customStats = getTypeStats('custom');
      const stats: TodayStats = {
        meds: getTypeStats('medication'),
        vitals: getTypeStats('vitals'),
        meals: getTypeStats('nutrition'),
        water: { completed: waterGlasses, total: waterGoal },
        sleep: getTypeStats('sleep'),
        activity: getTypeStats('activity'),
        wellness: getTypeStats('wellness'),
        custom: customStats.total > 0 ? customStats : undefined,
      };

      const hasAnyInstanceData = stats.meds.total > 0 || stats.vitals.total > 0 ||
                                  stats.meals.total > 0 || (stats.custom?.total ?? 0) > 0;
      if (hasAnyInstanceData) {
        return stats;
      }
    }
    return legacyStats;
  }, [instancesState, legacyStats, today, waterGlasses, waterGoal]);

  // Extracted hooks
  const { showOnboarding, briefing, handlers, getBaselineStatusMessage, computePrompts: computePromptsHook, checkNotificationPrompt: checkNotifPrompt, loadBaselines } = useNowPrompts(todayStats, dailyTracking);

  // ============================================================================
  // TODAY TIMELINE - Built from DailyCareInstances (for NextActionCard)
  // ============================================================================
  const todayTimeline = useMemo(() => {
    if (!instancesState?.instances) {
      return { overdue: [], upcoming: [], completed: [], nextUp: null };
    }

    if (instancesState.date !== today) {
      return { overdue: [], upcoming: [], completed: [], nextUp: null };
    }

    const allInstances = instancesState.instances;
    const now = new Date();

    const getPriorityScore = (instance: any): number => {
      const scheduled = new Date(instance.scheduledTime);
      if (isNaN(scheduled.getTime())) return 999;

      const diffMs = now.getTime() - scheduled.getTime();
      const minutesLate = Math.floor(diffMs / (1000 * 60));
      const isLate = minutesLate > OVERDUE_GRACE_MINUTES;
      const isDueSoon = !isLate && minutesLate > -UPCOMING_WINDOW_MINUTES;

      const isClinical = isClinicalCritical(instance.itemType);
      const isNeutral = instance.itemType === 'vitals';

      if (isClinical && isLate) return 100 - minutesLate;
      if (isClinical && isDueSoon) return 200 - minutesLate;
      if (isNeutral && isLate) return 300 - minutesLate;
      if (!isClinical && !isNeutral && isLate) return 400 - minutesLate;
      if (!isClinical && isDueSoon) return 500 - minutesLate;
      return 600 + Math.abs(minutesLate);
    };

    const withScores = allInstances.map(instance => {
      if (instance.status !== 'pending') {
        return { instance, priorityScore: 999 };
      }
      return { instance, priorityScore: getPriorityScore(instance) };
    });

    const pendingWithScores = withScores
      .filter(w => w.instance.status === 'pending')
      .sort((a, b) => a.priorityScore - b.priorityScore);

    const overdue = pendingWithScores
      .filter(w => isOverdue(w.instance.scheduledTime))
      .map(w => w.instance);

    const upcoming = pendingWithScores
      .filter(w => !isOverdue(w.instance.scheduledTime))
      .map(w => w.instance);

    const completed = allInstances.filter(
      i => i.status === 'completed' || i.status === 'skipped' || i.status === 'missed'
    ).sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

    const nextUp = pendingWithScores[0]?.instance || null;

    return { overdue, upcoming, completed, nextUp };
  }, [instancesState?.instances, instancesState?.date, today]);

  // Hero totals — must match the buckets shown in ProgressRings
  const { heroDone, heroTotal } = useMemo(() => {
    const BUCKET_STAT_KEY: Record<string, keyof TodayStats> = {
      meds: 'meds', vitals: 'vitals', meals: 'meals', water: 'water',
      sleep: 'sleep', activity: 'activity', wellness: 'wellness', custom: 'custom',
    };

    const instanceBuckets = new Set(
      (instancesState?.instances ?? []).map(i => {
        const typeMap: Record<string, string> = {
          medication: 'meds', vitals: 'vitals', nutrition: 'meals',
          activity: 'activity', wellness: 'wellness', custom: 'custom',
          sleep: 'sleep',
        };
        return typeMap[i.itemType] ?? '';
      }).filter(Boolean)
    );

    const buckets = enabledBuckets.length > 0 ? enabledBuckets : ['meds', 'vitals', 'meals', 'activity'];
    let done = 0;
    let total = 0;

    for (const bucket of buckets) {
      if (!instanceBuckets.has(bucket)) continue;
      const key = BUCKET_STAT_KEY[bucket];
      if (key) {
        const stat = todayStats[key];
        if (stat && stat.total > 0) {
          done += stat.completed ?? 0;
          total += stat.total ?? 0;
        }
      }
    }

    if (todayStats.custom && todayStats.custom.total > 0 && !buckets.includes('custom')) {
      done += todayStats.custom.completed ?? 0;
      total += todayStats.custom.total ?? 0;
    }

    return { heroDone: done, heroTotal: total };
  }, [todayStats, enabledBuckets, instancesState?.instances]);

  // Completion percentage for hero card
  const completionPct = useMemo(() => {
    return heroTotal > 0 ? Math.round((heroDone / heroTotal) * 100) : 0;
  }, [heroDone, heroTotal]);

  // Merge overdue + upcoming into single allPending array
  const allPending = useMemo(() => {
    return [...todayTimeline.overdue, ...todayTimeline.upcoming];
  }, [todayTimeline.overdue, todayTimeline.upcoming]);

  // Coffee Moment - gentle nudge when task load is high
  const overdueCount = todayTimeline.overdue.length;
  const hasLateMedication = todayTimeline.overdue.some(
    (i: any) => i.itemType === 'medication'
  );
  const [brief, setBrief] = useState<CareBrief | null>(null);
  const coffeeMoment = useCoffeeMoment(overdueCount, hasLateMedication, {
    medsTotal: todayStats.meds?.total ?? 0,
    medsDone: todayStats.meds?.completed ?? 0,
    hasVitals: brief?.vitals?.recorded ?? false,
    vitalsImproving: false,
    patientSleepQuality: brief?.sleep?.quality != null
      ? (brief.sleep.quality >= 4 ? 'good' : brief.sleep.quality >= 2 ? 'fair' : 'rough')
      : 'fair',
    upcomingAppointment: brief?.nextAppointment
      ? {
          days: Math.max(0, Math.ceil((new Date(brief.nextAppointment.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
          doctor: brief.nextAppointment.provider || 'Doctor',
        }
      : null,
  });

  // Handler for timeline item tap (used by NextActionCard)
  const handleTimelineItemPress = useCallback((instance: any) => {
    if (instance.itemType === 'medication') {
      navigate({
        pathname: '/log-medication-plan-item',
        params: {
          medicationId: instance.carePlanItemId,
          instanceId: instance.id,
          scheduledTime: instance.scheduledTime,
          itemName: instance.itemName,
          itemDosage: instance.itemDosage || '',
          itemInstructions: instance.instructions || '',
        },
      });
      return;
    }
    if (instance.itemName?.toLowerCase().includes('pain')) {
      navigate({
        pathname: '/quick-log',
        params: {
          expand: 'pain',
          instanceId: instance.id,
          carePlanItemId: instance.carePlanItemId || '',
          itemName: instance.itemName || '',
        },
      });
      return;
    }
    if (instance.itemType === 'wellness') {
      const wellnessRoute = instance.windowLabel === 'evening'
        ? '/log-evening-wellness'
        : '/log-morning-wellness';
      navigate({
        pathname: wellnessRoute,
        params: {
          instanceId: instance.id,
          carePlanItemId: instance.carePlanItemId || '',
          itemName: instance.itemName || '',
        },
      });
      return;
    }
    const { getRouteForInstanceType } = require('../../utils/nowHelpers');
    const route = getRouteForInstanceType(instance.itemType);
    navigate({
      pathname: route,
      params: {
        instanceId: instance.id,
        carePlanItemId: instance.carePlanItemId || '',
        itemName: instance.itemName || '',
      },
    });
  }, []);

  // Batch confirm meds — uses completeInstance from useCareTasks
  const handleBatchMedConfirm = useCallback(async (instanceIds: string[]) => {
    for (const id of instanceIds) {
      await completeInstance(id, 'taken');
    }
    emitDataUpdate(EVENT.DAILY_INSTANCES);
  }, [completeInstance]);

  // NextActionCard data — detect batch meds at same time
  const nextTask = useMemo(() => {
    const first = allPending[0];
    if (!first) return null;

    if (first.itemType === 'medication') {
      const batchMeds = allPending.filter(i =>
        i.itemType === 'medication' && i.scheduledTime === first.scheduledTime
      );
      if (batchMeds.length > 1) {
        return {
          id: 'batch-meds',
          label: `Confirm ${batchMeds.length} medications`,
          sub: batchMeds.map(m => m.itemName || m.itemType).join(', '),
          emoji: '\uD83D\uDC8A',
          isMed: true,
          isBatch: true,
          batchIds: batchMeds.map(m => m.id),
          overdue: isOverdue(first.scheduledTime),
        };
      }
    }

    return {
      id: first.id,
      label: first.itemName || first.itemType,
      sub: first.itemDosage || first.instructions || '',
      emoji: first.itemEmoji || (first.itemType === 'medication' ? '\uD83D\uDC8A' : first.itemType === 'vitals' ? '\uD83D\uDCCA' : first.itemType === 'nutrition' ? '\uD83C\uDF7D\uFE0F' : '\u2705'),
      isMed: first.itemType === 'medication',
      overdue: isOverdue(first.scheduledTime),
    };
  }, [allPending]);

  const currentTimeWindow = useMemo(() => {
    const { getCurrentTimeWindow } = require('../../utils/nowHelpers');
    return getCurrentTimeWindow();
  }, []);

  const nextApptForCard = useMemo(() => {
    if (!nextAppointment) return null;
    const appt = nextAppointment;
    const [year, month, day] = appt.date.split('-').map(Number);
    const apptDate = new Date(year, month - 1, day);
    const dayLabel = apptDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const timeLabel = appt.time
      ? (() => {
          if (/[AP]M/i.test(appt.time)) return appt.time;
          const [h, m] = appt.time.split(':');
          const hr = parseInt(h, 10);
          return `${hr % 12 || 12}${m === '00' ? '' : ':' + m} ${hr >= 12 ? 'PM' : 'AM'}`;
        })()
      : '';
    return {
      provider: appt.provider || appt.specialty || 'Appointment',
      date: dayLabel,
      time: timeLabel,
    };
  }, [nextAppointment]);

  // Handler for NextActionCard confirm — supports batch med IDs
  const handleNextConfirm = useCallback(async (taskId: string, batchIds?: string[]) => {
    if (batchIds && batchIds.length > 0) {
      await handleBatchMedConfirm(batchIds);
      return;
    }
    const task = allPending.find(t => t.id === taskId);
    if (!task) return;
    if (task.itemType === 'medication') {
      await handleBatchMedConfirm([task.id]);
    } else {
      handleTimelineItemPress(task);
    }
  }, [allPending, handleBatchMedConfirm, handleTimelineItemPress]);

  // ============================================================================
  // DATA LOADING
  // ============================================================================
  useFocusEffect(
    useCallback(() => {
      const currentDate = getTodayDateString();
      if (currentDate !== today) {
        setToday(currentDate);
      }

      refreshCareTasks();
      refreshCarePlan();
      loadData();
      checkNotifPrompt();
      recordVisit();
      hasSampleData().then(setIsSampleMode);
    }, [today, refreshCareTasks, refreshCarePlan])
  );

  // Live sync: reload data when any storage module emits an update
  const nowReloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nowLastLoadDone = useRef(0);
  useDataListener(useCallback((category: string) => {
    if (([EVENT.MEDICATION, EVENT.VITALS, EVENT.WATER, EVENT.MOOD, EVENT.WELLNESS,
         EVENT.LOGS, EVENT.CARE_PLAN, EVENT.CARE_PLAN_CONFIG, EVENT.APPOINTMENTS,
         EVENT.DAILY_INSTANCES, EVENT.CARE_PLAN_ITEMS, EVENT.SAMPLE_DATA_CLEARED,
         EVENT.SYMPTOMS, EVENT.NOTES] as string[]).includes(category)) {
      if (['carePlanItems', 'carePlanConfig'].includes(category) && Date.now() - nowLastLoadDone.current < 2000) return;
      if (nowReloadTimer.current) clearTimeout(nowReloadTimer.current);
      nowReloadTimer.current = setTimeout(() => {
        loadData().finally(() => { nowLastLoadDone.current = Date.now(); });
        refreshCareTasks();
      }, 300);
      if (category === EVENT.SAMPLE_DATA_CLEARED) {
        setIsSampleMode(false);
      }
    }
  }, [refreshCareTasks]));

  const loadData = async () => {
    try {
      // Load patient name — prefer PatientContext, fall back to AsyncStorage for migration
      if (activePatient && activePatient.name !== 'Patient') {
        setPatientName(activePatient.name);
      } else {
        const name = await safeGetItem<string | null>(StorageKeys.PATIENT_NAME, null);
        if (name && name !== 'Patient') {
          setPatientName(name);
          try {
            await updatePatient(activePatient?.id || 'default', { name });
          } catch {}
        } else {
          setPatientName(activePatient?.name || 'Patient');
        }
      }

      const meds = await getMedications();
      const activeMeds = meds.filter((m) => m.active);
      setMedications(activeMeds);

      const todayDate = getTodayDateString();
      const tracking = await getDailyTracking(todayDate);
      setDailyTracking(tracking);

      // Load vitals to count (legacy fallback)
      const todayVitals = await getTodayVitalsLog();
      let vitalsLogged = 0;
      if (todayVitals) {
        if (todayVitals.systolic) vitalsLogged++;
        if (todayVitals.diastolic) vitalsLogged++;
        if (todayVitals.heartRate) vitalsLogged++;
        if (todayVitals.temperature) vitalsLogged++;
      }

      // Count meds taken TODAY
      const allMedLogs = await getMedicationLogs();
      const todayStr = new Date().toDateString();
      const todayTakenIds = new Set(
        allMedLogs
          .filter(log => log.taken && new Date(log.timestamp).toDateString() === todayStr)
          .map(log => log.medicationId)
      );
      const takenMeds = activeMeds.filter(m => todayTakenIds.has(m.id)).length;
      const totalMeds = activeMeds.length;

      const mealsLog = await getTodayMealsLog();
      const mealsLogged = mealsLog?.meals?.length || 0;

      // Load water intake for today
      try {
        const waterLog = await getTodayWaterLog();
        setWaterGlasses(waterLog?.glasses ?? 0);
      } catch {
        setWaterGlasses(0);
      }

      // Load care brief for coffee moment
      buildCareBrief().then(data => setBrief(data)).catch(() => {});

      // Legacy stats fallback
      const legacyStatsUpdate: TodayStats = {
        meds: { completed: takenMeds, total: totalMeds },
        vitals: { completed: vitalsLogged, total: 4 },
        meals: { completed: mealsLogged, total: 4 },
      };
      setLegacyStats(legacyStatsUpdate);

      await computePromptsHook(legacyStatsUpdate, null);
      await loadBaselines();
    } catch (error) {
      logError('HomeScreen.loadData', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  // ============================================================================
  // RENDER
  // ============================================================================

  function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  return (
    <View style={styles.container}>
      <AuroraBackground variant="now" />

      <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 8 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
      >
        {/* Header: personalized greeting + patient chip + settings gear */}
        <View style={styles.greetingHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.greetingDateRow}>
              <Text style={styles.greetingDate}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </Text>
            </View>
            <Text style={styles.greetingText}>
              {getGreeting()}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setShowPatientSwitcher(true)}
              style={[styles.patientChip, isSampleMode && styles.patientChipDemo]}
              accessibilityLabel={`Patient: ${patientName}${isSampleMode ? ' (demo)' : ''}. Tap to switch.`}
              accessibilityRole="button"
            >
              <View style={styles.patientAvatar}>
                <Text style={styles.patientAvatarText}>
                  {patientName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={{ fontSize: 10, color: colors.textDisabled }}>{'\u25BE'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigate('/settings')}
              accessibilityLabel="Settings"
              accessibilityRole="button"
              style={{ padding: 8, marginLeft: 8 }}
            >
              <Text style={{ fontSize: 20 }}>{"\u2699\uFE0F"}</Text>
            </TouchableOpacity>
          </View>
        </View>
        {showPatientSwitcher && (
          <PatientSwitcherModal
            visible={showPatientSwitcher}
            onClose={() => setShowPatientSwitcher(false)}
          />
        )}

        {/* Sample Data Banner */}
        {isSampleMode && (
          <View style={styles.sampleBannerWrap}>
            <SampleDataBanner onCleared={() => { setIsSampleMode(false); loadData(); refreshCareTasks(); }} />
          </View>
        )}

        {/* Coffee Moment Modal */}
        {coffeeMoment.showModal && (
          <CoffeeMomentMinimal
            visible={coffeeMoment.showModal}
            onClose={coffeeMoment.closeModal}
            microcopy="Pause for a minute"
            duration={60}
            encouragement={coffeeMoment.encouragement}
          />
        )}

        {/* Onboarding Prompt */}
        {showOnboarding && (
          <OnboardingPrompt
            onShowMeWhatMatters={handlers.handleShowMeWhatMatters}
            onExploreOnMyOwn={handlers.handleExploreOnMyOwn}
          />
        )}

        <View style={styles.content}>

          {/* ═══ SETUP GUIDE ═══ */}
          <SetupGuideCard
            enabledBuckets={enabledBuckets}
            todayStats={todayStats}
            patientName={patientName}
          />

          {/* ═══ PROGRESS RINGS ═══ */}
          <ProgressRings
            stats={todayStats}
            enabledBuckets={enabledBuckets}
            selectedCategory={selectedCategory}
            onRingPress={handleRingPress}
            heroDone={heroDone}
            heroTotal={heroTotal}
            completionPct={completionPct}
          />

          {/* ═══ NEXT ACTION ═══ */}
          <View style={{ marginTop: 20 }} />
          <NextActionCard
            nextTask={nextTask}
            appointment={nextApptForCard}
            currentTimeWindow={currentTimeWindow === 'morning' ? 'Morning' : currentTimeWindow === 'afternoon' ? 'Afternoon' : currentTimeWindow === 'evening' ? 'Evening' : 'Night'}
            onConfirm={handleNextConfirm}
            onPrepVisit={() => navigate('/provider-prep')}
          />

          {/* ═══ MORNING MEDS BANNER ═══ */}
          <MorningMedsBanner
            medications={medications}
            allPending={allPending}
            onBatchConfirm={handleBatchMedConfirm}
          />

          {/* ═══ ENCOURAGEMENT ═══ */}
          <Text style={styles.encouragementText}>
            {allPending.length === 0 && todayTimeline.completed.length > 0
              ? 'You showed up today, and that matters.'
              : allPending.length <= 2 && allPending.length > 0
              ? 'Almost there. You\'re doing more than you think.'
              : 'Caregiving is hard. You\'re not behind \u2014 you\'re showing up.'}
          </Text>

        </View>

        {/* Bottom spacing for tab bar */}
        <View style={{ height: 83 }} />
      </ScrollView>
      </View>

      {/* Log FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: 100 + insets.bottom }]}
        onPress={() => navigate('/(tabs)/log')}
        accessibilityLabel="Log an event"
        accessibilityRole="button"
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
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
    paddingTop: 8,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 0,
  },

  // Header actions row
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // Patient chip
  patientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.accentLight,
    borderWidth: 1,
    borderColor: c.accentBorder,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
  patientAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientAvatarText: {
    fontSize: 10,
    fontWeight: '600',
    color: c.textPrimary,
  },
  patientChipDemo: {
    borderColor: c.purpleBright,
    borderWidth: 1.5,
  },
  sampleBannerWrap: {
    paddingHorizontal: 20,
    marginTop: 4,
  },
  greetingHeader: {
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  greetingDate: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: c.textMuted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  greetingText: {
    fontSize: 26,
    fontWeight: '700',
    color: c.textPrimary,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  greetingDateRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  encouragementText: {
    fontSize: 14,
    color: c.textSecondary,
    textAlign: 'center',
    marginTop: 28,
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '300',
    lineHeight: 26,
  },
});
