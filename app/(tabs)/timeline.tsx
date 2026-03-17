// ============================================================================
// TIMELINE TAB - Chronological history + schedule + insights
// Combines: TimelineSection, WhatsHappenedSection, BeforeBedSection,
//           CaregiverZone, Journal brief, compact insight summary
// ============================================================================

import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { navigate } from '../../lib/navigate';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuroraBackground } from '../../components/aurora/AuroraBackground';
import { ScreenHeader } from '../../components/ScreenHeader';

// CarePlan System
import { useCarePlan } from '../../hooks/useCarePlan';
import { useCareTasks } from '../../hooks/useCareTasks';
import { useAppointments } from '../../hooks/useAppointments';
import { useCarePlanConfig } from '../../hooks/useCarePlanConfig';
import { useTodayScope } from '../../hooks/useTodayScope';
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
  type TimeWindow,
  isOverdue,
  getRouteForInstanceType,
  groupByTimeWindow,
  getCurrentTimeWindow,
  TIME_WINDOW_HOURS,
  OVERDUE_GRACE_MINUTES,
} from '../../utils/nowHelpers';

// Extracted components
import { TimelineSection } from '../../components/now/TimelineSection';
import { WhatsHappenedSection } from '../../components/now/WhatsHappenedSection';
import { BeforeBedSection } from '../../components/now/BeforeBedSection';
import { CaregiverZone } from '../../components/now/CaregiverZone';
import { HandoffPromptCard } from '../../components/now/HandoffPromptCard';
import { RoutineSheet } from '../../components/now/RoutineSheet';
import { QuickAddSheet } from '../../components/today/QuickAddSheet';

import { logError } from '../../utils/devLog';
import { useDataListener, emitDataUpdate } from '../../lib/events';
import { EVENT } from '../../lib/eventNames';
import { buildCareBrief, CareBrief } from '../../utils/careSummaryBuilder';
import {
  getTodayWaterLog,
  updateTodayWaterLog,
} from '../../utils/centralStorage';
import { getMedications, getMedicationLogs, Medication } from '../../utils/medicationStorage';
import { useCoffeeMoment } from '../../hooks/useCoffeeMoment';
import { CoffeeMomentMinimal } from '../../components/CoffeeMomentMinimal';
import { generateAllInsights, InsightResults, computePeriodSummary, PeriodSummary, generateSummaryText } from '../../utils/insightEngine';
import { getOrCreateCarePlanConfig } from '../../storage/carePlanConfigRepo';
import { getUpcomingAppointments } from '../../utils/appointmentStorage';

// ============================================================================
// INLINE COMPONENT — Section header row
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
// MAIN COMPONENT
// ============================================================================

