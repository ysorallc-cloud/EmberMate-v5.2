// ============================================================================
// UNDERSTAND INSIGHTS
// Aggregates insights from multiple sources for the Understand page
// Transforms analytics into human-readable, interpretive insights
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeGetItem, safeSetItem } from './safeStorage';
import { detectCorrelations, DetectedPattern, hasSufficientData } from './correlationDetector';
import { getAllInsights, InsightData } from './insightEngine';
import { logError } from './devLog';
import { getTodayDateString, toLocalDateString } from '../services/carePlanGenerator';

import { getDailyTrackingLogs } from './dailyTrackingStorage';
import { getAllBaselines } from './baselineStorage';
import { listLogsInRange, listCarePlanItems, getActiveCarePlan, DEFAULT_PATIENT_ID } from '../storage/carePlanRepo';
import { LogEntry, CarePlanItem, CarePlanItemType } from '../types/carePlan';

// ============================================================================
// TYPES
// ============================================================================

export type TimeRange = 7 | 14 | 30;

export type ConfidenceLevel = 'strong' | 'emerging' | 'early';

export interface StandOutInsight {
  id: string;
  text: string; // Human-readable, one sentence
  confidence: ConfidenceLevel;
  relatedTo?: 'now' | 'record' | 'care-plan';
  linkRoute?: string;
  linkLabel?: string;
}

export interface PositiveObservation {
  id: string;
  text: string; // Human-readable, one sentence
}

export interface CorrelationCard {
  id: string;
  title: string;
  insight: string;
  confidence: ConfidenceLevel;
  dataPoints: number;
  coefficient: number;
  suggestion?: string; // "You Could Try" text
  suggestionDismissed?: boolean;
}

export interface TimeRangeFraming {
  label: string;
  subtitle: string;
  description: string;
}

export interface UnderstandPageData {
  timeRange: TimeRange;
  framing: TimeRangeFraming;
  standOutInsights: StandOutInsight[];
  positiveObservations: PositiveObservation[];
  correlationCards: CorrelationCard[];
  hasEnoughData: boolean;
  daysOfData: number;
  adherenceRate: number;       // Period-based med adherence %
  dosesLogged: number;         // completedCount for the period
  dosesScheduled: number;      // completedCount + skippedCount for the period
  avgMealsPerDay: number;
  avgHydrationPerDay: number;
  avgSleepHours: number;
  avgWellnessPerDay: number;
  lunchSkipRate: number;
  isSampleData?: boolean;
  sampleDataPreviouslySeen?: boolean; // True if preview was dismissed before
  showConfidenceExplanation?: boolean; // True if one-time explanation should show
}

const SUGGESTION_DISMISSALS_KEY = '@understand_suggestion_dismissals';
const SAMPLE_DATA_DISMISSED_KEY = '@understand_sample_dismissed';
const SAMPLE_DATA_SEEN_KEY = '@understand_sample_seen'; // Tracks if preview was ever shown
const CONFIDENCE_EXPLAINED_KEY = '@understand_confidence_explained'; // One-time explanation

// ============================================================================
// SAMPLE DATA - Shows value immediately for new users
// ============================================================================

const SAMPLE_STAND_OUT_INSIGHTS: StandOutInsight[] = [
  {
    id: 'sample-sleep-mood',
    text: 'Mood tends to be better on days after 7+ hours of sleep.',
    confidence: 'strong',
    relatedTo: 'record',
  },
  {
    id: 'sample-hydration-fatigue',
    text: 'Fatigue levels are higher on days with less water intake.',
    confidence: 'emerging',
    relatedTo: 'record',
  },
  {
    id: 'sample-med-timing',
    text: 'Morning medications are taken more consistently than evening doses.',
    confidence: 'emerging',
    relatedTo: 'care-plan',
  },
];

const SAMPLE_POSITIVE_OBSERVATIONS: PositiveObservation[] = [
  {
    id: 'sample-med-adherence',
    text: 'Medication adherence has been excellent this week.',
  },
  {
    id: 'sample-hydration',
    text: 'Hydration targets are being met most days.',
  },
  {
    id: 'sample-no-alerts',
    text: 'No concerning patterns detected recently.',
  },
];

