// ============================================================================
// MEDICATION FLOW INTEGRATION TESTS
// End-to-end tests for medication management workflows
// ============================================================================

// Bypass encryption so tests can write/read plain JSON via AsyncStorage
jest.mock('../secureStorage', () => ({
  setSecureItem: async (key: string, value: any) => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    return true;
  },
  getSecureItem: async (key: string, defaultValue?: any) => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return defaultValue;
    try { return JSON.parse(raw); } catch { return raw; }
  },
  removeSecureItem: async (key: string) => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.removeItem(key);
    return true;
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getMedications,
  createMedication,
  markMedicationTaken,
  calculateAdherence,
  getMedicationLogs,
  addMedicationRefill,
  getMedicationsNeedingRefill,
  checkDuplicateMedication,
} from '../medicationStorage';

const MEDICATIONS_KEY = '@embermate_medications';
const MEDICATION_LOGS_KEY = '@embermate_medication_logs';
const LAST_RESET_DATE_KEY = '@embermate_last_med_reset';

describe('Medication Flow Integration', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2025-01-15T10:00:00.000Z'));
    await AsyncStorage.setItem(LAST_RESET_DATE_KEY, '2025-01-15');
    await AsyncStorage.setItem('@embermate_onboarding_complete', 'true');
    await AsyncStorage.setItem(MEDICATIONS_KEY, JSON.stringify([]));
    await AsyncStorage.setItem(MEDICATION_LOGS_KEY, JSON.stringify([]));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ============================================================================
  // Flow 1: Add medication -> Take medication -> Check adherence
  // ============================================================================
  describe('Add -> Take -> Check Adherence Flow', () => {
    it('should track adherence correctly through complete flow', async () => {
      // Step 1: Create a new medication
      const medication = await createMedication({
        name: 'Metformin',
        dosage: '500mg',
        time: '08:00',
        timeSlot: 'morning',
        taken: false,
        active: true,
      });

      expect(medication.id).toBeDefined();
      expect(medication.name).toBe('Metformin');

      // Step 2: Verify medication is in the list
      const allMeds = await getMedications();
      expect(allMeds).toHaveLength(1);
      expect(allMeds[0].taken).toBe(false);

      // Step 3: Mark as taken
      const taken = await markMedicationTaken(medication.id, true, 'Taken with breakfast');

      expect(taken).toBe(true);

      // Step 4: Verify medication status updated
      const updatedMeds = await getMedications();
      expect(updatedMeds[0].taken).toBe(true);
      expect(updatedMeds[0].lastTaken).toBeDefined();

      // Step 5: Verify log was created
      const logs = await getMedicationLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].medicationId).toBe(medication.id);
      expect(logs[0].taken).toBe(true);
      expect(logs[0].notes).toBe('Taken with breakfast');

      // Step 6: Check adherence (should be 100% for today)
      // Note: Adherence calculation needs historical logs, let's add more
      for (let i = 1; i < 7; i++) {
        const date = new Date('2025-01-15');
        date.setDate(date.getDate() - i);
        const existingLogs = JSON.parse(await AsyncStorage.getItem(MEDICATION_LOGS_KEY) || '[]');
        existingLogs.push({
          medicationId: medication.id,
          timestamp: date.toISOString(),
          taken: true,
        });
        await AsyncStorage.setItem(MEDICATION_LOGS_KEY, JSON.stringify(existingLogs));
      }

      const adherence = await calculateAdherence(medication.id, 7);
      expect(adherence).toBe(100);
    });
  });

  // ============================================================================
  // Flow 2: Add medication -> Skip day -> Verify adherence drops
  // ============================================================================
  describe('Add -> Skip -> Verify Adherence Drop Flow', () => {
    it('should calculate reduced adherence when doses are missed', async () => {
      // Step 1: Create medication
      const medication = await createMedication({
        name: 'Aspirin',
        dosage: '81mg',
        time: '09:00',
        timeSlot: 'morning',
        taken: false,
        active: true,
      });

      // Step 2: Add logs for only 3 out of 7 days (partial adherence)
      const logs = [];
      for (let i = 0; i < 3; i++) {
        const date = new Date('2025-01-15');
        date.setDate(date.getDate() - i);
        logs.push({
          medicationId: medication.id,
          timestamp: date.toISOString(),
          taken: true,
        });
      }
      await AsyncStorage.setItem(MEDICATION_LOGS_KEY, JSON.stringify(logs));

      // Step 3: Calculate adherence
      const adherence = await calculateAdherence(medication.id, 7);

      // 3 out of 7 days = ~43%
      expect(adherence).toBe(43);
    });
  });

  // ============================================================================
  // Flow 3: Add medication -> Mark refill needed -> Refill -> Verify supply
  // ============================================================================
  describe('Add -> Low Supply -> Refill Flow', () => {
    it('should track refills and update supply correctly', async () => {
      // Step 1: Create medication with low supply
      const medication = await createMedication({
        name: 'Lisinopril',
        dosage: '10mg',
        time: '08:00',
        timeSlot: 'morning',
        taken: false,
        active: true,
        pillsRemaining: 5,
        daysSupply: 5,
      });

      // Step 2: Verify it shows in needing refill list
      const needsRefill = await getMedicationsNeedingRefill(7);
      expect(needsRefill).toHaveLength(1);
      expect(needsRefill[0].id).toBe(medication.id);

      // Step 3: Add a refill
      const refilled = await addMedicationRefill(medication.id, 30, 30);

      expect(refilled).not.toBeNull();
      expect(refilled!.pillsRemaining).toBe(35); // 5 + 30
      expect(refilled!.daysSupply).toBe(30);

      // Step 4: Verify it's no longer in the needing refill list
      const stillNeedsRefill = await getMedicationsNeedingRefill(7);
      expect(stillNeedsRefill).toHaveLength(0);
    });
  });

  // ============================================================================
  // Flow 4: Add duplicate medication -> Verify rejection
  // ============================================================================
  describe('Duplicate Medication Rejection Flow', () => {
    it('should prevent adding duplicate medications', async () => {
      // Step 1: Create first medication
      await createMedication({
        name: 'Vitamin D',
        dosage: '1000IU',
        time: '08:00',
        timeSlot: 'morning',
        taken: false,
        active: true,
      });

      // Step 2: Check for duplicate before attempting to add
      const duplicate = await checkDuplicateMedication('Vitamin D');
      expect(duplicate).not.toBeNull();

      // Step 3: Attempt to add duplicate should fail
      await expect(
        createMedication({
          name: 'Vitamin D',
          dosage: '2000IU', // Different dosage but same name
          time: '12:00',
          timeSlot: 'afternoon',
          taken: false,
          active: true,
        })
      ).rejects.toThrow('Similar medication already exists');

      // Step 4: Verify only one medication exists
      const allMeds = await getMedications();
      expect(allMeds).toHaveLength(1);
    });

    it('should allow adding medication with similar but different name', async () => {
      // Create Vitamin D
      await createMedication({
        name: 'Vitamin D',
        dosage: '1000IU',
        time: '08:00',
        timeSlot: 'morning',
        taken: false,
        active: true,
      });

      // Vitamin B12 should be allowed (different medication)
      const vitB12 = await createMedication({
        name: 'Vitamin B12',
        dosage: '1000mcg',
        time: '08:00',
        timeSlot: 'morning',
        taken: false,
        active: true,
      });

      expect(vitB12).toBeDefined();

      const allMeds = await getMedications();
      expect(allMeds).toHaveLength(2);
    });
  });

  // ============================================================================
  // Flow 5: Multiple medications -> Daily workflow
  // ============================================================================
  describe('Multiple Medications Daily Workflow', () => {
    it('should handle multiple medications throughout the day', async () => {
      // Step 1: Set up morning medications
      const morningMed1 = await createMedication({
        name: 'Metformin Morning',
        dosage: '500mg',
        time: '08:00',
        timeSlot: 'morning',
        taken: false,
        active: true,
      });

      const morningMed2 = await createMedication({
        name: 'Lisinopril',
        dosage: '10mg',
        time: '08:00',
        timeSlot: 'morning',
        taken: false,
        active: true,
      });

      // Step 2: Set up evening medication
      const eveningMed = await createMedication({
        name: 'Metformin Evening',
        dosage: '500mg',
        time: '18:00',
        timeSlot: 'evening',
        taken: false,
        active: true,
      });

      // Step 3: Verify all medications exist
      const allMeds = await getMedications();
      expect(allMeds).toHaveLength(3);

      // Step 4: Take morning medications
      await markMedicationTaken(morningMed1.id, true);
      await markMedicationTaken(morningMed2.id, true);

      // Step 5: Verify morning taken, evening not
      const afterMorning = await getMedications();
      const morning1 = afterMorning.find(m => m.id === morningMed1.id);
      const morning2 = afterMorning.find(m => m.id === morningMed2.id);
      const evening = afterMorning.find(m => m.id === eveningMed.id);

      expect(morning1!.taken).toBe(true);
      expect(morning2!.taken).toBe(true);
      expect(evening!.taken).toBe(false);

      // Step 6: Take evening medication
      await markMedicationTaken(eveningMed.id, true);

      // Step 7: Verify all taken
      const endOfDay = await getMedications();
      expect(endOfDay.every(m => m.taken)).toBe(true);

      // Step 8: Verify logs were created
      const logs = await getMedicationLogs();
      expect(logs).toHaveLength(3);
    });
  });
});
