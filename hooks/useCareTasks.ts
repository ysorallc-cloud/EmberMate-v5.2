// ============================================================================
// USE CARE TASKS HOOK
// Single source of truth for care tasks across the app
// Wraps useDailyCareInstances and transforms to CarePlanTask model
// ============================================================================

import { useMemo, useCallback } from 'react';
import { useDailyCareInstances, UseDailyCareInstancesReturn } from './useDailyCareInstances';
import { DEFAULT_PATIENT_ID } from '../storage/carePlanRepo';
import { getTodayDateString } from '../services/carePlanGenerator';
import { TimeWindowLabel, LogEntry, DailyCareInstance } from '../types/carePlan';
import {
  CarePlanTask,
  TaskStats,
  TasksByWindow,
  TaskFilter,
  TaskSortOptions,
} from '../types/carePlanTask';
import {
  transformInstancesToTasks,
  groupTasksByWindow,
  calculateTaskStats,
  findNextPendingTask,
  findOverdueTasks,
  sortTasks,
} from '../utils/taskTransform';

// ============================================================================
// TYPES
// ============================================================================

export interface CareTasksState {
  /** All tasks for the day */
  tasks: CarePlanTask[];

  /** Tasks grouped by time window */
  byWindow: TasksByWindow;

  /** Aggregated statistics */
  stats: TaskStats;

  /** Next pending task (by scheduled time) */
  nextPending: CarePlanTask | null;

  /** All overdue tasks */
  overdueTasks: CarePlanTask[];

  /** Whether all tasks are complete */
  allComplete: boolean;

  /** Completion rate as percentage (0-100) */
  completionRate: number;

  /** The date these tasks are for */
  date: string;
}

export interface UseCareTasksReturn {
  /** Current state (null while loading) */
  state: CareTasksState | null;

  /** Raw instance state from useDailyCareInstances (use for timeline rendering) */
  instanceState: UseDailyCareInstancesReturn['state'];

  /** Loading indicator */
  loading: boolean;

  /** Error if any */
  error: Error | null;

  /** Complete a task */
  completeTask: (
    taskId: string,
    outcome?: 'taken' | 'completed' | 'skipped',
    data?: any
  ) => Promise<{ task: CarePlanTask; log: LogEntry } | null>;

  /** Complete an instance directly (for batch operations) */
  completeInstance: UseDailyCareInstancesReturn['completeInstance'];

  /** Skip a task */
  skipTask: (taskId: string, reason?: string) => Promise<void>;

  /** Refresh task data */
  refresh: () => Promise<void>;

  /** Get a task by ID */
  getTaskById: (taskId: string) => CarePlanTask | undefined;

  /** Get tasks for a specific window */
  getTasksForWindow: (windowLabel: TimeWindowLabel) => CarePlanTask[];

  /** Filter tasks */
  filterTasks: (filter: TaskFilter) => CarePlanTask[];

  /** Sort tasks */
  sortedTasks: (options?: TaskSortOptions) => CarePlanTask[];
}

// ============================================================================
// FEATURE FLAG
// ============================================================================

/**
 * Feature flag for useCareTasks hook
 * Set to false to revert to direct useDailyCareInstances usage
 */
export const USE_CARE_TASKS_ENABLED = true;

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Main hook for accessing care tasks
 *
 * @param date Optional date string (YYYY-MM-DD). Defaults to today.
 * @param patientId Optional patient ID. Defaults to DEFAULT_PATIENT_ID.
 * @param options.skipSuppressionFilter If true, returns all tasks without filtering suppressed items
 */