const SAMPLE_CORRELATION_CARDS: CorrelationCard[] = [
  {
    id: 'sample-sleep-mood-card',
    title: 'Sleep & Mood',
    insight: 'Better sleep quality appears to correlate with improved mood the following day. This pattern has been consistent over the past two weeks.',
    confidence: 'strong',
    dataPoints: 14,
    coefficient: 0.72,
    suggestion: 'If approved by your care team, you could try aiming for consistent bedtimes for one week and note any mood changes.',
    suggestionDismissed: false,
  },
  {
    id: 'sample-hydration-energy-card',
    title: 'Hydration & Energy',
    insight: 'Days with higher water intake tend to show better energy levels. The connection appears moderate but consistent.',
    confidence: 'emerging',
    dataPoints: 10,
    coefficient: -0.45,
    suggestion: 'If approved by your care team, you could try tracking water intake more closely when fatigue is high.',
    suggestionDismissed: false,
  },
];

async function getSampleData(timeRange: TimeRange): Promise<UnderstandPageData> {
  const previouslySeen = await hasSampleDataBeenSeen();
  // Mark as seen now (for next time)
  await markSampleDataSeen();

  return {
    timeRange,
    framing: getTimeRangeFraming(timeRange),
    standOutInsights: SAMPLE_STAND_OUT_INSIGHTS,
    positiveObservations: SAMPLE_POSITIVE_OBSERVATIONS,
    correlationCards: SAMPLE_CORRELATION_CARDS,
    hasEnoughData: false,
    daysOfData: 0,
    adherenceRate: 0,
    dosesLogged: 0,
    dosesScheduled: 0,
    avgMealsPerDay: 0,
    avgHydrationPerDay: 0,
    avgSleepHours: 0,
    avgWellnessPerDay: 0,
    lunchSkipRate: 0,
    isSampleData: true,
    sampleDataPreviouslySeen: previouslySeen,
  };
}

// ============================================================================
// TIME RANGE FRAMING
// ============================================================================

export function getTimeRangeFraming(range: TimeRange): TimeRangeFraming {
  switch (range) {
    case 7:
      return {
        label: 'Last 7 days',
        subtitle: "What's changed recently",
        description: 'Recent shifts in patterns and behaviors',
      };
    case 14:
      return {
        label: 'Last 14 days',
        subtitle: "What's stabilizing",
        description: 'Patterns that are starting to settle',
      };
    case 30:
      return {
        label: 'Last 30 days',
        subtitle: "What's becoming consistent",
        description: 'Established patterns and trends',
      };
  }
}

// ============================================================================
// CONFIDENCE CALCULATION
// ============================================================================

function calculateConfidence(dataPoints: number, daysOfData: number): ConfidenceLevel {
  // Strong: 20+ data points with multiple signals
  if (dataPoints >= 20 && daysOfData >= 20) return 'strong';
  // Emerging: 10-19 data points
  if (dataPoints >= 10 && daysOfData >= 10) return 'emerging';
  // Early: borderline data
  return 'early';
}

function correlationConfidenceToLevel(confidence: 'low' | 'moderate' | 'high'): ConfidenceLevel {
  switch (confidence) {
    case 'high': return 'strong';
    case 'moderate': return 'emerging';
    case 'low': return 'early';
  }
}

// ============================================================================
// STAND OUT INSIGHTS GENERATION
// ============================================================================

async function generateStandOutInsights(
  correlations: DetectedPattern[],
  engineInsights: InsightData[],
  timeRange: TimeRange,
  daysOfData: number
): Promise<StandOutInsight[]> {
  const insights: StandOutInsight[] = [];

  // Convert correlation patterns to stand-out insights
  for (const pattern of correlations.slice(0, 2)) {
    const text = generateHumanReadableCorrelation(pattern, timeRange);
    insights.push({
      id: `correlation-${pattern.id}`,
      text,
      confidence: correlationConfidenceToLevel(pattern.confidence),
      relatedTo: 'record',
    });
  }

  // Add engine insights if they're meaningful
  for (const insight of engineInsights.slice(0, 1)) {
    const text = generateHumanReadableEngineInsight(insight, timeRange, daysOfData);
    if (text) {
      insights.push({
        id: `engine-${insight.id}`,
        text,
        confidence: insight.severity === 'alert' ? 'strong' : 'emerging',
        relatedTo: insight.type === 'medication' ? 'care-plan' : 'record',
      });
    }
  }

  // Return top 3
  return insights.slice(0, 3);
}

