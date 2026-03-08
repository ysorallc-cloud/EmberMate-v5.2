// ============================================================================
// RHYTHM STORAGE - Inferred baselines from behavior
// Observes patterns, doesn't impose requirements
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeGetItem, safeSetItem } from './safeStorage';
import { getMedications } from './medicationStorage';
import { emitDataUpdate } from '../lib/events';
import { EVENT } from '../lib/eventNames';
import { logError } from './devLog';
import { StorageKeys } from './storageKeys';

const STORAGE_KEY = StorageKeys.RHYTHM;
const FIRST_USE_KEY = StorageKeys.FIRST_USE_DATE;

// ============================================================================
// TYPES
// ============================================================================

export interface Rhythm {
  // Inferred or user-set baselines
  medications: number;      // e.g., 4 doses per day
  vitals: number;          // e.g., 2 checks per day
  meals: number;           // e.g., 3 meals per day

  // Metadata
  isInferred: boolean;     // true = observed from behavior, false = user edited
  inferredDate: string;    // When rhythm was first inferred
  lastEditedDate?: string; // When user manually edited (if ever)
  daysObserved: number;    // Number of days used to infer baseline
}

export interface TodayProgress {
  medications: { completed: number; expected: number };
  vitals: { completed: number; expected: number };
  meals: { completed: number; expected: number };
}

// ============================================================================
// FIRST USE DATE TRACKING
// ============================================================================

export async function getFirstUseDate(): Promise<string | null> {
  try {
    return await safeGetItem<string | null>(FIRST_USE_KEY, null);
  } catch (error) {
    logError('rhythmStorage.getFirstUseDate', error);
    return null;
  }
}

export async function setFirstUseDate(): Promise<void> {
  try {
    const existing = await getFirstUseDate();
    if (!existing) {
      await safeSetItem(FIRST_USE_KEY, new Date().toISOString());
    }
  } catch (error) {
    logError('rhythmStorage.setFirstUseDate', error);
  }
}

