// ============================================================================
// CARE PLAN TASK ACTION
// Unified mapping from CarePlan timeline items to navigation actions
// Used by Now page and Record page for consistent routing
// ============================================================================

import { CarePlanItemType, DayStateItem, DayStateRoutine } from '../../types/dayState';
import { ScheduleEntry } from '../../types/schedule';
import { Appointment } from '../appointmentStorage';

// ============================================================================
// TYPES
// ============================================================================

export interface TaskActionParams {
  // Core routing
  source: 'careplan' | 'appointment' | 'quick';

  // CarePlan context
  carePlanItemId?: string;
  routineId?: string;
  routineName?: string;

  // Task metadata for prepopulation
  taskType?: CarePlanItemType;
  taskLabel?: string;
  timeWindowStart?: string;
  timeWindowEnd?: string;
  targetCount?: number;
  completedCount?: number;

  // Medication-specific
  medicationId?: string;
  medicationName?: string;
  timeSlot?: string;

  // Meal-specific
  mealType?: string;

  // Appointment-specific
  appointmentId?: string;
  appointmentProvider?: string;
  appointmentSpecialty?: string;

  // Metadata
  metadata?: string;  // JSON string for additional data
}

export interface TaskAction {
  route: string;
  params: TaskActionParams;
  displayText: string;  // For UI display
}

// ============================================================================
// ROUTE MAPPING
// ============================================================================

const ITEM_TYPE_ROUTES: Record<CarePlanItemType, string> = {
  meds: '/medications',  // Route to canonical medications screen
  vitals: '/log-vitals',
  meals: '/log-meal',
  mood: '/log-morning-wellness',  // Mood captured within wellness checks
  sleep: '/log-sleep',
  hydration: '/log-water',
  wellness: '/log-morning-wellness',
  appointment: '/appointments',  // Route to canonical appointments screen
  custom: '/log-evening-wellness',
};

// ============================================================================
// TASK ACTION BUILDERS
// ============================================================================

/**
 * Build a TaskAction from a DayStateItem (CarePlan item)
 */
export function buildTaskAction(
  item: DayStateItem,
  routine: DayStateRoutine
): TaskAction {
  const params: TaskActionParams = {
    source: 'careplan',
    carePlanItemId: item.itemId,
    routineId: routine.routineId,
    routineName: routine.name,
    taskType: item.type,
    taskLabel: item.label,
    timeWindowStart: routine.timeWindow.start,
    timeWindowEnd: routine.timeWindow.end,
    targetCount: item.expected,
    completedCount: item.completed,
  };

  // Add type-specific params
  if (item.type === 'meds') {
    params.timeSlot = inferTimeSlot(routine.timeWindow.start);
  }

  if (item.type === 'meals') {
    params.mealType = inferMealType(item.label, routine.timeWindow.start);
  }

  const route = ITEM_TYPE_ROUTES[item.type] || '/log-evening-wellness';
  const displayText = buildDisplayText(item, routine);

  return { route, params, displayText };
}

/**
 * Build a TaskAction from a ScheduleEntry
 */
export function buildTaskActionFromScheduleEntry(
  entry: ScheduleEntry
): TaskAction | null {
  if (entry.source === 'appointment' && entry.appointmentId) {
    return buildAppointmentAction(entry);
  }

  if (entry.source === 'carePlan' && entry.routineId && entry.itemId) {
    return buildCarePlanAction(entry);
  }

  return null;
}

/**
 * Build a TaskAction for an appointment
 */
export function buildAppointmentAction(
  entry: ScheduleEntry | Appointment
): TaskAction {
  const isScheduleEntry = 'source' in entry;

  const params: TaskActionParams = {
    source: 'appointment',
    appointmentId: isScheduleEntry ? (entry as ScheduleEntry).appointmentId : (entry as Appointment).id,
  };

  if (!isScheduleEntry) {
    const apt = entry as Appointment;
    params.appointmentProvider = apt.provider;
    params.appointmentSpecialty = apt.specialty;
  }

  return {
    route: '/appointment-form',
    params,
    displayText: isScheduleEntry
      ? (entry as ScheduleEntry).title
      : `${(entry as Appointment).specialty} with ${(entry as Appointment).provider}`,
  };
}

/**
 * Build a TaskAction for a CarePlan item from ScheduleEntry
 */