function generateHumanReadableCorrelation(pattern: DetectedPattern, timeRange: TimeRange): string {
  const { variable1, variable2, coefficient } = pattern;

  // Map variable names to human-readable terms
  const varNames: Record<string, string> = {
    pain: 'pain levels',
    fatigue: 'fatigue',
    nausea: 'nausea',
    hydration: 'hydration',
    mood: 'mood',
    sleep: 'sleep',
    medicationAdherence: 'medication timing',
    systolic: 'blood pressure',
    heartRate: 'heart rate',
  };

  const v1 = varNames[variable1] || variable1;
  const v2 = varNames[variable2] || variable2;

  // Generate insight based on correlation direction
  if (coefficient > 0.5) {
    return `${capitalize(v1)} tends to be higher when ${v2} is higher.`;
  } else if (coefficient < -0.5) {
    return `${capitalize(v1)} tends to spike on low ${v2} days.`;
  } else if (coefficient > 0.3) {
    return `${capitalize(v1)} may be associated with ${v2}.`;
  } else if (coefficient < -0.3) {
    return `${capitalize(v1)} often increases when ${v2} decreases.`;
  }

  return `${capitalize(v1)} and ${v2} show a possible connection.`;
}

function generateHumanReadableEngineInsight(insight: InsightData, timeRange: TimeRange, daysOfData: number = 0): string | null {
  const { id, specificData, context } = insight;

  switch (id) {
    case 'medication-adherence':
      if (specificData.percentage && specificData.percentage < 80) {
        // Require sufficient history before saying "more often than usual"
        if (daysOfData >= 7) {
          const pattern = insight.pattern;
          if (pattern) {
            return `${pattern.replace('Most missed on ', 'Evening medications are missed more often than morning doses.')}`;
          }
          return `Medication doses are being missed more often than usual.`;
        }
        // With limited data, use softer baseline-building text
        return `Medication adherence is at ${Math.round(specificData.percentage)}% \u2014 keep tracking to establish a baseline.`;
      }
      return null;

    case 'blood-pressure-elevated':
      return `Blood pressure is running higher than target this ${timeRange === 7 ? 'week' : 'period'}.`;

    case 'mood-pattern-low':
      return `Mood has been lower on more days than usual recently.`;

    case 'sleep-mood-correlation':
      return `Lower sleep nights often lead to harder days.`;

    case 'hydration-low':
      return `Water intake has been below target.`;

    default:
      return null;
  }
}

// ============================================================================
// POSITIVE OBSERVATIONS GENERATION
// ============================================================================

async function generatePositiveObservations(
  correlations: DetectedPattern[],
  engineInsights: InsightData[],
  timeRange: TimeRange,
  carePlanStats: CarePlanStats
): Promise<PositiveObservation[]> {
  const observations: PositiveObservation[] = [];

  try {
    // Check medication adherence using carePlanStats (same source as stand-out insights)
    if (carePlanStats.medicationLogs > 0 && carePlanStats.adherenceRate >= 90) {
      observations.push({
        id: 'med-adherence-good',
        text: 'Medication adherence has been excellent.',
      });
    } else if (carePlanStats.medicationLogs > 0 && carePlanStats.adherenceRate >= 80) {
      observations.push({
        id: 'med-adherence-improving',
        text: 'Medication timing is staying consistent.',
      });
    }

    // Check hydration (positive if meeting target)
    const endDate = getTodayDateString();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeRange);
    const startDateStr = toLocalDateString(startDate);

    const tracking = await getDailyTrackingLogs(startDateStr, endDate);
    const waterLogs = tracking.filter(t => t.hydration !== null && t.hydration !== undefined);

    if (waterLogs.length >= 3) {
      const avgWater = waterLogs.reduce((sum, t) => sum + (t.hydration || 0), 0) / waterLogs.length;
      if (avgWater >= 7) {
        observations.push({
          id: 'hydration-good',
          text: 'Hydration has stayed on track most days.',
        });
      }
    }

    // Check for no alerts/warnings in engine insights
    const hasAlerts = engineInsights.some(i => i.severity === 'alert');
    const hasWarnings = engineInsights.some(i => i.severity === 'warning');

    if (!hasAlerts && !hasWarnings && engineInsights.length > 0) {
      observations.push({
        id: 'no-red-flags',
        text: 'No red flags detected recently.',
      });
    } else if (!hasAlerts) {
      observations.push({
        id: 'no-critical',
        text: 'Nothing critical flagged this period.',
      });
    }

    // Check mood stability
    const moodLogs = tracking.filter(t => t.mood !== null && t.mood !== undefined);
    if (moodLogs.length >= 5) {
      const avgMood = moodLogs.reduce((sum, t) => sum + (t.mood || 0), 0) / moodLogs.length;
      if (avgMood >= 6) {
        observations.push({
          id: 'mood-stable',
          text: 'Mood has been generally positive.',
        });
      }
    }

    // Return top 3 positive observations
    return observations.slice(0, 3);
  } catch (error) {
    logError('understandInsights.generatePositiveObservations', error);
    return [{
      id: 'default-positive',
      text: 'Keep tracking to build a clearer picture.',
    }];
  }
}

