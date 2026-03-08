// ============================================================================
// SPRINT 1 DATA ENRICHMENT — INTEGRATION TESTS
// End-to-end tests for Sprint 1 data enrichment features:
//   1.1 Patient Alertness & Orientation (morning wellness)
//   1.2 Meal Intake Quality (logEvents + centralStorage)
//   1.3 Symptom-Medication Linking (insight rules)
//   1.4 Evening Check Expansion (evening wellness types)
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MorningWellnessData, EveningWellnessData } from '../../types/timeline';
import { logMeal, getLogEvents, MealEvent } from '../logEvents';
import { generateInsights, InsightContext } from '../insightRules';
import { CarePlanTask, TaskStats } from '../../types/carePlanTask';

// ============================================================================
// HELPERS
// ============================================================================

function makeTask(overrides: Partial<CarePlanTask> = {}): CarePlanTask {
  return {
    id: 'task-1',
    instanceId: 'inst-1',
    carePlanItemId: 'item-1',
    title: 'Test Task',
    subtitle: '',
    emoji: '💊',
    type: 'medication',
    priority: 'normal',
    windowLabel: 'morning',
    scheduledTime: '08:00',
    scheduledTimeDisplay: '8:00 AM',
    date: '2025-01-15',
    status: 'pending',
    isOverdue: false,
    isDueSoon: false,
    ...overrides,
  } as CarePlanTask;
}

