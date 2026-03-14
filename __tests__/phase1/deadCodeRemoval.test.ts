import * as fs from 'fs';
import * as path from 'path';

describe('Step 1A: Dead code removal', () => {
  const utilsDir = path.resolve(__dirname, '../../utils');

  const deadFiles = [
    'patientScopedStorage.ts',
    'careJourneyStorage.ts',
    'smartDefaultsEngine.ts',
    'userPatternStorage.ts',
  ];

  test.each(deadFiles)('%s has been removed', (file) => {
    expect(fs.existsSync(path.join(utilsDir, file))).toBe(false);
  });

  test('no remaining imports reference deleted files', () => {
    const { execSync } = require('child_process');
    for (const file of deadFiles) {
      const base = file.replace('.ts', '');
      const result = execSync(
        `grep -rn "${base}" --include='*.ts' --include='*.tsx' . || true`,
        { cwd: path.resolve(__dirname, '../..'), encoding: 'utf8' }
      );
      const lines = result.split('\n').filter((l: string) =>
        l.trim() && !l.includes('__tests__/phase1') && !l.includes('node_modules')
      );
      expect(lines).toEqual([]);
    }
  });
});
