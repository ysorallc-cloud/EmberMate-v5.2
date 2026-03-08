// ============================================================================
// BACKWARD COMPATIBILITY — TESTS
// Verifies old-format data survives reads by current code
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMorningWellness } from '../wellnessCheckStorage';
import { getEveningWellness } from '../wellnessCheckStorage';
import { getLogEvents, MealEvent } from '../logEvents';
import { getVitalStatus, VITAL_THRESHOLDS } from '../vitalThresholds';

const MORNING_KEY = '@embermate_morning_wellness';
const EVENING_KEY = '@embermate_evening_wellness';
const LOG_EVENTS_KEY = '@embermate_log_events';

describe('backwardCompatibility', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.useFakeTimers().setSystemTime(new Date('2025-01-15T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ==========================================================================
  // MORNING WELLNESS — old format without Sprint 1 fields
  // ==========================================================================

  describe('old morning wellness data', () => {
    it('should read old format without orientation/decisionMaking', async () => {
      const oldData = [
        {
          id: 'morning-2025-01-15-1234',
          date: '2025-01-15',
          sleepQuality: 4,
          mood: 'good',
          energyLevel: 3,
          completedAt: '2025-01-15T08:00:00.000Z',
        },
      ];
      await AsyncStorage.setItem(MORNING_KEY, JSON.stringify(oldData));

      const result = await getMorningWellness('2025-01-15');

      expect(result).not.toBeNull();
      expect(result!.sleepQuality).toBe(4);
      expect(result!.mood).toBe('good');
      expect(result!.energyLevel).toBe(3);
      // New fields should be undefined, not throw
      expect(result!.orientation).toBeUndefined();
      expect(result!.decisionMaking).toBeUndefined();
      expect(result!.notes).toBeUndefined();
    });

    it('should preserve completedAt deserialization on old data', async () => {
      const oldData = [
        {
          id: 'morning-2025-01-15-5678',
          date: '2025-01-15',
          sleepQuality: 3,
          mood: 'managing',
          energyLevel: 2,
          completedAt: '2025-01-15T07:30:00.000Z',
        },
      ];
      await AsyncStorage.setItem(MORNING_KEY, JSON.stringify(oldData));

      const result = await getMorningWellness('2025-01-15');
      expect(result!.completedAt).toBeInstanceOf(Date);
    });
  });

  // ==========================================================================
  // EVENING WELLNESS — old format without ADL fields
  // ==========================================================================

  describe('old evening wellness data', () => {
    it('should read old format without painLevel/alertness/ADL fields', async () => {
      const oldData = [
        {
          id: 'evening-2025-01-15-1234',
          date: '2025-01-15',
          mood: 'good',
          mealsLogged: true,
          dayRating: 4,
          highlights: 'Good day overall',
          completedAt: '2025-01-15T20:00:00.000Z',
        },
      ];
      await AsyncStorage.setItem(EVENING_KEY, JSON.stringify(oldData));

      const result = await getEveningWellness('2025-01-15');

      expect(result).not.toBeNull();
      expect(result!.mood).toBe('good');
      expect(result!.mealsLogged).toBe(true);
      expect(result!.dayRating).toBe(4);
      expect(result!.highlights).toBe('Good day overall');
      // Sprint 1 ADL fields should be undefined
      expect(result!.painLevel).toBeUndefined();
      expect(result!.alertness).toBeUndefined();
      expect(result!.bowelMovement).toBeUndefined();
      expect(result!.bathingStatus).toBeUndefined();
      expect(result!.mobilityStatus).toBeUndefined();
    });
  });

  // ==========================================================================
  // LOG EVENTS — old meal format without enrichment
  // ==========================================================================

  describe('old meal event data', () => {
    it('should read old meal without appetite/amountConsumed/assistanceLevel', async () => {
      const oldEvents = [
        {
          id: 'old-meal-1',
          type: 'meal',
          mealType: 'Breakfast',
          description: 'Oatmeal with fruit',
          timestamp: '2025-01-15T08:00:00.000Z',
          date: '2025-01-15',
        },
      ];
      await AsyncStorage.setItem(LOG_EVENTS_KEY, JSON.stringify(oldEvents));

      const events = await getLogEvents();
      const meal = events[0] as MealEvent;

      expect(meal.type).toBe('meal');
      expect(meal.mealType).toBe('Breakfast');
      expect(meal.description).toBe('Oatmeal with fruit');
      expect(meal.appetite).toBeUndefined();
      expect(meal.amountConsumed).toBeUndefined();
      expect(meal.assistanceLevel).toBeUndefined();
    });
  });

  // ==========================================================================
  // LOG EVENTS — old audit format
  // ==========================================================================

  describe('old event with audit.source: "record"', () => {
    it('should still read the legacy "record" source', async () => {
      const oldEvents = [
        {
          id: 'old-audit-1',
          type: 'meal',
          mealType: 'Lunch',
          timestamp: '2025-01-15T12:00:00.000Z',
          date: '2025-01-15',
          audit: {
            source: 'record',
            action: 'direct_tap',
          },
        },
      ];
      await AsyncStorage.setItem(LOG_EVENTS_KEY, JSON.stringify(oldEvents));

      const events = await getLogEvents();
      expect(events[0].audit?.source).toBe('record');
      expect(events[0].audit?.action).toBe('direct_tap');
    });
  });

  // ==========================================================================
  // VITAL THRESHOLDS — defaults without custom
  // ==========================================================================

  describe('vital thresholds defaults', () => {
    it('should use default thresholds when no custom thresholds set', () => {
      // No custom thresholds in storage — should use VITAL_THRESHOLDS defaults
      const result = getVitalStatus('glucose', 100);
      expect(result.status).toBe('normal');
      expect(result.label).toContain('Normal');
    });

    it('should flag critical values using default thresholds', () => {
      const result = getVitalStatus('glucose', 50);
      expect(result.status).toBe('critical');
    });

    it('should flag high values using default thresholds', () => {
      const result = getVitalStatus('systolic', 150);
      expect(result.status).toBe('high');
    });
  });
});
