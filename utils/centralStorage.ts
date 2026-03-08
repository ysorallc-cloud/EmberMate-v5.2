// ============================================================================
// CENTRAL STORAGE - Unified storage for Log page and Quick Check-In
// Ensures both interfaces use the same data source
// ============================================================================

import { encryptedGetRaw, encryptedSetRaw } from './safeStorage';
import { logError } from './devLog';
import { withKeyLock } from './keyLock';
import { StorageKeys, scopedKey } from './storageKeys';
import { generateUniqueId } from './idGenerator';

const DEFAULT_PATIENT_ID = 'default';

// Maximum entries per log array to prevent unbounded AsyncStorage growth
const MAX_LOG_ENTRIES = 1000;

// Storage keys
const KEYS = {
  MEDICATION_LOGS: StorageKeys.CENTRAL_MED_LOGS,
  VITALS_LOGS: StorageKeys.CENTRAL_VITALS_LOGS,
  MOOD_LOGS: StorageKeys.CENTRAL_MOOD_LOGS,
  SYMPTOM_LOGS: StorageKeys.CENTRAL_SYMPTOM_LOGS,
  SLEEP_LOGS: StorageKeys.CENTRAL_SLEEP_LOGS,
  MEALS_LOGS: StorageKeys.CENTRAL_MEALS_LOGS,
  WATER_LOGS: StorageKeys.CENTRAL_WATER_LOGS,
  NOTES_LOGS: StorageKeys.CENTRAL_NOTES_LOGS,
};

// ============================================================================
// INTERFACES
// ============================================================================

export interface MedicationLog {
  id: string;
  timestamp: string;
  medicationIds: string[];
  sideEffects?: string[];
}

export interface VitalsLog {
  id: string;
  timestamp: string;
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
  glucose?: number;
  weight?: number;
  temperature?: number;
  oxygen?: number;
  oxygenSaturation?: number;
}

export interface MoodLog {
  id: string;
  timestamp: string;
  mood: number | null;
  energy: number | null;
  pain: number | null;
}

export interface SymptomLog {
  id: string;
  timestamp: string;
  symptoms: string[];
  severity?: number;
  notes?: string;
}

export interface SleepLog {
  id: string;
  timestamp: string;
  hours: number;
  quality: number; // 1-5
  notes?: string;
}

export interface MealsLog {
  id: string;
  timestamp: string;
  meals: string[]; // 'Breakfast', 'Lunch', 'Dinner', 'Snack'
  description?: string;
  mealType?: string;
  appetite?: string;
  amountConsumed?: string;
  assistanceLevel?: string;
}

export interface WaterLog {
  id: string;
  timestamp: string;
  glasses: number;
}

export interface NotesLog {
  id: string;
  timestamp: string;
  content: string;
  notes?: string;
  isVoice?: boolean;
}

// ============================================================================
// MEDICATION FUNCTIONS
// ============================================================================

export const saveMedicationLog = async (data: Omit<MedicationLog, 'id'>, patientId: string = DEFAULT_PATIENT_ID): Promise<void> => {
  const key = scopedKey(KEYS.MEDICATION_LOGS, patientId);
  return withKeyLock(key, async () => {
    try {
      const existingData = await encryptedGetRaw(key);
      const logs: MedicationLog[] = existingData ? JSON.parse(existingData) : [];

      const newLog: MedicationLog = {
        id: generateUniqueId(),
        ...data,
      };

      logs.unshift(newLog);
      if (logs.length > MAX_LOG_ENTRIES) logs.length = MAX_LOG_ENTRIES;
      await encryptedSetRaw(key, JSON.stringify(logs));
    } catch (error) {
      logError('centralStorage.saveMedicationLog', error);
      throw error;
    }
  });
};

export const getMedicationLogs = async (patientId: string = DEFAULT_PATIENT_ID): Promise<MedicationLog[]> => {
  try {
    const data = await encryptedGetRaw(scopedKey(KEYS.MEDICATION_LOGS, patientId));
    return data ? JSON.parse(data) : [];
  } catch (error) {
    logError('centralStorage.getMedicationLogs', error);
    return [];
  }
};

export const getTodayMedicationLog = async (patientId: string = DEFAULT_PATIENT_ID): Promise<MedicationLog | null> => {
  try {
    const logs = await getMedicationLogs(patientId);
    const today = new Date().toDateString();
    return logs.find(log => new Date(log.timestamp).toDateString() === today) || null;
  } catch (error) {
    logError('centralStorage.getTodayMedicationLog', error);
    return null;
  }
};

// ============================================================================
// VITALS FUNCTIONS
// ============================================================================

