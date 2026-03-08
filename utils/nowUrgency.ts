// ============================================================================
// NOW PAGE URGENCY - UI-specific urgency wrappers
// Adapts the core urgency system (utils/urgency.ts) for Now page display
// ============================================================================

import {
  calculateItemUrgency,
  calculateCategoryUrgency,
  applyAboveFoldConstraint,
  createAboveFoldState,
  type ItemUrgency,
  type UrgencyTier,
  type UrgencyTone,
} from './urgency';
import type { CarePlanItemType } from '../types/carePlan';
import { type StatData } from './nowHelpers';

// ============================================================================
// TYPES
// ============================================================================

// Legacy urgency status (for backward compatibility during transition)
export type UrgencyStatus = 'OVERDUE' | 'DUE_SOON' | 'LATER_TODAY' | 'COMPLETE' | 'NOT_APPLICABLE';

export interface UrgencyInfo {
  status: UrgencyStatus;
  label: string;
  proximityLabel?: string;  // "Next in 45 minutes"
  minutesUntil?: number;
  minutesOverdue?: number;
  // Calm Urgency additions
  tier?: UrgencyTier;
  tone?: UrgencyTone;
  itemUrgency?: ItemUrgency;
}

export interface CategoryUrgencyResult {
  status: UrgencyStatus;
  tier: UrgencyTier;
  tone: UrgencyTone;
  label: string;
  isCritical: boolean;
}

// ============================================================================
// ITEM URGENCY
// ============================================================================

/**
 * Calculate urgency status for a single task using Calm Urgency model
 * @param scheduledTime - ISO timestamp or HH:mm time string
 * @param isCompleted - Whether the task is already done
 * @param itemType - Optional: the type of care item for clinical classification
 */
export function getUrgencyStatus(
  scheduledTime: string,
  isCompleted: boolean,
  itemType?: string
): UrgencyInfo {
  if (isCompleted) {
    return {
      status: 'COMPLETE',
      label: 'Done',
      tier: 'info',
      tone: 'neutral',
    };
  }

  if (!scheduledTime) {
    return {
      status: 'NOT_APPLICABLE',
      label: '',
      tier: 'info',
      tone: 'neutral',
    };
  }

  const now = new Date();
  const scheduled = new Date(scheduledTime);

  if (isNaN(scheduled.getTime())) {
    return {
      status: 'NOT_APPLICABLE',
      label: '',
      tier: 'info',
      tone: 'neutral',
    };
  }

  // Use new Calm Urgency system
  const category = (itemType || 'custom') as CarePlanItemType;
  const itemUrgency = calculateItemUrgency({
    category,
    dueAt: scheduled,
    now,
    isCompleted: false,
  });

  const diffMs = scheduled.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / (1000 * 60));

  // Map Calm Urgency tier to legacy UrgencyStatus
  // NO time deltas in primary labels - keeps UI calm
  let legacyStatus: UrgencyStatus;
  let proximityLabel: string | undefined;

  if (itemUrgency.tier === 'critical') {
    legacyStatus = 'OVERDUE';
    // Only critical items show time delta
    const hours = Math.floor(itemUrgency.minutesLate / 60);
    const mins = itemUrgency.minutesLate % 60;
    proximityLabel = hours > 0 ? `${hours}h ${mins}m late` : `${mins}m late`;
  } else if (itemUrgency.tier === 'attention') {
    if (itemUrgency.isOverdue) {
      // Non-critical overdue: NO time delta, just friendly label
      legacyStatus = 'OVERDUE';
      proximityLabel = undefined; // Don't show time in header for non-critical
    } else {
      legacyStatus = 'DUE_SOON';
      const minutesUntil = Math.abs(diffMinutes);
      // For upcoming items, show proximity without time pressure
      proximityLabel = minutesUntil <= 0
        ? 'Ready to log'
        : minutesUntil < 60
          ? `Coming up in ${minutesUntil} min`
          : `Coming up in ${Math.round(minutesUntil / 60)}h`;
    }
  } else {
    legacyStatus = 'LATER_TODAY';
    const hours = Math.floor(Math.abs(diffMinutes) / 60);
    proximityLabel = hours > 0 ? `In about ${hours}h` : 'Later today';
  }

  return {
    status: legacyStatus,
    label: itemUrgency.label,
    proximityLabel,
    minutesUntil: diffMinutes > 0 ? diffMinutes : undefined,
    minutesOverdue: itemUrgency.minutesLate || undefined,
    tier: itemUrgency.tier,
    tone: itemUrgency.tone,
    itemUrgency,
  };
}

// ============================================================================
// CATEGORY URGENCY
// ============================================================================

/**
 * Get urgency status for a category (meds, vitals, etc.) using Calm Urgency
 * Implements above-fold constraint: max 1 red element in top section
 */
export function getCategoryUrgencyStatus(
  instances: any[],
  itemType: string,
  stat: StatData,
  aboveFoldState?: { hasCriticalNextUp: boolean; criticalTileCount: number }
): CategoryUrgencyResult {
  const defaultResult: CategoryUrgencyResult = {
    status: 'NOT_APPLICABLE',
    tier: 'info',
    tone: 'neutral',
    label: '',
    isCritical: false,
  };

  if (stat.total === 0) return defaultResult;

  if (stat.completed === stat.total) {
    return {
      status: 'COMPLETE',
      tier: 'info',
      tone: 'neutral',
      label: 'Complete',
      isCritical: false,
    };
  }

  const pendingInstances = instances.filter(
    i => i.itemType === itemType && i.status === 'pending'
  );

  if (pendingInstances.length === 0) {
    return {
      status: 'COMPLETE',
      tier: 'info',
      tone: 'neutral',
      label: 'Complete',
      isCritical: false,
    };
  }

  // Calculate category urgency using Calm Urgency system
  const category = itemType as CarePlanItemType;
  const categoryUrgency = calculateCategoryUrgency({
    category,
    items: pendingInstances.map(i => ({
      dueAt: i.scheduledTime,
      isCompleted: false,
    })),
  });

  // Apply above-fold constraint if provided
  let finalUrgency = categoryUrgency;
  if (aboveFoldState && categoryUrgency.tier === 'critical') {
    const constraintState = createAboveFoldState(aboveFoldState.hasCriticalNextUp);
    constraintState.criticalTileCount = aboveFoldState.criticalTileCount;
    finalUrgency = applyAboveFoldConstraint(categoryUrgency, constraintState);
  }

  // Map to legacy status
  let legacyStatus: UrgencyStatus;
  if (finalUrgency.tier === 'critical') {
    legacyStatus = 'OVERDUE';
  } else if (finalUrgency.tier === 'attention') {
    legacyStatus = finalUrgency.isOverdue ? 'OVERDUE' : 'DUE_SOON';
  } else {
    legacyStatus = 'LATER_TODAY';
  }

  return {
    status: legacyStatus,
    tier: finalUrgency.tier,
    tone: finalUrgency.tone,
    label: finalUrgency.label,
    isCritical: finalUrgency.tier === 'critical',
  };
}
