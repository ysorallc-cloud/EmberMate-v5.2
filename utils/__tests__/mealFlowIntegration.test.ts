// ============================================================================
// MEAL FLOW INTEGRATION — TESTS
// Cross-system data consistency between logEvents and centralStorage
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logMeal, getLogEvents, getTodayLogSummary, MealEvent } from '../logEvents';
import { saveMealsLog, getMealsLogs, MealsLog } from '../centralStorage';

describe('mealFlowIntegration — cross-system consistency', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.useFakeTimers().setSystemTime(new Date('2025-01-15T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ==========================================================================
  // Enrichment fields stored in both systems
  // ==========================================================================

  it('should store enrichment fields via logMeal (logEvents system)', async () => {
    const event = await logMeal('Lunch', {
      appetite: 'fair',
      amountConsumed: 'half',
      assistanceLevel: 'verbal',
      description: 'Soup and bread',
    });

    const events = await getLogEvents();
    const meal = events[0] as MealEvent;

    expect(meal.appetite).toBe('fair');
    expect(meal.amountConsumed).toBe('half');
    expect(meal.assistanceLevel).toBe('verbal');
    expect(meal.description).toBe('Soup and bread');
  });

  it('should store enrichment fields via saveMealsLog (centralStorage system)', async () => {
    await saveMealsLog({
      timestamp: new Date().toISOString(),
      meals: ['Lunch'],
      appetite: 'fair',
      amountConsumed: 'half',
      assistanceLevel: 'verbal',
      description: 'Soup and bread',
    });

    const logs = await getMealsLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].appetite).toBe('fair');
    expect(logs[0].amountConsumed).toBe('half');
    expect(logs[0].assistanceLevel).toBe('verbal');
    expect(logs[0].description).toBe('Soup and bread');
  });

  it('should have matching enrichment field types across both systems', async () => {
    // Log via logEvents
    const event = await logMeal('Dinner', {
      appetite: 'poor',
      amountConsumed: 'little',
      assistanceLevel: 'full',
    });

    // Log via centralStorage
    await saveMealsLog({
      timestamp: new Date().toISOString(),
      meals: ['Dinner'],
      appetite: 'poor',
      amountConsumed: 'little',
      assistanceLevel: 'full',
    });

    const logEvent = (await getLogEvents())[0] as MealEvent;
    const centralLog = (await getMealsLogs())[0];

    // Both systems should store the same values
    expect(logEvent.appetite).toBe(centralLog.appetite);
    expect(logEvent.amountConsumed).toBe(centralLog.amountConsumed);
    expect(logEvent.assistanceLevel).toBe(centralLog.assistanceLevel);
  });

  // ==========================================================================
  // Summary counts remain correct with enrichment
  // ==========================================================================

  it('should count meals correctly in getTodayLogSummary despite enrichment fields', async () => {
    await logMeal('Breakfast', { appetite: 'good', amountConsumed: 'all' });
    await logMeal('Lunch', { appetite: 'fair', amountConsumed: 'most' });
    await logMeal('Dinner');

    const summary = await getTodayLogSummary();
    expect(summary.meals).toBe(3);
  });

  it('should handle meal without enrichment alongside enriched meals', async () => {
    // Old-style meal (no enrichment)
    await logMeal('Breakfast');

    // New-style meal (with enrichment)
    await logMeal('Lunch', {
      appetite: 'good',
      amountConsumed: 'all',
      assistanceLevel: 'independent',
    });

    const events = await getLogEvents();
    const meals = events.filter(e => e.type === 'meal') as MealEvent[];

    expect(meals).toHaveLength(2);
    expect(meals[0].appetite).toBeUndefined();
    expect(meals[1].appetite).toBe('good');
  });

  it('should store meals in centralStorage without enrichment (backward compat)', async () => {
    await saveMealsLog({
      timestamp: new Date().toISOString(),
      meals: ['Snack'],
    });

    const logs = await getMealsLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].meals).toEqual(['Snack']);
    expect(logs[0].appetite).toBeUndefined();
    expect(logs[0].amountConsumed).toBeUndefined();
    expect(logs[0].assistanceLevel).toBeUndefined();
  });
});
