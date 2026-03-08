// ============================================================================
// SMART DEFAULTS ENGINE
// Provides intelligent defaults for quick check-in based on patterns and history
// ============================================================================

import { getMedications, Medication } from './medicationStorage';
import { getVitalsForDate, VitalReading } from './vitalsStorage';
import { getDailyTracking } from './dailyTrackingStorage';
import { UserPattern, suggestPatternsForTime } from './userPatternStorage';
import { logError } from './devLog';
import { getTodayDateString } from '../services/carePlanGenerator';

export interface CheckinDefaults {
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
  temperature?: number;
  mood: number;
  energy: number;
  pain: number;
  selectedMeds: string[];
}

export interface SectionSuggestion {
  section: string;
  shouldExpand: boolean;
  reason: string;
}

interface CheckinContext {
  timeOfDay: string;
  dayOfWeek: string;
  lastCheckIn?: Date;
}

/**
 * Get medications scheduled for a specific time slot
 */
export async function getScheduledMedications(
  timeSlot?: 'morning' | 'afternoon' | 'evening' | 'bedtime'
): Promise<Medication[]> {
  try {
    const meds = await getMedications();
    const activeMeds = meds.filter(m => m.active && !m.taken);

    if (!timeSlot) return activeMeds;

    return activeMeds.filter(m => m.timeSlot === timeSlot);
  } catch (error) {
    logError('smartDefaultsEngine.getScheduledMedications', error);
    return [];
  }
}

/**
 * Get the current time slot based on hour
 */
export function getCurrentTimeSlot(): 'morning' | 'afternoon' | 'evening' | 'bedtime' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'bedtime';
}

/**
 * Get recent vitals for pre-filling
 */
export async function getRecentVitals(): Promise<Partial<CheckinDefaults>> {
  try {
    const today = getTodayDateString();
    const vitals = await getVitalsForDate(today);

    const result: Partial<CheckinDefaults> = {};

    // Get most recent of each type
    const systolic = vitals.find(v => v.type === 'systolic');
    const diastolic = vitals.find(v => v.type === 'diastolic');
    const heartRate = vitals.find(v => v.type === 'heartRate');

    if (systolic) result.systolic = systolic.value;
    if (diastolic) result.diastolic = diastolic.value;
    if (heartRate) result.heartRate = heartRate.value;

    return result;
  } catch (error) {
    logError('smartDefaultsEngine.getRecentVitals', error);
    return {};
  }
}

/**
 * Get smart defaults for a check-in based on context
 */
export async function getDefaultsForCheckIn(
  context: CheckinContext
): Promise<CheckinDefaults> {
  const defaults: CheckinDefaults = {
    mood: 7,
    energy: 3,
    pain: 0,
    selectedMeds: [],
  };

  try {
    // Get medications for current time slot
    const timeSlot = getCurrentTimeSlot();
    const meds = await getScheduledMedications(timeSlot);
    defaults.selectedMeds = meds.map(m => m.id);

    // Get recent vitals for pre-fill (if available)
    const recentVitals = await getRecentVitals();
    if (recentVitals.systolic) defaults.systolic = recentVitals.systolic;
    if (recentVitals.diastolic) defaults.diastolic = recentVitals.diastolic;
    if (recentVitals.heartRate) defaults.heartRate = recentVitals.heartRate;

    // Adjust defaults based on time of day
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 10) {
      // Morning: higher energy, neutral mood
      defaults.energy = 3;
      defaults.mood = 7;
    } else if (hour >= 14 && hour < 17) {
      // Afternoon slump
      defaults.energy = 2;
      defaults.mood = 6;
    } else if (hour >= 20) {
      // Evening: lower energy
      defaults.energy = 2;
      defaults.mood = 6;
    }

    return defaults;
  } catch (error) {
    logError('smartDefaultsEngine.getDefaultsForCheckIn', error);
    return defaults;
  }
}

/**
 * Get defaults for a specific pattern
 */
export async function getDefaultsForPattern(
  pattern: UserPattern
): Promise<CheckinDefaults> {
  const defaults: CheckinDefaults = {
    mood: pattern.defaults?.mood ?? 7,
    energy: pattern.defaults?.energy ?? 3,
    pain: pattern.defaults?.pain ?? 0,
    selectedMeds: [],
  };

  try {
    // Get medications if pattern includes them
    if (pattern.includes.medications) {
      const timeSlot = getCurrentTimeSlot();
      const meds = await getScheduledMedications(timeSlot);
      defaults.selectedMeds = meds.map(m => m.id);
    }

    // Get vitals if pattern includes them
    if (pattern.includes.vitals) {
      const recentVitals = await getRecentVitals();
      if (recentVitals.systolic) defaults.systolic = recentVitals.systolic;
      if (recentVitals.diastolic) defaults.diastolic = recentVitals.diastolic;
      if (recentVitals.heartRate) defaults.heartRate = recentVitals.heartRate;
    }

    return defaults;
  } catch (error) {
    logError('smartDefaultsEngine.getDefaultsForPattern', error);
    return defaults;
  }
}

/**
 * Determine which sections should be expanded based on context
 */
export async function getSuggestedSections(
  context: CheckinContext
): Promise<SectionSuggestion[]> {
  const suggestions: SectionSuggestion[] = [];

  try {
    const timeSlot = getCurrentTimeSlot();
    const meds = await getScheduledMedications(timeSlot);

    // Always suggest medications if there are pending ones
    if (meds.length > 0) {
      suggestions.push({
        section: 'medications',
        shouldExpand: true,
        reason: `${meds.length} medication${meds.length > 1 ? 's' : ''} due`,
      });
    }

    // Suggest vitals in the morning
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 10) {
      suggestions.push({
        section: 'vitals',
        shouldExpand: true,
        reason: 'Morning vitals recommended',
      });
    }

    // Suggest mood check in the evening
    if (hour >= 18 && hour < 22) {
      suggestions.push({
        section: 'mood',
        shouldExpand: true,
        reason: 'End of day reflection',
      });
    }

    return suggestions;
  } catch (error) {
    logError('smartDefaultsEngine.getSuggestedSections', error);
    return [];
  }
}

/**
 * Get the best suggested pattern for the current time
 */
export async function getSuggestedPattern(): Promise<UserPattern | null> {
  try {
    const patterns = await suggestPatternsForTime(new Date());
    return patterns.length > 0 ? patterns[0] : null;
  } catch (error) {
    logError('smartDefaultsEngine.getSuggestedPattern', error);
    return null;
  }
}

/**
 * Get pending medication count for display
 */
export async function getPendingMedicationCount(): Promise<number> {
  try {
    const meds = await getMedications();
    return meds.filter(m => m.active && !m.taken).length;
  } catch (error) {
    logError('smartDefaultsEngine.getPendingMedicationCount', error);
    return 0;
  }
}

/**
 * Check if vitals have been logged today
 */
export async function hasLoggedVitalsToday(): Promise<boolean> {
  try {
    const today = getTodayDateString();
    const vitals = await getVitalsForDate(today);
    return vitals.length > 0;
  } catch (error) {
    logError('smartDefaultsEngine.hasLoggedVitalsToday', error);
    return false;
  }
}

/**
 * Check if mood has been logged today
 */
export async function hasLoggedMoodToday(): Promise<boolean> {
  try {
    const today = getTodayDateString();
    const tracking = await getDailyTracking(today);
    return tracking?.mood !== null && tracking?.mood !== undefined;
  } catch (error) {
    logError('smartDefaultsEngine.hasLoggedMoodToday', error);
    return false;
  }
}
