import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const ROOT = path.resolve(__dirname, '../..');

describe('Step 2C: Insight consolidation', () => {
  const deleted = [
    'utils/insightTextGenerator.ts',
    'utils/understandInsights.ts',
    'utils/insightRules.ts',
  ];

  test.each(deleted)('%s is deleted', (file) => {
    expect(fs.existsSync(path.join(ROOT, file))).toBe(false);
  });

  test('insightEngine.ts contains merged exports', () => {
    const content = fs.readFileSync(
      path.join(ROOT, 'utils/insightEngine.ts'), 'utf8'
    );
    // From insightTextGenerator
    expect(content).toContain('InsightResults');
    expect(content).toContain('PeriodSummary');
    expect(content).toContain('generateAllInsights');
    // From understandInsights
    expect(content).toContain('TimeRange');
    expect(content).toContain('StandOutInsight');
  });

  test('careInsights.ts contains merged exports', () => {
    const content = fs.readFileSync(
      path.join(ROOT, 'utils/careInsights.ts'), 'utf8'
    );
    // From insightRules
    expect(content).toContain('InsightRule');
    expect(content).toContain('generateInsights');
    expect(content).toContain('getPrimaryInsight');
  });

  test('no imports reference deleted files', () => {
    const mods = ['insightTextGenerator', 'understandInsights', 'insightRules'];
    for (const mod of mods) {
      const r = execSync(
        `grep -rn "import.*from.*${mod}" --include='*.ts' --include='*.tsx' app/ components/ hooks/ utils/ || true`,
        { cwd: ROOT, encoding: 'utf8' }
      );
      const hits = r.split('\n').filter((l: string) => l.trim() && !l.includes('__tests__'));
      expect(hits).toEqual([]);
    }
  });
});
