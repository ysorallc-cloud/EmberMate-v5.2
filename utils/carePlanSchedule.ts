// ============================================================================
// CARE PLAN SCHEDULE
// Pure function to derive Care Plan Schedule from CarePlan + Appointments
// Single source of truth for the Now page timeline
// ============================================================================

import {
  ScheduleEntry,
  ScheduleStatus,
  ScheduleSource,
  ScheduleActionType,
  timeToMinutes,
  formatMinutesAsTime,
} from '../types/schedule';
import {
  DayState,
  DayStateRoutine,
  DayStateItem,
  CarePlan,
  CarePlanOverride,
} from '../types/dayState';
import { Appointment } from './appointmentStorage';

// ============================================================================
// TYPES
// ============================================================================

export interface ScheduleDerivationInputs {
  dayState: DayState | null;
  carePlan: CarePlan | null;
  appointments: Appointment[];
  overrides: CarePlanOverride[];
  currentTime: Date;
}

// ============================================================================
// MAIN DERIVATION FUNCTION
// ============================================================================

/**
 * Derive unified schedule entries from CarePlan dayState and appointments
 * This is the SINGLE SOURCE OF TRUTH for the Care Plan Schedule
 *
 * Rules:
 * - Uses dayState.routines as base for CarePlan entries
 * - Normalizes each item into a ScheduleEntry
 * - Merges appointments into the same list
 * - Computes status based on time window and completion
 *
 * @param inputs - All data needed for derivation
 * @returns Sorted array of ScheduleEntry
 */