export default function TimelineTab() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Track today's date
  const [today, setToday] = useState(() => getTodayDateString());

  // Single source of truth: useCareTasks wraps useDailyCareInstances
  const {
    state: careTasksState,
    instanceState: instancesState,
    completeInstance,
    refresh: refreshCareTasks,
  } = useCareTasks(today);

  // CarePlan hook
  const { carePlan, overrides, refresh: refreshCarePlan } = useCarePlan(today);

  // Appointments hook
  const { todayAppointments } = useAppointments();

  // Bucket-based Care Plan Config hook
  const { hasCarePlan: hasBucketCarePlan, enabledBuckets } = useCarePlanConfig();

  // Today Scope - track hidden items count
  const { suppressedItems, resetToDefaults: restoreAllSuppressed } = useTodayScope(today);

  const hasRegimenInstances = instancesState && instancesState.instances.length > 0;

  const [medications, setMedications] = useState<Medication[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [patientGender, setPatientGender] = useState<string | null>(null);

  // Category filter state (tappable rings)
  const [selectedCategory, setSelectedCategory] = useState<BucketType | null>(null);
  const [activeRoutineWindow, setActiveRoutineWindow] = useState<TimeWindow | null>(null);
  const [timelineCollapsed, setTimelineCollapsed] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  // Water state
  const [waterGlasses, setWaterGlasses] = useState(0);
  const waterGoal = 8;

  // Care brief + insight summary
  const [brief, setBrief] = useState<CareBrief | null>(null);
  const [insightSummary, setInsightSummary] = useState('');

  const handleClearCategory = useCallback(() => {
    setSelectedCategory(null);
  }, []);

  const handleWaterUpdate = useCallback(async (newGlasses: number) => {
    try {
      setWaterGlasses(newGlasses);
      await updateTodayWaterLog(newGlasses);
      emitDataUpdate(EVENT.WATER);
    } catch (error) {
      logError('timeline.handleWaterUpdate', error);
    }
  }, []);

  // ============================================================================
  // COMPUTE STATS
  // ============================================================================
  const todayStats = useMemo((): TodayStats => {
    if (instancesState && instancesState.instances.length > 0 && instancesState.date === today) {
      const getTypeStats = (itemType: string): StatData => {
        const typeInstances = instancesState.instances.filter(i => i.itemType === itemType);
        const completed = typeInstances.filter(i => i.status === 'completed' || i.status === 'skipped').length;
        return { completed, total: typeInstances.length };
      };
      const customStats = getTypeStats('custom');
      return {
        meds: getTypeStats('medication'),
        vitals: getTypeStats('vitals'),
        meals: getTypeStats('nutrition'),
        water: { completed: waterGlasses, total: waterGoal },
        sleep: getTypeStats('sleep'),
        activity: getTypeStats('activity'),
        wellness: getTypeStats('wellness'),
        custom: customStats.total > 0 ? customStats : undefined,
      };
    }
    return {
      meds: { completed: 0, total: 0 },
      vitals: { completed: 0, total: 0 },
      meals: { completed: 0, total: 0 },
    };
  }, [instancesState, today, waterGlasses, waterGoal]);

  // ============================================================================
  // TIMELINE DATA
  // ============================================================================
  const todayTimeline = useMemo(() => {
    if (!instancesState?.instances || instancesState.date !== today) {
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

    const withScores = allInstances.map(instance => ({
      instance,
      priorityScore: instance.status !== 'pending' ? 999 : getPriorityScore(instance),
    }));

    const pendingWithScores = withScores
      .filter(w => w.instance.status === 'pending')
      .sort((a, b) => a.priorityScore - b.priorityScore);

    return {
      overdue: pendingWithScores.filter(w => isOverdue(w.instance.scheduledTime)).map(w => w.instance),
      upcoming: pendingWithScores.filter(w => !isOverdue(w.instance.scheduledTime)).map(w => w.instance),
      completed: allInstances
        .filter(i => i.status === 'completed' || i.status === 'skipped' || i.status === 'missed')
        .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime)),
      nextUp: pendingWithScores[0]?.instance || null,
    };
  }, [instancesState?.instances, instancesState?.date, today]);

  const allPending = useMemo(() => {
    return [...todayTimeline.overdue, ...todayTimeline.upcoming];
  }, [todayTimeline.overdue, todayTimeline.upcoming]);

  // Window summary for collapsed timeline view
  const windowSummary = useMemo(() => {
    if (!instancesState?.instances || instancesState.date !== today) return [];
    const grouped = groupByTimeWindow(instancesState.instances);
    const currentWindow = getCurrentTimeWindow();
    const windows: TimeWindow[] = ['morning', 'afternoon', 'evening', 'night'];
    return windows
      .filter(w => grouped[w].length > 0)
      .map(w => {
        const items = grouped[w];
        const completed = items.filter(i => i.status === 'completed' || i.status === 'skipped').length;
        const pending = items.filter(i => i.status === 'pending').length;
        return {
          window: w,
          label: TIME_WINDOW_HOURS[w].label,
          total: items.length,
          completed,
          pending,
          allDone: pending === 0 && items.length > 0,
          isCurrent: w === currentWindow,
        };
      });
  }, [instancesState?.instances, instancesState?.date, today]);

  // Coffee moment
  const coffeeMoment = useCoffeeMoment(todayTimeline.overdue.length,
    todayTimeline.overdue.some((i: any) => i.itemType === 'medication'), {
    medsTotal: todayStats.meds?.total ?? 0,
    medsDone: todayStats.meds?.completed ?? 0,
    hasVitals: brief?.vitals?.recorded ?? false,
    vitalsImproving: false,
    patientSleepQuality: 'fair',
    upcomingAppointment: null,
  });

  // ============================================================================
  // HANDLERS
  // ============================================================================
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
      navigate({ pathname: '/quick-log', params: { expand: 'pain', instanceId: instance.id, carePlanItemId: instance.carePlanItemId || '', itemName: instance.itemName || '' } });
      return;
    }
    if (instance.itemType === 'wellness') {
      navigate({
        pathname: instance.windowLabel === 'evening' ? '/log-evening-wellness' : '/log-morning-wellness',
        params: { instanceId: instance.id, carePlanItemId: instance.carePlanItemId || '', itemName: instance.itemName || '' },
      });
      return;
    }
    navigate({
      pathname: getRouteForInstanceType(instance.itemType),
      params: { instanceId: instance.id, carePlanItemId: instance.carePlanItemId || '', itemName: instance.itemName || '' },
    });
  }, []);

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
      if (currentDate !== today) setToday(currentDate);
      refreshCareTasks();
      refreshCarePlan();
      loadData();
    }, [today, refreshCareTasks, refreshCarePlan])
  );

  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLoadDone = useRef(0);
  useDataListener(useCallback((category: string) => {
    if (([EVENT.MEDICATION, EVENT.VITALS, EVENT.WATER, EVENT.MOOD, EVENT.WELLNESS,
         EVENT.LOGS, EVENT.CARE_PLAN, EVENT.CARE_PLAN_CONFIG, EVENT.APPOINTMENTS,
         EVENT.DAILY_INSTANCES, EVENT.CARE_PLAN_ITEMS, EVENT.SAMPLE_DATA_CLEARED,
         EVENT.SYMPTOMS, EVENT.NOTES] as string[]).includes(category)) {
      if (['carePlanItems', 'carePlanConfig'].includes(category) && Date.now() - lastLoadDone.current < 2000) return;
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      reloadTimer.current = setTimeout(() => {
        loadData().finally(() => { lastLoadDone.current = Date.now(); });
        refreshCareTasks();
      }, 300);
    }
  }, [refreshCareTasks]));

  const loadData = async () => {
    try {
      const meds = await getMedications();
      setMedications(meds.filter(m => m.active));

      try {
        const waterLog = await getTodayWaterLog();
        setWaterGlasses(waterLog?.glasses ?? 0);
      } catch { setWaterGlasses(0); }

      buildCareBrief().then(data => setBrief(data)).catch(() => {});

      // Load compact insight summary
      try {
        const config = await getOrCreateCarePlanConfig('default');
        const [results, periodSummary] = await Promise.all([
          generateAllInsights(config, 7),
          computePeriodSummary(7),
        ]);
        const appointments = await getUpcomingAppointments();
        const rangeEnd = new Date();
        const rangeStart = new Date();
        rangeStart.setDate(rangeStart.getDate() - 7);
        const upcoming = appointments
          .filter((a: { date: string }) => new Date(a.date) >= rangeStart && new Date(a.date) <= rangeEnd)
          .map((a: { provider?: string; date: string }) => ({ provider: a.provider || 'Appointment', date: a.date }));
        setInsightSummary(generateSummaryText(results, periodSummary, upcoming));
      } catch { setInsightSummary(''); }
    } catch (error) {
      logError('TimelineTab.loadData', error);
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
  const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <View style={styles.container}>
      <AuroraBackground variant="now" />

      <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 8 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        <ScreenHeader title="Timeline" subtitle={`${dayName}, ${dateStr}`} />

        <View style={styles.content}>

          {/* ═══ JOURNAL BRIEF ═══ */}
          {brief && brief.narrative && (
            <View style={styles.briefCard}>
              <Text style={styles.briefLabel}>TODAY'S STORY</Text>
              <Text style={styles.briefText}>{brief.narrative}</Text>
            </View>
          )}

          {/* ═══ HIDDEN ITEMS BANNER ═══ */}
          {suppressedItems.length > 0 && (
            <View style={styles.hiddenBanner}>
              <Text style={styles.hiddenBannerText}>
                {suppressedItems.length} item{suppressedItems.length === 1 ? '' : 's'} hidden for today
              </Text>
              <TouchableOpacity
                onPress={() => {
                  Alert.alert('Restore Hidden Items', 'Show all Care Plan items for today?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Restore All', onPress: async () => { await restoreAllSuppressed(); } },
                  ]);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Restore all hidden items"
              >
                <Text style={styles.hiddenBannerAction}>Restore All</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ═══ TODAY'S SCHEDULE ═══ */}
          <SectionHeaderRow
            title="Today's Schedule"
            action="Care Plan"
            onAction={() => navigate('/care-plan')}
            iconAction="+"
            onIconAction={() => setShowQuickAdd(true)}
            collapsed={timelineCollapsed}
            onToggleCollapse={() => setTimelineCollapsed(prev => !prev)}
            styles={styles}
          />

          {timelineCollapsed ? (
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
                    <Text style={{ fontSize: 14 }}>{'\uD83D\uDCC5'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.scheduleApptTitle}>{appt.provider} — {appt.specialty}</Text>
                      <Text style={styles.scheduleApptTime}>
                        {appt.time ? (() => { const [h, m] = appt.time.split(':'); const hr = parseInt(h, 10); return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`; })() : 'Time TBD'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, color: colors.accent, fontWeight: '500' }}>Prep {'\u203A'}</Text>
                  </TouchableOpacity>
                ))}
                {windowSummary.map((w) => (
                  <View key={w.window} style={[styles.windowRow, w.isCurrent && !w.allDone && styles.windowRowCurrent]}>
                    <View style={[styles.windowDot, { backgroundColor: w.allDone ? colors.green : w.isCurrent ? colors.amber : colors.textDisabled }]} />
                    <Text style={[styles.windowLabel, w.isCurrent && !w.allDone && { color: colors.accent }]}>{w.label.toUpperCase()}</Text>
                    <Text style={styles.windowStatus}>
                      {w.allDone ? 'Complete \u2713' : w.isCurrent ? `${w.pending} remaining` : `${w.total} scheduled`}
                    </Text>
                    {w.isCurrent && !w.allDone && (
                      <TouchableOpacity style={styles.windowStartBtn} onPress={() => setActiveRoutineWindow(w.window)} activeOpacity={0.7} accessibilityLabel={`Start ${w.label} routine`} accessibilityRole="button">
                        <Text style={styles.windowStartText}>Start</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )
          ) : (
            <View style={styles.sectionCard}>
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

              {hasRegimenInstances && allPending.length === 0 && todayTimeline.completed.length === 0 && (
                <View style={styles.emptyTimeline}>
                  <Text style={styles.emptyTimelineText}>No items scheduled for today</Text>
                </View>
              )}
            </View>
          )}

          {/* ═══ WHAT'S HAPPENED ═══ */}
          <View style={{ marginTop: 24 }} />
          {brief && (
            <WhatsHappenedSection brief={brief} SectionHeaderRow={SectionHeaderRow} sectionStyles={styles} />
          )}

          {/* ═══ BEFORE BED ═══ */}
          <View style={{ marginTop: 24 }} />
          {brief && (
            <BeforeBedSection
              brief={brief}
              careTasksState={careTasksState}
              patientGender={patientGender}
              enabledBuckets={enabledBuckets}
              SectionHeaderRow={SectionHeaderRow}
              sectionStyles={styles}
            />
          )}

          {/* ═══ INSIGHT SUMMARY ═══ */}
          {insightSummary ? (
            <View style={styles.insightCard}>
              <Text style={styles.insightLabel}>7-DAY INSIGHTS</Text>
              <Text style={styles.insightText}>{insightSummary}</Text>
              <TouchableOpacity onPress={() => navigate('/insights')} style={styles.insightLink}>
                <Text style={styles.insightLinkText}>See all insights →</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* ═══ CAREGIVER ZONE ═══ */}
          <CaregiverZone
            completedCount={todayTimeline.completed.length}
            skippedCount={suppressedItems.length}
            onPause={coffeeMoment.startReset}
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

        <View style={{ height: 83 }} />
      </ScrollView>
      </View>

      {/* Coffee Moment Modal */}
      {coffeeMoment.showModal && (
        <CoffeeMomentMinimal visible={coffeeMoment.showModal} onClose={coffeeMoment.closeModal} microcopy="Pause for a minute" duration={60} encouragement={coffeeMoment.encouragement} />
      )}

      {/* Routine Sheet */}
      {activeRoutineWindow && (
        <RoutineSheet
          visible={!!activeRoutineWindow}
          window={activeRoutineWindow}
          items={[...allPending, ...todayTimeline.completed].filter(i => i.windowLabel === activeRoutineWindow)}
          onItemPress={handleTimelineItemPress}
          onDismiss={() => setActiveRoutineWindow(null)}
        />
      )}

      {showQuickAdd && (
        <QuickAddSheet visible={showQuickAdd} onClose={() => setShowQuickAdd(false)} />
      )}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: 8 },
  content: { paddingHorizontal: 24, paddingTop: 0 },

  // Section header
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, paddingBottom: 10, minHeight: 44 },
  sectionHeaderTitle: { fontSize: 9, fontWeight: '600', letterSpacing: 2, color: c.textTertiary, textTransform: 'uppercase' },
  sectionHeaderAction: { fontSize: 11, color: c.accent, fontWeight: '500' },
  sectionHeaderIcon: { fontSize: 18, fontWeight: '400', color: c.accent, width: 28, height: 28, lineHeight: 28, textAlign: 'center', borderRadius: 14, backgroundColor: c.accentLight, overflow: 'hidden' },

  // Section card
  sectionCard: { backgroundColor: c.glass, borderWidth: 1, borderColor: c.glassBorder, borderRadius: 20, padding: 18, marginBottom: 14 },

  // Brief card
  briefCard: { backgroundColor: c.glass, borderWidth: 1, borderColor: c.glassBorder, borderRadius: 16, padding: 16, marginBottom: 14, borderLeftWidth: 3, borderLeftColor: c.accent },
  briefLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 2, color: c.textTertiary, textTransform: 'uppercase', marginBottom: 8 },
  briefText: { fontSize: 13, color: c.textPrimary, lineHeight: 20 },

  // Insight card
  insightCard: { backgroundColor: c.glass, borderWidth: 1, borderColor: c.glassBorder, borderRadius: 16, padding: 16, marginTop: 24, marginBottom: 14 },
  insightLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 2, color: c.textTertiary, textTransform: 'uppercase', marginBottom: 8 },
  insightText: { fontSize: 13, color: c.textPrimary, lineHeight: 20 },
  insightLink: { marginTop: 12 },
  insightLinkText: { fontSize: 12, color: c.accent, fontWeight: '500' },

  // Empty timeline
  emptyTimeline: { backgroundColor: c.glass, borderRadius: 8, padding: 20, alignItems: 'center', marginBottom: 8 },
  emptyTimelineText: { fontSize: 14, color: c.textHalf },
  emptyTimelineSubtext: { fontSize: 12, color: c.textDisabled, marginTop: 4 },

  // Hidden banner
  hiddenBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: c.glass, borderRadius: 10, borderWidth: 1, borderColor: c.glassHover },
  hiddenBannerText: { fontSize: 13, color: c.textHalf },
  hiddenBannerAction: { fontSize: 13, color: c.accent, fontWeight: '500' },

  // Encouragement
  encouragementText: { fontSize: 14, color: c.textSecondary, textAlign: 'center', marginTop: 28, marginBottom: 8, paddingHorizontal: 20 },

  // Window rows (collapsed view)
  windowRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 18 },
  windowRowCurrent: { backgroundColor: 'rgba(20, 184, 166, 0.08)', borderRadius: 10, marginHorizontal: -4, paddingHorizontal: 18 },
  windowDot: { width: 8, height: 8, borderRadius: 4 },
  windowLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.8, color: c.textSecondary },
  windowStatus: { flex: 1, fontSize: 13, color: c.textHalf },
  windowStartBtn: { backgroundColor: c.accent, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 6 },
  windowStartText: { fontSize: 13, fontWeight: '600', color: c.textPrimary },

  // Schedule appointment row
  scheduleApptRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 4, backgroundColor: c.purpleFaint, borderRadius: 10, borderWidth: 1, borderColor: c.purpleBorder },
  scheduleApptTitle: { fontSize: 12, fontWeight: '600', color: c.textPrimary },
  scheduleApptTime: { fontSize: 11, color: c.textMuted, marginTop: 1 },
});
