import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveEvent,
  getEventsByDate,
  getEventsByType,
  getEventsByDateRange,
  deleteEvent,
  getEventSummaries,
} from '../storage/eventRepo';
import type { CareEvent, EventType } from '../types/event';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock safeStorage to match real signatures: safeGetItem returns parsed JSON, safeSetItem auto-stringifies
jest.mock('../utils/safeStorage', () => ({
  safeGetItem: async (key: string, defaultValue: unknown) => {
    const raw = await require('@react-native-async-storage/async-storage').getItem(key);
    if (!raw) return defaultValue;
    try { return JSON.parse(raw); } catch { return defaultValue; }
  },
  safeSetItem: async (key: string, val: unknown) => {
    await require('@react-native-async-storage/async-storage').setItem(key, JSON.stringify(val));
    return true;
  },
}));

jest.mock('../utils/devLog', () => ({
  logError: jest.fn(),
}));

describe('Event Repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('saveEvent', () => {
    test('saves event and returns it with id and createdAt', async () => {
      const event = {
        type: 'medication_taken' as EventType,
        timestamp: '2026-03-08T08:00:00Z',
        patientId: 'default',
        status: 'completed' as const,
        metadata: { medicationName: 'Metformin' },
        source: 'quick_log' as const,
      };

      const result = await saveEvent(event);

      expect(result.id).toBeTruthy();
      expect(result.id).toMatch(/^evt_/);
      expect(result.createdAt).toBeTruthy();
      expect(result.type).toBe('medication_taken');
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    test('appends to existing events for the same day', async () => {
      const existing = [{
        id: 'evt_existing',
        type: 'hydration_logged',
        timestamp: '2026-03-08T07:00:00Z',
        patientId: 'default',
        createdAt: '2026-03-08T07:00:00Z',
      }];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existing));

      await saveEvent({
        type: 'medication_taken' as EventType,
        timestamp: '2026-03-08T09:00:00Z',
        patientId: 'default',
      });

      const setCall = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const saved = JSON.parse(setCall[1]);
      expect(saved).toHaveLength(2);
    });
  });

  describe('getEventsByDate', () => {
    test('returns empty array when no events', async () => {
      const result = await getEventsByDate('2026-03-08', 'default');
      expect(result).toEqual([]);
    });

    test('returns stored events', async () => {
      const events = [
        { id: 'e1', type: 'medication_taken', timestamp: '2026-03-08T08:00:00Z', patientId: 'default', createdAt: '2026-03-08T08:00:00Z' },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(events));

      const result = await getEventsByDate('2026-03-08', 'default');
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('medication_taken');
    });
  });

  describe('getEventsByDateRange', () => {
    test('queries multiple days', async () => {
      const day1 = [{ id: 'e1', type: 'medication_taken', timestamp: '2026-03-07T08:00:00Z', patientId: 'default', createdAt: '2026-03-07T08:00:00Z' }];
      const day2 = [{ id: 'e2', type: 'meal_logged', timestamp: '2026-03-08T12:00:00Z', patientId: 'default', createdAt: '2026-03-08T12:00:00Z' }];

      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify(day1))
        .mockResolvedValueOnce(JSON.stringify(day2));

      const result = await getEventsByDateRange('2026-03-07', '2026-03-08', 'default');
      expect(result).toHaveLength(2);
      expect(result[0].timestamp < result[1].timestamp).toBe(true);
    });
  });

  describe('getEventsByType', () => {
    test('filters by event type', async () => {
      const events = [
        { id: 'e1', type: 'medication_taken', timestamp: '2026-03-08T08:00:00Z', patientId: 'default', createdAt: '2026-03-08T08:00:00Z' },
        { id: 'e2', type: 'meal_logged', timestamp: '2026-03-08T12:00:00Z', patientId: 'default', createdAt: '2026-03-08T12:00:00Z' },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(events));

      const result = await getEventsByType(['medication_taken'], '2026-03-08', '2026-03-08', 'default');
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('medication_taken');
    });
  });

  describe('deleteEvent', () => {
    test('removes event by ID', async () => {
      const events = [
        { id: 'e1', type: 'medication_taken', timestamp: '2026-03-08T08:00:00Z', patientId: 'default', createdAt: '2026-03-08T08:00:00Z' },
        { id: 'e2', type: 'meal_logged', timestamp: '2026-03-08T12:00:00Z', patientId: 'default', createdAt: '2026-03-08T12:00:00Z' },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(events));

      const result = await deleteEvent('e1', '2026-03-08', 'default');
      expect(result).toBe(true);

      const setCall = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const remaining = JSON.parse(setCall[1]);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe('e2');
    });

    test('returns false when event not found', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([]));
      const result = await deleteEvent('nonexistent', '2026-03-08', 'default');
      expect(result).toBe(false);
    });
  });
});
