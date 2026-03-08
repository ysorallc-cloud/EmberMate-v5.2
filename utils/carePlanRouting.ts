// ============================================================================
// CARE PLAN ROUTING
// Maps CarePlan items to correct log screens with context params
// ============================================================================

import { CarePlanItemType } from '../types/dayState';
import { ScheduleEntry } from '../types/schedule';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Context payload passed through navigation from CarePlan
 * Log screens use this to pre-populate and track progress
 */
export interface CarePlanNavigationContext {
  source: 'careplan';
  carePlanItemId: string;
  routineId: string;
  routineName?: string;
  label: string;
  kind: CarePlanItemType;
  timeWindowStart?: string;
  timeWindowEnd?: string;
  targetCount?: number;
  completed?: number;
  metadata?: Record<string, any>;
}

/**
 * Route configuration for a CarePlan item
 */
export interface CarePlanRoute {
  pathname: string;
  params: Record<string, string>;
}

// ============================================================================
// ROUTE MAPPING
// ============================================================================

/**
 * Map CarePlan item type to the correct log screen route
 */
const ITEM_TYPE_ROUTES: Record<CarePlanItemType, string> = {
  meds: '/medications',  // Route to canonical Understand medications screen
  vitals: '/log-vitals',
  meals: '/log-meal',
  mood: '/log-morning-wellness',  // Mood captured within wellness checks
  sleep: '/log-sleep',
  hydration: '/log-water',
  wellness: '/log-morning-wellness',
  appointment: '/appointments',  // Route to canonical Understand appointments screen
  custom: '/log-evening-wellness',
};

/**
 * Get the route and params for a CarePlan item
 * This is the PRIMARY function for routing from Now → Log screens
 */
export function routeForCarePlanItem(
  itemType: CarePlanItemType,
  context: Omit<CarePlanNavigationContext, 'source' | 'kind'>
): CarePlanRoute {
  const pathname = ITEM_TYPE_ROUTES[itemType] || '/log-evening-wellness';

  // Build params object - convert all values to strings for URL params
  const params: Record<string, string> = {
    source: 'careplan',
    carePlanItemId: context.carePlanItemId,
    routineId: context.routineId,
    label: context.label,
    kind: itemType,
  };

  if (context.routineName) {
    params.routineName = context.routineName;
  }

  if (context.timeWindowStart) {
    params.timeWindowStart = context.timeWindowStart;
  }

  if (context.timeWindowEnd) {
    params.timeWindowEnd = context.timeWindowEnd;
  }

  if (context.targetCount !== undefined) {
    params.targetCount = String(context.targetCount);
  }

  if (context.completed !== undefined) {
    params.completed = String(context.completed);
  }

  // Add metadata as JSON string if present
  if (context.metadata) {
    params.metadata = JSON.stringify(context.metadata);
  }

  return { pathname, params };
}

/**
 * Get route from a ScheduleEntry (used by Now page)
 */
export function routeForScheduleEntry(entry: ScheduleEntry): CarePlanRoute | null {
  // Only handle care plan items
  if (entry.source !== 'carePlan' || !entry.routineId || !entry.itemId) {
    return null;
  }

  const itemType = entry.itemType as CarePlanItemType;
  if (!itemType) {
    return null;
  }

  return routeForCarePlanItem(itemType, {
    carePlanItemId: entry.itemId,
    routineId: entry.routineId,
    label: entry.title,
    timeWindowStart: entry.startMin !== undefined ? minutesToTimeString(entry.startMin) : undefined,
    timeWindowEnd: entry.endMin !== undefined ? minutesToTimeString(entry.endMin) : undefined,
    targetCount: entry.expected,
    completed: entry.completed,
  });
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Convert minutes from midnight to HH:MM string
 */
function minutesToTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Parse CarePlan context from route params
 * Used by log screens to read navigation context
 */
export function parseCarePlanContext(
  params: Record<string, string | string[] | undefined>
): CarePlanNavigationContext | null {
  // Check if this is a CarePlan navigation
  if (params.source !== 'careplan' || !params.carePlanItemId || !params.routineId) {
    return null;
  }

  const context: CarePlanNavigationContext = {
    source: 'careplan',
    carePlanItemId: String(params.carePlanItemId),
    routineId: String(params.routineId),
    label: String(params.label || ''),
    kind: (params.kind as CarePlanItemType) || 'custom',
  };

  if (params.routineName) {
    context.routineName = String(params.routineName);
  }

  if (params.timeWindowStart) {
    context.timeWindowStart = String(params.timeWindowStart);
  }

  if (params.timeWindowEnd) {
    context.timeWindowEnd = String(params.timeWindowEnd);
  }

  if (params.targetCount) {
    context.targetCount = parseInt(String(params.targetCount), 10);
  }

  if (params.completed) {
    context.completed = parseInt(String(params.completed), 10);
  }

  if (params.metadata) {
    try {
      context.metadata = JSON.parse(String(params.metadata));
    } catch {
      // Ignore parse errors
    }
  }

  return context;
}

/**
 * Get display text for "From Care Plan" banner
 */
export function getCarePlanBannerText(context: CarePlanNavigationContext): string {
  const { routineName, label, completed, targetCount } = context;

  if (routineName) {
    return `Part of ${routineName}`;
  }

  if (completed !== undefined && targetCount !== undefined) {
    return `${completed} of ${targetCount} logged today`;
  }

  return label || 'From Care Plan';
}

/**
 * Get pre-selection hints based on CarePlan context
 */
export function getPreSelectionHints(context: CarePlanNavigationContext): {
  mealType?: string;
  vitalTypes?: string[];
  timeSlot?: string;
} {
  const hints: {
    mealType?: string;
    vitalTypes?: string[];
    timeSlot?: string;
  } = {};

  // Extract from metadata if present
  if (context.metadata) {
    if (context.metadata.mealTypes && context.metadata.mealTypes.length > 0) {
      hints.mealType = context.metadata.mealTypes[0];
    }
    if (context.metadata.vitalTypes) {
      hints.vitalTypes = context.metadata.vitalTypes;
    }
    if (context.metadata.timeSlot) {
      hints.timeSlot = context.metadata.timeSlot;
    }
  }

  // Infer from label if not in metadata
  if (!hints.mealType && context.kind === 'meals') {
    const label = context.label.toLowerCase();
    if (label.includes('breakfast')) hints.mealType = 'Breakfast';
    else if (label.includes('lunch')) hints.mealType = 'Lunch';
    else if (label.includes('dinner')) hints.mealType = 'Dinner';
    else if (label.includes('snack')) hints.mealType = 'Snack';
  }

  // Infer time slot from time window or label
  if (!hints.timeSlot) {
    const label = context.label.toLowerCase();
    if (label.includes('morning')) hints.timeSlot = 'morning';
    else if (label.includes('afternoon')) hints.timeSlot = 'afternoon';
    else if (label.includes('evening')) hints.timeSlot = 'evening';
    else if (label.includes('bedtime') || label.includes('night')) hints.timeSlot = 'bedtime';
    else if (context.timeWindowStart) {
      // Infer from time window
      const hour = parseInt(context.timeWindowStart.split(':')[0], 10);
      if (hour < 12) hints.timeSlot = 'morning';
      else if (hour < 17) hints.timeSlot = 'afternoon';
      else hints.timeSlot = 'evening';
    }
  }

  return hints;
}
