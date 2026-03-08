// ============================================================================
// USER PATTERN STORAGE
// Stores user-defined quick action patterns and preferences
// ============================================================================

import { safeGetItem, safeSetItem } from './safeStorage';
import { logError } from './devLog';
import { StorageKeys } from './storageKeys';

export interface UserPattern {
  id: string;
  name: string;
  icon: string;
  timeRange?: { start: string; end: string }; // e.g., "06:00-10:00"
  includes: {
    vitals: boolean;
    medications: boolean;
    mood: boolean;
    notes: boolean;
  };
  defaults?: {
    systolic?: number;
    diastolic?: number;
    heartRate?: number;
    mood?: number;
    energy?: number;
    pain?: number;
  };
  frequency?: 'daily' | 'weekly' | 'asNeeded';
  lastUsed?: string;
  usageCount: number;
}

export interface UserPreferences {
  defaultSections: string[];
  collapsedByDefault: boolean;
  autoFillFromSchedule: boolean;
  showQuickActions: boolean;
}

const PATTERNS_KEY = StorageKeys.USER_PATTERNS;
const PREFERENCES_KEY = StorageKeys.USER_PREFERENCES;

// Default patterns provided for new users
const DEFAULT_PATTERNS: UserPattern[] = [
  {
    id: 'morning-routine',
    name: 'Morning Done',
    icon: '🌅',
    timeRange: { start: '05:00', end: '11:00' },
    includes: { vitals: true, medications: true, mood: true, notes: false },
    defaults: { mood: 7, energy: 3, pain: 0 },
    frequency: 'daily',
    usageCount: 0,
  },
  {
    id: 'evening-meds',
    name: 'Evening Meds',
    icon: '🌙',
    timeRange: { start: '17:00', end: '23:00' },
    includes: { vitals: false, medications: true, mood: true, notes: false },
    defaults: { mood: 6, energy: 2, pain: 0 },
    frequency: 'daily',
    usageCount: 0,
  },
  {
    id: 'vitals-only',
    name: 'Vitals Only',
    icon: '❤️',
    includes: { vitals: true, medications: false, mood: false, notes: false },
    frequency: 'asNeeded',
    usageCount: 0,
  },
  {
    id: 'feeling-check',
    name: 'Feeling Check',
    icon: '😊',
    includes: { vitals: false, medications: false, mood: true, notes: true },
    defaults: { mood: 7, energy: 3, pain: 0 },
    frequency: 'asNeeded',
    usageCount: 0,
  },
];

const DEFAULT_PREFERENCES: UserPreferences = {
  defaultSections: ['medications', 'vitals', 'mood', 'notes'],
  collapsedByDefault: true,
  autoFillFromSchedule: true,
  showQuickActions: true,
};

/**
 * Get all user patterns
 */
export async function getUserPatterns(): Promise<UserPattern[]> {
  try {
    const data = await safeGetItem<UserPattern[] | null>(PATTERNS_KEY, null);
    if (!data) {
      // Return default patterns for first-time users
      await safeSetItem(PATTERNS_KEY, DEFAULT_PATTERNS);
      return DEFAULT_PATTERNS;
    }
    return data;
  } catch (error) {
    logError('userPatternStorage.getUserPatterns', error);
    return DEFAULT_PATTERNS;
  }
}

/**
 * Create a new user pattern
 */
export async function createUserPattern(
  pattern: Omit<UserPattern, 'id' | 'usageCount'>
): Promise<UserPattern> {
  try {
    const patterns = await getUserPatterns();
    const newPattern: UserPattern = {
      ...pattern,
      id: `custom-${Date.now()}`,
      usageCount: 0,
    };
    patterns.push(newPattern);
    await safeSetItem(PATTERNS_KEY, patterns);
    return newPattern;
  } catch (error) {
    logError('userPatternStorage.createUserPattern', error);
    throw error;
  }
}

/**
 * Update pattern usage statistics
 */
export async function updatePatternUsage(patternId: string): Promise<void> {
  try {
    const patterns = await getUserPatterns();
    const index = patterns.findIndex(p => p.id === patternId);
    if (index !== -1) {
      patterns[index].usageCount += 1;
      patterns[index].lastUsed = new Date().toISOString();
      await safeSetItem(PATTERNS_KEY, patterns);
    }
  } catch (error) {
    logError('userPatternStorage.updatePatternUsage', error);
  }
}

/**
 * Get suggested patterns for the current time
 */
export async function suggestPatternsForTime(time: Date = new Date()): Promise<UserPattern[]> {
  try {
    const patterns = await getUserPatterns();
    const currentHour = time.getHours();
    const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;

    // Filter patterns that match the current time range
    const timeRelevant = patterns.filter(pattern => {
      if (!pattern.timeRange) return true;
      const { start, end } = pattern.timeRange;
      return currentTimeStr >= start && currentTimeStr <= end;
    });

    // Sort by usage count (most used first) and recency
    return timeRelevant.sort((a, b) => {
      // Prioritize time-specific patterns
      const aHasTime = a.timeRange ? 1 : 0;
      const bHasTime = b.timeRange ? 1 : 0;
      if (aHasTime !== bHasTime) return bHasTime - aHasTime;

      // Then by usage count
      return b.usageCount - a.usageCount;
    });
  } catch (error) {
    logError('userPatternStorage.suggestPatternsForTime', error);
    return [];
  }
}

/**
 * Get user preferences
 */
export async function getUserPreferences(): Promise<UserPreferences> {
  try {
    const data = await safeGetItem<UserPreferences | null>(PREFERENCES_KEY, null);
    if (!data) {
      await safeSetItem(PREFERENCES_KEY, DEFAULT_PREFERENCES);
      return DEFAULT_PREFERENCES;
    }
    return data;
  } catch (error) {
    logError('userPatternStorage.getUserPreferences', error);
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(
  updates: Partial<UserPreferences>
): Promise<UserPreferences> {
  try {
    const prefs = await getUserPreferences();
    const updated = { ...prefs, ...updates };
    await safeSetItem(PREFERENCES_KEY, updated);
    return updated;
  } catch (error) {
    logError('userPatternStorage.updateUserPreferences', error);
    throw error;
  }
}

/**
 * Delete a user pattern
 */
export async function deleteUserPattern(patternId: string): Promise<void> {
  try {
    const patterns = await getUserPatterns();
    const filtered = patterns.filter(p => p.id !== patternId);
    await safeSetItem(PATTERNS_KEY, filtered);
  } catch (error) {
    logError('userPatternStorage.deleteUserPattern', error);
    throw error;
  }
}