export function useCareTasks(
  date?: string,
  patientId: string = DEFAULT_PATIENT_ID,
  options?: { skipSuppressionFilter?: boolean }
): UseCareTasksReturn {
  const targetDate = date || getTodayDateString();

  // Use the underlying hook
  const {
    state: instanceState,
    loading,
    error,
    refresh,
    completeInstance,
    skipInstance,
    getInstanceById,
  } = useDailyCareInstances(targetDate, patientId, options);

  /**
   * Transform instances to tasks and compute derived state
   */
  const state = useMemo((): CareTasksState | null => {
    if (!instanceState) return null;

    // Transform all instances to tasks
    const tasks = transformInstancesToTasks(instanceState.instances);

    // Group by window
    const byWindow = groupTasksByWindow(tasks);

    // Calculate stats
    const stats = calculateTaskStats(tasks);

    // Find next pending and overdue tasks
    const nextPending = findNextPendingTask(tasks);
    const overdueTasks = findOverdueTasks(tasks);

    return {
      tasks,
      byWindow,
      stats,
      nextPending,
      overdueTasks,
      allComplete: stats.pending === 0 && stats.total > 0,
      completionRate: stats.completionRate,
      date: targetDate,
    };
  }, [instanceState, targetDate]);

  /**
   * Complete a task
   */
  const completeTask = useCallback(async (
    taskId: string,
    outcome: 'taken' | 'completed' | 'skipped' = 'completed',
    data?: any
  ): Promise<{ task: CarePlanTask; log: LogEntry } | null> => {
    const result = await completeInstance(taskId, outcome, data);
    if (!result) return null;

    // Transform the updated instance to a task
    const task = transformInstancesToTasks([result.instance])[0];
    return { task, log: result.log };
  }, [completeInstance]);

  /**
   * Skip a task
   */
  const skipTask = useCallback(async (taskId: string, reason?: string) => {
    await skipInstance(taskId, reason);
  }, [skipInstance]);

  /**
   * Get a task by ID
   */
  const getTaskById = useCallback((taskId: string): CarePlanTask | undefined => {
    if (!state) return undefined;
    return state.tasks.find(t => t.id === taskId);
  }, [state]);

  /**
   * Get tasks for a specific window
   */
  const getTasksForWindow = useCallback((windowLabel: TimeWindowLabel): CarePlanTask[] => {
    if (!state) return [];
    return state.byWindow[windowLabel] || [];
  }, [state]);

  /**
   * Filter tasks by criteria
   */
  const filterTasks = useCallback((filter: TaskFilter): CarePlanTask[] => {
    if (!state) return [];

    return state.tasks.filter(task => {
      // Status filter
      if (filter.status) {
        const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
        if (!statuses.includes(task.status)) return false;
      }

      // Type filter
      if (filter.type) {
        const types = Array.isArray(filter.type) ? filter.type : [filter.type];
        if (!types.includes(task.type)) return false;
      }

      // Window filter
      if (filter.windowLabel) {
        const windows = Array.isArray(filter.windowLabel) ? filter.windowLabel : [filter.windowLabel];
        if (!windows.includes(task.windowLabel)) return false;
      }

      // Priority filter
      if (filter.priority) {
        const priorities = Array.isArray(filter.priority) ? filter.priority : [filter.priority];
        if (!priorities.includes(task.priority)) return false;
      }

      // Overdue filter
      if (filter.isOverdue !== undefined && task.isOverdue !== filter.isOverdue) {
        return false;
      }

      // Due soon filter
      if (filter.isDueSoon !== undefined && task.isDueSoon !== filter.isDueSoon) {
        return false;
      }

      return true;
    });
  }, [state]);

  /**
   * Get sorted tasks
   */
  const sortedTasks = useCallback((options?: TaskSortOptions): CarePlanTask[] => {
    if (!state) return [];
    if (!options) return state.tasks;
    return sortTasks(state.tasks, options.by, options.order);
  }, [state]);

  return {
    state,
    instanceState,
    loading,
    error,
    completeTask,
    completeInstance,
    skipTask,
    refresh,
    getTaskById,
    getTasksForWindow,
    filterTasks,
    sortedTasks,
  };
}

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

/**
 * Hook for just the next pending task
 */
export function useNextPendingTask(date?: string, patientId?: string) {
  const { state, loading, error, completeTask } = useCareTasks(date, patientId);

  return {
    nextTask: state?.nextPending || null,
    loading,
    error,
    complete: completeTask,
  };
}

/**
 * Hook for task statistics
 */
export function useTaskStats(date?: string, patientId?: string) {
  const { state, loading, error, refresh } = useCareTasks(date, patientId);

  return {
    stats: state?.stats || null,
    allComplete: state?.allComplete || false,
    completionRate: state?.completionRate || 0,
    loading,
    error,
    refresh,
  };
}

/**
 * Hook for tasks in a specific time window
 */
export function useWindowTasks(
  windowLabel: TimeWindowLabel,
  date?: string,
  patientId?: string
) {
  const { state, loading, error, completeTask, skipTask } = useCareTasks(date, patientId);

  const tasks = useMemo(() => {
    if (!state) return [];
    return state.byWindow[windowLabel] || [];
  }, [state, windowLabel]);

  const windowStats = useMemo(() => {
    return calculateTaskStats(tasks);
  }, [tasks]);

  return {
    tasks,
    stats: windowStats,
    loading,
    error,
    complete: completeTask,
    skip: skipTask,
  };
}

/**
 * Hook for overdue tasks only
 */
export function useOverdueTasks(date?: string, patientId?: string) {
  const { state, loading, error, completeTask } = useCareTasks(date, patientId);

  return {
    tasks: state?.overdueTasks || [],
    count: state?.overdueTasks.length || 0,
    loading,
    error,
    complete: completeTask,
  };
}

/**
 * Hook for medication tasks only
 */
export function useMedicationTasks(date?: string, patientId?: string) {
  const { state, loading, error, completeTask, skipTask, filterTasks } = useCareTasks(date, patientId);

  const medications = useMemo(() => {
    return filterTasks({ type: 'medication' });
  }, [filterTasks]);

  const stats = useMemo(() => {
    return calculateTaskStats(medications);
  }, [medications]);

  return {
    tasks: medications,
    stats,
    loading,
    error,
    complete: completeTask,
    skip: skipTask,
  };
}
