// ============================================================================
// useRecentEntries — Fetches last 48h of log events for the Journal feed
// Aggregates from all storage systems: logEvents, centralStorage,
// medicationStorage, noteStorage, symptomStorage, wellnessCheckStorage
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { logError } from '../utils/devLog';
import { getLogEventsByDate, LogEvent, LogEventType, MedDoseEvent, VitalsEvent, MoodEvent, MealEvent, HydrationEvent, SleepEvent, SymptomEvent, ActivityEvent, NoteEvent } from '../utils/logEvents';
import { getVitalsLogs, getMealsLogs, getWaterLogs, getSleepLogs, getSymptomLogs, getNotesLogs, getMedicationLogs as getCentralMedicationLogs } from '../utils/centralStorage';
import type { VitalsLog, MealsLog, WaterLog, SleepLog as CentralSleepLog, SymptomLog as CentralSymptomLog, NotesLog, MedicationLog as CentralMedicationLog } from '../utils/centralStorage';
import { getMedicationLogs, getMedications } from '../utils/medicationStorage';
import type { MedicationLog, Medication } from '../utils/medicationStorage';
import { getNotes } from '../utils/noteStorage';
import type { NoteLog } from '../utils/noteStorage';
import { getSymptoms } from '../utils/symptomStorage';
import type { SymptomLog as DomainSymptomLog } from '../utils/symptomStorage';
import { getMorningWellness, getEveningWellness } from '../utils/wellnessCheckStorage';
import type { StoredMorningWellness, StoredEveningWellness } from '../utils/wellnessCheckStorage';
import { useDataListener } from '../lib/events';
import { formatTimeAgo } from '../constants/microcopy';

// ============================================================================
// TYPES
// ============================================================================

export interface RecentEntry {
  id: string;
  type: LogEventType;
  emoji: string;
  label: string;
  detail: string;
  timestamp: string;
  relativeTime: string;
  route: string;
  dateGroup: 'Today' | 'Yesterday';
}

// ============================================================================
// MAPPINGS
// ============================================================================

export const EMOJI_MAP: Record<LogEventType, string> = {
  medDose: '\u{1F48A}',
  vitals: '\u{1F4CA}',
  mood: '\u{1F60A}',
  meal: '\u{1F37D}\uFE0F',
  hydration: '\u{1F4A7}',
  sleep: '\u{1F634}',
  symptom: '\u{1FA7A}',
  activity: '\u{1F6B6}',
  note: '\u{1F4DD}',
  appointmentComplete: '\u{1F4C5}',
};

export const LABEL_MAP: Record<LogEventType, string> = {
  medDose: 'Medication',
  vitals: 'Vitals',
  mood: 'Mood',
  meal: 'Meal',
  hydration: 'Water',
  sleep: 'Sleep',
  symptom: 'Symptom',
  activity: 'Activity',
  note: 'Note',
  appointmentComplete: 'Appointment',
};

export const ROUTE_MAP: Record<LogEventType, string> = {
  medDose: '/medications',
  vitals: '/log-vitals',
  mood: '/log-mood',
  meal: '/log-meal',
  hydration: '/log-water',
  sleep: '/log-sleep',
  symptom: '/log-symptom',
  activity: '/log-activity',
  note: '/log-note',
  appointmentComplete: '/appointments',
};

export const MOOD_LABELS: Record<number, string> = {
  1: 'Struggling',
  2: 'Difficult',
  3: 'Managing',
  4: 'Good',
  5: 'Great',
};

// ============================================================================
// DETAIL EXTRACTION (for logEvents entries)
// ============================================================================

