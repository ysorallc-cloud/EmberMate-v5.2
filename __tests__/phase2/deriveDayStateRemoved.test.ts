import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const ROOT = path.resolve(__dirname, '../..');

describe('Step 2E: deriveDayState removed', () => {
  test('deriveDayState.ts is deleted', () => {
    expect(
      fs.existsSync(path.join(ROOT, 'utils/deriveDayState.ts'))
    ).toBe(false);
  });

  test('no imports reference deriveDayState', () => {
    const r = execSync(
      `grep -rn "import.*deriveDayState\\|from.*deriveDayState" --include='*.ts' --include='*.tsx' app/ components/ hooks/ utils/ services/ || true`,
      { cwd: ROOT, encoding: 'utf8' }
    );
    const hits = r.split('\n').filter((l: string) =>
      l.trim() && !l.includes('__tests__')
    );
    expect(hits).toEqual([]);
  });

  test('useCarePlan.ts exists and does not import deriveDayState', () => {
    const hook = fs.readFileSync(
      path.join(ROOT, 'hooks/useCarePlan.ts'), 'utf8'
    );
    expect(hook).not.toContain("from '../utils/deriveDayState'");
  });
});
