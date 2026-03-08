// ============================================================================
// INSIGHT RULES - Pattern-based insight generation
// Rules for generating supportive, non-nagging insights
// ============================================================================

import { CarePlanTask, TaskStats } from '../types/carePlanTask';
import { TimeWindowLabel } from '../types/carePlan';

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
