// ============================================================================
// CARE INSIGHT & AI INSIGHT GENERATORS
// Pure functions - no React hooks needed
//
// Priority tiers (highest wins):
// P1: Cross-category dependency (2+ categories)
// P2: Appointment preparation (upcoming appointment)
// P3: Multi-day pattern (requires recent history)
// P4: Time-sensitive reminder
// ============================================================================

import type { TodayStats, CareInsight, AIInsight as NowAIInsight } from './nowHelpers';
import type { Appointment } from './appointmentStorage';
import type { Medication } from './medicationStorage';
import { CarePlanTask, TaskStats } from '../types/carePlanTask';
import { TimeWindowLabel } from '../types/carePlan';

// ============================================================================
// RECENT HISTORY TYPE — built by useNowInsights from multi-day data
// ============================================================================
export interface RecentHistory {
  lunchSkipCount: number;     // lunches missed in last 5 days
  avgSystolic: number | null; // avg systolic BP over last 7 days (null if <3 readings)
  avgDiastolic: number | null;
  bpReadingCount: number;
  consecutiveMedDays: number; // consecutive days with 100% med adherence
  daysTracked: number;
}

// BP medication name patterns
const BP_MED_PATTERNS = ['lisinopril', 'amlodipine', 'metoprolol', 'losartan', 'atenolol', 'hydrochlorothiazide', 'blood pressure'];
const DIABETES_MED_PATTERNS = ['metformin', 'glipizide', 'insulin', 'jardiance', 'ozempic', 'diabetes'];

function matchesMedPattern(name: string, patterns: string[]): boolean {
  const lower = name.toLowerCase();
  return patterns.some(p => lower.includes(p));
}

function findMedName(instances: any[], patterns: string[]): string | null {
  const med = instances.find(i =>
    i.itemType === 'medication' && matchesMedPattern(i.itemName || '', patterns)
  );
  return med?.itemName || null;
}

// ============================================================================
// CARE INSIGHT GENERATOR — Priority tiers P1-P3
// Every insight requires a specific data condition. No defaults.
// ============================================================================

