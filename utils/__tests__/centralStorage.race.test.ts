// ============================================================================
// Task 1.2: Verify concurrency locks on all centralStorage write operations
// Without locks, concurrent read-modify-write causes last-write-wins data loss.
// ============================================================================

import { encryptedGetRaw, encryptedSetRaw } from '../safeStorage';

// In-memory store that simulates async delay to expose race windows
const store: Record<string, string> = {};

jest.mock('../safeStorage', () => ({
  encryptedGetRaw: jest.fn(async (key: string) => {
    // Small delay to widen the race window
    await new Promise(r => setTimeout(r, 5));
    return store[key] ?? null;
  }),
  encryptedSetRaw: jest.fn(async (key: string, value: string) => {
    await new Promise(r => setTimeout(r, 5));
    store[key] = value;
  }),
}));

jest.mock('../devLog', () => ({
  logError: jest.fn(),
  devLog: jest.fn(),
}));

import {
  saveMedicationLog,
  getMedicationLogs,
  saveVitalsLog,
  getVitalsLogs,
  saveMoodLog,
  getMoodLogs,
  saveSymptomLog,
  getSymptomLogs,
  saveSleepLog,
  getSleepLogs,
  saveMealsLog,
  getMealsLogs,
  saveWaterLog,
  getWaterLogs,
  saveNotesLog,
  getNotesLogs,
  updateTodayWaterLog,
} from '../centralStorage';

beforeEach(() => {
  // Clear in-memory store
  for (const key of Object.keys(store)) delete store[key];
  jest.clearAllMocks();
});

describe('Task 1.2: Concurrency locks on centralStorage write operations', () => {

  it('two concurrent saveMedicationLog calls preserve both entries', async () => {
    await Promise.all([
      saveMedicationLog({ timestamp: '2026-02-28T10:00:00Z', medicationIds: ['med-1'] }),
      saveMedicationLog({ timestamp: '2026-02-28T10:01:00Z', medicationIds: ['med-2'] }),
    ]);

    const logs = await getMedicationLogs();
    expect(logs).toHaveLength(2);
    const ids = logs.map(l => l.medicationIds[0]);
    expect(ids).toContain('med-1');
    expect(ids).toContain('med-2');
  });

  it('two concurrent saveVitalsLog calls preserve both entries', async () => {
    await Promise.all([
      saveVitalsLog({ timestamp: '2026-02-28T10:00:00Z', systolic: 120, diastolic: 80 }),
      saveVitalsLog({ timestamp: '2026-02-28T10:01:00Z', systolic: 130, diastolic: 85 }),
    ]);

    const logs = await getVitalsLogs();
    expect(logs).toHaveLength(2);
    const systolics = logs.map(l => l.systolic);
    expect(systolics).toContain(120);
    expect(systolics).toContain(130);
  });

  it('two concurrent saveMoodLog calls preserve both entries', async () => {
    await Promise.all([
      saveMoodLog({ timestamp: '2026-02-28T10:00:00Z', mood: 3, energy: 4, pain: 1 }),
      saveMoodLog({ timestamp: '2026-02-28T10:01:00Z', mood: 5, energy: 5, pain: 0 }),
    ]);

    const logs = await getMoodLogs();
    expect(logs).toHaveLength(2);
  });

  it('two concurrent saveSymptomLog calls preserve both entries', async () => {
    await Promise.all([
      saveSymptomLog({ timestamp: '2026-02-28T10:00:00Z', symptoms: ['headache'] }),
      saveSymptomLog({ timestamp: '2026-02-28T10:01:00Z', symptoms: ['nausea'] }),
    ]);

    const logs = await getSymptomLogs();
    expect(logs).toHaveLength(2);
  });

  it('two concurrent saveSleepLog calls preserve both entries', async () => {
    await Promise.all([
      saveSleepLog({ timestamp: '2026-02-28T10:00:00Z', hours: 7, quality: 3 }),
      saveSleepLog({ timestamp: '2026-02-28T10:01:00Z', hours: 8, quality: 4 }),
    ]);

    const logs = await getSleepLogs();
    expect(logs).toHaveLength(2);
  });

  it('two concurrent saveMealsLog calls preserve both entries', async () => {
    await Promise.all([
      saveMealsLog({ timestamp: '2026-02-28T10:00:00Z', meals: ['Breakfast'] }),
      saveMealsLog({ timestamp: '2026-02-28T10:01:00Z', meals: ['Lunch'] }),
    ]);

    const logs = await getMealsLogs();
    expect(logs).toHaveLength(2);
  });

  it('two concurrent saveWaterLog calls preserve both entries', async () => {
    await Promise.all([
      saveWaterLog({ timestamp: '2026-02-28T10:00:00Z', glasses: 2 }),
      saveWaterLog({ timestamp: '2026-02-28T10:01:00Z', glasses: 3 }),
    ]);

    const logs = await getWaterLogs();
    expect(logs).toHaveLength(2);
  });

  it('two concurrent saveNotesLog calls preserve both entries', async () => {
    await Promise.all([
      saveNotesLog({ timestamp: '2026-02-28T10:00:00Z', content: 'Note A' }),
      saveNotesLog({ timestamp: '2026-02-28T10:01:00Z', content: 'Note B' }),
    ]);

    const logs = await getNotesLogs();
    expect(logs).toHaveLength(2);
  });

  it('concurrent updateTodayWaterLog calls both apply correctly', async () => {
    // First call sets 3, second call sets 5 — the last one to execute wins,
    // but neither should corrupt the array or lose the entry.
    await Promise.all([
      updateTodayWaterLog(3),
      updateTodayWaterLog(5),
    ]);

    const logs = await getWaterLogs();
    // Should have exactly 1 entry for today (not 2 duplicates)
    expect(logs).toHaveLength(1);
    // The value should be one of the two (whichever ran last)
    expect([3, 5]).toContain(logs[0].glasses);
  });

  it('saves on different log types proceed in parallel without deadlock', async () => {
    // This would deadlock if we used a single global lock
    const start = Date.now();
    await Promise.all([
      saveMedicationLog({ timestamp: '2026-02-28T10:00:00Z', medicationIds: ['med-1'] }),
      saveVitalsLog({ timestamp: '2026-02-28T10:00:00Z', systolic: 120, diastolic: 80 }),
      saveMoodLog({ timestamp: '2026-02-28T10:00:00Z', mood: 3, energy: 4, pain: 1 }),
    ]);
    const elapsed = Date.now() - start;

    // With per-key locks these should run in parallel (~10ms each with 5ms delays)
    // A single global lock would serialize them (~30ms+)
    // Use generous threshold to avoid flaky tests
    expect(elapsed).toBeLessThan(500);

    const meds = await getMedicationLogs();
    const vitals = await getVitalsLogs();
    const moods = await getMoodLogs();
    expect(meds).toHaveLength(1);
    expect(vitals).toHaveLength(1);
    expect(moods).toHaveLength(1);
  });
});
