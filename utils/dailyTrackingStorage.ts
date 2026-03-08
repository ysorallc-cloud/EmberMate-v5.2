// ============================================================================
// DAILY TRACKING STORAGE UTILITY
// Local AsyncStorage only - tracks hydration, mood, sleep
// Used for correlation detection
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeGetItem, safeSetItem } from './safeStorage';
import { logError } from './devLog';
import { toLocalDateString } from '../services/carePlanGenerator';

export interface DailyTrackingLog {
  date: string; // ISO format YYYY-MM-DD

  // Check-in data
  mood: number | null; // 1-10 scale (1=struggling, 10=great)
  energy: number | null; // 1-5 scale (1=exhausted, 5=energetic)

  // Sleep
  sleep: number | null; // Hours of sleep (0-24)
  sleepQuality: number | null; // 1-5 scale (1=very poor, 5=excellent)

  // Nutrition
  meals: {
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
  } | null;
  hydration: number | null; // Cups of water (0-20)

  // Symptoms
  symptoms: string[]; // Array of symptom names

  // Notes
  notes: string | null;
  tags: string[]; // ['good_day', 'concern_for_dr', etc.]

  // Clinical care details (optional)
  alertness?: string;
  bowelMovement?: string;
  bathingStatus?: string;
  mobilityStatus?: string;

  // Vitals summary (optional, for correlation)
  pain: number | null; // 0-10 scale
}

const STORAGE_KEY_PREFIX = '@daily_tracking_';

/**
 * Save daily tracking log
 */
export async function saveDailyTracking(
  date: string,
  trackingData: Partial<DailyTrackingLog>
): Promise<void> {
  try {
    const key = `${STORAGE_KEY_PREFIX}${date}`;
    const existing = await getDailyTracking(date);
    const updated = { ...existing, date, ...trackingData };
    await safeSetItem(key, updated);
  } catch (error) {
    logError('dailyTrackingStorage.saveDailyTracking', error);
    throw error;
  }
}

/**
 * Get daily tracking for a specific date
 */
export async function getDailyTracking(date: string): Promise<DailyTrackingLog | null> {
  try {
    const key = `${STORAGE_KEY_PREFIX}${date}`;
    return await safeGetItem<DailyTrackingLog | null>(key, null);
  } catch (error) {
    logError('dailyTrackingStorage.getDailyTracking', error);
    return null;
  }
}

/**
 * Get daily tracking logs for a date range
 */
export async function getDailyTrackingLogs(
  startDate: string,
  endDate: string
): Promise<DailyTrackingLog[]> {
  try {
    const logs: DailyTrackingLog[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = toLocalDateString(d);
      const log = await getDailyTracking(dateStr);
      if (log) {
        logs.push(log);
      }
    }
    
    return logs;
  } catch (error) {
    logError('dailyTrackingStorage.getDailyTrackingLogs', error);
    return [];
  }
}

/**
 * Delete daily tracking for a specific date
 */
export async function deleteDailyTracking(date: string): Promise<void> {
  try {
    const key = `${STORAGE_KEY_PREFIX}${date}`;
    await AsyncStorage.removeItem(key);
  } catch (error) {
    logError('dailyTrackingStorage.deleteDailyTracking', error);
    throw error;
  }
}
