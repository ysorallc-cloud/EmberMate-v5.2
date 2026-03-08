// ============================================================================
// USE TODAY'S SCOPE HOOK
// Temporary daily suppressions - hide items from Now/Record without editing Care Plan
// Suppressions are date-scoped and auto-expire tomorrow
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { logError } from '../utils/devLog';
import { emitDataUpdate, useDataListener } from '../lib/events';
import { EVENT } from '../lib/eventNames';
import { getTodayDateString } from '../services/carePlanGenerator';
import {
  getOverrides,
  suppressItemForToday,
  unsuppressItem,
  resetTodayScope,
  getSuppressedItems,
} from '../utils/carePlanStorage';

// ============================================================================
// TYPES
// ============================================================================

export interface TodayScopeItem {
  routineId: string;
  itemId: string;
}

export interface UseTodayScopeReturn {
  // State
  suppressedItems: TodayScopeItem[];
  loading: boolean;

  // Actions
  suppress: (routineId: string, itemId: string) => Promise<void>;
  unsuppress: (routineId: string, itemId: string) => Promise<void>;
  toggleSuppression: (routineId: string, itemId: string) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  refresh: () => Promise<void>;

  // Helpers
  isSuppressed: (routineId: string, itemId: string) => boolean;
  hasSuppressedItems: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

export function useTodayScope(date?: string): UseTodayScopeReturn {
  const targetDate = date || getTodayDateString();
  const [suppressedItems, setSuppressedItems] = useState<TodayScopeItem[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * Load suppressed items for the date
   */
  const loadSuppressedItems = useCallback(async () => {
    try {
      setLoading(true);
      const items = await getSuppressedItems(targetDate);
      setSuppressedItems(items);
    } catch (error) {
      logError('useTodayScope.loadSuppressedItems', error);
      setSuppressedItems([]);
    } finally {
      setLoading(false);
    }
  }, [targetDate]);

  // Initial load
  useEffect(() => {
    loadSuppressedItems();
  }, [loadSuppressedItems]);

  // Listen for relevant data updates — debounced to prevent cascading re-renders
  const scopeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useDataListener((category) => {
    if (['carePlanItems', 'dailyInstances', 'sampleDataCleared'].includes(category)) {
      if (scopeTimerRef.current) clearTimeout(scopeTimerRef.current);
      scopeTimerRef.current = setTimeout(() => { loadSuppressedItems(); }, 300);
    }
  });

  /**
   * Suppress an item for today
   */
  const suppress = useCallback(async (routineId: string, itemId: string) => {
    await suppressItemForToday(routineId, itemId, targetDate);
    await loadSuppressedItems();
    emitDataUpdate(EVENT.CARE_PLAN);
  }, [targetDate, loadSuppressedItems]);

  /**
   * Unsuppress an item
   */
  const unsuppressCallback = useCallback(async (routineId: string, itemId: string) => {
    await unsuppressItem(routineId, itemId, targetDate);
    await loadSuppressedItems();
    emitDataUpdate(EVENT.CARE_PLAN);
  }, [targetDate, loadSuppressedItems]);

  /**
   * Toggle suppression state
   */
  const toggleSuppression = useCallback(async (routineId: string, itemId: string) => {
    const isCurrentlySuppressed = suppressedItems.some(
      s => s.routineId === routineId && s.itemId === itemId
    );
    if (isCurrentlySuppressed) {
      await unsuppressCallback(routineId, itemId);
    } else {
      await suppress(routineId, itemId);
    }
  }, [suppressedItems, suppress, unsuppressCallback]);

  /**
   * Reset to Care Plan defaults (clear all suppressions)
   */
  const resetToDefaults = useCallback(async () => {
    await resetTodayScope(targetDate);
    await loadSuppressedItems();
    emitDataUpdate(EVENT.CARE_PLAN);
  }, [targetDate, loadSuppressedItems]);

  /**
   * Check if a specific item is suppressed
   */
  const isSuppressed = useCallback((routineId: string, itemId: string): boolean => {
    return suppressedItems.some(
      s => s.routineId === routineId && s.itemId === itemId
    );
  }, [suppressedItems]);

  return {
    suppressedItems,
    loading,
    suppress,
    unsuppress: unsuppressCallback,
    toggleSuppression,
    resetToDefaults,
    refresh: loadSuppressedItems,
    isSuppressed,
    hasSuppressedItems: suppressedItems.length > 0,
  };
}

export default useTodayScope;