function buildCarePlanAction(entry: ScheduleEntry): TaskAction {
  const itemType = (entry.itemType as CarePlanItemType) || 'custom';
  const route = ITEM_TYPE_ROUTES[itemType] || '/log-evening-wellness';

  const params: TaskActionParams = {
    source: 'careplan',
    carePlanItemId: entry.itemId!,
    routineId: entry.routineId!,
    taskType: itemType,
    taskLabel: entry.title,
    targetCount: entry.expected,
    completedCount: entry.completed,
  };

  // Add time window if available
  if (entry.startMin !== undefined) {
    params.timeWindowStart = minutesToTimeString(entry.startMin);
  }
  if (entry.endMin !== undefined) {
    params.timeWindowEnd = minutesToTimeString(entry.endMin);
  }

  // Add type-specific params
  if (itemType === 'meds' && entry.startMin !== undefined) {
    params.timeSlot = inferTimeSlot(minutesToTimeString(entry.startMin));
  }

  if (itemType === 'meals') {
    params.mealType = inferMealType(entry.title, params.timeWindowStart);
  }

  return {
    route,
    params,
    displayText: entry.title,
  };
}

/**
 * Build a quick action (no CarePlan context)
 */
export function buildQuickAction(
  type: CarePlanItemType,
  label?: string
): TaskAction {
  const route = ITEM_TYPE_ROUTES[type] || '/log-evening-wellness';

  return {
    route,
    params: {
      source: 'quick',
      taskType: type,
      taskLabel: label,
    },
    displayText: label || type,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function minutesToTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function inferTimeSlot(timeStr?: string): string {
  if (!timeStr) return 'morning';

  const hour = parseInt(timeStr.split(':')[0], 10);

  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 20) return 'evening';
  return 'bedtime';
}

function inferMealType(label: string, timeStr?: string): string {
  const lowerLabel = label.toLowerCase();

  if (lowerLabel.includes('breakfast')) return 'Breakfast';
  if (lowerLabel.includes('lunch')) return 'Lunch';
  if (lowerLabel.includes('dinner')) return 'Dinner';
  if (lowerLabel.includes('snack')) return 'Snack';

  // Infer from time if not in label
  if (timeStr) {
    const hour = parseInt(timeStr.split(':')[0], 10);
    if (hour < 11) return 'Breakfast';
    if (hour < 15) return 'Lunch';
    if (hour < 20) return 'Dinner';
    return 'Snack';
  }

  return 'Meal';
}

function buildDisplayText(item: DayStateItem, routine: DayStateRoutine): string {
  const timeRange = formatTimeRange(routine.timeWindow.start, routine.timeWindow.end);
  return `Logging for ${routine.name} (${timeRange})`;
}

function formatTimeRange(start: string, end: string): string {
  const formatTime = (time24: string) => {
    const [hours, minutes] = time24.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}${minutes > 0 ? ':' + minutes.toString().padStart(2, '0') : ''} ${ampm}`;
  };

  return `${formatTime(start)} - ${formatTime(end)}`;
}

// ============================================================================
// CONTEXT BANNER HELPERS
// ============================================================================

/**
 * Build context text for log screen banner
 */
export function buildContextBanner(params: TaskActionParams): {
  title: string;
  subtitle: string;
  showProgress: boolean;
} {
  if (params.source === 'appointment') {
    return {
      title: 'FROM APPOINTMENT',
      subtitle: params.appointmentSpecialty
        ? `${params.appointmentSpecialty} with ${params.appointmentProvider}`
        : 'Appointment',
      showProgress: false,
    };
  }

  if (params.source === 'careplan') {
    const subtitle = params.routineName
      ? `Part of ${params.routineName}`
      : params.taskLabel || 'Care Plan Task';

    return {
      title: 'FROM CARE PLAN',
      subtitle,
      showProgress: params.targetCount !== undefined && params.completedCount !== undefined,
    };
  }

  return {
    title: '',
    subtitle: '',
    showProgress: false,
  };
}

/**
 * Parse task action params from route params
 */
export function parseTaskActionParams(
  routeParams: Record<string, string | string[] | undefined>
): TaskActionParams | null {
  const source = routeParams.source as TaskActionParams['source'];
  if (!source || !['careplan', 'appointment', 'quick'].includes(source)) {
    return null;
  }

  const params: TaskActionParams = {
    source,
    carePlanItemId: routeParams.carePlanItemId as string,
    routineId: routeParams.routineId as string,
    routineName: routeParams.routineName as string,
    taskType: routeParams.taskType as CarePlanItemType,
    taskLabel: routeParams.taskLabel as string,
    timeWindowStart: routeParams.timeWindowStart as string,
    timeWindowEnd: routeParams.timeWindowEnd as string,
    medicationId: routeParams.medicationId as string,
    medicationName: routeParams.medicationName as string,
    timeSlot: routeParams.timeSlot as string,
    mealType: routeParams.mealType as string,
    appointmentId: routeParams.appointmentId as string,
    appointmentProvider: routeParams.appointmentProvider as string,
    appointmentSpecialty: routeParams.appointmentSpecialty as string,
    metadata: routeParams.metadata as string,
  };

  // Parse numeric values
  if (routeParams.targetCount) {
    params.targetCount = parseInt(routeParams.targetCount as string, 10);
  }
  if (routeParams.completedCount) {
    params.completedCount = parseInt(routeParams.completedCount as string, 10);
  }

  return params;
}
