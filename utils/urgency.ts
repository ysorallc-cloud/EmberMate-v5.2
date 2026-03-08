// ============================================================================
// URGENCY MODEL - "Calm Urgency" System
// Single source of truth for item urgency classification
// ============================================================================
//
// Principle: Reduce caregiver stress by limiting "red/overdue" signaling to
// truly time-critical items. Implements a 3-tier urgency model:
//   - CRITICAL (red): Clinical items overdue by 30+ minutes
//   - ATTENTION (amber): Due soon or pending non-critical items
//   - INFO (neutral): Optional or flexible timing items
//
// Key Rules:
//   - Mood should NEVER escalate to critical by default
//   - "Overdue" wording only for critical tier items
//   - Max 1 red element above the fold
// ============================================================================

import type { CarePlanItemType } from '../types/carePlan';

// ============================================================================
// TYPES
// ============================================================================

export type UrgencyTier = 'critical' | 'attention' | 'info';

export type UrgencyTone = 'danger' | 'warn' | 'neutral';

export interface ItemUrgency {
  tier: UrgencyTier;
  isOverdue: boolean;
  minutesLate: number;        // 0 if not overdue
  label: string;              // UI label like "Due now", "Late", "Pending"
  tone: UrgencyTone;          // Maps to theme tokens
  suppressedFromCritical?: boolean; // True if above-fold cap applied
}

