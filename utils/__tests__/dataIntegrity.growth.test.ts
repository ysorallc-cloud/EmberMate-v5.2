// ============================================================================
// DATA INTEGRITY: UNBOUNDED STORAGE GROWTH TESTS
//
// Tests for storage growth patterns:
//
// 1. carePlanRepo.createLogEntry — trims ALL_LOGS to last 5000 entries [PASS]
// 2. carePlanRepo.updateInstanceIndex — keeps only last 90 days [PASS]
// 3. centralStorage log arrays — trimmed to 1000 entries [FIXED]
// 4. carePlanRepo.updateLogIndex — keeps only last 365 days [PASS]
// 5. vitalsStorage — NO trimming, grows forever [DOCUMENTED]
// 6. logEvents.addLogEvent — trims to last 5000 events [PASS]
//
// AsyncStorage practical limit is ~6MB on iOS, ~6MB on Android.
// At ~100-200 bytes per entry, 5000 entries ~ 500KB-1MB.
// centralStorage and vitalsStorage have no limits and will eventually
// hit the AsyncStorage ceiling, causing silent data loss.
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeGetItem, safeSetItem } from '../safeStorage';
import { createLogEntry, listLogsByDate } from '../../storage/carePlanRepo';
import {
  saveMedicationLog,
  getMedicationLogs,
  saveVitalsLog,
  getVitalsLogs,
  saveMoodLog,
  getMoodLogs,
  saveSleepLog,
  getSleepLogs,
  saveMealsLog,
  getMealsLogs,
} from '../centralStorage';
import { saveVital, getVitals } from '../vitalsStorage';
import { addLogEvent, getLogEvents } from '../logEvents';

// Storage keys (must stay in sync with source)
const CENTRAL_MED_KEY = '@embermate_central_med_logs';
const CENTRAL_VITALS_KEY = '@embermate_central_vitals_logs';
const VITALS_DOMAIN_KEY = '@vitals_readings';

// carePlanRepo keys
const ALL_LOGS_KEY = (patientId: string) => `@embermate_all_logs_v2:${patientId}`;
const INSTANCES_INDEX_KEY = (patientId: string) => `@embermate_instances_index_v2:${patientId}`;
const LOGS_INDEX_KEY = (patientId: string) => `@embermate_logs_index_v2:${patientId}`;

const TEST_PATIENT = 'default';