export function generateCareInsight(
  stats: TodayStats,
  instances: any[],
  completedCount: number,
  recentHistory: RecentHistory | null = null,
  upcomingAppointments: Appointment[] = []
): CareInsight | null {
  const now = new Date();
  const currentHour = now.getHours();

  // Useful data points
  const hasVitalsNotLogged = stats.vitals.total > 0 && stats.vitals.completed === 0;
  const hasPendingBPMed = instances.some(i =>
    i.itemType === 'medication' && i.status === 'pending' &&
    matchesMedPattern(i.itemName || '', BP_MED_PATTERNS)
  );
  const completedDiabetesMed = instances.find(i =>
    i.itemType === 'medication' && i.status === 'completed' &&
    matchesMedPattern(i.itemName || '', DIABETES_MED_PATTERNS)
  );
  const completedMedWithName = instances.find(i =>
    i.itemType === 'medication' && i.status === 'completed'
  );

  // ── P1: Cross-category dependency ──────────────────────────────────────
  // BP med pending + vitals not logged + morning
  if (hasPendingBPMed && hasVitalsNotLogged && currentHour >= 6 && currentHour < 12) {
    const medName = findMedName(instances, BP_MED_PATTERNS) || 'blood pressure medication';
    return {
      icon: '📊',
      title: 'A quick check first',
      message: `Log vitals before taking ${medName} — helps track if the dose is working.`,
      type: 'dependency',
      confidence: 0.95,
    };
  }

  // Diabetes med taken + no water + past noon
  if (completedDiabetesMed && (stats.water?.completed ?? 0) === 0 && currentHour >= 12) {
    const medName = completedDiabetesMed.itemName || 'diabetes medication';
    return {
      icon: '💧',
      title: 'Hydration check',
      message: `No water logged and ${medName} was taken. Adequate hydration helps with this medication.`,
      type: 'dependency',
      confidence: 0.9,
    };
  }

  // Meds completed + no meals + past noon
  if (completedMedWithName && stats.meals.total > 0 && stats.meals.completed === 0 &&
      stats.meds.completed > 0 && currentHour >= 12) {
    const medName = completedMedWithName.itemName || 'medication';
    return {
      icon: '🍽️',
      title: 'Food and medication',
      message: `No meals logged and ${medName} was taken on an empty stomach. Some medications absorb better with food.`,
      type: 'preventative',
      confidence: 0.85,
    };
  }

  // ── P2: Appointment preparation ────────────────────────────────────────
  if (upcomingAppointments.length > 0) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const tomorrowAppt = upcomingAppointments.find(a =>
      !a.cancelled && !a.completed && a.date === tomorrowStr
    );

    if (tomorrowAppt) {
      // Check if BP was logged today and is elevated
      if (stats.vitals.completed > 0 && recentHistory?.avgSystolic != null) {
        // Use today's latest reading if available via avgSystolic proxy
        const sys = recentHistory.avgSystolic;
        const dia = recentHistory.avgDiastolic ?? 0;
        if (sys >= 140 || dia >= 90) {
          return {
            icon: '🩺',
            title: 'Visit tomorrow',
            message: `${tomorrowAppt.specialty || 'Doctor'} visit tomorrow — BP was ${Math.round(sys)}/${Math.round(dia)} today. Worth mentioning.`,
            type: 'dependency',
            confidence: 0.9,
          };
        }
      }

      // Generic appointment prep
      const totalToday = stats.meds.total + stats.vitals.total;
      const completedToday = stats.meds.completed + stats.vitals.completed;
      if (totalToday > 0 && completedToday < totalToday) {
        return {
          icon: '🩺',
          title: 'Visit tomorrow',
          message: `${tomorrowAppt.provider} visit tomorrow. Today's logs will be useful for the appointment.`,
          type: 'dependency',
          confidence: 0.8,
        };
      }
    }
  }

  // ── P3: Multi-day patterns (requires recentHistory) ────────────────────
  if (recentHistory) {
    // Lunch skipped ≥3 of last 5 days
    if (recentHistory.lunchSkipCount >= 3) {
      return {
        icon: '🍽️',
        title: 'Pattern detected',
        message: `Lunch has been skipped ${recentHistory.lunchSkipCount} of the last 5 days. Consider adjusting the schedule.`,
        type: 'pattern',
        confidence: 0.85,
      };
    }

    // BP average elevated (≥135 sys or ≥85 dia) with ≥3 readings
    if (recentHistory.bpReadingCount >= 3 &&
        recentHistory.avgSystolic != null && recentHistory.avgDiastolic != null &&
        (recentHistory.avgSystolic >= 135 || recentHistory.avgDiastolic >= 85)) {
      return {
        icon: '📊',
        title: 'BP trend',
        message: `Blood pressure has averaged ${Math.round(recentHistory.avgSystolic)}/${Math.round(recentHistory.avgDiastolic)} this week — slightly above recommended range.`,
        type: 'pattern',
        confidence: 0.85,
      };
    }

    // ≥7 consecutive days 100% med adherence
    if (recentHistory.consecutiveMedDays >= 7) {
      return {
        icon: '💊',
        title: 'Great consistency',
        message: `All medications taken on time for ${recentHistory.consecutiveMedDays} days straight.`,
        type: 'reinforcement',
        confidence: 0.9,
      };
    }
  }

  // ── P4: Time-sensitive reminders ───────────────────────────────────────
  // Evening meds pending (4-8 PM)
  if (currentHour >= 16 && currentHour < 20) {
    const eveningMedsPending = instances.filter(i =>
      i.itemType === 'medication' && i.status === 'pending' &&
      new Date(i.scheduledTime).getHours() >= 16
    );
    if (eveningMedsPending.length > 0) {
      return {
        icon: '💊',
        title: 'Evening meds',
        message: `${eveningMedsPending.length} evening medication${eveningMedsPending.length > 1 ? 's' : ''} remaining.`,
        type: 'pattern',
        confidence: 0.75,
      };
    }
  }

  // Evening wellness pending + morning wellness done (past 7 PM)
  if (currentHour >= 19) {
    const morningWellnessDone = instances.some(i =>
      (i.itemType === 'wellness' || i.itemType === 'mood') &&
      i.status === 'completed' &&
      new Date(i.scheduledTime).getHours() < 12
    );
    const eveningWellnessPending = instances.some(i =>
      (i.itemType === 'wellness' || i.itemType === 'mood') &&
      i.status === 'pending' &&
      new Date(i.scheduledTime).getHours() >= 16
    );
    if (morningWellnessDone && eveningWellnessPending) {
      return {
        icon: '🌅',
        title: 'Evening check-in',
        message: 'Evening wellness check not yet logged. It helps compare to this morning\'s check-in.',
        type: 'pattern',
        confidence: 0.7,
      };
    }
  }

  return null;
}