// ============================================================================
// CORRELATION CARDS WITH SUGGESTIONS
// ============================================================================

async function generateCorrelationCards(
  correlations: DetectedPattern[],
  timeRange: TimeRange
): Promise<CorrelationCard[]> {
  const dismissals = await getSuggestionDismissals();

  return correlations.map(pattern => {
    const suggestion = generateSuggestion(pattern);
    const dismissalKey = `suggestion-${pattern.id}`;

    return {
      id: pattern.id,
      title: generateCorrelationTitle(pattern),
      insight: pattern.insight,
      confidence: correlationConfidenceToLevel(pattern.confidence),
      dataPoints: pattern.dataPoints,
      coefficient: pattern.coefficient,
      suggestion: suggestion,
      suggestionDismissed: dismissals[dismissalKey] === true,
    };
  });
}

function generateCorrelationTitle(pattern: DetectedPattern): string {
  const { variable1, variable2 } = pattern;

  const titleParts: Record<string, string> = {
    pain: 'Pain',
    fatigue: 'Fatigue',
    hydration: 'Hydration',
    mood: 'Mood',
    sleep: 'Sleep',
    medicationAdherence: 'Medications',
    systolic: 'Blood Pressure',
    heartRate: 'Heart Rate',
  };

  const v1 = titleParts[variable1] || variable1;
  const v2 = titleParts[variable2] || variable2;

  return `${v1} & ${v2}`;
}

function generateSuggestion(pattern: DetectedPattern): string | undefined {
  const { variable1, variable2, coefficient } = pattern;

  // Only generate suggestions for moderate-high confidence patterns
  if (pattern.confidence === 'low') return undefined;

  // Pain-hydration correlation
  if ((variable1 === 'pain' && variable2 === 'hydration') ||
      (variable1 === 'hydration' && variable2 === 'pain')) {
    if (coefficient < -0.3) {
      return 'If approved by your care team, you could try increasing water intake on high-pain days and observe if it helps.';
    }
  }

  // Sleep-mood correlation
  if ((variable1 === 'sleep' && variable2 === 'mood') ||
      (variable1 === 'mood' && variable2 === 'sleep')) {
    if (coefficient > 0.3) {
      return 'If approved by your care team, you could try aiming for consistent bedtimes for one week and note any mood changes.';
    }
  }

  // Medication-mood correlation
  if ((variable1 === 'medicationAdherence' && variable2 === 'mood') ||
      (variable1 === 'mood' && variable2 === 'medicationAdherence')) {
    if (coefficient > 0.3) {
      return 'If approved by your care team, you could try setting medication reminders earlier in the day and observe energy levels.';
    }
  }

  // Fatigue-hydration correlation
  if ((variable1 === 'fatigue' && variable2 === 'hydration') ||
      (variable1 === 'hydration' && variable2 === 'fatigue')) {
    if (coefficient < -0.3) {
      return 'If approved by your care team, you could try tracking water intake more closely when fatigue is high.';
    }
  }

  // Generic suggestion for other patterns (already filtered out low confidence above)
  if (Math.abs(coefficient) > 0.4) {
    return `Consider discussing this pattern with your care team at your next visit.`;
  }

  return undefined;
}

// ============================================================================
// SUGGESTION DISMISSAL MANAGEMENT
// ============================================================================

async function getSuggestionDismissals(): Promise<Record<string, boolean>> {
  try {
    const data = await safeGetItem<Record<string, boolean>>(SUGGESTION_DISMISSALS_KEY, {});
    return data;
  } catch {
    return {};
  }
}

export async function dismissSuggestion(suggestionId: string): Promise<void> {
  try {
    const dismissals = await getSuggestionDismissals();
    dismissals[suggestionId] = true;
    await safeSetItem(SUGGESTION_DISMISSALS_KEY, dismissals);
  } catch (error) {
    logError('understandInsights.dismissSuggestion', error);
  }
}

// ============================================================================
// CARE PLAN DATA HELPERS
// ============================================================================

interface CarePlanStats {
  totalLogs: number;
  medicationLogs: number;
  vitalsLogs: number;
  moodLogs: number;
  mealLogs: number;
  completedCount: number;
  skippedCount: number;
  adherenceRate: number;
  uniqueDays: number;
  carePlanItems: CarePlanItem[];
  avgMealsPerDay: number;
  avgHydrationPerDay: number;
  avgSleepHours: number;
  avgWellnessPerDay: number;
  lunchSkipRate: number;
}

