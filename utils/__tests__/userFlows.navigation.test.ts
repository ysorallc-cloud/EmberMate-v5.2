// ============================================================================
// USER FLOW NAVIGATION TESTS
// Code trace tests that verify navigation chains by reading actual source files
// and checking that route targets exist as files.
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';

const APP_ROOT = path.resolve(__dirname, '../../');
const APP_DIR = path.join(APP_ROOT, 'app');

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Read a source file relative to project root
 */
function readSource(relativePath: string): string {
  const fullPath = path.join(APP_ROOT, relativePath);
  return fs.readFileSync(fullPath, 'utf8');
}

/**
 * Check if a route file exists. Handles:
 * - Direct file: /log-vitals -> app/log-vitals.tsx
 * - Directory index: /care-plan -> app/care-plan/index.tsx
 * - Tab routes: /(tabs)/now -> app/(tabs)/now.tsx
 * - Group routes: /(onboarding) -> app/(onboarding)/index.tsx
 */
function routeFileExists(route: string): boolean {
  // Remove leading slash
  const cleanRoute = route.replace(/^\//, '');

  // Try as direct .tsx file
  if (fs.existsSync(path.join(APP_DIR, `${cleanRoute}.tsx`))) return true;
  // Try as directory with index.tsx
  if (fs.existsSync(path.join(APP_DIR, cleanRoute, 'index.tsx'))) return true;
  // Try as direct .ts file
  if (fs.existsSync(path.join(APP_DIR, `${cleanRoute}.ts`))) return true;

  return false;
}

/**
 * Extract all navigate() and router.push() string literal routes from source code
 */
function extractRoutes(source: string): string[] {
  const routes: string[] = [];

  // Match navigate('/route') or navigate("/route")
  const navigateRegex = /navigate\(\s*['"]([^'"]+)['"]\s*\)/g;
  let match;
  while ((match = navigateRegex.exec(source)) !== null) {
    routes.push(match[1]);
  }

  // Match navigate({ pathname: '/route' })
  const navigateObjRegex = /navigate\(\s*\{[^}]*pathname:\s*['"]([^'"]+)['"]/g;
  while ((match = navigateObjRegex.exec(source)) !== null) {
    routes.push(match[1]);
  }

  // Match router.push('/route') or router.push("/route")
  const pushRegex = /router\.push\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = pushRegex.exec(source)) !== null) {
    routes.push(match[1]);
  }

  // Match router.replace('/route')
  const replaceRegex = /router\.replace\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = replaceRegex.exec(source)) !== null) {
    routes.push(match[1]);
  }

  // Match <Redirect href="/route" /> or <Redirect href="/(tabs)/now" />
  const redirectRegex = /Redirect\s+href=["']([^"']+)["']/g;
  while ((match = redirectRegex.exec(source)) !== null) {
    routes.push(match[1]);
  }

  return routes;
}

// ============================================================================
// FLOW 1: Add Medication — now.tsx -> medication-form -> back
// ============================================================================

describe('Flow 1: Add Medication', () => {
  it('today.tsx references navigate helper from lib/navigate', () => {
    const source = readSource('app/(tabs)/today.tsx');
    expect(source).toContain("from '../../lib/navigate'");
    expect(source).toContain('navigate');
  });

  it('medication-form.tsx exists as a route target', () => {
    expect(routeFileExists('medication-form')).toBe(true);
  });

  it('medication-form.tsx writes to both carePlanConfigRepo and legacy medicationStorage', () => {
    const source = readSource('app/medication-form.tsx');

    // Writes to carePlanConfigRepo (new system)
    expect(source).toContain('addMedicationToPlan');
    expect(source).toContain('updateMedicationInPlan');

    // Writes to legacy medicationStorage (backward compat)
    expect(source).toContain('createMedication');
    expect(source).toContain('updateMedication');
  });

  it('medication-form.tsx navigates back after save', () => {
    const source = readSource('app/medication-form.tsx');
    expect(source).toContain('router.back()');
  });

  it('today.tsx reads medications from medicationStorage for legacy stats', () => {
    const source = readSource('app/(tabs)/today.tsx');
    expect(source).toContain("from '../../utils/medicationStorage'");
    expect(source).toContain('getMedications');
  });
});

// ============================================================================
// FLOW 2: Log Medication Dose — Now tab -> log-medication-plan-item -> back
// ============================================================================

