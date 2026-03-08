// ============================================================================
// Quick Log Options — Progressive Disclosure Filter Tests
// ============================================================================

import {
  getFilteredOptions,
  QUICK_LOG_OPTIONS,
  CORE_OPTIONS,
  MORE_OPTIONS,
  QuickLogOption,
} from '../../constants/quickLogOptions';
import type { BucketType } from '../../types/carePlanConfig';

describe('getFilteredOptions', () => {
  it('meds-only config shows meds + always-visible items', () => {
    const result = getFilteredOptions(['meds']);
    const visibleIds = [...result.core, ...result.more].map(o => o.id);
    expect(visibleIds).toContain('meds');
    expect(visibleIds).toContain('note');
    expect(visibleIds).not.toContain('meals');
    expect(visibleIds).not.toContain('sleep');
  });

  it('note is always visible regardless of config', () => {
    const result = getFilteredOptions([]);
    const visibleIds = [...result.core, ...result.more].map(o => o.id);
    expect(visibleIds).toContain('note');
  });

  it('disabled list contains non-enabled bucket options', () => {
    const result = getFilteredOptions(['meds', 'vitals']);
    const disabledIds = result.disabled.map(o => o.id);
    expect(disabledIds).toContain('meals');
    expect(disabledIds).toContain('sleep');
    expect(disabledIds).toContain('hydration');
    expect(disabledIds).toContain('activity');
    // Note, bathroom, symptom, appointment are always-visible (bucketType null)
    expect(disabledIds).not.toContain('note');
    expect(disabledIds).not.toContain('bathroom');
    expect(disabledIds).not.toContain('symptom');
    expect(disabledIds).not.toContain('appointment');
  });

  it('all buckets enabled shows all options', () => {
    const allBuckets: BucketType[] = ['meds', 'vitals', 'meals', 'water', 'sleep', 'activity', 'wellness', 'appointments'];
    const result = getFilteredOptions(allBuckets);
    const visibleIds = [...result.core, ...result.more].map(o => o.id);
    expect(visibleIds).toHaveLength(QUICK_LOG_OPTIONS.length);
    expect(result.disabled).toHaveLength(0);
  });

  it('empty enabledBuckets shows only always-visible items', () => {
    const result = getFilteredOptions([]);
    const visibleIds = [...result.core, ...result.more].map(o => o.id);
    // Only items with bucketType null
    expect(visibleIds).toContain('note');
    expect(visibleIds).toContain('bathroom');
    expect(visibleIds).toContain('symptom');
    expect(visibleIds).toContain('appointment');
    // Bucket-dependent items should be disabled
    expect(visibleIds).not.toContain('meds');
    expect(visibleIds).not.toContain('vitals');
    expect(visibleIds).not.toContain('wellness');
    expect(visibleIds).not.toContain('meals');
  });

  it('core and more lists are mutually exclusive with disabled', () => {
    const result = getFilteredOptions(['meds']);
    const allVisible = [...result.core, ...result.more];
    const allIds = [...allVisible, ...result.disabled].map(o => o.id);
    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(allIds.length); // No duplicates
    expect(allIds.length).toBe(QUICK_LOG_OPTIONS.length); // All accounted for
  });

  it('meds+vitals caregiver sees core options + always-visible more', () => {
    const result = getFilteredOptions(['meds', 'vitals']);
    // Core: meds, wellness (always core), meals (now core) — vitals is now non-core
    expect(result.core.map(o => o.id)).toEqual(['meds']);
    // More: vitals (enabled, non-core), note, bathroom, symptom, appointment (always visible)
    const moreIds = result.more.map(o => o.id);
    expect(moreIds).toContain('note');
    expect(moreIds).toContain('vitals');
    expect(moreIds).not.toContain('sleep');
  });

  it('every QuickLogOption has a bucketType field', () => {
    QUICK_LOG_OPTIONS.forEach(option => {
      expect(option).toHaveProperty('bucketType');
    });
  });
});
