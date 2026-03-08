// ============================================================================
// NOW HELPERS UNIT TESTS
// Pure utility functions used by Now dashboard, CurrentBlockCard, TimelineSection
// ============================================================================

import {
  formatTime,
  isOverdue,
  isFuture,
  parseTimeForDisplay,
  getTimeWindow,
  getCurrentTimeWindow,
  getTimeWindowDisplayRange,
  groupByTimeWindow,
  getRouteForInstanceType,
  TIME_WINDOW_HOURS,
  OVERDUE_GRACE_MINUTES,
  type TimeWindow,
} from '../nowHelpers';

// ============================================================================
// formatTime
// ============================================================================

describe('formatTime', () => {
  it('should convert 24hr morning time to 12hr', () => {
    expect(formatTime('08:00')).toBe('8:00 AM');
    expect(formatTime('09:30')).toBe('9:30 AM');
  });

  it('should convert 24hr afternoon time to 12hr', () => {
    expect(formatTime('13:00')).toBe('1:00 PM');
    expect(formatTime('14:45')).toBe('2:45 PM');
  });

  it('should handle midnight as 12:00 AM', () => {
    expect(formatTime('00:00')).toBe('12:00 AM');
  });

  it('should handle noon as 12:00 PM', () => {
    expect(formatTime('12:00')).toBe('12:00 PM');
  });

  it('should handle edge time 23:59', () => {
    expect(formatTime('23:59')).toBe('11:59 PM');
  });

  it('should return fallback for invalid input', () => {
    expect(formatTime('')).toBe('Time not set');
    expect(formatTime('abc')).toBe('Time not set');
    expect(formatTime('25:00')).toBe('Time not set');
    expect(formatTime('-1:00')).toBe('Time not set');
  });

  it('should return fallback for null/undefined', () => {
    expect(formatTime(null as any)).toBe('Time not set');
    expect(formatTime(undefined as any)).toBe('Time not set');
  });
});

// ============================================================================
// isOverdue
// ============================================================================

describe('isOverdue', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2025-06-15T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return true when scheduled time + grace period is past', () => {
    // Scheduled at 9:00, grace 30min → overdue after 9:30. Now is 10:00.
    expect(isOverdue('2025-06-15T09:00:00.000Z')).toBe(true);
  });

  it('should return false when within grace period', () => {
    // Scheduled at 9:45, grace 30min → overdue after 10:15. Now is 10:00.
    expect(isOverdue('2025-06-15T09:45:00.000Z')).toBe(false);
  });

  it('should return false for future scheduled time', () => {
    expect(isOverdue('2025-06-15T11:00:00.000Z')).toBe(false);
  });

  it('should respect custom grace minutes', () => {
    // Scheduled at 9:50, custom grace 5min → overdue after 9:55. Now is 10:00.
    expect(isOverdue('2025-06-15T09:50:00.000Z', 5)).toBe(true);
    // Scheduled at 9:50, custom grace 15min → overdue after 10:05. Now is 10:00.
    expect(isOverdue('2025-06-15T09:50:00.000Z', 15)).toBe(false);
  });

  it('should return false for empty or invalid input', () => {
    expect(isOverdue('')).toBe(false);
    expect(isOverdue('not-a-date')).toBe(false);
  });

  it('should use default grace period of OVERDUE_GRACE_MINUTES', () => {
    expect(OVERDUE_GRACE_MINUTES).toBe(30);
  });
});

// ============================================================================
// isFuture
// ============================================================================

describe('isFuture', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2025-06-15T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return true for future time', () => {
    expect(isFuture('2025-06-15T11:00:00.000Z')).toBe(true);
  });

  it('should return false for past time', () => {
    expect(isFuture('2025-06-15T09:00:00.000Z')).toBe(false);
  });

  it('should return false for empty/invalid input', () => {
    expect(isFuture('')).toBe(false);
    expect(isFuture('invalid')).toBe(false);
  });
});

// ============================================================================
// parseTimeForDisplay
// ============================================================================