describe('dataIntegrity — storage growth', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2025-06-15T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ==========================================================================
  // SCENARIO 1: ALL_LOGS trimming in carePlanRepo.createLogEntry
  //
  // Source: storage/carePlanRepo.ts line 393-394
  //   const trimmed = allLogs.slice(-5000);
  //
  // This correctly caps the ALL_LOGS array at 5000 entries.
  // ==========================================================================

  describe('carePlanRepo ALL_LOGS trimming (5000 entry cap)', () => {
    it('should trim ALL_LOGS to 5000 entries when exceeding limit', async () => {
      // Pre-seed ALL_LOGS with 5050 entries
      const existingLogs = [];
      for (let i = 0; i < 5050; i++) {
        existingLogs.push({
          id: `existing-${i}`,
          patientId: TEST_PATIENT,
          carePlanId: 'cp-1',
          carePlanItemId: 'item-1',
          timestamp: `2025-01-15T10:${String(i % 60).padStart(2, '0')}:00.000Z`,
          date: '2025-01-15',
          outcome: 'completed',
          immutable: true,
          createdAt: `2025-01-15T10:00:00.000Z`,
        });
      }
      await safeSetItem(ALL_LOGS_KEY(TEST_PATIENT), existingLogs);

      // Create one more log entry
      await createLogEntry({
        patientId: TEST_PATIENT,
        carePlanId: 'cp-1',
        carePlanItemId: 'item-1',
        timestamp: '2025-06-15T10:00:00.000Z',
        date: '2025-06-15',
        outcome: 'completed',
        source: 'record',
      });

      // Read ALL_LOGS back
      const allLogs = await safeGetItem<any[]>(ALL_LOGS_KEY(TEST_PATIENT), []);

      // Should be trimmed to 5000 (the last 5000 of 5051)
      expect(allLogs.length).toBe(5000);

      // The newest entry should be at the end
      expect(allLogs[allLogs.length - 1].date).toBe('2025-06-15');

      // The oldest entries (indices 0-50) should have been dropped
      expect(allLogs[0].id).not.toBe('existing-0');
    });

    it('should not trim when under the 5000 limit', async () => {
      // Pre-seed with 100 entries
      const existingLogs = [];
      for (let i = 0; i < 100; i++) {
        existingLogs.push({
          id: `existing-${i}`,
          patientId: TEST_PATIENT,
          carePlanId: 'cp-1',
          carePlanItemId: 'item-1',
          timestamp: '2025-01-15T10:00:00.000Z',
          date: '2025-01-15',
          outcome: 'completed',
          immutable: true,
          createdAt: '2025-01-15T10:00:00.000Z',
        });
      }
      await safeSetItem(ALL_LOGS_KEY(TEST_PATIENT), existingLogs);

      await createLogEntry({
        patientId: TEST_PATIENT,
        carePlanId: 'cp-1',
        carePlanItemId: 'item-1',
        timestamp: '2025-06-15T10:00:00.000Z',
        date: '2025-06-15',
        outcome: 'completed',
        source: 'record',
      });

      const allLogs = await safeGetItem<any[]>(ALL_LOGS_KEY(TEST_PATIENT), []);
      expect(allLogs.length).toBe(101); // 100 existing + 1 new
    });
  });

  // ==========================================================================
  // SCENARIO 2: DAILY_INSTANCES_INDEX 90-day cleanup
  //
  // Source: storage/carePlanRepo.ts lines 332-338
  //   const cutoff = new Date();
  //   cutoff.setDate(cutoff.getDate() - 90);
  //   const filtered = index.filter(d => d >= cutoffStr);
  //
  // This correctly prunes dates older than 90 days from the index.
  // ==========================================================================

  describe('carePlanRepo DAILY_INSTANCES_INDEX 90-day cleanup', () => {
    it('should keep only dates within the last 90 days', async () => {
      // Pre-seed the index with 365 days of dates
      const dates: string[] = [];
      const baseDate = new Date('2025-06-15');
      for (let i = 364; i >= 0; i--) {
        const d = new Date(baseDate);
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().split('T')[0]);
      }

      await safeSetItem(INSTANCES_INDEX_KEY(TEST_PATIENT), dates);

      // Verify we seeded 365 dates
      const beforeIndex = await safeGetItem<string[]>(INSTANCES_INDEX_KEY(TEST_PATIENT), []);
      expect(beforeIndex.length).toBe(365);

      // Trigger the cleanup by adding a NEW date not already in the index.
      // updateInstanceIndex only runs cleanup when adding a new date
      // (it short-circuits with `if (!index.includes(date))`).
      // Use 2025-06-16 which is not in the pre-seeded 365 days.
      const { upsertDailyInstances } = require('../../storage/carePlanRepo');
      await upsertDailyInstances(TEST_PATIENT, '2025-06-16', [{
        id: 'inst-1',
        carePlanId: 'cp-1',
        carePlanItemId: 'item-1',
        date: '2025-06-16',
        scheduledTime: '2025-06-16T08:00:00.000Z',
        windowLabel: 'morning',
        status: 'pending',
        createdAt: '2025-06-15T10:00:00.000Z',
        updatedAt: '2025-06-15T10:00:00.000Z',
      }]);

      const afterIndex = await safeGetItem<string[]>(INSTANCES_INDEX_KEY(TEST_PATIENT), []);

      // Should only contain dates from the last 90 days plus the newly added date.
      // The cutoff is computed from the current system time (2025-06-15),
      // so dates from 2025-03-17 onward survive, plus 2025-06-16 (the new date).
      expect(afterIndex.length).toBeLessThanOrEqual(92);

      // Verify all remaining dates are recent
      const cutoff = new Date('2025-06-15');
      cutoff.setDate(cutoff.getDate() - 90);
      const cutoffStr = cutoff.toISOString().split('T')[0];

      for (const date of afterIndex) {
        expect(date >= cutoffStr).toBe(true);
      }
    });
  });

  // ==========================================================================
  // SCENARIO 3: centralStorage log arrays — trimmed to 1000 entries
  //
  // Source: utils/centralStorage.ts
  //   Each save function: logs.unshift(newLog); if (logs.length > MAX_LOG_ENTRIES) logs.length = MAX_LOG_ENTRIES;
  //
  // MAX_LOG_ENTRIES = 1000, matching medicationStorage and auditLog limits.
  // ==========================================================================

  describe('centralStorage trimming (1000 entry cap)', () => {
    it('saveMedicationLog trims to 1000 entries', async () => {
      const entryCount = 1100;

      for (let i = 0; i < entryCount; i++) {
        jest.advanceTimersByTime(1);
        await saveMedicationLog({
          timestamp: new Date().toISOString(),
          medicationIds: [`med-${i}`],
        });
      }

      const logs = await getMedicationLogs();

      // FIXED: trimmed to 1000 entries
      expect(logs).toHaveLength(1000);

      // Newest entry is first (unshift order), oldest trimmed off the end
      expect(logs[0].medicationIds[0]).toBe(`med-${entryCount - 1}`);
    });

    it('saveVitalsLog trims to 1000 entries', async () => {
      const entryCount = 1100;

      for (let i = 0; i < entryCount; i++) {
        jest.advanceTimersByTime(1);
        await saveVitalsLog({
          timestamp: new Date().toISOString(),
          systolic: 120 + (i % 20),
          diastolic: 80 + (i % 10),
        });
      }

      const logs = await getVitalsLogs();
      expect(logs).toHaveLength(1000);
    });

    it('centralStorage arrays stay bounded over simulated year', async () => {
      // Simulate 365 days of logging: 1 of each type per day
      for (let day = 0; day < 365; day++) {
        jest.advanceTimersByTime(86400000);

        await saveMedicationLog({
          timestamp: new Date().toISOString(),
          medicationIds: ['med-daily'],
        });

        await saveVitalsLog({
          timestamp: new Date().toISOString(),
          systolic: 120,
          diastolic: 80,
        });

        await saveMoodLog({
          timestamp: new Date().toISOString(),
          mood: 4,
          energy: 3,
          pain: 1,
        });

        await saveSleepLog({
          timestamp: new Date().toISOString(),
          hours: 7,
          quality: 4,
        });

        await saveMealsLog({
          timestamp: new Date().toISOString(),
          meals: ['Breakfast', 'Lunch', 'Dinner'],
        });
      }

      // All arrays stay at 365 (under the 1000 cap)
      const meds = await getMedicationLogs();
      const vitals = await getVitalsLogs();
      const moods = await getMoodLogs();
      const sleeps = await getSleepLogs();
      const meals = await getMealsLogs();

      expect(meds).toHaveLength(365);
      expect(vitals).toHaveLength(365);
      expect(moods).toHaveLength(365);
      expect(sleeps).toHaveLength(365);
      expect(meals).toHaveLength(365);
    });
  });

  // ==========================================================================
  // SCENARIO 4: LOGS_INDEX 365-day cleanup
  //
  // Source: storage/carePlanRepo.ts lines 457-463
  //   const cutoff = new Date();
  //   cutoff.setDate(cutoff.getDate() - 365);
  //   const filtered = index.filter(d => d >= cutoffStr);
  //
  // This correctly prunes dates older than 365 days from the index.
  // ==========================================================================

  describe('carePlanRepo LOGS_INDEX 365-day cleanup', () => {
    it('should keep only dates within the last 365 days', async () => {
      // Pre-seed the index with 400 days of dates
      const dates: string[] = [];
      const baseDate = new Date('2025-06-15');
      for (let i = 399; i >= 0; i--) {
        const d = new Date(baseDate);
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().split('T')[0]);
      }

      await safeSetItem(LOGS_INDEX_KEY(TEST_PATIENT), dates);

      const beforeIndex = await safeGetItem<string[]>(LOGS_INDEX_KEY(TEST_PATIENT), []);
      expect(beforeIndex.length).toBe(400);

      // Trigger cleanup by creating a log entry with a NEW date not in index.
      // updateLogIndex only runs cleanup when adding a new date
      // (it short-circuits with `if (!index.includes(date))`).
      // Use 2025-06-16 which is not in the pre-seeded 400 days.
      await createLogEntry({
        patientId: TEST_PATIENT,
        carePlanId: 'cp-1',
        carePlanItemId: 'item-1',
        timestamp: '2025-06-16T10:00:00.000Z',
        date: '2025-06-16',
        outcome: 'completed',
        source: 'record',
      });

      const afterIndex = await safeGetItem<string[]>(LOGS_INDEX_KEY(TEST_PATIENT), []);

      // Should only contain dates from the last 365 days plus the newly added date.
      // The cutoff is computed from system time (2025-06-15), so dates from
      // 2024-06-16 onward survive, plus 2025-06-16 (the new date we added).
      expect(afterIndex.length).toBeLessThanOrEqual(367);

      // Verify all remaining dates are within 365 days
      const cutoff = new Date('2025-06-15');
      cutoff.setDate(cutoff.getDate() - 365);
      const cutoffStr = cutoff.toISOString().split('T')[0];

      for (const date of afterIndex) {
        expect(date >= cutoffStr).toBe(true);
      }

      // Verify the 35 oldest dates were dropped
      // (400 days minus ~365 days within range = ~35 dropped)
      expect(afterIndex.length).toBeLessThan(beforeIndex.length);
    });
  });

  // ==========================================================================
  // SCENARIO 5: vitalsStorage — NO trimming
  //
  // Source: utils/vitalsStorage.ts
  //   saveVital: vitals.push(newVital) — no trim
  //
  // Unlike centralStorage which at least uses unshift (newest first),
  // vitalsStorage uses push (oldest first). But both grow unbounded.
  // ==========================================================================

  describe('vitalsStorage unbounded growth (no trimming)', () => {
    it('documents that saveVital accumulates without limit', async () => {
      const entryCount = 1000;

      for (let i = 0; i < entryCount; i++) {
        jest.advanceTimersByTime(1);
        await saveVital({
          type: 'systolic',
          value: 120 + (i % 20),
          unit: 'mmHg',
          timestamp: new Date().toISOString(),
        });
      }

      const vitals = await getVitals();

      // All entries retained — no trimming
      expect(vitals).toHaveLength(entryCount);

      const rawJson = await AsyncStorage.getItem(VITALS_DOMAIN_KEY);
      const jsonSize = rawJson ? rawJson.length : 0;

      // Each VitalReading ~ 100 bytes
      expect(jsonSize).toBeGreaterThan(80000);

      // Note: vitalsStorage also uses Date.now().toString() for IDs,
      // sharing the same collision vulnerability as centralStorage.
    });
  });

  // ==========================================================================
  // SCENARIO 6: logEvents.addLogEvent — trims to 5000 events
  //
  // Source: utils/logEvents.ts lines 216-217
  //   const trimmed = events.slice(-MAX_EVENTS);
  //
  // This correctly caps the events array at 5000.
  // ==========================================================================

  describe('logEvents trimming (5000 event cap)', () => {
    it('should trim events to 5000 when exceeding limit', async () => {
      // Pre-seed with 5050 events
      const existingEvents = [];
      for (let i = 0; i < 5050; i++) {
        existingEvents.push({
          id: `existing-${i}`,
          type: 'mood',
          timestamp: '2025-01-15T10:00:00.000Z',
          date: '2025-01-15',
          mood: 3,
        });
      }
      await safeSetItem('@embermate_log_events', existingEvents);

      // Add one more event
      await addLogEvent({
        type: 'mood',
        timestamp: '2025-06-15T10:00:00.000Z',
        mood: 5,
      });

      const events = await getLogEvents();

      // Should be trimmed to 5000
      expect(events.length).toBe(5000);

      // Newest event should be present
      expect(events[events.length - 1].type).toBe('mood');
    });
  });

  // ==========================================================================
  // GROWTH COMPARISON SUMMARY
  //
  // This test creates a readable comparison of which storage systems
  // have growth limits and which do not.
  // ==========================================================================

  describe('growth limit comparison', () => {
    it('documents which storage systems have growth limits', () => {
      const storageSystems = [
        { name: 'carePlanRepo.ALL_LOGS', limit: 5000, unit: 'entries', hasLimit: true },
        { name: 'carePlanRepo.INSTANCES_INDEX', limit: 90, unit: 'days', hasLimit: true },
        { name: 'carePlanRepo.LOGS_INDEX', limit: 365, unit: 'days', hasLimit: true },
        { name: 'logEvents', limit: 5000, unit: 'events', hasLimit: true },
        { name: 'centralStorage.medicationLogs', limit: 1000, unit: 'entries', hasLimit: true },
        { name: 'centralStorage.vitalsLogs', limit: 1000, unit: 'entries', hasLimit: true },
        { name: 'centralStorage.moodLogs', limit: 1000, unit: 'entries', hasLimit: true },
        { name: 'centralStorage.sleepLogs', limit: 1000, unit: 'entries', hasLimit: true },
        { name: 'centralStorage.mealsLogs', limit: 1000, unit: 'entries', hasLimit: true },
        { name: 'centralStorage.waterLogs', limit: 1000, unit: 'entries', hasLimit: true },
        { name: 'centralStorage.notesLogs', limit: 1000, unit: 'entries', hasLimit: true },
        { name: 'vitalsStorage', limit: null, unit: 'none', hasLimit: false },
        { name: 'dailyTrackingStorage', limit: null, unit: 'none (per-day keys)', hasLimit: false },
      ];

      const withLimits = storageSystems.filter(s => s.hasLimit);
      const withoutLimits = storageSystems.filter(s => !s.hasLimit);

      // 11 systems have growth limits (carePlanRepo + logEvents + centralStorage)
      expect(withLimits).toHaveLength(11);

      // 2 systems still have NO growth limits
      expect(withoutLimits).toHaveLength(2);

      // Remaining unbounded:
      // - vitalsStorage: domain-specific vitals readings, no trim
      // - dailyTrackingStorage: per-day keys avoid single-key growth but
      //   create key proliferation over months of use
    });
  });
});
