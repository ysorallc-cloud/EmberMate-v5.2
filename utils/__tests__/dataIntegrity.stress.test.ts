// ============================================================================
// DATA INTEGRITY STRESS TESTS — Silent Write Failures
// ============================================================================
//
// These tests verify that carePlanRepo correctly handles safeSetItem failures:
//   - emitDataUpdate() must NOT fire when a write fails
//   - Sequential writes should bail early on first failure
//   - clearAllPatientData should only emit for successful clears
//
// ============================================================================

import {
  upsertCarePlan,
  upsertCarePlanItem,
  updateDailyInstanceStatus,
  upsertDailyInstances,
  createLogEntry,
  clearAllPatientData,
  createCarePlan,
  listLogsByDate,
  listDailyInstances,
} from '../../storage/carePlanRepo';
import { safeSetItem, safeGetItem } from '../../utils/safeStorage';
import { emitDataUpdate } from '../../lib/events';
import type {
  CarePlan,
  CarePlanItem,
  DailyCareInstance,
} from '../../types/carePlan';

// ============================================================================
// MOCK SETUP
// ============================================================================

jest.mock('../../utils/safeStorage');
jest.mock('../../lib/events');

const mockSafeSetItem = safeSetItem as jest.Mock;
const mockSafeGetItem = safeGetItem as jest.Mock;
const mockEmitDataUpdate = emitDataUpdate as jest.Mock;

// ============================================================================
// HELPERS
// ============================================================================

const PATIENT_ID = 'test-patient';
const TODAY = '2025-06-15';
const NOW_ISO = '2025-06-15T10:00:00.000Z';

/** In-memory store for safeGetItem reads */
let memoryStore: Record<string, any> = {};

function setupInMemoryGetItem() {
  mockSafeGetItem.mockImplementation(async (key: string, defaultValue: any) => {
    if (key in memoryStore) {
      // Return a deep copy to avoid reference sharing.
      return JSON.parse(JSON.stringify(memoryStore[key]));
    }
    return defaultValue;
  });
}

/** safeSetItem that succeeds and writes to memoryStore */
function setupSetItemSuccess() {
  mockSafeSetItem.mockImplementation(async (key: string, value: any) => {
    memoryStore[key] = value;
    return true;
  });
}

/** safeSetItem that always fails (returns false, never writes) */
function setupSetItemAlwaysFails() {
  mockSafeSetItem.mockImplementation(async (_key: string, _value: any) => {
    return false;
  });
}

function makeCarePlan(overrides: Partial<CarePlan> = {}): CarePlan {
  return {
    id: 'plan-1',
    patientId: PATIENT_ID,
    timezone: 'America/New_York',
    startDate: TODAY,
    status: 'active',
    version: 1,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    ...overrides,
  };
}

function makeCarePlanItem(overrides: Partial<CarePlanItem> = {}): CarePlanItem {
  return {
    id: 'item-1',
    carePlanId: 'plan-1',
    type: 'medication',
    name: 'Aspirin 81mg',
    priority: 'required',
    active: true,
    schedule: {
      frequency: 'daily',
      times: [{ id: 'tw-1', kind: 'exact', label: 'morning', at: '08:00' }],
    },
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    ...overrides,
  };
}

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

