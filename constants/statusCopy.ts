// ============================================================================
// STATUS COPY - Structured Status Messages
// Contextual, specific status messages that replace vague phrases
// ============================================================================

import { TimeWindowLabel } from '../types/carePlan';
import { TaskStatus, TaskType } from '../types/carePlanTask';

// ============================================================================
// WINDOW STATUS MESSAGES
// Replace "Morning 4" with "4 tasks scheduled for morning"
// ============================================================================

export interface WindowStatusParams {
  windowLabel: TimeWindowLabel;
  total: number;
  completed: number;
  pending: number;
}

export function getWindowStatusMessage(params: WindowStatusParams): string {
  const { windowLabel, total, completed, pending } = params;
  const windowName = WINDOW_DISPLAY_NAMES[windowLabel];

  if (total === 0) {
    return `No tasks scheduled for ${windowName.toLowerCase()}`;
  }

  if (pending === 0) {
    return `${windowName} complete`;
  }

  if (completed === 0) {
    return `${total} ${total === 1 ? 'task' : 'tasks'} scheduled for ${windowName.toLowerCase()}`;
  }

  return `${completed} of ${total} ${windowName.toLowerCase()} tasks done`;
}

export const WINDOW_DISPLAY_NAMES: Record<TimeWindowLabel, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  night: 'Night',
  custom: 'Custom',
};

// ============================================================================
// TASK STATUS MESSAGES
// Replace "Overdue" with "Overdue by 45 min: Metformin"
// ============================================================================

export interface TaskStatusParams {
  status: TaskStatus;
  taskName: string;
  minutesOverdue?: number;
  minutesUntil?: number;
}

