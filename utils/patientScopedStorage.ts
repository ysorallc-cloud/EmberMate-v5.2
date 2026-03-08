// ============================================================================
// PATIENT-SCOPED STORAGE WRAPPER
// Read with lazy migration from legacy keys; write to scoped keys only
// ============================================================================

import { safeGetItem, safeSetItem } from './safeStorage';
import { DEFAULT_PATIENT_ID } from '../types/patient';

/**
 * Read patient-scoped data with lazy migration from legacy unscoped keys.
 *
 * Strategy:
 * 1. Try reading from the scoped key
 * 2. If empty AND this is the default patient AND a legacy key is provided,
 *    fall back to the legacy key and lazy-write the result to the scoped key
 * 3. Return defaultValue if nothing found
 */
export async function scopedGet<T>(
  scopedKeyFn: (pid: string) => string,
  legacyKey: string | null,
  patientId: string,
  defaultValue: T
): Promise<T> {
  const scopedKey = scopedKeyFn(patientId);

  // Try scoped key first
  const scopedData = await safeGetItem<T | null>(scopedKey, null);
  if (scopedData !== null) {
    return scopedData;
  }

  // Legacy fallback only for default patient
  if (legacyKey && patientId === DEFAULT_PATIENT_ID) {
    const legacyData = await safeGetItem<T | null>(legacyKey, null);
    if (legacyData !== null) {
      // Lazy-write to scoped key for future reads
      await safeSetItem(scopedKey, legacyData);
      return legacyData;
    }
  }

  return defaultValue;
}

/**
 * Write patient-scoped data. Always writes to the scoped key only.
 */
export async function scopedSet<T>(
  scopedKeyFn: (pid: string) => string,
  patientId: string,
  value: T
): Promise<boolean> {
  const scopedKey = scopedKeyFn(patientId);
  return safeSetItem(scopedKey, value);
}