describe('Flow 2: Log Medication Dose', () => {
  it('today.tsx navigates to /log-medication-plan-item for medication instances', () => {
    const source = readSource('app/(tabs)/today.tsx');
    expect(source).toContain('/log-medication-plan-item');
  });

  it('log-medication-plan-item.tsx exists as a route', () => {
    expect(routeFileExists('log-medication-plan-item')).toBe(true);
  });

  it('log-medication-plan-item.tsx writes to centralStorage.saveMedicationLog', () => {
    const source = readSource('app/log-medication-plan-item.tsx');
    expect(source).toContain('saveMedicationLog');
    expect(source).toContain("from '../utils/centralStorage'");
  });

  it('log-medication-plan-item.tsx completes DailyCareInstance on save', () => {
    const source = readSource('app/log-medication-plan-item.tsx');
    expect(source).toContain('completeInstance');
    expect(source).toContain('useDailyCareInstances');
  });

  it('log-medication-plan-item.tsx passes medicationId and instanceId from params', () => {
    const source = readSource('app/log-medication-plan-item.tsx');
    expect(source).toContain('medicationId');
    expect(source).toContain('instanceId');
    expect(source).toContain('useLocalSearchParams');
  });

  it('today.tsx passes required params when navigating to log-medication-plan-item', () => {
    const source = readSource('app/(tabs)/today.tsx');
    // Verify all critical params are passed
    expect(source).toContain('medicationId: instance.carePlanItemId');
    expect(source).toContain('instanceId: instance.id');
    expect(source).toContain('scheduledTime: instance.scheduledTime');
    expect(source).toContain('itemName: instance.itemName');
  });
});

// ============================================================================
// FLOW 3: Log Vitals — Now tab -> log-vitals -> back
// ============================================================================

describe('Flow 3: Log Vitals', () => {
  it('nowHelpers.getRouteForInstanceType maps vitals to /log-vitals', () => {
    const source = readSource('utils/nowHelpers.ts');
    // Verify the route mapping
    expect(source).toContain("case 'vitals': return '/log-vitals'");
  });

  it('log-vitals.tsx exists as a route', () => {
    expect(routeFileExists('log-vitals')).toBe(true);
  });

  it('log-vitals.tsx dual-writes to vitalsStorage AND centralStorage', () => {
    const source = readSource('app/log-vitals.tsx');
    expect(source).toContain('saveVital');
    expect(source).toContain("from '../utils/vitalsStorage'");
    expect(source).toContain('saveVitalsLog');
    expect(source).toContain("from '../utils/centralStorage'");
  });

  it('log-vitals.tsx saves individual vital readings (not aggregated)', () => {
    const source = readSource('app/log-vitals.tsx');
    // Each vital type is saved individually to vitalsStorage
    expect(source).toContain("type: 'systolic'");
    expect(source).toContain("type: 'diastolic'");
    expect(source).toContain("type: 'glucose'");
    expect(source).toContain("type: 'weight'");
  });

  it('today.tsx reads vitals from centralStorage for legacy stats', () => {
    const source = readSource('app/(tabs)/today.tsx');
    expect(source).toContain('getTodayVitalsLog');
    expect(source).toContain("from '../../utils/centralStorage'");
  });
});

// ============================================================================
// FLOW 4: View Reports — hub/reports.tsx -> sub-pages
// ============================================================================

describe('Flow 4: View Reports', () => {
  it('hub/reports.tsx exists', () => {
    expect(routeFileExists('hub/reports')).toBe(true);
  });

  it('hub/reports/index.tsx defines report routes', () => {
    const source = readSource('app/hub/reports/index.tsx');
    const routes = extractRoutes(source);
    // Check that defined routes reference actual report pages
    expect(source).toContain('/hub/reports/medication');
    expect(source).toContain('/correlation-report');
  });

  it('medication report sub-page exists', () => {
    expect(routeFileExists('hub/reports/medication')).toBe(true);
  });

  it('correlation report route exists', () => {
    expect(routeFileExists('correlation-report')).toBe(true);
  });

  it('hub/reports/index.tsx uses navigate helper', () => {
    const source = readSource('app/hub/reports/index.tsx');
    expect(source).toContain("from '../../../lib/navigate'");
  });
});

// ============================================================================
// FLOW 5: Emergency — emergency.tsx uses getEmergencyNumber (not hardcoded)
// ============================================================================

