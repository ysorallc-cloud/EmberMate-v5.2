// =============================================================================
// Task 2.3: Prove Date.now()-based IDs collide, then verify generateUniqueId fixes it
// =============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateUniqueId } from '../idGenerator';

// Mock the encryption layer to use plain AsyncStorage (avoids SecureStore mock issues)
jest.mock('../safeStorage', () => {
  const AsyncStorageMock = require('@react-native-async-storage/async-storage');
  return {
    ...jest.requireActual('../safeStorage'),
    encryptedGetRaw: async (key: string) => AsyncStorageMock.getItem(key),
    encryptedSetRaw: async (key: string, value: string) =>
      AsyncStorageMock.setItem(key, value),
  };
});

import {
  saveMedicationLog,
  getMedicationLogs,
  saveVitalsLog,
  getVitalsLogs,
} from '../centralStorage';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Task 2.3: ID collision prevention', () => {
  it('two rapid saveMedicationLog calls produce different IDs even when Date.now() returns the same value', async () => {
    const frozen = 1709000000000;
    jest.spyOn(Date, 'now').mockReturnValue(frozen);

    await saveMedicationLog({
      timestamp: new Date(frozen).toISOString(),
      medicationIds: ['med-a'],
    });

    await saveMedicationLog({
      timestamp: new Date(frozen).toISOString(),
      medicationIds: ['med-b'],
    });

    jest.restoreAllMocks();

    const logs = await getMedicationLogs();
    expect(logs.length).toBe(2);
    expect(logs[0].id).not.toBe(logs[1].id);
  });

  it('two rapid saveVitalsLog calls produce different IDs even when Date.now() returns the same value', async () => {
    const frozen = 1709000000000;
    jest.spyOn(Date, 'now').mockReturnValue(frozen);

    await saveVitalsLog({
      timestamp: new Date(frozen).toISOString(),
      systolic: 120,
      diastolic: 80,
    });

    await saveVitalsLog({
      timestamp: new Date(frozen).toISOString(),
      systolic: 130,
      diastolic: 85,
    });

    jest.restoreAllMocks();

    const logs = await getVitalsLogs();
    expect(logs.length).toBe(2);
    expect(logs[0].id).not.toBe(logs[1].id);
  });

  it('generateUniqueId includes a random suffix, not just Date.now()', () => {
    const frozen = 1709000000000;
    jest.spyOn(Date, 'now').mockReturnValue(frozen);

    const id = generateUniqueId();

    jest.restoreAllMocks();

    // Format: {timestamp}-{counter}{random5chars}
    expect(id).toMatch(/^\d+-[a-z0-9]+$/);
    // Must be longer than just the timestamp
    expect(id.length).toBeGreaterThan(frozen.toString().length);
    // The suffix after the dash should not be empty
    const suffix = id.split('-')[1];
    expect(suffix).toBeDefined();
    expect(suffix!.length).toBeGreaterThanOrEqual(6);
  });
});
