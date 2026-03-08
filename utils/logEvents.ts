// ============================================================================
// LOG EVENTS STORAGE
// Append-only event log for all trackable activities
// Single source of truth for historical data across the app
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeGetItem, safeSetItem } from './safeStorage';
import { generateUniqueId } from './idGenerator';
import { emitDataUpdate } from '../lib/events';
import { EVENT } from '../lib/eventNames';
import { getTodayDateString } from '../services/carePlanGenerator';
import { StorageKeys } from './storageKeys';

// ============================================================================
// TYPES
// ============================================================================

export type LogEventType =
  | 'medDose'
  | 'vitals'
  | 'mood'
  | 'meal'
  | 'hydration'
  | 'sleep'
  | 'symptom'
  | 'activity'
  | 'note'
  | 'appointmentComplete';

// Source tab where the event was logged from
export type LogEventSource =
  | 'now'        // From Now tab schedule
  | 'record'     // From Record tab quick log (legacy)
  | 'journal'    // From Journal tab quick log
  | 'understand' // From Understand tab (medication management, etc.)
  | 'careplan'   // From CarePlan panel
  | 'widget'     // From iOS widget (future)
  | 'notification' // From notification action (future)
  | 'unknown';

// Action that triggered the log
export type LogEventAction =
  | 'direct_tap'      // User tapped directly on the log item
  | 'careplan_flow'   // User followed CarePlan task flow
  | 'quick_action'    // Quick action from progress ring
  | 'take_all'        // Bulk action (e.g., "Take All" medications)
  | 'manual_override' // Manual mark as done
  | 'auto_detect'     // System auto-detected (future)
  | 'import';         // Imported from external source (future)

// Audit metadata for tracking who logged what and how
export interface LogEventAudit {
  source: LogEventSource;
  action: LogEventAction;
  caregiverName?: string;  // For future multi-caregiver support
  deviceId?: string;       // For future multi-device sync
}

export interface BaseLogEvent {
  id: string;
  type: LogEventType;
  timestamp: string;
  date: string;  // YYYY-MM-DD for easy filtering
  carePlanTaskId?: string;  // If triggered from CarePlan
  routineId?: string;  // Which routine this belongs to

  // Audit trail
  audit?: LogEventAudit;
}

export interface MedDoseEvent extends BaseLogEvent {
  type: 'medDose';
  medicationId: string;
  medicationName: string;
  dosage: string;
  taken: boolean;
  sideEffects?: string[];
  notes?: string;
}

export interface VitalsEvent extends BaseLogEvent {
  type: 'vitals';
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
  glucose?: number;
  weight?: number;
  temperature?: number;
  oxygen?: number;
}

export interface MoodEvent extends BaseLogEvent {
  type: 'mood';
  mood: number;  // 1-5 scale
  energy?: number;
  pain?: number;
  notes?: string;
}

export interface MealEvent extends BaseLogEvent {
  type: 'meal';
  mealType: string;  // Breakfast, Lunch, Dinner, Snack
  description?: string;
  appetite?: 'good' | 'fair' | 'poor' | 'refused';
  amountConsumed?: 'all' | 'most' | 'half' | 'little' | 'none';
  assistanceLevel?: 'independent' | 'verbal' | 'partial' | 'full';
}

export interface HydrationEvent extends BaseLogEvent {
  type: 'hydration';
  glasses: number;
}

export interface SleepEvent extends BaseLogEvent {
  type: 'sleep';
  hours: number;
  quality?: number;
  notes?: string;
}

export interface SymptomEvent extends BaseLogEvent {
  type: 'symptom';
  symptoms: string[];
  severity?: number;
  notes?: string;
}

export interface ActivityEvent extends BaseLogEvent {
  type: 'activity';
  activityType: string;
  duration?: number;  // minutes
  notes?: string;
}

export interface NoteEvent extends BaseLogEvent {
  type: 'note';
  content: string;
  category?: string;
}

export interface AppointmentCompleteEvent extends BaseLogEvent {
  type: 'appointmentComplete';
  appointmentId: string;
  notes?: string;
}

export type LogEvent =
  | MedDoseEvent
  | VitalsEvent
  | MoodEvent
  | MealEvent
  | HydrationEvent
  | SleepEvent
  | SymptomEvent
  | ActivityEvent
  | NoteEvent
  | AppointmentCompleteEvent;