// ============================================================================
// AI INSIGHT GENERATOR
// Arbitrates between Progress and Timeline data
// All data must come from instancesState to ensure consistency
// ============================================================================

export function generateAIInsight(
  stats: TodayStats,
  moodLevel: number | null,
  todayAppointments: Appointment[],
  meds: Medication[],
  timelineOverdue: number = 0,
  timelineUpcoming: number = 0,
  timelineCompleted: number = 0,
  eveningMedsRemaining: number = 0
): NowAIInsight | null {
  const now = new Date();
  const currentHour = now.getHours();
  const insights: NowAIInsight[] = [];

  const totalLogged = stats.meds.completed + stats.vitals.completed + (stats.wellness?.completed ?? 0) + stats.meals.completed;
  const medsRemaining = stats.meds.total - stats.meds.completed;

  // REMINDER: Overdue items - highest priority
  if (timelineOverdue > 0) {
    insights.push({
      icon: '⏰',
      title: timelineOverdue === 1 ? '1 item overdue' : `${timelineOverdue} items overdue`,
      message: 'Tap above to log or adjust.',
      type: 'reminder',
    });
  }

  // CELEBRATION: All timeline items complete
  if (timelineOverdue === 0 && timelineUpcoming === 0 && timelineCompleted > 0) {
    insights.push({
      icon: '✓',
      title: 'All done for today',
      message: `${timelineCompleted} item${timelineCompleted > 1 ? 's' : ''} logged.`,
      type: 'celebration',
    });
  }

  // CELEBRATION: Strong progress (legacy system)
  if (timelineCompleted === 0 && stats.meds.completed === stats.meds.total && stats.meds.total > 0 &&
      (stats.wellness?.completed ?? 0) > 0 && stats.meals.completed >= 3) {
    insights.push({
      icon: '✓',
      title: 'All done for today',
      message: 'Meds, mood, and meals logged.',
      type: 'celebration',
    });
  }

  // REMINDER: Upcoming appointment
  if (todayAppointments.length > 0) {
    const nextAppt = todayAppointments[0];
    const apptTime = nextAppt.time ? ` at ${nextAppt.time}` : '';
    insights.push({
      icon: '📅',
      title: `${nextAppt.specialty || 'Appointment'}${apptTime}`,
      message: `With ${nextAppt.provider}. Recent logs help.`,
      type: 'reminder',
    });
  }

  // REMINDER: Evening medications
  if (currentHour >= 16 && currentHour < 20 && eveningMedsRemaining > 0) {
    insights.push({
      icon: '💊',
      title: `${eveningMedsRemaining} evening med${eveningMedsRemaining > 1 ? 's' : ''} remaining`,
      message: 'Timing consistency improves effectiveness.',
      type: 'reminder',
    });
  }

  // POSITIVE: Medications complete
  if (stats.meds.completed > 0 && stats.meds.completed === stats.meds.total && stats.meds.total > 0) {
    insights.push({
      icon: '💊',
      title: 'Medications complete',
      message: `All ${stats.meds.total} logged today.`,
      type: 'positive',
    });
  }

  // SUGGESTION: Morning medications pending
  if (currentHour >= 6 && currentHour < 11 && medsRemaining > 0 && stats.meds.total > 0) {
    insights.push({
      icon: '💊',
      title: `${medsRemaining} medication${medsRemaining > 1 ? 's' : ''} not logged`,
      message: 'Tap Record to log.',
      type: 'suggestion',
    });
  }

  // SUGGESTION: Lunch not logged
  if (currentHour >= 12 && currentHour < 15 && stats.meals.completed < 2) {
    insights.push({
      icon: '🍽️',
      title: 'Lunch not logged yet',
      message: 'Quick note helps track appetite.',
      type: 'suggestion',
    });
  }

  // SUGGESTION: Mood not logged
  if (currentHour >= 14 && (stats.wellness?.completed ?? 0) === 0) {
    insights.push({
      icon: '😊',
      title: 'Mood not logged yet',
      message: 'A quick check-in helps spot patterns.',
      type: 'suggestion',
    });
  }

  // SUGGESTION: Vitals not logged
  if (currentHour >= 10 && stats.vitals.completed === 0 && stats.vitals.total > 0) {
    insights.push({
      icon: '📊',
      title: 'Vitals not logged yet',
      message: 'Regular readings build a baseline.',
      type: 'suggestion',
    });
  }

  // SUGGESTION: No data yet today
  if (totalLogged === 0 && currentHour >= 8) {
    insights.push({
      icon: '📋',
      title: 'Nothing logged yet today',
      message: 'Start with whatever feels natural.',
      type: 'suggestion',
    });
  }

  // POSITIVE: Meals well tracked
  if (stats.meals.completed >= 3) {
    insights.push({
      icon: '🍽️',
      title: `${stats.meals.completed} meals logged`,
      message: 'Helps track appetite patterns.',
      type: 'positive',
    });
  }

  // POSITIVE: Vitals captured
  if (stats.vitals.completed >= 2) {
    insights.push({
      icon: '📊',
      title: `${stats.vitals.completed} vitals recorded`,
      message: 'Building a useful baseline.',
      type: 'positive',
    });
  }

  // Return the most relevant insight
  const priorityOrder = ['reminder', 'celebration', 'suggestion', 'positive'];
  for (const priority of priorityOrder) {
    const match = insights.find(i => i.type === priority);
    if (match) return match;
  }
  return null;
}

