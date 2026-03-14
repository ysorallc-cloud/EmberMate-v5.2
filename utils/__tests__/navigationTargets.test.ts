/**
 * Navigation Target Validation
 * Ensures all hardcoded navigation targets reference actual route files.
 * Prevents crashes from stale route references.
 */
import * as fs from 'fs';
import * as path from 'path';

// Collect all route files from app/ directory
function getRouteFiles(dir: string, prefix = ''): string[] {
  const routes: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.name.startsWith('_') || entry.name.startsWith('.')) continue;
    if (entry.isDirectory()) {
      const subPrefix = prefix + '/' + entry.name;
      routes.push(subPrefix);
      routes.push(...getRouteFiles(fullPath, subPrefix));
    } else if (entry.name.endsWith('.tsx')) {
      const routeName = entry.name.replace('.tsx', '');
      if (routeName === 'index') {
        routes.push(prefix || '/');
      } else {
        routes.push(prefix + '/' + routeName);
      }
    }
  }
  return routes;
}

describe('Navigation targets reference real routes', () => {
  const appDir = path.resolve(__dirname, '../../app');
  const routeFiles = getRouteFiles(appDir);

  // Normalize: strip query params and dynamic segments for matching
  function routeExists(target: string): boolean {
    const base = target.split('?')[0].replace(/\$\{[^}]+\}/g, 'DYNAMIC');
    return routeFiles.some(r => r === base || base.startsWith(r + '/'));
  }

  test('/appointment-form exists (was /add-appointment)', () => {
    expect(routeExists('/appointment-form')).toBe(true);
    expect(routeExists('/add-appointment')).toBe(false);
  });

  test('/medication-confirm exists (was /log-medication-confirm)', () => {
    expect(routeExists('/medication-confirm')).toBe(true);
    expect(routeExists('/log-medication-confirm')).toBe(false);
  });

  test('/quick-log exists (absorbed log-water, log-hydration)', () => {
    expect(routeExists('/quick-log')).toBe(true);
  });

  test('quickLogOptions screens all resolve to real routes', () => {
    const optionsFile = fs.readFileSync(
      path.resolve(__dirname, '../../constants/quickLogOptions.ts'),
      'utf-8'
    );
    const screenMatches = optionsFile.matchAll(/screen:\s*'([^']+)'/g);
    for (const match of screenMatches) {
      const target = match[1];
      expect({ target, exists: routeExists(target) }).toEqual({
        target,
        exists: true,
      });
    }
  });
});
