// ============================================================================
// ONBOARDING → CARE PLAN MAPPER
// Converts 4-question answers into a CarePlanConfig
// ============================================================================

import {
  CarePlanConfig,
  BucketType,
  TimeOfDay,
  createDefaultCarePlanConfig,
} from '../types/carePlanConfig';

// ============================================================================
// ANSWER TYPES
// ============================================================================

export type CareRelationship = 'parent' | 'spouse' | 'child' | 'self' | 'other';

export type CareArea =
  | 'medications'
  | 'meals'
  | 'doctor_visits'
  | 'wellness'
  | 'vitals';

export type ConcernArea =
  | 'missed_medication'
  | 'symptom_change'
  | 'hydration'
  | 'sleep_patterns'
  | 'weight_changes';

export type CheckInCadence =
  | 'morning_only'
  | 'morning_evening'
  | 'three_times'
  | 'flexible';

export interface OnboardingAnswers {
  relationship: CareRelationship;
  careAreas: CareArea[];
  concerns: ConcernArea[];
  cadence: CheckInCadence;
}

// ============================================================================
// MAPPING LOGIC
// ============================================================================

const CARE_AREA_TO_BUCKET: Record<CareArea, BucketType> = {
  medications: 'meds',
  meals: 'meals',
  doctor_visits: 'appointments',
  wellness: 'wellness',
  vitals: 'vitals',
};

const CONCERN_TO_BUCKET: Record<ConcernArea, BucketType | null> = {
  missed_medication: 'meds',
  symptom_change: null,       // Symptoms are always-on (no bucket gate)
  hydration: 'water',
  sleep_patterns: 'sleep',
  weight_changes: 'vitals',
};

const CADENCE_TO_TIMES: Record<CheckInCadence, TimeOfDay[]> = {
  morning_only: ['morning'],
  morning_evening: ['morning', 'evening'],
  three_times: ['morning', 'midday', 'evening'],
  flexible: ['morning', 'evening'],
};

export function generateCarePlanFromOnboarding(
  answers: OnboardingAnswers
): CarePlanConfig {
  const config = createDefaultCarePlanConfig('default');
  const timesOfDay = CADENCE_TO_TIMES[answers.cadence];

  // Start with everything disabled
  const allBuckets: BucketType[] = [
    'meds', 'vitals', 'meals', 'water', 'sleep', 'activity', 'wellness', 'appointments',
  ];
  for (const bucket of allBuckets) {
    if (config[bucket]) {
      (config as any)[bucket].enabled = false;
    }
  }

  // Always enable wellness (it's the core check-in)
  config.wellness.enabled = true;
  config.wellness.priority = 'recommended';
  config.wellness.timesOfDay = timesOfDay;

  // Always enable water (universal tracking need)
  config.water.enabled = true;
  config.water.priority = 'recommended';

  // Enable buckets from care area selections
  for (const area of answers.careAreas) {
    const bucket = CARE_AREA_TO_BUCKET[area];
    if (bucket && config[bucket]) {
      (config as any)[bucket].enabled = true;
      (config as any)[bucket].priority = 'recommended';
      if ('timesOfDay' in config[bucket]) {
        (config as any)[bucket].timesOfDay = timesOfDay;
      }
    }
  }

  // Elevate priority for concern areas
  for (const concern of answers.concerns) {
    const bucket = CONCERN_TO_BUCKET[concern];
    if (bucket && config[bucket]) {
      (config as any)[bucket].enabled = true;
      (config as any)[bucket].priority = 'required';
      (config as any)[bucket].notificationsEnabled = true;
    }
  }

  // If medications selected, ensure required priority
  if (answers.careAreas.includes('medications')) {
    config.meds.priority = 'required';
    config.meds.timesOfDay = timesOfDay;
  }

  return config;
}

// ============================================================================
// QUICK LOG CORE OPTIONS FROM ANSWERS
// Returns 3 IDs for the core quick-log buttons
// ============================================================================

export function getCoreQuickLogFromAnswers(answers: OnboardingAnswers): string[] {
  const core: string[] = [];

  // Always include wellness
  core.push('wellness');

  // Add from care areas (first 2 that map to quick-log IDs)
  const quickLogMap: Record<CareArea, string> = {
    medications: 'meds',
    meals: 'meals',
    vitals: 'vitals',
    doctor_visits: 'appointment',
    wellness: 'wellness',
  };

  for (const area of answers.careAreas) {
    const id = quickLogMap[area];
    if (id && !core.includes(id) && core.length < 3) {
      core.push(id);
    }
  }

  // Fill remaining slots from concerns
  if (core.length < 3 && answers.concerns.includes('hydration')) {
    core.push('hydration');
  }
  if (core.length < 3 && answers.concerns.includes('missed_medication') && !core.includes('meds')) {
    core.push('meds');
  }

  // Ensure we always have 3
  const fallbacks = ['meds', 'meals', 'hydration'];
  for (const fb of fallbacks) {
    if (core.length >= 3) break;
    if (!core.includes(fb)) core.push(fb);
  }

  return core.slice(0, 3);
}
