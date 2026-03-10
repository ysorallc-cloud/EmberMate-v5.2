// ============================================================================
// TODAY PAGE - What needs attention today
// Progress Rings + Timeline + Quick status
// ============================================================================

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { navigate } from '../../lib/navigate';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { getMedications, getMedicationLogs, Medication } from '../../utils/medicationStorage';
import { getUpcomingAppointments, Appointment } from '../../utils/appointmentStorage';
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
import { checkTodayVitalsExceedances } from '../../utils/vitalsGuidance';
import { getVitalsByType } from '../../utils/vitalsStorage';
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
import { useTodayScope } from '../../hooks/useTodayScope';
import { useCoffeeMoment } from '../../hooks/useCoffeeMoment';
import { CoffeeMomentMinimal } from '../../components/CoffeeMomentMinimal';
import { getTodayDateString } from '../../services/carePlanGenerator';
import { BucketType } from '../../types/carePlanConfig';
import { QuickAddSheet } from '../../components/today/QuickAddSheet';

// Urgency System
import {
  isClinicalCritical,
  UPCOMING_WINDOW_MINUTES,
} from '../../utils/urgency';

// Extracted utilities
import {
  type TodayStats,
  type StatData,
  type TimeWindow,
  isOverdue,
  getRouteForInstanceType,
  groupByTimeWindow,
  getCurrentTimeWindow,
  TIME_WINDOW_HOURS,
  OVERDUE_GRACE_MINUTES,
} from '../../utils/nowHelpers';
// Extracted hooks
import { useNowPrompts } from '../../hooks/useNowPrompts';
import { useNowInsights } from '../../hooks/useNowInsights';

// Extracted components
import { ProgressRings } from '../../components/now/ProgressRings';
import { MorningMedsBanner } from '../../components/now/MorningMedsBanner';
import { TimelineSection } from '../../components/now/TimelineSection';
import { RoutineSheet } from '../../components/now/RoutineSheet';
import { HandoffPromptCard } from '../../components/now/HandoffPromptCard';
import { DadOrb } from '../../components/now/DadOrb';
import { NextActionCard } from '../../components/now/NextActionCard';
import { CaregiverZone } from '../../components/now/CaregiverZone';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

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

type HandoffType = 'done' | 'watch' | 'flag';
interface HandoffItem { icon: string; text: string; type: HandoffType; }
interface BeforeBedItem { icon: string; text: string; route: string; }

// Banners (removed: NoMedicationsBanner, NoCarePlanBanner, DataIntegrityBanner)
import { logError } from '../../utils/devLog';
import { useDataListener, emitDataUpdate } from '../../lib/events';
import { EVENT } from '../../lib/eventNames';
import { buildCareBrief, CareBrief } from '../../utils/careSummaryBuilder';
import { hasSampleData } from '../../utils/sampleDataManager';
import { SampleDataBanner } from '../../components/common/SampleDataBanner';

// ============================================================================
// INLINE COMPONENT — Section header row (flat, no emoji icons)
// ============================================================================

function SectionHeaderRow({
  title,
  action,
  onAction,
  collapsed,
  onToggleCollapse,
  iconAction,
  onIconAction,
  styles: s,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  iconAction?: string;
  onIconAction?: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <TouchableOpacity
      style={s.sectionHeaderRow}
      onPress={onToggleCollapse}
      activeOpacity={onToggleCollapse ? 0.7 : 1}
      disabled={!onToggleCollapse}
      accessibilityRole="button"
      accessibilityLabel={onToggleCollapse ? `${title}, ${collapsed ? 'collapsed, tap to expand' : 'expanded, tap to collapse'}` : title}
      accessibilityState={onToggleCollapse ? { expanded: !collapsed } : undefined}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
        <Text style={s.sectionHeaderTitle}>{title}</Text>
        {onToggleCollapse && (
          <Text style={{ fontSize: 12, color: Colors.textMuted }}>{collapsed ? '\u25B6' : '\u25BC'}</Text>
        )}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {iconAction && onIconAction && (
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation(); onIconAction(); }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Quick log"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={s.sectionHeaderIcon}>{iconAction}</Text>
          </TouchableOpacity>
        )}
        {action && onAction && (
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation(); onAction(); }}
            accessibilityRole="button"
            accessibilityLabel={action}
          >
            <Text style={s.sectionHeaderAction}>{action} →</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// INLINE COMPONENT — Insight banner (amber left border, dismissable)
// ============================================================================

// ============================================================================
// INLINE COMPONENT — Care Status Banner (Phase 2)
// ============================================================================

function CareStatusBanner({
  status,
  styles: s,
  colors: c,
  insightMessage,
}: {
  status: 'stable' | 'watch' | 'attention';
  styles: any;
  colors: typeof Colors;
  insightMessage?: string | null;
}) {
  const config = {
    stable:    { label: 'Stable',          color: c.green,     bg: c.greenTint,  border: c.greenBorder, icon: '\u2713' },
    watch:     { label: 'Watch',            color: c.amber,     bg: c.amberLight, border: c.amberBorder, icon: '\u25D0' },
    attention: { label: 'Needs Attention',  color: c.redBright, bg: c.redLight,   border: c.redBorder,   icon: '!' },
  }[status];

  const sub = insightMessage ?? null;

  return (
    <View
      style={{
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: 10,
        padding: 12,
        paddingHorizontal: 14,
        borderRadius: 14,
        backgroundColor: config.bg,
        borderWidth: 1,
        borderColor: config.border,
        marginBottom: 14,
      }}
      accessibilityLabel={`Care status: ${config.label}`}
    >
      <View style={{
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: config.color + '33',
        borderWidth: 1, borderColor: config.border,
        alignItems: 'center' as const, justifyContent: 'center' as const,
      }}>
        <Text style={{ fontSize: 12, fontWeight: '700' as const, color: config.color }}>{config.icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: '600' as const, color: config.color }}>{config.label}</Text>
        {sub && <Text style={{ fontSize: 11, color: c.textSecondary, marginTop: 1 }} numberOfLines={1}>{sub}</Text>}
      </View>
    </View>
  );
}


