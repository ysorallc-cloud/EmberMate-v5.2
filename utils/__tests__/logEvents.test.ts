// ============================================================================
// LOG EVENTS — BASE CRUD TESTS
// Tests for core CRUD operations, filtering, summary, and deletion
// (Enrichment fields already covered in logEventsSprint1.test.ts)
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  logMeal,
  logMedDose,
  logVitals,
  logHydration,
  logMood,
  getLogEvents,
  getLogEventsByDate,
  getLogEventsByType,
  getTodayLogSummary,
  deleteLogEvent,
  addLogEvent,
  MealEvent,
  MedDoseEvent,
  VitalsEvent,
  HydrationEvent,
} from '../logEvents';

const LOG_EVENTS_KEY = '@embermate_log_events';

describe('logEvents — base CRUD', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.useFakeTimers().setSystemTime(new Date('2025-01-15T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ==========================================================================
  // Basic logging
  // ==========================================================================

  describe('logMeal — basic (no enrichment)', () => {
    it('should log a basic meal with just mealType', async () => {
      const event = await logMeal('Breakfast');

      expect(event.type).toBe('meal');
      expect(event.mealType).toBe('Breakfast');
      expect(event.id).toBeDefined();
      expect(event.date).toBe('2025-01-15');
      expect(event.timestamp).toBeDefined();
    });
  });

  // ==========================================================================
  // getLogEventsByDate
  // ==========================================================================

  describe('getLogEventsByDate', () => {
    it('should filter events by date', async () => {
      // Log event on Jan 15 (system time)
      await logMeal('Breakfast');

      // Manually add an event on Jan 14
      const events = await getLogEvents();
      events.push({
        id: 'old-event',
        type: 'meal',
        mealType: 'Dinner',
        timestamp: '2025-01-14T19:00:00.000Z',
        date: '2025-01-14',
      } as MealEvent);
      await AsyncStorage.setItem(LOG_EVENTS_KEY, JSON.stringify(events));

      const jan15Events = await getLogEventsByDate('2025-01-15');
      expect(jan15Events).toHaveLength(1);
      expect((jan15Events[0] as MealEvent).mealType).toBe('Breakfast');

      const jan14Events = await getLogEventsByDate('2025-01-14');
      expect(jan14Events).toHaveLength(1);
      expect((jan14Events[0] as MealEvent).mealType).toBe('Dinner');
    });

    it('should return empty array for date with no events', async () => {
      const events = await getLogEventsByDate('2025-01-15');
      expect(events).toEqual([]);
    });
  });

  // ==========================================================================
  // getLogEventsByType
  // ==========================================================================

  describe('getLogEventsByType', () => {
    it('should filter events by type', async () => {
      await logMeal('Breakfast');
      await logMedDose('med-1', 'Aspirin', '100mg', true);
      await logMeal('Lunch');

      const meals = await getLogEventsByType<MealEvent>('meal');
      expect(meals).toHaveLength(2);
      expect(meals[0].mealType).toBe('Breakfast');
      expect(meals[1].mealType).toBe('Lunch');

      const meds = await getLogEventsByType<MedDoseEvent>('medDose');
      expect(meds).toHaveLength(1);
      expect(meds[0].medicationName).toBe('Aspirin');
    });

    it('should return empty array for type with no events', async () => {
      await logMeal('Breakfast');
      const vitals = await getLogEventsByType<VitalsEvent>('vitals');
      expect(vitals).toEqual([]);
    });
  });

  // ==========================================================================
  // getTodayLogSummary
  // ==========================================================================

  describe('getTodayLogSummary', () => {
    it('should count events by type for today', async () => {
      await logMedDose('med-1', 'Aspirin', '100mg', true);
      await logMedDose('med-2', 'Lisinopril', '10mg', true);
      await logMedDose('med-3', 'Metformin', '500mg', false); // skipped, not counted
      await logVitals({ systolic: 120, diastolic: 80, heartRate: 72 });
      await logMeal('Breakfast');
      await logMeal('Lunch');
      await logHydration(3);
      await logMood(4);

      const summary = await getTodayLogSummary();

      expect(summary.medDoses).toBe(2); // only taken=true
      expect(summary.vitalsChecks).toBe(1);
      expect(summary.meals).toBe(2);
      expect(summary.hydration).toBe(3); // glasses sum
      expect(summary.moodChecks).toBe(1);
      expect(summary.symptoms).toBe(0);
    });

    it('should return zeros when no events exist', async () => {
      const summary = await getTodayLogSummary();

      expect(summary.medDoses).toBe(0);
      expect(summary.vitalsChecks).toBe(0);
      expect(summary.meals).toBe(0);
      expect(summary.hydration).toBe(0);
      expect(summary.moodChecks).toBe(0);
      expect(summary.symptoms).toBe(0);
    });

    it('should sum hydration glasses across multiple events', async () => {
      await logHydration(2);
      await logHydration(3);
      await logHydration(1);

      const summary = await getTodayLogSummary();
      expect(summary.hydration).toBe(6);
    });
  });

  // ==========================================================================
  // deleteLogEvent
  // ==========================================================================

  describe('deleteLogEvent', () => {
    it('should delete an existing event and return true', async () => {
      const event = await logMeal('Breakfast');
      const result = await deleteLogEvent(event.id);

      expect(result).toBe(true);

      const remaining = await getLogEvents();
      expect(remaining).toHaveLength(0);
    });

    it('should return false for a non-existent id', async () => {
      const result = await deleteLogEvent('nonexistent-id');
      expect(result).toBe(false);
    });

    it('should only delete the targeted event', async () => {
      const event1 = await logMeal('Breakfast');
      const event2 = await logMeal('Lunch');

      await deleteLogEvent(event1.id);

      const remaining = await getLogEvents();
      expect(remaining).toHaveLength(1);
      expect((remaining[0] as MealEvent).mealType).toBe('Lunch');
    });
  });

  // ==========================================================================
  // Backward compatibility
  // ==========================================================================

  describe('backward compatibility', () => {
    it('should read old event with audit.source: "record" correctly', async () => {
      const oldEvent = {
        id: 'old-1',
        type: 'meal',
        mealType: 'Lunch',
        timestamp: '2025-01-15T12:00:00.000Z',
        date: '2025-01-15',
        audit: { source: 'record', action: 'direct_tap' },
      };
      await AsyncStorage.setItem(LOG_EVENTS_KEY, JSON.stringify([oldEvent]));

      const events = await getLogEvents();
      expect(events).toHaveLength(1);
      expect(events[0].audit?.source).toBe('record');
    });

    it('should read old meal event without appetite field', async () => {
      const oldEvent = {
        id: 'old-2',
        type: 'meal',
        mealType: 'Dinner',
        description: 'Pasta and salad',
        timestamp: '2025-01-15T18:00:00.000Z',
        date: '2025-01-15',
      };
      await AsyncStorage.setItem(LOG_EVENTS_KEY, JSON.stringify([oldEvent]));

      const events = await getLogEvents();
      const meal = events[0] as MealEvent;
      expect(meal.mealType).toBe('Dinner');
      expect(meal.description).toBe('Pasta and salad');
      expect(meal.appetite).toBeUndefined();
      expect(meal.amountConsumed).toBeUndefined();
      expect(meal.assistanceLevel).toBeUndefined();
    });
  });
});
