// ============================================================================
// TASK TRANSFORM - DailyCareInstance → CarePlanTask
// Transforms raw care plan instances into canonical task format for UI
// ============================================================================

import { format, parseISO, differenceInMinutes, isValid } from 'date-fns';
import {
  DailyCareInstance,
  TimeWindowLabel,
  CarePlanItemType,
} from '../types/carePlan';
import {
  CarePlanTask,
  TaskAction,
  TaskStats,
  TasksByWindow,
  TaskStatus,
  TaskPriority,
} from '../types/carePlanTask';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default emojis for task types
 */
const TYPE_EMOJIS: Record<CarePlanItemType, string> = {
  medication: '💊',
  activity: '🏃',
  vitals: '❤️',
  nutrition: '🍽️',
  appointment: '📅',
  hydration: '💧',
  mood: '😊',
  sleep: '😴',
  wellness: '🌅',
  custom: '📋',
};

/**
 * Minutes threshold for "due soon" indicator
 */
const DUE_SOON_THRESHOLD_MINUTES = 30;

/**
 * Action labels by task type
 */
const ACTION_LABELS: Record<CarePlanItemType, string> = {
  medication: 'Mark as taken',
  activity: 'Log activity',
  vitals: 'Record vitals',
  nutrition: 'Log meal',
  appointment: 'View details',
  hydration: 'Log water',
  mood: 'Log mood',
  sleep: 'Log sleep',
  wellness: 'Check in',
  custom: 'Complete',
};

// ============================================================================
// TRANSFORM FUNCTIONS
// ============================================================================

/**
 * Parse a time string into a Date object
 */
