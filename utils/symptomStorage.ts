// ============================================================================
// SYMPTOM STORAGE UTILITIES
// AsyncStorage operations for symptom logging
// ============================================================================

import { safeGetItem, safeSetItem } from './safeStorage';
import { logError } from './devLog';
import { StorageKeys, scopedKey } from './storageKeys';
import { generateUniqueId } from './idGenerator';

const DEFAULT_PATIENT_ID = 'default';

export interface SymptomLog {
  id: string;
  symptom: string;
  severity: number; // 1-10 scale
  description?: string;
  bodyLocation?: string;  // For pain: Head, Chest, Back, Hip, etc.
  character?: string;     // For pain: Aching, Sharp, Burning, etc.
  timestamp: string; // ISO datetime
  date: string; // ISO date (YYYY-MM-DD)
}

const STORAGE_KEY = StorageKeys.SYMPTOMS;

export async function saveSymptom(symptom: Omit<SymptomLog, 'id'>, patientId: string = DEFAULT_PATIENT_ID): Promise<void> {
  try {
    const symptoms = await getSymptoms(patientId);
    const newSymptom: SymptomLog = {
      ...symptom,
      id: generateUniqueId(),
    };
    symptoms.push(newSymptom);
    await safeSetItem(scopedKey(STORAGE_KEY, patientId), symptoms);
  } catch (error) {
    logError('symptomStorage.saveSymptom', error);
    throw error;
  }
}

export async function getSymptoms(patientId: string = DEFAULT_PATIENT_ID): Promise<SymptomLog[]> {
  try {
    return await safeGetItem<SymptomLog[]>(scopedKey(STORAGE_KEY, patientId), []);
  } catch (error) {
    logError('symptomStorage.getSymptoms', error);
    return [];
  }
}

export async function getSymptomsByDate(date: string, patientId: string = DEFAULT_PATIENT_ID): Promise<SymptomLog[]> {
  try {
    const symptoms = await getSymptoms(patientId);
    return symptoms.filter(s => s.date === date);
  } catch (error) {
    logError('symptomStorage.getSymptomsByDate', error);
    return [];
  }
}

export async function deleteSymptom(id: string, patientId: string = DEFAULT_PATIENT_ID): Promise<boolean> {
  try {
    const symptoms = await getSymptoms(patientId);
    const filtered = symptoms.filter(s => s.id !== id);
    if (filtered.length === symptoms.length) {
      return false; // Symptom not found
    }
    await safeSetItem(scopedKey(STORAGE_KEY, patientId), filtered);
    return true;
  } catch (error) {
    logError('symptomStorage.deleteSymptom', error);
    return false;
  }
}
