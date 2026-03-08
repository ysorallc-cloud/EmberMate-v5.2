// ============================================================================
// INSIGHTS SERVICE
// Computes adherence, patterns, and statistics from DailyCareInstance + Logs
// Data source: Generated instances and immutable logs - NOT regimen alone
// ============================================================================

import {
  DailyCareInstance,
  LogEntry,
  CarePlanItem,
  TimeWindowLabel,
  AdherenceStats,
  CarePlanItemType,
} from '../types/carePlan';
import { getTodayDateString, toLocalDateString } from './carePlanGenerator';
import {
  listDailyInstancesRange,
  listLogsInRange,
  listCarePlanItems,
  getActiveCarePlan,
  DEFAULT_PATIENT_ID,
} from '../storage/carePlanRepo';

// ============================================================================
// TYPES
// ============================================================================

export interface DateRange {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}

export interface AdherenceByItem {
  itemId: string;
  itemName: string;
  itemType: CarePlanItemType;
  emoji?: string;
  totalInstances: number;
  completedCount: number;
  skippedCount: number;
  missedCount: number;
  partialCount: number;
  adherenceRate: number; // 0-100
  completionRate: number; // Completed only (excludes skipped)
}

export interface AdherenceByWindow {
  windowLabel: TimeWindowLabel;
  displayName: string;
  totalInstances: number;
  completedCount: number;
  missedCount: number;
  adherenceRate: number;
}

export interface DailyBurden {
  date: string;
  totalTasks: number;
  requiredTasks: number;
  recommendedTasks: number;
  optionalTasks: number;
  completedTasks: number;
  burdenScore: number; // 0-100, higher = more burden
}

export interface Streak {
  itemId: string;
  itemName: string;
  currentStreak: number; // Days in a row completed
  longestStreak: number;
  lastCompletedDate: string | null;
  isActive: boolean; // True if streak is ongoing
}

export interface PatternInsight {
  type: 'positive' | 'concern' | 'suggestion';
  category: 'adherence' | 'timing' | 'burden' | 'streak';
  title: string;
  message: string;
  data?: any;
}

export interface InsightsSummary {
  dateRange: DateRange;
  overallAdherence: number;
  adherenceByItem: AdherenceByItem[];
  adherenceByWindow: AdherenceByWindow[];
  dailyBurden: DailyBurden[];
  averageDailyBurden: number;
  streaks: Streak[];
  patterns: PatternInsight[];
  totalInstances: number;
  totalLogs: number;
}

// ============================================================================
// MAIN INSIGHTS FUNCTION
// ============================================================================

/**
 * Generate comprehensive insights for a date range
 * All data is derived from actual instances and logs, NOT regimen definitions
 */
export async function generateInsights(
  dateRange: DateRange,
  patientId: string = DEFAULT_PATIENT_ID
): Promise<InsightsSummary> {
  // Fetch actual data - instances and logs
  const [instances, logs, carePlan] = await Promise.all([
    listDailyInstancesRange(patientId, dateRange.start, dateRange.end),
    listLogsInRange(patientId, dateRange.start, dateRange.end),
    getActiveCarePlan(patientId),
  ]);

  // Get items for metadata (names, types)
  let items: CarePlanItem[] = [];
  if (carePlan) {
    items = await listCarePlanItems(carePlan.id);
  }
  const itemMap = new Map(items.map(i => [i.id, i]));

  // Compute all metrics
  const adherenceByItem = computeAdherenceByItem(instances, itemMap);
  const adherenceByWindow = computeAdherenceByWindow(instances);
  const dailyBurden = computeDailyBurden(instances, itemMap, dateRange);
  const streaks = computeStreaks(instances, itemMap, dateRange);
  const patterns = detectPatterns(adherenceByItem, adherenceByWindow, dailyBurden, streaks);

  // Overall adherence: completed + skipped = "handled" (matches Now/Journal)
  const totalHandled = instances.filter(i => i.status === 'completed' || i.status === 'skipped').length;
  const totalInstances = instances.length;
  const overallAdherence = totalInstances > 0
    ? Math.round((totalHandled / totalInstances) * 100)
    : 0;

  // Average daily burden
  const avgBurden = dailyBurden.length > 0
    ? Math.round(dailyBurden.reduce((sum, d) => sum + d.burdenScore, 0) / dailyBurden.length)
    : 0;

  return {
    dateRange,
    overallAdherence,
    adherenceByItem,
    adherenceByWindow,
    dailyBurden,
    averageDailyBurden: avgBurden,
    streaks,
    patterns,
    totalInstances,
    totalLogs: logs.length,
  };
}

