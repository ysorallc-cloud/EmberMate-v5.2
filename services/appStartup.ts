// ============================================================================
// APP STARTUP
// Orchestrated app startup with error isolation per phase
// Each phase runs independently — a failure in one doesn't block others.
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';
import { resetDailyMedicationStatus } from '../utils/medicationStorage';
import { initializeSampleData, deduplicateSampleSymptoms } from '../utils/sampleDataGenerator';
import { ensureDailySnapshot, pruneOldOverrides } from '../utils/carePlanStorage';
import { logError, devLog } from '../utils/devLog';
import { runMigrations } from './migrationService';
import { migrateToEncryptedStorage } from '../utils/dataMigration';
import { loadCustomThresholds } from '../utils/vitalThresholds';
import { purgeIfNeeded } from '../utils/dataRetention';
import { initErrorReporting, reportError, reportWarning } from '../utils/errorReporting';
import { checkForUpdates } from '../utils/updateChecker';
import { shouldShowIntegrityWarning } from '../utils/deviceIntegrity';
import { getTodayDateString, cleanupDuplicateCarePlanItems } from './carePlanGenerator';
import { StorageKeys, StorageKeyPrefixes } from '../utils/storageKeys';

interface StartupResult {
  success: boolean;
  phases: { name: string; ok: boolean; ms: number; error?: string }[];
  totalMs: number;
}

/**
 * Run all app startup tasks in order with error isolation.
 * Each phase runs independently — a failure in one doesn't block others.
 * Returns a result object for debugging/reporting.
 */
export async function runStartupSequence(): Promise<StartupResult> {
  const startTotal = Date.now();
  const phases: StartupResult['phases'] = [];

  // Phase 0: Error reporting — MUST succeed, everything else depends on it
  await runPhase(
    'errorReporting',
    async () => {
      initErrorReporting();
    },
    phases,
    true,
  ); // critical = true

  // Phase 1: OTA update check (non-blocking, fire-and-forget)
  checkForUpdates();

  // Phase 2: Data migrations (must run before any data reads)
  await runPhase(
    'migrations',
    async () => {
      await runMigrations();
    },
    phases,
    true,
  );

  // Phase 2b: Encrypt sensitive health data at rest (one-time migration)
  await runPhase(
    'encryptionMigration',
    async () => {
      await migrateToEncryptedStorage();
    },
    phases,
  );

  // Phase 2c: One-time cleanup of duplicate CarePlanItems + stale instances
  await runPhase(
    'cleanupDuplicates',
    async () => {
      const CLEANUP_KEY = StorageKeys.DUPLICATE_CLEANUP_V1;
      const done = await safeGetItem<string | null>(CLEANUP_KEY, null);
      if (done === 'true') return;

      devLog('[Startup] Running one-time duplicate CarePlanItem cleanup...');
      const result = await cleanupDuplicateCarePlanItems();

      // Also purge ALL daily instance data so it regenerates cleanly
      const allKeys = await AsyncStorage.getAllKeys();
      const instanceKeys = allKeys.filter(k => k.startsWith(StorageKeyPrefixes.INSTANCES_V2));
      if (instanceKeys.length > 0) {
        await AsyncStorage.multiRemove(instanceKeys);
        devLog(`[Startup] Purged ${instanceKeys.length} daily instance keys for clean regeneration`);
      }

      await safeSetItem(CLEANUP_KEY, 'true');
      devLog(`[Startup] Cleanup complete: removed ${result.removedCount} duplicate items`);
    },
    phases,
  );

  // Phase 3: Daily reset + snapshot (order matters)
  await runPhase(
    'dailyReset',
    async () => {
      const lastReset = await safeGetItem<string | null>(StorageKeys.LAST_RESET_DATE, null);
      const today = getTodayDateString();
      if (lastReset !== today) {
        await resetDailyMedicationStatus();
        await safeSetItem(StorageKeys.LAST_RESET_DATE, today);
      }
    },
    phases,
  );

  await runPhase(
    'dailySnapshot',
    async () => {
      await ensureDailySnapshot();
    },
    phases,
  );

  // Phase 4: Cleanup (safe to fail)
  await runPhase('pruneOverrides', () => pruneOldOverrides(), phases);
  await runPhase('purgeOldData', () => purgeIfNeeded(), phases);
  await runPhase('deduplicateSymptoms', async () => { await deduplicateSampleSymptoms(); }, phases);

  // Phase 5: Cache warming (safe to fail)
  await runPhase('loadThresholds', () => loadCustomThresholds(), phases);

  // Phase 6: Sample data — only if user chose sample data during onboarding
  // (initializeSampleData has its own flag check, but we skip entirely for
  // users who chose "Start Fresh" to avoid writing data they didn't request)
  await runPhase('sampleData', async () => {
    const sampleSeeded = await safeGetItem<string | null>('sample_data_seeded', null);
    if (sampleSeeded === 'true') {
      await initializeSampleData();
    }
  }, phases);

  // Phase 7: Device integrity check (safe to fail, non-blocking)
  await runPhase('deviceIntegrity', () => shouldShowIntegrityWarning(), phases);

  const totalMs = Date.now() - startTotal;
  const success = phases.filter((p) => !p.ok).length === 0;

  if (!success) {
    const failures = phases
      .filter((p) => !p.ok)
      .map((p) => p.name)
      .join(', ');
    reportWarning(`Startup completed with failures: ${failures}`, {
      totalMs: String(totalMs),
      failedPhases: failures,
    });
  }

  if (__DEV__) {
    console.log(`[Startup] Completed in ${totalMs}ms`);
    phases.forEach((p) => {
      console.log(
        `  ${p.ok ? 'OK' : 'FAIL'} ${p.name} (${p.ms}ms)${p.error ? ` — ${p.error}` : ''}`,
      );
    });
  }

  return { success, phases, totalMs };
}

async function runPhase(
  name: string,
  fn: () => void | Promise<void> | Promise<boolean>,
  phases: StartupResult['phases'],
  critical: boolean = false,
): Promise<void> {
  const start = Date.now();
  try {
    await fn();
    phases.push({ name, ok: true, ms: Date.now() - start });
  } catch (error) {
    const ms = Date.now() - start;
    const message = error instanceof Error ? error.message : String(error);
    phases.push({ name, ok: false, ms, error: message });

    reportError(error instanceof Error ? error : new Error(message), {
      phase: name,
      critical: String(critical),
    });

    if (critical) {
      logError(`appStartup.runPhase:${name}`, error);
    }
  }
}
