// ============================================================================
// QUICK LOG OPTIONS
// Defines all quick log types with core (3 always visible) and more options
// Each option maps to a BucketType for progressive disclosure filtering
// ============================================================================

import type { BucketType } from '../types/carePlanConfig';

export interface QuickLogOption {
  id: string;
  icon: string;
  label: string;
  description: string;
  screen: string; // Navigation target
  isCore: boolean; // Shows on TODAY screen
  category: 'core' | 'health' | 'daily' | 'care';
  bucketType: BucketType | null; // null = always visible regardless of config
}

export const QUICK_LOG_OPTIONS: QuickLogOption[] = [
  // CORE (shown on TODAY screen)
  {
    id: 'meds',
    icon: '💊',
    label: 'Meds',
    description: 'Log medication taken or skipped',
    screen: '/medication-confirm',
    isCore: true,
    category: 'core',
    bucketType: 'meds',
  },
  {
    id: 'wellness',
    icon: '🌅',
    label: 'Wellness',
    description: 'Morning or evening check-in',
    screen: '/log-morning-wellness',
    isCore: true,
    category: 'core',
    bucketType: 'wellness',
  },
  {
    id: 'meals',
    icon: '🍽️',
    label: 'Meals',
    description: 'Breakfast, lunch, dinner, snacks',
    screen: '/log-meal',
    isCore: true,
    category: 'core',
    bucketType: 'meals',
  },

  // MORE OPTIONS
  {
    id: 'note',
    icon: '📝',
    label: 'Note',
    description: 'Observation or reminder',
    screen: '/log-note',
    isCore: false,
    category: 'care',
    bucketType: null, // Always visible
  },
  {
    id: 'vitals',
    icon: '❤️',
    label: 'Vitals',
    description: 'BP, glucose, weight, O2, temp',
    screen: '/log-vitals',
    isCore: false,
    category: 'health',
    bucketType: 'vitals',
  },
  {
    id: 'hydration',
    icon: '💧',
    label: 'Hydration',
    description: 'Water and fluid intake',
    screen: '/log-water',
    isCore: false,
    category: 'daily',
    bucketType: 'water',
  },
  {
    id: 'sleep',
    icon: '💤',
    label: 'Sleep',
    description: 'Hours slept, quality',
    screen: '/log-sleep',
    isCore: false,
    category: 'daily',
    bucketType: 'sleep',
  },
  {
    id: 'activity',
    icon: '🚶',
    label: 'Activity',
    description: 'Exercise, steps, movement',
    screen: '/log-activity',
    isCore: false,
    category: 'daily',
    bucketType: 'activity',
  },
  {
    id: 'bathroom',
    icon: '🚽',
    label: 'Bathroom',
    description: 'Bowel movements, urination',
    screen: '/log-bathroom',
    isCore: false,
    category: 'health',
    bucketType: null, // General health — always visible
  },
  {
    id: 'symptom',
    icon: '🤒',
    label: 'Symptom',
    description: 'Log a symptom or side effect',
    screen: '/log-symptom',
    isCore: false,
    category: 'health',
    bucketType: null, // General health — always visible
  },
  {
    id: 'appointment',
    icon: '📅',
    label: 'Appointment',
    description: 'Schedule or log a visit',
    screen: '/appointments',
    isCore: false,
    category: 'care',
    bucketType: null, // Always visible
  },
];

// Helper to get core options
export const CORE_OPTIONS = QUICK_LOG_OPTIONS.filter((o) => o.isCore);

// Helper to get more options
export const MORE_OPTIONS = QUICK_LOG_OPTIONS.filter((o) => !o.isCore);

// ============================================================================
// PROGRESSIVE DISCLOSURE FILTER
// Returns options split by enabled/disabled bucket status
// ============================================================================

export interface FilteredOptions {
  core: QuickLogOption[];
  more: QuickLogOption[];
  disabled: QuickLogOption[];
}

export function getFilteredOptions(enabledBuckets: BucketType[]): FilteredOptions {
  const isVisible = (option: QuickLogOption): boolean =>
    option.bucketType === null || enabledBuckets.includes(option.bucketType);

  const visibleCore = CORE_OPTIONS.filter(isVisible);
  const visibleMore = MORE_OPTIONS.filter(isVisible);
  const disabled = QUICK_LOG_OPTIONS.filter(o => !isVisible(o));

  return { core: visibleCore, more: visibleMore, disabled };
}