async function getCarePlanStatsForRange(timeRange: TimeRange): Promise<CarePlanStats> {
  const endDate = getTodayDateString();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeRange);
  const startDateStr = toLocalDateString(startDate);

  try {
    // Get Care Plan logs
    const logs = await listLogsInRange(DEFAULT_PATIENT_ID, startDateStr, endDate);

    // Get Care Plan items to understand types
    const carePlan = await getActiveCarePlan(DEFAULT_PATIENT_ID);
    const items = carePlan ? await listCarePlanItems(carePlan.id) : [];
    const itemTypeMap = new Map<string, CarePlanItemType>();
    items.forEach(item => itemTypeMap.set(item.id, item.type));

    // Categorize logs by type
    let medicationLogs = 0;
    let vitalsLogs = 0;
    let moodLogs = 0;
    let mealLogs = 0;
    let completedCount = 0;
    let skippedCount = 0;
    const uniqueDays = new Set<string>();

    // Category tracking for averages
    const mealsPerDay: Record<string, number> = {};
    const hydrationPerDay: Record<string, number> = {};
    const sleepPerDay: Record<string, number> = {};
    const wellnessPerDay: Record<string, number> = {};
    let lunchCount = 0;
    let lunchSkipped = 0;

    for (const log of logs) {
      uniqueDays.add(log.date);
      const itemType = log.carePlanItemId ? itemTypeMap.get(log.carePlanItemId) : undefined;

      if (log.outcome === 'taken' || log.outcome === 'completed') {
        completedCount++;
      } else if (log.outcome === 'skipped') {
        skippedCount++;
      }

      switch (itemType) {
        case 'medication':
          medicationLogs++;
          break;
        case 'vitals':
          vitalsLogs++;
          break;
        case 'mood':
          moodLogs++;
          wellnessPerDay[log.date] = (wellnessPerDay[log.date] || 0) + 1;
          break;
        case 'nutrition': {
          mealLogs++;
          mealsPerDay[log.date] = (mealsPerDay[log.date] || 0) + 1;
          const data = log.data as any;
          if (data?.mealType === 'lunch') {
            lunchCount++;
            if (log.outcome === 'skipped') lunchSkipped++;
          }
          if (data?.type === 'hydration' && typeof data?.glasses === 'number') {
            hydrationPerDay[log.date] = (hydrationPerDay[log.date] || 0) + data.glasses;
          }
          if (data?.type === 'sleep' && typeof data?.hours === 'number') {
            sleepPerDay[log.date] = data.hours;
          }
          break;
        }
      }

      // Also check log data directly for hydration/sleep items not typed as nutrition
      const logData = log.data as any;
      if (logData?.type === 'hydration' && typeof logData?.glasses === 'number' && itemType !== 'nutrition') {
        hydrationPerDay[log.date] = (hydrationPerDay[log.date] || 0) + logData.glasses;
      }
      if (logData?.type === 'sleep' && typeof logData?.hours === 'number' && itemType !== 'nutrition') {
        sleepPerDay[log.date] = logData.hours;
      }
    }

    // Adherence = handled (completed + skipped) / total logs — matches Now/Journal
    const handled = completedCount + skippedCount;
    const adherenceRate = logs.length > 0 ? (handled / logs.length) * 100 : 0;

    const mealDays = Object.values(mealsPerDay);
    const hydrationDays = Object.values(hydrationPerDay);
    const sleepDays = Object.values(sleepPerDay);
    const wellnessDays = Object.values(wellnessPerDay);

    return {
      totalLogs: logs.length,
      medicationLogs,
      vitalsLogs,
      moodLogs,
      mealLogs,
      completedCount,
      skippedCount,
      adherenceRate,
      uniqueDays: uniqueDays.size,
      carePlanItems: items,
      avgMealsPerDay: mealDays.length > 0 ? mealDays.reduce((a, b) => a + b, 0) / mealDays.length : 0,
      avgHydrationPerDay: hydrationDays.length > 0 ? hydrationDays.reduce((a, b) => a + b, 0) / hydrationDays.length : 0,
      avgSleepHours: sleepDays.length > 0 ? sleepDays.reduce((a, b) => a + b, 0) / sleepDays.length : 0,
      avgWellnessPerDay: wellnessDays.length > 0 ? wellnessDays.reduce((a, b) => a + b, 0) / wellnessDays.length : 0,
      lunchSkipRate: lunchCount > 0 ? lunchSkipped / lunchCount : 0,
    };
  } catch (error) {
    logError('understandInsights.getCarePlanStatsForRange', error);
    return {
      totalLogs: 0,
      medicationLogs: 0,
      vitalsLogs: 0,
      moodLogs: 0,
      mealLogs: 0,
      completedCount: 0,
      skippedCount: 0,
      adherenceRate: 0,
      uniqueDays: 0,
      carePlanItems: [],
      avgMealsPerDay: 0,
      avgHydrationPerDay: 0,
      avgSleepHours: 0,
      avgWellnessPerDay: 0,
      lunchSkipRate: 0,
    };
  }
}

