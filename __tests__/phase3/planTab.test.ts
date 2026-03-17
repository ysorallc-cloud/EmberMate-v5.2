import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const TABS = path.join(ROOT, 'app/(tabs)');

describe('Step 3D: Plan tab', () => {
  test('app/(tabs)/plan.tsx exists', () => {
    expect(fs.existsSync(path.join(TABS, 'plan.tsx'))).toBe(true);
  });

  test('plan.tsx is under 400 lines', () => {
    const content = fs.readFileSync(
      path.join(TABS, 'plan.tsx'), 'utf8'
    );
    expect(content.split('\n').length).toBeLessThan(400);
  });

  test('plan.tsx navigates to care-plan subscreens', () => {
    const content = fs.readFileSync(
      path.join(TABS, 'plan.tsx'), 'utf8'
    );
    expect(content).toContain('/care-plan');
  });

  test('plan.tsx has settings navigation', () => {
    const content = fs.readFileSync(
      path.join(TABS, 'plan.tsx'), 'utf8'
    );
    expect(
      content.includes('/settings') ||
      content.includes('/patient') ||
      content.includes('/notification-settings')
    ).toBe(true);
  });

  test('plan.tsx uses useCarePlanConfig', () => {
    const content = fs.readFileSync(
      path.join(TABS, 'plan.tsx'), 'utf8'
    );
    expect(content).toContain('useCarePlanConfig');
  });
});
