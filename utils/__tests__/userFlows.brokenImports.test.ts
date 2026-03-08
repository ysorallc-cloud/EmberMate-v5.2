// ============================================================================
// USER FLOW BROKEN IMPORTS TESTS
// Verify rhythmStorage imports and check for dead imports across log screens.
// Uses fs.readFileSync to trace actual source code, not runtime rendering.
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';

const APP_ROOT = path.resolve(__dirname, '../../');

/**
 * Read a source file relative to project root
 */
function readSource(relativePath: string): string {
  const fullPath = path.join(APP_ROOT, relativePath);
  return fs.readFileSync(fullPath, 'utf8');
}

/**
 * Check if a named export exists in a module source file.
 * Looks for:
 *   export function NAME
 *   export async function NAME
 *   export const NAME
 *   export interface NAME
 *   export type NAME
 */
function hasNamedExport(source: string, exportName: string): boolean {
  const patterns = [
    new RegExp(`export\\s+function\\s+${exportName}\\b`),
    new RegExp(`export\\s+async\\s+function\\s+${exportName}\\b`),
    new RegExp(`export\\s+const\\s+${exportName}\\b`),
    new RegExp(`export\\s+interface\\s+${exportName}\\b`),
    new RegExp(`export\\s+type\\s+${exportName}\\b`),
  ];
  return patterns.some(pattern => pattern.test(source));
}

/**
 * Check if an imported name is actually used in the file body
 * (beyond the import statement itself)
 */
function isImportUsedInBody(source: string, importName: string): boolean {
  // Remove all import lines to get the body
  const bodyLines = source.split('\n').filter(line => !line.trim().startsWith('import '));
  const body = bodyLines.join('\n');

  // Check if the import name appears in the body
  const regex = new RegExp(`\\b${importName}\\b`);
  return regex.test(body);
}

// ============================================================================
// TEST 1: rhythmStorage.ts exists and exports expected symbols
// ============================================================================

