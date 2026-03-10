// ============================================================================
// Hero Card vs Schedule Sync — ensures hero number matches enabled ring buckets
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';

interface StatData { completed: number; total: number }
interface TodayStats {
  meds: StatData;
  vitals: StatData;
  meals: StatData;
  water: StatData;
  sleep: StatData;
  activity: StatData;
  wellness: StatData;
  custom?: StatData;
}

describe('Hero card matches enabled ring buckets', () => {
  const todayStats: TodayStats = {
    meds: { completed: 2, total: 5 },
    vitals: { completed: 0, total: 1 },
    meals: { completed: 1, total: 3 },
    water: { completed: 3, total: 8 },
    sleep: { completed: 0, total: 0 },
    activity: { completed: 0, total: 0 },
    wellness: { completed: 3, total: 3 },
  };

  const enabledBuckets = ['meds', 'vitals', 'meals', 'wellness'];

  // Replicate the hero computation logic from today.tsx
  function computeHero(stats: TodayStats, buckets: string[], instances: { itemType: string }[]) {
    const BUCKET_STAT_KEY: Record<string, keyof TodayStats> = {
      meds: 'meds', vitals: 'vitals', meals: 'meals', water: 'water',
      sleep: 'sleep', activity: 'activity', wellness: 'wellness', custom: 'custom',
    };

    const instanceBuckets = new Set(
      instances.map(i => {
        const typeMap: Record<string, string> = {
          medication: 'meds', vitals: 'vitals', nutrition: 'meals',
          activity: 'activity', wellness: 'wellness', custom: 'custom',
          sleep: 'sleep',
        };
        return typeMap[i.itemType] ?? '';
      }).filter(Boolean)
    );

    const activeBuckets = buckets.length > 0 ? buckets : ['meds', 'vitals', 'meals', 'activity'];
    let done = 0;
    let total = 0;

    for (const bucket of activeBuckets) {
      if (!instanceBuckets.has(bucket)) continue;
      const key = BUCKET_STAT_KEY[bucket];
      if (key) {
        const stat = stats[key];
        if (stat && stat.total > 0) {
          done += stat.completed ?? 0;
          total += stat.total ?? 0;
        }
      }
    }

    if (stats.custom && stats.custom.total > 0 && !activeBuckets.includes('custom')) {
      done += stats.custom.completed ?? 0;
      total += stats.custom.total ?? 0;
    }

    return { heroDone: done, heroTotal: total };
  }

  test('hero should include wellness when it is in enabledBuckets', () => {
    // Mock instances matching the stats
    const instances = [
      { itemType: 'medication' }, { itemType: 'medication' }, { itemType: 'medication' },
      { itemType: 'medication' }, { itemType: 'medication' },
      { itemType: 'vitals' },
      { itemType: 'nutrition' }, { itemType: 'nutrition' }, { itemType: 'nutrition' },
      { itemType: 'wellness' }, { itemType: 'wellness' }, { itemType: 'wellness' },
    ];

    const { heroDone, heroTotal } = computeHero(todayStats, enabledBuckets, instances);

    // Should include wellness: 2+0+1+3 = 6 done, 5+1+3+3 = 12 total
    expect(heroDone).toBe(6);
    expect(heroTotal).toBe(12);

    // Old buggy logic would give 3/9 (only meds+vitals+meals+activity)
    const buggyDone = todayStats.meds.completed + todayStats.vitals.completed +
                      todayStats.meals.completed + todayStats.activity.completed;
    const buggyTotal = todayStats.meds.total + todayStats.vitals.total +
                       todayStats.meals.total + todayStats.activity.total;
    expect(buggyDone).toBe(3);
    expect(buggyTotal).toBe(9);

    // Confirm the fix gives different (correct) numbers
    expect(heroDone).not.toBe(buggyDone);
    expect(heroTotal).not.toBe(buggyTotal);
  });

  test('water bucket should not inflate hero when tracked manually', () => {
    const bucketsWithWater = ['meds', 'vitals', 'meals', 'water', 'wellness'];
    // No water instances — water is tracked via waterGlasses, not instances
    const instances = [
      { itemType: 'medication' }, { itemType: 'medication' }, { itemType: 'medication' },
      { itemType: 'medication' }, { itemType: 'medication' },
      { itemType: 'vitals' },
      { itemType: 'nutrition' }, { itemType: 'nutrition' }, { itemType: 'nutrition' },
      { itemType: 'wellness' }, { itemType: 'wellness' }, { itemType: 'wellness' },
    ];

    const { heroDone, heroTotal } = computeHero(todayStats, bucketsWithWater, instances);

    // Water has no instances, so it should NOT be counted
    expect(heroDone).toBe(6);
    expect(heroTotal).toBe(12);
  });

  test('today.tsx computes heroDone/heroTotal from enabled buckets', () => {
    const todayPath = path.resolve(__dirname, '../app/(tabs)/today.tsx');
    const content = fs.readFileSync(todayPath, 'utf-8');

    // Hero render should use computed heroDone/heroTotal
    expect(content).toContain('{heroDone}');
    expect(content).toContain('{heroTotal}');

    // completionPct should derive from heroDone/heroTotal
    expect(content).toMatch(/completionPct.*heroDone.*heroTotal|heroDone.*\/.*heroTotal.*completionPct/s);
  });
});