function generateCarePlanInsights(stats: CarePlanStats, timeRange: TimeRange): StandOutInsight[] {
  // Require 3+ days for percentage claims
  if (stats.uniqueDays < 3) {
    return stats.totalLogs > 0
      ? [{
          id: 'careplan-building',
          text: 'Keep tracking \u2014 patterns emerge after a few days.',
          confidence: 'early' as ConfidenceLevel,
        }]
      : [];
  }

  const insights: StandOutInsight[] = [];

  // Medication adherence insight
  if (stats.medicationLogs > 0) {
    if (stats.adherenceRate >= 90) {
      insights.push({
        id: 'careplan-med-excellent',
        text: `Medication tracking has been ${Math.round(stats.adherenceRate)}% consistent over the last ${timeRange} days.`,
        confidence: 'strong',
        relatedTo: 'care-plan',
      });
    } else if (stats.adherenceRate >= 70) {
      insights.push({
        id: 'careplan-med-good',
        text: `Medications are being logged consistently (${Math.round(stats.adherenceRate)}% of the time).`,
        confidence: 'emerging',
        relatedTo: 'care-plan',
      });
    } else if (stats.adherenceRate > 0) {
      insights.push({
        id: 'careplan-med-improving',
        text: 'Medication logging is building up. Keep tracking for clearer patterns.',
        confidence: 'early',
        relatedTo: 'care-plan',
      });
    }
  }

  // Mood tracking insight
  if (stats.moodLogs >= 3) {
    insights.push({
      id: 'careplan-mood',
      text: `Mood has been tracked ${stats.moodLogs} times in the last ${timeRange} days.`,
      confidence: stats.moodLogs >= 7 ? 'emerging' : 'early',
      relatedTo: 'record',
    });
  }

  // Vitals tracking insight
  if (stats.vitalsLogs >= 3) {
    insights.push({
      id: 'careplan-vitals',
      text: `Vitals have been logged ${stats.vitalsLogs} times — building a health baseline.`,
      confidence: stats.vitalsLogs >= 7 ? 'emerging' : 'early',
      relatedTo: 'record',
    });
  }

  // Overall consistency insight
  if (stats.uniqueDays >= timeRange * 0.5) {
    insights.push({
      id: 'careplan-consistency',
      text: `Tracking happened on ${stats.uniqueDays} of the last ${timeRange} days — great consistency.`,
      confidence: 'strong',
      relatedTo: 'care-plan',
    });
  }

  return insights.slice(0, 3);
}

function generateCarePlanPositives(stats: CarePlanStats, timeRange: TimeRange): PositiveObservation[] {
  const observations: PositiveObservation[] = [];

  if (stats.adherenceRate >= 85) {
    observations.push({
      id: 'careplan-adherence-positive',
      text: 'Care Plan items are being completed reliably.',
    });
  }

  if (stats.totalLogs >= 5) {
    observations.push({
      id: 'careplan-active',
      text: 'Regular tracking is helping build a complete picture.',
    });
  }

  if (stats.uniqueDays >= Math.min(7, timeRange)) {
    observations.push({
      id: 'careplan-days',
      text: 'Logging has been consistent across multiple days.',
    });
  }

  if (stats.carePlanItems.length > 0 && stats.totalLogs > 0) {
    observations.push({
      id: 'careplan-setup',
      text: 'Your Care Plan is set up and being used.',
    });
  }

  return observations.slice(0, 3);
}

// ============================================================================
// MAIN DATA LOADER
// ============================================================================

