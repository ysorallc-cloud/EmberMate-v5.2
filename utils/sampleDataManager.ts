// ============================================================================
// SAMPLE DATA MANAGER
// Centralized management for sample/demo data isolation and clearing
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeGetItem, safeSetItem } from './safeStorage';
import { emitDataUpdate } from '../lib/events';
import { EVENT } from '../lib/eventNames';
import { devLog, logError } from './devLog';
import { StorageKeys, StorageKeyPrefixes } from './storageKeys';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Origin tag for data records
 * - 'sample': Demo/seeded data created by the app
 * - 'user': Data created by the user
 */
export type DataOrigin = 'sample' | 'user';

/**
 * Interface for entities that support origin tagging
 */
export interface OriginTagged {
  origin?: DataOrigin;
}

/**
 * Result of sample data detection
 */
export interface SampleDataStatus {
  hasSampleData: boolean;
  counts: {
    medications: number;
    vitals: number;
    moodLogs: number;
    appointments: number;
    caregivers: number;
    symptoms: number;
    dailyTracking: number;
    notes: number;
  };
  totalSampleRecords: number;
}

// ============================================================================
// STORAGE KEYS
// ============================================================================

const SAMPLE_DATA_KEYS = {
  // Core data
  medications: StorageKeys.MEDICATIONS,
  vitals: '@vitals_readings',
  moodLogs: StorageKeys.CENTRAL_MOOD_LOGS,
  appointments: StorageKeys.APPOINTMENTS,
  caregivers: StorageKeys.CAREGIVERS,
  notes: StorageKeys.NOTES,
  symptoms: StorageKeys.SYMPTOMS,

  // CarePlanConfig
  carePlanConfig: StorageKeys.CAREPLAN_CONFIG_V1_DEFAULT,

  // Initialization flags
  initialized: StorageKeys.SAMPLE_DATA_INITIALIZED,
  sampleDataCleared: StorageKeys.SAMPLE_DATA_CLEARED,
  firstCarePlanCreated: StorageKeys.FIRST_CARE_PLAN_CREATED,

  // Prefixes for date-based keys
  prefixes: {
    symptomLogs: '@symptom_logs_',
    dailyTracking: '@daily_tracking_',
    medicationLogs: '@medication_logs_',
    carePlanInstances: StorageKeyPrefixes.INSTANCES_V2,
    carePlanLogs: StorageKeyPrefixes.LOGS_V2,
  },
};

// ============================================================================
// DETECTION
// ============================================================================

/**
 * Check if any sample data exists in storage
 * Looks for records with origin === 'sample' or known sample IDs
 */
export async function detectSampleData(): Promise<SampleDataStatus> {
  const counts = {
    medications: 0,
    vitals: 0,
    moodLogs: 0,
    appointments: 0,
    caregivers: 0,
    symptoms: 0,
    dailyTracking: 0,
    notes: 0,
  };

  try {
    // Check medications
    const meds = await safeGetItem<(OriginTagged & { id?: string })[]>(SAMPLE_DATA_KEYS.medications, []);
    counts.medications = meds.filter(m =>
      m.origin === 'sample' || isSampleId(m, 'med-')
    ).length;

    // Check vitals
    const vitals = await safeGetItem<(OriginTagged & { id?: string })[]>(SAMPLE_DATA_KEYS.vitals, []);
    counts.vitals = vitals.filter(v =>
      v.origin === 'sample' || (v.id && v.id.startsWith('vital-'))
    ).length;

    // Check mood logs
    const moods = await safeGetItem<(OriginTagged & { id?: string })[]>(SAMPLE_DATA_KEYS.moodLogs, []);
    counts.moodLogs = moods.filter(m =>
      m.origin === 'sample' || (m.id && m.id.startsWith('mood-'))
    ).length;

    // Check appointments
    const appts = await safeGetItem<(OriginTagged & { id?: string })[]>(SAMPLE_DATA_KEYS.appointments, []);
    counts.appointments = appts.filter(a =>
      a.origin === 'sample' || (a.id && a.id.startsWith('appt-'))
    ).length;

    // Check caregivers
    const caregivers = await safeGetItem<(OriginTagged & { id?: string })[]>(SAMPLE_DATA_KEYS.caregivers, []);
    counts.caregivers = caregivers.filter(c =>
      c.origin === 'sample' || (c.id && c.id.startsWith('cg-'))
    ).length;

    // Check symptoms
    const symptoms = await safeGetItem<OriginTagged[]>(SAMPLE_DATA_KEYS.symptoms, []);
    counts.symptoms = symptoms.filter(s =>
      s.origin === 'sample'
    ).length;

    // Check date-based keys
    const allKeys = await AsyncStorage.getAllKeys();

    // Count daily tracking with sample data
    const trackingKeys = allKeys.filter(k => k.startsWith(SAMPLE_DATA_KEYS.prefixes.dailyTracking));
    for (const key of trackingKeys) {
      const parsed = await safeGetItem<OriginTagged | null>(key, null);
      if (parsed && parsed.origin === 'sample') {
        counts.dailyTracking++;
      }
    }

    // Check notes
    const notes = await safeGetItem<OriginTagged[]>(SAMPLE_DATA_KEYS.notes, []);
    counts.notes = notes.filter(n =>
      n.origin === 'sample'
    ).length;

  } catch (error) {
    logError('sampleDataManager.detectSampleData', error);
  }

  const totalSampleRecords = Object.values(counts).reduce((sum, count) => sum + count, 0);

  return {
    hasSampleData: totalSampleRecords > 0,
    counts,
    totalSampleRecords,
  };
}

