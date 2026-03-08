// ============================================================================
// Task 1.1: Verify that get*Logs functions NEVER mutate storage on error
// A read path must never destroy data — it should return [] and log the error.
// ============================================================================

import { encryptedGetRaw, encryptedSetRaw } from '../safeStorage';

jest.mock('../safeStorage', () => ({
  encryptedGetRaw: jest.fn(),
  encryptedSetRaw: jest.fn(),
}));

jest.mock('../devLog', () => ({
  logError: jest.fn(),
  devLog: jest.fn(),
}));

const mockedGetRaw = encryptedGetRaw as jest.MockedFunction<typeof encryptedGetRaw>;
const mockedSetRaw = encryptedSetRaw as jest.MockedFunction<typeof encryptedSetRaw>;

// Import after mocking
import {
  getVitalsLogs,
  getMedicationLogs,
  getMoodLogs,
  getSymptomLogs,
  getSleepLogs,
  getMealsLogs,
  getWaterLogs,
  getNotesLogs,
} from '../centralStorage';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Task 1.1: No silent data destruction in getter functions', () => {
  // ---- getVitalsLogs (the known-destructive one) ----

  describe('getVitalsLogs', () => {
    it('returns [] on encryptedGetRaw error WITHOUT calling encryptedSetRaw', async () => {
      mockedGetRaw.mockRejectedValueOnce(new Error('Transient OOM'));

      const result = await getVitalsLogs();

      expect(result).toEqual([]);
      expect(mockedSetRaw).not.toHaveBeenCalled();
    });

    it('returns [] on JSON.parse error WITHOUT calling encryptedSetRaw', async () => {
      mockedGetRaw.mockResolvedValueOnce('not valid json {{{');

      const result = await getVitalsLogs();

      expect(result).toEqual([]);
      expect(mockedSetRaw).not.toHaveBeenCalled();
    });

    it('returns valid data on success', async () => {
      const vitals = [{ id: '1', timestamp: '2026-02-28T10:00:00Z', systolic: 120, diastolic: 80 }];
      mockedGetRaw.mockResolvedValueOnce(JSON.stringify(vitals));

      const result = await getVitalsLogs();

      expect(result).toEqual(vitals);
      expect(mockedSetRaw).not.toHaveBeenCalled();
    });
  });

  // ---- All 8 getter functions: non-destructive error handling ----

  const getterFunctions = [
    { name: 'getMedicationLogs', fn: getMedicationLogs },
    { name: 'getVitalsLogs', fn: getVitalsLogs },
    { name: 'getMoodLogs', fn: getMoodLogs },
    { name: 'getSymptomLogs', fn: getSymptomLogs },
    { name: 'getSleepLogs', fn: getSleepLogs },
    { name: 'getMealsLogs', fn: getMealsLogs },
    { name: 'getWaterLogs', fn: getWaterLogs },
    { name: 'getNotesLogs', fn: getNotesLogs },
  ];

  describe.each(getterFunctions)('$name', ({ fn }) => {
    it('returns [] on storage read error without any storage mutation', async () => {
      mockedGetRaw.mockRejectedValueOnce(new Error('Disk I/O failure'));

      const result = await fn();

      expect(result).toEqual([]);
      expect(mockedSetRaw).not.toHaveBeenCalled();
    });

    it('returns [] on JSON.parse error without any storage mutation', async () => {
      mockedGetRaw.mockResolvedValueOnce('corrupted!!!');

      const result = await fn();

      expect(result).toEqual([]);
      expect(mockedSetRaw).not.toHaveBeenCalled();
    });

    it('returns [] when storage returns null', async () => {
      mockedGetRaw.mockResolvedValueOnce(null);

      const result = await fn();

      expect(result).toEqual([]);
      expect(mockedSetRaw).not.toHaveBeenCalled();
    });
  });
});
