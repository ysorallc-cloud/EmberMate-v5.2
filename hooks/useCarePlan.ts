// ============================================================================
// USE CARE PLAN HOOK
// React hook for accessing care plan and derived day state
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { logError } from '../utils/devLog';
import { useDataListener } from '../lib/events';
import { getTodayDateString } from '../services/carePlanGenerator';
import {
  CarePlan,
  DayState,
  CarePlanOverride,
} from '../types/dayState';
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
import {
  deriveDayState,
  DerivationInputs,
  createEmptyDayState,
} from '../utils/deriveDayState';
import { getMedications, Medication } from '../utils/medicationStorage';
import { getUpcomingAppointments, Appointment } from '../utils/appointmentStorage';
import {
  getTodayVitalsLog,
  getTodayMoodLog,
  getTodayMealsLog,
  getTodayWaterLog,
  getTodaySleepLog,
  VitalsLog,
  MoodLog,
  MealsLog,
  WaterLog,
  SleepLog,
} from '../utils/centralStorage';
import { getLogEventsByDate, LogEvent } from '../utils/logEvents';
import { DataIntegrityWarning } from '../utils/deriveDayState';

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
   * Load all data and derive state
   * Uses the FROZEN daily snapshot of the CarePlan to ensure consistency
   * CarePlan edits only take effect the next day
   */
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get the effective (frozen) care plan for today
      // This ensures CarePlan edits only affect tomorrow
      const effectivePlan = await getEffectiveCarePlan(targetDate);

      // Also get the current (live) plan for reference (e.g., settings display)
      const livePlan = await getCarePlan();
      setCarePlan(livePlan);

      if (!effectivePlan) {
        // No care plan exists
        setDayState(createEmptyDayState(targetDate));
        setLoading(false);
        return;
      }

      // Load all data in parallel (including logEvents for single source of truth)
      const [
        medications,
        vitalsLog,
        moodLog,
        mealsLog,
        waterLog,
        sleepLog,
        appointments,
        overrides,
        logEvents,
      ] = await Promise.all([
        getMedications(),
        getTodayVitalsLog(),
        getTodayMoodLog(),
        getTodayMealsLog(),
        getTodayWaterLog(),
        getTodaySleepLog(),
        getUpcomingAppointments(),
        getOverrides(targetDate),
        getLogEventsByDate(targetDate),
      ]);

      // Derive day state from FROZEN CarePlan snapshot
      // This ensures progress is always computed against the same plan all day
      // Uses logEvents as single source of truth when available
      const inputs: DerivationInputs = {
        date: targetDate,
        currentTime: new Date(),
        carePlan: effectivePlan,
        medications: medications as Medication[],
        vitalsLog: vitalsLog as VitalsLog | null,
        moodLog: moodLog as MoodLog | null,
        mealsLog: mealsLog as MealsLog | null,
        waterLog: waterLog as WaterLog | null,
        sleepLog: sleepLog as SleepLog | null,
        appointments: appointments as Appointment[],
        overrides,
        logEvents: logEvents as LogEvent[],  // Single source of truth
        validateReferences: true,  // Enable data integrity checking
      };

      const state = deriveDayState(inputs);
      setDayState(state);
      setOverridesState(overrides);
      setIntegrityWarnings(state.integrityWarnings || []);
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
