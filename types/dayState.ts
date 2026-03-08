// ============================================================================
// DAY STATE & ROUTINE-BASED CARE PLAN TYPES
// Routine-based architecture types (time-windowed routines + derived state).
// Separated from types/carePlan.ts (regimen-based architecture) to avoid
// naming conflicts. No file should import from both.
// ============================================================================

// Item types that can be tracked in a routine-based care plan
export type CarePlanItemType =
  | 'meds'
  | 'vitals'
  | 'meals'
  | 'mood'
  | 'sleep'
  | 'hydration'
  | 'appointment'
  | 'wellness'
  | 'custom';

// How completion is determined
export type CompletionRule = 'derived' | 'manual' | 'hybrid';

// Individual trackable item within a routine
export interface CarePlanItem {
  id: string;
  type: CarePlanItemType;
  label: string;                    // Display name
  emoji?: string;                   // Optional emoji for the item
  target: number;                   // Expected count per day/window
  completionRule: CompletionRule;
  link: string;                     // Navigation route (e.g., '/log-vitals')
  metadata?: {
    vitalTypes?: string[];          // Which vitals count (BP, glucose, etc.)
    medicationIds?: string[];       // Which meds belong to this routine
    mealTypes?: string[];           // breakfast, lunch, dinner, snack
    timeSlot?: string;              // morning, afternoon, evening, bedtime
    appointmentId?: string;         // Link to specific appointment
  };
}

// Time-based routine (Morning, Evening, etc.)
export interface CarePlanRoutine {
  id: string;
  name: string;                     // "Morning Routine", "Evening Routine"
  emoji: string;                    // Visual identifier
  timeWindow: {
    start: string;                  // "06:00" (24hr format)
    end: string;                    // "10:00"
  };
  items: CarePlanItem[];
}

// The full routine-based care plan
export interface CarePlan {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  routines: CarePlanRoutine[];
}

// Manual override for an item
export interface CarePlanOverride {
  date: string;                     // YYYY-MM-DD
  routineId: string;
  itemId: string;
  done: boolean;
  timestamp: string;
  // Snooze support ("Later" action)
  snoozeUntilMin?: number;          // Minutes from midnight when snooze expires
  // Today's Scope: temporarily hide from Now/Record without editing Care Plan
  suppressed?: boolean;             // true = hidden from today's timeline
}

// ============================================================================
// DERIVED STATE TYPES (computed from CarePlan + logs)
// ============================================================================

// Status of an individual item
export type ItemStatus = 'done' | 'pending' | 'partial';

// Derived status for a single item
export interface DayStateItem {
  itemId: string;
  routineId: string;
  type: CarePlanItemType;
  label: string;
  emoji?: string;
  link: string;
  completed: number;
  expected: number;
  status: ItemStatus;
  statusText: string;               // "2/3 logged" or "Tap to log"
  isOverridden: boolean;
}

// Status of a routine based on time and completion
export type RoutineStatus = 'upcoming' | 'available' | 'completed';

// Derived state for a routine
export interface DayStateRoutine {
  routineId: string;
  name: string;
  emoji: string;
  timeWindow: { start: string; end: string };
  status: RoutineStatus;
  items: DayStateItem[];
  completedCount: number;
  totalCount: number;
}

// Timeline event for Now page
export interface TimelineEvent {
  id: string;
  type: 'routine' | 'appointment';
  title: string;
  subtitle: string;
  time: string;
  timeDate: Date;                   // For sorting
  status: RoutineStatus;
  routineId?: string;
  appointmentId?: string;
  emoji?: string;
}

// Progress totals for a category
export interface ProgressTotal {
  completed: number;
  expected: number;
}

// Next suggested action
export interface NextAction {
  label: string;
  routineId?: string;
  itemId?: string;
  link?: string;
  emoji?: string;
}

// Complete derived state for a day
export interface DayState {
  date: string;
  progress: {
    meds: ProgressTotal;
    vitals: ProgressTotal;
    meals: ProgressTotal;
    mood: ProgressTotal;
    hydration: ProgressTotal;
    sleep: ProgressTotal;
  };
  routines: DayStateRoutine[];
  timeline: TimelineEvent[];
  nextAction: NextAction | null;
  allComplete: boolean;
}

// ============================================================================
// HELPER TYPE GUARDS
// ============================================================================

export function isCarePlanItem(item: any): item is CarePlanItem {
  return (
    typeof item === 'object' &&
    typeof item.id === 'string' &&
    typeof item.type === 'string' &&
    typeof item.label === 'string' &&
    typeof item.target === 'number' &&
    typeof item.completionRule === 'string' &&
    typeof item.link === 'string'
  );
}

export function isCarePlanRoutine(routine: any): routine is CarePlanRoutine {
  return (
    typeof routine === 'object' &&
    typeof routine.id === 'string' &&
    typeof routine.name === 'string' &&
    typeof routine.emoji === 'string' &&
    typeof routine.timeWindow === 'object' &&
    Array.isArray(routine.items)
  );
}

export function isCarePlan(plan: any): plan is CarePlan {
  return (
    typeof plan === 'object' &&
    typeof plan.id === 'string' &&
    typeof plan.version === 'number' &&
    Array.isArray(plan.routines)
  );
}