export async function loadUnderstandPageData(timeRange: TimeRange): Promise<UnderstandPageData> {
  try {
    // Load baseline data to check days of data
    const baselines = await getAllBaselines();
    const daysOfData = baselines?.daysOfData || 0;

    // Load Care Plan stats for the time range
    const carePlanStats = await getCarePlanStatsForRange(timeRange);

    // Check if we have sufficient data for correlations
    const hasEnoughData = await hasSufficientData();

    // Check if we have Care Plan data (newer system)
    const hasCarePlanData = carePlanStats.totalLogs >= 3 || carePlanStats.carePlanItems.length > 0;

    // If not enough data from either source, check if we should show sample data
    const sampleDismissed = await isSampleDataDismissed();
    const shouldShowSample = !hasEnoughData && !hasCarePlanData && daysOfData < 5 && !sampleDismissed;

    if (shouldShowSample) {
      return await getSampleData(timeRange);
    }

    // Load correlations if we have enough data
    const correlations = hasEnoughData ? await detectCorrelations() : [];

    // Load engine insights
    const engineInsights = await getAllInsights();

    // Compute effective days of data early (needed by insight generators)
    const effectiveDaysOfData = Math.max(daysOfData, carePlanStats.uniqueDays);

    // Generate all sections (combine old system + Care Plan data)
    const [standOutInsights, positiveObservations, correlationCards] = await Promise.all([
      generateStandOutInsights(correlations, engineInsights, timeRange, effectiveDaysOfData),
      generatePositiveObservations(correlations, engineInsights, timeRange, carePlanStats),
      generateCorrelationCards(correlations, timeRange),
    ]);

    // Add Care Plan insights
    const carePlanInsights = generateCarePlanInsights(carePlanStats, timeRange);
    const carePlanPositives = generateCarePlanPositives(carePlanStats, timeRange);

    // Combine insights with mutual exclusivity for medication insights:
    // If engine has a medication insight, drop care plan medication insights (and vice versa).
    // Prefer engine insights (more specific) when both exist.
    const hasEngineMedInsight = standOutInsights.some(i => i.id.startsWith('engine-medication'));
    const filteredCarePlanInsights = hasEngineMedInsight
      ? carePlanInsights.filter(i => !i.id.startsWith('careplan-med'))
      : carePlanInsights;

    const combinedStandOut = standOutInsights.length > 0
      ? [...standOutInsights, ...filteredCarePlanInsights].slice(0, 3)
      : filteredCarePlanInsights.length > 0
        ? filteredCarePlanInsights
        : [{
            id: 'no-patterns',
            text: 'No clear patterns yet. Keep tracking to reveal insights.',
            confidence: 'early' as ConfidenceLevel,
          }];

    const combinedPositiveRaw = positiveObservations.length > 0
      ? [...positiveObservations, ...carePlanPositives].slice(0, 3)
      : carePlanPositives.length > 0
        ? carePlanPositives
        : [{
            id: 'keep-tracking',
            text: 'Keep logging to reveal what\'s going well.',
          }];

    // Cross-check: remove positive medication observations if stand-out insights flag medication issues
    const hasMedWarning = combinedStandOut.some(i =>
      i.id.includes('medication') || i.id.includes('med-')
    );
    const combinedPositive = hasMedWarning
      ? combinedPositiveRaw.filter(o => !o.id.includes('med-adherence'))
      : combinedPositiveRaw;

    // Check if confidence explanation should show (one-time)
    const confidenceExplained = await hasConfidenceBeenExplained();
    const shouldShowConfidenceExplanation = !confidenceExplained && correlationCards.length > 0;

    return {
      timeRange,
      framing: getTimeRangeFraming(timeRange),
      standOutInsights: combinedStandOut,
      positiveObservations: combinedPositive,
      correlationCards,
      hasEnoughData: hasEnoughData || hasCarePlanData,
      daysOfData: effectiveDaysOfData,
      adherenceRate: carePlanStats.adherenceRate,
      dosesLogged: carePlanStats.completedCount,
      dosesScheduled: carePlanStats.completedCount + carePlanStats.skippedCount,
      avgMealsPerDay: carePlanStats.avgMealsPerDay,
      avgHydrationPerDay: carePlanStats.avgHydrationPerDay,
      avgSleepHours: carePlanStats.avgSleepHours,
      avgWellnessPerDay: carePlanStats.avgWellnessPerDay,
      lunchSkipRate: carePlanStats.lunchSkipRate,
      isSampleData: false,
      showConfidenceExplanation: shouldShowConfidenceExplanation,
    };
  } catch (error) {
    logError('understandInsights.loadUnderstandPageData', error);

    // Return safe defaults
    return {
      timeRange,
      framing: getTimeRangeFraming(timeRange),
      standOutInsights: [{
        id: 'error',
        text: 'Unable to analyze patterns right now.',
        confidence: 'early',
      }],
      positiveObservations: [{
        id: 'default',
        text: 'Keep tracking to build insights.',
      }],
      correlationCards: [],
      hasEnoughData: false,
      daysOfData: 0,
      adherenceRate: 0,
      dosesLogged: 0,
      dosesScheduled: 0,
      avgMealsPerDay: 0,
      avgHydrationPerDay: 0,
      avgSleepHours: 0,
      avgWellnessPerDay: 0,
      lunchSkipRate: 0,
      isSampleData: false,
    };
  }
}

// ============================================================================
// SAMPLE DATA DISMISSAL
// ============================================================================

