// ============================================================================
// Event Name Constants — Single Source of Truth
// Used by emitDataUpdate() and useDataListener() to prevent name mismatches
// ============================================================================

/** Categories actually emitted by storage/logging modules */
export const EVENT = {
  MEDICATION: 'medication',
  VITALS: 'vitals',
  WATER: 'water',
  MOOD: 'mood',
  SYMPTOMS: 'symptoms',
  NOTES: 'notes',
  LOGS: 'logs',
  CARE_PLAN: 'carePlan',
  CARE_PLAN_ITEMS: 'carePlanItems',
  CARE_PLAN_CONFIG: 'carePlanConfig',
  DAILY_INSTANCES: 'dailyInstances',
  APPOINTMENTS: 'appointments',
  WELLNESS: 'wellness',
  SAMPLE_DATA_CLEARED: 'sampleDataCleared',
  RHYTHM: 'rhythm',
  PATIENT: 'patient',
  NOTIFICATIONS: 'notifications',
  DELIVERY_PREFERENCES: 'deliveryPreferences',
  SUBSCRIPTION: 'subscription',
  LOG_EVENTS: 'logEvents',
  PREP_CHECKLIST: 'prepChecklist',
} as const;

export type EventCategory = (typeof EVENT)[keyof typeof EVENT];
