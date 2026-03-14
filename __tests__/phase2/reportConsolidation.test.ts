import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const ROOT = path.resolve(__dirname, '../..');

describe('Step 2D: Report builder consolidation', () => {
  const deleted = ['utils/reportGenerator.ts', 'utils/reportBuilders.ts'];

  test.each(deleted)('%s is deleted', (file) => {
    expect(fs.existsSync(path.join(ROOT, file))).toBe(false);
  });

  test('careSummaryBuilder has merged exports', () => {
    const content = fs.readFileSync(
      path.join(ROOT, 'utils/careSummaryBuilder.ts'), 'utf8'
    );
    expect(content).toContain('ComprehensiveReport');
    expect(content).toContain('generateComprehensiveReport');
    expect(content).toContain('buildDailySummaryReport');
    expect(content).toContain('buildClinicalReportData');
  });

  test('no imports reference deleted files', () => {
    for (const mod of ['reportGenerator', 'reportBuilders']) {
      const r = execSync(
        `grep -rn "import.*from.*${mod}" --include='*.ts' --include='*.tsx' app/ components/ hooks/ || true`,
        { cwd: ROOT, encoding: 'utf8' }
      );
      const hits = r.split('\n').filter((l: string) => l.trim() && !l.includes('__tests__'));
      expect(hits).toEqual([]);
    }
  });
});