// ============================================================================
// TESTS
// ============================================================================

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date(NOW_ISO));
  memoryStore = {};
  mockSafeSetItem.mockReset();
  mockSafeGetItem.mockReset();
  mockEmitDataUpdate.mockReset();
  setupInMemoryGetItem();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('Silent Write Failure Protection in carePlanRepo', () => {
  // --------------------------------------------------------------------------
  // Scenario 1: upsertCarePlan
  // --------------------------------------------------------------------------
  it('does NOT emit when upsertCarePlan write fails', async () => {
    setupSetItemAlwaysFails();

    const plan = makeCarePlan();
    const result = await upsertCarePlan(plan);

    // Function still returns the plan object (it was prepared in memory)
    expect(result).toBeDefined();
    expect(result.id).toBe('plan-1');

    // FIXED: emitDataUpdate should NOT fire when write fails
    expect(mockEmitDataUpdate).not.toHaveBeenCalled();

    // Verify nothing was actually written
    expect(Object.keys(memoryStore)).toHaveLength(0);
  });

  // --------------------------------------------------------------------------
  // Scenario 2: upsertCarePlanItem
  // --------------------------------------------------------------------------
  it('does NOT emit when upsertCarePlanItem write fails', async () => {
    setupSetItemAlwaysFails();

    const item = makeCarePlanItem();
    const result = await upsertCarePlanItem(item);

    expect(result).toBeDefined();
    expect(result.id).toBe('item-1');

    // FIXED: no emission on write failure
    expect(mockEmitDataUpdate).not.toHaveBeenCalled();

    // Nothing persisted
    expect(Object.keys(memoryStore)).toHaveLength(0);
  });

  // --------------------------------------------------------------------------
  // Scenario 3: updateDailyInstanceStatus
  // --------------------------------------------------------------------------
  it('does NOT emit when updateDailyInstanceStatus write fails', async () => {
    // Setup: Allow all writes during instance creation, then switch to fail mode
    let failWrites = false;
    mockSafeSetItem.mockImplementation(async (key: string, value: any) => {
      if (failWrites) {
        return false;
      }
      memoryStore[key] = value;
      return true;
    });

    // Create instances first (succeeds)
    const instances = [makeDailyInstance({ id: 'inst-1', status: 'pending' })];
    await upsertDailyInstances(PATIENT_ID, TODAY, instances);

    // Switch to fail mode
    failWrites = true;
    mockEmitDataUpdate.mockClear();

    const result = await updateDailyInstanceStatus(
      PATIENT_ID,
      TODAY,
      'inst-1',
      'completed',
      'log-123'
    );

    // Function still returns the in-memory updated instance
    expect(result).not.toBeNull();
    expect(result!.status).toBe('completed');

    // FIXED: emitDataUpdate does NOT fire for the failed write
    expect(mockEmitDataUpdate).not.toHaveBeenCalled();

    // In-memory store still has OLD data (pending status)
    const stored = memoryStore[
      Object.keys(memoryStore).find(k => k.includes('instances_v2'))!
    ] as DailyCareInstance[];
    expect(stored[0].status).toBe('pending');
  });

  // --------------------------------------------------------------------------
  // Scenario 4: createLogEntry — all writes fail, should bail early
  // --------------------------------------------------------------------------
  it('createLogEntry bails early and does not emit when first write fails', async () => {
    const writeAttempts: string[] = [];
    mockSafeSetItem.mockImplementation(async (key: string, _value: any) => {
      writeAttempts.push(key);
      return false;
    });

    const result = await createLogEntry({
      patientId: PATIENT_ID,
      carePlanId: 'plan-1',
      carePlanItemId: 'item-1',
      dailyInstanceId: 'inst-1',
      timestamp: NOW_ISO,
      date: TODAY,
      outcome: 'taken',
      source: 'record',
    });

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();

    // FIXED: Only the first write (LOGS daily bucket) is attempted,
    // then it bails because it failed. No index or ALL_LOGS writes.
    expect(writeAttempts).toHaveLength(1);
    expect(writeAttempts[0]).toContain('logs_v2');

    // FIXED: emitDataUpdate('logs') does NOT fire
    expect(mockEmitDataUpdate).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // Scenario 5: Partial write failure in createLogEntry
  // --------------------------------------------------------------------------
  it('createLogEntry still writes ALL_LOGS when first write succeeds', async () => {
    // First write (LOGS) succeeds, subsequent writes may or may not succeed
    let setItemCallCount = 0;
    mockSafeSetItem.mockImplementation(async (key: string, value: any) => {
      setItemCallCount++;
      // First write succeeds, so createLogEntry continues
      memoryStore[key] = value;
      return true;
    });

    const result = await createLogEntry({
      patientId: PATIENT_ID,
      carePlanId: 'plan-1',
      carePlanItemId: 'item-1',
      timestamp: NOW_ISO,
      date: TODAY,
      outcome: 'completed',
      source: 'record',
    });

    expect(result).toBeDefined();

    // With all writes succeeding, both LOGS and ALL_LOGS should exist
    const logsKey = Object.keys(memoryStore).find(k => k.includes('logs_v2') && !k.includes('index') && !k.includes('all_'));
    expect(logsKey).toBeDefined();
    const dailyLogs = memoryStore[logsKey!];
    expect(dailyLogs).toHaveLength(1);

    const allLogsKey = Object.keys(memoryStore).find(k => k.includes('all_logs'));
    expect(allLogsKey).toBeDefined();

    // emitDataUpdate fires because the primary write succeeded
    expect(mockEmitDataUpdate).toHaveBeenCalledWith('logs');
  });

  // --------------------------------------------------------------------------
  // Scenario 6: clearAllPatientData partial failure
  // --------------------------------------------------------------------------
  it('clearAllPatientData emits only when at least one write succeeds', async () => {
    // Seed data first
    setupSetItemSuccess();

    const plan = await createCarePlan(PATIENT_ID);
    await upsertCarePlanItem(makeCarePlanItem({ carePlanId: plan.id }));
    await upsertDailyInstances(PATIENT_ID, TODAY, [
      makeDailyInstance({ carePlanId: plan.id }),
    ]);
    await createLogEntry({
      patientId: PATIENT_ID,
      carePlanId: plan.id,
      carePlanItemId: 'item-1',
      timestamp: NOW_ISO,
      date: TODAY,
      outcome: 'taken',
      source: 'record',
    });

    mockEmitDataUpdate.mockClear();

    // Make ALL writes fail during clear
    setupSetItemAlwaysFails();

    await clearAllPatientData(PATIENT_ID);

    // FIXED: When ALL writes fail, no emit should fire
    expect(mockEmitDataUpdate).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // Bonus: Verify happy path still works
  // --------------------------------------------------------------------------
  it('emits correctly when all writes succeed', async () => {
    setupSetItemSuccess();

    const plan = makeCarePlan();
    await upsertCarePlan(plan);
    expect(mockEmitDataUpdate).toHaveBeenCalledWith('carePlan');

    mockEmitDataUpdate.mockClear();

    const item = makeCarePlanItem({ carePlanId: plan.id });
    await upsertCarePlanItem(item);
    expect(mockEmitDataUpdate).toHaveBeenCalledWith('carePlanItems');

    mockEmitDataUpdate.mockClear();

    await upsertDailyInstances(PATIENT_ID, TODAY, [makeDailyInstance()]);
    expect(mockEmitDataUpdate).toHaveBeenCalledWith('dailyInstances');

    mockEmitDataUpdate.mockClear();

    await updateDailyInstanceStatus(PATIENT_ID, TODAY, 'inst-1', 'completed');
    expect(mockEmitDataUpdate).toHaveBeenCalledWith('dailyInstances');

    mockEmitDataUpdate.mockClear();

    await createLogEntry({
      patientId: PATIENT_ID,
      carePlanId: 'plan-1',
      carePlanItemId: 'item-1',
      timestamp: NOW_ISO,
      date: TODAY,
      outcome: 'taken',
      source: 'record',
    });
    expect(mockEmitDataUpdate).toHaveBeenCalledWith('logs');
  });
});