export function extractDetail(event: LogEvent): string {
  switch (event.type) {
    case 'medDose': {
      const e = event as MedDoseEvent;
      if (!e.taken) return `${e.medicationName} \u2014 Skipped`;
      return `${e.medicationName} \u2014 ${e.dosage}`;
    }
    case 'vitals': {
      const e = event as VitalsEvent;
      const parts: string[] = [];
      if (e.systolic != null && e.diastolic != null) parts.push(`BP: ${e.systolic}/${e.diastolic}`);
      if (e.heartRate != null) parts.push(`HR: ${e.heartRate}`);
      if (e.glucose != null) parts.push(`Glucose: ${e.glucose}`);
      if (e.weight != null) parts.push(`Weight: ${e.weight}`);
      if (e.temperature != null) parts.push(`Temp: ${e.temperature}`);
      if (e.oxygen != null) parts.push(`O\u2082: ${e.oxygen}%`);
      return parts.join(' \u00B7 ') || 'Vitals logged';
    }
    case 'mood': {
      const e = event as MoodEvent;
      const label = MOOD_LABELS[e.mood] || `${e.mood}/5`;
      return `Mood: ${label}`;
    }
    case 'meal': {
      const e = event as MealEvent;
      let detail = e.mealType;
      if (e.appetite) detail += ` \u00B7 Appetite: ${e.appetite}`;
      return detail;
    }
    case 'hydration': {
      const e = event as HydrationEvent;
      return `${e.glasses} glasses`;
    }
    case 'sleep': {
      const e = event as SleepEvent;
      let detail = `${e.hours}h`;
      if (e.quality != null) {
        const qualityLabels: Record<number, string> = { 1: 'Poor', 2: 'Fair', 3: 'Okay', 4: 'Good', 5: 'Great' };
        detail += ` \u00B7 ${qualityLabels[e.quality] || `${e.quality}/5`}`;
      }
      return detail;
    }
    case 'symptom': {
      const e = event as SymptomEvent;
      let detail = e.symptoms.join(', ');
      if (e.severity != null) detail += ` \u00B7 Severity: ${e.severity}/10`;
      return detail;
    }
    case 'activity': {
      const e = event as ActivityEvent;
      let detail = e.activityType;
      if (e.duration != null) detail += ` \u00B7 ${e.duration}min`;
      return detail;
    }
    case 'note': {
      const e = event as NoteEvent;
      if (e.content.length > 50) return e.content.slice(0, 50) + '\u2026';
      return e.content;
    }
    case 'appointmentComplete':
      return 'Completed';
    default:
      return '';
  }
}

// ============================================================================
// HELPERS
// ============================================================================

