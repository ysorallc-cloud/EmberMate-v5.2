import {
  generateCarePlanFromOnboarding,
  getCoreQuickLogFromAnswers,
  OnboardingAnswers,
} from '../utils/onboardingToPlan';

describe('generateCarePlanFromOnboarding', () => {
  const baseAnswers: OnboardingAnswers = {
    relationship: 'parent',
    careAreas: ['medications', 'meals'],
    concerns: ['missed_medication'],
    cadence: 'morning_evening',
  };

  test('enables buckets matching care area selections', () => {
    const config = generateCarePlanFromOnboarding(baseAnswers);
    expect(config.meds.enabled).toBe(true);
    expect(config.meals.enabled).toBe(true);
  });

  test('wellness and water are always enabled', () => {
    const config = generateCarePlanFromOnboarding({
      ...baseAnswers,
      careAreas: [],
    });
    expect(config.wellness.enabled).toBe(true);
    expect(config.water.enabled).toBe(true);
  });

  test('concerns elevate priority to required', () => {
    const config = generateCarePlanFromOnboarding(baseAnswers);
    expect(config.meds.priority).toBe('required');
  });

  test('cadence sets timesOfDay correctly', () => {
    const config = generateCarePlanFromOnboarding({
      ...baseAnswers,
      cadence: 'three_times',
    });
    expect(config.wellness.timesOfDay).toEqual(['morning', 'midday', 'evening']);
    expect(config.meds.timesOfDay).toEqual(['morning', 'midday', 'evening']);
  });

  test('morning_only cadence sets single time', () => {
    const config = generateCarePlanFromOnboarding({
      ...baseAnswers,
      cadence: 'morning_only',
    });
    expect(config.wellness.timesOfDay).toEqual(['morning']);
  });

  test('vitals care area enables vitals bucket', () => {
    const config = generateCarePlanFromOnboarding({
      ...baseAnswers,
      careAreas: ['vitals'],
    });
    expect(config.vitals.enabled).toBe(true);
  });

  test('unselected buckets remain disabled', () => {
    const config = generateCarePlanFromOnboarding(baseAnswers);
    expect(config.sleep.enabled).toBe(false);
    expect(config.activity.enabled).toBe(false);
  });

  test('sleep concern enables sleep bucket', () => {
    const config = generateCarePlanFromOnboarding({
      ...baseAnswers,
      concerns: ['sleep_patterns'],
    });
    expect(config.sleep.enabled).toBe(true);
    expect(config.sleep.priority).toBe('required');
  });
});

describe('getCoreQuickLogFromAnswers', () => {
  test('returns exactly 3 items', () => {
    const result = getCoreQuickLogFromAnswers({
      relationship: 'parent',
      careAreas: ['medications', 'meals'],
      concerns: ['missed_medication'],
      cadence: 'morning_evening',
    });
    expect(result).toHaveLength(3);
  });

  test('always includes wellness', () => {
    const result = getCoreQuickLogFromAnswers({
      relationship: 'self',
      careAreas: ['vitals'],
      concerns: [],
      cadence: 'flexible',
    });
    expect(result).toContain('wellness');
  });

  test('includes medication when selected', () => {
    const result = getCoreQuickLogFromAnswers({
      relationship: 'parent',
      careAreas: ['medications', 'meals'],
      concerns: [],
      cadence: 'morning_evening',
    });
    expect(result).toContain('meds');
    expect(result).toContain('meals');
  });
});
