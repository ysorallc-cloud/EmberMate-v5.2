// =============================================================================
// Task 2.4: Patient ID scoping — prove data isolation between patients
// =============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock the encryption layer to use plain AsyncStorage
jest.mock('../safeStorage', () => {
  const AsyncStorageMock = require('@react-native-async-storage/async-storage');
  return {
    ...jest.requireActual('../safeStorage'),
    encryptedGetRaw: async (key: string) => AsyncStorageMock.getItem(key),
    encryptedSetRaw: async (key: string, value: string) =>
      AsyncStorageMock.setItem(key, value),
  };
});

import {
  saveMedicationLog,
  getMedicationLogs,
  saveVitalsLog,
  getVitalsLogs,
} from '../centralStorage';
import { getMedications, createMedication } from '../medicationStorage';
import { scopedKey } from '../storageKeys';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Task 2.4: Patient ID scoping', () => {
  describe('centralStorage', () => {
    it("Patient A's medication logs are not visible to Patient B", async () => {
      await saveMedicationLog(
        { timestamp: new Date().toISOString(), medicationIds: ['med-a'] },
        'patient-a'
      );

      await saveMedicationLog(
        { timestamp: new Date().toISOString(), medicationIds: ['med-b'] },
        'patient-b'
      );

      const logsA = await getMedicationLogs('patient-a');
      const logsB = await getMedicationLogs('patient-b');

      expect(logsA.length).toBe(1);
      expect(logsA[0].medicationIds).toEqual(['med-a']);
      expect(logsB.length).toBe(1);
      expect(logsB[0].medicationIds).toEqual(['med-b']);
    });

    it('default patient data is backward-compatible (no key change)', async () => {
      // Save with default patient (no patientId arg)
      await saveMedicationLog({
        timestamp: new Date().toISOString(),
        medicationIds: ['med-default'],
      });

      // Read with default patient (no patientId arg)
      const logs = await getMedicationLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].medicationIds).toEqual(['med-default']);
    });

    it('saving for patient B does not affect patient A data', async () => {
      await saveVitalsLog(
        { timestamp: new Date().toISOString(), systolic: 120, diastolic: 80 },
        'patient-a'
      );

      // Save for patient B
      await saveVitalsLog(
        { timestamp: new Date().toISOString(), systolic: 140, diastolic: 90 },
        'patient-b'
      );

      // Patient A still has exactly 1 entry
      const logsA = await getVitalsLogs('patient-a');
      expect(logsA.length).toBe(1);
      expect(logsA[0].systolic).toBe(120);
    });
  });

  describe('scopedKey helper', () => {
    it('returns base key for default patient', () => {
      expect(scopedKey('@embermate_medications', 'default')).toBe(
        '@embermate_medications'
      );
    });

    it('appends patientId for non-default patient', () => {
      expect(scopedKey('@embermate_medications', 'patient-a')).toBe(
        '@embermate_medications:patient-a'
      );
    });
  });
});