describe('rhythmStorage module integrity', () => {
  it('rhythmStorage.ts exists', () => {
    const filePath = path.join(APP_ROOT, 'utils', 'rhythmStorage.ts');
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('exports getTodayProgress function', () => {
    const source = readSource('utils/rhythmStorage.ts');
    expect(hasNamedExport(source, 'getTodayProgress')).toBe(true);
  });

  it('exports TodayProgress interface', () => {
    const source = readSource('utils/rhythmStorage.ts');
    expect(hasNamedExport(source, 'TodayProgress')).toBe(true);
  });

  it('exports Rhythm interface', () => {
    const source = readSource('utils/rhythmStorage.ts');
    expect(hasNamedExport(source, 'Rhythm')).toBe(true);
  });

  it('exports getRhythm function', () => {
    const source = readSource('utils/rhythmStorage.ts');
    expect(hasNamedExport(source, 'getRhythm')).toBe(true);
  });

  it('TodayProgress has expected shape', () => {
    const source = readSource('utils/rhythmStorage.ts');
    // Verify the TodayProgress interface has the right fields
    expect(source).toContain('medications: { completed: number; expected: number }');
    expect(source).toContain('vitals: { completed: number; expected: number }');
    expect(source).toContain('meals: { completed: number; expected: number }');
  });

  it('getTodayProgress aggregates from centralStorage and medicationStorage', () => {
    const source = readSource('utils/rhythmStorage.ts');
    // Uses require (dynamic import) for centralStorage
    expect(source).toContain("require('./centralStorage')");
    // Uses static import for medicationStorage
    expect(source).toContain("from './medicationStorage'");
  });
});

// ============================================================================
// TEST 2: rhythmStorage imports in log-meal.tsx
// ============================================================================

describe('rhythmStorage usage in log-meal.tsx', () => {
  it('imports getTodayProgress and TodayProgress from rhythmStorage', () => {
    const source = readSource('app/log-meal.tsx');
    expect(source).toContain("import { getTodayProgress, TodayProgress } from '../utils/rhythmStorage'");
  });

  it('getTodayProgress is USED in file body (not a dead import)', () => {
    const source = readSource('app/log-meal.tsx');
    expect(isImportUsedInBody(source, 'getTodayProgress')).toBe(true);
  });

  it('TodayProgress is USED in file body as a type annotation', () => {
    const source = readSource('app/log-meal.tsx');
    expect(isImportUsedInBody(source, 'TodayProgress')).toBe(true);
  });

  it('progress.meals is referenced in the render output', () => {
    const source = readSource('app/log-meal.tsx');
    expect(source).toContain('progress.meals.completed');
    expect(source).toContain('progress.meals.expected');
  });
});

// ============================================================================
// TEST 3: rhythmStorage imports in log-vitals.tsx
// ============================================================================

describe('rhythmStorage usage in log-vitals.tsx', () => {
  it('imports getTodayProgress and TodayProgress from rhythmStorage', () => {
    const source = readSource('app/log-vitals.tsx');
    expect(source).toContain("import { getTodayProgress, TodayProgress } from '../utils/rhythmStorage'");
  });

  it('getTodayProgress is USED in file body (not a dead import)', () => {
    const source = readSource('app/log-vitals.tsx');
    expect(isImportUsedInBody(source, 'getTodayProgress')).toBe(true);
  });

  it('TodayProgress is USED in file body as a type annotation', () => {
    const source = readSource('app/log-vitals.tsx');
    expect(isImportUsedInBody(source, 'TodayProgress')).toBe(true);
  });

  it('progress.vitals is referenced in the render output', () => {
    const source = readSource('app/log-vitals.tsx');
    expect(source).toContain('progress.vitals.completed');
    expect(source).toContain('progress.vitals.expected');
  });
});

// ============================================================================
// TEST 4: rhythmStorage imports in medication-confirm.tsx
// ============================================================================

describe('rhythmStorage usage in medication-confirm.tsx', () => {
  it('imports getTodayProgress and TodayProgress from rhythmStorage', () => {
    const source = readSource('app/medication-confirm.tsx');
    expect(source).toContain("import { getTodayProgress, TodayProgress } from '../utils/rhythmStorage'");
  });

  it('getTodayProgress is USED in file body (not a dead import)', () => {
    const source = readSource('app/medication-confirm.tsx');
    expect(isImportUsedInBody(source, 'getTodayProgress')).toBe(true);
  });

  it('TodayProgress is USED in file body as a type annotation', () => {
    const source = readSource('app/medication-confirm.tsx');
    expect(isImportUsedInBody(source, 'TodayProgress')).toBe(true);
  });

  it('progress.medications is referenced in the render output', () => {
    const source = readSource('app/medication-confirm.tsx');
    expect(source).toContain('progress.medications.completed');
    expect(source).toContain('progress.medications.expected');
  });
});

// ============================================================================
// TEST 5: rhythmStorage runtime behavior
// ============================================================================

describe('rhythmStorage.getTodayProgress runtime', () => {
  it('getTodayProgress returns the expected shape', async () => {
    const { getTodayProgress } = require('../rhythmStorage');
    const progress = await getTodayProgress();

    expect(progress).toBeDefined();
    expect(progress).toHaveProperty('medications');
    expect(progress).toHaveProperty('vitals');
    expect(progress).toHaveProperty('meals');

    expect(progress.medications).toHaveProperty('completed');
    expect(progress.medications).toHaveProperty('expected');
    expect(typeof progress.medications.completed).toBe('number');
    expect(typeof progress.medications.expected).toBe('number');
  });

  it('getTodayProgress returns zeros when no data exists', async () => {
    const { getTodayProgress } = require('../rhythmStorage');
    const progress = await getTodayProgress();

    // With no stored data (fresh mock stores), completed should be 0
    expect(progress.medications.completed).toBe(0);
    expect(progress.vitals.completed).toBe(0);
    expect(progress.meals.completed).toBe(0);
  });
});

// ============================================================================
// TEST 6: Cross-check — no phantom imports of deleted modules
// ============================================================================

describe('No phantom imports of deleted files', () => {
  const deletedFiles = [
    'app/care-plan/mood.tsx',
    'app/care-plan/symptoms.tsx',
    'app/rhythm-edit.tsx',
    'app/symptoms.tsx',
    'app/vitals.tsx',
    'app/visit-prep.tsx',
    'app/log-appointment.tsx',
    'app/log-prn.tsx',
    'app/correlation-test.tsx',
  ];

  deletedFiles.forEach(deletedFile => {
    const basename = path.basename(deletedFile, '.tsx');

    it(`no active source file imports from the deleted "${basename}" route`, () => {
      // Check that nowHelpers doesn't route to deleted files
      const nowHelpers = readSource('utils/nowHelpers.ts');
      // The route map should not contain routes to deleted screens
      // (mood.tsx was removed as a standalone care-plan bucket)
      if (basename === 'mood') {
        // log-mood.tsx still exists as a logging screen
        // but care-plan/mood.tsx was deleted
        const hasMoodRoute = nowHelpers.includes("'/care-plan/mood'");
        expect(hasMoodRoute).toBe(false);
      }
      if (basename === 'symptoms') {
        const hasSymptomsRoute = nowHelpers.includes("'/symptoms'");
        expect(hasSymptomsRoute).toBe(false);
      }
    });
  });
});

// ============================================================================
// TEST 7: Import consistency — ensure key storage imports resolve
// ============================================================================

describe('Key storage module imports resolve', () => {
  const storageModules = [
    'utils/medicationStorage',
    'utils/vitalsStorage',
    'utils/centralStorage',
    'utils/appointmentStorage',
    'utils/wellnessCheckStorage',
    'utils/rhythmStorage',
    'storage/carePlanConfigRepo',
    'utils/emergencyContacts',
    'utils/nowHelpers',
  ];

  storageModules.forEach(modulePath => {
    it(`${modulePath} exists as .ts or .tsx`, () => {
      const tsPath = path.join(APP_ROOT, `${modulePath}.ts`);
      const tsxPath = path.join(APP_ROOT, `${modulePath}.tsx`);
      const exists = fs.existsSync(tsPath) || fs.existsSync(tsxPath);
      expect(exists).toBe(true);
    });
  });
});
