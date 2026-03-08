// ============================================================================
// WELLNESS CHECK STORAGE — TESTS
// Tests for save/get/skip morning + evening wellness with Sprint 1 fields
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
  saveMorningWellness,
  getMorningWellness,
  skipMorningWellness,
  saveEveningWellness,
  getEveningWellness,
  skipEveningWellness,
  StoredMorningWellness,
  StoredEveningWellness,
} from '../wellnessCheckStorage';
import { MorningWellnessData, EveningWellnessData } from '../../types/timeline';

const MORNING_KEY = '@embermate_morning_wellness';
const EVENING_KEY = '@embermate_evening_wellness';

describe('wellnessCheckStorage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.useFakeTimers().setSystemTime(new Date('2025-01-15T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ==========================================================================
  // MORNING WELLNESS — Save & Read
  // ==========================================================================

  describe('saveMorningWellness + getMorningWellness', () => {
    it('should save and read back a morning wellness record', async () => {
      const data: MorningWellnessData = {
        sleepQuality: 4,
        mood: 4,
        energyLevel: 3,
        completedAt: new Date('2025-01-15T10:00:00.000Z'),
      };

      await saveMorningWellness('2025-01-15', data);
      const result = await getMorningWellness('2025-01-15');

      expect(result).not.toBeNull();
      expect(result!.sleepQuality).toBe(4);
      expect(result!.mood).toBe(4);
      expect(result!.energyLevel).toBe(3);
      expect(result!.date).toBe('2025-01-15');
      expect(result!.id).toContain('morning-2025-01-15');
    });

    it('should save morning wellness with Sprint 1 enrichment fields', async () => {
      const data: MorningWellnessData = {
        sleepQuality: 3,
        mood: 3,
        energyLevel: 2,
        orientation: 'alert-oriented',
        decisionMaking: 'own-decisions',
        notes: 'Slept well last night',
        completedAt: new Date('2025-01-15T10:00:00.000Z'),
      };

      await saveMorningWellness('2025-01-15', data);
      const result = await getMorningWellness('2025-01-15');

      expect(result!.orientation).toBe('alert-oriented');
      expect(result!.decisionMaking).toBe('own-decisions');
      expect(result!.notes).toBe('Slept well last night');
    });

    it('should replace existing record for the same date', async () => {
      const data1: MorningWellnessData = {
        sleepQuality: 2,
        mood: 2,
        energyLevel: 1,
        completedAt: new Date('2025-01-15T08:00:00.000Z'),
      };

      const data2: MorningWellnessData = {
        sleepQuality: 4,
        mood: 4,
        energyLevel: 4,
        completedAt: new Date('2025-01-15T10:00:00.000Z'),
      };

      await saveMorningWellness('2025-01-15', data1);
      await saveMorningWellness('2025-01-15', data2);

      const result = await getMorningWellness('2025-01-15');
      expect(result!.sleepQuality).toBe(4);
      expect(result!.mood).toBe(4);

      // Should only have one record for this date
      const raw = await AsyncStorage.getItem(MORNING_KEY);
      const all = JSON.parse(raw!);
      const forDate = all.filter((w: any) => w.date === '2025-01-15');
      expect(forDate).toHaveLength(1);
    });

    it('should deserialize completedAt back to a Date object', async () => {
      const data: MorningWellnessData = {
        sleepQuality: 3,
        mood: 3,
        energyLevel: 3,
        completedAt: new Date('2025-01-15T10:00:00.000Z'),
      };

      await saveMorningWellness('2025-01-15', data);
      const result = await getMorningWellness('2025-01-15');

      expect(result!.completedAt).toBeInstanceOf(Date);
    });

    it('should return null for a date with no record', async () => {
      const result = await getMorningWellness('2025-01-15');
      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // MORNING WELLNESS — Skip
  // ==========================================================================

  describe('skipMorningWellness', () => {
    it('should create a skipped record with defaults', async () => {
      await skipMorningWellness('2025-01-15');
      const result = await getMorningWellness('2025-01-15');

      expect(result).not.toBeNull();
      expect(result!.skipped).toBe(true);
      expect(result!.sleepQuality).toBe(3);
      expect(result!.mood).toBe(3);
      expect(result!.energyLevel).toBe(3);
      expect(result!.id).toContain('morning-skip-2025-01-15');
    });

    it('should not have orientation/decisionMaking on skipped record', async () => {
      await skipMorningWellness('2025-01-15');
      const result = await getMorningWellness('2025-01-15');

      expect(result!.orientation).toBeUndefined();
      expect(result!.decisionMaking).toBeUndefined();
    });
  });

  // ==========================================================================
  // EVENING WELLNESS — Save & Read
  // ==========================================================================

  describe('saveEveningWellness + getEveningWellness', () => {
    it('should save and read back an evening wellness record', async () => {
      const data: EveningWellnessData = {
        mood: 4,
        mealsLogged: true,
        dayRating: 4,
        completedAt: new Date('2025-01-15T20:00:00.000Z'),
      };

      await saveEveningWellness('2025-01-15', data);
      const result = await getEveningWellness('2025-01-15');

      expect(result).not.toBeNull();
      expect(result!.mood).toBe(4);
      expect(result!.mealsLogged).toBe(true);
      expect(result!.dayRating).toBe(4);
      expect(result!.date).toBe('2025-01-15');
    });

    it('should save evening wellness with Sprint 1 ADL fields', async () => {
      const data: EveningWellnessData = {
        mood: 3,
        mealsLogged: true,
        dayRating: 3,
        painLevel: 'moderate',
        alertness: 'alert',
        bowelMovement: 'yes',
        bathingStatus: 'independent',
        mobilityStatus: 'walker',
        completedAt: new Date('2025-01-15T20:00:00.000Z'),
      };

      await saveEveningWellness('2025-01-15', data);
      const result = await getEveningWellness('2025-01-15');

      expect(result!.painLevel).toBe('moderate');
      expect(result!.alertness).toBe('alert');
      expect(result!.bowelMovement).toBe('yes');
      expect(result!.bathingStatus).toBe('independent');
      expect(result!.mobilityStatus).toBe('walker');
    });

    it('should return null for a date with no record', async () => {
      const result = await getEveningWellness('2025-01-15');
      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // EVENING WELLNESS — Skip
  // ==========================================================================

  describe('skipEveningWellness', () => {
    it('should create a skipped evening record with defaults', async () => {
      await skipEveningWellness('2025-01-15');
      const result = await getEveningWellness('2025-01-15');

      expect(result).not.toBeNull();
      expect(result!.skipped).toBe(true);
      expect(result!.mood).toBe(3);
      expect(result!.mealsLogged).toBe(false);
      expect(result!.dayRating).toBe(3);
    });

    it('should not have ADL fields on skipped evening record', async () => {
      await skipEveningWellness('2025-01-15');
      const result = await getEveningWellness('2025-01-15');

      expect(result!.painLevel).toBeUndefined();
      expect(result!.alertness).toBeUndefined();
      expect(result!.bowelMovement).toBeUndefined();
      expect(result!.bathingStatus).toBeUndefined();
      expect(result!.mobilityStatus).toBeUndefined();
    });
  });

  // ==========================================================================
  // BACKWARD COMPATIBILITY
  // ==========================================================================

  describe('backward compatibility', () => {
    it('should read old morning wellness data without orientation/decisionMaking', async () => {
      // Seed with old-format data (no Sprint 1 fields)
      const oldData: any[] = [
        {
          id: 'morning-2025-01-15-old',
          date: '2025-01-15',
          sleepQuality: 4,
          mood: 4,
          energyLevel: 3,
          completedAt: '2025-01-15T10:00:00.000Z',
        },
      ];
      await AsyncStorage.setItem(MORNING_KEY, JSON.stringify(oldData));

      const result = await getMorningWellness('2025-01-15');
      expect(result).not.toBeNull();
      expect(result!.sleepQuality).toBe(4);
      expect(result!.mood).toBe(4);
      expect(result!.orientation).toBeUndefined();
      expect(result!.decisionMaking).toBeUndefined();
    });

    it('should read old evening wellness data without ADL fields', async () => {
      const oldData: any[] = [
        {
          id: 'evening-2025-01-15-old',
          date: '2025-01-15',
          mood: 3,
          mealsLogged: true,
          dayRating: 3,
          completedAt: '2025-01-15T20:00:00.000Z',
        },
      ];
      await AsyncStorage.setItem(EVENING_KEY, JSON.stringify(oldData));

      const result = await getEveningWellness('2025-01-15');
      expect(result).not.toBeNull();
      expect(result!.mood).toBe(3);
      expect(result!.painLevel).toBeUndefined();
      expect(result!.alertness).toBeUndefined();
      expect(result!.bowelMovement).toBeUndefined();
      expect(result!.bathingStatus).toBeUndefined();
      expect(result!.mobilityStatus).toBeUndefined();
    });
  });
});
