// ============================================================================
// Care Plan — Progressive Disclosure (Enabled vs Disabled Buckets) Tests
// Verifies enabled/disabled bucket splitting logic used in care-plan/index.tsx
// ============================================================================

import type { BucketType } from '../../types/carePlanConfig';
import {
  PRIMARY_BUCKETS,
  SECONDARY_BUCKETS,
  OPTIONAL_BUCKETS,
} from '../../types/carePlanConfig';

describe('Care plan progressive disclosure', () => {
  const allBuckets: BucketType[] = [...PRIMARY_BUCKETS, ...SECONDARY_BUCKETS, ...OPTIONAL_BUCKETS];

  // Replicate the filtering logic from care-plan/index.tsx
  function splitBuckets(enabledBuckets: BucketType[]) {
    const enabledBucketSet = new Set(enabledBuckets);
    const enabled = allBuckets.filter(b => enabledBucketSet.has(b));
    const disabled = allBuckets.filter(b => !enabledBucketSet.has(b));
    return { enabled, disabled };
  }

  it('only shows enabled buckets as main tiles', () => {
    const { enabled, disabled } = splitBuckets(['meds', 'vitals']);
    expect(enabled).toHaveLength(2);
    expect(enabled).toContain('meds');
    expect(enabled).toContain('vitals');
    expect(disabled.length).toBe(allBuckets.length - 2);
  });

  it('disabled buckets appear in Add more section', () => {
    const { disabled } = splitBuckets(['meds', 'vitals']);
    expect(disabled).toContain('meals');
    expect(disabled).toContain('sleep');
    expect(disabled).toContain('activity');
    expect(disabled).toContain('water');
    expect(disabled).toContain('appointments');
    // wellness is not in PRIMARY/SECONDARY/OPTIONAL bucket groups
  });

  it('all buckets enabled means no Add more section', () => {
    const { disabled } = splitBuckets(allBuckets);
    expect(disabled).toHaveLength(0);
  });

  it('no buckets enabled means all in Add more section', () => {
    const { enabled, disabled } = splitBuckets([]);
    expect(enabled).toHaveLength(0);
    expect(disabled).toHaveLength(allBuckets.length);
  });

  it('enabled and disabled are mutually exclusive and exhaustive', () => {
    const { enabled, disabled } = splitBuckets(['meds', 'sleep', 'appointments']);
    const combined = [...enabled, ...disabled];
    expect(combined).toHaveLength(allBuckets.length);
    const uniqueIds = new Set(combined);
    expect(uniqueIds.size).toBe(allBuckets.length);
  });

  it('respects PRIMARY, SECONDARY, OPTIONAL ordering', () => {
    const { enabled } = splitBuckets(allBuckets);
    // Enabled list should match allBuckets order
    expect(enabled).toEqual(allBuckets);
  });
});