describe('parseTimeForDisplay', () => {
  it('should parse ISO timestamp to display format', () => {
    const result = parseTimeForDisplay('2025-06-15T08:30:00.000Z');
    // Result depends on timezone, but should not be null
    expect(result).not.toBeNull();
    expect(result).toContain(':');
  });

  it('should parse HH:mm format', () => {
    expect(parseTimeForDisplay('08:00')).toBe('8:00 AM');
    expect(parseTimeForDisplay('14:30')).toBe('2:30 PM');
  });

  it('should return null for invalid input', () => {
    expect(parseTimeForDisplay('')).toBeNull();
    expect(parseTimeForDisplay(null as any)).toBeNull();
    expect(parseTimeForDisplay(undefined as any)).toBeNull();
  });

  it('should return null for invalid ISO date', () => {
    expect(parseTimeForDisplay('2025-13-45T99:99:99.000Z')).toBeNull();
  });
});

// ============================================================================
// getTimeWindow
// ============================================================================

describe('getTimeWindow', () => {
  // Note: getTimeWindow uses date.getHours() which returns LOCAL time.
  // Use strings without 'Z' suffix so they are parsed as local time.

  it('should return morning for 5:00–11:59', () => {
    expect(getTimeWindow('2025-06-15T05:00:00')).toBe('morning');
    expect(getTimeWindow('2025-06-15T08:00:00')).toBe('morning');
    expect(getTimeWindow('2025-06-15T11:59:00')).toBe('morning');
  });

  it('should return afternoon for 12:00–16:59', () => {
    expect(getTimeWindow('2025-06-15T12:00:00')).toBe('afternoon');
    expect(getTimeWindow('2025-06-15T14:00:00')).toBe('afternoon');
    expect(getTimeWindow('2025-06-15T16:59:00')).toBe('afternoon');
  });

  it('should return evening for 17:00–20:59', () => {
    expect(getTimeWindow('2025-06-15T17:00:00')).toBe('evening');
    expect(getTimeWindow('2025-06-15T20:00:00')).toBe('evening');
  });

  it('should return night for 21:00–4:59', () => {
    expect(getTimeWindow('2025-06-15T21:00:00')).toBe('night');
    expect(getTimeWindow('2025-06-15T23:59:00')).toBe('night');
    expect(getTimeWindow('2025-06-15T02:00:00')).toBe('night');
  });

  it('should return morning for invalid date', () => {
    expect(getTimeWindow('invalid')).toBe('morning');
  });
});

// ============================================================================
// getCurrentTimeWindow
// ============================================================================

describe('getCurrentTimeWindow', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return morning at 8 AM', () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-06-15T08:00:00'));
    expect(getCurrentTimeWindow()).toBe('morning');
  });

  it('should return afternoon at 2 PM', () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-06-15T14:00:00'));
    expect(getCurrentTimeWindow()).toBe('afternoon');
  });

  it('should return evening at 6 PM', () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-06-15T18:00:00'));
    expect(getCurrentTimeWindow()).toBe('evening');
  });

  it('should return night at 10 PM', () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-06-15T22:00:00'));
    expect(getCurrentTimeWindow()).toBe('night');
  });
});

// ============================================================================
// getTimeWindowDisplayRange
// ============================================================================

describe('getTimeWindowDisplayRange', () => {
  it('should format morning range', () => {
    expect(getTimeWindowDisplayRange('morning')).toBe('5:00 AM \u2013 12:00 PM');
  });

  it('should format afternoon range', () => {
    expect(getTimeWindowDisplayRange('afternoon')).toBe('12:00 PM \u2013 5:00 PM');
  });

  it('should format evening range', () => {
    expect(getTimeWindowDisplayRange('evening')).toBe('5:00 PM \u2013 9:00 PM');
  });

  it('should format night range', () => {
    expect(getTimeWindowDisplayRange('night')).toBe('9:00 PM \u2013 5:00 AM');
  });
});

// ============================================================================
// groupByTimeWindow
// ============================================================================