async function isSampleDataDismissed(): Promise<boolean> {
  try {
    const value = await safeGetItem<string | null>(SAMPLE_DATA_DISMISSED_KEY, null);
    return value === 'true';
  } catch {
    return false;
  }
}

export async function dismissSampleData(): Promise<void> {
  try {
    await safeSetItem(SAMPLE_DATA_DISMISSED_KEY, 'true');
  } catch (error) {
    logError('understandInsights.dismissSampleData', error);
  }
}

export async function resetSampleDataDismissal(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SAMPLE_DATA_DISMISSED_KEY);
  } catch (error) {
    logError('understandInsights.resetSampleDataDismissal', error);
  }
}

// ============================================================================
// PREVIEW MODE SEEN TRACKING
// Allows showing a smaller version after first dismissal
// ============================================================================

export async function hasSampleDataBeenSeen(): Promise<boolean> {
  try {
    const value = await safeGetItem<string | null>(SAMPLE_DATA_SEEN_KEY, null);
    return value === 'true';
  } catch {
    return false;
  }
}

export async function markSampleDataSeen(): Promise<void> {
  try {
    await safeSetItem(SAMPLE_DATA_SEEN_KEY, 'true');
  } catch (error) {
    logError('understandInsights.markSampleDataSeen', error);
  }
}

// ============================================================================
// CONFIDENCE EXPLANATION TRACKING
// One-time global explanation for pattern confidence
// ============================================================================

export async function hasConfidenceBeenExplained(): Promise<boolean> {
  try {
    const value = await safeGetItem<string | null>(CONFIDENCE_EXPLAINED_KEY, null);
    return value === 'true';
  } catch {
    return false;
  }
}

export async function markConfidenceExplained(): Promise<void> {
  try {
    await safeSetItem(CONFIDENCE_EXPLAINED_KEY, 'true');
  } catch (error) {
    logError('understandInsights.markConfidenceExplained', error);
  }
}

// ============================================================================
// ACTIONABLE SUGGESTIONS (IG-2)
// ============================================================================

export interface ActionableSuggestion {
  id: string;
  text: string;
  icon: string;
}

export function generateActionableSuggestions(stats: CarePlanStats): ActionableSuggestion[] {
  const suggestions: ActionableSuggestion[] = [];

  // Low hydration
  if (stats.avgHydrationPerDay > 0 && stats.avgHydrationPerDay < 6) {
    suggestions.push({
      id: 'low-hydration',
      text: `Averaging ${stats.avgHydrationPerDay.toFixed(1)} glasses/day — try adding one more at lunch.`,
      icon: '\uD83D\uDCA7',
    });
  }

  // Lunch skip rate
  if (stats.lunchSkipRate > 0.3) {
    suggestions.push({
      id: 'lunch-skips',
      text: `Lunch was skipped ${Math.round(stats.lunchSkipRate * 100)}% of the time — a light snack counts.`,
      icon: '\uD83C\uDF5E',
    });
  }

  // Low sleep
  if (stats.avgSleepHours > 0 && stats.avgSleepHours < 7) {
    suggestions.push({
      id: 'low-sleep',
      text: `Averaging ${stats.avgSleepHours.toFixed(1)} hrs of sleep — winding down 30 min earlier may help.`,
      icon: '\uD83D\uDE34',
    });
  }

  // Low medication adherence
  if (stats.medicationLogs > 0 && stats.adherenceRate < 80) {
    suggestions.push({
      id: 'med-adherence',
      text: `Medication adherence is at ${Math.round(stats.adherenceRate)}% — setting a reminder could help.`,
      icon: '\uD83D\uDC8A',
    });
  }

  // Low wellness tracking
  if (stats.avgWellnessPerDay > 0 && stats.avgWellnessPerDay < 1) {
    suggestions.push({
      id: 'low-wellness',
      text: 'Mood is logged less than once a day — even a quick check-in helps spot trends.',
      icon: '\uD83E\uDDE0',
    });
  }

  return suggestions.slice(0, 3);
}

// ============================================================================
// HELPERS
// ============================================================================

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ============================================================================
// ROUTE VALIDATION
// ============================================================================

const VALID_ROUTES = new Set([
  '/vitals',
  '/vitals',
  '/care-report',
  '/(tabs)/today',
  '/(tabs)/journal',
  '/(tabs)/understand',
  '/care-plan',
  '/care-report',
  '/notification-settings',
  '/medications',
  '/log-note',
  '/settings',
]);

export function isValidRoute(route: string): boolean {
  return VALID_ROUTES.has(route);
}

export function getRouteOrFallback(route: string | undefined): string | undefined {
  if (!route) return undefined;
  return isValidRoute(route) ? route : undefined;
}
