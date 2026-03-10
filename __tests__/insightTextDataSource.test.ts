// ============================================================================
// Phase 1 test: insightTextGenerator uses instance-based data
// Verifies no legacy medication imports remain
// ============================================================================

describe('insightTextGenerator data source', () => {
  test('should not import legacy getMedicationLogs or getMedications', () => {
    const fs = require('fs');
    const src = fs.readFileSync(
      require.resolve('../utils/insightTextGenerator'),
      'utf8'
    );

    expect(src).not.toContain('getMedicationLogs');
    expect(src).not.toContain("from './medicationStorage'");
    expect(src).not.toContain("from '../utils/medicationStorage'");
  });

  test('should import listDailyInstancesRange from carePlanRepo', () => {
    const fs = require('fs');
    const src = fs.readFileSync(
      require.resolve('../utils/insightTextGenerator'),
      'utf8'
    );

    expect(src).toContain('listDailyInstancesRange');
    expect(src).toContain('carePlanRepo');
  });

  test('should reference daysBack in watch/improvement body text', () => {
    const fs = require('fs');
    const src = fs.readFileSync(
      require.resolve('../utils/insightTextGenerator'),
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
