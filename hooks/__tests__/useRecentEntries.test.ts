// ============================================================================
// useRecentEntries — UNIT TESTS
// Tests for exported pure functions: extractDetail, mapEventToEntry, maps
// (No renderHook — node environment, pure function testing only)
// ============================================================================

import {
  extractDetail,
  mapEventToEntry,
  EMOJI_MAP,
  LABEL_MAP,
  ROUTE_MAP,
  MOOD_LABELS,
  RecentEntry,
} from '../useRecentEntries';
import {
  LogEvent,
  LogEventType,
  MedDoseEvent,
  VitalsEvent,
  MoodEvent,
  MealEvent,
  HydrationEvent,
  SleepEvent,
  SymptomEvent,
  ActivityEvent,
  NoteEvent,
  AppointmentCompleteEvent,
} from '../../utils/logEvents';

// Mock dependencies that useRecentEntries imports (even though we only test pure fns)
jest.mock('../../utils/logEvents');
jest.mock('../../lib/events', () => ({
  useDataListener: jest.fn(),
}));
jest.mock('../../constants/microcopy', () => ({
  formatTimeAgo: jest.fn(() => '5m ago'),
}));

describe('useRecentEntries — pure functions', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2025-01-15T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ==========================================================================
  // extractDetail
  // ==========================================================================

  describe('extractDetail', () => {
    it('should format medDose taken', () => {
      const event: MedDoseEvent = {
        id: '1', type: 'medDose', timestamp: '2025-01-15T10:00:00.000Z', date: '2025-01-15',
        medicationId: 'med-1', medicationName: 'Aspirin', dosage: '100mg', taken: true,
      };
      expect(extractDetail(event)).toBe('Aspirin \u2014 100mg');
    });

    it('should format medDose skipped', () => {
      const event: MedDoseEvent = {
        id: '2', type: 'medDose', timestamp: '2025-01-15T10:00:00.000Z', date: '2025-01-15',
        medicationId: 'med-1', medicationName: 'Aspirin', dosage: '100mg', taken: false,
      };
      expect(extractDetail(event)).toBe('Aspirin \u2014 Skipped');
    });

    it('should format vitals with BP and HR', () => {
      const event: VitalsEvent = {
        id: '3', type: 'vitals', timestamp: '2025-01-15T10:00:00.000Z', date: '2025-01-15',
        systolic: 120, diastolic: 80, heartRate: 72,
      };
      expect(extractDetail(event)).toBe('BP: 120/80 \u00B7 HR: 72');
    });

    it('should format vitals with no values as fallback', () => {
      const event: VitalsEvent = {
        id: '4', type: 'vitals', timestamp: '2025-01-15T10:00:00.000Z', date: '2025-01-15',
      };
      expect(extractDetail(event)).toBe('Vitals logged');
    });

    it('should format meal with appetite', () => {
      const event: MealEvent = {
        id: '5', type: 'meal', timestamp: '2025-01-15T10:00:00.000Z', date: '2025-01-15',
        mealType: 'Breakfast', appetite: 'good',
      };
      expect(extractDetail(event)).toBe('Breakfast \u00B7 Appetite: good');
    });

    it('should format meal without appetite', () => {
      const event: MealEvent = {
        id: '5b', type: 'meal', timestamp: '2025-01-15T10:00:00.000Z', date: '2025-01-15',
        mealType: 'Lunch',
      };
      expect(extractDetail(event)).toBe('Lunch');
    });

    it('should format mood with label', () => {
      const event: MoodEvent = {
        id: '6', type: 'mood', timestamp: '2025-01-15T10:00:00.000Z', date: '2025-01-15',
        mood: 4,
      };
      expect(extractDetail(event)).toBe('Mood: Good');
    });

    it('should format hydration as glasses count', () => {
      const event: HydrationEvent = {
        id: '7', type: 'hydration', timestamp: '2025-01-15T10:00:00.000Z', date: '2025-01-15',
        glasses: 5,
      };
      expect(extractDetail(event)).toBe('5 glasses');
    });

    it('should format sleep with quality label', () => {
      const event: SleepEvent = {
        id: '8', type: 'sleep', timestamp: '2025-01-15T10:00:00.000Z', date: '2025-01-15',
        hours: 7, quality: 4,
      };
      expect(extractDetail(event)).toBe('7h \u00B7 Good');
    });

    it('should format symptom with severity', () => {
      const event: SymptomEvent = {
        id: '9', type: 'symptom', timestamp: '2025-01-15T10:00:00.000Z', date: '2025-01-15',
        symptoms: ['Headache', 'Nausea'], severity: 6,
      };
      expect(extractDetail(event)).toBe('Headache, Nausea \u00B7 Severity: 6/10');
    });

    it('should truncate long notes at 50 chars', () => {
      const longContent = 'This is a very long note that exceeds the fifty character limit for display';
      const event: NoteEvent = {
        id: '10', type: 'note', timestamp: '2025-01-15T10:00:00.000Z', date: '2025-01-15',
        content: longContent,
      };
      const result = extractDetail(event);
      expect(result).toHaveLength(51); // 50 chars + ellipsis
      expect(result).toContain('\u2026');
    });

    it('should not truncate short notes', () => {
      const event: NoteEvent = {
        id: '10b', type: 'note', timestamp: '2025-01-15T10:00:00.000Z', date: '2025-01-15',
        content: 'Short note',
      };
      expect(extractDetail(event)).toBe('Short note');
    });

    it('should format appointmentComplete as "Completed"', () => {
      const event: AppointmentCompleteEvent = {
        id: '11', type: 'appointmentComplete', timestamp: '2025-01-15T10:00:00.000Z', date: '2025-01-15',
        appointmentId: 'appt-1',
      };
      expect(extractDetail(event)).toBe('Completed');
    });
  });

  // ==========================================================================
  // mapEventToEntry
  // ==========================================================================

  describe('mapEventToEntry', () => {
    it('should map a meal event to a RecentEntry with correct fields', () => {
      const event: MealEvent = {
        id: 'meal-1', type: 'meal', timestamp: '2025-01-15T10:00:00.000Z', date: '2025-01-15',
        mealType: 'Breakfast',
      };

      const entry = mapEventToEntry(event, 'Today');

      expect(entry.id).toBe('meal-1');
      expect(entry.type).toBe('meal');
      expect(entry.emoji).toBe(EMOJI_MAP.meal);
      expect(entry.label).toBe('Meal');
      expect(entry.detail).toBe('Breakfast');
      expect(entry.route).toBe('/log-meal');
      expect(entry.dateGroup).toBe('Today');
      expect(entry.relativeTime).toBe('5m ago'); // from mock
    });

    it('should set dateGroup to Yesterday when specified', () => {
      const event: MealEvent = {
        id: 'meal-2', type: 'meal', timestamp: '2025-01-14T18:00:00.000Z', date: '2025-01-14',
        mealType: 'Dinner',
      };

      const entry = mapEventToEntry(event, 'Yesterday');
      expect(entry.dateGroup).toBe('Yesterday');
    });
  });

  // ==========================================================================
  // CONSTANT MAPS
  // ==========================================================================

  describe('constant maps', () => {
    const allTypes: LogEventType[] = [
      'medDose', 'vitals', 'mood', 'meal', 'hydration',
      'sleep', 'symptom', 'activity', 'note', 'appointmentComplete',
    ];

    it('EMOJI_MAP should have an entry for every LogEventType', () => {
      for (const type of allTypes) {
        expect(EMOJI_MAP[type]).toBeDefined();
        expect(typeof EMOJI_MAP[type]).toBe('string');
      }
    });

    it('LABEL_MAP should have an entry for every LogEventType', () => {
      for (const type of allTypes) {
        expect(LABEL_MAP[type]).toBeDefined();
        expect(typeof LABEL_MAP[type]).toBe('string');
      }
    });

    it('ROUTE_MAP should have an entry for every LogEventType', () => {
      for (const type of allTypes) {
        expect(ROUTE_MAP[type]).toBeDefined();
        expect(ROUTE_MAP[type]).toMatch(/^\//); // starts with /
      }
    });

    it('MOOD_LABELS should cover values 1-5', () => {
      expect(MOOD_LABELS[1]).toBe('Struggling');
      expect(MOOD_LABELS[2]).toBe('Difficult');
      expect(MOOD_LABELS[3]).toBe('Managing');
      expect(MOOD_LABELS[4]).toBe('Good');
      expect(MOOD_LABELS[5]).toBe('Great');
    });
  });
});
