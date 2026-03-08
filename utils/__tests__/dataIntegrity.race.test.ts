// ============================================================================
// DATA INTEGRITY RACE CONDITION TESTS
// ============================================================================
//
// These tests verify that the per-key lock (withKeyLock) prevents race
// conditions in carePlanRepo's read-modify-write operations on DAILY_INSTANCES.
//
// Without the lock, concurrent writes would follow this pattern:
//   Op A reads [item1], Op B reads [item1], Op A writes [item1, item2],
//   Op B writes [item1, item3] — item2 is LOST (last-write-wins).
//
// With the lock, Op B waits for Op A to complete before reading, so both
// changes are preserved.
//
// ============================================================================

import {
  upsertDailyInstances,
  updateDailyInstanceStatus,
  listDailyInstances,
  removeStaleInstances,
} from '../../storage/carePlanRepo';
import * as safeStorage from '../../utils/safeStorage';
import { emitDataUpdate } from '../../lib/events';
import type { DailyCareInstance } from '../../types/carePlan';

// ============================================================================
// MOCK SETUP
// ============================================================================

jest.mock('../../lib/events');

const mockEmitDataUpdate = emitDataUpdate as jest.Mock;

// ============================================================================
// HELPERS
// ============================================================================

const PATIENT_ID = 'race-patient';
const TODAY = '2025-06-15';
const NOW_ISO = '2025-06-15T10:00:00.000Z';

