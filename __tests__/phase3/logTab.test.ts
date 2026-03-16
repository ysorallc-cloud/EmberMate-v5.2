import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const TABS = path.join(ROOT, 'app/(tabs)');

describe('Step 3B: Log tab', () => {
  test('app/(tabs)/log.tsx exists', () => {
    expect(fs.existsSync(path.join(TABS, 'log.tsx'))).toBe(true);
  });

  test('app/quick-log.tsx still exists as redirect', () => {
    const content = fs.readFileSync(
      path.join(ROOT, 'app/quick-log.tsx'), 'utf8'
    );
    expect(content).toContain('Redirect');
    expect(content.split('\n').length).toBeLessThan(20);
  });

  test('log.tsx does not call router.back()', () => {
    const content = fs.readFileSync(
      path.join(TABS, 'log.tsx'), 'utf8'
    );
    expect(content).not.toContain('router.back()');
  });

  test('log.tsx has ScreenHeader', () => {
    const content = fs.readFileSync(
      path.join(TABS, 'log.tsx'), 'utf8'
    );
    expect(content).toContain('ScreenHeader');
  });

  test('log.tsx imports use ../../ paths', () => {
    const content = fs.readFileSync(
      path.join(TABS, 'log.tsx'), 'utf8'
    );
    // Should NOT have '../utils' (wrong depth for tabs)
    const badImports = content.match(
      /from\s+['"]\.\.\/(utils|hooks|components|storage|lib|types)\//g
    );
    expect(badImports).toBeNull();
  });
});
