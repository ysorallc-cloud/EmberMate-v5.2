/**
 * Tests for Care Plan ↔ Now page sync fixes (SYNC-1, SYNC-2, SYNC-3).
 * Source-level verification of event emission and listener tiers.
 */
import * as fs from 'fs';
import * as path from 'path';

const configSrc = fs.readFileSync(
  path.resolve(__dirname, '../../hooks/useCarePlanConfig.ts'), 'utf-8'
);
const instancesSrc = fs.readFileSync(
  path.resolve(__dirname, '../../hooks/useDailyCareInstances.ts'), 'utf-8'
);

// ============================================================================
// SYNC-1: updateMedication and removeMedication emit events
// ============================================================================
describe('SYNC-1: medication operations emit events', () => {
  test('updateMedication emits CARE_PLAN_ITEMS and DAILY_INSTANCES', () => {
    const updateMatch = configSrc.match(
      /const updateMedication[\s\S]*?(?=\/\*\*\s*\n\s*\* Remove)/
    );
    expect(updateMatch).not.toBeNull();
    const block = updateMatch![0];
    expect(block).toContain('emitDataUpdate(EVENT.CARE_PLAN_ITEMS)');
    expect(block).toContain('emitDataUpdate(EVENT.DAILY_INSTANCES)');
  });

  test('removeMedication emits CARE_PLAN_ITEMS and DAILY_INSTANCES', () => {
    const removeMatch = configSrc.match(
      /const removeMedication[\s\S]*?(?=\/\*\*\s*\n\s*\* Get active)/
    );
    expect(removeMatch).not.toBeNull();
    const block = removeMatch![0];
    expect(block).toContain('emitDataUpdate(EVENT.CARE_PLAN_ITEMS)');
    expect(block).toContain('emitDataUpdate(EVENT.DAILY_INSTANCES)');
  });
});

// ============================================================================
// SYNC-2: Two-tier internal listener
// ============================================================================
describe('SYNC-2: useDailyCareInstances two-tier listener', () => {
  test('carePlanConfig triggers loadInstances (tier 1)', () => {
    // The listener should have a block that matches carePlanConfig and calls loadInstances
    expect(instancesSrc).toMatch(/carePlanConfig.*carePlanItems.*loadInstances/s);
  });

  test('dailyInstances triggers refreshFromStorage (tier 2)', () => {
    // The listener should have a separate block for dailyInstances calling refreshFromStorage
    expect(instancesSrc).toMatch(/dailyInstances.*refreshFromStorage/s);
  });

  test('carePlanItems is in tier 1 (full regeneration), not tier 2', () => {
    // carePlanItems should be in the loadInstances block, not the refreshFromStorage block
    const tier2Match = instancesSrc.match(
      /else if \(\[.*\]\.includes\(category\)\)[\s\S]*?refreshFromStorage/
    );
    expect(tier2Match).not.toBeNull();
    // carePlanItems should NOT be in tier 2
    expect(tier2Match![0]).not.toContain('carePlanItems');
  });
});

// ============================================================================
// SYNC-3: refreshFromStorage race guard
// ============================================================================
describe('SYNC-3: refreshFromStorage race guard', () => {
  test('refreshFromStorage checks loadingRef.current before proceeding', () => {
    const refreshMatch = instancesSrc.match(
      /const refreshFromStorage = useCallback\(async \(\) => \{[\s\S]*?\}, \[/
    );
    expect(refreshMatch).not.toBeNull();
    const block = refreshMatch![0];
    expect(block).toContain('loadingRef.current');
    expect(block).toContain('return');
  });
});