function parseScheduledTime(scheduledTime: string, date: string): Date | null {
  try {
    // If it's already an ISO string
    if (scheduledTime.includes('T')) {
      const parsed = parseISO(scheduledTime);
      return isValid(parsed) ? parsed : null;
    }

    // If it's HH:mm format, combine with date
    if (/^\d{2}:\d{2}$/.test(scheduledTime)) {
      const [hours, minutes] = scheduledTime.split(':').map(Number);
      const dateObj = parseISO(date);
      if (!isValid(dateObj)) return null;
      dateObj.setHours(hours, minutes, 0, 0);
      return dateObj;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Format time for display
 */
function formatTimeDisplay(scheduledTime: string, date: string): string {
  const parsed = parseScheduledTime(scheduledTime, date);
  if (!parsed) return '--:--';

  try {
    return format(parsed, 'h:mm a');
  } catch {
    return '--:--';
  }
}

/**
 * Calculate minutes until scheduled time
 */
function calculateMinutesUntil(scheduledTime: string, date: string): number | null {
  const scheduled = parseScheduledTime(scheduledTime, date);
  if (!scheduled) return null;

  const now = new Date();
  const diff = differenceInMinutes(scheduled, now);
  return diff;
}

/**
 * Determine if a task is overdue
 */
function isTaskOverdue(scheduledTime: string, date: string, status: TaskStatus): boolean {
  if (status !== 'pending') return false;

  const minutesUntil = calculateMinutesUntil(scheduledTime, date);
  if (minutesUntil === null) return false;

  // Task is overdue if scheduled time has passed
  return minutesUntil < 0;
}

/**
 * Determine if a task is due soon
 */
function isTaskDueSoon(scheduledTime: string, date: string, status: TaskStatus): boolean {
  if (status !== 'pending') return false;

  const minutesUntil = calculateMinutesUntil(scheduledTime, date);
  if (minutesUntil === null) return false;

  // Task is due soon if within threshold and not already overdue
  return minutesUntil >= 0 && minutesUntil <= DUE_SOON_THRESHOLD_MINUTES;
}

/**
 * Build the primary action for a task
 */
function buildPrimaryAction(
  instance: DailyCareInstance,
  status: TaskStatus
): TaskAction {
  // Completed tasks show view action
  if (status === 'completed' || status === 'skipped') {
    return {
      type: 'view',
      label: 'View details',
    };
  }

  // Build action based on type
  const actionType = instance.itemType === 'appointment' ? 'view' : 'complete';
  const label = ACTION_LABELS[instance.itemType] || 'Complete';

  // Build route params for logging
  const baseParams: Record<string, string> = {
    instanceId: instance.id,
    itemName: instance.itemName,
    scheduledTime: instance.scheduledTime,
  };

  if (instance.itemType === 'medication') {
    return {
      type: 'log',
      label,
      route: '/log-medication-plan-item',
      params: {
        ...baseParams,
        medicationId: instance.carePlanItemId,
        itemDosage: instance.itemDosage || '',
      },
    };
  }

  return {
    type: actionType,
    label,
  };
}

/**
 * Transform a single DailyCareInstance into a CarePlanTask
 */
export function transformInstanceToTask(instance: DailyCareInstance): CarePlanTask {
  const status: TaskStatus = instance.status;
  const timeDisplay = formatTimeDisplay(instance.scheduledTime, instance.date);
  const minutesUntil = calculateMinutesUntil(instance.scheduledTime, instance.date);
  const overdue = isTaskOverdue(instance.scheduledTime, instance.date, status);
  const dueSoon = isTaskDueSoon(instance.scheduledTime, instance.date, status);

  // Build subtitle
  let subtitle = instance.instructions || '';
  if (instance.itemDosage && instance.itemType === 'medication') {
    subtitle = instance.itemDosage + (subtitle ? ` - ${subtitle}` : '');
  }
  if (!subtitle) {
    subtitle = timeDisplay;
  }

  return {
    // Identity
    id: instance.id,
    instanceId: instance.id,
    carePlanItemId: instance.carePlanItemId,

    // Display
    title: instance.itemName,
    subtitle,
    emoji: instance.itemEmoji || TYPE_EMOJIS[instance.itemType] || '📋',
    instructions: instance.instructions,

    // Classification
    type: instance.itemType,
    priority: instance.priority as TaskPriority,
    windowLabel: instance.windowLabel,

    // Timing
    scheduledTime: instance.scheduledTime,
    scheduledTimeDisplay: timeDisplay,
    date: instance.date,

    // State
    status,
    isOverdue: overdue,
    isDueSoon: dueSoon,
    minutesUntil,

    // Actions
    primaryAction: buildPrimaryAction(instance, status),

    // Metadata
    logId: instance.logId,
    dosage: instance.itemDosage,
    medicationId: instance.itemType === 'medication' ? instance.carePlanItemId : undefined,

    // Source reference
    __sourceInstanceId: instance.id,
  };
}

/**
 * Transform an array of DailyCareInstances into CarePlanTasks
 */
export function transformInstancesToTasks(instances: DailyCareInstance[]): CarePlanTask[] {
  return instances.map(transformInstanceToTask);
}

/**
 * Group tasks by time window
 */
export function groupTasksByWindow(tasks: CarePlanTask[]): TasksByWindow {
  const byWindow: TasksByWindow = {
    morning: [],
    afternoon: [],
    evening: [],
    night: [],
    custom: [],
  };

  for (const task of tasks) {
    const window = task.windowLabel;
    if (byWindow[window]) {
      byWindow[window].push(task);
    }
  }

  // Sort each window by scheduled time
  for (const window of Object.keys(byWindow) as TimeWindowLabel[]) {
    byWindow[window].sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  }

  return byWindow;
}

/**
 * Calculate task statistics
 */
export function calculateTaskStats(tasks: CarePlanTask[]): TaskStats {
  const total = tasks.length;
  const pending = tasks.filter(t => t.status === 'pending').length;
  const completed = tasks.filter(t => t.status === 'completed').length;
  const skipped = tasks.filter(t => t.status === 'skipped').length;
  const missed = tasks.filter(t => t.status === 'missed').length;
  const overdue = tasks.filter(t => t.isOverdue).length;

  // Completion rate: completed / (total - skipped)
  const accountedFor = total - skipped;
  const completionRate = accountedFor > 0
    ? Math.round((completed / accountedFor) * 100)
    : 0;

  return {
    total,
    pending,
    completed,
    skipped,
    missed,
    overdue,
    completionRate,
  };
}

/**
 * Find the next pending task (earliest by scheduled time)
 */
export function findNextPendingTask(tasks: CarePlanTask[]): CarePlanTask | null {
  const pendingTasks = tasks
    .filter(t => t.status === 'pending')
    .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

  return pendingTasks[0] || null;
}

/**
 * Find all overdue tasks
 */
export function findOverdueTasks(tasks: CarePlanTask[]): CarePlanTask[] {
  return tasks.filter(t => t.isOverdue);
}

/**
 * Sort tasks by various criteria
 */
export function sortTasks(
  tasks: CarePlanTask[],
  by: 'scheduledTime' | 'priority' | 'status' = 'scheduledTime',
  order: 'asc' | 'desc' = 'asc'
): CarePlanTask[] {
  const sorted = [...tasks];

  sorted.sort((a, b) => {
    let comparison = 0;

    switch (by) {
      case 'scheduledTime':
        comparison = a.scheduledTime.localeCompare(b.scheduledTime);
        break;
      case 'priority': {
        const priorityOrder: Record<TaskPriority, number> = {
          required: 0,
          recommended: 1,
          optional: 2,
        };
        comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
        break;
      }
      case 'status': {
        const statusOrder: Record<TaskStatus, number> = {
          pending: 0,
          partial: 1,
          completed: 2,
          skipped: 3,
          missed: 4,
        };
        comparison = statusOrder[a.status] - statusOrder[b.status];
        break;
      }
    }

    return order === 'desc' ? -comparison : comparison;
  });

  return sorted;
}
