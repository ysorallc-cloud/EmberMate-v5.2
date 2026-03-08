// ============================================================================
// MEDICATION → NOW SYNC INTEGRATION TEST
// Flow: Log medication → verify task state reflects completion
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
} from '../medicationStorage';

const MEDICATIONS_KEY = '@embermate_medications';
const MEDICATION_LOGS_KEY = '@embermate_medication_logs';
const LAST_RESET_DATE_KEY = '@embermate_last_med_reset';

describe('Medication → Now Sync Integration', () => {
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

  it('should reflect medication completion in log status', async () => {
    // Step 1: Create medication
    const med = await createMedication({
      name: 'Lisinopril',
      dosage: '10mg',
      time: '08:00',
      timeSlot: 'morning',
      taken: false,
      active: true,
    });
    expect(med.id).toBeDefined();

    // Step 2: Verify not yet taken
    const allMeds = await getMedications();
    expect(allMeds).toHaveLength(1);
    expect(allMeds[0].taken).toBe(false);

    // Step 3: Mark taken
    const result = await markMedicationTaken(med.id, true, 'Before breakfast');
    expect(result).toBe(true);

    // Step 4: Verify medication state updated
    const updatedMeds = await getMedications();
    expect(updatedMeds[0].taken).toBe(true);
    expect(updatedMeds[0].lastTaken).toBeDefined();

    // Step 5: Verify log was created
    const logs = await getMedicationLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].medicationId).toBe(med.id);
    expect(logs[0].taken).toBe(true);
  });

  it('should handle multiple medications with mixed completion', async () => {
    // Create two medications
    const med1 = await createMedication({
      name: 'Metformin',
      dosage: '500mg',
      time: '08:00',
      timeSlot: 'morning',
      taken: false,
      active: true,
    });

    const med2 = await createMedication({
      name: 'Amlodipine',
      dosage: '5mg',
      time: '08:00',
      timeSlot: 'morning',
      taken: false,
      active: true,
    });

    // Mark only first as taken
    await markMedicationTaken(med1.id, true);

    const meds = await getMedications();
    const takenCount = meds.filter(m => m.taken).length;
    const totalCount = meds.length;

    expect(takenCount).toBe(1);
    expect(totalCount).toBe(2);

    // Mark second as taken
    await markMedicationTaken(med2.id, true);

    const updatedMeds = await getMedications();
    const allTaken = updatedMeds.every(m => m.taken);
    expect(allTaken).toBe(true);
  });

  it('should track taken status correctly when untaking medication', async () => {
    // Create a medication
    const med = await createMedication({
      name: 'Aspirin',
      dosage: '81mg',
      time: '09:00',
      timeSlot: 'morning',
      taken: false,
      active: true,
    });

    // Mark as taken
    await markMedicationTaken(med.id, true);
    let meds = await getMedications();
    expect(meds[0].taken).toBe(true);

    // Mark as untaken (undo)
    await markMedicationTaken(med.id, false);
    meds = await getMedications();
    expect(meds[0].taken).toBe(false);
  });
});

// Helper to access medication logs (needed for verification)
async function getMedicationLogs() {
  const raw = await AsyncStorage.getItem(MEDICATION_LOGS_KEY);
  return raw ? JSON.parse(raw) : [];
}