export function deriveScheduleEntries(
  inputs: ScheduleDerivationInputs
): ScheduleEntry[] {
  const { dayState, carePlan, appointments, overrides, currentTime } = inputs;

  const entries: ScheduleEntry[] = [];
  const currentMin = currentTime.getHours() * 60 + currentTime.getMinutes();
  const today = currentTime.toISOString().split('T')[0];

  // =========================================================================
  // CARE PLAN ENTRIES
  // =========================================================================
  if (dayState && carePlan) {
    for (const routine of dayState.routines) {
      const startMin = timeToMinutes(routine.timeWindow.start);
      const endMin = timeToMinutes(routine.timeWindow.end);

      for (const item of routine.items) {
        // Check for snooze override
        const snoozeOverride = overrides.find(
          o => o.routineId === routine.routineId &&
               o.itemId === item.itemId &&
               o.snoozeUntilMin !== undefined
        );

        const snoozedUntilMin = snoozeOverride?.snoozeUntilMin;

        // Determine status
        const status = deriveItemStatus(
          item,
          startMin,
          endMin,
          currentMin,
          snoozedUntilMin
        );

        // Determine action configuration
        const { actionLabel, actionType, actionRoute } = getItemAction(item);

        entries.push({
          id: `careplan-${routine.routineId}-${item.itemId}`,
          source: 'carePlan',

          title: item.label,
          subtitle: formatTimeWindow(routine.timeWindow.start, routine.timeWindow.end),
          emoji: item.emoji,

          startMin,
          endMin,

          status,

          completed: item.completed,
          expected: item.expected,

          routineId: routine.routineId,
          itemId: item.itemId,
          itemType: item.type,

          actionLabel,
          actionType,
          actionRoute: item.link || actionRoute,

          snoozedUntilMin,
        });
      }
    }
  }

  // =========================================================================
  // APPOINTMENT ENTRIES
  // =========================================================================
  for (const appt of appointments) {
    const apptDate = new Date(appt.date).toISOString().split('T')[0];
    if (apptDate !== today) continue;

    const apptMin = appt.time ? timeToMinutes(appt.time) : 12 * 60; // Default noon

    // Determine appointment status
    let status: ScheduleStatus;
    if (appt.completed) {
      status = 'completed';
    } else if (currentMin > apptMin + 60) {
      // Past appointment time by > 1 hour
      status = 'missed';
    } else if (currentMin >= apptMin - 30) {
      // Within 30 min of appointment
      status = 'availableNow';
    } else {
      status = 'upcoming';
    }

    entries.push({
      id: `appointment-${appt.id}`,
      source: 'appointment',

      title: appt.title || `${appt.specialty} with ${appt.provider}`,
      subtitle: appt.location || formatMinutesAsTime(apptMin),
      emoji: '📅',

      startMin: apptMin,
      dueMin: apptMin,

      status,

      appointmentId: appt.id,

      actionLabel: 'Details',
      actionType: 'open',
      actionRoute: `/appointment/${appt.id}`,
    });
  }

  // =========================================================================
  // SORT AND RETURN
  // =========================================================================
  return sortScheduleEntries(entries);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Derive status for a Care Plan item based on time window and completion
 */
function deriveItemStatus(
  item: DayStateItem,
  startMin: number,
  endMin: number,
  currentMin: number,
  snoozedUntilMin?: number
): ScheduleStatus {
  // Check if completed
  if (item.status === 'done') {
    return 'completed';
  }

  // Check if snoozed
  if (snoozedUntilMin !== undefined) {
    if (currentMin < snoozedUntilMin) {
      return 'snoozed';
    }
    // Snooze expired - fall through to normal logic
  }

  // Time-based status
  if (currentMin < startMin) {
    return 'upcoming';
  } else if (currentMin <= endMin) {
    return 'availableNow';
  } else {
    // Past end time and not complete = missed
    return 'missed';
  }
}

/**
 * Get action configuration for a Care Plan item
 */
function getItemAction(item: DayStateItem): {
  actionLabel: string;
  actionType: ScheduleActionType;
  actionRoute: string;
} {
  switch (item.type) {
    case 'meds':
      return {
        actionLabel: 'Log',
        actionType: 'log',
        actionRoute: '/medication-confirm',
      };
    case 'vitals':
      return {
        actionLabel: 'Log',
        actionType: 'log',
        actionRoute: '/log-vitals',
      };
    case 'meals':
      return {
        actionLabel: 'Log',
        actionType: 'log',
        actionRoute: '/log-meal',
      };
    case 'mood':
      return {
        actionLabel: 'Log',
        actionType: 'log',
        actionRoute: '/log-mood',
      };
    case 'sleep':
      return {
        actionLabel: 'Log',
        actionType: 'log',
        actionRoute: '/log-sleep',
      };
    case 'hydration':
      return {
        actionLabel: 'Log',
        actionType: 'log',
        actionRoute: '/log-water',
      };
    case 'appointment':
      return {
        actionLabel: 'Details',
        actionType: 'open',
        actionRoute: '/appointment-form',
      };
    case 'custom':
    default:
      return {
        actionLabel: 'Mark done',
        actionType: 'complete',
        actionRoute: '',
      };
  }
}

/**
 * Format time window for display
 */
function formatTimeWindow(start: string, end: string): string {
  return `${formatMinutesAsTime(timeToMinutes(start))} - ${formatMinutesAsTime(timeToMinutes(end))}`;
}

/**
 * Sort schedule entries by priority:
 * 1. availableNow (by startMin)
 * 2. missed (needs attention)
 * 3. upcoming (by startMin)
 * 4. snoozed (by snooze expiry)
 * 5. completed (by startMin)
 */
function sortScheduleEntries(entries: ScheduleEntry[]): ScheduleEntry[] {
  const statusPriority: Record<ScheduleStatus, number> = {
    availableNow: 0,
    missed: 1,
    upcoming: 2,
    snoozed: 3,
    info: 4,
    completed: 5,
  };

  return entries.sort((a, b) => {
    // First sort by status priority
    const priorityDiff = statusPriority[a.status] - statusPriority[b.status];
    if (priorityDiff !== 0) return priorityDiff;

    // Within same status, sort by time
    return a.startMin - b.startMin;
  });
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Get schedule entries grouped by status
 */
export function groupScheduleByStatus(entries: ScheduleEntry[]): {
  active: ScheduleEntry[];      // availableNow + missed
  upcoming: ScheduleEntry[];
  snoozed: ScheduleEntry[];
  completed: ScheduleEntry[];
} {
  return {
    active: entries.filter(e => e.status === 'availableNow' || e.status === 'missed'),
    upcoming: entries.filter(e => e.status === 'upcoming'),
    snoozed: entries.filter(e => e.status === 'snoozed'),
    completed: entries.filter(e => e.status === 'completed'),
  };
}

/**
 * Get count of items needing attention (availableNow + missed)
 */
export function getScheduleAttentionCount(entries: ScheduleEntry[]): number {
  return entries.filter(
    e => e.status === 'availableNow' || e.status === 'missed'
  ).length;
}

/**
 * Check if all schedule items are complete
 */
export function isScheduleComplete(entries: ScheduleEntry[]): boolean {
  const carePlanEntries = entries.filter(e => e.source === 'carePlan');
  return carePlanEntries.length > 0 &&
         carePlanEntries.every(e => e.status === 'completed');
}

// ============================================================================
// CONFLICT DETECTION
// ============================================================================

/**
 * Conflict between an appointment and a routine
 */
export interface ScheduleConflict {
  type: 'overlap' | 'adjacent';
  appointmentId: string;
  appointmentTitle: string;
  appointmentTime: number;
  routineId: string;
  routineName: string;
  routineWindow: { start: number; end: number };
  message: string;
  suggestion: string;
}

/**
 * Detect conflicts between appointments and routine windows
 * Returns conflicts with suggestions for handling them
 */
export function detectScheduleConflicts(
  entries: ScheduleEntry[],
  dayState: DayState | null
): ScheduleConflict[] {
  if (!dayState) return [];

  const conflicts: ScheduleConflict[] = [];
  const appointmentEntries = entries.filter(e => e.source === 'appointment');

  for (const appt of appointmentEntries) {
    for (const routine of dayState.routines) {
      const routineStart = timeToMinutes(routine.timeWindow.start);
      const routineEnd = timeToMinutes(routine.timeWindow.end);

      // Check if appointment falls within routine window
      if (appt.startMin >= routineStart && appt.startMin <= routineEnd) {
        conflicts.push({
          type: 'overlap',
          appointmentId: appt.appointmentId!,
          appointmentTitle: appt.title,
          appointmentTime: appt.startMin,
          routineId: routine.routineId,
          routineName: routine.name,
          routineWindow: { start: routineStart, end: routineEnd },
          message: `${appt.title} is during your ${routine.name}`,
          suggestion: `Routine tasks may need to shift around the appointment`,
        });
      }
      // Check if appointment is adjacent (within 30 min before routine)
      else if (appt.startMin >= routineStart - 30 && appt.startMin < routineStart) {
        conflicts.push({
          type: 'adjacent',
          appointmentId: appt.appointmentId!,
          appointmentTitle: appt.title,
          appointmentTime: appt.startMin,
          routineId: routine.routineId,
          routineName: routine.name,
          routineWindow: { start: routineStart, end: routineEnd },
          message: `${appt.title} is close to your ${routine.name}`,
          suggestion: `Consider completing routine tasks before the appointment`,
        });
      }
    }
  }

  return conflicts;
}

/**
 * Get routines that conflict with a specific appointment
 */
export function getConflictingRoutines(
  appointmentMin: number,
  dayState: DayState | null
): string[] {
  if (!dayState) return [];

  return dayState.routines
    .filter(routine => {
      const routineStart = timeToMinutes(routine.timeWindow.start);
      const routineEnd = timeToMinutes(routine.timeWindow.end);
      return appointmentMin >= routineStart && appointmentMin <= routineEnd;
    })
    .map(routine => routine.routineId);
}

// ============================================================================
// UNIFIED SCHEDULE BUILDER
// Public API for building the Care Plan Schedule
// ============================================================================

export interface BuildTodayScheduleInputs {
  dayState: DayState | null;
  carePlan: CarePlan | null;
  appointments: Appointment[];
  overrides: CarePlanOverride[];
  currentTime?: Date;
}

export interface TodayScheduleResult {
  entries: ScheduleEntry[];
  grouped: {
    active: ScheduleEntry[];
    upcoming: ScheduleEntry[];
    snoozed: ScheduleEntry[];
    completed: ScheduleEntry[];
  };
  conflicts: ScheduleConflict[];
  stats: {
    total: number;
    carePlanItems: number;
    appointments: number;
    completed: number;
    needsAttention: number;
    hasConflicts: boolean;
  };
}

/**
 * Build the Care Plan Schedule from CarePlan and Appointments
 * This is the PRIMARY PUBLIC API for the unified schedule
 *
 * @param inputs - Care plan state, appointments, and overrides
 * @returns Complete schedule result with entries, grouping, conflicts, and stats
 */
export function buildTodaySchedule(inputs: BuildTodayScheduleInputs): TodayScheduleResult {
  const currentTime = inputs.currentTime || new Date();

  // Derive schedule entries
  const entries = deriveScheduleEntries({
    ...inputs,
    currentTime,
  });

  // Group by status
  const grouped = groupScheduleByStatus(entries);

  // Detect conflicts
  const conflicts = detectScheduleConflicts(entries, inputs.dayState);

  // Calculate stats
  const carePlanItems = entries.filter(e => e.source === 'carePlan');
  const appointmentItems = entries.filter(e => e.source === 'appointment');

  const stats = {
    total: entries.length,
    carePlanItems: carePlanItems.length,
    appointments: appointmentItems.length,
    completed: grouped.completed.length,
    needsAttention: grouped.active.length,
    hasConflicts: conflicts.length > 0,
  };

  return {
    entries,
    grouped,
    conflicts,
    stats,
  };
}

// ============================================================================
// SCHEDULE ENTRY HELPERS
// ============================================================================

/**
 * Get the navigation route for a schedule entry
 * - Care Plan items: go to logging screen
 * - Appointments: go to appointment detail in Understand section
 */
export function getScheduleEntryRoute(entry: ScheduleEntry): string {
  if (entry.source === 'appointment') {
    // Route to Understand's appointment detail screen (canonical UI)
    return `/appointments?id=${entry.appointmentId}`;
  }
  // Care Plan items use their configured action route
  return entry.actionRoute || '';
}

/**
 * Check if a schedule entry is actionable right now
 */
export function isEntryActionable(entry: ScheduleEntry): boolean {
  return entry.status === 'availableNow' || entry.status === 'missed';
}

/**
 * Get display info for a schedule entry
 */
export function getEntryDisplayInfo(entry: ScheduleEntry): {
  timeText: string;
  statusText: string;
  statusColor: 'green' | 'yellow' | 'red' | 'gray' | 'blue';
} {
  const timeText = formatMinutesAsTime(entry.startMin);

  switch (entry.status) {
    case 'completed':
      return { timeText, statusText: 'Completed', statusColor: 'green' };
    case 'availableNow':
      return { timeText, statusText: 'Available now', statusColor: 'blue' };
    case 'missed':
      return { timeText, statusText: 'Missed', statusColor: 'red' };
    case 'snoozed':
      return {
        timeText,
        statusText: `Snoozed until ${formatMinutesAsTime(entry.snoozedUntilMin || 0)}`,
        statusColor: 'gray',
      };
    case 'upcoming':
    default:
      return { timeText, statusText: 'Upcoming', statusColor: 'yellow' };
  }
}