export const saveVitalsLog = async (data: Omit<VitalsLog, 'id'>, patientId: string = DEFAULT_PATIENT_ID): Promise<void> => {
  const key = scopedKey(KEYS.VITALS_LOGS, patientId);
  return withKeyLock(key, async () => {
    try {
      const existingData = await encryptedGetRaw(key);
      const logs: VitalsLog[] = existingData ? JSON.parse(existingData) : [];

      const newLog: VitalsLog = {
        id: generateUniqueId(),
        ...data,
      };

      logs.unshift(newLog);
      if (logs.length > MAX_LOG_ENTRIES) logs.length = MAX_LOG_ENTRIES;
      await encryptedSetRaw(key, JSON.stringify(logs));
    } catch (error) {
      logError('centralStorage.saveVitalsLog', error);
      throw error;
    }
  });
};

export const getVitalsLogs = async (patientId: string = DEFAULT_PATIENT_ID): Promise<VitalsLog[]> => {
  try {
    const data = await encryptedGetRaw(scopedKey(KEYS.VITALS_LOGS, patientId));
    if (!data || typeof data !== 'string') return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    logError('centralStorage.getVitalsLogs', error);
    return [];
  }
};

export const getTodayVitalsLog = async (patientId: string = DEFAULT_PATIENT_ID): Promise<VitalsLog | null> => {
  try {
    const logs = await getVitalsLogs(patientId);
    const today = new Date().toDateString();
    return logs.find(log => new Date(log.timestamp).toDateString() === today) || null;
  } catch (error) {
    logError('centralStorage.getTodayVitalsLog', error);
    return null;
  }
};

// ============================================================================
// MOOD FUNCTIONS
// ============================================================================

export const saveMoodLog = async (data: Omit<MoodLog, 'id'>, patientId: string = DEFAULT_PATIENT_ID): Promise<void> => {
  const key = scopedKey(KEYS.MOOD_LOGS, patientId);
  return withKeyLock(key, async () => {
    try {
      const existingData = await encryptedGetRaw(key);
      const logs: MoodLog[] = existingData ? JSON.parse(existingData) : [];

      const newLog: MoodLog = {
        id: generateUniqueId(),
        ...data,
      };

      logs.unshift(newLog);
      if (logs.length > MAX_LOG_ENTRIES) logs.length = MAX_LOG_ENTRIES;
      await encryptedSetRaw(key, JSON.stringify(logs));
    } catch (error) {
      logError('centralStorage.saveMoodLog', error);
      throw error;
    }
  });
};

export const getMoodLogs = async (patientId: string = DEFAULT_PATIENT_ID): Promise<MoodLog[]> => {
  try {
    const data = await encryptedGetRaw(scopedKey(KEYS.MOOD_LOGS, patientId));
    return data ? JSON.parse(data) : [];
  } catch (error) {
    logError('centralStorage.getMoodLogs', error);
    return [];
  }
};

export const getTodayMoodLog = async (patientId: string = DEFAULT_PATIENT_ID): Promise<MoodLog | null> => {
  try {
    const logs = await getMoodLogs(patientId);
    const today = new Date().toDateString();
    return logs.find(log => new Date(log.timestamp).toDateString() === today) || null;
  } catch (error) {
    logError('centralStorage.getTodayMoodLog', error);
    return null;
  }
};

// ============================================================================
// SYMPTOM FUNCTIONS
// ============================================================================

export const saveSymptomLog = async (data: Omit<SymptomLog, 'id'>, patientId: string = DEFAULT_PATIENT_ID): Promise<void> => {
  const key = scopedKey(KEYS.SYMPTOM_LOGS, patientId);
  return withKeyLock(key, async () => {
    try {
      const existingData = await encryptedGetRaw(key);
      const logs: SymptomLog[] = existingData ? JSON.parse(existingData) : [];

      const newLog: SymptomLog = {
        id: generateUniqueId(),
        ...data,
      };

      logs.unshift(newLog);
      if (logs.length > MAX_LOG_ENTRIES) logs.length = MAX_LOG_ENTRIES;
      await encryptedSetRaw(key, JSON.stringify(logs));
    } catch (error) {
      logError('centralStorage.saveSymptomLog', error);
      throw error;
    }
  });
};

export const getSymptomLogs = async (patientId: string = DEFAULT_PATIENT_ID): Promise<SymptomLog[]> => {
  try {
    const data = await encryptedGetRaw(scopedKey(KEYS.SYMPTOM_LOGS, patientId));
    return data ? JSON.parse(data) : [];
  } catch (error) {
    logError('centralStorage.getSymptomLogs', error);
    return [];
  }
};

