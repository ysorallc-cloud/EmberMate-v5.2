// ============================================================================
// LOG EVENTS — SPRINT 1 TESTS
// Tests for MealEvent enrichment fields (appetite, amountConsumed, assistanceLevel)
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  logMeal,
  getLogEvents,
  MealEvent,
} from '../logEvents';

describe('logEvents — Sprint 1 MealEvent enrichment', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  // ==========================================================================
  // logMeal with new fields
  // ==========================================================================

  describe('logMeal with enrichment fields', () => {
    it('should log a meal with appetite field', async () => {
      const event = await logMeal('Breakfast', {
        appetite: 'good',
      });
      expect(event.type).toBe('meal');
      expect(event.mealType).toBe('Breakfast');
      expect(event.appetite).toBe('good');
    });

    it('should log a meal with amountConsumed field', async () => {
      const event = await logMeal('Lunch', {
        amountConsumed: 'half',
      });
      expect(event.amountConsumed).toBe('half');
    });

    it('should log a meal with assistanceLevel field', async () => {
      const event = await logMeal('Dinner', {
        assistanceLevel: 'verbal',
      });
      expect(event.assistanceLevel).toBe('verbal');
    });

    it('should log a meal with all enrichment fields together', async () => {
      const event = await logMeal('Lunch', {
        description: 'Grilled chicken and rice',
        appetite: 'fair',
        amountConsumed: 'most',
        assistanceLevel: 'independent',
      });
      expect(event.appetite).toBe('fair');
      expect(event.amountConsumed).toBe('most');
      expect(event.assistanceLevel).toBe('independent');
      expect(event.description).toBe('Grilled chicken and rice');
    });

    it('should log a meal without enrichment fields (backwards compatible)', async () => {
      const event = await logMeal('Snack', {
        description: 'Apple slices',
      });
      expect(event.appetite).toBeUndefined();
      expect(event.amountConsumed).toBeUndefined();
      expect(event.assistanceLevel).toBeUndefined();
      expect(event.description).toBe('Apple slices');
    });

    it('should log a meal with no options at all', async () => {
      const event = await logMeal('Breakfast');
      expect(event.type).toBe('meal');
      expect(event.mealType).toBe('Breakfast');
      expect(event.id).toBeDefined();
      expect(event.timestamp).toBeDefined();
    });
  });

  // ==========================================================================
  // Persistence of enrichment fields
  // ==========================================================================

  describe('persistence of enrichment fields', () => {
    it('should persist and retrieve enrichment fields from storage', async () => {
      await logMeal('Dinner', {
        appetite: 'poor',
        amountConsumed: 'little',
        assistanceLevel: 'full',
      });

      const events = await getLogEvents();
      expect(events.length).toBe(1);

      const meal = events[0] as MealEvent;
      expect(meal.type).toBe('meal');
      expect(meal.appetite).toBe('poor');
      expect(meal.amountConsumed).toBe('little');
      expect(meal.assistanceLevel).toBe('full');
    });

    it('should persist multiple meals with different enrichment values', async () => {
      await logMeal('Breakfast', { appetite: 'good', amountConsumed: 'all' });
      await logMeal('Lunch', { appetite: 'fair', amountConsumed: 'half' });
      await logMeal('Dinner', { appetite: 'refused', amountConsumed: 'none' });

      const events = await getLogEvents();
      const meals = events.filter(e => e.type === 'meal') as MealEvent[];
      expect(meals.length).toBe(3);

      expect(meals[0].appetite).toBe('good');
      expect(meals[1].appetite).toBe('fair');
      expect(meals[2].appetite).toBe('refused');
    });
  });

  // ==========================================================================
  // Appetite option values
  // ==========================================================================

  describe('appetite option values', () => {
    const appetiteValues: Array<'good' | 'fair' | 'poor' | 'refused'> = [
      'good', 'fair', 'poor', 'refused',
    ];

    appetiteValues.forEach(value => {
      it(`should accept appetite value: ${value}`, async () => {
        const event = await logMeal('Lunch', { appetite: value });
        expect(event.appetite).toBe(value);
      });
    });
  });

  // ==========================================================================
  // Amount consumed option values
  // ==========================================================================

  describe('amountConsumed option values', () => {
    const amountValues: Array<'all' | 'most' | 'half' | 'little' | 'none'> = [
      'all', 'most', 'half', 'little', 'none',
    ];

    amountValues.forEach(value => {
      it(`should accept amountConsumed value: ${value}`, async () => {
        const event = await logMeal('Dinner', { amountConsumed: value });
        expect(event.amountConsumed).toBe(value);
      });
    });
  });

  // ==========================================================================
  // Assistance level option values
  // ==========================================================================

  describe('assistanceLevel option values', () => {
    const assistanceValues: Array<'independent' | 'verbal' | 'partial' | 'full'> = [
      'independent', 'verbal', 'partial', 'full',
    ];

    assistanceValues.forEach(value => {
      it(`should accept assistanceLevel value: ${value}`, async () => {
        const event = await logMeal('Breakfast', { assistanceLevel: value });
        expect(event.assistanceLevel).toBe(value);
      });
    });
  });

  // ==========================================================================
  // Audit trail preserved with enrichment
  // ==========================================================================

  describe('audit trail with enrichment fields', () => {
    it('should preserve audit metadata alongside enrichment fields', async () => {
      const event = await logMeal('Lunch', {
        appetite: 'good',
        amountConsumed: 'all',
        assistanceLevel: 'independent',
        audit: {
          source: 'record',
          action: 'direct_tap',
        },
      });

      expect(event.appetite).toBe('good');
      expect(event.audit?.source).toBe('record');
      expect(event.audit?.action).toBe('direct_tap');
    });
  });
});
