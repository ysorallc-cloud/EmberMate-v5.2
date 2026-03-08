// ============================================================================
// CARE EVENT — Unified event model for all logged care data
// Replaces separate models: medicationLogs, hydrationLogs, mealLogs,
// symptomLogs, vitalsLogs, etc.
// ============================================================================

export type EventType =
  | 'medication_taken'
  | 'medication_skipped'
  | 'meal_logged'
  | 'hydration_logged'
  | 'symptom_reported'
  | 'vitals_recorded'
  | 'bathroom_event'
  | 'sleep_logged'
  | 'activity_logged'
  | 'wellness_check'
  | 'note_added'
  | 'mood_logged'
  | 'appointment_logged';

export interface CareEvent {
  id: string;
  type: EventType;
  timestamp: string;         // ISO 8601
  patientId: string;
  value?: number | string;   // e.g., water count, BP reading, mood score
  notes?: string;
  status?: 'completed' | 'skipped' | 'partial';
  metadata?: Record<string, unknown>;
  // Examples:
  //   medication_taken: { medicationId: 'xxx', medicationName: 'Metformin', dosage: '500mg' }
  //   vitals_recorded: { systolic: 120, diastolic: 80, heartRate: 72, type: 'bp' }
  //   meal_logged: { mealType: 'breakfast', quality: 'good' }
  //   hydration_logged: { glasses: 3, unit: 'glasses' }
  //   sleep_logged: { hours: 7, quality: 'good' }
  //   symptom_reported: { symptomName: 'headache', severity: 'moderate' }
  //   bathroom_event: { bathroomType: 'bm' }
  //   mood_logged: { score: 4, label: 'Good' }
  //   wellness_check: { checkType: 'morning', responses: {...} }
  source?: 'quick_log' | 'dedicated_screen' | 'schedule_completion' | 'auto';
  createdAt: string;         // ISO 8601 — when the event record was created
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export interface EventQuery {
  patientId: string;
  date?: string;             // YYYY-MM-DD for single day
  startDate?: string;        // YYYY-MM-DD for range start
  endDate?: string;          // YYYY-MM-DD for range end
  types?: EventType[];       // filter by event type
  limit?: number;
}

export interface EventSummary {
  date: string;
  totalEvents: number;
  byType: Partial<Record<EventType, number>>;
}