export const getTodaySymptomLog = async (patientId: string = DEFAULT_PATIENT_ID): Promise<SymptomLog | null> => {
  try {
    const logs = await getSymptomLogs(patientId);
    const today = new Date().toDateString();
    return logs.find(log => new Date(log.timestamp).toDateString() === today) || null;
  } catch (error) {
    logError('centralStorage.getTodaySymptomLog', error);
    return null;
  }
};

// ============================================================================
// SLEEP FUNCTIONS
// ============================================================================

export const saveSleepLog = async (data: Omit<SleepLog, 'id'>, patientId: string = DEFAULT_PATIENT_ID): Promise<void> => {
  const key = scopedKey(KEYS.SLEEP_LOGS, patientId);
  return withKeyLock(key, async () => {
    try {
      const existingData = await encryptedGetRaw(key);
      const logs: SleepLog[] = existingData ? JSON.parse(existingData) : [];

      const newLog: SleepLog = {
        id: generateUniqueId(),
        ...data,
      };

      logs.unshift(newLog);
      if (logs.length > MAX_LOG_ENTRIES) logs.length = MAX_LOG_ENTRIES;
      await encryptedSetRaw(key, JSON.stringify(logs));
    } catch (error) {
      logError('centralStorage.saveSleepLog', error);
      throw error;
    }
  });
};

export const getSleepLogs = async (patientId: string = DEFAULT_PATIENT_ID): Promise<SleepLog[]> => {
  try {
    const data = await encryptedGetRaw(scopedKey(KEYS.SLEEP_LOGS, patientId));
    return data ? JSON.parse(data) : [];
  } catch (error) {
    logError('centralStorage.getSleepLogs', error);
    return [];
  }
};

export const getTodaySleepLog = async (patientId: string = DEFAULT_PATIENT_ID): Promise<SleepLog | null> => {
  try {
    const logs = await getSleepLogs(patientId);
    const today = new Date().toDateString();
    return logs.find(log => new Date(log.timestamp).toDateString() === today) || null;
  } catch (error) {
    logError('centralStorage.getTodaySleepLog', error);
    return null;
  }
};

// ============================================================================
// MEALS FUNCTIONS
// ============================================================================

export const saveMealsLog = async (data: Omit<MealsLog, 'id'>, patientId: string = DEFAULT_PATIENT_ID): Promise<void> => {
  const key = scopedKey(KEYS.MEALS_LOGS, patientId);
  return withKeyLock(key, async () => {
    try {
      const existingData = await encryptedGetRaw(key);
      const logs: MealsLog[] = existingData ? JSON.parse(existingData) : [];

      const newLog: MealsLog = {
        id: generateUniqueId(),
        ...data,
      };

      logs.unshift(newLog);
      if (logs.length > MAX_LOG_ENTRIES) logs.length = MAX_LOG_ENTRIES;
      await encryptedSetRaw(key, JSON.stringify(logs));
    } catch (error) {
      logError('centralStorage.saveMealsLog', error);
      throw error;
    }
  });
};

export const getMealsLogs = async (patientId: string = DEFAULT_PATIENT_ID): Promise<MealsLog[]> => {
  try {
    const data = await encryptedGetRaw(scopedKey(KEYS.MEALS_LOGS, patientId));
    return data ? JSON.parse(data) : [];
  } catch (error) {
    logError('centralStorage.getMealsLogs', error);
    return [];
  }
};

export const getTodayMealsLog = async (patientId: string = DEFAULT_PATIENT_ID): Promise<MealsLog | null> => {
  try {
    const logs = await getMealsLogs(patientId);
    const today = new Date().toDateString();
    return logs.find(log => new Date(log.timestamp).toDateString() === today) || null;
  } catch (error) {
    logError('centralStorage.getTodayMealsLog', error);
    return null;
  }
};

// ============================================================================
// WATER FUNCTIONS
// ============================================================================

export const saveWaterLog = async (data: Omit<WaterLog, 'id'>, patientId: string = DEFAULT_PATIENT_ID): Promise<void> => {
  const key = scopedKey(KEYS.WATER_LOGS, patientId);
  return withKeyLock(key, async () => {
    try {
      const existingData = await encryptedGetRaw(key);
      const logs: WaterLog[] = existingData ? JSON.parse(existingData) : [];

      const newLog: WaterLog = {
        id: generateUniqueId(),
        ...data,
      };

      logs.unshift(newLog);
      if (logs.length > MAX_LOG_ENTRIES) logs.length = MAX_LOG_ENTRIES;
      await encryptedSetRaw(key, JSON.stringify(logs));
    } catch (error) {
      logError('centralStorage.saveWaterLog', error);
      throw error;
    }
  });
};

