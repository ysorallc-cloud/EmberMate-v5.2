// File: utils/__tests__/footerFabOverlap.test.ts
// PURPOSE: Verify encouragement text has sufficient top margin for FAB clearance.

import { readFileSync } from 'fs';
import { join } from 'path';

describe('Footer / FAB overlap fix', () => {
  const content = readFileSync(
    join(__dirname, '../../app/(tabs)/today.tsx'), 'utf8'
  );

  test('encouragementText has marginTop >= 16 for FAB clearance', () => {
    const match = content.match(/encouragementText:\s*\{([^}]+)\}/);
    expect(match).toBeTruthy();
    const style = match![1];
    const marginMatch = style.match(/marginTop:\s*(\d+)/);
    expect(marginMatch).toBeTruthy();
    expect(parseInt(marginMatch![1])).toBeGreaterThanOrEqual(16);
  });
});
