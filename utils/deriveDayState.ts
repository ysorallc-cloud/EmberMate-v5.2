// ============================================================================
// DERIVE DAY STATE
// Pure function that computes daily state from CarePlan + logs
// No side effects, fully testable
// Single "Today Engine" - all progress calculations flow through here
// ============================================================================
//
// DEPRECATION NOTICE:
// This file is being deprecated in favor of useCareTasks hook.
// New code should use:
//   - useCareTasks() for task data and stats
//   - useDailyCareInstances() for raw instance access
//
// The new approach provides:
//   - Canonical CarePlanTask interface
//   - Automatic overdue/due-soon detection
//   - Centralized stats via TaskStats
//   - No duplicate calculations across pages
//
// Migration path:
//   1. Import { useCareTasks } from '../hooks/useCareTasks'
//   2. Replace deriveDayState calls with useCareTasks().state
//   3. Access stats via state.stats, tasks via state.tasks
//
// This file will be removed in a future version.
// ============================================================================

import {
  CarePlan,
  CarePlanItem,
  CarePlanOverride,
  DayState,
  DayStateItem,
  DayStateRoutine,
  TimelineEvent,
  ProgressTotal,
  NextAction,
  RoutineStatus,
  ItemStatus,
} from '../types/dayState';
import { Medication } from './medicationStorage';
import { Appointment } from './appointmentStorage';
import {
  VitalsLog,
  MoodLog,
  MealsLog,
  WaterLog,
  SleepLog,
} from './centralStorage';
import {
  LogEvent,
  MedDoseEvent,
  VitalsEvent,
  MoodEvent,
  MealEvent,
  HydrationEvent,
  SleepEvent,
} from './logEvents';

// ============================================================================
// DATA INTEGRITY
// ============================================================================

export interface DataIntegrityWarning {
  type: 'missing_medication' | 'missing_appointment' | 'orphaned_item';
  routineId: string;
  itemId: string;
  message: string;
  missingId?: string;
}

// ============================================================================
// INPUT TYPES
// ============================================================================

export interface DerivationInputs {
  date: string;                     // YYYY-MM-DD
  currentTime: Date;                // For determining routine availability
  carePlan: CarePlan;
  medications: Medication[];
  vitalsLog: VitalsLog | null;
  moodLog: MoodLog | null;
  mealsLog: MealsLog | null;
  waterLog: WaterLog | null;
  sleepLog: SleepLog | null;
  appointments: Appointment[];
  overrides: CarePlanOverride[];

  // New: LogEvents as single source of truth (optional for backward compat)
  logEvents?: LogEvent[];

  // Enable data integrity checking
  validateReferences?: boolean;
}

// ============================================================================
// MAIN DERIVATION FUNCTION
// ============================================================================

/**
 * Derive the complete day state from inputs
 * This is a pure function with no side effects
 * ALL progress calculations flow through this single function
 */