// ============================================================================
// ADHERENCE CALCULATIONS
// ============================================================================

/**
 * Compute adherence statistics per CarePlanItem
 */
function computeAdherenceByItem(
  instances: DailyCareInstance[],
  itemMap: Map<string, CarePlanItem>
): AdherenceByItem[] {
  // Group instances by item
  const byItem = new Map<string, DailyCareInstance[]>();

  for (const instance of instances) {
    const existing = byItem.get(instance.carePlanItemId) || [];
    existing.push(instance);
    byItem.set(instance.carePlanItemId, existing);
  }

  const results: AdherenceByItem[] = [];

  for (const [itemId, itemInstances] of byItem) {
    const item = itemMap.get(itemId);
    const total = itemInstances.length;
    const completed = itemInstances.filter(i => i.status === 'completed').length;
    const skipped = itemInstances.filter(i => i.status === 'skipped').length;
    const missed = itemInstances.filter(i => i.status === 'missed').length;
    const partial = itemInstances.filter(i => i.status === 'partial').length;

    // Adherence = (completed + skipped) / total (skipped is intentional non-adherence)
    // Completion = completed / total
    const adherenceRate = total > 0 ? Math.round(((completed + skipped) / total) * 100) : 0;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    results.push({
      itemId,
      itemName: item?.name || itemInstances[0]?.itemName || 'Unknown',
      itemType: item?.type || itemInstances[0]?.itemType || 'custom',
      emoji: item?.emoji || itemInstances[0]?.itemEmoji,
      totalInstances: total,
      completedCount: completed,
      skippedCount: skipped,
      missedCount: missed,
      partialCount: partial,
      adherenceRate,
      completionRate,
    });
  }

  // Sort by adherence rate (lowest first - these need attention)
  return results.sort((a, b) => a.adherenceRate - b.adherenceRate);
}

/**
 * Compute adherence by time window
 */
function computeAdherenceByWindow(instances: DailyCareInstance[]): AdherenceByWindow[] {
  const windowLabels: TimeWindowLabel[] = ['morning', 'afternoon', 'evening', 'night'];
  const displayNames: Record<TimeWindowLabel, string> = {
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
    night: 'Night',
    custom: 'Custom',
  };

  const results: AdherenceByWindow[] = [];

  for (const label of windowLabels) {
    const windowInstances = instances.filter(i => i.windowLabel === label);
    const total = windowInstances.length;
    const completed = windowInstances.filter(i => i.status === 'completed').length;
    const skipped = windowInstances.filter(i => i.status === 'skipped').length;
    const missed = windowInstances.filter(i => i.status === 'missed').length;

    results.push({
      windowLabel: label,
      displayName: displayNames[label],
      totalInstances: total,
      completedCount: completed,
      missedCount: missed,
      // Adherence = handled (completed + skipped) / total — matches Now/Journal
      adherenceRate: total > 0 ? Math.round(((completed + skipped) / total) * 100) : 0,
    });
  }

  return results;
}

// ============================================================================
// BURDEN CALCULATION
// ============================================================================

/**
 * Compute daily burden (task load)
 */
