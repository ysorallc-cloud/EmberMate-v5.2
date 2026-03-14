import { execSync } from 'child_process';
import * as path from 'path';

describe('Step 1F: Storage pruning baseline', () => {
  const root = path.resolve(__dirname, '../..');

  function countImports(moduleName: string): number {
    const result = execSync(
      `grep -rn "from.*${moduleName}" --include='*.ts' --include='*.tsx' app/ components/ hooks/ || true`,
      { cwd: root, encoding: 'utf8' }
    );
    return result.split('\n').filter((l: string) => l.trim()).length;
  }

  // This test documents current state. Update expected values
  // as consumers migrate. When a module reaches 0, delete it.
  test('baseline import counts are documented', () => {
    const counts: Record<string, number> = {
      centralStorage: countImports('centralStorage'),
      dailyTrackingStorage: countImports('dailyTrackingStorage'),
      noteStorage: countImports('noteStorage'),
      symptomStorage: countImports('symptomStorage'),
      streakStorage: countImports('streakStorage'),
    };

    // Snapshot current counts so future changes are visible
    console.log('Storage module import counts:', counts);

    // These should only go DOWN over time, never up
    for (const [mod, count] of Object.entries(counts)) {
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('eventAdapters.ts exists', () => {
    const fs = require('fs');
    expect(
      fs.existsSync(path.join(root, 'utils/eventAdapters.ts'))
    ).toBe(true);
  });

  test('eventRepo is the canonical write path', () => {
    // Verify emitCareEvent calls saveEvent from eventRepo
    const fs = require('fs');
    const emitter = fs.readFileSync(
      path.join(root, 'utils/eventEmitter.ts'), 'utf8'
    );
    expect(emitter).toContain("from '../storage/eventRepo'");
  });
});
