// File: utils/__tests__/footerFabOverlap.test.ts
// PURPOSE: Verify footer section has sufficient padding to clear the FAB zone.
// Updated for v2 flat layout: footer is now a flat zone (no card wrapper).

import { readFileSync } from 'fs';
import { join } from 'path';

describe('Footer / FAB overlap fix', () => {
  const content = readFileSync(
    join(__dirname, '../../app/(tabs)/today.tsx'), 'utf8'
  );

  test('footerSection has paddingTop >= 16 for FAB clearance', () => {
    const match = content.match(/footerSection:\s*\{([^}]+)\}/);
    expect(match).toBeTruthy();
    const style = match![1];
    const paddingMatch = style.match(/paddingTop:\s*(\d+)/);
    expect(paddingMatch).toBeTruthy();
    expect(parseInt(paddingMatch![1])).toBeGreaterThanOrEqual(16);
  });
});
