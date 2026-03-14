import * as fs from 'fs';
import * as path from 'path';

describe('Step 1B: Dual model resolved', () => {
  const root = path.resolve(__dirname, '../..');

  test('types/dayState.ts has been deleted', () => {
    expect(fs.existsSync(path.join(root, 'types/dayState.ts'))).toBe(false);
  });

  test('types/derived.ts exists', () => {
    expect(fs.existsSync(path.join(root, 'types/derived.ts'))).toBe(true);
  });

  test('no file imports from types/dayState', () => {
    const { execSync } = require('child_process');
    const result = execSync(
      `grep -rn "from.*types/dayState\\|from.*dayState" --include='*.ts' --include='*.tsx' . || true`,
      { cwd: root, encoding: 'utf8' }
    );
    const lines = result.split('\n').filter((l: string) =>
      l.trim() && !l.includes('__tests__/phase1') && !l.includes('node_modules')
    );
    expect(lines).toEqual([]);
  });

  test('CarePlanItemType is only defined in types/carePlan.ts', () => {
    const { execSync } = require('child_process');
    const result = execSync(
      `grep -rn "export type CarePlanItemType" --include='*.ts' . || true`,
      { cwd: path.join(root, 'types'), encoding: 'utf8' }
    );
    const lines = result.split('\n').filter((l: string) => l.trim());
    expect(lines.length).toBe(1);
    expect(lines[0]).toContain('carePlan.ts');
  });

  test('derived.ts imports CarePlanItemType from carePlan', () => {
    const content = fs.readFileSync(
      path.join(root, 'types/derived.ts'), 'utf8'
    );
    expect(content).toContain("from './carePlan'");
  });
});
