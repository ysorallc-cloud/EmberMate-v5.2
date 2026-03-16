import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const TABS = path.join(ROOT, 'app/(tabs)');

describe('Step 3A: Home tab', () => {
  test('home.tsx exists', () => {
    expect(fs.existsSync(path.join(TABS, 'home.tsx'))).toBe(true);
  });

  test('home.tsx is under 900 lines', () => {
    const content = fs.readFileSync(path.join(TABS, 'home.tsx'), 'utf8');
    const lines = content.split('\n').length;
    expect(lines).toBeLessThan(900);
  });

  test('home.tsx does not import TimelineSection', () => {
    const content = fs.readFileSync(path.join(TABS, 'home.tsx'), 'utf8');
    expect(content).not.toContain('TimelineSection');
  });

  test('home.tsx does not import WhatsHappenedSection', () => {
    const content = fs.readFileSync(path.join(TABS, 'home.tsx'), 'utf8');
    expect(content).not.toContain('WhatsHappenedSection');
  });

  test('home.tsx has ProgressRings', () => {
    const content = fs.readFileSync(path.join(TABS, 'home.tsx'), 'utf8');
    expect(content).toContain('ProgressRings');
  });

  test('home.tsx has NextActionCard', () => {
    const content = fs.readFileSync(path.join(TABS, 'home.tsx'), 'utf8');
    expect(content).toContain('NextActionCard');
  });

  test('home.tsx has settings navigation', () => {
    const content = fs.readFileSync(path.join(TABS, 'home.tsx'), 'utf8');
    expect(content).toContain('/settings');
  });
});
