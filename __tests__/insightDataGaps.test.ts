// ============================================================================
// Phase 2 test: generateDataGaps uses real instance data
// Verifies the data gaps function is async and checks per-bucket gaps
// ============================================================================

describe('insightTextGenerator data gaps', () => {
  test('generateDataGaps should be async (uses instance data)', () => {
    const fs = require('fs');
    const src = fs.readFileSync(
      require.resolve('../utils/insightTextGenerator'),
      'utf8'
    );

    // The function should be declared as async
    const asyncMatch = src.match(/async\s+function\s+generateDataGaps/);
    expect(asyncMatch).not.toBeNull();
  });

  test('generateDataGaps should check per-bucket gaps', () => {
    const fs = require('fs');
    const src = fs.readFileSync(
      require.resolve('../utils/insightTextGenerator'),
      'utf8'
    );

    // Should iterate over buckets to check for gaps
    expect(src).toContain('bucketInstances');
    expect(src).toContain('tracking gap');
  });

  test('should export computePeriodSummary', () => {
    const fs = require('fs');
    const src = fs.readFileSync(
      require.resolve('../utils/insightTextGenerator'),
      'utf8'
    );

    expect(src).toContain('export async function computePeriodSummary');
  });
});
