// ============================================================================
// CARE PLAN TASK - Canonical Task Interface for UI
// Transformed from DailyCareInstance for consistent UI rendering
// ============================================================================

import {
  CarePlanItemType,
  CarePlanItemPriority,
  TimeWindowLabel,
  DailyInstanceStatus,
} from './carePlan';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Task status for UI display
 */
export type TaskStatus = 'pending' | 'completed' | 'skipped' | 'missed' | 'partial';

/**
 * Task priority levels
 */
export type TaskPriority = 'required' | 'recommended' | 'optional';

/**
 * Task type categories
 */
export type TaskType = CarePlanItemType;

/**
 * Primary action available for a task
 */
export interface TaskAction {
  type: 'complete' | 'skip' | 'log' | 'view';
  label: string;
  route?: string;
  params?: Record<string, string>;
}

/**
 * Canonical task interface for UI rendering
 * This is the standard data shape that all task-rendering components should use
 */
export interface CarePlanTask {
  // Identity
  id: string;
  instanceId: string;
  carePlanItemId: string;

  // Display
  title: string;
  subtitle: string;
  emoji: string;
  instructions?: string;

  // Classification
  type: TaskType;
  priority: TaskPriority;
  windowLabel: TimeWindowLabel;

  // Timing
  scheduledTime: string;        // ISO timestamp or HH:mm
  scheduledTimeDisplay: string; // Formatted for display (e.g., "8:00 AM")
  date: string;                 // YYYY-MM-DD

  // State
  status: TaskStatus;
  isOverdue: boolean;
  isDueSoon: boolean;
  minutesUntil: number | null;  // null if in past

  // Actions
  primaryAction: TaskAction;

  // Metadata
  logId?: string;               // If completed, links to log entry
  dosage?: string;              // For medications
  medicationId?: string;        // For medications

  // Source reference (for debugging/tracing)
  __sourceInstanceId: string;
}

// ============================================================================
// TASK STATS
// ============================================================================

/**
 * Aggregated statistics for a collection of tasks
 */
export interface TaskStats {
  total: number;
  pending: number;
  completed: number;
  skipped: number;
  missed: number;
  overdue: number;
  completionRate: number; // 0-100
}

// ============================================================================
// GROUPED TASKS
// ============================================================================

/**
 * Tasks grouped by time window
 */
export type TasksByWindow = Record<TimeWindowLabel, CarePlanTask[]>;

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isCarePlanTask(obj: unknown): obj is CarePlanTask {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'instanceId' in obj &&
    'title' in obj &&
    'status' in obj &&
    'windowLabel' in obj
  );
}

export function isPendingTask(task: CarePlanTask): boolean {
  return task.status === 'pending';
}

export function isCompletedTask(task: CarePlanTask): boolean {
  return task.status === 'completed';
}

export function isOverdueTask(task: CarePlanTask): boolean {
  return task.isOverdue && task.status === 'pending';
}

export function isDueSoonTask(task: CarePlanTask): boolean {
  return task.isDueSoon && task.status === 'pending';
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Filter options for task queries
 */
export interface TaskFilter {
  status?: TaskStatus | TaskStatus[];
  type?: TaskType | TaskType[];
  windowLabel?: TimeWindowLabel | TimeWindowLabel[];
  isOverdue?: boolean;
  isDueSoon?: boolean;
  priority?: TaskPriority | TaskPriority[];
}

/**
 * Sort options for task lists
 */
export type TaskSortBy = 'scheduledTime' | 'priority' | 'status';
export type TaskSortOrder = 'asc' | 'desc';

export interface TaskSortOptions {
  by: TaskSortBy;
  order?: TaskSortOrder;
}
