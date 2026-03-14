// ============================================================================
// USE CARE PLAN HOOK
// React hook for accessing care plan and derived day state
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { logError } from '../utils/devLog';
import { useDataListener } from '../lib/events';
import { getTodayDateString } from '../services/carePlanGenerator';
import {
  RoutineCarePlan as CarePlan,
  DayState,
  CarePlanOverride,
} from '../types/derived';
import {
  getCarePlan,
  getEffectiveCarePlan,
  ensureCarePlan,
  ensureDailySnapshot,
  getOverrides,
  setOverride,
  removeOverride,
  updateCarePlan as updateCarePlanStorage,
} from '../utils/carePlanStorage';

export interface DataIntegrityWarning {
  type: 'missing_medication' | 'missing_appointment' | 'orphaned_item';
  routineId: string;
  itemId: string;
  message: string;
  missingId?: string;
}

function createEmptyDayState(date: string): DayState {
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

// ============================================================================
// TYPES
// ============================================================================

export interface UseCarePlanReturn {
  // State
  carePlan: CarePlan | null;
  dayState: DayState | null;
  overrides: CarePlanOverride[];
  loading: boolean;
  error: Error | null;

  // Data integrity
  integrityWarnings: DataIntegrityWarning[];

  // Actions
  refresh: () => Promise<void>;
  setItemOverride: (routineId: string, itemId: string, done: boolean) => Promise<void>;
  clearItemOverride: (routineId: string, itemId: string) => Promise<void>;
  snoozeItem: (routineId: string, itemId: string, snoozeMinutes: number) => Promise<void>;
  clearSnooze: (routineId: string, itemId: string) => Promise<void>;
  updateCarePlan: (updates: Partial<CarePlan>) => Promise<void>;
  initializeCarePlan: () => Promise<CarePlan>;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for accessing care plan and derived day state
 * @param date Optional date string (YYYY-MM-DD). Defaults to today.
 */
export function useCarePlan(date?: string): UseCarePlanReturn {
  const targetDate = date || getTodayDateString();

  const [carePlan, setCarePlan] = useState<CarePlan | null>(null);
  const [dayState, setDayState] = useState<DayState | null>(null);
  const [overrides, setOverridesState] = useState<CarePlanOverride[]>([]);
  const [integrityWarnings, setIntegrityWarnings] = useState<DataIntegrityWarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Load care plan and overrides.
   * DayState derivation has been deprecated in favor of useCareTasks hook.
   * This hook now returns an empty DayState — consumers needing task/progress
   * data should use useCareTasks() directly.
   */
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const livePlan = await getCarePlan();
      setCarePlan(livePlan);

      const overrides = await getOverrides(targetDate);
      setOverridesState(overrides);

      // Return empty DayState — real task data comes from useCareTasks
      setDayState(createEmptyDayState(targetDate));
      setIntegrityWarnings([]);
    } catch (err) {
      logError('useCarePlan.loadData', err);
      setError(err instanceof Error ? err : new Error('Failed to load care plan'));
    } finally {
      setLoading(false);
    }
  }, [targetDate]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Listen for relevant data updates only
  useDataListener((category) => {
    if (['carePlan', 'carePlanItems', 'sampleDataCleared', 'patient'].includes(category)) {
      loadData();
    }
  });

  /**
   * Refresh data manually
   */
  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  /**
   * Set an override for an item
   */
  const setItemOverride = useCallback(async (
    routineId: string,
    itemId: string,
    done: boolean
  ) => {
    try {
      const override: CarePlanOverride = {
        date: targetDate,
        routineId,
        itemId,
        done,
        timestamp: new Date().toISOString(),
      };
      await setOverride(override);
      // Data will refresh via listener
    } catch (err) {
      logError('useCarePlan.setItemOverride', err);
      throw err;
    }
  }, [targetDate]);

  /**
   * Clear an override for an item
   */
  const clearItemOverride = useCallback(async (
    routineId: string,
    itemId: string
  ) => {
    try {
      await removeOverride(targetDate, routineId, itemId);
      // Data will refresh via listener
    } catch (err) {
      logError('useCarePlan.clearItemOverride', err);
      throw err;
    }
  }, [targetDate]);

  /**
   * Update the care plan
   */
  const updateCarePlan = useCallback(async (updates: Partial<CarePlan>) => {
    try {
      await updateCarePlanStorage(updates);
      // Data will refresh via listener
    } catch (err) {
      logError('useCarePlan.updateCarePlan', err);
      throw err;
    }
  }, []);

  /**
   * Initialize care plan if none exists
   */
  const initializeCarePlan = useCallback(async () => {
    try {
      const plan = await ensureCarePlan();
      setCarePlan(plan);
      await loadData();
      return plan;
    } catch (err) {
      logError('useCarePlan.initializeCarePlan', err);
      throw err;
    }
  }, [loadData]);

  /**
   * Snooze an item for a specified number of minutes
   * Used for "Later" action on schedule items
   */
  const snoozeItem = useCallback(async (
    routineId: string,
    itemId: string,
    snoozeMinutes: number
  ) => {
    try {
      const now = new Date();
      const currentMin = now.getHours() * 60 + now.getMinutes();
      const snoozeUntilMin = currentMin + snoozeMinutes;

      const override: CarePlanOverride = {
        date: targetDate,
        routineId,
        itemId,
        done: false,
        timestamp: now.toISOString(),
        snoozeUntilMin,
      };
      await setOverride(override);
      // Data will refresh via listener
    } catch (err) {
      logError('useCarePlan.snoozeItem', err);
      throw err;
    }
  }, [targetDate]);

  /**
   * Clear snooze for an item
   */
  const clearSnooze = useCallback(async (
    routineId: string,
    itemId: string
  ) => {
    try {
      // Remove the override entirely to clear snooze
      await removeOverride(targetDate, routineId, itemId);
      // Data will refresh via listener
    } catch (err) {
      logError('useCarePlan.clearSnooze', err);
      throw err;
    }
  }, [targetDate]);

  return {
    carePlan,
    dayState,
    overrides,
    loading,
    error,
    integrityWarnings,
    refresh,
    setItemOverride,
    clearItemOverride,
    snoozeItem,
    clearSnooze,
    updateCarePlan,
    initializeCarePlan,
  };
}

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

/**
 * Hook for just the day state progress
 */
export function useCarePlanProgress(date?: string) {
  const { dayState, loading, error, refresh } = useCarePlan(date);

  return {
    progress: dayState?.progress || null,
    loading,
    error,
    refresh,
  };
}

/**
 * Hook for just the timeline
 */
export function useCarePlanTimeline(date?: string) {
  const { dayState, loading, error, refresh } = useCarePlan(date);

  return {
    timeline: dayState?.timeline || [],
    nextAction: dayState?.nextAction || null,
    loading,
    error,
    refresh,
  };
}

/**
 * Hook for checking if care plan exists
 */
export function useHasCarePlan() {
  const { carePlan, loading } = useCarePlan();

  return {
    hasCarePlan: !!carePlan,
    loading,
  };
}
