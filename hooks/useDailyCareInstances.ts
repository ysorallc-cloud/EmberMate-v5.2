// ============================================================================
// USE DAILY CARE INSTANCES HOOK
// React hook for accessing generated daily care instances from the regimen system
// This replaces the old static routine-based useCarePlan hook
// ============================================================================

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { devLog, logError } from '../utils/devLog';
import { useDataListener, emitDataUpdate } from '../lib/events';
import { EVENT } from '../lib/eventNames';
import {
  DailyCareInstance,
  DailySchedule,
  TimeWindowLabel,
  LogEntry,
} from '../types/carePlan';
import {
  listDailyInstances,
  getDailySchedule,
  logInstanceCompletion,
  updateDailyInstanceStatus,
  DEFAULT_PATIENT_ID,
} from '../storage/carePlanRepo';
import {
  ensureDailyInstances,
  getTodayDateString,
  getCurrentWindowLabel,
} from '../services/carePlanGenerator';
import { useTodayScope } from './useTodayScope';

// ============================================================================
// TYPES
// ============================================================================

export interface InstanceGroup {
  windowLabel: TimeWindowLabel;
  displayName: string;
  emoji: string;
  instances: DailyCareInstance[];
  completedCount: number;
  totalCount: number;
  status: 'upcoming' | 'available' | 'completed';
}

export interface DailyInstancesState {
  date: string;
  instances: DailyCareInstance[];
  byWindow: {
    morning: DailyCareInstance[];
    afternoon: DailyCareInstance[];
    evening: DailyCareInstance[];
    night: DailyCareInstance[];
    custom: DailyCareInstance[];
  };
  groups: InstanceGroup[];
  stats: {
    total: number;
    pending: number;
    completed: number;
    skipped: number;
    missed: number;
  };
  nextPending: DailyCareInstance | null;
  allComplete: boolean;
}

export interface UseDailyCareInstancesReturn {
  // State
  state: DailyInstancesState | null;
  loading: boolean;
  error: Error | null;

  // Actions
  refresh: () => Promise<void>;
  completeInstance: (
    instanceId: string,
    outcome?: 'taken' | 'completed' | 'skipped',
    data?: any,
    notes?: string
  ) => Promise<{ instance: DailyCareInstance; log: LogEntry } | null>;
  skipInstance: (instanceId: string, notes?: string) => Promise<void>;
  markMissed: (instanceId: string) => Promise<void>;

  // Convenience
  getInstanceById: (instanceId: string) => DailyCareInstance | undefined;
  getInstancesForWindow: (windowLabel: TimeWindowLabel) => DailyCareInstance[];
  getCurrentWindowInstances: () => DailyCareInstance[];
}

// ============================================================================
// HELPERS
// ============================================================================

const WINDOW_CONFIG: Record<TimeWindowLabel, { displayName: string; emoji: string }> = {
  morning: { displayName: 'Morning', emoji: '🌅' },
  afternoon: { displayName: 'Afternoon', emoji: '☀️' },
  evening: { displayName: 'Evening', emoji: '🌆' },
  night: { displayName: 'Night', emoji: '🌙' },
  custom: { displayName: 'Custom', emoji: '📋' },
};

function getWindowStatus(
  windowLabel: TimeWindowLabel,
  instances: DailyCareInstance[],
  currentWindow: TimeWindowLabel
): 'upcoming' | 'available' | 'completed' {
  // If all instances are completed or skipped, mark as completed
  const pendingCount = instances.filter(i => i.status === 'pending').length;
  if (instances.length > 0 && pendingCount === 0) {
    return 'completed';
  }

  // Check if this window is currently active
  const windowOrder: TimeWindowLabel[] = ['morning', 'afternoon', 'evening', 'night'];
  const currentIndex = windowOrder.indexOf(currentWindow);
  const thisIndex = windowOrder.indexOf(windowLabel);

  if (thisIndex < currentIndex) {
    // Past window - if has pending items, they should be available
    return pendingCount > 0 ? 'available' : 'completed';
  } else if (thisIndex === currentIndex) {
    return 'available';
  } else {
    return 'upcoming';
  }
}

