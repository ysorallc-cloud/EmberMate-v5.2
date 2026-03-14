// types/derived.ts
// UI-derived state types. Computed from CarePlan + logs.
// Replaces types/dayState.ts derived section.

import type { CarePlanItemType } from './carePlan';

export type CompletionRule = 'derived' | 'manual' | 'hybrid';
export type ItemStatus = 'done' | 'pending' | 'partial';
export type RoutineStatus = 'upcoming' | 'available' | 'completed';

export interface RoutineCarePlanItem {
  id: string;
  type: CarePlanItemType;
  label: string;
  emoji?: string;
  target: number;
  completionRule: CompletionRule;
  link: string;
  metadata?: {
    vitalTypes?: string[];
    medicationIds?: string[];
    mealTypes?: string[];
    timeSlot?: string;
    appointmentId?: string;
  };
}

export interface CarePlanRoutine {
  id: string;
  name: string;
  emoji: string;
  timeWindow: { start: string; end: string };
  items: RoutineCarePlanItem[];
}

export interface RoutineCarePlan {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  routines: CarePlanRoutine[];
}

export interface CarePlanOverride {
  date: string;
  routineId: string;
  itemId: string;
  done: boolean;
  timestamp: string;
  snoozeUntilMin?: number;
  suppressed?: boolean;
}

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
  statusText: string;
  isOverridden: boolean;
}

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

export interface TimelineEvent {
  id: string;
  type: 'routine' | 'appointment';
  title: string;
  subtitle: string;
  time: string;
  timeDate: Date;
  status: RoutineStatus;
  routineId?: string;
  appointmentId?: string;
  emoji?: string;
}

export interface ProgressTotal {
  completed: number;
  expected: number;
}

export interface NextAction {
  label: string;
  routineId?: string;
  itemId?: string;
  link?: string;
  emoji?: string;
}

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

// Type guards
export function isRoutineCarePlanItem(item: any): item is RoutineCarePlanItem {
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

export function isRoutineCarePlan(plan: any): plan is RoutineCarePlan {
  return (
    typeof plan === 'object' &&
    typeof plan.id === 'string' &&
    typeof plan.version === 'number' &&
    Array.isArray(plan.routines)
  );
}
