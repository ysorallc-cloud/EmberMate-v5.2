// ============================================================================
// EVENT EMITTER — Convenience wrappers for emitting CareEvents
// Called from existing save functions for dual-write compatibility
// ============================================================================

import { saveEvent } from '../storage/eventRepo';
import type { CareEvent, EventType } from '../types/event';
import { logError } from './devLog';

const DEFAULT_PATIENT = 'default';

export async function emitCareEvent(
  type: EventType,
  opts: {
    value?: number | string;
    notes?: string;
    status?: CareEvent['status'];
    metadata?: Record<string, unknown>;
    source?: CareEvent['source'];
    patientId?: string;
    timestamp?: string;
  } = {}
): Promise<void> {
  try {
    await saveEvent({
      type,
      timestamp: opts.timestamp || new Date().toISOString(),
      patientId: opts.patientId || DEFAULT_PATIENT,
      value: opts.value,
      notes: opts.notes,
      status: opts.status || 'completed',
      metadata: opts.metadata,
      source: opts.source || 'dedicated_screen',
    });
  } catch (err) {
    // Non-blocking — don't break the existing save flow
    logError('eventEmitter.emitCareEvent', err);
  }
}

// ============================================================================
// TYPE-SPECIFIC EMITTERS
// These delegate to emitCareEvent. Use emitCareEvent directly for new code.
// ============================================================================

/** @deprecated Use emitCareEvent() directly */
export async function emitMedicationEvent(
  medicationId: string,
  medicationName: string,
  status: 'taken' | 'skipped',
  opts?: { dosage?: string; timestamp?: string; source?: CareEvent['source'] }
): Promise<void> {
  await emitCareEvent(status === 'taken' ? 'medication_taken' : 'medication_skipped', {
    status: status === 'taken' ? 'completed' : 'skipped',
    metadata: { medicationId, medicationName, dosage: opts?.dosage },
    source: opts?.source,
    timestamp: opts?.timestamp,
  });
}

/** @deprecated Use emitCareEvent() directly */
export async function emitVitalsEvent(
  vitalsData: Record<string, unknown>,
  opts?: { source?: CareEvent['source'] }
): Promise<void> {
  await emitCareEvent('vitals_recorded', {
    metadata: vitalsData,
    source: opts?.source,
  });
}

/** @deprecated Use emitCareEvent() directly */
export async function emitMealEvent(
  mealType: string,
  opts?: { quality?: string; notes?: string; source?: CareEvent['source'] }
): Promise<void> {
  await emitCareEvent('meal_logged', {
    metadata: { mealType, quality: opts?.quality },
    notes: opts?.notes,
    source: opts?.source,
  });
}

/** @deprecated Use emitCareEvent() directly */
export async function emitHydrationEvent(
  glasses: number,
  opts?: { source?: CareEvent['source'] }
): Promise<void> {
  await emitCareEvent('hydration_logged', {
    value: glasses,
    metadata: { glasses },
    source: opts?.source,
  });
}

/** @deprecated Use emitCareEvent() directly */
export async function emitSleepEvent(
  hours: number,
  quality: string,
  opts?: { source?: CareEvent['source'] }
): Promise<void> {
  await emitCareEvent('sleep_logged', {
    value: hours,
    metadata: { hours, quality },
    source: opts?.source,
  });
}

/** @deprecated Use emitCareEvent() directly */
export async function emitSymptomEvent(
  symptomName: string,
  severity: string,
  opts?: { notes?: string; source?: CareEvent['source'] }
): Promise<void> {
  await emitCareEvent('symptom_reported', {
    metadata: { symptomName, severity },
    notes: opts?.notes,
    source: opts?.source,
  });
}

/** @deprecated Use emitCareEvent() directly */
export async function emitBathroomEvent(
  bathroomType: string,
  opts?: { notes?: string; source?: CareEvent['source'] }
): Promise<void> {
  await emitCareEvent('bathroom_event', {
    metadata: { bathroomType },
    notes: opts?.notes,
    source: opts?.source,
  });
}

/** @deprecated Use emitCareEvent() directly */
export async function emitMoodEvent(
  score: number,
  label: string,
  opts?: { source?: CareEvent['source'] }
): Promise<void> {
  await emitCareEvent('mood_logged', {
    value: score,
    metadata: { score, label },
    source: opts?.source,
  });
}

/** @deprecated Use emitCareEvent() directly */
export async function emitWellnessEvent(
  checkType: 'morning' | 'evening',
  responses: Record<string, unknown>,
  opts?: { source?: CareEvent['source'] }
): Promise<void> {
  await emitCareEvent('wellness_check', {
    metadata: { checkType, responses },
    source: opts?.source,
  });
}

/** @deprecated Use emitCareEvent() directly */
export async function emitNoteEvent(
  noteText: string,
  opts?: { source?: CareEvent['source'] }
): Promise<void> {
  await emitCareEvent('note_added', {
    notes: noteText,
    source: opts?.source,
  });
}

/** @deprecated Use emitCareEvent() directly */
export async function emitActivityEvent(
  activityData: Record<string, unknown>,
  opts?: { source?: CareEvent['source'] }
): Promise<void> {
  await emitCareEvent('activity_logged', {
    metadata: activityData,
    source: opts?.source,
  });
}