export const getWaterLogs = async (patientId: string = DEFAULT_PATIENT_ID): Promise<WaterLog[]> => {
  try {
    const data = await encryptedGetRaw(scopedKey(KEYS.WATER_LOGS, patientId));
    return data ? JSON.parse(data) : [];
  } catch (error) {
    logError('centralStorage.getWaterLogs', error);
    return [];
  }
};

export const getTodayWaterLog = async (patientId: string = DEFAULT_PATIENT_ID): Promise<WaterLog | null> => {
  try {
    const logs = await getWaterLogs(patientId);
    const today = new Date().toDateString();
    return logs.find(log => new Date(log.timestamp).toDateString() === today) || null;
  } catch (error) {
    logError('centralStorage.getTodayWaterLog', error);
    return null;
  }
};

export const updateTodayWaterLog = async (glasses: number, patientId: string = DEFAULT_PATIENT_ID): Promise<void> => {
  const key = scopedKey(KEYS.WATER_LOGS, patientId);
  return withKeyLock(key, async () => {
    try {
      const existingData = await encryptedGetRaw(key);
      const logs: WaterLog[] = existingData ? JSON.parse(existingData) : [];
      const today = new Date().toDateString();

      // Find and update today's log, or create a new one
      const todayIndex = logs.findIndex(log => new Date(log.timestamp).toDateString() === today);

      if (todayIndex >= 0) {
        logs[todayIndex].glasses = glasses;
      } else {
        logs.unshift({
          id: generateUniqueId(),
          timestamp: new Date().toISOString(),
          glasses,
        });
      }

      await encryptedSetRaw(key, JSON.stringify(logs));
    } catch (error) {
      logError('centralStorage.updateTodayWaterLog', error);
      throw error;
    }
  });
};

// ============================================================================
// NOTES FUNCTIONS
// ============================================================================

export const saveNotesLog = async (data: Omit<NotesLog, 'id'>, patientId: string = DEFAULT_PATIENT_ID): Promise<void> => {
  const key = scopedKey(KEYS.NOTES_LOGS, patientId);
  return withKeyLock(key, async () => {
    try {
      const existingData = await encryptedGetRaw(key);
      const logs: NotesLog[] = existingData ? JSON.parse(existingData) : [];

      const newLog: NotesLog = {
        id: generateUniqueId(),
        ...data,
      };

      logs.unshift(newLog);
      if (logs.length > MAX_LOG_ENTRIES) logs.length = MAX_LOG_ENTRIES;
      await encryptedSetRaw(key, JSON.stringify(logs));
    } catch (error) {
      logError('centralStorage.saveNotesLog', error);
      throw error;
    }
  });
};

export const getNotesLogs = async (patientId: string = DEFAULT_PATIENT_ID): Promise<NotesLog[]> => {
  try {
    const data = await encryptedGetRaw(scopedKey(KEYS.NOTES_LOGS, patientId));
    return data ? JSON.parse(data) : [];
  } catch (error) {
    logError('centralStorage.getNotesLogs', error);
    return [];
  }
};

export const getTodayNotesLog = async (patientId: string = DEFAULT_PATIENT_ID): Promise<NotesLog | null> => {
  try {
    const logs = await getNotesLogs(patientId);
    const today = new Date().toDateString();
    return logs.find(log => new Date(log.timestamp).toDateString() === today) || null;
  } catch (error) {
    logError('centralStorage.getTodayNotesLog', error);
    return null;
  }
};

// ============================================================================
// COMBINED STATUS FUNCTIONS
// ============================================================================

export interface TodayLogStatus {
  medications: boolean;
  vitals: boolean;
  mood: boolean;
  symptoms: boolean;
  sleep: boolean;
  meals: boolean;
  water: boolean;
  notes: boolean;
}

export const getTodayLogStatus = async (patientId: string = DEFAULT_PATIENT_ID): Promise<TodayLogStatus> => {
  try {
    const [meds, vitals, mood, symptoms, sleep, meals, water, notes] = await Promise.all([
      getTodayMedicationLog(patientId),
      getTodayVitalsLog(patientId),
      getTodayMoodLog(patientId),
      getTodaySymptomLog(patientId),
      getTodaySleepLog(patientId),
      getTodayMealsLog(patientId),
      getTodayWaterLog(patientId),
      getTodayNotesLog(patientId),
    ]);

    return {
      medications: !!meds,
      vitals: !!vitals,
      mood: !!mood,
      symptoms: !!symptoms,
      sleep: !!sleep,
      meals: !!meals,
      water: !!water,
      notes: !!notes,
    };
  } catch (error) {
    logError('centralStorage.getTodayLogStatus', error);
    return {
      medications: false,
      vitals: false,
      mood: false,
      symptoms: false,
      sleep: false,
      meals: false,
      water: false,
      notes: false,
    };
  }
};