export async function getDaysSinceFirstUse(): Promise<number> {
  try {
    const firstUse = await getFirstUseDate();
    if (!firstUse) return 0;

    const daysSince = Math.floor(
      (Date.now() - new Date(firstUse).getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

    return daysSince;
  } catch (error) {
    logError('rhythmStorage.getDaysSinceFirstUse', error);
    return 0;
  }
}

// ============================================================================
// RHYTHM INFERENCE (Days 1-3)
// ============================================================================

/**
 * Infer rhythm from last 3 days of logging behavior
 * Called automatically on Day 4+
 */
export async function inferRhythmFromBehavior(): Promise<Rhythm | null> {
  try {
    const days = await getDaysSinceFirstUse();
    if (days < 4) return null; // Don't infer until Day 4

    // Get medications for baseline
    const meds = await getMedications();
    const activeMeds = meds.filter(m => m.active !== false);

    // For now, use sensible defaults based on active medications
    // In a full implementation, we'd analyze logs from the past 3 days
    const medsPerDay = activeMeds.length || 4;
    const vitalsPerDay = 2; // Default: morning and evening
    const mealsPerDay = 3;  // Default: breakfast, lunch, dinner

    return {
      medications: medsPerDay,
      vitals: vitalsPerDay,
      meals: mealsPerDay,
      isInferred: true,
      inferredDate: new Date().toISOString(),
      daysObserved: 3,
    };
  } catch (error) {
    logError('rhythmStorage.inferRhythmFromBehavior', error);
    return null;
  }
}

// ============================================================================
// RHYTHM STORAGE
// ============================================================================

export async function getRhythm(): Promise<Rhythm | null> {
  try {
    const data = await safeGetItem<Rhythm | null>(STORAGE_KEY, null);
    if (data) {
      return data;
    }

    // No stored rhythm - try to infer on Day 4+
    const days = await getDaysSinceFirstUse();
    if (days >= 4) {
      const inferred = await inferRhythmFromBehavior();
      if (inferred) {
        await saveRhythm(inferred);
        return inferred;
      }
    }

    // DEV: Return default rhythm for testing (remove for production)
    const defaultRhythm: Rhythm = {
      medications: 4,
      vitals: 2,
      meals: 3,
      isInferred: true,
      inferredDate: new Date().toISOString(),
      daysObserved: 3,
    };
    return defaultRhythm;
  } catch (error) {
    logError('rhythmStorage.getRhythm', error);
    return null;
  }
}

export async function saveRhythm(rhythm: Rhythm): Promise<void> {
  try {
    await safeSetItem(STORAGE_KEY, rhythm);
    emitDataUpdate(EVENT.RHYTHM);
  } catch (error) {
    logError('rhythmStorage.saveRhythm', error);
    throw error;
  }
}

export async function updateRhythm(updates: Partial<Rhythm>): Promise<void> {
  try {
    const existing = await getRhythm();
    const updated: Rhythm = {
      ...(existing || { medications: 0, vitals: 0, meals: 0, isInferred: true, inferredDate: new Date().toISOString(), daysObserved: 0 }),
      ...updates,
      isInferred: false, // Once edited, it's no longer inferred
      lastEditedDate: new Date().toISOString(),
    };
    await saveRhythm(updated);
  } catch (error) {
    logError('rhythmStorage.updateRhythm', error);
    throw error;
  }
}

export async function clearRhythm(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    emitDataUpdate(EVENT.RHYTHM);
  } catch (error) {
    logError('rhythmStorage.clearRhythm', error);
    throw error;
  }
}

// ============================================================================
// TODAY'S PROGRESS
// ============================================================================

export async function getTodayProgress(): Promise<TodayProgress> {
  try {
    const rhythm = await getRhythm();

    // Import from existing storage
    const { getTodayVitalsLog, getTodayMealsLog } = require('./centralStorage');

    const [todayVitals, todayMeals] = await Promise.all([
      getTodayVitalsLog(),
      getTodayMealsLog(),
    ]);

    // Count medications taken
    const meds = await getMedications();
    const medsTaken = meds.filter(m => m.active !== false && m.taken).length;

    // Count vitals
    let vitalsCount = 0;
    if (todayVitals) {
      if (todayVitals.systolic || todayVitals.diastolic) vitalsCount++;
      if (todayVitals.glucose) vitalsCount++;
      if (todayVitals.heartRate) vitalsCount++;
      if (todayVitals.temperature) vitalsCount++;
      if (todayVitals.oxygen) vitalsCount++;
      if (todayVitals.weight) vitalsCount++;
    }

    // Count meals
    const mealsCount = todayMeals?.meals?.length || 0;

    return {
      medications: {
        completed: medsTaken,
        expected: rhythm?.medications || 0,
      },
      vitals: {
        completed: vitalsCount,
        expected: rhythm?.vitals || 0,
      },
      meals: {
        completed: mealsCount,
        expected: rhythm?.meals || 0,
      },
    };
  } catch (error) {
    logError('rhythmStorage.getTodayProgress', error);
    return {
      medications: { completed: 0, expected: 0 },
      vitals: { completed: 0, expected: 0 },
      meals: { completed: 0, expected: 0 },
    };
  }
}

// ============================================================================
// DEVIATION DETECTION (for Understand page insights)
// ============================================================================

export interface DeviationAnalysis {
  hasDeviation: boolean;
  daysOfDeviation: number;
  categories: {
    medications?: { expected: number; actual: number };
    vitals?: { expected: number; actual: number };
    meals?: { expected: number; actual: number };
  };
}

/**
 * Check if there's been consistent deviation from rhythm over past 5 days
 */
export async function detectDeviation(): Promise<DeviationAnalysis> {
  try {
    const rhythm = await getRhythm();
    if (!rhythm) {
      return { hasDeviation: false, daysOfDeviation: 0, categories: {} };
    }

    // For now, return no deviation
    // In a full implementation, we'd analyze the last 5 days of logs
    return {
      hasDeviation: false,
      daysOfDeviation: 0,
      categories: {},
    };
  } catch (error) {
    logError('rhythmStorage.detectDeviation', error);
    return { hasDeviation: false, daysOfDeviation: 0, categories: {} };
  }
}
