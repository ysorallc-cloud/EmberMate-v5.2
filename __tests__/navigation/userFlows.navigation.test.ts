/**
 * Navigation User Flow Tests
 *
 * Static analysis tests that verify navigation routes referenced in source code
 * actually exist as screens. Uses fs.readFileSync to read source files and check
 * that destination routes have corresponding screen files.
 */

import * as fs from 'fs';
import * as path from 'path';

const APP_DIR = path.resolve(__dirname, '../../app');

function fileExists(relativePath: string): boolean {
  // Check for .tsx and .ts variants, and also directory/index patterns
  const candidates = [
    path.join(APP_DIR, `${relativePath}.tsx`),
    path.join(APP_DIR, `${relativePath}.ts`),
    path.join(APP_DIR, relativePath, 'index.tsx'),
    path.join(APP_DIR, relativePath, 'index.ts'),
  ];
  return candidates.some(c => fs.existsSync(c));
}

function readSourceFile(relativePath: string): string {
  const fullPath = path.resolve(__dirname, '../../', relativePath);
  return fs.readFileSync(fullPath, 'utf-8');
}

describe('Navigation User Flows', () => {
  test('Journal tab links to valid routes', () => {
    const source = readSourceFile('app/(tabs)/journal.tsx');

    if (source.includes("'/calendar'")) {
      expect(fileExists('calendar')).toBe(true);
    }
  });

  test('Now tab links to valid routes', () => {
    const source = readSourceFile('app/(tabs)/today.tsx');

    if (source.includes("'/log-water'")) {
      expect(fileExists('log-water')).toBe(true);
    }
    if (source.includes("'/care-plan'")) {
      expect(fileExists('care-plan')).toBe(true);
    }
    if (source.includes("'/today-scope'")) {
      expect(fileExists('today-scope')).toBe(true);
    }
  });

  test('Understand tab links to valid routes', () => {
    const source = readSourceFile('app/(tabs)/understand.tsx');

    if (source.includes("'/trends'")) {
      expect(fileExists('trends')).toBe(true);
    }
    if (source.includes("'/settings'")) {
      expect(fileExists('settings')).toBe(true);
    }
  });

  test('deprecated routes are consolidated in redirects map', () => {
    const redirects = readSourceFile('lib/redirects.ts');
    expect(redirects).toContain('care-brief');
    expect(redirects).toContain('care-summary-export');
    expect(redirects).toContain('medication-report');
    expect(redirects).toContain('daily-care-report');
  });
});
