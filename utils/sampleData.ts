import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeGetItem, safeSetItem } from './safeStorage';
import { devLog, logError } from './devLog';
import { StorageKeys } from './storageKeys';

export interface SampleDataOptions {
  includeMeals?: boolean;
  includeSleep?: boolean;
  includeBathroom?: boolean;
  includeActivity?: boolean;
  includeHydration?: boolean;
  daysOfData?: number;
}

const generateTimestamp = (daysAgo: number, hour: number, minute: number = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

const generateSampleMeals = (days: number) => {
  const meals = [];
  const types = ['breakfast', 'lunch', 'dinner', 'snack'];
  const portions = ['small', 'medium', 'large'];

  for (let day = 0; day < days; day++) {
    // Morning
    meals.push({
      id: `meal-${day}-1`,
      type: types[Math.floor(Math.random() * types.length)],
      amount: portions[Math.floor(Math.random() * portions.length)],
      timestamp: generateTimestamp(day, 7, 30),
      notes: day === 0 ? 'Good appetite this morning' : undefined,
    });

    // Noon
    meals.push({
      id: `meal-${day}-2`,
      type: types[Math.floor(Math.random() * types.length)],
      amount: portions[Math.floor(Math.random() * portions.length)],
      timestamp: generateTimestamp(day, 12, 0),
    });

    // Evening
    meals.push({
      id: `meal-${day}-3`,
      type: types[Math.floor(Math.random() * types.length)],
      amount: portions[Math.floor(Math.random() * portions.length)],
      timestamp: generateTimestamp(day, 18, 30),
    });
  }

  return meals;
};

const generateSampleSleep = (days: number) => {
  const sleepSessions = [];

  for (let day = 0; day < days; day++) {
    // Night sleep
    sleepSessions.push({
      id: `sleep-${day}-1`,
      startTime: generateTimestamp(day, 20, 0),
      endTime: generateTimestamp(day, 6, 30),
      duration: 630, // minutes
      quality: Math.random() > 0.5 ? 'good' : 'fair',
      notes: day === 0 ? 'Slept through the night!' : undefined,
    });

    // Afternoon nap (every other day)
    if (day % 2 === 0) {
      sleepSessions.push({
        id: `sleep-${day}-2`,
        startTime: generateTimestamp(day, 14, 0),
        endTime: generateTimestamp(day, 15, 0),
        duration: 60,
        quality: 'fair',
      });
    }
  }

  return sleepSessions;
};

const generateSampleBathroom = (days: number) => {
  const bathroom = [];
  const types = ['normal', 'urgent'];

  for (let day = 0; day < days; day++) {
    // Generate 3-5 bathroom logs per day
    const changesPerDay = 3 + Math.floor(Math.random() * 3);

    for (let i = 0; i < changesPerDay; i++) {
      const hour = 6 + Math.floor((18 * i) / changesPerDay);
      bathroom.push({
        id: `bathroom-${day}-${i}`,
        type: types[Math.floor(Math.random() * types.length)],
        timestamp: generateTimestamp(day, hour, Math.floor(Math.random() * 60)),
      });
    }
  }

  return bathroom;
};

const generateSampleActivity = (days: number) => {
  const activities = [];
  const types = ['mobility', 'social', 'walk', 'bath'];
  const durations = [10, 15, 20, 30];

  for (let day = 0; day < days; day++) {
    // 2-3 activities per day
    const activitiesPerDay = 2 + Math.floor(Math.random() * 2);

    for (let i = 0; i < activitiesPerDay; i++) {
      const hour = 9 + Math.floor((8 * i) / activitiesPerDay);
      activities.push({
        id: `activity-${day}-${i}`,
        type: types[Math.floor(Math.random() * types.length)],
        duration: durations[Math.floor(Math.random() * durations.length)],
        timestamp: generateTimestamp(day, hour, 0),
        notes: i === 0 && day === 0 ? 'Really enjoyed this!' : undefined,
      });
    }
  }

  return activities;
};

const generateSampleHydration = (days: number) => {
  const hydration = [];

  for (let day = 0; day < days; day++) {
    // 4-6 hydration entries per day
    const entriesPerDay = 4 + Math.floor(Math.random() * 3);

    for (let i = 0; i < entriesPerDay; i++) {
      const hour = 8 + Math.floor((12 * i) / entriesPerDay);
      hydration.push({
        id: `hydration-${day}-${i}`,
        amount: 4 + Math.floor(Math.random() * 4), // 4-8 oz
        timestamp: generateTimestamp(day, hour, 0),
      });
    }
  }

  return hydration;
};

export const seedSampleData = async (options: SampleDataOptions = {}) => {
  const {
    includeMeals = true,
    includeSleep = true,
    includeBathroom = true,
    includeActivity = true,
    includeHydration = true,
    daysOfData = 3,
  } = options;

  try {
    const dataToStore: Record<string, any> = {};

    if (includeMeals) {
      dataToStore.meals = generateSampleMeals(daysOfData);
    }

    if (includeSleep) {
      dataToStore.sleep = generateSampleSleep(daysOfData);
    }

    if (includeBathroom) {
      dataToStore.bathroom = generateSampleBathroom(daysOfData);
    }

    if (includeActivity) {
      dataToStore.activities = generateSampleActivity(daysOfData);
    }

    if (includeHydration) {
      dataToStore.hydration = generateSampleHydration(daysOfData);
    }

    // Store each data type
    for (const [key, value] of Object.entries(dataToStore)) {
      await safeSetItem(`sample_${key}`, value);
    }

    // Mark that sample data has been seeded
    await safeSetItem('sample_data_seeded', 'true');

    devLog('Sample data seeded successfully');
    return true;
  } catch (error) {
    logError('sampleData.seedSampleData', error);
    return false;
  }
};

export const clearSampleData = async () => {
  try {
    const keys = ['meals', 'sleep', 'bathroom', 'activities', 'hydration'];
    const keysToRemove = keys.map(key => `sample_${key}`);
    keysToRemove.push('sample_data_seeded');

    await AsyncStorage.multiRemove(keysToRemove);
    devLog('Sample data cleared successfully');
    return true;
  } catch (error) {
    logError('sampleData.clearSampleData', error);
    return false;
  }
};

export const hasSampleData = async (): Promise<boolean> => {
  try {
    const seeded = await safeGetItem<string | null>('sample_data_seeded', null);
    return seeded === 'true';
  } catch (error) {
    logError('sampleData.hasSampleData', error);
    return false;
  }
};

export const isOnboardingComplete = async (): Promise<boolean> => {
  try {
    const completed = await safeGetItem<string | null>(StorageKeys.ONBOARDING_COMPLETE, null);
    return completed === 'true';
  } catch (error) {
    logError('sampleData.isOnboardingComplete', error);
    return false;
  }
};