// ============================================================================
// STORAGE
// ============================================================================

const LOG_EVENTS_KEY = StorageKeys.LOG_EVENTS;
const MAX_EVENTS = 5000;  // Keep last 5000 events

/**
 * Get all log events
 */
export async function getLogEvents(): Promise<LogEvent[]> {
  return safeGetItem<LogEvent[]>(LOG_EVENTS_KEY, []);
}

/**
 * Get events for a specific date
 */
export async function getLogEventsByDate(date: string): Promise<LogEvent[]> {
  const events = await getLogEvents();
  return events.filter(e => e.date === date);
}

/**
 * Get events of a specific type
 */
export async function getLogEventsByType<T extends LogEvent>(
  type: LogEventType
): Promise<T[]> {
  const events = await getLogEvents();
  return events.filter(e => e.type === type) as T[];
}

/**
 * Get events for a specific date and type
 */
export async function getLogEventsByDateAndType<T extends LogEvent>(
  date: string,
  type: LogEventType
): Promise<T[]> {
  const events = await getLogEvents();
  return events.filter(e => e.date === date && e.type === type) as T[];
}

/**
 * Add a new log event
 */
export async function addLogEvent<T extends Omit<LogEvent, 'id' | 'date'>>(
  event: T
): Promise<T & { id: string; date: string }> {
  const events = await getLogEvents();

  const newEvent = {
    ...event,
    id: generateUniqueId(),
    date: event.timestamp.split('T')[0],
  } as T & { id: string; date: string };

  events.push(newEvent as LogEvent);

  // Trim to max events
  const trimmed = events.slice(-MAX_EVENTS);

  await safeSetItem(LOG_EVENTS_KEY, trimmed);
  emitDataUpdate(EVENT.LOG_EVENTS);

  return newEvent;
}

/**
 * Update a log event
 */
export async function updateLogEvent(
  id: string,
  updates: Partial<LogEvent>
): Promise<LogEvent | null> {
  const events = await getLogEvents();
  const index = events.findIndex(e => e.id === id);

  if (index === -1) return null;

  events[index] = { ...events[index], ...updates } as LogEvent;
  await safeSetItem(LOG_EVENTS_KEY, events);
  emitDataUpdate(EVENT.LOG_EVENTS);

  return events[index];
}

/**
 * Delete a log event
 */
