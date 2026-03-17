import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const TABS = path.join(ROOT, 'app/(tabs)');

describe('Step 3C: Timeline tab', () => {
  test('app/(tabs)/timeline.tsx exists', () => {
    expect(fs.existsSync(path.join(TABS, 'timeline.tsx'))).toBe(true);
  });

  test('timeline.tsx imports TimelineSection', () => {
    const content = fs.readFileSync(
      path.join(TABS, 'timeline.tsx'), 'utf8'
    );
    expect(content).toContain('TimelineSection');
  });

  test('timeline.tsx imports WhatsHappenedSection', () => {
    const content = fs.readFileSync(
      path.join(TABS, 'timeline.tsx'), 'utf8'
    );
    expect(content).toContain('WhatsHappenedSection');
  });

  test('timeline.tsx uses useCareTasks hook', () => {
    const content = fs.readFileSync(
      path.join(TABS, 'timeline.tsx'), 'utf8'
    );
    expect(content).toContain('useCareTasks');
  });

  test('timeline.tsx has buildCareBrief or journal brief', () => {
    const content = fs.readFileSync(
      path.join(TABS, 'timeline.tsx'), 'utf8'
    );
    // Either imports buildCareBrief or has a brief section
    expect(
      content.includes('buildCareBrief') ||
      content.includes('CareBrief') ||
      content.includes('careSummaryBuilder')
    ).toBe(true);
  });
});