// ============================================================================
// INSIGHT RULES (merged from insightRules.ts)
// ============================================================================

// ============================================================================
// TYPES
// ============================================================================

/**
 * Insight types - aligned with supportive care philosophy
 * - pattern: Observed patterns in data
 * - reinforcement: Positive feedback on good behavior
 * - dependency: Task dependencies (e.g., vitals before BP meds)
 * - contextual: Time/situation-based suggestions
 */
export type InsightType = 'pattern' | 'reinforcement' | 'dependency' | 'contextual';

/**
 * AI Insight structure
 */
export interface AIInsight {
  id: string;
  icon: string;
  title: string;
  message: string;
  type: InsightType;
  confidence: number; // 0-1, only show if >= 0.7
  priority: number; // Lower = higher priority (for sorting)
  category?: string; // 'meds' | 'vitals' | 'mood' | 'nutrition' | etc.
}

/**
 * Insight rule function signature
 */
export type InsightRule = (context: InsightContext) => AIInsight | null;

/**
 * Context for insight generation
 */
export interface InsightContext {
  tasks: CarePlanTask[];
  stats: TaskStats;
  byWindow: Record<TimeWindowLabel, CarePlanTask[]>;
  currentHour: number;
  currentWindow: TimeWindowLabel;
  consecutiveLoggingDays?: number;
  recentCompletionRate?: number; // 7-day average
}

// ============================================================================
// INSIGHT RULES
// Each rule returns an insight or null
// Rules should be supportive, not nagging
// ============================================================================

/**
 * Rule: All tasks complete for the day
 */
