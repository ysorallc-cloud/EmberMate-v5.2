// ============================================================================
// EVENT REPOSITORY
// Persists CareEvents to AsyncStorage with date-partitioned keys
// Key pattern: events:{patientId}:{YYYY-MM-DD} → CareEvent[]
// ============================================================================

import { safeGetItem, safeSetItem } from '../utils/safeStorage';
import { logError } from '../utils/devLog';
import type { CareEvent, EventType, EventQuery, EventSummary } from '../types/event';

// ============================================================================
// KEY HELPERS
// ============================================================================

function eventKey(patientId: string, date: string): string {
  return `events:${patientId}:${date}`;
}

function dateFromTimestamp(timestamp: string): string {
  return timestamp.split('T')[0]; // YYYY-MM-DD
}

function generateId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ============================================================================
// CORE OPERATIONS
// ============================================================================

/**
 * Save a single event. Appends to the day's event array.
 */
export async function saveEvent(event: Omit<CareEvent, 'id' | 'createdAt'> & { id?: string }): Promise<CareEvent> {
  const fullEvent: CareEvent = {
    ...event,
    id: event.id || generateId(),
    createdAt: new Date().toISOString(),
  };

  const date = dateFromTimestamp(fullEvent.timestamp);
  const key = eventKey(fullEvent.patientId, date);

  try {
    const existing = await getEventsForKey(key);
    existing.push(fullEvent);
    await safeSetItem(key, existing);
  } catch (err) {
    logError('eventRepo.saveEvent', err);
    throw err;
  }

  return fullEvent;
}

/**
 * Get all events for a specific date.
 */
export async function getEventsByDate(
  date: string,
  patientId: string
): Promise<CareEvent[]> {
  const key = eventKey(patientId, date);
  return getEventsForKey(key);
}

/**
 * Get events filtered by type within a date range.
 */
export async function getEventsByType(
  types: EventType[],
  startDate: string,
  endDate: string,
  patientId: string
): Promise<CareEvent[]> {
  const allEvents = await getEventsByDateRange(startDate, endDate, patientId);
  return allEvents.filter(e => types.includes(e.type));
}

/**
 * Get all events within a date range (inclusive).
 */
export async function getEventsByDateRange(
  startDate: string,
  endDate: string,
  patientId: string
): Promise<CareEvent[]> {
  const dates = getDatesBetween(startDate, endDate);
  const allEvents: CareEvent[] = [];

  for (const date of dates) {
    const dayEvents = await getEventsByDate(date, patientId);
    allEvents.push(...dayEvents);
  }

  // Sort by timestamp ascending
  allEvents.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  return allEvents;
}

/**
 * Delete a single event by ID.
 */
export async function deleteEvent(
  eventId: string,
  date: string,
  patientId: string
): Promise<boolean> {
  const key = eventKey(patientId, date);

  try {
    const events = await getEventsForKey(key);
    const filtered = events.filter(e => e.id !== eventId);

    if (filtered.length === events.length) {
      return false; // Event not found
    }

    await safeSetItem(key, filtered);
    return true;
  } catch (err) {
    logError('eventRepo.deleteEvent', err);
    return false;
  }
}

/**
 * Get a summary of events per day in a range.
 */
export async function getEventSummaries(
  startDate: string,
  endDate: string,
  patientId: string
): Promise<EventSummary[]> {
  const dates = getDatesBetween(startDate, endDate);
  const summaries: EventSummary[] = [];

  for (const date of dates) {
    const events = await getEventsByDate(date, patientId);
    const byType: Partial<Record<EventType, number>> = {};
    for (const event of events) {
      byType[event.type] = (byType[event.type] || 0) + 1;
    }
    summaries.push({
      date,
      totalEvents: events.length,
      byType,
    });
  }

  return summaries;
}

/**
 * Query events with flexible filters.
 */
export async function queryEvents(query: EventQuery): Promise<CareEvent[]> {
  let events: CareEvent[];

  if (query.date) {
    events = await getEventsByDate(query.date, query.patientId);
  } else if (query.startDate && query.endDate) {
    events = await getEventsByDateRange(query.startDate, query.endDate, query.patientId);
  } else {
    // Default: today
    const today = new Date().toISOString().split('T')[0];
    events = await getEventsByDate(today, query.patientId);
  }

  if (query.types && query.types.length > 0) {
    events = events.filter(e => query.types!.includes(e.type));
  }

  if (query.limit) {
    events = events.slice(0, query.limit);
  }

  return events;
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

async function getEventsForKey(key: string): Promise<CareEvent[]> {
  try {
    return await safeGetItem<CareEvent[]>(key, []);
  } catch {
    return [];
  }
}

function getDatesBetween(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(start + 'T00:00:00');
  const endDate = new Date(end + 'T00:00:00');

  while (current <= endDate) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}
