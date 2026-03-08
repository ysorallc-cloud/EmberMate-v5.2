// ============================================================================
// CAREGIVER WELLNESS STORAGE
// Non-PHI storage for caregiver self-check data
// Keys use @embermate_caregiver_ prefix (separate from patient data)
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logError } from './devLog';
import { getTodayDateString } from '../services/carePlanGenerator';

const KEY_PREFIX = '@embermate_caregiver_wellness_';

export interface CaregiverDailyCheck {
  date: string; // YYYY-MM-DD
  sleep: number; // 1-5
  stress: number; // 1-5
  meals: number; // 1-5
  timestamp: string; // ISO
}

/**
 * Save a daily caregiver wellness check
 */
export async function saveDailyCheck(check: Omit<CaregiverDailyCheck, 'timestamp'>): Promise<void> {
  try {
    const data: CaregiverDailyCheck = {
      ...check,
      timestamp: new Date().toISOString(),
    };
    await AsyncStorage.setItem(`${KEY_PREFIX}${check.date}`, JSON.stringify(data));
  } catch (error) {
    logError('caregiverWellnessStorage.saveDailyCheck', error);
  }
}

/**
 * Get daily checks for the last N days
 */
export async function getDailyChecks(days: number = 14): Promise<CaregiverDailyCheck[]> {
  try {
    const checks: CaregiverDailyCheck[] = [];
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const stored = await AsyncStorage.getItem(`${KEY_PREFIX}${dateStr}`);
      if (stored) {
        checks.push(JSON.parse(stored));
      }
    }

    return checks.sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    logError('caregiverWellnessStorage.getDailyChecks', error);
    return [];
  }
}

/**
 * Get today's check if it exists
 */
export async function getTodayCheck(): Promise<CaregiverDailyCheck | null> {
  try {
    const today = getTodayDateString();
    const stored = await AsyncStorage.getItem(`${KEY_PREFIX}${today}`);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    logError('caregiverWellnessStorage.getTodayCheck', error);
    return null;
  }
}

/**
 * Get caregiver wellness trend over N days
 */
export async function getCaregiverTrend(days: number = 7): Promise<{
  avgSleep: number;
  avgStress: number;
  avgMeals: number;
  dataPoints: number;
}> {
  const checks = await getDailyChecks(days);
  if (checks.length === 0) {
    return { avgSleep: 0, avgStress: 0, avgMeals: 0, dataPoints: 0 };
  }

  const sum = checks.reduce(
    (acc, c) => ({
      sleep: acc.sleep + c.sleep,
      stress: acc.stress + c.stress,
      meals: acc.meals + c.meals,
    }),
    { sleep: 0, stress: 0, meals: 0 }
  );

  return {
    avgSleep: Math.round((sum.sleep / checks.length) * 10) / 10,
    avgStress: Math.round((sum.stress / checks.length) * 10) / 10,
    avgMeals: Math.round((sum.meals / checks.length) * 10) / 10,
    dataPoints: checks.length,
  };
}