export default function NowScreen() {
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
  const { dayState, carePlan, overrides, snoozeItem, setItemOverride, integrityWarnings, refresh: refreshCarePlan } = useCarePlan(today);

  // Appointments hook
  const { todayAppointments, nextAppointment, upcomingAppointments, complete: completeAppointment } = useAppointments();

  // Bucket-based Care Plan Config hook
  const { hasCarePlan: hasBucketCarePlan, loading: carePlanConfigLoading, enabledBuckets } = useCarePlanConfig();

  // Today Scope - track hidden items count
  const { suppressedItems, resetToDefaults: restoreAllSuppressed } = useTodayScope(today);

  // Determine which system to use
  const hasRegimenInstances = instancesState && instancesState.instances.length > 0;
  const hasAnyCarePlan = carePlan || hasBucketCarePlan || hasRegimenInstances;

  const [medications, setMedications] = useState<Medication[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [dailyTracking, setDailyTracking] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ScrollView ref for scroll-to behavior
  const scrollViewRef = useRef<ScrollView>(null);

  // Category filter state (tappable rings)
  const [selectedCategory, setSelectedCategory] = useState<BucketType | null>(null);
  const [activeRoutineWindow, setActiveRoutineWindow] = useState<TimeWindow | null>(null);

  const handleRingPress = useCallback((bucket: BucketType) => {
    setSelectedCategory(prev => prev === bucket ? null : bucket);
  }, []);

  const handleClearCategory = useCallback(() => {
    setSelectedCategory(null);
  }, []);

  // Legacy stats state - fallback when no regimen instances
  const [legacyStats, setLegacyStats] = useState<TodayStats>({
    meds: { completed: 0, total: 0 },
    vitals: { completed: 0, total: 4 },
    meals: { completed: 0, total: 3 },
  });

  // Water stats from direct storage (not care plan instances, since water is counted in glasses not task completions)
  const [waterGlasses, setWaterGlasses] = useState(0);
  const [patientName, setPatientName] = useState('Patient');
  const [patientGender, setPatientGender] = useState<string | null>(null);

  // Vitals guidance state (Task 4.1)
  const [vitalsExceedances, setVitalsExceedances] = useState<any[]>([]);
  const [vitalsRecentReadings, setVitalsRecentReadings] = useState<any[]>([]);
  const [vitalsGuidanceDismissed, setVitalsGuidanceDismissed] = useState(false);

  // Timeline collapse state — default expanded so users see their schedule
  const [timelineCollapsed, setTimelineCollapsed] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  // Handoff / Patterns / Before Bed (mirrored from Journal)
  const [brief, setBrief] = useState<CareBrief | null>(null);

  // Sample data mode
  const [isSampleMode, setIsSampleMode] = useState(false);

  const [showPatientSwitcher, setShowPatientSwitcher] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const { activePatient, patients } = usePatient();
  const waterGoal = 8;

  const handleWaterUpdate = useCallback(async (newGlasses: number) => {
    try {
      setWaterGlasses(newGlasses);
      await updateTodayWaterLog(newGlasses);
      emitDataUpdate(EVENT.WATER);
    } catch (error) {
      logError('now.handleWaterUpdate', error);
    }
  }, []);

  // ============================================================================
  // SINGLE SOURCE OF TRUTH: Compute stats from useCareTasks hook
  // ============================================================================
  const todayStats = useMemo((): TodayStats => {
    // Derive directly from instancesState (the freshest source) instead of
    // careTasksState which can lag behind after completions.
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
  const { insight } = useNowInsights(
    todayStats, instancesState, today, medications, appointments, dailyTracking
  );

  // ============================================================================
  // TODAY TIMELINE - Built from DailyCareInstances
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

  // ============================================================================
  // CARE STATUS — derived from overdue items and vitals exceedances
  // ============================================================================
  const careStatus = useMemo((): 'stable' | 'watch' | 'attention' => {
    const hasCriticalOverdue = todayTimeline.overdue.some(
      i => isClinicalCritical(i.itemType)
    );
    const hasVitalsAlert = vitalsExceedances.length > 0;
    const noVitalsToday = !brief?.vitals?.recorded && new Date().getHours() >= 10;

    if (hasCriticalOverdue || (noVitalsToday && todayTimeline.overdue.length >= 2)) {
      return 'attention';
    }
    if (todayTimeline.overdue.length > 0 || hasVitalsAlert) {
      return 'watch';
    }
    return 'stable';
  }, [todayTimeline.overdue, vitalsExceedances, brief]);


  // Hero totals — must match the buckets shown in ProgressRings
  const { heroDone, heroTotal } = useMemo(() => {
    const BUCKET_STAT_KEY: Record<string, keyof TodayStats> = {
      meds: 'meds', vitals: 'vitals', meals: 'meals', water: 'water',
      sleep: 'sleep', activity: 'activity', wellness: 'wellness', custom: 'custom',
    };

    // Only include buckets that have instance-based tracking
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

    // Include custom if it has data and isn't already in enabledBuckets
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

  // Merge overdue + upcoming into single allPending array for TimelineSection
  const allPending = useMemo(() => {
    return [...todayTimeline.overdue, ...todayTimeline.upcoming];
  }, [todayTimeline.overdue, todayTimeline.upcoming]);

  // Window summary for collapsed timeline view
  const windowSummary = useMemo(() => {
    if (!instancesState?.instances || instancesState.date !== today) return [];
    const allInstances = instancesState.instances;
    const grouped = groupByTimeWindow(allInstances);
    const currentWindow = getCurrentTimeWindow();
    const windows: TimeWindow[] = ['morning', 'afternoon', 'evening', 'night'];

    return windows
      .filter(w => grouped[w].length > 0)
      .map(w => {
        const items = grouped[w];
        const completed = items.filter(i => i.status === 'completed' || i.status === 'skipped').length;
        const pending = items.filter(i => i.status === 'pending').length;
        const total = items.length;
        const allDone = pending === 0 && total > 0;
        const isCurrent = w === currentWindow;
        return {
          window: w,
          label: TIME_WINDOW_HOURS[w].label,
          total,
          completed,
          pending,
          allDone,
          isCurrent,
        };
      });
  }, [instancesState?.instances, instancesState?.date, today]);

  // Coffee Moment - gentle nudge when task load is high
  const overdueCount = todayTimeline.overdue.length;
  const hasLateMedication = todayTimeline.overdue.some(
    (i: any) => i.itemType === 'medication'
  );
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

  // Handler for timeline item tap
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
    // Pain: route to dedicated pain tracking screen
    if (instance.itemName?.toLowerCase().includes('pain')) {
      navigate({
        pathname: '/log-pain',
        params: {
          instanceId: instance.id,
          carePlanItemId: instance.carePlanItemId || '',
          itemName: instance.itemName || '',
        },
      });
      return;
    }
    // Wellness: route to morning or evening screen based on instance windowLabel
    if (instance.itemType === 'wellness') {
      const wellnessRoute = instance.windowLabel === 'evening'
        ? '/log-evening-wellness'
        : '/log-morning-wellness'; // morning and midday both use morning wellness screen
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

  // Skip an instance from UpNextCard
  const handleSkipInstance = useCallback(async (instanceId: string) => {
    await completeInstance(instanceId, 'skipped');
    emitDataUpdate(EVENT.DAILY_INSTANCES);
  }, [completeInstance]);

  // Batch confirm meds — uses completeInstance from useCareTasks
  const handleBatchMedConfirm = useCallback(async (instanceIds: string[]) => {
    for (const id of instanceIds) {
      await completeInstance(id, 'taken');
    }
    emitDataUpdate(EVENT.DAILY_INSTANCES);
  }, [completeInstance]);

  // Next appointment for greeting subtitle
  const nextApptDisplay = useMemo(() => {
    const appt = nextAppointment;
    if (!appt) return null;

    const apptDate = new Date(appt.date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    apptDate.setHours(0, 0, 0, 0);
    const diffDays = Math.round((apptDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0 || diffDays > 14) return null;

    const dayLabel = diffDays === 0 ? 'Today'
      : diffDays === 1 ? 'Tomorrow'
      : apptDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    const timeLabel = appt.time
      ? (() => {
          const [h, m] = appt.time.split(':');
          const hr = parseInt(h, 10);
          const minStr = m === '00' ? '' : `:${m}`;
          return `${hr % 12 || 12}${minStr} ${hr >= 12 ? 'PM' : 'AM'}`;
        })()
      : '';

    const provider = appt.provider || appt.specialty || 'Appointment';

    return {
      text: `${provider} — ${dayLabel}${timeLabel ? ' at ' + timeLabel : ''}`,
      daysUntil: diffDays,
      id: appt.id,
    };
  }, [nextAppointment]);

  // DadOrb computed values — non-med care totals
  const { careDone, careTotal } = useMemo(() => {
    let done = 0;
    let total = 0;
    const nonMedKeys: (keyof TodayStats)[] = ['vitals', 'meals', 'wellness', 'activity'];
    for (const key of nonMedKeys) {
      const stat = todayStats[key];
      if (stat && stat.total > 0) {
        done += stat.completed ?? 0;
        total += stat.total ?? 0;
      }
    }
    if (todayStats.custom && todayStats.custom.total > 0) {
      done += todayStats.custom.completed ?? 0;
      total += todayStats.custom.total ?? 0;
    }
    return { careDone: done, careTotal: total };
  }, [todayStats]);

  // Last completed item for DadOrb
  const lastCompleted = useMemo(() => {
    const completed = todayTimeline.completed;
    if (completed.length === 0) return null;
    const last = completed[completed.length - 1];
    return {
      label: last.itemName || last.itemType,
      time: formatTime(last.scheduledTime),
    };
  }, [todayTimeline.completed]);

  // DadOrb legend items
  const orbLegend = useMemo(() => [
    { color: colors.accent, label: `Meds ${todayStats.meds.completed}/${todayStats.meds.total}` },
    { color: '#67B8A7', label: `Vitals ${todayStats.vitals.completed}/${todayStats.vitals.total}` },
    { color: colors.amber, label: `Meals ${todayStats.meals.completed}/${todayStats.meals.total}` },
    { color: '#EC4899', label: `Check ${todayStats.wellness?.completed ?? 0}/${todayStats.wellness?.total ?? 0}` },
  ].filter(item => !item.label.endsWith('/0')), [todayStats, colors]);

  // NextActionCard data
  const nextTask = useMemo(() => {
    const first = allPending[0];
    if (!first) return null;
    return {
      id: first.id,
      label: first.itemName || first.itemType,
      sub: first.itemDosage || first.instructions || '',
      emoji: first.itemEmoji || (first.itemType === 'medication' ? '\uD83D\uDC8A' : first.itemType === 'vitals' ? '\uD83D\uDCCA' : first.itemType === 'nutrition' ? '\uD83C\uDF7D\uFE0F' : '\u2705'),
      isMed: first.itemType === 'medication',
      overdue: isOverdue(first.scheduledTime),
    };
  }, [allPending]);

  const currentTimeWindow = useMemo(() => getCurrentTimeWindow(), []);

  const nextApptForCard = useMemo(() => {
    if (!nextAppointment) return null;
    const appt = nextAppointment;
    const [year, month, day] = appt.date.split('-').map(Number);
    const apptDate = new Date(year, month - 1, day);
    const dayLabel = apptDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const timeLabel = appt.time
      ? (() => {
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

  // Handler for NextActionCard confirm
  const handleNextConfirm = useCallback(async (taskId: string) => {
    const task = allPending.find(t => t.id === taskId);
    if (!task) return;
    if (task.itemType === 'medication') {
      const pendingMeds = allPending.filter(i => i.itemType === 'medication');
      await handleBatchMedConfirm(pendingMeds.map(m => m.id));
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
      // Suppress config events that are self-generated by ensureDailyInstances sync
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
          // Migration: sync legacy name to patient registry
          try {
            await updatePatient(activePatient?.id || 'default', { name });
          } catch {}
        } else {
          setPatientName(activePatient?.name || 'Patient');
        }
      }

      const gender = await safeGetItem<string | null>(StorageKeys.PATIENT_GENDER, null);
      setPatientGender(gender);

      const meds = await getMedications();
      const activeMeds = meds.filter((m) => m.active);
      setMedications(activeMeds);

      const appts = await getUpcomingAppointments();
      setAppointments(appts);

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

      // Count meds taken TODAY (not the global .taken flag which persists across days)
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

      // Check vitals for threshold exceedances (Task 4.1)
      try {
        const exceedances = await checkTodayVitalsExceedances();
        setVitalsExceedances(exceedances);
        if (exceedances.length > 0) {
          const recent = await getVitalsByType(exceedances[0].type as any);
          setVitalsRecentReadings(recent.slice(0, 5));
        }
      } catch {
        setVitalsExceedances([]);
      }

      // Load care brief for handoff/patterns/before-bed
      buildCareBrief().then(data => setBrief(data)).catch(() => {});

      // Legacy stats fallback — only used when no regimen instances exist
      const legacyStatsUpdate: TodayStats = {
        meds: { completed: takenMeds, total: totalMeds },
        vitals: { completed: vitalsLogged, total: 4 },
        meals: { completed: mealsLogged, total: 4 },
      };
      setLegacyStats(legacyStatsUpdate);

      await computePromptsHook(legacyStatsUpdate, null);

      // Load baselines
      await loadBaselines();
    } catch (error) {
      logError('NowScreen.loadData', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setHistoryExpanded(false);
    await loadData();
    setRefreshing(false);
  }, []);

  // ============================================================================
  // HANDOFF NOTES + BEFORE BED (mirrored from Journal)
  // ============================================================================
  function buildHandoffNotes(): HandoffItem[] {
    if (!brief) return [];
    const items: HandoffItem[] = [];

    for (const med of brief.medications) {
      if ((med.status === 'completed' || med.status === 'skipped') && med.takenAt) {
        items.push({
          icon: '\uD83D\uDC8A',
          text: `${med.name} taken at ${formatTime(med.takenAt)}`,
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

  function buildBeforeBedItems(): BeforeBedItem[] {
    const items: BeforeBedItem[] = [];
    const seenRoutes = new Set<string>();
    const seenLabels = new Set<string>();

    if (careTasksState) {
      const eveningTasks = careTasksState.byWindow['evening'] || [];
      const nightTasks = careTasksState.byWindow['night'] || [];
      for (const task of [...eveningTasks, ...nightTasks]) {
        if (task.status === 'pending') {
          const route = task.primaryAction?.route || '';
          if (route && seenRoutes.has(route)) continue;
          if (route) seenRoutes.add(route);
          const normalizedText = (task.title || '').toLowerCase().trim();
          if (normalizedText && seenLabels.has(normalizedText)) continue;
          if (normalizedText) seenLabels.add(normalizedText);
          items.push({
            icon: task.emoji || '\u2705',
            text: task.title,
            route,
          });
        }
      }
    }

    if (brief && !brief.sleep.logged) {
      const pronoun = patientGender?.toLowerCase() === 'male' ? 'he'
        : patientGender?.toLowerCase() === 'female' ? 'she' : 'they';
      const sleepRoute = '/log-sleep';
      if (!seenRoutes.has(sleepRoute)) {
        seenRoutes.add(sleepRoute);
        items.push({ icon: '\uD83D\uDE34', text: `Log sleep when ${pronoun} go${pronoun === 'they' ? '' : 'es'} to bed`, route: sleepRoute });
      }
    }

    if (seenLabels.has('evening wellness check')) return items;

    const hasEvening = brief?.mood.eveningWellness != null;
    if (brief && !hasEvening && new Date().getHours() >= 17) {
      const wellnessRoute = '/log-evening-wellness';
      if (!seenRoutes.has(wellnessRoute)) {
        seenRoutes.add(wellnessRoute);
        items.push({ icon: '\uD83D\uDCCB', text: 'Evening wellness check', route: wellnessRoute });
      }
    }

    return items;
  }

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <View style={styles.container}>
      <AuroraBackground variant="now" />

      <View style={{ flex: 1 }}>
      <ScrollView
        ref={scrollViewRef}
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
        {/* Header: personalized greeting + patient chip */}
        <View style={styles.greetingHeader}>
          <View style={{ flex: 1 }}>
            <TouchableOpacity
              onPress={() => navigate('/calendar')}
              activeOpacity={0.7}
              style={styles.greetingDateRow}
              accessibilityLabel="Open calendar"
              accessibilityRole="button"
            >
              <Text style={styles.greetingDate}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </Text>
              <Text style={styles.greetingDateChevron}>{'\u203A'}</Text>
            </TouchableOpacity>
            <Text style={styles.greetingText}>
              {getGreeting()}
            </Text>
          </View>
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

        {/* Hidden Items Banner */}
        {suppressedItems.length > 0 && (
          <View
            style={styles.hiddenBanner}
            accessibilityLabel={`${suppressedItems.length} item${suppressedItems.length === 1 ? '' : 's'} hidden for today`}
            accessibilityRole="text"
          >
            <Text style={styles.hiddenBannerText}>
              {suppressedItems.length} item{suppressedItems.length === 1 ? '' : 's'} hidden for today
            </Text>
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  'Restore Hidden Items',
                  'Show all Care Plan items for today?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Restore All',
                      onPress: async () => {
                        await restoreAllSuppressed();
                      },
                    },
                  ],
                );
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Restore all hidden items"
            >
              <Text style={styles.hiddenBannerAction}>Restore All</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Coffee Moment Modal (banner removed — footer pause link is the entry point) */}
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

          {/* ═══ DAD ORB ═══ */}
          <DadOrb
            patientName={patientName}
            medsDone={todayStats.meds.completed}
            medsTotal={todayStats.meds.total}
            careDone={careDone}
            careTotal={careTotal}
            lastCompleted={lastCompleted}
            legend={orbLegend}
          />

          {/* ═══ SIDE-BY-SIDE: Appointment + Next ═══ */}
          <NextActionCard
            nextTask={nextTask}
            appointment={nextApptForCard}
            currentTimeWindow={currentTimeWindow === 'morning' ? 'Morning' : currentTimeWindow === 'afternoon' ? 'Afternoon' : currentTimeWindow === 'evening' ? 'Evening' : 'Night'}
            onConfirm={handleNextConfirm}
            onPrepVisit={() => navigate('/provider-prep')}
          />

          {/* ═══ TODAY'S SCHEDULE ═══ */}
          <SectionHeaderRow
            title="Today's Schedule"
            action="Care Plan"
            onAction={() => navigate('/care-plan')}
            collapsed={timelineCollapsed}
            onToggleCollapse={() => setTimelineCollapsed(prev => !prev)}
            styles={styles}
          />

          {timelineCollapsed ? (
            /* Collapsed: window summary rows */
            windowSummary.length > 0 && (
              <View style={styles.sectionCard}>
                {todayAppointments.length > 0 && todayAppointments.map((appt) => (
                  <TouchableOpacity
                    key={appt.id}
                    style={styles.scheduleApptRow}
                    onPress={() => navigate('/provider-prep')}
                    activeOpacity={0.7}
                    accessibilityLabel={`${appt.specialty} appointment with ${appt.provider} at ${appt.time}`}
                    accessibilityRole="button"
                  >
                    <Text style={styles.scheduleApptIcon}>{'\uD83D\uDCC5'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.scheduleApptTitle}>
                        {appt.provider} — {appt.specialty}
                      </Text>
                      <Text style={styles.scheduleApptTime}>
                        {appt.time ? (() => {
                          const [h, m] = appt.time.split(':');
                          const hr = parseInt(h, 10);
                          return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
                        })() : 'Time TBD'}
                      </Text>
                    </View>
                    <Text style={styles.scheduleApptAction}>Prep {'\u203A'}</Text>
                  </TouchableOpacity>
                ))}
                {windowSummary.map((w) => (
                  <View
                    key={w.window}
                    style={[
                      styles.windowRow,
                      w.isCurrent && !w.allDone && styles.windowRowCurrent,
                    ]}
                  >
                    <View style={[styles.windowDot, { backgroundColor: w.allDone ? colors.green : colors.redBright }]} />
                    <Text style={[styles.windowLabel, w.isCurrent && !w.allDone && styles.windowLabelCurrent]}>
                      {w.label.toUpperCase()}
                    </Text>
                    <Text style={styles.windowStatus}>
                      {w.allDone ? 'Complete \u2713' : `${w.pending} remaining`}
                    </Text>
                    {w.isCurrent && !w.allDone && (
                      <TouchableOpacity
                        style={styles.windowStartBtn}
                        onPress={() => {
                          setActiveRoutineWindow(w.window);
                        }}
                        activeOpacity={0.7}
                        accessibilityLabel={`Start ${w.label} routine`}
                        accessibilityRole="button"
                      >
                        <Text style={styles.windowStartText}>Start</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )
          ) : (
            <View style={styles.sectionCard}>
              {/* Timeline — what's happening today */}
              <TimelineSection
                allPending={allPending}
                completed={todayTimeline.completed}
                hasRegimenInstances={!!hasRegimenInstances}
                selectedCategory={selectedCategory}
                onClearCategory={handleClearCategory}
                onItemPress={handleTimelineItemPress}
                onBatchMedConfirm={handleBatchMedConfirm}
                todayStats={todayStats}
                enabledBuckets={enabledBuckets}
                waterGlasses={waterGlasses}
                waterGoal={waterGoal}
                onWaterUpdate={handleWaterUpdate}
                onStartRoutine={setActiveRoutineWindow}
              />

              {/* Empty states */}
              {!hasRegimenInstances && !hasBucketCarePlan && !carePlan && (
                <View style={styles.emptyTimeline}>
                  <Text style={styles.emptyTimelineText}>No Care Plan set up yet</Text>
                  <Text style={styles.emptyTimelineSubtext}>Add medications or items to see your timeline</Text>
                </View>
              )}

              {!hasRegimenInstances && (hasBucketCarePlan || carePlan) && (
                <View style={styles.emptyTimeline}>
                  <Text style={styles.emptyTimelineText}>No items scheduled for today</Text>
                  <Text style={styles.emptyTimelineSubtext}>Check your Care Plan settings</Text>
                </View>
              )}

              {hasRegimenInstances &&
                allPending.length === 0 &&
                todayTimeline.completed.length === 0 && (
                <View style={styles.emptyTimeline}>
                  <Text style={styles.emptyTimelineText}>No items scheduled for today</Text>
                </View>
              )}
            </View>
          )}

          {/* ═══ WHAT'S HAPPENED ═══ */}
          {brief && (() => {
            const handoffNotes = buildHandoffNotes();
            if (handoffNotes.length === 0) return null;
            return (
              <>
                {historyExpanded ? (
                  <>
                    <SectionHeaderRow title="What's Happened" styles={styles} />
                    <View style={styles.sectionCard}>
                      {handoffNotes.map((item, i) => (
                        <View key={`handoff-${i}`} style={styles.handoffRow}>
                          <Text style={styles.handoffIcon}>{item.icon}</Text>
                          <Text style={styles.handoffText}>{item.text}</Text>
                        </View>
                      ))}
                    </View>
                  </>
                ) : (
                  <TouchableOpacity
                    style={[styles.sectionCard, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 }]}
                    onPress={() => setHistoryExpanded(true)}
                    activeOpacity={0.7}
                    accessibilityLabel={`${handoffNotes.length} items logged today. Tap to expand.`}
                    accessibilityRole="button"
                  >
                    <Text style={{ fontSize: 13, color: colors.textMuted }}>
                      {handoffNotes.length} item{handoffNotes.length !== 1 ? 's' : ''} logged today
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.accent, fontWeight: '500' }}>
                      View ›
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            );
          })()}

          {/* ═══ BEFORE BED ═══ */}
          {brief && new Date().getHours() >= 17 && (() => {
            const bedItems = buildBeforeBedItems();
            if (bedItems.length === 0) return null;
            return (
              <>
                <SectionHeaderRow title="Before Bed" styles={styles} />
                <View style={styles.sectionCard}>
                  {bedItems.map((item, i) => (
                    <TouchableOpacity
                      key={`bed-${i}`}
                      style={styles.beforeBedRow}
                      onPress={() => item.route && navigate(item.route)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.beforeBedIcon}>{item.icon}</Text>
                      <Text style={styles.beforeBedText}>{item.text}</Text>
                      <Text style={styles.beforeBedArrow}>{'\u2192'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            );
          })()}

          {/* ═══ ENCOURAGEMENT ═══ */}
          <Text style={styles.encouragementText}>
            {allPending.length === 0 && todayTimeline.completed.length > 0
              ? 'You showed up today, and that matters.'
              : allPending.length <= 2 && allPending.length > 0
              ? 'Almost there. You\'re doing more than you think.'
              : 'Caregiving is hard. You\'re not behind \u2014 you\'re showing up.'}
          </Text>

          {/* ═══ FOR YOU ═══ */}
          <CaregiverZone
            completedCount={todayTimeline.completed.length}
            skippedCount={suppressedItems.length}
            onPause={coffeeMoment.startReset}
            onQuickAdd={() => setShowQuickAdd(true)}
          />

        </View>

        {/* Bottom spacing for tab bar */}
        <View style={{ height: 83 }} />
      </ScrollView>
      </View>

      {/* Routine Sheet — batch logging for a time window */}
      {activeRoutineWindow && (
        <RoutineSheet
          visible={!!activeRoutineWindow}
          window={activeRoutineWindow}
          items={[...allPending, ...todayTimeline.completed].filter(
            i => i.windowLabel === activeRoutineWindow
          )}
          onItemPress={handleTimelineItemPress}
          onDismiss={() => setActiveRoutineWindow(null)}
        />
      )}

      {showQuickAdd && (
        <QuickAddSheet
          visible={showQuickAdd}
          onClose={() => setShowQuickAdd(false)}
        />
      )}
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
  // closureContainer and orientationContainer removed — prompts consolidated into MorningBriefing
  content: {
    paddingHorizontal: 20,
    paddingTop: 0,
  },

  // Header + button (opens unified log)
  headerAddBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAddBtnText: {
    fontSize: 20,
    fontWeight: '300',
    color: '#fff',
    lineHeight: 22,
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
  patientChipName: {
    fontSize: 12,
    color: c.textSecondary,
    fontWeight: '500',
  },
  patientChipDemo: {
    borderColor: c.purpleBright,
    borderWidth: 1.5,
  },
  demoBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: c.purpleBright,
    backgroundColor: c.purpleFaint,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    overflow: 'hidden',
    letterSpacing: 0.5,
  },
  sampleBannerWrap: {
    paddingHorizontal: 20,
    marginTop: 4,
  },
  greetingHeader: {
    paddingHorizontal: 20,
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
  greetingName: {
    color: c.accent,
  },
  hiddenBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: c.glass,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.glassHover,
  },
  hiddenBannerText: {
    fontSize: 13,
    color: c.textHalf,
  },
  hiddenBannerAction: {
    fontSize: 13,
    color: c.accent,
    fontWeight: '500',
  },
  // ── Section Header Row ──
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    paddingBottom: 10,
    minHeight: 44,
  },
  sectionHeaderTitle: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 2,
    color: c.textTertiary,
    textTransform: 'uppercase',
  },
  sectionHeaderAction: {
    fontSize: 11,
    color: c.accent,
    fontWeight: '500',
  },
  sectionHeaderIcon: {
    fontSize: 18,
    fontWeight: '400' as const,
    color: c.accent,
    width: 26,
    height: 26,
    lineHeight: 26,
    textAlign: 'center' as const,
    borderRadius: 13,
    backgroundColor: c.accentLight,
    overflow: 'hidden' as const,
  },

  // ── Hero Completion Row ──
  heroCompletionRow: {
    flexDirection: 'row' as const, alignItems: 'flex-end' as const,
    gap: 4, marginBottom: 16,
  },
  heroCompletionNumber: {
    fontSize: 36, fontWeight: '700' as const, color: c.accent,
    letterSpacing: -2, lineHeight: 36,
  },
  heroCompletionDenom: {
    fontSize: 18, color: c.textMuted, marginBottom: 6,
  },
  heroCompletionPill: {
    marginLeft: 'auto' as const, paddingHorizontal: 12, paddingVertical: 5,
    backgroundColor: c.accentDim, borderRadius: 20,
    borderWidth: 1, borderColor: c.accentBorder,
  },
  heroCompletionPct: {
    fontSize: 11, fontWeight: '700' as const, color: c.accent,
  },

  // ── Hero Card (ProgressRings gradient) ──
  heroCard: {
    borderRadius: 22,
    padding: 20,
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: c.accentBorder,
  },
  heroOrb: {
    position: 'absolute',
    right: -20,
    top: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: c.accent,
    opacity: 0.07,
  },

  // ── Section Card wrapper ──
  sectionCard: {
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.glassBorder,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
  },

  emptyTimeline: {
    backgroundColor: c.glass,
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTimelineText: {
    fontSize: 14,
    color: c.textHalf,
  },
  emptyTimelineSubtext: {
    fontSize: 12,
    color: c.textDisabled,
    marginTop: 4,
  },
  allDoneMessage: {
    backgroundColor: c.greenTint,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 8,
  },
  allDoneEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  allDoneText: {
    fontSize: 16,
    fontWeight: '600',
    color: c.green,
  },
  encouragementText: {
    fontSize: 14,
    color: c.textSecondary,
    textAlign: 'center',
    marginVertical: 16,
    paddingHorizontal: 20,
  },
  footerSection: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 8,
  },
  footerMessage: {
    fontSize: 13,
    fontStyle: 'italic',
    color: c.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  footerCoffeeLink: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: c.glassDim,
    borderWidth: 1,
    borderColor: c.glassBorder,
  },
  footerCoffeeLinkText: {
    fontSize: 13,
    color: c.textSecondary,
    fontWeight: '500',
  },
  // ── Collapsed window summary ──
  windowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  windowRowCurrent: {
    backgroundColor: 'rgba(20, 184, 166, 0.08)',
    borderRadius: 10,
    marginHorizontal: -4,
    paddingHorizontal: 18,
  },
  windowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  windowLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: c.textSecondary,
  },
  windowLabelCurrent: {
    color: c.accent,
  },
  windowStatus: {
    flex: 1,
    fontSize: 13,
    color: c.textHalf,
  },
  windowStartBtn: {
    backgroundColor: c.accent,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  windowStartText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textPrimary,
  },

  // ── Handoff notes ──
  handoffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  handoffIcon: {
    fontSize: 16,
  },
  handoffText: {
    flex: 1,
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 18,
  },

  // ── Patterns ──
  patternRow: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  patternTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: c.textPrimary,
  },

  // ── Before bed ──
  beforeBedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  beforeBedIcon: {
    fontSize: 16,
  },
  beforeBedText: {
    flex: 1,
    fontSize: 13,
    color: c.textSecondary,
  },
  beforeBedArrow: {
    fontSize: 14,
    color: c.accent,
  },

  // ── Greeting date row (tappable) ──
  greetingDateRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  greetingDateChevron: {
    fontSize: 10,
    color: c.textDisabled,
  },

  // ── Appointment subtitle ──
  apptSubtitle: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginTop: 6,
  },
  apptSubtitleIcon: {
    fontSize: 12,
  },
  apptSubtitleText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: c.purple,
  },
  apptSubtitleChevron: {
    fontSize: 10,
    color: c.textDisabled,
  },

  // ── Schedule appointment row ──
  scheduleApptRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 4,
    backgroundColor: c.purpleFaint,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.purpleBorder,
  },
  scheduleApptIcon: {
    fontSize: 14,
  },
  scheduleApptTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: c.textPrimary,
  },
  scheduleApptTime: {
    fontSize: 11,
    color: c.textMuted,
    marginTop: 1,
  },
  scheduleApptAction: {
    fontSize: 11,
    color: c.accent,
    fontWeight: '500' as const,
  },
});