describe('groupByTimeWindow', () => {
  // Note: Uses local-time strings (no Z suffix) since getTimeWindow uses getHours()

  it('should group instances into correct time windows', () => {
    const instances = [
      { id: '1', scheduledTime: '2025-06-15T08:00:00', itemName: 'Morning Med' },
      { id: '2', scheduledTime: '2025-06-15T13:00:00', itemName: 'Lunch' },
      { id: '3', scheduledTime: '2025-06-15T18:00:00', itemName: 'Dinner' },
      { id: '4', scheduledTime: '2025-06-15T22:00:00', itemName: 'Night Med' },
    ];

    const grouped = groupByTimeWindow(instances);

    expect(grouped.morning).toHaveLength(1);
    expect(grouped.morning[0].itemName).toBe('Morning Med');
    expect(grouped.afternoon).toHaveLength(1);
    expect(grouped.afternoon[0].itemName).toBe('Lunch');
    expect(grouped.evening).toHaveLength(1);
    expect(grouped.evening[0].itemName).toBe('Dinner');
    expect(grouped.night).toHaveLength(1);
    expect(grouped.night[0].itemName).toBe('Night Med');
  });

  it('should sort items within each window by scheduled time', () => {
    const instances = [
      { id: '1', scheduledTime: '2025-06-15T10:00:00', itemName: 'Late Morning' },
      { id: '2', scheduledTime: '2025-06-15T07:00:00', itemName: 'Early Morning' },
      { id: '3', scheduledTime: '2025-06-15T08:30:00', itemName: 'Mid Morning' },
    ];

    const grouped = groupByTimeWindow(instances);

    expect(grouped.morning).toHaveLength(3);
    expect(grouped.morning[0].itemName).toBe('Early Morning');
    expect(grouped.morning[1].itemName).toBe('Mid Morning');
    expect(grouped.morning[2].itemName).toBe('Late Morning');
  });

  it('should return empty arrays for windows with no items', () => {
    const grouped = groupByTimeWindow([]);

    expect(grouped.morning).toEqual([]);
    expect(grouped.afternoon).toEqual([]);
    expect(grouped.evening).toEqual([]);
    expect(grouped.night).toEqual([]);
  });

  it('should handle multiple items in same window', () => {
    const instances = [
      { id: '1', scheduledTime: '2025-06-15T08:00:00', itemName: 'Med A' },
      { id: '2', scheduledTime: '2025-06-15T08:00:00', itemName: 'Vitals' },
      { id: '3', scheduledTime: '2025-06-15T09:00:00', itemName: 'Med B' },
    ];

    const grouped = groupByTimeWindow(instances);
    expect(grouped.morning).toHaveLength(3);
  });
});

// ============================================================================
// getRouteForInstanceType
// ============================================================================

describe('getRouteForInstanceType', () => {
  it('should map known item types to correct routes', () => {
    expect(getRouteForInstanceType('medication')).toBe('/medication-confirm');
    expect(getRouteForInstanceType('vitals')).toBe('/log-vitals');
    expect(getRouteForInstanceType('nutrition')).toBe('/log-meal');
    expect(getRouteForInstanceType('mood')).toBe('/log-mood');
    expect(getRouteForInstanceType('sleep')).toBe('/log-sleep');
    expect(getRouteForInstanceType('hydration')).toBe('/log-water');
    expect(getRouteForInstanceType('activity')).toBe('/log-activity');
    expect(getRouteForInstanceType('appointment')).toBe('/appointments');
  });

  it('should default to /log-note for unknown types', () => {
    expect(getRouteForInstanceType('custom')).toBe('/log-note');
    expect(getRouteForInstanceType('unknown')).toBe('/log-note');
  });
});

// ============================================================================
// TIME_WINDOW_HOURS constants
// ============================================================================

describe('TIME_WINDOW_HOURS', () => {
  it('should define all four time windows', () => {
    expect(TIME_WINDOW_HOURS).toHaveProperty('morning');
    expect(TIME_WINDOW_HOURS).toHaveProperty('afternoon');
    expect(TIME_WINDOW_HOURS).toHaveProperty('evening');
    expect(TIME_WINDOW_HOURS).toHaveProperty('night');
  });

  it('should have correct boundary hours', () => {
    expect(TIME_WINDOW_HOURS.morning.start).toBe(5);
    expect(TIME_WINDOW_HOURS.morning.end).toBe(12);
    expect(TIME_WINDOW_HOURS.afternoon.start).toBe(12);
    expect(TIME_WINDOW_HOURS.afternoon.end).toBe(17);
    expect(TIME_WINDOW_HOURS.evening.start).toBe(17);
    expect(TIME_WINDOW_HOURS.evening.end).toBe(21);
    expect(TIME_WINDOW_HOURS.night.start).toBe(21);
    expect(TIME_WINDOW_HOURS.night.end).toBe(5);
  });

  it('should have labels for each window', () => {
    expect(TIME_WINDOW_HOURS.morning.label).toBe('Morning');
    expect(TIME_WINDOW_HOURS.afternoon.label).toBe('Afternoon');
    expect(TIME_WINDOW_HOURS.evening.label).toBe('Evening');
    expect(TIME_WINDOW_HOURS.night.label).toBe('Night');
  });
});
