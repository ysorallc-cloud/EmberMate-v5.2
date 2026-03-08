// ============================================================================
// SCHEDULE TYPES
// Unified type for Care Plan Schedule entries from CarePlan and Appointments
// ============================================================================

import { CarePlanItemType } from './dayState';

/**
 * Source of a schedule entry
 */
export type ScheduleSource = 'carePlan' | 'appointment';

// ============================================================================
// SCHEDULE EVENT UNION TYPE
// Lightweight bridge between CarePlan items and Appointments
// ============================================================================

/**
 * Care Plan schedule event
 * Represents a repeatable task with completion state
 */
export interface CarePlanScheduleEvent {
  kind: 'careplan';
  id: string;
  startMin: number;           // Minutes from midnight
  endMin?: number;            // Window end time
  routineId: string;
  itemId: string;
  itemType: CarePlanItemType;
  title: string;
  subtitle?: string;
  emoji?: string;
  status: 'pending' | 'partial' | 'done';
  completed: number;
  expected: number;
  actionRoute: string;
}

/**
 * Appointment schedule event
 * Represents a scheduled event with time and location
 */
export interface AppointmentScheduleEvent {
  kind: 'appointment';
  id: string;
  startMin: number;           // Minutes from midnight
  endMin?: number;            // Estimated end time
  appointmentId: string;
  title: string;
  subtitle?: string;
  emoji?: string;
  provider?: string;
  location?: string;
  completed: boolean;
  cancelled: boolean;
}

/**
 * Union type for all schedule events
 */
export type ScheduleEvent = CarePlanScheduleEvent | AppointmentScheduleEvent;

/**
 * Type guard for CarePlan events
 */
export function isCarePlanEvent(event: ScheduleEvent): event is CarePlanScheduleEvent {
  return event.kind === 'careplan';
}

/**
 * Type guard for Appointment events
 */
export function isAppointmentEvent(event: ScheduleEvent): event is AppointmentScheduleEvent {
  return event.kind === 'appointment';
}

/**
 * Status of a schedule entry
 * - availableNow: within time window, not complete
 * - upcoming: before time window starts
 * - completed: task is done
 * - missed: past time window, not complete
 * - snoozed: user selected "Later", temporarily hidden
 * - info: informational only (e.g., appointments that don't require action)
 */
export type ScheduleStatus =
  | 'availableNow'
  | 'upcoming'
  | 'completed'
  | 'missed'
  | 'snoozed'
  | 'info';

/**
 * Action type for schedule entry tap behavior
 * - log: navigate to logging screen (meds, vitals, meals, mood)
 * - complete: mark as done via override
 * - open: open details (appointments)
 */
export type ScheduleActionType = 'log' | 'complete' | 'open';

/**
 * Unified schedule entry for Care Plan Schedule
 * All entries come from either CarePlan routines or Appointments
 */
export interface ScheduleEntry {
  id: string;
  source: ScheduleSource;

  title: string;
  subtitle?: string;
  emoji?: string;

  // Time information (minutes from midnight)
  startMin: number;     // Window start time
  endMin?: number;      // Window end time (for routines)
  dueMin?: number;      // Specific due time (for appointments)

  status: ScheduleStatus;

  // Progress information (for routine items)
  completed?: number;
  expected?: number;

  // Linkage back to Care Plan system
  routineId?: string;
  itemId?: string;
  itemType?: string;    // 'meds' | 'vitals' | 'meals' | 'mood' | etc.

  // Linkage back to Appointment system
  appointmentId?: string;

  // Action configuration
  actionLabel?: string;   // "Log", "Mark done", "Details"
  actionType?: ScheduleActionType;
  actionRoute?: string;   // Navigation route

  // Snooze information
  snoozedUntilMin?: number;
}

/**
 * Helper to convert HH:MM time string to minutes from midnight
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Helper to convert minutes from midnight to HH:MM time string
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Helper to format minutes as display time (12-hour format)
 */
export function formatMinutesAsTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${mins.toString().padStart(2, '0')} ${ampm}`;
}

// ============================================================================
// CONFLICT DETECTION TYPES
// ============================================================================

/**
 * Represents a conflict between schedule items
 */
export interface ScheduleConflict {
  type: 'overlap' | 'adjacent';
  appointmentId: string;
  routineId: string;
  message: string;
  suggestion?: string;
}

/**
 * Check if two time windows overlap
 */
export function timeWindowsOverlap(
  start1: number, end1: number,
  start2: number, end2: number
): boolean {
  return start1 < end2 && start2 < end1;
}

/**
 * Check if appointment is within a routine window
 */
export function appointmentDuringRoutine(
  appointmentMin: number,
  routineStart: number,
  routineEnd: number
): boolean {
  return appointmentMin >= routineStart && appointmentMin <= routineEnd;
}

// ============================================================================
// PREP CHECKLIST TYPES
// ============================================================================

/**
 * Item in an appointment prep checklist
 */
export interface PrepChecklistItem {
  id: string;
  label: string;
  emoji?: string;
  checked: boolean;
  source: 'auto' | 'custom';  // 'auto' = generated from care plan/meds
}

/**
 * Complete prep checklist for an appointment
 */
export interface AppointmentPrepChecklist {
  appointmentId: string;
  items: PrepChecklistItem[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Default prep checklist items based on appointment type
 */
export const DEFAULT_PREP_ITEMS: Record<string, PrepChecklistItem[]> = {
  default: [
    { id: 'meds-list', label: 'Bring current medications list', emoji: '💊', checked: false, source: 'auto' },
    { id: 'insurance', label: 'Bring insurance card', emoji: '🪪', checked: false, source: 'auto' },
    { id: 'questions', label: 'Write down questions to ask', emoji: '❓', checked: false, source: 'auto' },
  ],
  cardiology: [
    { id: 'meds-list', label: 'Bring current medications list', emoji: '💊', checked: false, source: 'auto' },
    { id: 'bp-log', label: 'Bring recent blood pressure readings', emoji: '📊', checked: false, source: 'auto' },
    { id: 'symptoms', label: 'Note any new symptoms', emoji: '📝', checked: false, source: 'auto' },
    { id: 'insurance', label: 'Bring insurance card', emoji: '🪪', checked: false, source: 'auto' },
  ],
  'primary care': [
    { id: 'meds-list', label: 'Bring current medications list', emoji: '💊', checked: false, source: 'auto' },
    { id: 'vitals', label: 'Bring recent vitals log', emoji: '📊', checked: false, source: 'auto' },
    { id: 'concerns', label: 'List health concerns to discuss', emoji: '📝', checked: false, source: 'auto' },
    { id: 'insurance', label: 'Bring insurance card', emoji: '🪪', checked: false, source: 'auto' },
  ],
  'physical therapy': [
    { id: 'comfortable-clothes', label: 'Wear comfortable clothes', emoji: '👕', checked: false, source: 'auto' },
    { id: 'pain-log', label: 'Note pain levels this week', emoji: '📝', checked: false, source: 'auto' },
    { id: 'exercises', label: 'Review assigned exercises', emoji: '🏃', checked: false, source: 'auto' },
  ],
};

/**
 * Get default prep checklist for an appointment specialty
 */
export function getDefaultPrepChecklist(specialty: string): PrepChecklistItem[] {
  const key = specialty.toLowerCase();
  return DEFAULT_PREP_ITEMS[key] || DEFAULT_PREP_ITEMS.default;
}