export function deriveDayState(inputs: DerivationInputs): DayState & { integrityWarnings?: DataIntegrityWarning[] } {
  const {
    date,
    currentTime,
    carePlan,
    medications,
    vitalsLog,
    moodLog,
    mealsLog,
    waterLog,
    sleepLog,
    appointments,
    overrides,
    logEvents,
    validateReferences = false,
  } = inputs;

  // Data integrity warnings
  const integrityWarnings: DataIntegrityWarning[] = [];

  // Build lookup sets for validation
  const activeMedIds = new Set(medications.filter(m => m.active !== false).map(m => m.id));
  const appointmentIds = new Set(appointments.map(a => a.id));

  // Pre-process logEvents for faster lookup
  const todayLogEvents = logEvents?.filter(e => e.date === date) || [];
  const medDoseEvents = todayLogEvents.filter(e => e.type === 'medDose') as MedDoseEvent[];
  const vitalsEvents = todayLogEvents.filter(e => e.type === 'vitals') as VitalsEvent[];
  const moodEvents = todayLogEvents.filter(e => e.type === 'mood') as MoodEvent[];
  const mealEvents = todayLogEvents.filter(e => e.type === 'meal') as MealEvent[];
  const hydrationEvents = todayLogEvents.filter(e => e.type === 'hydration') as HydrationEvent[];
  const sleepEvents = todayLogEvents.filter(e => e.type === 'sleep') as SleepEvent[];

  // Initialize progress totals
  const progress: DayState['progress'] = {
    meds: { completed: 0, expected: 0 },
    vitals: { completed: 0, expected: 0 },
    meals: { completed: 0, expected: 0 },
    mood: { completed: 0, expected: 0 },
    hydration: { completed: 0, expected: 0 },
    sleep: { completed: 0, expected: 0 },
  };

  // Process each routine
  const routines: DayStateRoutine[] = carePlan.routines.map(routine => {
    const routineStatus = getRoutineStatus(routine.timeWindow, currentTime);

    const items: DayStateItem[] = routine.items.map(item => {
      // Validate references if enabled
      if (validateReferences) {
        if (item.type === 'meds' && item.metadata?.medicationIds) {
          for (const medId of item.metadata.medicationIds) {
            if (!activeMedIds.has(medId)) {
              integrityWarnings.push({
                type: 'missing_medication',
                routineId: routine.id,
                itemId: item.id,
                message: `Medication removed from "${item.label}"`,
                missingId: medId,
              });
            }
          }
        }
        if (item.type === 'appointment' && item.metadata?.appointmentId) {
          if (!appointmentIds.has(item.metadata.appointmentId)) {
            integrityWarnings.push({
              type: 'missing_appointment',
              routineId: routine.id,
              itemId: item.id,
              message: `Appointment removed from "${item.label}"`,
              missingId: item.metadata.appointmentId,
            });
          }
        }
      }

      // Calculate completion using logEvents if available, otherwise fall back to logs
      const { completed, expected } = logEvents
        ? calculateItemCompletionFromEvents(
            item,
            medications,
            medDoseEvents,
            vitalsEvents,
            moodEvents,
            mealEvents,
            hydrationEvents,
            sleepEvents
          )
        : calculateItemCompletion(
            item,
            medications,
            vitalsLog,
            moodLog,
            mealsLog,
            waterLog,
            sleepLog
          );

      // Check for override
      const override = overrides.find(
        o => o.routineId === routine.id && o.itemId === item.id
      );

      // Determine final status (override wins)
      let finalCompleted = completed;
      let isOverridden = false;
      if (override) {
        finalCompleted = override.done ? expected : 0;
        isOverridden = true;
      }

      // Calculate status
      const status = getItemStatus(finalCompleted, expected);
      const statusText = getItemStatusText(finalCompleted, expected, status, item.type);

      // Accumulate to progress totals
      accumulateProgress(progress, item.type, finalCompleted, expected);

      return {
        itemId: item.id,
        routineId: routine.id,
        type: item.type,
        label: item.label,
        emoji: item.emoji,
        link: item.link,
        completed: finalCompleted,
        expected,
        status,
        statusText,
        isOverridden,
      };
    });

    const completedCount = items.filter(i => i.status === 'done').length;
    const totalCount = items.length;

    // Adjust routine status if all items are done
    const adjustedStatus = completedCount === totalCount && totalCount > 0
      ? 'completed'
      : routineStatus;

    return {
      routineId: routine.id,
      name: routine.name,
      emoji: routine.emoji,
      timeWindow: routine.timeWindow,
      status: adjustedStatus,
      items,
      completedCount,
      totalCount,
    };
  });

  // Build timeline
  const timeline = buildTimeline(routines, appointments, date, currentTime);

  // Determine next action
  const nextAction = findNextAction(routines);

  // Check if all complete
  const allComplete = routines.every(r => r.status === 'completed');

  return {
    date,
    progress,
    routines,
    timeline,
    nextAction,
    allComplete,
    integrityWarnings: integrityWarnings.length > 0 ? integrityWarnings : undefined,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Determine routine status based on time window
 */
function getRoutineStatus(
  timeWindow: { start: string; end: string },
  currentTime: Date
): RoutineStatus {
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

  const [startHour, startMin] = timeWindow.start.split(':').map(Number);
  const [endHour, endMin] = timeWindow.end.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  if (currentMinutes < startMinutes) {
    return 'upcoming';
  } else if (currentMinutes <= endMinutes) {
    return 'available';
  } else {
    return 'completed'; // Past time window
  }
}

/**
 * Calculate completion for an item based on its type
 */
function calculateItemCompletion(
  item: CarePlanItem,
  medications: Medication[],
  vitalsLog: VitalsLog | null,
  moodLog: MoodLog | null,
  mealsLog: MealsLog | null,
  waterLog: WaterLog | null,
  sleepLog: SleepLog | null
): { completed: number; expected: number } {
  const expected = item.target;

  switch (item.type) {
    case 'meds': {
      // Count medications taken that match the time slot
      const timeSlot = item.metadata?.timeSlot;
      const activeMeds = medications.filter(m => m.active !== false);

      let relevantMeds: Medication[];
      if (timeSlot) {
        relevantMeds = activeMeds.filter(m => m.timeSlot === timeSlot);
      } else if (item.metadata?.medicationIds?.length) {
        relevantMeds = activeMeds.filter(m =>
          item.metadata?.medicationIds?.includes(m.id)
        );
      } else {
        // If no filter, count all meds
        relevantMeds = activeMeds;
      }

      const completed = relevantMeds.filter(m => m.taken).length;
      return { completed, expected };
    }

    case 'vitals': {
      // Count vitals that were logged
      let completed = 0;
      if (vitalsLog) {
        const vitalTypes = item.metadata?.vitalTypes || [
          'systolic', 'diastolic', 'glucose', 'heartRate', 'temperature', 'oxygen', 'weight'
        ];

        // Track BP separately to avoid double counting (don't mutate input array!)
        let bpCounted = false;
        for (const type of vitalTypes) {
          if (type === 'systolic' || type === 'diastolic') {
            // BP counts as one check if either is present
            if ((vitalsLog.systolic || vitalsLog.diastolic) && !bpCounted) {
              completed++;
              bpCounted = true;
            }
          } else if (vitalsLog[type as keyof VitalsLog]) {
            completed++;
          }
        }
      }
      return { completed: Math.min(completed, expected), expected };
    }

    case 'meals': {
      // Count meals logged that match meal types
      let completed = 0;
      if (mealsLog?.meals) {
        const mealTypes = item.metadata?.mealTypes;
        if (mealTypes?.length) {
          completed = mealsLog.meals.filter(m =>
            mealTypes.includes(m)
          ).length;
        } else {
          completed = mealsLog.meals.length;
        }
      }
      return { completed: Math.min(completed, expected), expected };
    }

    case 'mood': {
      // Binary: logged or not
      const completed = (moodLog?.mood !== null && moodLog?.mood !== undefined) ? 1 : 0;
      return { completed, expected };
    }

    case 'hydration': {
      const completed = waterLog?.glasses || 0;
      return { completed: Math.min(completed, expected), expected };
    }

    case 'sleep': {
      const completed = sleepLog?.hours ? 1 : 0;
      return { completed, expected };
    }

    case 'appointment': {
      // Appointments use hybrid completion (derived + manual)
      // For now, just check if completed
      return { completed: 0, expected };
    }

    case 'custom':
    default: {
      // Custom items rely on overrides
      return { completed: 0, expected };
    }
  }
}

/**
 * Calculate item completion from logEvents (single source of truth)
 * This is the preferred method when logEvents are available
 */
function calculateItemCompletionFromEvents(
  item: CarePlanItem,
  medications: Medication[],
  medDoseEvents: MedDoseEvent[],
  vitalsEvents: VitalsEvent[],
  moodEvents: MoodEvent[],
  mealEvents: MealEvent[],
  hydrationEvents: HydrationEvent[],
  sleepEvents: SleepEvent[]
): { completed: number; expected: number } {
  const expected = item.target;

  switch (item.type) {
    case 'meds': {
      // Count med dose events that match the time slot or medication IDs
      const timeSlot = item.metadata?.timeSlot;
      const medIds = item.metadata?.medicationIds;

      let relevantDoses: MedDoseEvent[];
      if (medIds?.length) {
        relevantDoses = medDoseEvents.filter(e =>
          e.taken && medIds.includes(e.medicationId)
        );
      } else if (timeSlot) {
        // Filter by medications with matching time slot
        const activeMeds = medications.filter(m => m.active !== false && m.timeSlot === timeSlot);
        const slotMedIds = new Set(activeMeds.map(m => m.id));
        relevantDoses = medDoseEvents.filter(e => e.taken && slotMedIds.has(e.medicationId));
      } else {
        relevantDoses = medDoseEvents.filter(e => e.taken);
      }

      // Count unique medications taken (not duplicate doses)
      const uniqueMedsTaken = new Set(relevantDoses.map(e => e.medicationId));
      return { completed: uniqueMedsTaken.size, expected };
    }

    case 'vitals': {
      // Check if any vitals were logged
      let completed = 0;
      const vitalTypes = item.metadata?.vitalTypes || ['systolic', 'glucose', 'heartRate', 'weight'];
      let bpCounted = false;

      for (const event of vitalsEvents) {
        for (const type of vitalTypes) {
          if (type === 'systolic' || type === 'diastolic') {
            if ((event.systolic || event.diastolic) && !bpCounted) {
              completed++;
              bpCounted = true;
            }
          } else if (event[type as keyof VitalsEvent]) {
            completed++;
          }
        }
      }
      return { completed: Math.min(completed, expected), expected };
    }

    case 'meals': {
      // Count meal events that match meal types
      const mealTypes = item.metadata?.mealTypes;
      let relevantMeals: MealEvent[];

      if (mealTypes?.length) {
        relevantMeals = mealEvents.filter(e =>
          mealTypes.includes(e.mealType) ||
          mealTypes.map((t: string) => t.toLowerCase()).includes(e.mealType.toLowerCase())
        );
      } else {
        relevantMeals = mealEvents;
      }

      return { completed: Math.min(relevantMeals.length, expected), expected };
    }

    case 'mood': {
      // Binary: any mood logged today
      const completed = moodEvents.length > 0 ? 1 : 0;
      return { completed, expected };
    }

    case 'hydration': {
      // Sum all hydration events
      const totalGlasses = hydrationEvents.reduce((sum, e) => sum + e.glasses, 0);
      return { completed: Math.min(totalGlasses, expected), expected };
    }

    case 'sleep': {
      const completed = sleepEvents.length > 0 ? 1 : 0;
      return { completed, expected };
    }

    case 'appointment':
    case 'custom':
    default: {
      return { completed: 0, expected };
    }
  }
}

/**
 * Get item status based on completion
 */
function getItemStatus(completed: number, expected: number): ItemStatus {
  if (completed >= expected) return 'done';
  if (completed > 0) return 'partial';
  return 'pending';
}

/**
 * Get status text for display
 */
function getItemStatusText(
  completed: number,
  expected: number,
  status: ItemStatus,
  type: CarePlanItem['type']
): string {
  if (status === 'done') {
    if (type === 'mood' || type === 'sleep') {
      return '✓ Logged';
    }
    return `${completed}/${expected} ✓`;
  }

  if (status === 'partial') {
    return `${completed}/${expected}`;
  }

  // Pending
  return 'Tap to log';
}

/**
 * Accumulate item completion to progress totals
 */
function accumulateProgress(
  progress: DayState['progress'],
  type: CarePlanItem['type'],
  completed: number,
  expected: number
): void {
  const key = getProgressKey(type);
  if (key && progress[key]) {
    progress[key].completed += completed;
    progress[key].expected += expected;
  }
}

/**
 * Map item type to progress key
 */
function getProgressKey(type: CarePlanItem['type']): keyof DayState['progress'] | null {
  switch (type) {
    case 'meds': return 'meds';
    case 'vitals': return 'vitals';
    case 'meals': return 'meals';
    case 'mood': return 'mood';
    case 'hydration': return 'hydration';
    case 'sleep': return 'sleep';
    default: return null;
  }
}

/**
 * Build timeline from routines and appointments
 */
function buildTimeline(
  routines: DayStateRoutine[],
  appointments: Appointment[],
  date: string,
  currentTime: Date
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // Add routine events
  for (const routine of routines) {
    events.push({
      id: `routine-${routine.routineId}`,
      type: 'routine',
      title: routine.name,
      subtitle: `${routine.completedCount}/${routine.totalCount} items`,
      time: routine.timeWindow.start,
      timeDate: parseTimeToDate(routine.timeWindow.start, date),
      status: routine.status,
      routineId: routine.routineId,
      emoji: routine.emoji,
    });
  }

  // Add appointment events
  for (const appt of appointments) {
    const apptDate = new Date(appt.date).toISOString().split('T')[0];
    if (apptDate !== date) continue;

    const apptTime = parseTimeToDate(appt.time, date);
    let status: RoutineStatus = 'upcoming';

    if (appt.completed) {
      status = 'completed';
    } else if (currentTime > apptTime) {
      status = 'available'; // Past but not marked complete
    }

    events.push({
      id: `appt-${appt.id}`,
      type: 'appointment',
      title: appt.title || `${appt.specialty} with ${appt.provider}`,
      subtitle: appt.location || '',
      time: appt.time,
      timeDate: apptTime,
      status,
      appointmentId: appt.id,
      emoji: '📅',
    });
  }

  // Sort by time
  events.sort((a, b) => a.timeDate.getTime() - b.timeDate.getTime());

  return events;
}

/**
 * Parse time string to Date object
 */
function parseTimeToDate(time: string, date: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

/**
 * Find the next action to suggest
 */
function findNextAction(routines: DayStateRoutine[]): NextAction | null {
  // Find the first available routine with pending items
  for (const routine of routines) {
    if (routine.status === 'available' || routine.status === 'upcoming') {
      const pendingItem = routine.items.find(i => i.status !== 'done');
      if (pendingItem) {
        const remaining = routine.totalCount - routine.completedCount;
        return {
          label: `${pendingItem.label} (${remaining} remaining)`,
          routineId: routine.routineId,
          itemId: pendingItem.itemId,
          link: pendingItem.link,
          emoji: pendingItem.emoji,
        };
      }
    }
  }

  // No pending items found
  return null;
}

// ============================================================================
// EMPTY STATE HELPERS
// ============================================================================

/**
 * Create an empty day state (when no care plan exists)
 */
export function createEmptyDayState(date: string): DayState {
  return {
    date,
    progress: {
      meds: { completed: 0, expected: 0 },
      vitals: { completed: 0, expected: 0 },
      meals: { completed: 0, expected: 0 },
      mood: { completed: 0, expected: 0 },
      hydration: { completed: 0, expected: 0 },
      sleep: { completed: 0, expected: 0 },
    },
    routines: [],
    timeline: [],
    nextAction: null,
    allComplete: false,
  };
}
