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
import { getMedications, Medication } from '../../utils/medicationStorage';
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
import { getMedicationLogs } from '../../utils/medicationStorage';
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
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { ScreenHeader } from '../../components/ScreenHeader';
// SectionHeader replaced by inline SectionHeaderRow (flat, no icons)
import { MorningMedsBanner } from '../../components/now/MorningMedsBanner';
import { TimelineSection } from '../../components/now/TimelineSection';
import { RoutineSheet } from '../../components/now/RoutineSheet';
import { HandoffPromptCard } from '../../components/now/HandoffPromptCard';


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
import { GettingStartedChecklist } from '../../components/guidance';
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
    <View style={s.sectionHeaderRow}>
      {onToggleCollapse ? (
        <TouchableOpacity
          onPress={onToggleCollapse}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
          accessibilityRole="button"
          accessibilityLabel={`${title}, ${collapsed ? 'collapsed' : 'expanded'}`}
          accessibilityState={{ expanded: !collapsed }}
        >
          <Text style={s.sectionHeaderTitle}>{title}</Text>
          <Text style={{ fontSize: 12, color: Colors.textMuted }}>{collapsed ? '\u25B6' : '\u25BC'}</Text>
        </TouchableOpacity>
      ) : (
        <Text style={s.sectionHeaderTitle}>{title}</Text>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {iconAction && onIconAction && (
          <TouchableOpacity
            onPress={onIconAction}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Quick log"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={s.sectionHeaderIcon}>{iconAction}</Text>
          </TouchableOpacity>
        )}
        {action && onAction && (
          <TouchableOpacity onPress={onAction} accessibilityRole="button" accessibilityLabel={action}>
            <Text style={s.sectionHeaderAction}>{action} →</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
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
  activeTab,
  onTabPress,
  styles: s,
  colors: c,
}: {
  status: 'stable' | 'watch' | 'attention';
  activeTab: 'stable' | 'watch' | 'attention';
  onTabPress: (tab: 'stable' | 'watch' | 'attention') => void;
  styles: any;
  colors: typeof Colors;
}) {
  const config = {
    stable:    { label: 'Care Status: Stable',          color: c.green,   bg: c.greenTint,    border: c.greenBorder,  icon: '\u2713' },
    watch:     { label: 'Care Status: Watch',            color: c.amber,   bg: c.amberLight,   border: c.amberBorder,  icon: '\u25D0' },
    attention: { label: 'Care Status: Needs Attention',  color: c.redBright, bg: c.redLight,   border: c.redBorder,    icon: '!' },
  }[status];

  const sub = {
    stable:    'No missed critical medications \u00B7 Vitals within expected range',
    watch:     'Some items need attention \u2014 tap Watch below',
    attention: 'Urgent items require action now',
  }[status];

  return (
    <View>
      {/* Banner */}
      <View style={[s.careStatusBanner, { backgroundColor: config.bg, borderColor: config.border }]}>
        <View style={[s.careStatusIcon, { backgroundColor: config.color + '33', borderColor: config.border }]}>
          <Text style={[s.careStatusIconText, { color: config.color }]}>{config.icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.careStatusLabel, { color: config.color }]}>{config.label}</Text>
          <Text style={s.careStatusSub}>{sub}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={[s.careStatusTabs, { borderColor: config.border }]}>
        {(['stable', 'watch', 'attention'] as const).map((tab, i) => {
          const tabColor = { stable: c.green, watch: c.amber, attention: c.redBright }[tab];
          const active = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[
                s.careStatusTab,
                i < 2 && s.careStatusTabBorder,
                active && { backgroundColor: tabColor + '22' },
              ]}
              onPress={() => onTabPress(tab)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${tab} status tab`}
            >
              <Text style={[s.careStatusTabText, { color: active ? tabColor : c.textMuted }]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
              {active && (
                <View style={[s.careStatusTabBar, { backgroundColor: tabColor }]} />
              )}
              {!active && tab !== 'stable' && (
                <View style={[s.careStatusTabDot, { backgroundColor: tabColor, opacity: 0.5 }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ============================================================================
// INLINE COMPONENT — Watch Section (items needing attention)
// ============================================================================

function WatchSection({
  items,
  status,
  styles: s,
  colors: c,
}: {
  items: { icon: string; label: string; detail: string; type: 'overdue' | 'vitals' }[];
  status: 'watch' | 'attention';
  styles: any;
  colors: typeof Colors;
}) {
  const borderColor = status === 'attention' ? c.redBorder : c.amberBorder;
  const headerColor = status === 'attention' ? c.redBright : c.amber;

  return (
    <View style={[s.watchSection, { borderColor }]}>
      <Text style={[s.watchSectionHeader, { color: headerColor }]}>
        {status === 'attention' ? 'Needs Attention' : 'Items to Watch'}
      </Text>
      {items.map((item, i) => (
        <View key={i} style={[s.watchRow, i < items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }]}>
          <Text style={s.watchIcon}>{item.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.watchLabel}>{item.label}</Text>
            <Text style={s.watchDetail}>{item.detail}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ============================================================================
// INLINE COMPONENT — Insight banner (amber left border, dismissable)
// ============================================================================

function InsightBanner({
  icon,
  message,
  onDismiss,
  styles: s,
}: {
  icon: string;
  message: string;
  onDismiss: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={s.insightBanner}>
      <Text style={s.insightIcon}>{icon}</Text>
      <Text style={s.insightMessage}>{message}</Text>
      <TouchableOpacity
        onPress={onDismiss}
        style={s.insightDismiss}
        accessibilityLabel="Dismiss insight"
        accessibilityRole="button"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={s.insightDismissText}>{'\u2715'}</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function NowScreen() {
  const { colors } = useTheme();
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
  const { todayAppointments, complete: completeAppointment } = useAppointments();

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
  const [insightDismissed, setInsightDismissed] = useState(false);
  const [lastInsightMsg, setLastInsightMsg] = useState<string | null>(null);

  // Reset dismiss when insight changes
  useEffect(() => {
    if (insight?.message && insight.message !== lastInsightMsg) {
      setInsightDismissed(false);
      setLastInsightMsg(insight.message);
    }
  }, [insight?.message]);

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

  // Status tab state + scroll-to-watch behavior
  const [activeStatusTab, setActiveStatusTab] = useState<'stable' | 'watch' | 'attention'>('stable');
  const watchSectionRef = useRef<View>(null);

  // Sync tab with computed status on data load
  useEffect(() => {
    setActiveStatusTab(careStatus);
  }, [careStatus]);

  const handleStatusTabPress = useCallback((tab: 'stable' | 'watch' | 'attention') => {
    setActiveStatusTab(tab);
    if (tab !== 'stable' && scrollViewRef.current) {
      setTimeout(() => {
        watchSectionRef.current?.measureLayout(
          scrollViewRef.current as any,
          (_, y) => scrollViewRef.current?.scrollTo({ y: y - 16, animated: true }),
          () => {}
        );
      }, 80);
    }
  }, []);

  // Watch items — overdue instances + vitals exceedances
  const watchItems = useMemo(() => {
    const items: { icon: string; label: string; detail: string; type: 'overdue' | 'vitals' }[] = [];

    for (const inst of todayTimeline.overdue) {
      const typeIcon: Record<string, string> = {
        medication: '\uD83D\uDC8A', vitals: '\uD83E\uDE7A', nutrition: '\uD83C\uDF7D\uFE0F',
        wellness: '\uD83E\uDDD8', activity: '\uD83C\uDFC3', sleep: '\uD83D\uDE34',
      };
      items.push({
        icon: typeIcon[inst.itemType] || '\u26A0\uFE0F',
        label: inst.title || inst.itemType,
        detail: `Scheduled ${formatTime(inst.scheduledTime)} \u2014 overdue`,
        type: 'overdue',
      });
    }

    for (const exc of vitalsExceedances) {
      items.push({
        icon: '\uD83E\uDE7A',
        label: exc.type || 'Vitals',
        detail: exc.message || 'Out of expected range',
        type: 'vitals',
      });
    }

    return items;
  }, [todayTimeline.overdue, vitalsExceedances]);

  // Completion percentage for hero card
  const completionPct = useMemo(() => {
    const done = (todayStats.meds?.completed ?? 0) + (todayStats.vitals?.completed ?? 0) +
                 (todayStats.meals?.completed ?? 0) + (todayStats.activity?.completed ?? 0);
    const total = (todayStats.meds?.total ?? 0) + (todayStats.vitals?.total ?? 0) +
                  (todayStats.meals?.total ?? 0) + (todayStats.activity?.total ?? 0);
    return total > 0 ? Math.round((done / total) * 100) : 0;
  }, [todayStats]);

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
        const allDone = completed === total;
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
  const coffeeMoment = useCoffeeMoment(overdueCount, hasLateMedication);

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

    if (careTasksState) {
      const eveningTasks = careTasksState.byWindow['evening'] || [];
      const nightTasks = careTasksState.byWindow['night'] || [];
      for (const task of [...eveningTasks, ...nightTasks]) {
        if (task.status === 'pending') {
          items.push({
            icon: task.emoji || '\u2705',
            text: task.title,
            route: task.primaryAction?.route || '',
          });
        }
      }
    }

    if (brief && !brief.sleep.logged) {
      const pronoun = patientGender?.toLowerCase() === 'male' ? 'he' : patientGender?.toLowerCase() === 'female' ? 'she' : 'they';
      items.push({ icon: '\uD83D\uDE34', text: `Log sleep when ${pronoun} go${pronoun === 'they' ? '' : 'es'} to bed`, route: '/log-sleep' });
    }

    const hasEvening = brief?.mood.eveningWellness != null;
    if (brief && !hasEvening && new Date().getHours() >= 17) {
      items.push({ icon: '\uD83D\uDCCB', text: 'Evening wellness check', route: '/log-evening-wellness' });
    }

    return items;
  }

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <View style={styles.container}>
      <AuroraBackground variant="now" />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
      >
        {/* Header: greeting + date left, patient chip right */}
        <ScreenHeader
          title="Today"
          subtitle={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          purpose="What needs attention today."
          rightAction={
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
                <Text style={styles.patientChipName}>{patientName}</Text>
                {isSampleMode && (
                  <Text style={styles.demoBadge}>DEMO</Text>
                )}
                {patients.length > 1 && (
                  <Text style={{ fontSize: 10, color: colors.textMuted }}>{'\u25BC'}</Text>
                )}
            </TouchableOpacity>
          }
        />
        <PatientSwitcherModal
          visible={showPatientSwitcher}
          onClose={() => setShowPatientSwitcher(false)}
        />

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
        <CoffeeMomentMinimal
          visible={coffeeMoment.showModal}
          onClose={coffeeMoment.closeModal}
          microcopy="Pause for a minute"
          duration={60}
        />

        {/* Onboarding Prompt */}
        {showOnboarding && (
          <OnboardingPrompt
            onShowMeWhatMatters={handlers.handleShowMeWhatMatters}
            onExploreOnMyOwn={handlers.handleExploreOnMyOwn}
          />
        )}

        <View style={styles.content}>

          {/* ═══ INSIGHT BANNER ═══ */}
          {insight && !insightDismissed && (
            <InsightBanner
              icon={insight.icon}
              message={insight.message}
              onDismiss={() => setInsightDismissed(true)}
              styles={styles}
            />
          )}

          {/* ═══ MORNING CONTEXT LINE ═══ */}
          {allPending.length > 0 && (() => {
            const hour = new Date().getHours();
            const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
            const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

            const windowPending = allPending.filter((i: any) => {
              if (timeOfDay === 'morning') return i.windowLabel === 'morning';
              if (timeOfDay === 'afternoon') return i.windowLabel === 'afternoon';
              return i.windowLabel === 'evening' || i.windowLabel === 'night';
            });

            const count = windowPending.length;
            const suffix = count > 0
              ? `${count} item${count === 1 ? '' : 's'} for this ${timeOfDay}.`
              : `You're caught up for the ${timeOfDay}.`;

            return (
              <Text
                style={styles.morningContextLine}
                accessibilityRole="text"
                accessibilityLabel={`${greeting}. ${suffix}`}
              >
                {greeting}. {suffix}
              </Text>
            );
          })()}

          {/* ═══ CARE STATUS BANNER ═══ */}
          <CareStatusBanner
            status={careStatus}
            activeTab={activeStatusTab}
            onTabPress={handleStatusTabPress}
            styles={styles}
            colors={colors}
          />

          {/* ═══ ZONE 1: TODAY'S PROGRESS ═══ */}
          <SectionHeaderRow
            title="Today's Progress"
            action="Care Plan"
            onAction={() => navigate('/care-plan')}
            styles={styles}
          />
          <LinearGradient
            colors={['#061A12', '#0D2A1F', '#071E14']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
            accessibilityLiveRegion="polite"
            accessibilityRole="summary"
          >
            <View style={styles.heroOrb} pointerEvents="none" />
            {/* Big completion number */}
            <View style={styles.heroCompletionRow}>
              <Text style={styles.heroCompletionNumber}>
                {(todayStats.meds?.completed ?? 0) + (todayStats.vitals?.completed ?? 0) +
                 (todayStats.meals?.completed ?? 0) + (todayStats.activity?.completed ?? 0)}
              </Text>
              <Text style={styles.heroCompletionDenom}>
                /{(todayStats.meds?.total ?? 0) + (todayStats.vitals?.total ?? 0) +
                   (todayStats.meals?.total ?? 0) + (todayStats.activity?.total ?? 0)} items
              </Text>
              <View style={styles.heroCompletionPill}>
                <Text style={styles.heroCompletionPct}>{completionPct}%</Text>
              </View>
            </View>
            <ProgressRings
              todayStats={todayStats}
              enabledBuckets={enabledBuckets}
              nextUp={todayTimeline?.nextUp}
              instances={instancesState?.instances || []}
              selectedCategory={selectedCategory}
              onRingPress={handleRingPress}
              onManagePress={() => navigate('/care-plan')}
              patientName={patientName}
            />
          </LinearGradient>

          {/* ═══ WATCH SECTION (scroll target) ═══ */}
          <View ref={watchSectionRef} collapsable={false}>
            {activeStatusTab !== 'stable' && watchItems.length > 0 && (
              <WatchSection items={watchItems} status={activeStatusTab as 'watch' | 'attention'} styles={styles} colors={colors} />
            )}
          </View>

          {/* ═══ ZONE 2: TODAY'S SCHEDULE ═══ */}
          <SectionHeaderRow
            title="Today's Schedule"
            iconAction="+"
            onIconAction={() => setShowQuickAdd(true)}
            collapsed={timelineCollapsed}
            onToggleCollapse={() => setTimelineCollapsed(prev => !prev)}
            styles={styles}
          />

          {timelineCollapsed ? (
            /* Collapsed: window summary rows */
            windowSummary.length > 0 && (
              <View style={styles.sectionCard}>
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
              {/* Morning Meds Banner — batch confirm */}
              <MorningMedsBanner
                pendingCount={allPending.filter((i: any) => i.itemType === 'medication').length}
                pendingInstanceIds={allPending.filter((i: any) => i.itemType === 'medication').map((i: any) => i.id)}
                onConfirmAll={handleBatchMedConfirm}
              />

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

          {/* ═══ ZONE 3: WHAT'S HAPPENED ═══ */}
          {brief && (() => {
            const handoffNotes = buildHandoffNotes();
            if (handoffNotes.length === 0) return null;
            return (
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
            );
          })()}

          {/* ═══ ZONE 5: BEFORE BED ═══ */}
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

          {/* ═══ HANDOFF PROMPT ═══ */}
          <HandoffPromptCard completedCount={todayTimeline.completed.length} />

          {/* ═══ FOOTER ═══ */}
          {/* All-done / encouragement */}
          {hasRegimenInstances &&
            allPending.length === 0 &&
            todayTimeline.completed.length > 0 && (() => {
              const hasMissed = todayTimeline.completed.some(i => i.status === 'missed');
              if (hasMissed) {
                return (
                  <Text
                    style={styles.encouragementText}
                    accessible={true}
                    accessibilityRole="text"
                  >
                    You're doing a great job. Every bit of care matters.
                  </Text>
                );
              }
              return (
                <View
                  style={styles.allDoneMessage}
                  accessible={true}
                  accessibilityRole="text"
                  accessibilityLabel="All caught up! All care plan items are complete for today."
                  accessibilityLiveRegion="polite"
                >
                  <Text style={styles.allDoneEmoji}>🎉</Text>
                  <Text style={styles.allDoneText}>All caught up!</Text>
                </View>
              );
            })()}

          {/* Footer message + coffee link */}
          <View style={styles.footerSection}>
            <Text style={styles.footerMessage}>
              {allPending.length === 0 && todayTimeline.completed.length > 0
                ? 'You showed up today, and that matters.'
                : allPending.length <= 2 && allPending.length > 0
                ? 'Almost there. You\'re doing more than you think.'
                : 'Caregiving is hard. You\'re not behind \u2014 you\'re showing up.'}
            </Text>
            <TouchableOpacity
              onPress={coffeeMoment.startReset}
              style={styles.footerCoffeeLink}
              activeOpacity={0.7}
              accessibilityLabel="Take a 1-minute breathing pause"
              accessibilityRole="button"
            >
              <Text style={styles.footerCoffeeLinkText}>
                {'\u2615'}  Take a 1-minute pause
              </Text>
            </TouchableOpacity>
          </View>

        </View>

        {/* Bottom spacing for tab bar */}
        <View style={{ height: 83 }} />
      </ScrollView>
      </SafeAreaView>

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

      <QuickAddSheet
        visible={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
      />
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
    paddingTop: 16,
  },
  // closureContainer and orientationContainer removed — prompts consolidated into MorningBriefing
  content: {
    paddingHorizontal: 16,
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

  // Patient chip (header uses ScreenHeader)
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
  morningContextLine: {
    fontSize: 14,
    color: c.textSecondary,
    paddingHorizontal: 20,
    paddingBottom: 8,
    lineHeight: 20,
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
    paddingTop: 20,
    paddingBottom: 10,
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

  // ── Care Status Banner ──
  careStatusBanner: {
    borderRadius: 18, borderWidth: 1, borderBottomWidth: 0,
    borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
    padding: 14, flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 12,
  },
  careStatusIcon: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1,
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  careStatusIconText: { fontSize: 16, fontWeight: '700' as const },
  careStatusLabel: { fontSize: 14, fontWeight: '700' as const, marginBottom: 3 },
  careStatusSub: { fontSize: 12, color: c.textSecondary, lineHeight: 18 },
  careStatusTabs: {
    flexDirection: 'row' as const, borderWidth: 1, borderTopWidth: 0,
    borderBottomLeftRadius: 18, borderBottomRightRadius: 18,
    overflow: 'hidden' as const, marginBottom: 14,
    backgroundColor: c.glass,
  },
  careStatusTab: {
    flex: 1, paddingVertical: 9, alignItems: 'center' as const,
    justifyContent: 'center' as const, position: 'relative' as const,
  },
  careStatusTabBorder: {
    borderRightWidth: 1, borderRightColor: c.glassBorder,
  },
  careStatusTabText: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 0.3 },
  careStatusTabBar: {
    position: 'absolute' as const, bottom: 0, left: '20%' as any, right: '20%' as any,
    height: 2, borderRadius: 1,
  },
  careStatusTabDot: {
    width: 5, height: 5, borderRadius: 3, marginTop: 3,
  },

  // ── Watch Section ──
  watchSection: {
    borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 14,
    backgroundColor: c.glass,
  },
  watchSectionHeader: {
    fontSize: 11, fontWeight: '700' as const, letterSpacing: 1,
    textTransform: 'uppercase' as const, marginBottom: 10,
  },
  watchRow: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    gap: 10, paddingVertical: 10,
  },
  watchIcon: { fontSize: 18 },
  watchLabel: { fontSize: 14, fontWeight: '600' as const, color: c.textPrimary },
  watchDetail: { fontSize: 12, color: c.textMuted, marginTop: 2 },

  // ── Hero Completion Row ──
  heroCompletionRow: {
    flexDirection: 'row' as const, alignItems: 'flex-end' as const,
    gap: 4, marginBottom: 16,
  },
  heroCompletionNumber: {
    fontSize: 52, fontWeight: '700' as const, color: c.accent,
    letterSpacing: -2, lineHeight: 52,
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
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.15)',
  },
  heroOrb: {
    position: 'absolute',
    right: -20,
    top: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#34D399',
    opacity: 0.15,
  },

  // ── Section Card wrapper ──
  sectionCard: {
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.glassBorder,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
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
  // Insight banner
  insightBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderLeftWidth: 2,
    borderLeftColor: c.amber ?? '#FBBF24',
    backgroundColor: 'rgba(245,158,11,0.03)',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    padding: 10,
    paddingRight: 32,
    marginBottom: 8,
  },
  insightIcon: {
    fontSize: 14,
  },
  insightMessage: {
    flex: 1,
    fontSize: 12,
    color: c.textSecondary,
    lineHeight: 18,
  },
  insightDismiss: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  insightDismissText: {
    fontSize: 12,
    color: c.textMuted,
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
});