/**
 * Quick check if sample data exists (faster than full detection)
 */
export async function hasSampleData(): Promise<boolean> {
  try {
    // Check if already cleared
    const cleared = await safeGetItem<string | null>(SAMPLE_DATA_KEYS.sampleDataCleared, null);
    if (cleared === 'true') {
      return false;
    }

    // Quick check - look for sample medications (by origin tag or legacy ID pattern)
    const meds = await safeGetItem<(OriginTagged & { id?: string })[]>(SAMPLE_DATA_KEYS.medications, []);
    if (meds.length > 0) {
      const hasSample = meds.some(m =>
        m.origin === 'sample' || (m.id && m.id.startsWith('med-'))
      );
      if (hasSample) return true;
    }

    return false;
  } catch (error) {
    logError('sampleDataManager.hasSampleData', error);
    return false;
  }
}

// ============================================================================
// CLEARING
// ============================================================================

/**
 * Clear all sample data from storage
 * Preserves all user-created data (origin === 'user' or no origin tag)
 */
export async function clearSampleData(): Promise<{
  success: boolean;
  clearedCount: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let clearedCount = 0;

  try {
    devLog('[SampleDataManager] Starting sample data cleanup...');

    // 1. Clear sample medications (preserve user medications)
    clearedCount += await filterSampleFromArray(SAMPLE_DATA_KEYS.medications, 'med-');

    // 2. Clear sample vitals
    clearedCount += await filterSampleFromArray(SAMPLE_DATA_KEYS.vitals, 'vital-');

    // 3. Clear sample mood logs
    clearedCount += await filterSampleFromArray(SAMPLE_DATA_KEYS.moodLogs, 'mood-');

    // 4. Clear sample appointments
    clearedCount += await filterSampleFromArray(SAMPLE_DATA_KEYS.appointments, 'appt-');

    // 5. Clear sample caregivers
    clearedCount += await filterSampleFromArray(SAMPLE_DATA_KEYS.caregivers, 'cg-');

    // 6. Clear sample symptoms
    clearedCount += await filterSampleFromArray(SAMPLE_DATA_KEYS.symptoms);

    // 7. Clear sample notes
    clearedCount += await filterSampleFromArray(SAMPLE_DATA_KEYS.notes);

    // 8. Clear date-based sample data
    const allKeys = await AsyncStorage.getAllKeys();

    // Clear sample symptom logs
    const symptomLogKeys = allKeys.filter(k => k.startsWith(SAMPLE_DATA_KEYS.prefixes.symptomLogs));
    for (const key of symptomLogKeys) {
      const removed = await filterSampleFromArray(key);
      clearedCount += removed;
    }

    // Clear sample daily tracking
    const trackingKeys = allKeys.filter(k => k.startsWith(SAMPLE_DATA_KEYS.prefixes.dailyTracking));
    for (const key of trackingKeys) {
      try {
        const parsed = await safeGetItem<OriginTagged | null>(key, null);
        if (parsed && parsed.origin === 'sample') {
          await AsyncStorage.removeItem(key);
          clearedCount++;
        }
      } catch (e) {
        errors.push(`Failed to clear ${key}`);
      }
    }

    // Clear sample medication logs
    const medLogKeys = allKeys.filter(k => k.startsWith(SAMPLE_DATA_KEYS.prefixes.medicationLogs));
    for (const key of medLogKeys) {
      const removed = await filterSampleFromArray(key);
      clearedCount += removed;
    }

    // Also clear the scoped medication logs written by seedSampleMedicationLogs
    try {
      const { scopedKey, StorageKeys: SK } = await import('./storageKeys');
      const { DEFAULT_PATIENT_ID: pid } = await import('../storage/carePlanRepo');
      const scopedMedLogKey = scopedKey(SK.CENTRAL_MED_LOGS, pid);
      await AsyncStorage.removeItem(scopedMedLogKey);
      clearedCount++;
    } catch {}

    // 9. Clear sample CarePlan items (IDs starting with 'sample-')
    const carePlanItemKeys = allKeys.filter(k => k.startsWith(StorageKeyPrefixes.REGIMEN_ITEMS_V2));
    for (const key of carePlanItemKeys) {
      const removed = await filterSampleFromArray(key, 'sample-');
      clearedCount += removed;
    }

    // 10. Clear sample daily instances (generated from sample CarePlan items)
    const instanceKeys = allKeys.filter(k => k.startsWith(SAMPLE_DATA_KEYS.prefixes.carePlanInstances));
    for (const key of instanceKeys) {
      const removed = await filterSampleFromArray(key, 'sample-');
      clearedCount += removed;
    }

    // 11. Clear sample CarePlanConfig
    await AsyncStorage.removeItem(SAMPLE_DATA_KEYS.carePlanConfig);
    clearedCount++;

    // 12. Clear sample patient profile
    await AsyncStorage.multiRemove([
      StorageKeys.PATIENT_NAME,
      StorageKeys.PATIENT_AGE,
      StorageKeys.PATIENT_DOB,
      StorageKeys.PATIENT_RELATIONSHIP,
      StorageKeys.PATIENT_GENDER,
      'medical_info',
    ]);
    clearedCount += 6;

    // 13. Clear correlation cache (will be regenerated)
    await AsyncStorage.removeItem('@correlation_cache');

    // 13. Mark sample data as cleared
    await safeSetItem(SAMPLE_DATA_KEYS.sampleDataCleared, 'true');

    // 14. Emit global refresh event
    emitDataUpdate(EVENT.SAMPLE_DATA_CLEARED);

    devLog(`[SampleDataManager] Cleared ${clearedCount} sample records`);

    return {
      success: true,
      clearedCount,
      errors,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    errors.push(errorMsg);
    logError('sampleDataManager.clearSampleData', error);

    return {
      success: false,
      clearedCount,
      errors,
    };
  }
}

/**
 * Filter sample data from an array stored at the given key
 * Returns the number of items removed
 */
async function filterSampleFromArray(key: string, sampleIdPrefix?: string): Promise<number> {
  try {
    const items = await safeGetItem<any[]>(key, []);
    if (!Array.isArray(items) || items.length === 0) return 0;

    const originalCount = items.length;

    // Keep items that are NOT sample data
    const filtered = items.filter((item: OriginTagged & { id?: string }) => {
      // If has explicit origin tag, use that
      if (item.origin === 'sample') return false;
      if (item.origin === 'user') return true;

      // Fall back to ID prefix check (for legacy data)
      if (sampleIdPrefix && item.id && item.id.startsWith(sampleIdPrefix)) {
        return false;
      }

      // Keep items without origin tag or sample prefix (assumed user data)
      return true;
    });

    const removedCount = originalCount - filtered.length;

    if (removedCount > 0) {
      if (filtered.length > 0) {
        await safeSetItem(key, filtered);
      } else {
        await AsyncStorage.removeItem(key);
      }
    }

    return removedCount;
  } catch (error) {
    logError('sampleDataManager.filterSampleFromArray', error);
    return 0;
  }
}

/**
 * Helper to check if an item has a sample ID prefix
 */
function isSampleId(item: { id?: string }, prefix: string): boolean {
  return item.id ? item.id.startsWith(prefix) : false;
}

// ============================================================================
// FIRST CARE PLAN DETECTION
// ============================================================================

/**
 * Check if user has created their first real Care Plan
 */
export async function hasCreatedFirstCarePlan(): Promise<boolean> {
  const created = await safeGetItem<string | null>(SAMPLE_DATA_KEYS.firstCarePlanCreated, null);
  return created === 'true';
}

/**
 * Mark that user has created their first Care Plan
 */
export async function markFirstCarePlanCreated(): Promise<void> {
  await safeSetItem(SAMPLE_DATA_KEYS.firstCarePlanCreated, 'true');
}

/**
 * Check if we should prompt user to clear sample data
 * Returns true if:
 * - Sample data exists
 * - User hasn't cleared it yet
 * - User is creating their first real Care Plan
 */
export async function shouldPromptSampleDataClear(): Promise<boolean> {
  const [hasSample, hasCarePlan, cleared] = await Promise.all([
    hasSampleData(),
    hasCreatedFirstCarePlan(),
    safeGetItem<string | null>(SAMPLE_DATA_KEYS.sampleDataCleared, null),
  ]);

  // Prompt if sample data exists, hasn't been cleared, and first care plan is being created
  return hasSample && !hasCarePlan && cleared !== 'true';
}

// ============================================================================
// RESET (for testing)
// ============================================================================

/**
 * Reset sample data state (for testing purposes)
 */
export async function resetSampleDataState(): Promise<void> {
  await AsyncStorage.multiRemove([
    SAMPLE_DATA_KEYS.sampleDataCleared,
    SAMPLE_DATA_KEYS.firstCarePlanCreated,
  ]);
}
