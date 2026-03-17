import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const ROOT = path.resolve(__dirname, '../..');
const TABS = path.join(ROOT, 'app/(tabs)');

describe('Step 3E: Tab layout and cleanup', () => {
  test('4 tab files exist', () => {
    expect(fs.existsSync(path.join(TABS, 'home.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(TABS, 'log.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(TABS, 'timeline.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(TABS, 'plan.tsx'))).toBe(true);
  });

  test('old tab files are gone', () => {
    expect(fs.existsSync(path.join(TABS, 'today.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(TABS, 'journal.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(TABS, 'understand.tsx'))).toBe(false);
  });

  test('_layout.tsx registers 4 tabs', () => {
    const layout = fs.readFileSync(
      path.join(TABS, '_layout.tsx'), 'utf8'
    );
    expect(layout).toContain('name="home"');
    expect(layout).toContain('name="log"');
    expect(layout).toContain('name="timeline"');
    expect(layout).toContain('name="plan"');
    expect(layout).not.toContain('name="today"');
    expect(layout).not.toContain('name="journal"');
    expect(layout).not.toContain('name="understand"');
  });

  test('insights.tsx exists as stack screen', () => {
    expect(
      fs.existsSync(path.join(ROOT, 'app/insights.tsx'))
    ).toBe(true);
  });

  test('no navigation to old tab names in production code', () => {
    const oldRoutes = ['/(tabs)/today', '/(tabs)/journal', '/(tabs)/understand'];
    for (const route of oldRoutes) {
      const r = execSync(
        `grep -rn "'${route}'" --include='*.ts' --include='*.tsx' app/ components/ utils/ hooks/ lib/ || true`,
        { cwd: ROOT, encoding: 'utf8' }
      );
      const hits = r.split('\n').filter(l =>
        l.trim() && !l.includes('__tests__') && !l.includes('redirects.ts')
      );
      if (hits.length > 0) console.log('Dangling route ' + route + ':', hits);
      expect(hits).toEqual([]);
    }
  });

  test('redirects.ts maps old tab routes', () => {
    const content = fs.readFileSync(
      path.join(ROOT, 'lib/redirects.ts'), 'utf8'
    );
    expect(content).toContain('today');
    expect(content).toContain('journal');
  });

  test('root _layout has no Stack.Screen for deleted files', () => {
    const layout = fs.readFileSync(
      path.join(ROOT, 'app/_layout.tsx'), 'utf8'
    );
    expect(layout).not.toContain('"family-activity"');
  });
});