const allCompleteRule: InsightRule = (ctx) => {
  if (ctx.stats.total === 0) return null;
  if (ctx.stats.pending > 0) return null;

  return {
    id: 'all-complete',
    icon: '✓',
    title: 'All done for today',
    message: 'Every scheduled task is complete. Nothing more needed.',
    type: 'reinforcement',
    confidence: 1.0,
    priority: 1,
  };
};

/**
 * Rule: Strong logging streak
 */
const streakRule: InsightRule = (ctx) => {
  const days = ctx.consecutiveLoggingDays || 0;
  if (days < 3) return null;

  return {
    id: 'streak',
    icon: '🔥',
    title: `${days}-day streak`,
    message: 'Consistent tracking helps spot patterns over time.',
    type: 'reinforcement',
    confidence: 0.9,
    priority: 2,
  };
};

/**
 * Rule: High completion rate this week
 */
const highCompletionRule: InsightRule = (ctx) => {
  const rate = ctx.recentCompletionRate;
  if (rate === undefined || rate < 85) return null;

  return {
    id: 'high-completion',
    icon: '📈',
    title: 'Strong adherence',
    message: `${Math.round(rate)}% completion rate this week. Keep it up!`,
    type: 'reinforcement',
    confidence: 0.85,
    priority: 3,
  };
};

/**
 * Rule: Vitals dependency for blood pressure medication
 */
const vitalsBeforeBPMedsRule: InsightRule = (ctx) => {
  // Only relevant in morning
  if (ctx.currentHour < 6 || ctx.currentHour >= 12) return null;

  // Check for pending BP medications
  const bpMedKeywords = ['blood pressure', 'lisinopril', 'amlodipine', 'metoprolol', 'losartan'];
  const hasPendingBPMed = ctx.tasks.some(t =>
    t.type === 'medication' &&
    t.status === 'pending' &&
    bpMedKeywords.some(kw => t.title.toLowerCase().includes(kw))
  );

  if (!hasPendingBPMed) return null;

  // Check if vitals haven't been logged
  const pendingVitals = ctx.tasks.filter(t => t.type === 'vitals' && t.status === 'pending');
  if (pendingVitals.length === 0) return null;

  return {
    id: 'vitals-before-bp',
    icon: '📊',
    title: 'A quick check first',
    message: 'Recording vitals before blood pressure medication helps track effectiveness.',
    type: 'dependency',
    confidence: 0.8,
    priority: 4,
    category: 'vitals',
  };
};

/**
 * Rule: Morning medication timing pattern
 */
const morningMedTimingRule: InsightRule = (ctx) => {
  // Only show mid-morning
  if (ctx.currentHour < 9 || ctx.currentHour >= 11) return null;

  const morningMeds = ctx.byWindow.morning?.filter(t =>
    t.type === 'medication' && t.status === 'pending'
  ) || [];

  if (morningMeds.length === 0) return null;

  return {
    id: 'morning-med-timing',
    icon: '💊',
    title: 'Consistent timing helps',
    message: 'Taking medications at the same time each day improves their effectiveness.',
    type: 'pattern',
    confidence: 0.75,
    priority: 5,
    category: 'meds',
  };
};

/**
 * Rule: Meal logging with medication
 */
const mealMedDependencyRule: InsightRule = (ctx) => {
  // Check for pending meds that should be taken with food
  const withFoodKeywords = ['with food', 'with meal', 'metformin', 'ibuprofen'];
  const pendingWithFoodMed = ctx.tasks.find(t =>
    t.type === 'medication' &&
    t.status === 'pending' &&
    (t.instructions?.toLowerCase().includes('with food') ||
     t.instructions?.toLowerCase().includes('with meal') ||
     withFoodKeywords.some(kw => t.title.toLowerCase().includes(kw)))
  );

  if (!pendingWithFoodMed) return null;

  // Check if it's around a meal time
  const mealHours = [7, 8, 12, 13, 18, 19];
  if (!mealHours.includes(ctx.currentHour)) return null;

  return {
    id: 'meal-med-dependency',
    icon: '🍽️',
    title: 'With food works better',
    message: `${pendingWithFoodMed.title} is more effective when taken with a meal.`,
    type: 'dependency',
    confidence: 0.8,
    priority: 4,
    category: 'nutrition',
  };
};

