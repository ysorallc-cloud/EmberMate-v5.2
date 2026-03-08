import { createDefaultCarePlanConfig, PRIMARY_BUCKETS, SECONDARY_BUCKETS } from '../types/carePlanConfig';
import { CORE_OPTIONS, MORE_OPTIONS } from '../constants/quickLogOptions';

describe('Default Care Plan Config', () => {
  const config = createDefaultCarePlanConfig('test-patient');

  test('meds, meals, water, wellness are enabled by default', () => {
    expect(config.meds.enabled).toBe(true);
    expect(config.meals.enabled).toBe(true);
    expect(config.water.enabled).toBe(true);
    expect(config.wellness.enabled).toBe(true);
  });

  test('vitals, sleep, activity, appointments are disabled by default', () => {
    expect(config.vitals.enabled).toBe(false);
    expect(config.sleep.enabled).toBe(false);
    expect(config.activity.enabled).toBe(false);
    expect(config.appointments.enabled).toBe(false);
  });

  test('meds priority is required', () => {
    expect(config.meds.priority).toBe('required');
  });

  test('PRIMARY_BUCKETS includes meds, meals, water, wellness', () => {
    expect(PRIMARY_BUCKETS).toContain('meds');
    expect(PRIMARY_BUCKETS).toContain('meals');
    expect(PRIMARY_BUCKETS).toContain('water');
    expect(PRIMARY_BUCKETS).toContain('wellness');
    expect(PRIMARY_BUCKETS).not.toContain('vitals');
  });

  test('SECONDARY_BUCKETS includes vitals', () => {
    expect(SECONDARY_BUCKETS).toContain('vitals');
  });
});

describe('Quick Log Core Options', () => {
  test('core options are meds, wellness, meals', () => {
    const coreIds = CORE_OPTIONS.map(o => o.id);
    expect(coreIds).toContain('meds');
    expect(coreIds).toContain('wellness');
    expect(coreIds).toContain('meals');
    expect(coreIds).not.toContain('vitals');
  });

  test('vitals is in more options', () => {
    const moreIds = MORE_OPTIONS.map(o => o.id);
    expect(moreIds).toContain('vitals');
  });
});

describe('Onboarding defaults', () => {
  test('GetStartedScreen does not require bucket selection', () => {
    const screen = require('../app/(onboarding)/screens/GetStartedScreen');
    // The component should not export SELECTABLE_BUCKETS
    expect(screen.SELECTABLE_BUCKETS).toBeUndefined();
  });
});
