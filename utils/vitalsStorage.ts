// ============================================================================
// VITALS STORAGE UTILITY
// Local AsyncStorage for vital signs tracking
// ============================================================================

import { safeGetItem, safeSetItem } from './safeStorage';
import { logError } from './devLog';
import { generateUniqueId } from './idGenerator';
import { scopedKey } from './storageKeys';
import { toLocalDateString } from '../services/carePlanGenerator';

const DEFAULT_PATIENT_ID = 'default';

export type VitalType =
  | 'glucose'
  | 'systolic'
  | 'diastolic'
  | 'heartRate'
  | 'weight'
  | 'temperature'
  | 'oxygen';

export interface VitalReading {
  id: string;
  type: VitalType;
  value: number;
  timestamp: string; // ISO datetime
  unit: string;
  notes?: string;
}

const STORAGE_KEY = '@vitals_readings';

/**
 * Save a vital reading
 */
export async function saveVital(vital: Omit<VitalReading, 'id'>, patientId: string = DEFAULT_PATIENT_ID): Promise<void> {
  try {
    const vitals = await getVitals(patientId);
    const newVital: VitalReading = {
      ...vital,
      id: generateUniqueId(),
    };
    vitals.push(newVital);
    await safeSetItem(scopedKey(STORAGE_KEY, patientId), vitals);
  } catch (error) {
    logError('vitalsStorage.saveVital', error);
    throw error;
  }
}

/**
 * Get all vital readings
 */
export async function getVitals(patientId: string = DEFAULT_PATIENT_ID): Promise<VitalReading[]> {
  try {
    return await safeGetItem<VitalReading[]>(scopedKey(STORAGE_KEY, patientId), []);
  } catch (error) {
    logError('vitalsStorage.getVitals', error);
    return [];
  }
}

/**
 * Get vitals by type
 */
export async function getVitalsByType(type: VitalType, patientId: string = DEFAULT_PATIENT_ID): Promise<VitalReading[]> {
  try {
    const vitals = await getVitals(patientId);
    return vitals.filter((v) => v.type === type).sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  } catch (error) {
    logError('vitalsStorage.getVitalsByType', error);
    return [];
  }
}

/**
 * Get vitals for date range
 */
export async function getVitalsInRange(
  startDate: string,
  endDate: string,
  patientId: string = DEFAULT_PATIENT_ID
): Promise<VitalReading[]> {
  try {
    const vitals = await getVitals(patientId);
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    return vitals.filter((v) => {
      const timestamp = new Date(v.timestamp).getTime();
      return timestamp >= start && timestamp <= end;
    }).sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  } catch (error) {
    logError('vitalsStorage.getVitalsInRange', error);
    return [];
  }
}

/**
 * Check if vitals were logged for a specific date
 * Returns the most recent timestamp if vitals exist for that date
 */
export async function getVitalsCompletionForDate(date: string, patientId: string = DEFAULT_PATIENT_ID): Promise<Date | null> {
  try {
    const vitals = await getVitals(patientId);

    // Filter vitals for the specific date
    const dateVitals = vitals.filter((v) => {
      const vitalDate = toLocalDateString(new Date(v.timestamp));
      return vitalDate === date;
    });

    if (dateVitals.length === 0) return null;

    // Return the most recent timestamp as completion time
    const mostRecent = dateVitals.reduce((latest, current) => {
      return new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest;
    });

    return new Date(mostRecent.timestamp);
  } catch (error) {
    logError('vitalsStorage.getVitalsCompletionForDate', error);
    return null;
  }
}

/**
 * Delete a vital reading
 */
export async function deleteVital(id: string, patientId: string = DEFAULT_PATIENT_ID): Promise<void> {
  try {
    const vitals = await getVitals(patientId);
    const filtered = vitals.filter((v) => v.id !== id);
    await safeSetItem(scopedKey(STORAGE_KEY, patientId), filtered);
  } catch (error) {
    logError('vitalsStorage.deleteVital', error);
    throw error;
  }
}

/**
 * Clear all vitals
 */
export async function clearVitals(patientId: string = DEFAULT_PATIENT_ID): Promise<void> {
  try {
    await safeSetItem(scopedKey(STORAGE_KEY, patientId), []);
  } catch (error) {
    logError('vitalsStorage.clearVitals', error);
    throw error;
  }
}

/**
 * Get vitals for a specific date
 */
export async function getVitalsForDate(date: string, patientId: string = DEFAULT_PATIENT_ID): Promise<VitalReading[]> {
  try {
    const vitals = await getVitals(patientId);
    return vitals.filter((v: VitalReading) => {
      const vitalDate = toLocalDateString(new Date(v.timestamp));
      return vitalDate === date;
    });
  } catch (error) {
    logError('vitalsStorage.getVitalsForDate', error);
    return [];
  }
}

/**
 * Get latest vitals by types
 */
export async function getLatestVitalsByTypes(
  types: VitalType[],
  patientId: string = DEFAULT_PATIENT_ID
): Promise<Record<string, VitalReading | null>> {
  try {
    const vitals = await getVitals(patientId);
    const result: Record<string, VitalReading | null> = {};

    for (const type of types) {
      const typeVitals = vitals
        .filter((v: VitalReading) => v.type === type)
        .sort((a: VitalReading, b: VitalReading) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      result[type] = typeVitals.length > 0 ? typeVitals[0] : null;
    }

    return result;
  } catch (error) {
    logError('vitalsStorage.getLatestVitalsByTypes', error);
    return {};
  }
}
