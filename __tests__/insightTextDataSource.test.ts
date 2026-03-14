// ============================================================================
// Phase 1 test: insightEngine uses instance-based data for care plan insights
// Note: after Phase 2 merge, insightEngine also contains understand-tab code
// that still uses medicationStorage for trend analysis.
// ============================================================================

describe('insightEngine data source', () => {
  test('should use both instance-based and legacy medication data sources', () => {
    const fs = require('fs');
    const src = fs.readFileSync(
      require.resolve('../utils/insightEngine'),
      'utf8'
    );

    // Instance-based data for care plan insights
    expect(src).toContain('listDailyInstancesRange');
    // Legacy medication data for understand-tab trend analysis
    expect(src).toContain('getMedicationLogs');
  });

  test('should import listDailyInstancesRange from carePlanRepo', () => {
    const fs = require('fs');
    const src = fs.readFileSync(
      require.resolve('../utils/insightEngine'),
      'utf8'
    );

    expect(src).toContain('listDailyInstancesRange');
    expect(src).toContain('carePlanRepo');
  });

  test('should reference daysBack in watch/improvement body text', () => {
    const fs = require('fs');
    const src = fs.readFileSync(
      require.resolve('../utils/insightEngine'),
      'utf8'
    );

    // The body text should use daysBack for dynamic period references
    expect(src).toContain('daysBack');
    // Should include template literal with daysBack for the body text
    const bodyMatches = src.match(/\$\{daysBack\}/g);
    expect(bodyMatches).not.toBeNull();
    expect(bodyMatches!.length).toBeGreaterThanOrEqual(2);
  });
});
