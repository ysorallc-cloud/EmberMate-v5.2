import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getWaterCountFromEvents,
  getMoodFromEvents,
  getVitalsFromEvents,
  getMealsFromEvents,
  getMedicationEventsForDate,
  getNotesFromEvents,
  getDayEventSummary,
} from '../../utils/eventAdapters';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('../../utils/safeStorage', () => ({
  safeGetItem: async (key: string, def: unknown) => {
    const raw = await require('@react-native-async-storage/async-storage').getItem(key);
    if (!raw) return def;
    try { return JSON.parse(raw); } catch { return def; }
  },
  safeSetItem: async (key: string, val: unknown) => {
    await require('@react-native-async-storage/async-storage').setItem(key, JSON.stringify(val));
    return true;
  },
}));

jest.mock('../../utils/devLog', () => ({ logError: jest.fn() }));

describe('Step 1D: Event read adapters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  test('getWaterCountFromEvents returns 0 when no events', async () => {
    const result = await getWaterCountFromEvents('2026-03-12');
    expect(result).toBe(0);
  });

  test('getWaterCountFromEvents returns latest glass count', async () => {
    const events = [
      { id: 'e1', type: 'hydration_logged', timestamp: '2026-03-12T08:00:00Z',
        patientId: 'default', value: 3, createdAt: '2026-03-12T08:00:00Z' },
      { id: 'e2', type: 'hydration_logged', timestamp: '2026-03-12T12:00:00Z',
        patientId: 'default', value: 5, createdAt: '2026-03-12T12:00:00Z' },
    ];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(events));
    const result = await getWaterCountFromEvents('2026-03-12');
    expect(result).toBe(5);
  });

  test('getMoodFromEvents returns null when no events', async () => {
    const result = await getMoodFromEvents('2026-03-12');
    expect(result).toBeNull();
  });

  test('getMoodFromEvents returns latest mood', async () => {
    const events = [
      { id: 'e1', type: 'mood_logged', timestamp: '2026-03-12T09:00:00Z',
        patientId: 'default', value: 4, metadata: { label: 'Good' },
        createdAt: '2026-03-12T09:00:00Z' },
    ];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(events));
    const result = await getMoodFromEvents('2026-03-12');
    expect(result).toEqual({ score: 4, label: 'Good' });
  });

  test('getDayEventSummary counts by type', async () => {
    const events = [
      { id: 'e1', type: 'medication_taken', timestamp: '2026-03-12T08:00:00Z',
        patientId: 'default', createdAt: '2026-03-12T08:00:00Z' },
      { id: 'e2', type: 'medication_taken', timestamp: '2026-03-12T12:00:00Z',
        patientId: 'default', createdAt: '2026-03-12T12:00:00Z' },
      { id: 'e3', type: 'meal_logged', timestamp: '2026-03-12T12:30:00Z',
        patientId: 'default', createdAt: '2026-03-12T12:30:00Z' },
    ];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(events));
    const summary = await getDayEventSummary('2026-03-12');
    expect(summary.medication_taken).toBe(2);
    expect(summary.meal_logged).toBe(1);
  });

  test('getMedicationEventsForDate returns both taken and skipped', async () => {
    const events = [
      { id: 'e1', type: 'medication_taken', timestamp: '2026-03-12T08:00:00Z',
        patientId: 'default', metadata: { medicationName: 'Metformin' },
        createdAt: '2026-03-12T08:00:00Z' },
      { id: 'e2', type: 'medication_skipped', timestamp: '2026-03-12T20:00:00Z',
        patientId: 'default', metadata: { medicationName: 'Aspirin' },
        createdAt: '2026-03-12T20:00:00Z' },
      { id: 'e3', type: 'meal_logged', timestamp: '2026-03-12T12:00:00Z',
        patientId: 'default', createdAt: '2026-03-12T12:00:00Z' },
    ];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(events));
    const result = await getMedicationEventsForDate('2026-03-12');
    expect(result).toHaveLength(2);
    expect(result.map((e: any) => e.type)).toEqual([
      'medication_taken', 'medication_skipped'
    ]);
  });
});