export async function deleteLogEvent(id: string): Promise<boolean> {
  const events = await getLogEvents();
  const filtered = events.filter(e => e.id !== id);

  if (filtered.length === events.length) return false;

  await safeSetItem(LOG_EVENTS_KEY, filtered);
  emitDataUpdate(EVENT.LOG_EVENTS);

  return true;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Log a medication dose with optional side effects and audit trail
 */
export async function logMedDose(
  medicationId: string,
  medicationName: string,
  dosage: string,
  taken: boolean,
  options?: {
    sideEffects?: string[];
    notes?: string;
    carePlanTaskId?: string;
    routineId?: string;
    audit?: LogEventAudit;
  }
): Promise<MedDoseEvent> {
  const event: Omit<MedDoseEvent, 'id' | 'date'> = {
    type: 'medDose',
    timestamp: new Date().toISOString(),
    medicationId,
    medicationName,
    dosage,
    taken,
    sideEffects: options?.sideEffects,
    notes: options?.notes,
    carePlanTaskId: options?.carePlanTaskId,
    routineId: options?.routineId,
    audit: options?.audit,
  };

  return addLogEvent(event) as Promise<MedDoseEvent>;
}

/**
 * Log vitals with audit trail
 */
export async function logVitals(
  vitals: {
    systolic?: number;
    diastolic?: number;
    heartRate?: number;
    glucose?: number;
    weight?: number;
    temperature?: number;
    oxygen?: number;
  },
  options?: {
    carePlanTaskId?: string;
    routineId?: string;
    audit?: LogEventAudit;
  }
): Promise<VitalsEvent> {
  const event: Omit<VitalsEvent, 'id' | 'date'> = {
    type: 'vitals',
    timestamp: new Date().toISOString(),
    ...vitals,
    carePlanTaskId: options?.carePlanTaskId,
    routineId: options?.routineId,
    audit: options?.audit,
  };

  return addLogEvent(event) as Promise<VitalsEvent>;
}

/**
 * Log mood with audit trail
 */
export async function logMood(
  mood: number,
  options?: {
    energy?: number;
    pain?: number;
    notes?: string;
    carePlanTaskId?: string;
    routineId?: string;
    audit?: LogEventAudit;
  }
): Promise<MoodEvent> {
  const event: Omit<MoodEvent, 'id' | 'date'> = {
    type: 'mood',
    timestamp: new Date().toISOString(),
    mood,
    energy: options?.energy,
    pain: options?.pain,
    notes: options?.notes,
    carePlanTaskId: options?.carePlanTaskId,
    routineId: options?.routineId,
    audit: options?.audit,
  };

  return addLogEvent(event) as Promise<MoodEvent>;
}

/**
 * Log meal with audit trail
 */
export async function logMeal(
  mealType: string,
  options?: {
    description?: string;
    appetite?: 'good' | 'fair' | 'poor' | 'refused';
    amountConsumed?: 'all' | 'most' | 'half' | 'little' | 'none';
    assistanceLevel?: 'independent' | 'verbal' | 'partial' | 'full';
    carePlanTaskId?: string;
    routineId?: string;
    audit?: LogEventAudit;
  }
): Promise<MealEvent> {
  const event: Omit<MealEvent, 'id' | 'date'> = {
    type: 'meal',
    timestamp: new Date().toISOString(),
    mealType,
    description: options?.description,
    appetite: options?.appetite,
    amountConsumed: options?.amountConsumed,
    assistanceLevel: options?.assistanceLevel,
    carePlanTaskId: options?.carePlanTaskId,
    routineId: options?.routineId,
    audit: options?.audit,
  };

  return addLogEvent(event) as Promise<MealEvent>;
}

/**
 * Log hydration with audit trail
 */
export async function logHydration(
  glasses: number,
  options?: {
    carePlanTaskId?: string;
    routineId?: string;
    audit?: LogEventAudit;
  }
): Promise<HydrationEvent> {
  const event: Omit<HydrationEvent, 'id' | 'date'> = {
    type: 'hydration',
    timestamp: new Date().toISOString(),
    glasses,
    carePlanTaskId: options?.carePlanTaskId,
    routineId: options?.routineId,
    audit: options?.audit,
  };

  return addLogEvent(event) as Promise<HydrationEvent>;
}

/**
 * Get medication dose events for a specific medication
 */
export async function getMedDosesByMedicationId(
  medicationId: string,
  days: number = 30
): Promise<MedDoseEvent[]> {
  const events = await getLogEventsByType<MedDoseEvent>('medDose');
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  return events.filter(
    e => e.medicationId === medicationId && new Date(e.timestamp) >= cutoff
  );
}

/**
 * Get recent side effects for a medication
 */
export async function getRecentSideEffects(
  medicationId: string,
  days: number = 7
): Promise<{ sideEffect: string; count: number; lastOccurred: string }[]> {
  const doses = await getMedDosesByMedicationId(medicationId, days);
  const sideEffectMap = new Map<string, { count: number; lastOccurred: string }>();

  for (const dose of doses) {
    if (dose.sideEffects) {
      for (const effect of dose.sideEffects) {
        const existing = sideEffectMap.get(effect);
        if (existing) {
          existing.count++;
          if (dose.timestamp > existing.lastOccurred) {
            existing.lastOccurred = dose.timestamp;
          }
        } else {
          sideEffectMap.set(effect, { count: 1, lastOccurred: dose.timestamp });
        }
      }
    }
  }

  return Array.from(sideEffectMap.entries())
    .map(([sideEffect, data]) => ({ sideEffect, ...data }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Get today's log events summary
 */
export async function getTodayLogSummary(): Promise<{
  medDoses: number;
  vitalsChecks: number;
  moodChecks: number;
  meals: number;
  hydration: number;
  symptoms: number;
}> {
  const today = getTodayDateString();
  const events = await getLogEventsByDate(today);

  return {
    medDoses: events.filter(e => e.type === 'medDose' && (e as MedDoseEvent).taken).length,
    vitalsChecks: events.filter(e => e.type === 'vitals').length,
    moodChecks: events.filter(e => e.type === 'mood').length,
    meals: events.filter(e => e.type === 'meal').length,
    hydration: events.filter(e => e.type === 'hydration').reduce((sum, e) => sum + ((e as HydrationEvent).glasses || 0), 0),
    symptoms: events.filter(e => e.type === 'symptom').length,
  };
}