function computeDailyBurden(
  instances: DailyCareInstance[],
  itemMap: Map<string, CarePlanItem>,
  dateRange: DateRange
): DailyBurden[] {
  // Group instances by date
  const byDate = new Map<string, DailyCareInstance[]>();

  for (const instance of instances) {
    const existing = byDate.get(instance.date) || [];
    existing.push(instance);
    byDate.set(instance.date, existing);
  }

  const results: DailyBurden[] = [];

  // Generate entries for all dates in range
  const start = new Date(dateRange.start);
  const end = new Date(dateRange.end);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = toLocalDateString(d);
    const dayInstances = byDate.get(dateStr) || [];

    let required = 0;
    let recommended = 0;
    let optional = 0;

    for (const instance of dayInstances) {
      const item = itemMap.get(instance.carePlanItemId);
      const priority = item?.priority || instance.priority;

      switch (priority) {
        case 'required':
          required++;
          break;
        case 'recommended':
          recommended++;
          break;
        case 'optional':
          optional++;
          break;
      }
    }

    const total = dayInstances.length;
    const completed = dayInstances.filter(i => i.status === 'completed' || i.status === 'skipped').length;

    // Burden score: weighted by priority (required=3, recommended=2, optional=1)
    // Normalized to 0-100 scale (assuming max 20 tasks/day as high burden)
    const weightedBurden = (required * 3) + (recommended * 2) + (optional * 1);
    const burdenScore = Math.min(100, Math.round((weightedBurden / 30) * 100));

    results.push({
      date: dateStr,
      totalTasks: total,
      requiredTasks: required,
      recommendedTasks: recommended,
      optionalTasks: optional,
      completedTasks: completed,
      burdenScore,
    });
  }

  return results;
}

// ============================================================================
// STREAK CALCULATION
// ============================================================================

/**
 * Compute completion streaks per item
 */
function computeStreaks(
  instances: DailyCareInstance[],
  itemMap: Map<string, CarePlanItem>,
  dateRange: DateRange
): Streak[] {
  // Group instances by item
  const byItem = new Map<string, DailyCareInstance[]>();

  for (const instance of instances) {
    const existing = byItem.get(instance.carePlanItemId) || [];
    existing.push(instance);
    byItem.set(instance.carePlanItemId, existing);
  }

  const results: Streak[] = [];
  const today = getTodayDateString();

  for (const [itemId, itemInstances] of byItem) {
    const item = itemMap.get(itemId);

    // Sort by date
    const sorted = [...itemInstances].sort((a, b) => a.date.localeCompare(b.date));

    // Group by date (multiple instances per day possible)
    const byDate = new Map<string, DailyCareInstance[]>();
    for (const instance of sorted) {
      const existing = byDate.get(instance.date) || [];
      existing.push(instance);
      byDate.set(instance.date, existing);
    }

    // Calculate streaks
    let currentStreak = 0;
    let longestStreak = 0;
    let lastCompletedDate: string | null = null;
    let tempStreak = 0;

    const dates = Array.from(byDate.keys()).sort();

    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      const dayInstances = byDate.get(date) || [];

      // Day is "complete" if all instances for that day are completed
      const allCompleted = dayInstances.every(inst => inst.status === 'completed');

      if (allCompleted && dayInstances.length > 0) {
        tempStreak++;
        lastCompletedDate = date;

        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }

        // Check if this continues to today/yesterday for current streak
        if (date === today || isYesterday(date, today)) {
          currentStreak = tempStreak;
        }
      } else {
        // Streak broken
        tempStreak = 0;
      }
    }

    // If the last completed date is today, the streak is active
    const isActive = lastCompletedDate === today || isYesterday(lastCompletedDate || '', today);

    results.push({
      itemId,
      itemName: item?.name || itemInstances[0]?.itemName || 'Unknown',
      currentStreak: isActive ? currentStreak : 0,
      longestStreak,
      lastCompletedDate,
      isActive,
    });
  }

  // Sort by current streak (highest first)
  return results.sort((a, b) => b.currentStreak - a.currentStreak);
}

/**
 * Check if date1 is yesterday relative to date2
 */
function isYesterday(date1: string, date2: string): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  d2.setDate(d2.getDate() - 1);
  return toLocalDateString(d1) === toLocalDateString(d2);
}

// ============================================================================
// PATTERN DETECTION
// ============================================================================

/**
 * Detect patterns and generate insights
 */
