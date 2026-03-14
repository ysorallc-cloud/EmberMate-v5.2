import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const ROOT = path.resolve(__dirname, '../..');

describe('Step 2A: Orphan screens removed', () => {
  const deleted = [
    'app/today-scope.tsx',
    'app/care-plan/manage.tsx',
    'app/family-activity.tsx',
    'app/sample-data-transition.tsx',
  ];

  test.each(deleted)('%s is deleted', (file) => {
    expect(fs.existsSync(path.join(ROOT, file))).toBe(false);
  });

  test('no Stack.Screen for today-scope in _layout', () => {
    const layout = fs.readFileSync(
      path.join(ROOT, 'app/_layout.tsx'), 'utf8'
    );
    expect(layout).not.toContain('"today-scope"');
  });

  test('no Stack.Screen for manage in care-plan layout', () => {
    const layout = fs.readFileSync(
      path.join(ROOT, 'app/care-plan/_layout.tsx'), 'utf8'
    );
    expect(layout).not.toContain('"manage"');
  });

  test('no navigation to deleted screens', () => {
    const routes = ['/today-scope', '/family-activity', '/sample-data-transition'];
    for (const route of routes) {
      const r = execSync(
        `grep -rn "'${route}'\\|\"${route}\"" --include='*.ts' --include='*.tsx' app/ components/ || true`,
        { cwd: ROOT, encoding: 'utf8' }
      );
      const hits = r.split('\n').filter((l: string) => l.trim() && !l.includes('__tests__'));
      expect(hits).toEqual([]);
    }
  });
});
