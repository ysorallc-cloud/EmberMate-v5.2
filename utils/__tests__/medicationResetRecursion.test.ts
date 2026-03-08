// ============================================================================
// MEDICATION RESET RECURSION TEST
// Proves that getMedications → checkAndResetDaily → resetDailyMedicationStatus
// does NOT cause infinite recursion after the fix.
//
// Context: Hermes OOM crash (EXC_BAD_ACCESS SIGSEGV) ~35 seconds after app launch
// Root cause: resetDailyMedicationStatus() called getMedications(), which called
// checkAndResetDaily() again before the date key was written.
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

const MEDICATIONS_KEY = '@embermate_medications';
const LAST_RESET_DATE_KEY = '@embermate_last_med_reset';

interface Medication {
  id: string;
  name: string;
  dosage: string;
  time: string;
  timeSlot: string;
  taken: boolean;
  active: boolean;
  createdAt: string;
}

// --- Simulated BROKEN pattern (before fix) ---

let brokenGetMedicationsCallCount = 0;
const MAX_RECURSION_LIMIT = 20;

async function brokenCheckAndResetDaily(): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const lastResetDate = await AsyncStorage.getItem(LAST_RESET_DATE_KEY);

  if (lastResetDate !== today) {
    await brokenResetDailyMedicationStatus();
    await AsyncStorage.setItem(LAST_RESET_DATE_KEY, today);
  }
}

async function brokenGetMedications(): Promise<Medication[]> {
  brokenGetMedicationsCallCount++;

  // Safety limit to prevent actual infinite loop in test
  if (brokenGetMedicationsCallCount > MAX_RECURSION_LIMIT) {
    throw new Error(`Infinite recursion detected: getMedications called ${brokenGetMedicationsCallCount} times`);
  }

  await brokenCheckAndResetDaily();

  const data = await AsyncStorage.getItem(MEDICATIONS_KEY);
  return data ? JSON.parse(data) : [];
}

async function brokenResetDailyMedicationStatus(): Promise<void> {
  // BUG: This calls getMedications() which calls checkAndResetDaily() again!
  const medications = await brokenGetMedications();
  const reset = medications.map(med => ({ ...med, taken: false }));
  await AsyncStorage.setItem(MEDICATIONS_KEY, JSON.stringify(reset));
}

// --- Simulated FIXED pattern (after fix) ---

let fixedGetMedicationsCallCount = 0;

async function fixedCheckAndResetDaily(): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const lastResetDate = await AsyncStorage.getItem(LAST_RESET_DATE_KEY);

  if (lastResetDate !== today) {
    await fixedResetDailyMedicationStatus();
    await AsyncStorage.setItem(LAST_RESET_DATE_KEY, today);
  }
}

async function fixedGetMedications(): Promise<Medication[]> {
  fixedGetMedicationsCallCount++;

  await fixedCheckAndResetDaily();

  const data = await AsyncStorage.getItem(MEDICATIONS_KEY);
  return data ? JSON.parse(data) : [];
}

async function fixedResetDailyMedicationStatus(): Promise<void> {
  // FIX: Read directly from storage, do NOT call getMedications()
  const data = await AsyncStorage.getItem(MEDICATIONS_KEY);
  const medications: Medication[] = data ? JSON.parse(data) : [];
  const reset = medications.map(med => ({ ...med, taken: false }));
  await AsyncStorage.setItem(MEDICATIONS_KEY, JSON.stringify(reset));
}

// --- Test data ---

function createTestMedications(): Medication[] {
  return [
    {
      id: '1',
      name: 'Metformin',
      dosage: '500mg',
      time: '08:00',
      timeSlot: 'morning',
      taken: true,
      active: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      name: 'Lisinopril',
      dosage: '10mg',
      time: '08:00',
      timeSlot: 'morning',
      taken: true,
      active: true,
      createdAt: new Date().toISOString(),
    },
  ];
}

// --- Tests ---

describe('Medication Reset Recursion Bug', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    brokenGetMedicationsCallCount = 0;
    fixedGetMedicationsCallCount = 0;

    // Seed with medications that have taken=true
    await AsyncStorage.setItem(MEDICATIONS_KEY, JSON.stringify(createTestMedications()));
    // Set last reset date to yesterday to trigger reset logic
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await AsyncStorage.setItem(LAST_RESET_DATE_KEY, yesterday.toISOString().split('T')[0]);
  });

  test('broken pattern: recurses infinitely when date key differs', async () => {
    // The broken pattern will recurse until we hit our safety limit
    await expect(brokenGetMedications()).rejects.toThrow(/Infinite recursion detected/);
    expect(brokenGetMedicationsCallCount).toBe(MAX_RECURSION_LIMIT + 1);
  });

  test('fixed pattern: completes in exactly 1 getMedications call and resets taken flags', async () => {
    // The fixed pattern should complete without recursion
    const medications = await fixedGetMedications();

    // Should only call getMedications once
    expect(fixedGetMedicationsCallCount).toBe(1);

    // All medications should have taken=false after reset
    medications.forEach(med => {
      expect(med.taken).toBe(false);
    });

    // Verify storage was updated
    const storedData = await AsyncStorage.getItem(MEDICATIONS_KEY);
    const storedMeds: Medication[] = JSON.parse(storedData!);
    storedMeds.forEach(med => {
      expect(med.taken).toBe(false);
    });
  });

  test('subsequent calls skip the reset (date key already set)', async () => {
    // First call triggers reset
    await fixedGetMedications();
    expect(fixedGetMedicationsCallCount).toBe(1);

    // Reset counter
    fixedGetMedicationsCallCount = 0;

    // Second call should NOT trigger reset (date key is now today)
    const medications = await fixedGetMedications();
    expect(fixedGetMedicationsCallCount).toBe(1);

    // Verify date key is set to today
    const today = new Date().toISOString().split('T')[0];
    const lastResetDate = await AsyncStorage.getItem(LAST_RESET_DATE_KEY);
    expect(lastResetDate).toBe(today);

    // Medications are still returned correctly
    expect(medications.length).toBe(2);
  });
});
