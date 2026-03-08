// ============================================================================
// MEDICATION STORAGE UNIT TESTS
// Tests for CRUD operations, adherence calculation, and refill tracking
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
  getMedication,
  createMedication,
  updateMedication,
  deleteMedication,
  markMedicationTaken,
  getMedicationLogs,
  calculateAdherence,
  resetDailyMedicationStatus,
  getMedicationsNeedingRefill,
  addMedicationRefill,
  checkDuplicateMedication,
  Medication,
} from '../medicationStorage';

// Storage keys used by medicationStorage
const MEDICATIONS_KEY = '@embermate_medications';
const MEDICATION_LOGS_KEY = '@embermate_medication_logs';
const LAST_RESET_DATE_KEY = '@embermate_last_med_reset';

// Helper to create a basic medication object
function createTestMedication(overrides: Partial<Medication> = {}): Medication {
  return {
    id: 'test-med-1',
    name: 'Test Med',
    dosage: '100mg',
    time: '09:00',
    timeSlot: 'morning',
    taken: false,
    active: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('MedicationStorage', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2025-01-15T10:00:00.000Z'));
    // Pre-set the last reset date to today to avoid reset logic running
    await AsyncStorage.setItem(LAST_RESET_DATE_KEY, '2025-01-15');
    await AsyncStorage.setItem('@embermate_onboarding_complete', 'true');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ============================================================================
  // CRUD Operations Tests
  // ============================================================================
  describe('getMedications', () => {
    it('should return empty array when no medications exist', async () => {
      await AsyncStorage.setItem(MEDICATIONS_KEY, JSON.stringify([]));
      const result = await getMedications();
      expect(result).toEqual([]);
    });

    it('should return stored medications', async () => {
      const testMeds = [createTestMedication({ name: 'Aspirin' })];
      await AsyncStorage.setItem(MEDICATIONS_KEY, JSON.stringify(testMeds));

      const result = await getMedications();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Aspirin');
    });
  });

  describe('getMedication', () => {
    it('should return specific medication by ID', async () => {
      const testMeds = [
        createTestMedication({ id: 'med-1', name: 'Aspirin' }),
        createTestMedication({ id: 'med-2', name: 'Metformin' }),
      ];
      await AsyncStorage.setItem(MEDICATIONS_KEY, JSON.stringify(testMeds));

      const result = await getMedication('med-2');

      expect(result).not.toBeNull();
      expect(result!.name).toBe('Metformin');
    });

    it('should return null for non-existent medication', async () => {
      await AsyncStorage.setItem(MEDICATIONS_KEY, JSON.stringify([]));
      const result = await getMedication('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('createMedication', () => {
    beforeEach(async () => {
      await AsyncStorage.setItem(MEDICATIONS_KEY, JSON.stringify([]));
    });

    it('should create medication with generated ID', async () => {
      const newMed = {
        name: 'New Med',
        dosage: '50mg',
        time: '10:00',
        timeSlot: 'morning' as const,
        taken: false,
        active: true,
      };

      const result = await createMedication(newMed);

      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.name).toBe('New Med');
    });

    it('should reject duplicate medication', async () => {
      const existingMed = createTestMedication({ name: 'Aspirin' });
      await AsyncStorage.setItem(MEDICATIONS_KEY, JSON.stringify([existingMed]));

      const duplicateMed = {
        name: 'Aspirin',
        dosage: '200mg',
        time: '12:00',
        timeSlot: 'afternoon' as const,
        taken: false,
        active: true,
      };

      await expect(createMedication(duplicateMed)).rejects.toThrow(
        'Similar medication already exists'
      );
    });
  });

  describe('updateMedication', () => {
    it('should update medication properties', async () => {
      const testMeds = [createTestMedication({ id: 'update-med', name: 'Old Name' })];
      await AsyncStorage.setItem(MEDICATIONS_KEY, JSON.stringify(testMeds));

      const result = await updateMedication('update-med', { name: 'New Name' });

      expect(result).not.toBeNull();
      expect(result!.name).toBe('New Name');
    });

    it('should return null for non-existent medication', async () => {
      await AsyncStorage.setItem(MEDICATIONS_KEY, JSON.stringify([]));
      const result = await updateMedication('nonexistent', { name: 'Test' });
      expect(result).toBeNull();
    });
  });

  describe('deleteMedication', () => {
    it('should soft delete by setting active to false', async () => {
      const testMeds = [createTestMedication({ id: 'delete-med', active: true })];
      await AsyncStorage.setItem(MEDICATIONS_KEY, JSON.stringify(testMeds));

      const result = await deleteMedication('delete-med');

      expect(result).toBe(true);
      const med = await getMedication('delete-med');
      expect(med!.active).toBe(false);
    });
  });

  // ============================================================================
  // Medication Taken/Logging Tests
  // ============================================================================
  describe('markMedicationTaken', () => {
    it('should mark medication as taken and log event', async () => {
      const testMeds = [createTestMedication({ id: 'take-med' })];
      await AsyncStorage.setItem(MEDICATIONS_KEY, JSON.stringify(testMeds));

      const result = await markMedicationTaken('take-med', true);

      expect(result).toBe(true);
      const med = await getMedication('take-med');
      expect(med!.taken).toBe(true);

      const logs = await getMedicationLogs();
      expect(logs.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Adherence Calculation Tests
  // ============================================================================
  describe('calculateAdherence', () => {
    it('should return 0 for non-existent medication', async () => {
      await AsyncStorage.setItem(MEDICATIONS_KEY, JSON.stringify([]));
      const adherence = await calculateAdherence('nonexistent', 7);
      expect(adherence).toBe(0);
    });

    it('should calculate adherence based on logs', async () => {
      const testMeds = [createTestMedication({ id: 'adherence-med' })];
      await AsyncStorage.setItem(MEDICATIONS_KEY, JSON.stringify(testMeds));

      // Create logs for 7 days
      const logs = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date('2025-01-15');
        date.setDate(date.getDate() - i);
        logs.push({
          medicationId: 'adherence-med',
          timestamp: date.toISOString(),
          taken: true,
        });
      }
      await AsyncStorage.setItem(MEDICATION_LOGS_KEY, JSON.stringify(logs));

      const adherence = await calculateAdherence('adherence-med', 7);
      expect(adherence).toBe(100);
    });
  });

  // ============================================================================
  // Daily Reset Tests
  // ============================================================================
  describe('resetDailyMedicationStatus', () => {
    it('should reset all medications taken status to false', async () => {
      const testMeds = [
        createTestMedication({ id: 'reset-1', taken: true }),
        createTestMedication({ id: 'reset-2', taken: true }),
      ];
      await AsyncStorage.setItem(MEDICATIONS_KEY, JSON.stringify(testMeds));

      await resetDailyMedicationStatus();

      const meds = JSON.parse(await AsyncStorage.getItem(MEDICATIONS_KEY) || '[]');
      expect(meds[0].taken).toBe(false);
      expect(meds[1].taken).toBe(false);
    });
  });

  // ============================================================================
  // Refill Tracking Tests
  // ============================================================================
  describe('getMedicationsNeedingRefill', () => {
    it('should return medications with low supply', async () => {
      const testMeds = [
        createTestMedication({ id: 'low', name: 'Low Supply', daysSupply: 5 }),
        createTestMedication({ id: 'high', name: 'High Supply', daysSupply: 30 }),
      ];
      await AsyncStorage.setItem(MEDICATIONS_KEY, JSON.stringify(testMeds));

      const result = await getMedicationsNeedingRefill();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Low Supply');
    });
  });

  describe('addMedicationRefill', () => {
    it('should increase pills remaining', async () => {
      const testMeds = [createTestMedication({ id: 'refill-med', pillsRemaining: 5 })];
      await AsyncStorage.setItem(MEDICATIONS_KEY, JSON.stringify(testMeds));

      const result = await addMedicationRefill('refill-med', 30, 30);

      expect(result).not.toBeNull();
      expect(result!.pillsRemaining).toBe(35);
    });
  });

  // ============================================================================
  // Duplicate Detection Tests
  // ============================================================================
  describe('checkDuplicateMedication', () => {
    it('should detect exact name match (case-insensitive)', async () => {
      const testMeds = [createTestMedication({ name: 'Aspirin' })];
      await AsyncStorage.setItem(MEDICATIONS_KEY, JSON.stringify(testMeds));

      const result = await checkDuplicateMedication('aspirin');

      expect(result).not.toBeNull();
    });

    it('should not detect inactive medications', async () => {
      const testMeds = [createTestMedication({ name: 'Aspirin', active: false })];
      await AsyncStorage.setItem(MEDICATIONS_KEY, JSON.stringify(testMeds));

      const result = await checkDuplicateMedication('Aspirin');

      expect(result).toBeNull();
    });

    it('should return null when no match', async () => {
      await AsyncStorage.setItem(MEDICATIONS_KEY, JSON.stringify([]));
      const result = await checkDuplicateMedication('Nonexistent');
      expect(result).toBeNull();
    });
  });
});
