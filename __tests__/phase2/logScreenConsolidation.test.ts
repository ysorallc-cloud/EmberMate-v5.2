// ============================================================================
// PHASE 2 STEP 2B VERIFICATION: Log Screen Consolidation
// 9 dedicated log screens absorbed into quick-log.tsx with expand param
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';

const projectRoot = path.resolve(__dirname, '../..');
const appDir = path.join(projectRoot, 'app');

function fileExists(relativePath: string): boolean {
  return fs.existsSync(path.join(projectRoot, relativePath));
}

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf-8');
}

describe('Step 2B: Log Screen Consolidation', () => {
  const deletedScreens = [
    'app/log-vitals.tsx',
    'app/log-mood.tsx',
    'app/log-sleep.tsx',
    'app/log-water.tsx',
    'app/log-activity.tsx',
    'app/log-note.tsx',
    'app/log-pain.tsx',
    'app/log-symptom.tsx',
    'app/log-bathroom.tsx',
  ];

  deletedScreens.forEach((screen) => {
    it(`${screen} is deleted`, () => {
      expect(fileExists(screen)).toBe(false);
    });
  });

  it('quick-log.tsx exists as the consolidated screen', () => {
    expect(fileExists('app/quick-log.tsx')).toBe(true);
  });

  it('quick-log.tsx reads expand param from URL', () => {
    const source = readSource('app/quick-log.tsx');
    expect(source).toContain('useLocalSearchParams');
    expect(source).toContain('expand');
  });

  const inlineCategories = ['vitals', 'wellness', 'sleep', 'symptom', 'bathroom', 'hydration', 'activity', 'pain'];
  inlineCategories.forEach((cat) => {
    it(`quick-log.tsx handles inline form for "${cat}"`, () => {
      const source = readSource('app/quick-log.tsx');
      expect(source).toContain(`case '${cat}'`);
    });
  });

  it('_layout.tsx has no Stack.Screen entries for deleted screens', () => {
    const layoutSource = readSource('app/_layout.tsx');
    deletedScreens.forEach((screen) => {
      const screenName = path.basename(screen, '.tsx');
      expect(layoutSource).not.toContain(`name="${screenName}"`);
    });
  });

  it('no production code imports from deleted screen files', () => {
    const prodFiles = [
      'utils/carePlanRouting.ts',
      'utils/careplan/taskAction.ts',
      'utils/nowHelpers.ts',
      'hooks/useRecentEntries.ts',
      'constants/quickLogOptions.ts',
      'utils/carePlanDefaults.ts',
      'lib/redirects.ts',
    ];

    prodFiles.forEach((file) => {
      if (!fileExists(file)) return;
      const source = readSource(file);
      // Should not contain old direct routes (except in comments)
      const lines = source.split('\n').filter((l: string) => !l.trim().startsWith('//'));
      const codeOnly = lines.join('\n');
      expect(codeOnly).not.toContain("'/log-vitals'");
      expect(codeOnly).not.toContain("'/log-mood'");
      expect(codeOnly).not.toContain("'/log-water'");
      expect(codeOnly).not.toContain("'/log-activity'");
      expect(codeOnly).not.toContain("'/log-note'");
    });
  });
});