/**
 * Rule: Hydration reminder (non-nagging)
 */
const hydrationPatternRule: InsightRule = (ctx) => {
  // Only in afternoon when people often forget
  if (ctx.currentHour < 14 || ctx.currentHour >= 17) return null;

  const hydrationTasks = ctx.tasks.filter(t => t.type === 'hydration');
  if (hydrationTasks.length === 0) return null;

  const completed = hydrationTasks.filter(t => t.status === 'completed').length;
  const total = hydrationTasks.length;

  // Only show if behind on water intake (pattern observation, not nagging)
  if (completed >= total / 2) return null;

  return {
    id: 'hydration-pattern',
    icon: '💧',
    title: 'Afternoon hydration',
    message: 'Steady water intake supports medication absorption and energy levels.',
    type: 'contextual',
    confidence: 0.7,
    priority: 6,
    category: 'hydration',
  };
};

/**
 * Rule: Evening wind-down
 */
const eveningWindDownRule: InsightRule = (ctx) => {
  if (ctx.currentHour < 20 || ctx.currentHour >= 22) return null;

  const eveningPending = ctx.byWindow.evening?.filter(t => t.status === 'pending') || [];
  const nightPending = ctx.byWindow.night?.filter(t => t.status === 'pending') || [];

  if (eveningPending.length === 0 && nightPending.length === 0) return null;

  const totalRemaining = eveningPending.length + nightPending.length;

  return {
    id: 'evening-wind-down',
    icon: '🌙',
    title: 'Winding down',
    message: `${totalRemaining} ${totalRemaining === 1 ? 'task' : 'tasks'} left for tonight when ready.`,
    type: 'contextual',
    confidence: 0.8,
    priority: 5,
  };
};

/**
 * Rule: Mood tracking correlation
 */
const moodTrackingRule: InsightRule = (ctx) => {
  // Only if mood tracking is enabled but not done
  const moodTasks = ctx.tasks.filter(t => t.type === 'mood');
  if (moodTasks.length === 0) return null;

  const moodLogged = moodTasks.some(t => t.status === 'completed');
  if (moodLogged) return null;

  // Only show in afternoon (reflective time)
  if (ctx.currentHour < 15 || ctx.currentHour >= 19) return null;

  return {
    id: 'mood-tracking',
    icon: '😊',
    title: 'Mood check',
    message: 'Tracking mood helps identify patterns with medications and activities.',
    type: 'pattern',
    confidence: 0.7,
    priority: 7,
    category: 'mood',
  };
};

// ============================================================================
// RULE REGISTRY
// ============================================================================

const INSIGHT_RULES: InsightRule[] = [
  allCompleteRule,
  streakRule,
  highCompletionRule,
  vitalsBeforeBPMedsRule,
  morningMedTimingRule,
  mealMedDependencyRule,
  hydrationPatternRule,
  eveningWindDownRule,
  moodTrackingRule,
];

// ============================================================================
// INSIGHT GENERATOR
// ============================================================================

/**
 * Generate insights based on current context
 * Returns insights with confidence >= 0.7, sorted by priority
 */
export function generateInsights(context: InsightContext): AIInsight[] {
  const insights: AIInsight[] = [];

  for (const rule of INSIGHT_RULES) {
    const insight = rule(context);
    if (insight && insight.confidence >= 0.7) {
      insights.push(insight);
    }
  }

  // Sort by priority (lower = higher priority)
  insights.sort((a, b) => a.priority - b.priority);

  return insights;
}

/**
 * Get the primary (highest priority) insight
 */
export function getPrimaryInsight(context: InsightContext): AIInsight | null {
  const insights = generateInsights(context);
  return insights[0] || null;
}

/**
 * Get insights for a specific category
 */
export function getInsightsForCategory(
  context: InsightContext,
  category: string
): AIInsight[] {
  return generateInsights(context).filter(i => i.category === category);
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get the current time window label
 */
export function getCurrentWindowLabel(): TimeWindowLabel {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}
