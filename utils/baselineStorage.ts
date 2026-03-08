// ============================================================================
// BASELINE STORAGE - Simple frequency-based baseline detection
// No ML, no percentages. Just counts and modes.
// ============================================================================

import { safeGetItem, safeSetItem } from './safeStorage';
import { getMealsLogs, MealsLog, getVitalsLogs, VitalsLog } from './centralStorage';
import { getMedications, Medication } from './medicationStorage';
import { logError } from './devLog';
import { getTodayDateString, toLocalDateString } from '../services/carePlanGenerator';
import { StorageKeys } from './storageKeys';

// ============================================================================
// CONSTANTS - Do not overthink these
// ============================================================================

export const MIN_DAYS_FOR_BASELINE = 3;
export const CONFIDENT_BASELINE = 5;

// ============================================================================
// STORAGE KEYS
// ============================================================================

const KEYS = {
  FIRST_USE_DATE: StorageKeys.FIRST_USE_DATE,
  BASELINE_CONFIRMATIONS: StorageKeys.BASELINE_CONFIRMATIONS,
  BASELINE_DISMISSALS: StorageKeys.BASELINE_DISMISSALS,
};

// ============================================================================
// TYPES
// ============================================================================

export type BaselineCategory = 'meals' | 'vitals' | 'meds';

export type ConfidenceLevel = 'none' | 'tentative' | 'confident';

export interface CategoryBaseline {
  category: BaselineCategory;
  dailyCount: number; // Mode of entries per day
  daysOfData: number;
  confidence: ConfidenceLevel;
  confirmed: boolean; // User confirmed this is accurate
  dismissed: boolean; // User dismissed and doesn't want to be asked again
}

export interface TodayVsBaseline {
  category: BaselineCategory;
  baseline: number;
  today: number;
  matchesBaseline: boolean;
  belowBaseline: boolean;
}