function makeStats(overrides: Partial<TaskStats> = {}): TaskStats {
  return {
    total: 5,
    pending: 3,
    completed: 2,
    skipped: 0,
    missed: 0,
    overdue: 0,
    completionRate: 40,
    ...overrides,
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe('Sprint 1 Data Enrichment — Integration Tests', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  // ==========================================================================
  // Task 1.1: MorningWellnessData type enrichment
  // ==========================================================================

  describe('Task 1.1: Patient Alertness & Orientation types', () => {
    it('should accept orientation field on MorningWellnessData', () => {
      const data: MorningWellnessData = {
        sleepQuality: 4,
        mood: 4,
        energyLevel: 3,
        orientation: 'alert-oriented',
        completedAt: new Date(),
      };
      expect(data.orientation).toBe('alert-oriented');
    });

    it('should accept decisionMaking field on MorningWellnessData', () => {
      const data: MorningWellnessData = {
        sleepQuality: 3,
        mood: 3,
        energyLevel: 2,
        decisionMaking: 'needs-guidance',
        completedAt: new Date(),
      };
      expect(data.decisionMaking).toBe('needs-guidance');
    });

    it('should accept all orientation values', () => {
      const values: MorningWellnessData['orientation'][] = [
        'alert-oriented',
        'confused-responsive',
        'disoriented',
        'unresponsive',
        undefined,
      ];
      values.forEach(v => {
        const data: MorningWellnessData = {
          sleepQuality: 3,
          mood: 4,
          energyLevel: 3,
          orientation: v,
          completedAt: new Date(),
        };
        expect(data.orientation).toBe(v);
      });
    });

    it('should accept all decisionMaking values', () => {
      const values: MorningWellnessData['decisionMaking'][] = [
        'own-decisions',
        'needs-guidance',
        'unable-to-decide',
        undefined,
      ];
      values.forEach(v => {
        const data: MorningWellnessData = {
          sleepQuality: 3,
          mood: 4,
          energyLevel: 3,
          decisionMaking: v,
          completedAt: new Date(),
        };
        expect(data.decisionMaking).toBe(v);
      });
    });

    it('should work without optional fields (backwards compatible)', () => {
      const data: MorningWellnessData = {
        sleepQuality: 5,
        mood: 5,
        energyLevel: 5,
        completedAt: new Date(),
      };
      expect(data.orientation).toBeUndefined();
      expect(data.decisionMaking).toBeUndefined();
    });
  });

  // ==========================================================================
  // Task 1.2: Meal intake quality end-to-end
  // ==========================================================================

  describe('Task 1.2: Meal intake quality end-to-end', () => {
    it('should log and retrieve enriched meal data through the full pipeline', async () => {
      // Log a meal with all enrichment fields
      const loggedEvent = await logMeal('Breakfast', {
        description: 'Oatmeal and fruit',
        appetite: 'good',
        amountConsumed: 'most',
        assistanceLevel: 'independent',
        audit: {
          source: 'record',
          action: 'direct_tap',
        },
      });

      // Verify the returned event
      expect(loggedEvent.id).toBeDefined();
      expect(loggedEvent.type).toBe('meal');

      // Retrieve from storage
      const storedEvents = await getLogEvents();
      const storedMeal = storedEvents.find(e => e.id === loggedEvent.id) as MealEvent;

      expect(storedMeal).toBeDefined();
      expect(storedMeal.mealType).toBe('Breakfast');
      expect(storedMeal.appetite).toBe('good');
      expect(storedMeal.amountConsumed).toBe('most');
      expect(storedMeal.assistanceLevel).toBe('independent');
      expect(storedMeal.description).toBe('Oatmeal and fruit');
      expect(storedMeal.audit?.source).toBe('record');
    });

    it('should handle a full day of meals with varying enrichment', async () => {
      await logMeal('Breakfast', {
        appetite: 'good',
        amountConsumed: 'all',
        assistanceLevel: 'independent',
      });
      await logMeal('Lunch', {
        appetite: 'fair',
        amountConsumed: 'half',
        assistanceLevel: 'verbal',
      });
      await logMeal('Snack', {
        // No enrichment — just a basic snack
        description: 'Crackers',
      });
      await logMeal('Dinner', {
        appetite: 'poor',
        amountConsumed: 'little',
        assistanceLevel: 'partial',
      });

      const events = await getLogEvents();
      const meals = events.filter(e => e.type === 'meal') as MealEvent[];

      expect(meals.length).toBe(4);

      // Verify each meal retained its specific values
      const breakfast = meals.find(m => m.mealType === 'Breakfast')!;
      expect(breakfast.appetite).toBe('good');
      expect(breakfast.amountConsumed).toBe('all');

      const lunch = meals.find(m => m.mealType === 'Lunch')!;
      expect(lunch.appetite).toBe('fair');
      expect(lunch.assistanceLevel).toBe('verbal');

      const snack = meals.find(m => m.mealType === 'Snack')!;
      expect(snack.appetite).toBeUndefined();

      const dinner = meals.find(m => m.mealType === 'Dinner')!;
      expect(dinner.appetite).toBe('poor');
      expect(dinner.amountConsumed).toBe('little');
    });
  });

  // ==========================================================================
  // Task 1.3: Symptom-medication linking insights (rule removed in simplification)
  // ==========================================================================

  describe('Task 1.3: Insight rules still work without removed rule', () => {
    it('should NOT generate med-symptom insight (rule was removed)', () => {
      const ctx: InsightContext = {
        tasks: [
          makeTask({ type: 'medication', status: 'completed', title: 'Lisinopril 10mg' }),
        ],
        stats: makeStats({ completed: 1, pending: 4 }),
        byWindow: { morning: [], afternoon: [], evening: [], night: [], custom: [] },
        currentHour: 16,
        currentWindow: 'afternoon',
      };

      const insights = generateInsights(ctx);
      expect(insights.find(i => i.id === 'med-symptom-correlation')).toBeUndefined();
    });

    it('should still generate all-complete and streak insights', () => {
      const ctx: InsightContext = {
        tasks: [
          makeTask({ type: 'medication', status: 'completed', title: 'Aspirin' }),
        ],
        stats: makeStats({ total: 1, pending: 0, completed: 1 }),
        byWindow: { morning: [], afternoon: [], evening: [], night: [], custom: [] },
        currentHour: 16,
        currentWindow: 'afternoon',
        consecutiveLoggingDays: 5,
        recentCompletionRate: 95,
      };

      const insights = generateInsights(ctx);
      const ids = insights.map(i => i.id);

      expect(ids).toContain('all-complete');
      expect(ids).toContain('streak');
      expect(ids).toContain('high-completion');
    });
  });

  // ==========================================================================
  // Task 1.4: EveningWellnessData type enrichment
  // ==========================================================================

  describe('Task 1.4: Evening Check Expansion types', () => {
    it('should accept all new evening wellness fields', () => {
      const data: EveningWellnessData = {
        mood: 4,
        mealsLogged: true,
        dayRating: 4,
        painLevel: 'mild',
        alertness: 'alert',
        bowelMovement: 'yes',
        bathingStatus: 'independent',
        mobilityStatus: 'walker',
        completedAt: new Date(),
      };

      expect(data.painLevel).toBe('mild');
      expect(data.alertness).toBe('alert');
      expect(data.bowelMovement).toBe('yes');
      expect(data.bathingStatus).toBe('independent');
      expect(data.mobilityStatus).toBe('walker');
    });

    it('should accept all painLevel values', () => {
      const values: EveningWellnessData['painLevel'][] = [
        'none', 'mild', 'moderate', 'severe', undefined,
      ];
      values.forEach(v => {
        const data: EveningWellnessData = {
          mood: 3,
          mealsLogged: true,
          dayRating: 3,
          painLevel: v,
          completedAt: new Date(),
        };
        expect(data.painLevel).toBe(v);
      });
    });

    it('should accept all alertness values', () => {
      const values: EveningWellnessData['alertness'][] = [
        'alert', 'confused', 'drowsy', 'unresponsive', undefined,
      ];
      values.forEach(v => {
        const data: EveningWellnessData = {
          mood: 3,
          mealsLogged: true,
          dayRating: 3,
          alertness: v,
          completedAt: new Date(),
        };
        expect(data.alertness).toBe(v);
      });
    });

    it('should accept all bowelMovement values', () => {
      const values: EveningWellnessData['bowelMovement'][] = [
        'yes', 'no', 'unknown', undefined,
      ];
      values.forEach(v => {
        const data: EveningWellnessData = {
          mood: 3,
          mealsLogged: true,
          dayRating: 3,
          bowelMovement: v,
          completedAt: new Date(),
        };
        expect(data.bowelMovement).toBe(v);
      });
    });

    it('should accept all bathingStatus values', () => {
      const values: EveningWellnessData['bathingStatus'][] = [
        'independent', 'partial-assist', 'full-assist', 'not-today', undefined,
      ];
      values.forEach(v => {
        const data: EveningWellnessData = {
          mood: 3,
          mealsLogged: true,
          dayRating: 3,
          bathingStatus: v,
          completedAt: new Date(),
        };
        expect(data.bathingStatus).toBe(v);
      });
    });

    it('should accept all mobilityStatus values', () => {
      const values: EveningWellnessData['mobilityStatus'][] = [
        'independent', 'walker', 'cane', 'wheelchair', 'bed-bound', undefined,
      ];
      values.forEach(v => {
        const data: EveningWellnessData = {
          mood: 3,
          mealsLogged: true,
          dayRating: 3,
          mobilityStatus: v,
          completedAt: new Date(),
        };
        expect(data.mobilityStatus).toBe(v);
      });
    });

    it('should work without new fields (backwards compatible)', () => {
      const data: EveningWellnessData = {
        mood: 4,
        mealsLogged: true,
        dayRating: 4,
        completedAt: new Date(),
      };
      expect(data.painLevel).toBeUndefined();
      expect(data.alertness).toBeUndefined();
      expect(data.bowelMovement).toBeUndefined();
      expect(data.bathingStatus).toBeUndefined();
      expect(data.mobilityStatus).toBeUndefined();
    });

    it('should allow combining original and new fields', () => {
      const data: EveningWellnessData = {
        mood: 2,
        mealsLogged: false,
        dayRating: 2,
        highlights: 'Enjoyed garden time',
        concerns: 'Refused dinner',
        painLevel: 'moderate',
        alertness: 'confused',
        bowelMovement: 'no',
        bathingStatus: 'full-assist',
        mobilityStatus: 'wheelchair',
        completedAt: new Date(),
      };

      // Original fields
      expect(data.highlights).toBe('Enjoyed garden time');
      expect(data.concerns).toBe('Refused dinner');

      // New fields
      expect(data.painLevel).toBe('moderate');
      expect(data.alertness).toBe('confused');
      expect(data.mobilityStatus).toBe('wheelchair');
    });
  });
});