function detectPatterns(
  adherenceByItem: AdherenceByItem[],
  adherenceByWindow: AdherenceByWindow[],
  dailyBurden: DailyBurden[],
  streaks: Streak[]
): PatternInsight[] {
  const patterns: PatternInsight[] = [];

  // Check for items with low adherence
  for (const item of adherenceByItem) {
    if (item.totalInstances >= 5 && item.adherenceRate < 50) {
      patterns.push({
        type: 'concern',
        category: 'adherence',
        title: `${item.itemName} needs attention`,
        message: `Only ${item.adherenceRate}% adherence over the period. Consider adjusting the schedule or checking if this is still needed.`,
        data: { itemId: item.itemId, adherenceRate: item.adherenceRate },
      });
    }
  }

  // Check for problematic time windows
  for (const window of adherenceByWindow) {
    if (window.totalInstances >= 5 && window.adherenceRate < 60) {
      patterns.push({
        type: 'suggestion',
        category: 'timing',
        title: `${window.displayName} tasks often missed`,
        message: `${window.displayName} has ${window.adherenceRate}% completion. Consider rescheduling some tasks to a better time.`,
        data: { windowLabel: window.windowLabel, missedCount: window.missedCount },
      });
    }
  }

  // Check for high burden days
  const highBurdenDays = dailyBurden.filter(d => d.burdenScore >= 70);
  if (highBurdenDays.length >= 3) {
    patterns.push({
      type: 'concern',
      category: 'burden',
      title: 'High daily task load detected',
      message: `${highBurdenDays.length} days had high task burden. Consider spreading tasks across the week or reducing optional items.`,
      data: { highBurdenDays: highBurdenDays.length },
    });
  }

  // Celebrate good streaks
  for (const streak of streaks) {
    if (streak.currentStreak >= 7) {
      patterns.push({
        type: 'positive',
        category: 'streak',
        title: `${streak.currentStreak}-day streak for ${streak.itemName}!`,
        message: `Great consistency! Keep up the good work with ${streak.itemName}.`,
        data: { itemId: streak.itemId, streak: streak.currentStreak },
      });
    }
  }

  // Check for items with excellent adherence
  const excellentItems = adherenceByItem.filter(
    item => item.totalInstances >= 10 && item.adherenceRate >= 90
  );
  if (excellentItems.length > 0) {
    patterns.push({
      type: 'positive',
      category: 'adherence',
      title: 'Excellent adherence',
      message: `${excellentItems.length} item${excellentItems.length > 1 ? 's have' : ' has'} 90%+ adherence. Great job staying consistent!`,
      data: { count: excellentItems.length, items: excellentItems.map(i => i.itemName) },
    });
  }

  // Sort: concerns first, then suggestions, then positive
  const typeOrder = { concern: 0, suggestion: 1, positive: 2 };
  return patterns.sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Get insights for the last 7 days
 */
export async function getWeeklyInsights(
  patientId: string = DEFAULT_PATIENT_ID
): Promise<InsightsSummary> {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 6); // Last 7 days including today

  return generateInsights({
    start: toLocalDateString(start),
    end: toLocalDateString(end),
  }, patientId);
}

/**
 * Get insights for the last 30 days
 */
export async function getMonthlyInsights(
  patientId: string = DEFAULT_PATIENT_ID
): Promise<InsightsSummary> {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29); // Last 30 days including today

  return generateInsights({
    start: toLocalDateString(start),
    end: toLocalDateString(end),
  }, patientId);
}

/**
 * Get adherence for a single item
 */
export async function getItemAdherence(
  itemId: string,
  dateRange: DateRange,
  patientId: string = DEFAULT_PATIENT_ID
): Promise<AdherenceByItem | null> {
  const insights = await generateInsights(dateRange, patientId);
  return insights.adherenceByItem.find(a => a.itemId === itemId) || null;
}

/**
 * Get top concerns (items needing attention)
 */
export async function getTopConcerns(
  patientId: string = DEFAULT_PATIENT_ID,
  limit: number = 3
): Promise<AdherenceByItem[]> {
  const insights = await getWeeklyInsights(patientId);

  // Return items with lowest adherence that have meaningful data
  return insights.adherenceByItem
    .filter(item => item.totalInstances >= 3 && item.adherenceRate < 80)
    .slice(0, limit);
}

/**
 * Get today's completion rate
 */
export async function getTodayCompletionRate(
  patientId: string = DEFAULT_PATIENT_ID
): Promise<{ completed: number; total: number; rate: number }> {
  const today = getTodayDateString();
  const insights = await generateInsights({ start: today, end: today }, patientId);

  const completed = insights.adherenceByItem.reduce((sum, a) => sum + a.completedCount + a.skippedCount, 0);
  const total = insights.totalInstances;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { completed, total, rate };
}
