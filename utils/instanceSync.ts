// ============================================================================
// INSTANCE SYNC - Bridge legacy log screens to the regimen system
// ============================================================================
// When vitals/mood/meals are logged via legacy screens, this utility finds
// the matching pending DailyCareInstance and marks it completed so progress
// rings and timeline update correctly on the Now page.
// ============================================================================

import {
  listDailyInstances,
  logInstanceCompletion,
  DEFAULT_PATIENT_ID,
} from '../storage/carePlanRepo';
import type { LogEntryData, CarePlanItemType } from '../types/carePlan';

/**
 * Find a matching pending DailyCareInstance and mark it completed.
 *
 * This is a fire-and-forget bridge — if no matching instance exists
 * (e.g., no care plan set up, or the type isn't tracked), it's a no-op.
 *
 * @param itemType  - 'vitals' | 'mood' | 'nutrition'
 * @param date      - YYYY-MM-DD
 * @param data      - Optional type-specific LogEntryData
 * @param options   - itemName for matching specific instances (e.g., "Breakfast")
 * @returns true if an instance was updated, false otherwise
 */
export async function syncLogToInstance(
  itemType: CarePlanItemType,
  date: string,
  data?: LogEntryData,
  options?: { itemName?: string },
): Promise<boolean> {
  try {
    const instances = await listDailyInstances(DEFAULT_PATIENT_ID, date);

    // Filter to pending instances of the right type
    const pending = instances.filter(
      (i) => i.itemType === itemType && i.status === 'pending',
    );

    if (pending.length === 0) return false;

    let target = pending[0]; // default: first pending

    if (options?.itemName) {
      // Prefer exact name match (e.g., "Breakfast" vs "Dinner")
      const nameMatch = pending.find(
        (i) => i.itemName.toLowerCase() === options.itemName!.toLowerCase(),
      );
      if (nameMatch) target = nameMatch;
    } else if (pending.length > 1) {
      // Pick the instance closest to now (preferring current/past windows)
      const now = new Date();
      const scored = pending.map((i) => {
        const scheduled = new Date(i.scheduledTime);
        const diffMs = now.getTime() - scheduled.getTime();
        // Positive = past (prefer these), negative = future
        // Among past items, prefer the most recent (smallest positive diff)
        // Among future items, prefer the nearest (smallest negative diff)
        return {
          instance: i,
          score: diffMs >= 0 ? diffMs : Math.abs(diffMs) + 86400000,
        };
      });
      scored.sort((a, b) => a.score - b.score);
      target = scored[0].instance;
    }

    const result = await logInstanceCompletion(
      DEFAULT_PATIENT_ID,
      date,
      target.id,
      'completed',
      data,
      { source: 'record' },
    );

    return result !== null;
  } catch (error) {
    // Don't block the save flow — log and continue
    console.warn('[instanceSync] Failed to sync log to instance:', error);
    return false;
  }
}