export interface AboveFoldUrgencyState {
  hasCriticalNextUp: boolean;
  criticalTileCount: number;
  maxCriticalTiles: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Threshold: How long overdue before clinical items become CRITICAL
export const CRITICAL_OVERDUE_MINUTES = 30;

// Window: Items due within this many minutes show as "Due soon"
export const UPCOMING_WINDOW_MINUTES = 60;

// Above-fold constraint: Maximum red elements in top section
export const MAX_RED_ABOVE_FOLD = 1;

// ============================================================================
// CATEGORY CLASSIFICATION
// ============================================================================

/**
 * Clinical-critical categories: Items with medical/health timing importance
 * These CAN escalate to CRITICAL tier when significantly overdue
 */
const CLINICAL_CRITICAL_CATEGORIES: Set<string> = new Set([
  'medication',
  'meds',        // alias used in UI
  'nutrition',
  'meals',       // alias used in UI
]);

/**
 * Non-clinical categories: Important but not time-critical for health
 * These should NEVER escalate to CRITICAL tier
 */
const NON_CLINICAL_CATEGORIES: Set<string> = new Set([
  'mood',
  'hydration',
  'sleep',
  'activity',
  'custom',
]);

/**
 * Neutral logging categories: Informational, default to ATTENTION at most
 */
const NEUTRAL_LOGGING_CATEGORIES: Set<string> = new Set([
  'vitals',
]);

/**
 * Check if a category can escalate to CRITICAL tier
 */
export function isClinicalCritical(category: CarePlanItemType | string): boolean {
  return CLINICAL_CRITICAL_CATEGORIES.has(category);
}

/**
 * Check if a category should never be CRITICAL
 */
export function isNonClinical(category: CarePlanItemType | string): boolean {
  return NON_CLINICAL_CATEGORIES.has(category);
}

// ============================================================================
// URGENCY CALCULATION
// ============================================================================

export interface CalculateUrgencyParams {
  category: CarePlanItemType;
  dueAt: Date | string | null;       // Scheduled time, null if anytime
  now?: Date;                         // Current time (defaults to now)
  isCompleted?: boolean;              // Already logged/done
  isOptional?: boolean;               // Optional tracking item
  forceNonCritical?: boolean;         // Override to prevent CRITICAL
}

/**
 * Calculate the urgency tier and display properties for a care item
 *
 * This is the SINGLE SOURCE OF TRUTH for urgency classification.
 */
export function calculateItemUrgency(params: CalculateUrgencyParams): ItemUrgency {
  const {
    category,
    dueAt,
    now = new Date(),
    isCompleted = false,
    isOptional = false,
    forceNonCritical = false,
  } = params;

  // Completed items are always INFO
  if (isCompleted) {
    return {
      tier: 'info',
      isOverdue: false,
      minutesLate: 0,
      label: 'Done',
      tone: 'neutral',
    };
  }

  // Optional items with no schedule are INFO
  if (isOptional && !dueAt) {
    return {
      tier: 'info',
      isOverdue: false,
      minutesLate: 0,
      label: 'Whenever you\'re ready',
      tone: 'neutral',
    };
  }

  // No scheduled time - flexible timing
  if (!dueAt) {
    return {
      tier: 'info',
      isOverdue: false,
      minutesLate: 0,
      label: 'Anytime today',
      tone: 'neutral',
    };
  }

  // Parse due time
  const dueTime = typeof dueAt === 'string' ? new Date(dueAt) : dueAt;
  const nowTime = now;

  // Calculate minutes difference
  const diffMs = nowTime.getTime() - dueTime.getTime();
  const minutesDiff = Math.floor(diffMs / (1000 * 60));

  const isOverdue = minutesDiff > 0;
  const minutesLate = isOverdue ? minutesDiff : 0;
  const minutesUntil = isOverdue ? 0 : Math.abs(minutesDiff);

  // Determine if this category CAN be critical
  const canBeCritical = isClinicalCritical(category) && !forceNonCritical;

  // =========================================================================
  // TIER DETERMINATION
  // =========================================================================

  // CRITICAL: Only for clinical-critical items overdue by threshold
  if (canBeCritical && isOverdue && minutesLate >= CRITICAL_OVERDUE_MINUTES) {
    return {
      tier: 'critical',
      isOverdue: true,
      minutesLate,
      label: 'Late',
      tone: 'danger',
    };
  }

  // ATTENTION: Overdue (but not critical) OR due soon OR pending expected
  if (isOverdue) {
    // Non-critical overdue: use calm, supportive language
    // NO time deltas in primary labels - just friendly status
    return {
      tier: 'attention',
      isOverdue: true,
      minutesLate,
      label: 'Due earlier today',
      tone: 'warn',
    };
  }

  if (minutesUntil <= UPCOMING_WINDOW_MINUTES) {
    return {
      tier: 'attention',
      isOverdue: false,
      minutesLate: 0,
      label: 'Still to do today',
      tone: 'warn',
    };
  }

  // INFO: Later today or future
  return {
    tier: 'info',
    isOverdue: false,
    minutesLate: 0,
    label: 'Later today',
    tone: 'neutral',
  };
}

// ============================================================================
// ABOVE-FOLD CONSTRAINT HELPERS
// ============================================================================

/**
 * Apply above-fold constraint: max 1 red element in top section
 *
 * If Next Up is critical, suppress critical styling on progress tiles.
 * Returns the adjusted urgency with suppressedFromCritical flag if capped.
 */
export function applyAboveFoldConstraint(
  urgency: ItemUrgency,
  aboveFoldState: AboveFoldUrgencyState
): ItemUrgency {
  // If not critical, no constraint needed
  if (urgency.tier !== 'critical') {
    return urgency;
  }

  // If Next Up is critical, tiles must not be critical
  if (aboveFoldState.hasCriticalNextUp) {
    return {
      ...urgency,
      tier: 'attention',
      tone: 'warn',
      label: 'Pending', // Don't say "Late" for non-primary critical
      suppressedFromCritical: true,
    };
  }

  // If we've hit the max critical tiles, suppress additional ones
  if (aboveFoldState.criticalTileCount >= aboveFoldState.maxCriticalTiles) {
    return {
      ...urgency,
      tier: 'attention',
      tone: 'warn',
      label: 'Pending',
      suppressedFromCritical: true,
    };
  }

  return urgency;
}

/**
 * Create initial above-fold state for tracking constraints
 */
export function createAboveFoldState(hasCriticalNextUp: boolean): AboveFoldUrgencyState {
  return {
    hasCriticalNextUp,
    criticalTileCount: 0,
    maxCriticalTiles: hasCriticalNextUp ? 0 : MAX_RED_ABOVE_FOLD,
  };
}

// ============================================================================
// DISPLAY HELPERS
// ============================================================================

/**
 * Get the status label for display based on urgency
 * Uses supportive, non-shaming language for non-critical items
 */
export function getUrgencyLabel(urgency: ItemUrgency): string {
  return urgency.label;
}

/**
 * Get the primary status label for display
 * NO time deltas in primary labels - keeps UI calm
 * Time deltas only appear in secondary text in Today's Plan list
 */
export function getDetailedUrgencyLabel(urgency: ItemUrgency): string {
  // For critical items, we can show "Late" but not time delta in header
  // For non-critical, just return the friendly label
  return urgency.label;
}

/**
 * Get time delta string for secondary display in timeline only
 * Returns null if not applicable (not overdue)
 */
export function getTimeDeltaString(urgency: ItemUrgency): string | null {
  if (!urgency.isOverdue || urgency.minutesLate === 0) {
    return null;
  }

  const hours = Math.floor(urgency.minutesLate / 60);
  const mins = urgency.minutesLate % 60;

  if (hours > 0) {
    return `${hours}h ${mins}m ago`;
  }
  return `${mins}m ago`;
}

/**
 * Check if "Overdue" text should be shown
 * Only true for CRITICAL tier items
 */
export function shouldShowOverdueText(urgency: ItemUrgency): boolean {
  return urgency.tier === 'critical' && urgency.isOverdue;
}

/**
 * Get tone-based color key for theme lookup
 */
export function getToneColorKey(tone: UrgencyTone): 'danger' | 'warn' | 'neutral' {
  return tone;
}

// ============================================================================
// SORTING HELPERS
// ============================================================================

/**
 * Sort items by urgency priority
 * Order: critical overdue > due soon > pending > later/info
 */
export function compareByUrgency(a: ItemUrgency, b: ItemUrgency): number {
  const tierPriority: Record<UrgencyTier, number> = {
    critical: 0,
    attention: 1,
    info: 2,
  };

  // First by tier
  const tierDiff = tierPriority[a.tier] - tierPriority[b.tier];
  if (tierDiff !== 0) return tierDiff;

  // Within same tier, overdue items first
  if (a.isOverdue !== b.isOverdue) {
    return a.isOverdue ? -1 : 1;
  }

  // Within overdue, more late = higher priority
  if (a.isOverdue && b.isOverdue) {
    return b.minutesLate - a.minutesLate;
  }

  return 0;
}

// ============================================================================
// CATEGORY URGENCY ROLLUP
// ============================================================================

export interface CategoryUrgencyParams {
  category: CarePlanItemType;
  items: Array<{
    dueAt: Date | string | null;
    isCompleted: boolean;
  }>;
  now?: Date;
}

/**
 * Calculate overall urgency for a category (e.g., for progress tiles)
 * Returns the highest urgency among pending items
 */
export function calculateCategoryUrgency(params: CategoryUrgencyParams): ItemUrgency {
  const { category, items, now = new Date() } = params;

  const pendingItems = items.filter(item => !item.isCompleted);

  // No pending items = all complete
  if (pendingItems.length === 0) {
    return {
      tier: 'info',
      isOverdue: false,
      minutesLate: 0,
      label: 'Complete',
      tone: 'neutral',
    };
  }

  // Calculate urgency for each pending item and find highest
  let highestUrgency: ItemUrgency | null = null;

  for (const item of pendingItems) {
    const urgency = calculateItemUrgency({
      category,
      dueAt: item.dueAt,
      now,
      isCompleted: false,
    });

    if (!highestUrgency || compareByUrgency(urgency, highestUrgency) < 0) {
      highestUrgency = urgency;
    }
  }

  return highestUrgency!;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  calculateItemUrgency,
  calculateCategoryUrgency,
  applyAboveFoldConstraint,
  createAboveFoldState,
  getUrgencyLabel,
  getDetailedUrgencyLabel,
  shouldShowOverdueText,
  getToneColorKey,
  compareByUrgency,
  isClinicalCritical,
  isNonClinical,
  CRITICAL_OVERDUE_MINUTES,
  UPCOMING_WINDOW_MINUTES,
  MAX_RED_ABOVE_FOLD,
};
