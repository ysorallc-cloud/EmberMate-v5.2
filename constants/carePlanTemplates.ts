// ============================================================================
// CARE PLAN TEMPLATES
// Pre-built care plan configurations for common caregiving scenarios
// ============================================================================

import { BucketType, BucketPriority } from '../types/carePlanConfig';

// ============================================================================
// TYPES
// ============================================================================

export interface BucketSuggestion {
  priority?: BucketPriority;
  timesOfDay?: ('morning' | 'midday' | 'evening' | 'night')[];
  // Vitals-specific
  vitalTypes?: string[];
  frequency?: string;
  // Meals-specific
  trackingStyle?: 'quick' | 'detailed';
  // Water-specific
  dailyGoalGlasses?: number;
}

export interface TemplateMedSuggestion {
  name: string;
  dosage: string;
  timesPerDay: number;
  timeSlots: ('morning' | 'midday' | 'evening' | 'night')[];
}

export interface CarePlanTemplate {
  id: string;
  name: string;
  description: string;
  emoji: string;
  enabledBuckets: BucketType[];
  suggestedSettings: Partial<Record<BucketType, BucketSuggestion>>;
  suggestedMedications?: TemplateMedSuggestion[];
}

// ============================================================================
// TEMPLATES
// ============================================================================

export const CARE_PLAN_TEMPLATES: CarePlanTemplate[] = [
  {
    id: 'elderly',
    name: 'Aging in Place',
    description: 'Medication adherence, vitals monitoring, nutrition, and appointment tracking for elderly care.',
    emoji: '\u{1F3E0}',
    enabledBuckets: ['meds', 'vitals', 'meals', 'wellness', 'appointments'],
    suggestedSettings: {
      meds: {
        priority: 'required',
        timesOfDay: ['morning', 'evening'],
      },
      vitals: {
        priority: 'required',
        timesOfDay: ['morning'],
        vitalTypes: ['bp', 'hr', 'weight'],
        frequency: 'daily',
      },
      meals: {
        priority: 'recommended',
        timesOfDay: ['morning', 'midday', 'evening'],
        trackingStyle: 'quick',
      },
      wellness: {
        priority: 'recommended',
        timesOfDay: ['morning', 'midday', 'evening'],
      },
      appointments: {
        priority: 'recommended',
      },
    },
    suggestedMedications: [
      { name: 'Lisinopril', dosage: '10mg', timesPerDay: 1, timeSlots: ['morning'] },
      { name: 'Atorvastatin', dosage: '40mg', timesPerDay: 1, timeSlots: ['evening'] },
      { name: 'Aspirin', dosage: '81mg', timesPerDay: 1, timeSlots: ['morning'] },
    ],
  },
  {
    id: 'post-surgical',
    name: 'Post-Surgical Recovery',
    description: 'Pain tracking, medication timing, activity progression, and vitals for post-op recovery.',
    emoji: '\u{1FA79}',
    enabledBuckets: ['meds', 'vitals', 'wellness', 'activity', 'meals'],
    suggestedSettings: {
      meds: {
        priority: 'required',
        timesOfDay: ['morning', 'midday', 'evening', 'night'],
      },
      vitals: {
        priority: 'required',
        timesOfDay: ['morning', 'evening'],
        vitalTypes: ['bp', 'hr', 'temp'],
        frequency: 'daily',
      },
      wellness: {
        priority: 'required',
        timesOfDay: ['morning', 'midday', 'evening'],
      },
      activity: {
        priority: 'recommended',
        timesOfDay: ['morning', 'evening'],
      },
      meals: {
        priority: 'recommended',
        timesOfDay: ['morning', 'midday', 'evening'],
        trackingStyle: 'quick',
      },
    },
    suggestedMedications: [
      { name: 'Acetaminophen', dosage: '500mg', timesPerDay: 3, timeSlots: ['morning', 'midday', 'evening'] },
      { name: 'Ibuprofen', dosage: '400mg', timesPerDay: 2, timeSlots: ['morning', 'evening'] },
    ],
  },
  {
    id: 'chronic-illness',
    name: 'Chronic Illness',
    description: 'Medication management, vitals, wellness tracking, and care team coordination for chronic conditions.',
    emoji: '\u{1F4CB}',
    enabledBuckets: ['meds', 'vitals', 'wellness', 'appointments'],
    suggestedSettings: {
      meds: {
        priority: 'required',
        timesOfDay: ['morning', 'evening'],
      },
      vitals: {
        priority: 'recommended',
        timesOfDay: ['morning'],
        vitalTypes: ['bp', 'hr'],
        frequency: 'daily',
      },
      wellness: {
        priority: 'recommended',
        timesOfDay: ['morning', 'midday', 'evening'],
      },
      appointments: {
        priority: 'required',
      },
    },
    suggestedMedications: [
      { name: 'Metformin', dosage: '500mg', timesPerDay: 2, timeSlots: ['morning', 'evening'] },
      { name: 'Lisinopril', dosage: '10mg', timesPerDay: 1, timeSlots: ['morning'] },
    ],
  },
  {
    id: 'general-wellness',
    name: 'General Wellness',
    description: 'Balanced daily tracking for nutrition, hydration, wellness, sleep, and activity.',
    emoji: '\u{2728}',
    enabledBuckets: ['meals', 'water', 'wellness', 'sleep', 'activity'],
    suggestedSettings: {
      meals: {
        priority: 'recommended',
        timesOfDay: ['morning', 'midday', 'evening'],
        trackingStyle: 'quick',
      },
      water: {
        priority: 'recommended',
        dailyGoalGlasses: 8,
      },
      wellness: {
        priority: 'recommended',
        timesOfDay: ['morning', 'midday', 'evening'],
      },
      sleep: {
        priority: 'recommended',
        timesOfDay: ['morning'],
      },
      activity: {
        priority: 'optional',
        timesOfDay: ['evening'],
      },
    },
  },
  {
    id: 'pediatric',
    name: 'Pediatric Recovery',
    description: 'Child-focused recovery with fluid tracking, medication timing, sleep monitoring, and gentle activity.',
    emoji: '\u{1F9F8}',
    enabledBuckets: ['meds', 'meals', 'sleep', 'activity', 'wellness'],
    suggestedSettings: {
      meds: {
        priority: 'required',
        timesOfDay: ['morning', 'midday', 'evening'],
      },
      meals: {
        priority: 'required',
        timesOfDay: ['morning', 'midday', 'evening'],
        trackingStyle: 'quick',
      },
      sleep: {
        priority: 'required',
        timesOfDay: ['morning', 'night'],
      },
      activity: {
        priority: 'recommended',
        timesOfDay: ['morning', 'evening'],
      },
      wellness: {
        priority: 'recommended',
        timesOfDay: ['morning', 'midday', 'evening'],
      },
    },
    suggestedMedications: [
      { name: 'Acetaminophen', dosage: '325mg', timesPerDay: 3, timeSlots: ['morning', 'midday', 'evening'] },
    ],
  },
  {
    id: 'mental-health',
    name: 'Mental Health Support',
    description: 'Wellness-first tracking with mood, sleep, activity, nutrition, and appointment management.',
    emoji: '\u{1F49C}',
    enabledBuckets: ['wellness', 'sleep', 'activity', 'appointments', 'meals'],
    suggestedSettings: {
      wellness: {
        priority: 'required',
        timesOfDay: ['morning'],
      },
      sleep: {
        priority: 'required',
        timesOfDay: ['morning'],
      },
      activity: {
        priority: 'recommended',
        timesOfDay: ['morning', 'evening'],
      },
      appointments: {
        priority: 'required',
      },
      meals: {
        priority: 'recommended',
        timesOfDay: ['morning', 'midday', 'evening'],
        trackingStyle: 'quick',
      },
    },
  },
  {
    id: 'hospice',
    name: 'Comfort Care / Hospice',
    description: 'Comfort-focused care with medication timing, wellness monitoring, nutrition support, and care team coordination.',
    emoji: '\u{1F54A}\uFE0F',
    enabledBuckets: ['meds', 'wellness', 'meals', 'appointments'],
    suggestedSettings: {
      meds: {
        priority: 'required',
        timesOfDay: ['morning', 'midday', 'evening', 'night'],
      },
      wellness: {
        priority: 'required',
        timesOfDay: ['morning', 'midday', 'evening'],
      },
      meals: {
        priority: 'recommended',
        timesOfDay: ['morning', 'midday', 'evening'],
        trackingStyle: 'quick',
      },
      appointments: {
        priority: 'recommended',
      },
    },
    suggestedMedications: [
      { name: 'Acetaminophen', dosage: '500mg', timesPerDay: 3, timeSlots: ['morning', 'midday', 'evening'] },
    ],
  },
];