function createInstanceGroups(
  instances: DailyCareInstance[],
  currentWindow: TimeWindowLabel
): InstanceGroup[] {
  const groups: InstanceGroup[] = [];
  const windowOrder: TimeWindowLabel[] = ['morning', 'afternoon', 'evening', 'night'];

  for (const windowLabel of windowOrder) {
    const windowInstances = instances.filter(i => i.windowLabel === windowLabel);
    if (windowInstances.length === 0) continue;

    const completedCount = windowInstances.filter(
      i => i.status === 'completed' || i.status === 'skipped'
    ).length;

    const config = WINDOW_CONFIG[windowLabel];
    groups.push({
      windowLabel,
      displayName: config.displayName,
      emoji: config.emoji,
      instances: windowInstances.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime)),
      completedCount,
      totalCount: windowInstances.length,
      status: getWindowStatus(windowLabel, windowInstances, currentWindow),
    });
  }

  return groups;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for accessing generated daily care instances
 * @param date Optional date string (YYYY-MM-DD). Defaults to today.
 * @param patientId Optional patient ID. Defaults to DEFAULT_PATIENT_ID.
 * @param options.skipSuppressionFilter If true, returns all instances without filtering suppressed items (used by Today's Scope screen)
 */
export function useDailyCareInstances(
  date?: string,
  patientId: string = DEFAULT_PATIENT_ID,
  options?: { skipSuppressionFilter?: boolean }
): UseDailyCareInstancesReturn {
  const targetDate = date || getTodayDateString();
  const skipSuppression = options?.skipSuppressionFilter ?? false;

  const [instances, setInstances] = useState<DailyCareInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Today's Scope: filter out suppressed items (unless skipSuppressionFilter is set)
  const { isSuppressed, loading: scopeLoading } = useTodayScope(targetDate);

  // Re-entry guard: prevent concurrent loadInstances calls from causing cascading updates
  const loadingRef = useRef(false);
  // Cooldown: ignore carePlanItems events shortly after loadInstances finishes,
  // because ensureDailyInstances' internal sync emits those events itself.
  const lastLoadDoneRef = useRef(0);
  const LOAD_COOLDOWN_MS = 2000;

  /**
   * Load instances for the target date
   * Ensures instances are generated if they don't exist
   */
  const loadInstances = useCallback(async () => {
    if (loadingRef.current) {
      devLog('[useDailyCareInstances] loadInstances skipped (already loading)');
      return;
    }
    loadingRef.current = true;
    devLog('[useDailyCareInstances] loadInstances called for', targetDate);
    try {
      setLoading(true);
      setError(null);

      // Ensure instances exist for this date (generates if needed)
      const dayInstances = await ensureDailyInstances(patientId, targetDate);
      if (__DEV__) {
        const pending = dayInstances.filter(i => i.status === 'pending').length;
        const completed = dayInstances.filter(i => i.status === 'completed').length;
        devLog('[useDailyCareInstances] loaded', dayInstances.length, 'instances (pending:', pending, 'completed:', completed, ')');
      }
      setInstances(dayInstances);
    } catch (err) {
      logError('useDailyCareInstances.loadInstances', err);
      setError(err instanceof Error ? err : new Error('Failed to load instances'));
    } finally {
      setLoading(false);
      loadingRef.current = false;
      lastLoadDoneRef.current = Date.now();
    }
  }, [patientId, targetDate]);

  // Initial load
  useEffect(() => {
    loadInstances();
  }, [loadInstances]);

  // Refresh instances from storage without re-running ensureDailyInstances
  // (which emits events and would cause an infinite loop)
  const refreshFromStorage = useCallback(async () => {
    if (loadingRef.current) {
      devLog('[useDailyCareInstances] refreshFromStorage skipped (loadInstances in progress)');
      return;
    }
    try {
      const dayInstances = await listDailyInstances(patientId, targetDate);
      setInstances(dayInstances.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime)));
    } catch (err) {
      logError('useDailyCareInstances.refreshFromStorage', err);
    }
  }, [patientId, targetDate]);

  // Listen for relevant data updates — two tiers of response
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useDataListener((category) => {
    // Tier 1: Config/item structure changes → full regeneration (ensureDailyInstances)
    if (['carePlanConfig', 'carePlanItems'].includes(category)) {
      // Suppress if loadInstances just finished — ensureDailyInstances' internal sync
      // emits carePlanItems events, and re-running would cause an infinite loop.
      if (Date.now() - lastLoadDoneRef.current < LOAD_COOLDOWN_MS) {
        devLog('[useDailyCareInstances] config change suppressed (within cooldown):', category);
        return;
      }
      devLog('[useDailyCareInstances] config change detected, full reload:', category);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => { loadInstances(); }, 300);
    }
    // Tier 2: Instance status / log changes → read-only refresh
    else if (['dailyInstances', 'carePlan', 'logs', 'sampleDataCleared', 'patient'].includes(category)) {
      devLog('[useDailyCareInstances] data change, read-only refresh:', category);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => { refreshFromStorage(); }, 300);
    }
  });

  /**
   * Compute derived state from instances
   * Filters out suppressed items from Today's Scope (unless skipSuppressionFilter is set)
   */
  const state = useMemo((): DailyInstancesState | null => {
    if ((loading || (!skipSuppression && scopeLoading)) && instances.length === 0) return null;

    // Filter out suppressed items from Today's Scope (unless skipSuppressionFilter is set)
    // Suppression uses windowLabel as routineId and carePlanItemId as itemId
    const visibleInstances = skipSuppression
      ? instances
      : instances.filter(instance => {
          // Map instance to suppression check: windowLabel acts as routineId, carePlanItemId as itemId
          const routineId = instance.windowLabel;
          const itemId = instance.carePlanItemId;
          return !isSuppressed(routineId, itemId);
        });

    if (__DEV__) {
      const suppCount = instances.length - visibleInstances.length;
      devLog('[useDailyCareInstances] useMemo computing state, instances.length:', instances.length, 'visible:', visibleInstances.length, 'suppressed:', suppCount, 'skipSuppression:', skipSuppression);
    }

    const currentWindow = getCurrentWindowLabel();

    // Group by window (using visible instances only)
    const byWindow = {
      morning: visibleInstances.filter(i => i.windowLabel === 'morning'),
      afternoon: visibleInstances.filter(i => i.windowLabel === 'afternoon'),
      evening: visibleInstances.filter(i => i.windowLabel === 'evening'),
      night: visibleInstances.filter(i => i.windowLabel === 'night'),
      custom: visibleInstances.filter(i => i.windowLabel === 'custom'),
    };

    // Stats (using visible instances only)
    const stats = {
      total: visibleInstances.length,
      pending: visibleInstances.filter(i => i.status === 'pending').length,
      completed: visibleInstances.filter(i => i.status === 'completed').length,
      skipped: visibleInstances.filter(i => i.status === 'skipped').length,
      missed: visibleInstances.filter(i => i.status === 'missed').length,
    };

    // Find next pending instance (from visible instances)
    const pendingInstances = visibleInstances
      .filter(i => i.status === 'pending')
      .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
    const nextPending = pendingInstances[0] || null;

    // Create groups (from visible instances)
    const groups = createInstanceGroups(visibleInstances, currentWindow);

    return {
      date: targetDate,
      instances: visibleInstances,
      byWindow,
      groups,
      stats,
      nextPending,
      allComplete: stats.pending === 0 && stats.total > 0,
    };
  }, [instances, loading, scopeLoading, targetDate, isSuppressed, skipSuppression]);

  /**
   * Complete an instance
   */
  const completeInstance = useCallback(async (
    instanceId: string,
    outcome: 'taken' | 'completed' | 'skipped' = 'completed',
    data?: any,
    notes?: string
  ): Promise<{ instance: DailyCareInstance; log: LogEntry } | null> => {
    try {
      const result = await logInstanceCompletion(
        patientId,
        targetDate,
        instanceId,
        outcome,
        data,
        { notes, source: 'record' }
      );
      emitDataUpdate(EVENT.DAILY_INSTANCES);
      return result;
    } catch (err) {
      logError('useDailyCareInstances.completeInstance', err);
      throw err;
    }
  }, [patientId, targetDate]);

  /**
   * Skip an instance
   */
  const skipInstance = useCallback(async (instanceId: string, notes?: string) => {
    try {
      await logInstanceCompletion(
        patientId,
        targetDate,
        instanceId,
        'skipped',
        undefined,
        { notes, source: 'record' }
      );
      emitDataUpdate(EVENT.DAILY_INSTANCES);
    } catch (err) {
      logError('useDailyCareInstances.skipInstance', err);
      throw err;
    }
  }, [patientId, targetDate]);

  /**
   * Mark an instance as missed
   */
  const markMissed = useCallback(async (instanceId: string) => {
    try {
      await updateDailyInstanceStatus(patientId, targetDate, instanceId, 'missed');
      emitDataUpdate(EVENT.DAILY_INSTANCES);
    } catch (err) {
      logError('useDailyCareInstances.markMissed', err);
      throw err;
    }
  }, [patientId, targetDate]);

  /**
   * Get instance by ID
   */
  const getInstanceById = useCallback((instanceId: string): DailyCareInstance | undefined => {
    return instances.find(i => i.id === instanceId);
  }, [instances]);

  /**
   * Get instances for a specific window
   */
  const getInstancesForWindow = useCallback((windowLabel: TimeWindowLabel): DailyCareInstance[] => {
    return instances.filter(i => i.windowLabel === windowLabel);
  }, [instances]);

  /**
   * Get instances for the current time window
   */
  const getCurrentWindowInstances = useCallback((): DailyCareInstance[] => {
    const currentWindow = getCurrentWindowLabel();
    return getInstancesForWindow(currentWindow);
  }, [getInstancesForWindow]);

  return {
    state,
    loading,
    error,
    refresh: loadInstances,
    completeInstance,
    skipInstance,
    markMissed,
    getInstanceById,
    getInstancesForWindow,
    getCurrentWindowInstances,
  };
}

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