function makeDailyInstance(overrides: Partial<DailyCareInstance> = {}): DailyCareInstance {
  return {
    id: 'inst-1',
    carePlanId: 'plan-1',
    carePlanItemId: 'item-1',
    patientId: PATIENT_ID,
    date: TODAY,
    scheduledTime: '2025-06-15T08:00:00.000Z',
    windowLabel: 'morning',
    windowId: 'tw-1',
    status: 'pending',
    itemName: 'Aspirin 81mg',
    itemType: 'medication',
    priority: 'required',
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    ...overrides,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// TESTS
// ============================================================================

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date(NOW_ISO));
  mockEmitDataUpdate.mockReset();
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('Race Condition Prevention via per-key locking', () => {
  // --------------------------------------------------------------------------
  // Scenario 1: Concurrent updateDailyInstanceStatus calls
  // --------------------------------------------------------------------------
  it('concurrent status updates both persist (lock serializes writes)', async () => {
    jest.useRealTimers();

    // Setup: Create 3 pending instances
    const instances = [
      makeDailyInstance({ id: 'inst-1', carePlanItemId: 'item-1', status: 'pending' }),
      makeDailyInstance({ id: 'inst-2', carePlanItemId: 'item-2', status: 'pending', itemName: 'Metformin 500mg' }),
      makeDailyInstance({ id: 'inst-3', carePlanItemId: 'item-3', status: 'pending', itemName: 'Walk 15 min' }),
    ];
    await upsertDailyInstances(PATIENT_ID, TODAY, instances);

    const beforeUpdate = await listDailyInstances(PATIENT_ID, TODAY);
    expect(beforeUpdate).toHaveLength(3);
    expect(beforeUpdate.every(i => i.status === 'pending')).toBe(true);

    // Inject delay into safeSetItem to create a window where the race
    // WOULD have occurred without the lock
    const originalSetItem = safeStorage.safeSetItem;
    let setItemCallCount = 0;
    jest.spyOn(safeStorage, 'safeSetItem').mockImplementation(
      async (key: string, value: any): Promise<boolean> => {
        setItemCallCount++;
        if (setItemCallCount <= 2 && key.includes('instances_v2') && !key.includes('index')) {
          await delay(50);
        }
        return originalSetItem(key, value);
      }
    );

    // Execute: Mark inst-1 and inst-2 as completed concurrently
    const [result1, result2] = await Promise.all([
      updateDailyInstanceStatus(PATIENT_ID, TODAY, 'inst-1', 'completed'),
      updateDailyInstanceStatus(PATIENT_ID, TODAY, 'inst-2', 'completed'),
    ]);

    expect(result1).not.toBeNull();
    expect(result2).not.toBeNull();

    // FIXED: With the lock, both completions are persisted
    const afterUpdate = await listDailyInstances(PATIENT_ID, TODAY);
    const inst1Final = afterUpdate.find(i => i.id === 'inst-1');
    const inst2Final = afterUpdate.find(i => i.id === 'inst-2');

    expect(afterUpdate).toHaveLength(3);
    expect(inst1Final?.status).toBe('completed');
    expect(inst2Final?.status).toBe('completed');
  });

  // --------------------------------------------------------------------------
  // Scenario 2: upsertDailyInstances during updateDailyInstanceStatus
  // --------------------------------------------------------------------------
  it('upsert and status update both persist (lock serializes writes)', async () => {
    jest.useRealTimers();

    const initialInstances = [
      makeDailyInstance({ id: 'inst-1', carePlanItemId: 'item-1', status: 'pending' }),
      makeDailyInstance({ id: 'inst-2', carePlanItemId: 'item-2', status: 'pending', itemName: 'Metformin 500mg' }),
    ];
    await upsertDailyInstances(PATIENT_ID, TODAY, initialInstances);

    const originalSetItem = safeStorage.safeSetItem;
    let setItemCallCount = 0;
    jest.spyOn(safeStorage, 'safeSetItem').mockImplementation(
      async (key: string, value: any): Promise<boolean> => {
        setItemCallCount++;
        if (setItemCallCount === 1 && key.includes('instances_v2') && !key.includes('index')) {
          await delay(50);
        }
        return originalSetItem(key, value);
      }
    );

    const newInstance = makeDailyInstance({
      id: 'inst-3',
      carePlanItemId: 'item-3',
      itemName: 'Evening walk',
      status: 'pending',
    });

    const [statusResult, _upsertResult] = await Promise.all([
      updateDailyInstanceStatus(PATIENT_ID, TODAY, 'inst-1', 'completed'),
      upsertDailyInstances(PATIENT_ID, TODAY, [newInstance]),
    ]);

    expect(statusResult).not.toBeNull();

    // FIXED: Both changes persist — inst-1 is completed AND inst-3 exists
    const afterRace = await listDailyInstances(PATIENT_ID, TODAY);
    const inst1 = afterRace.find(i => i.id === 'inst-1');
    const inst3 = afterRace.find(i => i.id === 'inst-3');

    expect(inst1?.status).toBe('completed');
    expect(inst3).toBeDefined();
    expect(afterRace.length).toBeGreaterThanOrEqual(3);
  });

  // --------------------------------------------------------------------------
  // Scenario 3: removeStaleInstances during updateDailyInstanceStatus
  // --------------------------------------------------------------------------
  it('stale removal and status update both persist (lock serializes writes)', async () => {
    jest.useRealTimers();

    const instances = [
      makeDailyInstance({
        id: 'inst-valid',
        carePlanItemId: 'item-1',
        status: 'pending',
        itemName: 'Aspirin (valid)',
      }),
      makeDailyInstance({
        id: 'inst-stale-1',
        carePlanItemId: 'item-deleted-1',
        status: 'pending',
        itemName: 'Removed med 1',
      }),
      makeDailyInstance({
        id: 'inst-stale-2',
        carePlanItemId: 'item-deleted-2',
        status: 'pending',
        itemName: 'Removed med 2',
      }),
    ];
    await upsertDailyInstances(PATIENT_ID, TODAY, instances);

    const before = await listDailyInstances(PATIENT_ID, TODAY);
    expect(before).toHaveLength(3);

    const originalSetItem = safeStorage.safeSetItem;
    let setItemCallCount = 0;
    jest.spyOn(safeStorage, 'safeSetItem').mockImplementation(
      async (key: string, value: any): Promise<boolean> => {
        setItemCallCount++;
        if (setItemCallCount === 1 && key.includes('instances_v2') && !key.includes('index')) {
          await delay(50);
        }
        return originalSetItem(key, value);
      }
    );

    const validItemIds = new Set(['item-1']);

    const [removedCount, statusResult] = await Promise.all([
      removeStaleInstances(PATIENT_ID, TODAY, validItemIds),
      updateDailyInstanceStatus(PATIENT_ID, TODAY, 'inst-valid', 'completed', 'log-1'),
    ]);

    expect(removedCount).toBe(2);
    expect(statusResult).not.toBeNull();

    // FIXED: Both operations succeed — stale removed AND valid completed
    const after = await listDailyInstances(PATIENT_ID, TODAY);
    const validInstance = after.find(i => i.id === 'inst-valid');
    const staleRemoved = !after.some(i => i.carePlanItemId.includes('deleted'));

    expect(validInstance?.status).toBe('completed');
    expect(staleRemoved).toBe(true);
    expect(after).toHaveLength(1);
  });
});
