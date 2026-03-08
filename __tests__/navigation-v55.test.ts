import * as fs from 'fs';
import * as path from 'path';

describe('V5.5 Navigation', () => {
  const tabsDir = path.resolve(__dirname, '../app/(tabs)');

  test('today.tsx exists in tabs directory', () => {
    expect(fs.existsSync(path.join(tabsDir, 'today.tsx'))).toBe(true);
  });

  test('now.tsx does NOT exist in tabs directory', () => {
    expect(fs.existsSync(path.join(tabsDir, 'now.tsx'))).toBe(false);
  });

  test('tab layout references today not now', () => {
    const layout = fs.readFileSync(path.join(tabsDir, '_layout.tsx'), 'utf-8');
    expect(layout).toContain('name="today"');
    expect(layout).not.toContain('name="now"');
    expect(layout).toContain("title: 'Today'");
  });

  test('no navigation references to /(tabs)/now remain in source', () => {
    const { execSync } = require('child_process');
    const result = execSync(
      `grep -rn "/(tabs)/now" app/ components/ hooks/ lib/ services/ --include="*.ts" --include="*.tsx" || true`,
      { encoding: 'utf-8', cwd: path.resolve(__dirname, '..') }
    );
    // Exclude test files from this check (known-failing tests still reference old path)
    const sourceLines = result.trim().split('\n').filter(
      (l: string) => l && !l.includes('__tests__')
    );
    expect(sourceLines.join('\n')).toBe('');
  });

  test('onboarding navigates to /(tabs)/today', () => {
    const onboarding = fs.readFileSync(
      path.resolve(__dirname, '../app/(onboarding)/index.tsx'), 'utf-8'
    );
    expect(onboarding).toContain('/(tabs)/today');
    expect(onboarding).not.toContain('/(tabs)/now');
  });

  test('Visit Prep is NOT in understand tab', () => {
    const understand = fs.readFileSync(path.join(tabsDir, 'understand.tsx'), 'utf-8');
    expect(understand).not.toContain('provider-prep');
  });

  test('Visit Prep IS in journal tab', () => {
    const journal = fs.readFileSync(path.join(tabsDir, 'journal.tsx'), 'utf-8');
    expect(journal).toContain('provider-prep');
  });
});