/**
 * Hook for just the next pending instance
 */
export function useNextPendingInstance(date?: string, patientId?: string) {
  const { state, loading, error, completeInstance } = useDailyCareInstances(date, patientId);

  return {
    nextInstance: state?.nextPending || null,
    loading,
    error,
    complete: completeInstance,
  };
}

/**
 * Hook for daily progress stats
 */
export function useDailyProgress(date?: string, patientId?: string) {
  const { state, loading, error, refresh } = useDailyCareInstances(date, patientId);

  return {
    stats: state?.stats || null,
    allComplete: state?.allComplete || false,
    loading,
    error,
    refresh,
  };
}

/**
 * Hook for instances in a specific time window
 */
export function useWindowInstances(
  windowLabel: TimeWindowLabel,
  date?: string,
  patientId?: string
) {
  const { state, loading, error, completeInstance, skipInstance } = useDailyCareInstances(date, patientId);

  const windowInstances = useMemo(() => {
    if (!state) return [];
    return state.byWindow[windowLabel] || [];
  }, [state, windowLabel]);

  const group = useMemo(() => {
    if (!state) return null;
    return state.groups.find(g => g.windowLabel === windowLabel) || null;
  }, [state, windowLabel]);

  return {
    instances: windowInstances,
    group,
    loading,
    error,
    complete: completeInstance,
    skip: skipInstance,
  };
}
