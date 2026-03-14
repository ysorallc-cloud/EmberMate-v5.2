// utils/eventAdapters.ts
// Read adapters: query eventRepo, return legacy-compatible shapes.
// These bridge the gap between the new event store and the old UI.

import { getEventsByDate, getEventsByType } from '../storage/eventRepo';
import type { CareEvent } from '../types/event';

const DEFAULT_PATIENT = 'default';

// Hydration: returns water glass count for today
export async function getWaterCountFromEvents(
  date: string,
  patientId = DEFAULT_PATIENT
): Promise<number> {
  const events = await getEventsByType(
    ['hydration_logged'], date, date, patientId
  );
  // Each hydration event stores glasses in value field
  // Take the latest one (last emitted represents cumulative count)
  if (events.length === 0) return 0;
  const latest = events[events.length - 1];
  return typeof latest.value === 'number' ? latest.value : 0;
}

// Mood: returns today's mood log
export async function getMoodFromEvents(
  date: string,
  patientId = DEFAULT_PATIENT
): Promise<{ score: number; label: string } | null> {
  const events = await getEventsByType(
    ['mood_logged'], date, date, patientId
  );
  if (events.length === 0) return null;
  const latest = events[events.length - 1];
  return {
    score: typeof latest.value === 'number' ? latest.value : 3,
    label: (latest.metadata?.label as string) || 'Okay',
  };
}

// Vitals: returns today's vitals entries
export async function getVitalsFromEvents(
  date: string,
  patientId = DEFAULT_PATIENT
): Promise<CareEvent[]> {
  return getEventsByType(
    ['vitals_recorded'], date, date, patientId
  );
}

// Meals: returns today's meal events
export async function getMealsFromEvents(
  date: string,
  patientId = DEFAULT_PATIENT
): Promise<CareEvent[]> {
  return getEventsByType(
    ['meal_logged'], date, date, patientId
  );
}

// Medications: returns today's medication events
export async function getMedicationEventsForDate(
  date: string,
  patientId = DEFAULT_PATIENT
): Promise<CareEvent[]> {
  return getEventsByType(
    ['medication_taken', 'medication_skipped'], date, date, patientId
  );
}

// Notes: returns today's notes
export async function getNotesFromEvents(
  date: string,
  patientId = DEFAULT_PATIENT
): Promise<CareEvent[]> {
  return getEventsByType(
    ['note_added'], date, date, patientId
  );
}

// Summary: returns event counts by type for a date
export async function getDayEventSummary(
  date: string,
  patientId = DEFAULT_PATIENT
): Promise<Record<string, number>> {
  const events = await getEventsByDate(date, patientId);
  const counts: Record<string, number> = {};
  for (const e of events) {
    counts[e.type] = (counts[e.type] || 0) + 1;
  }
  return counts;
}
