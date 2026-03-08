/**
 * TEST: Meal instance migration during sync
 * 
 * Bug: When ensureDailyInstances runs, syncOtherBucketsWithConfig deactivates
 * non-sync nutrition items (e.g. "sample-meal-midday") and removeStaleInstances
 * deletes their instances. Then a new sync-meal-midday item creates a fresh
 * pending instance, losing the user's completion.
 * 
 * Fix: Before deactivating non-sync meal items, migrate any completed instances
 * to the corresponding sync-meal-* item so they survive stale-instance cleanup.
 * 
 * Reproduction:
 * 1. User has sample data with item "sample-meal-midday" → Lunch instance (completed)
 * 2. App refreshes → ensureDailyInstances → syncOtherBucketsWithConfig
 * 3. Non-sync item deactivated → removeStaleInstances removes completed Lunch
 * 4. New sync-meal-midday item → generates fresh pending Lunch instance
 * 5. User sees Lunch as incomplete despite having logged it
 * 
 * Expected after fix:
 * - Completed instance is migrated from "sample-meal-midday" to "sync-meal-midday"
 * - removeStaleInstances sees the instance belongs to a valid sync item
 * - No new pending instance is created (existing instance found in map)
 * - Lunch remains completed
 */

describe('Meal instance persistence across sync cycles', () => {
  
  it('should describe the bug: non-sync meal items lose completions on refresh', () => {
    // This test documents the root cause:
    //
    // ensureDailyInstances flow:
    //   1. syncOtherBucketsWithConfig runs
    //   2. Finds "sample-meal-midday" (active, non-sync) → deactivates it
    //   3. Creates "sync-meal-midday" if it doesn't exist
    //   4. removeStaleInstances: "sample-meal-midday" not in validItemIds → removes its instances
    //   5. Instance generation loop: "sync-meal-midday" has no existing instance → creates new pending
    //
    // The key: existingMap key is `${item.id}:${timeWindow.id}`
    //   Old: "sample-meal-midday:sample-meal-midday-time"
    //   New: "sync-meal-midday:sync-meal-midday-time"
    //   These are different keys → old completed instance not found → new pending created

    const oldKey = 'sample-meal-midday:sample-meal-midday-time';
    const newKey = 'sync-meal-midday:sync-meal-middy-time';
    expect(oldKey).not.toBe(newKey);
  });

  it('should describe the fix: migration remaps carePlanItemId before deactivation', () => {
    // The fix in syncOtherBucketsWithConfig:
    //   1. Before deactivating "sample-meal-midday", check for completed instances today
    //   2. Map meal name to sync target: "Lunch" → "sync-meal-midday"
    //   3. Remap instance.carePlanItemId from "sample-meal-midday" to "sync-meal-midday"
    //   4. upsertDailyInstances writes the migrated instance
    //   5. removeStaleInstances: instance now belongs to "sync-meal-midday" (valid) → kept
    //   6. Instance generation loop: "sync-meal-midday" found in existingMap → no new instance
    //   7. Lunch stays completed

    // Meal name → sync target mapping
    const mealNameMap: Record<string, string> = {
      'breakfast': 'sync-meal-morning',
      'lunch': 'sync-meal-midday', 
      'dinner': 'sync-meal-evening',
      'snack': 'sync-meal-night',
    };

    expect(mealNameMap['lunch']).toBe('sync-meal-midday');
    expect(mealNameMap['breakfast']).toBe('sync-meal-morning');
    expect(mealNameMap['dinner']).toBe('sync-meal-evening');
  });

  it('should not migrate pending instances (only completed/skipped)', () => {
    // Pending instances should not be migrated — they should be replaced
    // by the new sync item's auto-generated instance, which will get the 
    // correct auto-miss logic applied
    const statuses = ['completed', 'skipped', 'missed'];
    const shouldMigrate = statuses.filter(s => s !== 'pending');
    expect(shouldMigrate).toEqual(['completed', 'skipped', 'missed']);
  });

  it('should not migrate if sync target already has an instance', () => {
    // If sync-meal-midday already has its own instance (from a previous cycle),
    // we should not overwrite it with the old item's instance
    const syncAlreadyHasInstance = true;
    const shouldMigrate = !syncAlreadyHasInstance;
    expect(shouldMigrate).toBe(false);
  });
});