export function getTaskStatusMessage(params: TaskStatusParams): string {
  const { status, taskName, minutesOverdue, minutesUntil } = params;

  switch (status) {
    case 'pending':
      if (minutesOverdue && minutesOverdue > 0) {
        return `Overdue by ${formatMinutes(minutesOverdue)}: ${taskName}`;
      }
      if (minutesUntil !== undefined && minutesUntil <= 30 && minutesUntil >= 0) {
        return `Due in ${formatMinutes(minutesUntil)}: ${taskName}`;
      }
      return `Pending: ${taskName}`;

    case 'completed':
      return `Done: ${taskName}`;

    case 'skipped':
      return `Skipped: ${taskName}`;

    case 'missed':
      return `Missed: ${taskName}`;

    case 'partial':
      return `Partially logged: ${taskName}`;

    default:
      return taskName;
  }
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (remainingMins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMins}m`;
}

// ============================================================================
// PROGRESS STATUS MESSAGES
// Replace "Keep it up" with "2 pending: Vitals, Evening meds"
// ============================================================================

export interface ProgressStatusParams {
  completed: number;
  total: number;
  pending: number;
  overdue: number;
  pendingTaskNames?: string[];
  overdueTaskNames?: string[];
}

export function getProgressStatusMessage(params: ProgressStatusParams): string {
  const { completed, total, pending, overdue, pendingTaskNames = [], overdueTaskNames = [] } = params;

  // All complete
  if (total > 0 && pending === 0) {
    return 'All tasks complete for today';
  }

  // No tasks
  if (total === 0) {
    return 'No tasks scheduled for today';
  }

  // Has overdue
  if (overdue > 0 && overdueTaskNames.length > 0) {
    const taskList = overdueTaskNames.slice(0, 2).join(', ');
    const remaining = overdueTaskNames.length > 2 ? ` +${overdueTaskNames.length - 2} more` : '';
    return `${overdue} overdue: ${taskList}${remaining}`;
  }

  // Has pending
  if (pending > 0 && pendingTaskNames.length > 0) {
    const taskList = pendingTaskNames.slice(0, 2).join(', ');
    const remaining = pendingTaskNames.length > 2 ? ` +${pendingTaskNames.length - 2} more` : '';
    return `${pending} pending: ${taskList}${remaining}`;
  }

  // Fallback with progress
  const percentage = Math.round((completed / total) * 100);
  return `${percentage}% complete (${completed}/${total})`;
}

// ============================================================================
// ACTION LABEL MESSAGES
// Replace "Adjust Today" with "Edit today's schedule"
// ============================================================================

export const ACTION_LABELS = {
  // Navigation
  ADJUST_TODAY: "Edit today's schedule",
  VIEW_CARE_PLAN: 'View care plan',
  MANAGE_MEDICATIONS: 'Manage medications',
  VIEW_TIMELINE: 'View timeline',
  EDIT_SCHEDULE: 'Edit schedule',

  // Task actions
  MARK_AS_TAKEN: 'Mark as taken',
  MARK_AS_DONE: 'Mark as done',
  LOG_NOW: 'Log now',
  SKIP_TASK: 'Skip this task',
  UNDO_COMPLETION: 'Undo',

  // Status actions
  VIEW_DETAILS: 'View details',
  SEE_MORE: 'See more',
  EXPAND: 'Expand',
  COLLAPSE: 'Collapse',
} as const;

// ============================================================================
// CATEGORY STATUS MESSAGES
// Specific messages for each care category
// ============================================================================

export interface CategoryStatusParams {
  type: TaskType;
  logged: number;
  total: number;
  pendingNames?: string[];
}

export function getCategoryStatusMessage(params: CategoryStatusParams): string {
  const { type, logged, total, pendingNames = [] } = params;

  if (total === 0) {
    return CATEGORY_EMPTY_STATES[type] || 'No tasks';
  }

  if (logged === total) {
    return CATEGORY_COMPLETE_STATES[type] || 'All done';
  }

  const pending = total - logged;
  if (pendingNames.length > 0) {
    const taskList = pendingNames.slice(0, 2).join(', ');
    return `${pending} remaining: ${taskList}`;
  }

  return `${logged} of ${total} logged`;
}

const CATEGORY_EMPTY_STATES: Partial<Record<TaskType, string>> = {
  medication: 'No medications scheduled',
  vitals: 'No vitals to record',
  nutrition: 'No meals to log',
  wellness: 'No wellness check scheduled',
  activity: 'No activity to log',
  sleep: 'No sleep to log',
  hydration: 'No water tracking',
  appointment: 'No appointments today',
};

const CATEGORY_COMPLETE_STATES: Partial<Record<TaskType, string>> = {
  medication: 'All medications taken',
  vitals: 'Vitals recorded',
  nutrition: 'Meals logged',
  wellness: 'Wellness check done',
  activity: 'Activity logged',
  sleep: 'Sleep logged',
  hydration: 'Water logged',
  appointment: 'Appointments complete',
};

// ============================================================================
// INSIGHT MESSAGES
// Supportive, pattern-based messages (not nagging or urgent)
// ============================================================================

export const INSIGHT_TEMPLATES = {
  // Positive reinforcement
  STREAK_MAINTAINED: (days: number) =>
    `${days}-day logging streak! Consistent tracking helps spot patterns.`,

  COMPLETION_RATE: (rate: number) =>
    rate >= 90
      ? 'Strong adherence this week.'
      : rate >= 70
        ? 'Good progress this week.'
        : 'Every log helps build the picture.',

  // Pattern awareness (not urgency)
  MORNING_PATTERN: 'Morning medications tend to work best with breakfast.',
  VITALS_BEFORE_MEDS: 'Logging vitals first helps track medication effectiveness.',
  HYDRATION_TIP: 'Consistent hydration supports medication absorption.',

  // Contextual suggestions
  ALL_COMPLETE: 'All scheduled tasks complete. Nothing more needed today.',
  PARTIAL_COMPLETE: (remaining: number) =>
    `${remaining} ${remaining === 1 ? 'task' : 'tasks'} remaining when ready.`,
} as const;

// ============================================================================
// TOOLTIP CONTENT
// Explanatory text for status indicators
// ============================================================================

export const TOOLTIP_CONTENT = {
  OVERDUE_BADGE: 'This task is past its scheduled time. Complete when ready.',
  DUE_SOON_BADGE: 'This task is coming up soon.',
  COMPLETED_BADGE: 'Task marked as complete.',
  SKIPPED_BADGE: 'Task was skipped today.',
  PENDING_BADGE: 'Task is waiting to be completed.',

  PROGRESS_RING:
    'Shows completion progress. Tap to see details for this category.',

  ROLE_LABEL_STATUS: 'This shows current status information.',
  ROLE_LABEL_LOG: 'Tap to log or record care activity.',
  ROLE_LABEL_SETTING: 'Tap to change this setting.',
} as const;