export interface BaselineData {
  daysOfData: number;
  meals: CategoryBaseline | null;
  vitals: CategoryBaseline | null;
  meds: CategoryBaseline | null;
  hasAnyBaseline: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate mode (most common value) from an array of numbers
 */
function calculateMode(numbers: number[]): number {
  if (numbers.length === 0) return 0;

  const frequency: { [key: number]: number } = {};
  let maxFreq = 0;
  let mode = numbers[0];

  for (const num of numbers) {
    frequency[num] = (frequency[num] || 0) + 1;
    if (frequency[num] > maxFreq) {
      maxFreq = frequency[num];
      mode = num;
    }
  }

  return mode;
}

/**
 * Get dates for last N days (max 7, min uses MIN_DAYS_FOR_BASELINE)
 */
function getLastNDays(n: number): string[] {
  const days: string[] = [];
  const today = new Date();

  for (let i = 0; i < n; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    days.push(toLocalDateString(date));
  }

  return days;
}

/**
 * Get confidence level based on days of data
 */
function getConfidenceLevel(daysOfData: number): ConfidenceLevel {
  if (daysOfData < MIN_DAYS_FOR_BASELINE) return 'none';
  if (daysOfData < CONFIDENT_BASELINE) return 'tentative';
  return 'confident';
}

/**
 * Get language prefix based on confidence
 */
export function getBaselineLanguage(confidence: ConfidenceLevel): {
  prefix: string;
  adverb: string;
} {
  switch (confidence) {
    case 'tentative':
      return { prefix: 'So far', adverb: 'usually' };
    case 'confident':
      return { prefix: '', adverb: 'typically' };
    default:
      return { prefix: '', adverb: '' };
  }
}

// ============================================================================
// FIRST USE DATE TRACKING
// ============================================================================

export async function getFirstUseDate(): Promise<string | null> {
  try {
    return await safeGetItem<string | null>(KEYS.FIRST_USE_DATE, null);
  } catch (error) {
    logError('baselineStorage.getFirstUseDate', error);
    return null;
  }
}

export async function setFirstUseDate(): Promise<void> {
  try {
    const existing = await getFirstUseDate();
    if (!existing) {
      await safeSetItem(KEYS.FIRST_USE_DATE, new Date().toISOString());
    }
  } catch (error) {
    logError('baselineStorage.setFirstUseDate', error);
  }
}

export async function getDaysOfData(): Promise<number> {
  try {
    const firstUse = await getFirstUseDate();
    if (!firstUse) return 0;

    const daysSince = Math.floor(
      (Date.now() - new Date(firstUse).getTime()) / (1000 * 60 * 60 * 24)
    ) + 1; // +1 to include today

    return daysSince;
  } catch (error) {
    logError('baselineStorage.getDaysOfData', error);
    return 0;
  }
}

// ============================================================================
// BASELINE CALCULATION
// ============================================================================

/**
 * Calculate meals baseline
 * Look at last N days (max 7, min 3), count meals per day, take mode
 */
export async function calculateMealsBaseline(): Promise<CategoryBaseline | null> {
  try {
    const daysOfData = await getDaysOfData();
    if (daysOfData < MIN_DAYS_FOR_BASELINE) return null;

    const lookbackDays = Math.min(daysOfData, 7);
    const dates = getLastNDays(lookbackDays);
    const logs = await getMealsLogs();

    // Count meals per day
    const mealsPerDay: number[] = [];
    for (const date of dates) {
      const dayLogs = logs.filter(log =>
        toLocalDateString(new Date(log.timestamp)) === date
      );
      // Each log can have multiple meals (breakfast, lunch, dinner, snack)
      let totalMeals = 0;
      for (const log of dayLogs) {
        totalMeals += log.meals?.length || 0;
      }
      mealsPerDay.push(totalMeals);
    }

    // Only count days with actual data
    const daysWithData = mealsPerDay.filter(m => m > 0);
    if (daysWithData.length < MIN_DAYS_FOR_BASELINE) return null;

    const dailyCount = calculateMode(daysWithData);
    const confirmations = await getBaselineConfirmations();
    const dismissals = await getBaselineDismissals();

    return {
      category: 'meals',
      dailyCount,
      daysOfData: daysWithData.length,
      confidence: getConfidenceLevel(daysWithData.length),
      confirmed: confirmations.includes('meals'),
      dismissed: dismissals.includes('meals'),
    };
  } catch (error) {
    logError('baselineStorage.calculateMealsBaseline', error);
    return null;
  }
}

/**
 * Calculate vitals baseline
 * Look at last N days, count vitals entries per day, take mode
 */
export async function calculateVitalsBaseline(): Promise<CategoryBaseline | null> {
  try {
    const daysOfData = await getDaysOfData();
    if (daysOfData < MIN_DAYS_FOR_BASELINE) return null;

    const lookbackDays = Math.min(daysOfData, 7);
    const dates = getLastNDays(lookbackDays);
    const logs = await getVitalsLogs();

    // Count vitals per day (count unique vitals logged, not entries)
    const vitalsPerDay: number[] = [];
    for (const date of dates) {
      const dayLogs = logs.filter(log =>
        toLocalDateString(new Date(log.timestamp)) === date
      );
      // Count how many vitals were logged (systolic, diastolic, heartRate, etc.)
      let vitalsCount = 0;
      for (const log of dayLogs) {
        if (log.systolic) vitalsCount++;
        if (log.diastolic) vitalsCount++;
        if (log.heartRate) vitalsCount++;
        if (log.temperature) vitalsCount++;
        if (log.glucose) vitalsCount++;
        if (log.weight) vitalsCount++;
        if (log.oxygen) vitalsCount++;
      }
      vitalsPerDay.push(vitalsCount);
    }

    // Only count days with actual data
    const daysWithData = vitalsPerDay.filter(v => v > 0);
    if (daysWithData.length < MIN_DAYS_FOR_BASELINE) return null;

    const dailyCount = calculateMode(daysWithData);
    const confirmations = await getBaselineConfirmations();
    const dismissals = await getBaselineDismissals();

    return {
      category: 'vitals',
      dailyCount,
      daysOfData: daysWithData.length,
      confidence: getConfidenceLevel(daysWithData.length),
      confirmed: confirmations.includes('vitals'),
      dismissed: dismissals.includes('vitals'),
    };
  } catch (error) {
    logError('baselineStorage.calculateVitalsBaseline', error);
    return null;
  }
}

/**
 * Calculate meds baseline
 * For meds, we count how many were taken per day vs total scheduled
 */
export async function calculateMedsBaseline(): Promise<CategoryBaseline | null> {
  try {
    const daysOfData = await getDaysOfData();
    if (daysOfData < MIN_DAYS_FOR_BASELINE) return null;

    const meds = await getMedications();
    const activeMeds = meds.filter(m => m.active !== false);
    if (activeMeds.length === 0) return null;

    // For meds, baseline is simply the number of scheduled meds
    const dailyCount = activeMeds.length;
    const confirmations = await getBaselineConfirmations();
    const dismissals = await getBaselineDismissals();

    return {
      category: 'meds',
      dailyCount,
      daysOfData,
      confidence: getConfidenceLevel(daysOfData),
      confirmed: confirmations.includes('meds'),
      dismissed: dismissals.includes('meds'),
    };
  } catch (error) {
    logError('baselineStorage.calculateMedsBaseline', error);
    return null;
  }
}

/**
 * Get all baselines
 */
export async function getAllBaselines(): Promise<BaselineData> {
  const [daysOfData, meals, vitals, meds] = await Promise.all([
    getDaysOfData(),
    calculateMealsBaseline(),
    calculateVitalsBaseline(),
    calculateMedsBaseline(),
  ]);

  return {
    daysOfData,
    meals,
    vitals,
    meds,
    hasAnyBaseline: !!(meals || vitals || meds),
  };
}

// ============================================================================
// TODAY VS BASELINE COMPARISON
// ============================================================================

/**
 * Get today's count for a category
 */
export async function getTodayCount(category: BaselineCategory): Promise<number> {
  const today = getTodayDateString();

  switch (category) {
    case 'meals': {
      const logs = await getMealsLogs();
      const todayLogs = logs.filter(log =>
        toLocalDateString(new Date(log.timestamp)) === today
      );
      let totalMeals = 0;
      for (const log of todayLogs) {
        totalMeals += log.meals?.length || 0;
      }
      return totalMeals;
    }
    case 'vitals': {
      const logs = await getVitalsLogs();
      const todayLogs = logs.filter(log =>
        toLocalDateString(new Date(log.timestamp)) === today
      );
      let vitalsCount = 0;
      for (const log of todayLogs) {
        if (log.systolic) vitalsCount++;
        if (log.diastolic) vitalsCount++;
        if (log.heartRate) vitalsCount++;
        if (log.temperature) vitalsCount++;
        if (log.glucose) vitalsCount++;
        if (log.weight) vitalsCount++;
        if (log.oxygen) vitalsCount++;
      }
      return vitalsCount;
    }
    case 'meds': {
      const meds = await getMedications();
      return meds.filter(m => m.active !== false && m.taken).length;
    }
    default:
      return 0;
  }
}

/**
 * Compare today to baseline for a category
 */
export async function compareTodayToBaseline(
  category: BaselineCategory
): Promise<TodayVsBaseline | null> {
  let baseline: CategoryBaseline | null = null;

  switch (category) {
    case 'meals':
      baseline = await calculateMealsBaseline();
      break;
    case 'vitals':
      baseline = await calculateVitalsBaseline();
      break;
    case 'meds':
      baseline = await calculateMedsBaseline();
      break;
  }

  if (!baseline) return null;

  const today = await getTodayCount(category);

  return {
    category,
    baseline: baseline.dailyCount,
    today,
    matchesBaseline: today >= baseline.dailyCount,
    belowBaseline: today < baseline.dailyCount,
  };
}

/**
 * Get all today vs baseline comparisons
 */
export async function getAllTodayVsBaseline(): Promise<TodayVsBaseline[]> {
  const comparisons: TodayVsBaseline[] = [];

  const [meals, vitals, meds] = await Promise.all([
    compareTodayToBaseline('meals'),
    compareTodayToBaseline('vitals'),
    compareTodayToBaseline('meds'),
  ]);

  if (meals) comparisons.push(meals);
  if (vitals) comparisons.push(vitals);
  if (meds) comparisons.push(meds);

  return comparisons;
}

// ============================================================================
// BASELINE CONFIRMATION
// ============================================================================

async function getBaselineConfirmations(): Promise<BaselineCategory[]> {
  try {
    return await safeGetItem<BaselineCategory[]>(KEYS.BASELINE_CONFIRMATIONS, []);
  } catch (error) {
    return [];
  }
}

async function getBaselineDismissals(): Promise<BaselineCategory[]> {
  try {
    return await safeGetItem<BaselineCategory[]>(KEYS.BASELINE_DISMISSALS, []);
  } catch (error) {
    return [];
  }
}

/**
 * Confirm a baseline is accurate - locks it in
 */
export async function confirmBaseline(category: BaselineCategory): Promise<void> {
  try {
    const confirmations = await getBaselineConfirmations();
    if (!confirmations.includes(category)) {
      confirmations.push(category);
      await safeSetItem(KEYS.BASELINE_CONFIRMATIONS, confirmations);
    }
  } catch (error) {
    logError('baselineStorage.confirmBaseline', error);
  }
}

/**
 * Mark baseline as not accurate - allows it to keep adapting
 */
export async function rejectBaseline(category: BaselineCategory): Promise<void> {
  try {
    // Remove from confirmations if present
    const confirmations = await getBaselineConfirmations();
    const filtered = confirmations.filter(c => c !== category);
    await safeSetItem(KEYS.BASELINE_CONFIRMATIONS, filtered);
  } catch (error) {
    logError('baselineStorage.rejectBaseline', error);
  }
}

/**
 * Dismiss baseline prompt - never ask again for this category
 */
export async function dismissBaselinePrompt(category: BaselineCategory): Promise<void> {
  try {
    const dismissals = await getBaselineDismissals();
    if (!dismissals.includes(category)) {
      dismissals.push(category);
      await safeSetItem(KEYS.BASELINE_DISMISSALS, dismissals);
    }
  } catch (error) {
    logError('baselineStorage.dismissBaselinePrompt', error);
  }
}

/**
 * Check if we should show a baseline confirmation prompt
 */
export async function shouldShowBaselinePrompt(
  category: BaselineCategory
): Promise<boolean> {
  const dismissals = await getBaselineDismissals();
  if (dismissals.includes(category)) return false;

  const confirmations = await getBaselineConfirmations();
  if (confirmations.includes(category)) return false;

  let baseline: CategoryBaseline | null = null;
  switch (category) {
    case 'meals':
      baseline = await calculateMealsBaseline();
      break;
    case 'vitals':
      baseline = await calculateVitalsBaseline();
      break;
    case 'meds':
      baseline = await calculateMedsBaseline();
      break;
  }

  // Only show prompt if baseline exists and confidence >= 3 days
  return baseline !== null && baseline.daysOfData >= MIN_DAYS_FOR_BASELINE;
}

/**
 * Get the first category that needs baseline confirmation
 */
export async function getNextBaselineToConfirm(): Promise<{
  category: BaselineCategory;
  baseline: CategoryBaseline;
} | null> {
  const categories: BaselineCategory[] = ['meals', 'vitals', 'meds'];

  for (const category of categories) {
    const shouldShow = await shouldShowBaselinePrompt(category);
    if (shouldShow) {
      let baseline: CategoryBaseline | null = null;
      switch (category) {
        case 'meals':
          baseline = await calculateMealsBaseline();
          break;
        case 'vitals':
          baseline = await calculateVitalsBaseline();
          break;
        case 'meds':
          baseline = await calculateMedsBaseline();
          break;
      }
      if (baseline) {
        return { category, baseline };
      }
    }
  }

  return null;
}