export function getDateString(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  // Use local date, not UTC (fixes timezone edge case)
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDateGroup(
  timestamp: string,
  today: string,
  yesterday: string
): 'Today' | 'Yesterday' | null {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  return null;
}

function makeEntry(
  id: string,
  type: LogEventType,
  detail: string,
  timestamp: string,
  dateGroup: 'Today' | 'Yesterday',
): RecentEntry {
  return {
    id,
    type,
    emoji: EMOJI_MAP[type],
    label: LABEL_MAP[type],
    detail,
    timestamp,
    relativeTime: formatTimeAgo(new Date(timestamp)),
    route: ROUTE_MAP[type],
    dateGroup,
  };
}

// ============================================================================
// MAPPER: logEvents (mood, activity, appointments — already in logEvents)
// ============================================================================

export function mapEventToEntry(event: LogEvent, dateGroup: 'Today' | 'Yesterday'): RecentEntry {
  return {
    id: event.id,
    type: event.type,
    emoji: EMOJI_MAP[event.type],
    label: LABEL_MAP[event.type],
    detail: extractDetail(event),
    timestamp: event.timestamp,
    relativeTime: formatTimeAgo(new Date(event.timestamp)),
    route: ROUTE_MAP[event.type],
    dateGroup,
  };
}

// ============================================================================
// MAPPERS: centralStorage sources
// ============================================================================

function mapVitalsLogToEntry(log: VitalsLog, dateGroup: 'Today' | 'Yesterday'): RecentEntry {
  const parts: string[] = [];
  if (log.systolic != null && log.diastolic != null) parts.push(`BP: ${log.systolic}/${log.diastolic}`);
  if (log.heartRate != null) parts.push(`HR: ${log.heartRate}`);
  if (log.glucose != null) parts.push(`Glucose: ${log.glucose}`);
  if (log.weight != null) parts.push(`Weight: ${log.weight}`);
  if (log.temperature != null) parts.push(`Temp: ${log.temperature}`);
  if (log.oxygen != null) parts.push(`O\u2082: ${log.oxygen}%`);
  const detail = parts.join(' \u00B7 ') || 'Vitals logged';
  return makeEntry(`vitals-${log.id}`, 'vitals', detail, log.timestamp, dateGroup);
}

function mapMealsLogToEntry(log: MealsLog, dateGroup: 'Today' | 'Yesterday'): RecentEntry {
  let detail = log.meals.join(', ');
  if (log.appetite) detail += ` \u00B7 Appetite: ${log.appetite}`;
  return makeEntry(`meal-${log.id}`, 'meal', detail, log.timestamp, dateGroup);
}

function mapWaterLogToEntry(log: WaterLog, dateGroup: 'Today' | 'Yesterday'): RecentEntry {
  return makeEntry(`water-${log.id}`, 'hydration', `${log.glasses} glasses`, log.timestamp, dateGroup);
}

function mapSleepLogToEntry(log: CentralSleepLog, dateGroup: 'Today' | 'Yesterday'): RecentEntry {
  const qualityLabels: Record<number, string> = { 1: 'Poor', 2: 'Fair', 3: 'Okay', 4: 'Good', 5: 'Great' };
  let detail = `${log.hours}h`;
  if (log.quality != null) {
    detail += ` \u00B7 ${qualityLabels[log.quality] || `${log.quality}/5`}`;
  }
  return makeEntry(`sleep-${log.id}`, 'sleep', detail, log.timestamp, dateGroup);
}

function mapCentralSymptomToEntry(log: CentralSymptomLog, dateGroup: 'Today' | 'Yesterday'): RecentEntry {
  let detail = log.symptoms.join(', ');
  if (log.severity != null) detail += ` \u00B7 Severity: ${log.severity}/10`;
  return makeEntry(`csymptom-${log.id}`, 'symptom', detail, log.timestamp, dateGroup);
}

function mapCentralNoteToEntry(log: NotesLog, dateGroup: 'Today' | 'Yesterday'): RecentEntry {
  const detail = log.content.length > 50 ? log.content.slice(0, 50) + '\u2026' : log.content;
  return makeEntry(`cnote-${log.id}`, 'note', detail, log.timestamp, dateGroup);
}

// ============================================================================
// MAPPERS: medicationStorage
// ============================================================================

function mapMedLogToEntry(
  log: MedicationLog,
  medications: Medication[],
  dateGroup: 'Today' | 'Yesterday',
): RecentEntry {
  const med = medications.find(m => m.id === log.medicationId);
  const name = med?.name || 'Medication';
  const dosage = med?.dosage || '';
  const detail = log.taken
    ? `${name} \u2014 ${dosage}`.trim()
    : `${name} \u2014 Skipped`;
  return makeEntry(`med-${log.medicationId}-${log.timestamp}`, 'medDose', detail, log.timestamp, dateGroup);
}

// ============================================================================
// MAPPERS: centralStorage medication logs
// ============================================================================

function mapCentralMedLogToEntry(
  log: CentralMedicationLog,
  dateGroup: 'Today' | 'Yesterday',
): RecentEntry {
  const detail = log.medicationIds?.length
    ? `Medications logged (${log.medicationIds.length})`
    : 'Medication logged';
  return makeEntry(`cmed-${log.id}`, 'medDose', detail, log.timestamp, dateGroup);
}

// ============================================================================
// MAPPERS: noteStorage (domain-specific)
// ============================================================================

function mapDomainNoteToEntry(note: NoteLog, dateGroup: 'Today' | 'Yesterday'): RecentEntry {
  const detail = note.content.length > 50 ? note.content.slice(0, 50) + '\u2026' : note.content;
  return makeEntry(`note-${note.id}`, 'note', detail, note.timestamp, dateGroup);
}

// ============================================================================
// MAPPERS: symptomStorage (domain-specific)
// ============================================================================

function mapDomainSymptomToEntry(symptom: DomainSymptomLog, dateGroup: 'Today' | 'Yesterday'): RecentEntry {
  let detail = symptom.symptom;
  if (symptom.severity != null) detail += ` \u00B7 Severity: ${symptom.severity}/10`;
  return makeEntry(`symptom-${symptom.id}`, 'symptom', detail, symptom.timestamp, dateGroup);
}

// ============================================================================
// MAPPERS: wellnessCheckStorage
// ============================================================================

function mapMorningWellnessToEntry(
  wellness: StoredMorningWellness,
  dateGroup: 'Today' | 'Yesterday',
): RecentEntry {
  const parts: string[] = [];
  parts.push(`Sleep: ${wellness.sleepQuality}/5`);
  parts.push(`Mood: ${wellness.mood}`);
  const detail = `Morning \u2014 ${parts.join(', ')}`;
  const timestamp = wellness.completedAt instanceof Date
    ? wellness.completedAt.toISOString()
    : new Date(wellness.completedAt).toISOString();
  return makeEntry(`wellness-morning-${wellness.date}`, 'mood', detail, timestamp, dateGroup);
}

function mapEveningWellnessToEntry(
  wellness: StoredEveningWellness,
  dateGroup: 'Today' | 'Yesterday',
): RecentEntry {
  const parts: string[] = [];
  parts.push(`Rating: ${wellness.dayRating}/5`);
  if (wellness.painLevel) parts.push(`Pain: ${wellness.painLevel}`);
  const detail = `Evening \u2014 ${parts.join(', ')}`;
  const timestamp = wellness.completedAt instanceof Date
    ? wellness.completedAt.toISOString()
    : new Date(wellness.completedAt).toISOString();
  return makeEntry(`wellness-evening-${wellness.date}`, 'mood', detail, timestamp, dateGroup);
}

// ============================================================================
// HOOK
// ============================================================================

export function useRecentEntries(filterType?: LogEventType | null) {
  const [entries, setEntries] = useState<RecentEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    try {
      const today = getDateString(0);
      const yesterday = getDateString(1);

      // Parallel fetch from all sources
      const [
        todayLogEvents,
        yesterdayLogEvents,
        medLogs,
        medications,
        centralMedLogs,
        vitalsLogs,
        mealsLogs,
        waterLogs,
        sleepLogs,
        centralSymptomLogs,
        centralNotesLogs,
        domainNotes,
        domainSymptoms,
        morningToday,
        eveningToday,
        morningYesterday,
        eveningYesterday,
      ] = await Promise.all([
        getLogEventsByDate(today),
        getLogEventsByDate(yesterday),
        getMedicationLogs(),
        getMedications(),
        getCentralMedicationLogs(),
        getVitalsLogs(),
        getMealsLogs(),
        getWaterLogs(),
        getSleepLogs(),
        getSymptomLogs(),
        getNotesLogs(),
        getNotes(),
        getSymptoms(),
        getMorningWellness(today),
        getEveningWellness(today),
        getMorningWellness(yesterday),
        getEveningWellness(yesterday),
      ]);

      const allEntries: RecentEntry[] = [];

      // 1. logEvents entries (mood, activity, appointments, etc.)
      for (const e of todayLogEvents) {
        allEntries.push(mapEventToEntry(e, 'Today'));
      }
      for (const e of yesterdayLogEvents) {
        allEntries.push(mapEventToEntry(e, 'Yesterday'));
      }

      // 2. Medication logs from medicationStorage
      for (const log of medLogs) {
        const group = getDateGroup(log.timestamp, today, yesterday);
        if (group) {
          allEntries.push(mapMedLogToEntry(log, medications, group));
        }
      }

      // 2b. Medication logs from centralStorage (Now tab writes here)
      for (const log of centralMedLogs) {
        const group = getDateGroup(log.timestamp, today, yesterday);
        if (group) {
          allEntries.push(mapCentralMedLogToEntry(log, group));
        }
      }

      // 3. Vitals from centralStorage
      for (const log of vitalsLogs) {
        const group = getDateGroup(log.timestamp, today, yesterday);
        if (group) {
          allEntries.push(mapVitalsLogToEntry(log, group));
        }
      }

      // 4. Meals from centralStorage
      for (const log of mealsLogs) {
        const group = getDateGroup(log.timestamp, today, yesterday);
        if (group) {
          allEntries.push(mapMealsLogToEntry(log, group));
        }
      }

      // 5. Water from centralStorage
      for (const log of waterLogs) {
        const group = getDateGroup(log.timestamp, today, yesterday);
        if (group) {
          allEntries.push(mapWaterLogToEntry(log, group));
        }
      }

      // 6. Sleep from centralStorage
      for (const log of sleepLogs) {
        const group = getDateGroup(log.timestamp, today, yesterday);
        if (group) {
          allEntries.push(mapSleepLogToEntry(log, group));
        }
      }

      // 7. Symptoms from centralStorage
      for (const log of centralSymptomLogs) {
        const group = getDateGroup(log.timestamp, today, yesterday);
        if (group) {
          allEntries.push(mapCentralSymptomToEntry(log, group));
        }
      }

      // 8. Notes from centralStorage
      for (const log of centralNotesLogs) {
        const group = getDateGroup(log.timestamp, today, yesterday);
        if (group) {
          allEntries.push(mapCentralNoteToEntry(log, group));
        }
      }

      // 9. Notes from domain noteStorage (filter by date field)
      for (const note of domainNotes) {
        let dateGroup: 'Today' | 'Yesterday' | null = null;
        if (note.date === today) dateGroup = 'Today';
        else if (note.date === yesterday) dateGroup = 'Yesterday';
        if (dateGroup) {
          allEntries.push(mapDomainNoteToEntry(note, dateGroup));
        }
      }

      // 10. Symptoms from domain symptomStorage (filter by date field)
      for (const symptom of domainSymptoms) {
        let dateGroup: 'Today' | 'Yesterday' | null = null;
        if (symptom.date === today) dateGroup = 'Today';
        else if (symptom.date === yesterday) dateGroup = 'Yesterday';
        if (dateGroup) {
          allEntries.push(mapDomainSymptomToEntry(symptom, dateGroup));
        }
      }

      // 11. Wellness checks
      if (morningToday && !morningToday.skipped) {
        allEntries.push(mapMorningWellnessToEntry(morningToday, 'Today'));
      }
      if (eveningToday && !eveningToday.skipped) {
        allEntries.push(mapEveningWellnessToEntry(eveningToday, 'Today'));
      }
      if (morningYesterday && !morningYesterday.skipped) {
        allEntries.push(mapMorningWellnessToEntry(morningYesterday, 'Yesterday'));
      }
      if (eveningYesterday && !eveningYesterday.skipped) {
        allEntries.push(mapEveningWellnessToEntry(eveningYesterday, 'Yesterday'));
      }

      // Dedup entries that match on type + timestamp within 60-second window
      // (handles dual-writes from screens that save to multiple storage systems)
      const deduplicationKeys = new Set<string>();
      const dedupedEntries = allEntries.filter(entry => {
        const minuteKey = `${entry.type}-${Math.floor(new Date(entry.timestamp).getTime() / 60000)}`;
        if (deduplicationKeys.has(minuteKey)) return false;
        deduplicationKeys.add(minuteKey);
        return true;
      });

      // Sort by timestamp descending
      let sorted = dedupedEntries.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // Apply filter
      if (filterType) {
        sorted = sorted.filter(e => e.type === filterType);
      }

      setEntries(sorted);
    } catch (error) {
      logError('useRecentEntries.fetchEntries', error);
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  useDataListener((category) => {
    if (['dailyInstances', 'logs', 'logEvents', 'appointments', 'carePlan', 'carePlanItems', 'sampleDataCleared'].includes(category)) {
      fetchEntries();
    }
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchEntries();
  }, [fetchEntries]);

  return { entries, loading, refresh };
}