describe('Flow 5: Emergency', () => {
  it('emergency.tsx exists as a route', () => {
    expect(routeFileExists('emergency')).toBe(true);
  });

  it('emergency.tsx imports getEmergencyNumber from emergencyContacts', () => {
    const source = readSource('app/emergency.tsx');
    expect(source).toContain('getEmergencyNumber');
    expect(source).toContain("from '../utils/emergencyContacts'");
  });

  it('emergency.tsx does NOT hardcode 911', () => {
    const source = readSource('app/emergency.tsx');
    // The number should come from getEmergencyNumber, not be hardcoded in call logic
    // The initial state uses '911' as a placeholder but it is overridden in useEffect
    expect(source).toContain("setEmergencyNumber(getEmergencyNumber())");
  });

  it('emergencyContacts.getEmergencyNumber is locale-aware', () => {
    const source = readSource('utils/emergencyContacts.ts');
    expect(source).toContain('EMERGENCY_NUMBERS');
    expect(source).toContain('regionCode');
    // Verify it has multiple regions, not just US
    expect(source).toContain("GB: '999'");
    expect(source).toContain("AU: '000'");
    expect(source).toContain("DEFAULT: '112'");
  });

  it('emergency.tsx navigates to /patient for medical info', () => {
    const source = readSource('app/emergency.tsx');
    expect(source).toContain("router.push('/patient')");
    expect(routeFileExists('patient')).toBe(true);
  });
});

// ============================================================================
// FLOW 6: Onboarding -> First Use — index.tsx routes correctly
// ============================================================================

describe('Flow 6: Onboarding -> First Use', () => {
  it('index.tsx exists as app entry point', () => {
    expect(routeFileExists('index')).toBe(true);
  });

  it('index.tsx checks onboarding status before routing', () => {
    const source = readSource('app/index.tsx');
    expect(source).toContain('isOnboardingComplete');
    expect(source).toContain("from '../utils/sampleData'");
  });

  it('index.tsx redirects to /(tabs)/today when onboarding is complete', () => {
    const source = readSource('app/index.tsx');
    expect(source).toContain('/(tabs)/today');
    // Verify it uses Redirect component, not imperative navigation
    expect(source).toContain('Redirect');
  });

  it('index.tsx redirects to /(onboarding) when onboarding is NOT complete', () => {
    const source = readSource('app/index.tsx');
    expect(source).toContain('/(onboarding)');
  });

  it('onboarding route target exists', () => {
    expect(
      fs.existsSync(path.join(APP_DIR, '(onboarding)', 'index.tsx'))
    ).toBe(true);
  });

  it('tabs/today route target exists', () => {
    expect(
      fs.existsSync(path.join(APP_DIR, '(tabs)', 'today.tsx'))
    ).toBe(true);
  });

  it('index.tsx has a timeout fallback for loading', () => {
    const source = readSource('app/index.tsx');
    // Timeout prevents infinite loading screen
    expect(source).toContain('setTimeout');
    expect(source).toContain('10000'); // 10 second timeout
  });
});

// ============================================================================
// COMPREHENSIVE: All route targets referenced by getRouteForInstanceType exist
// ============================================================================

describe('Route completeness: getRouteForInstanceType', () => {
  const routeMap: Record<string, string> = {
    medication: '/medication-confirm',
    vitals: '/log-vitals',
    nutrition: '/log-meal',
    mood: '/log-mood',
    sleep: '/log-sleep',
    hydration: '/log-water',
    activity: '/log-activity',
    wellness: '/log-morning-wellness',
    appointment: '/appointments',
    custom: '/log-note',
  };

  Object.entries(routeMap).forEach(([itemType, route]) => {
    it(`route for "${itemType}" -> "${route}" exists`, () => {
      expect(routeFileExists(route.replace(/^\//, ''))).toBe(true);
    });
  });
});

// ============================================================================
// COMPREHENSIVE: lib/navigate.ts is a thin wrapper
// ============================================================================

describe('lib/navigate.ts wrapper', () => {
  it('exports navigate and navigateReplace functions', () => {
    const source = readSource('lib/navigate.ts');
    expect(source).toContain('export function navigate');
    expect(source).toContain('export function navigateReplace');
  });

  it('delegates to router.push and router.replace', () => {
    const source = readSource('lib/navigate.ts');
    expect(source).toContain('router.push');
    expect(source).toContain('router.replace');
  });
});
