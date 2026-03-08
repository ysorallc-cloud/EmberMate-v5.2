// ============================================================================
// CARE PLAN DEFAULTS
// Generates a realistic default care plan for new users
// ============================================================================

import { CarePlan, CarePlanRoutine, CarePlanItem } from '../types/dayState';

// ============================================================================
// PLAN TEMPLATES
// ============================================================================

export type CarePlanTemplate = 'basic' | 'vitals-focused' | 'medication-heavy';

export interface CarePlanTemplateInfo {
  id: CarePlanTemplate;
  name: string;
  description: string;
  emoji: string;
}

export const CARE_PLAN_TEMPLATES: CarePlanTemplateInfo[] = [
  {
    id: 'basic',
    name: 'Basic Daily Care',
    description: 'Morning & evening routines with meds, meals, and wellness tracking',
    emoji: '🌟',
  },
  {
    id: 'vitals-focused',
    name: 'Vitals-Focused',
    description: 'Extra emphasis on BP, glucose, and weight monitoring',
    emoji: '📊',
  },
  {
    id: 'medication-heavy',
    name: 'Medication-Heavy',
    description: 'Multiple med times throughout the day with reminders',
    emoji: '💊',
  },
];

/**
 * Generate a care plan based on template selection
 */
export function generateCarePlanFromTemplate(template: CarePlanTemplate): CarePlan {
  const now = new Date().toISOString();

  switch (template) {
    case 'vitals-focused':
      return {
        id: 'vitals-focused',
        version: 1,
        createdAt: now,
        updatedAt: now,
        routines: [
          generateMorningRoutineVitalsFocused(),
          generateMiddayRoutine(),
          generateEveningRoutineVitalsFocused(),
        ],
      };
    case 'medication-heavy':
      return {
        id: 'medication-heavy',
        version: 1,
        createdAt: now,
        updatedAt: now,
        routines: [
          generateMorningRoutineMedHeavy(),
          generateMiddayRoutineMedHeavy(),
          generateEveningRoutineMedHeavy(),
          generateBedtimeRoutineMedHeavy(),
        ],
      };
    case 'basic':
    default:
      return generateDefaultCarePlan();
  }
}

/**
 * Generate a realistic default care plan
 * Includes: 4 routines covering the full day
 * Designed to make the app feel "alive" from day one
 */
export function generateDefaultCarePlan(): CarePlan {
  const now = new Date().toISOString();

  return {
    id: 'default',
    version: 1,
    createdAt: now,
    updatedAt: now,
    routines: [
      generateMorningRoutine(),
      generateMiddayRoutine(),
      generateEveningRoutine(),
      generateBedtimeRoutine(),
    ],
  };
}

/**
 * Morning routine (6 AM - 10 AM)
 * Covers: medications, vitals, breakfast, wellness check
 */
function generateMorningRoutine(): CarePlanRoutine {
  return {
    id: 'morning',
    name: 'Morning Routine',
    emoji: '🌅',
    timeWindow: {
      start: '06:00',
      end: '10:00',
    },
    items: [
      {
        id: 'morning-meds',
        type: 'meds',
        label: 'Morning medications',
        emoji: '💊',
        target: 1,  // Target 1 as specified in requirements
        completionRule: 'derived',
        link: '/medication-confirm',
        metadata: {
          timeSlot: 'morning',
        },
      },
      {
        id: 'morning-vitals',
        type: 'vitals',
        label: 'Check vitals',
        emoji: '📊',
        target: 1,
        completionRule: 'derived',
        link: '/log-vitals',
        metadata: {
          vitalTypes: ['systolic', 'diastolic', 'glucose', 'heartRate'],
        },
      },
      {
        id: 'breakfast',
        type: 'meals',
        label: 'Breakfast',
        emoji: '🍳',
        target: 1,
        completionRule: 'derived',
        link: '/log-meal',
        metadata: {
          mealTypes: ['Breakfast'],
        },
      },
      {
        id: 'morning-wellness',
        type: 'wellness',
        label: 'Morning wellness check',
        emoji: '🌅',
        target: 1,
        completionRule: 'derived',
        link: '/log-morning-wellness',
      },
    ],
  };
}

/**
 * Midday routine (11 AM - 2 PM)
 * Covers: hydration, lunch, optional movement/PT
 */
function generateMiddayRoutine(): CarePlanRoutine {
  return {
    id: 'midday',
    name: 'Midday Check-in',
    emoji: '☀️',
    timeWindow: {
      start: '11:00',
      end: '14:00',
    },
    items: [
      {
        id: 'midday-hydration',
        type: 'hydration',
        label: 'Water check',
        emoji: '💧',
        target: 4,  // 4 glasses by midday
        completionRule: 'derived',
        link: '/log-water',
      },
      {
        id: 'lunch',
        type: 'meals',
        label: 'Lunch',
        emoji: '🥗',
        target: 1,
        completionRule: 'derived',
        link: '/log-meal',
        metadata: {
          mealTypes: ['Lunch'],
        },
      },
      {
        id: 'midday-movement',
        type: 'custom',
        label: 'Movement / PT',
        emoji: '🚶',
        target: 1,
        completionRule: 'manual',
        link: '/log-activity',
      },
    ],
  };
}

/**
 * Evening routine (5 PM - 8 PM)
 * Covers: medications, dinner, symptoms check
 */
function generateEveningRoutine(): CarePlanRoutine {
  return {
    id: 'evening',
    name: 'Evening Routine',
    emoji: '🌙',
    timeWindow: {
      start: '17:00',
      end: '20:00',
    },
    items: [
      {
        id: 'evening-meds',
        type: 'meds',
        label: 'Evening medications',
        emoji: '💊',
        target: 1,
        completionRule: 'derived',
        link: '/medication-confirm',
        metadata: {
          timeSlot: 'evening',
        },
      },
      {
        id: 'dinner',
        type: 'meals',
        label: 'Dinner',
        emoji: '🍽️',
        target: 1,
        completionRule: 'derived',
        link: '/log-meal',
        metadata: {
          mealTypes: ['Dinner'],
        },
      },
      {
        id: 'evening-wellness',
        type: 'wellness',
        label: 'Evening wellness check',
        emoji: '🌅',
        target: 1,
        completionRule: 'derived',
        link: '/log-evening-wellness',
      },
    ],
  };
}

/**
 * Bedtime routine (8 PM - 10 PM)
 * Covers: sleep prep, optional night meds
 */
function generateBedtimeRoutine(): CarePlanRoutine {
  return {
    id: 'bedtime',
    name: 'Bedtime Routine',
    emoji: '🛏️',
    timeWindow: {
      start: '20:00',
      end: '22:00',
    },
    items: [
      {
        id: 'sleep-prep',
        type: 'sleep',
        label: 'Sleep prep',
        emoji: '😴',
        target: 1,
        completionRule: 'manual',
        link: '/log-sleep',
      },
      {
        id: 'evening-hydration',
        type: 'hydration',
        label: 'Final water check',
        emoji: '💧',
        target: 8,  // Total for day
        completionRule: 'derived',
        link: '/log-water',
      },
    ],
  };
}

// ============================================================================
// VITALS-FOCUSED TEMPLATE ROUTINES
// ============================================================================

function generateMorningRoutineVitalsFocused(): CarePlanRoutine {
  return {
    id: 'morning',
    name: 'Morning Routine',
    emoji: '🌅',
    timeWindow: {
      start: '06:00',
      end: '10:00',
    },
    items: [
      {
        id: 'morning-meds',
        type: 'meds',
        label: 'Morning medications',
        emoji: '💊',
        target: 1,
        completionRule: 'derived',
        link: '/medication-confirm',
        metadata: { timeSlot: 'morning' },
      },
      {
        id: 'morning-bp',
        type: 'vitals',
        label: 'Blood pressure',
        emoji: '🩺',
        target: 1,
        completionRule: 'derived',
        link: '/log-vitals',
        metadata: { vitalTypes: ['systolic', 'diastolic'] },
      },
      {
        id: 'morning-glucose',
        type: 'vitals',
        label: 'Blood glucose (fasting)',
        emoji: '🩸',
        target: 1,
        completionRule: 'derived',
        link: '/log-vitals',
        metadata: { vitalTypes: ['glucose'] },
      },
      {
        id: 'morning-weight',
        type: 'vitals',
        label: 'Weight check',
        emoji: '⚖️',
        target: 1,
        completionRule: 'derived',
        link: '/log-vitals',
        metadata: { vitalTypes: ['weight'] },
      },
      {
        id: 'breakfast',
        type: 'meals',
        label: 'Breakfast',
        emoji: '🍳',
        target: 1,
        completionRule: 'derived',
        link: '/log-meal',
        metadata: { mealTypes: ['Breakfast'] },
      },
    ],
  };
}

function generateEveningRoutineVitalsFocused(): CarePlanRoutine {
  return {
    id: 'evening',
    name: 'Evening Routine',
    emoji: '🌙',
    timeWindow: {
      start: '17:00',
      end: '21:00',
    },
    items: [
      {
        id: 'evening-meds',
        type: 'meds',
        label: 'Evening medications',
        emoji: '💊',
        target: 1,
        completionRule: 'derived',
        link: '/medication-confirm',
        metadata: { timeSlot: 'evening' },
      },
      {
        id: 'evening-bp',
        type: 'vitals',
        label: 'Evening blood pressure',
        emoji: '🩺',
        target: 1,
        completionRule: 'derived',
        link: '/log-vitals',
        metadata: { vitalTypes: ['systolic', 'diastolic'] },
      },
      {
        id: 'dinner',
        type: 'meals',
        label: 'Dinner',
        emoji: '🍽️',
        target: 1,
        completionRule: 'derived',
        link: '/log-meal',
        metadata: { mealTypes: ['Dinner'] },
      },
    ],
  };
}

// ============================================================================
// MEDICATION-HEAVY TEMPLATE ROUTINES
// ============================================================================

function generateMorningRoutineMedHeavy(): CarePlanRoutine {
  return {
    id: 'morning',
    name: 'Morning Routine',
    emoji: '🌅',
    timeWindow: {
      start: '06:00',
      end: '09:00',
    },
    items: [
      {
        id: 'morning-meds',
        type: 'meds',
        label: 'Morning medications',
        emoji: '💊',
        target: 3,  // Multiple morning meds
        completionRule: 'derived',
        link: '/medication-confirm',
        metadata: { timeSlot: 'morning' },
      },
      {
        id: 'morning-vitals',
        type: 'vitals',
        label: 'Check vitals',
        emoji: '📊',
        target: 1,
        completionRule: 'derived',
        link: '/log-vitals',
      },
      {
        id: 'breakfast',
        type: 'meals',
        label: 'Breakfast (with meds)',
        emoji: '🍳',
        target: 1,
        completionRule: 'derived',
        link: '/log-meal',
        metadata: { mealTypes: ['Breakfast'] },
      },
    ],
  };
}

function generateMiddayRoutineMedHeavy(): CarePlanRoutine {
  return {
    id: 'midday',
    name: 'Midday Meds',
    emoji: '☀️',
    timeWindow: {
      start: '11:00',
      end: '13:00',
    },
    items: [
      {
        id: 'midday-meds',
        type: 'meds',
        label: 'Midday medications',
        emoji: '💊',
        target: 2,
        completionRule: 'derived',
        link: '/medication-confirm',
        metadata: { timeSlot: 'afternoon' },
      },
      {
        id: 'lunch',
        type: 'meals',
        label: 'Lunch',
        emoji: '🥗',
        target: 1,
        completionRule: 'derived',
        link: '/log-meal',
        metadata: { mealTypes: ['Lunch'] },
      },
    ],
  };
}

function generateEveningRoutineMedHeavy(): CarePlanRoutine {
  return {
    id: 'evening',
    name: 'Evening Routine',
    emoji: '🌙',
    timeWindow: {
      start: '17:00',
      end: '20:00',
    },
    items: [
      {
        id: 'evening-meds',
        type: 'meds',
        label: 'Evening medications',
        emoji: '💊',
        target: 3,
        completionRule: 'derived',
        link: '/medication-confirm',
        metadata: { timeSlot: 'evening' },
      },
      {
        id: 'dinner',
        type: 'meals',
        label: 'Dinner (with meds)',
        emoji: '🍽️',
        target: 1,
        completionRule: 'derived',
        link: '/log-meal',
        metadata: { mealTypes: ['Dinner'] },
      },
      {
        id: 'evening-wellness',
        type: 'wellness',
        label: 'Evening wellness check',
        emoji: '🌅',
        target: 1,
        completionRule: 'derived',
        link: '/log-evening-wellness',
      },
    ],
  };
}

function generateBedtimeRoutineMedHeavy(): CarePlanRoutine {
  return {
    id: 'bedtime',
    name: 'Bedtime Meds',
    emoji: '🛏️',
    timeWindow: {
      start: '20:00',
      end: '22:00',
    },
    items: [
      {
        id: 'bedtime-meds',
        type: 'meds',
        label: 'Bedtime medications',
        emoji: '💊',
        target: 2,
        completionRule: 'derived',
        link: '/medication-confirm',
        metadata: { timeSlot: 'bedtime' },
      },
      {
        id: 'sleep-prep',
        type: 'sleep',
        label: 'Sleep quality prep',
        emoji: '😴',
        target: 1,
        completionRule: 'manual',
        link: '/log-sleep',
      },
    ],
  };
}

/**
 * Generate an empty care plan for users who want to start fresh
 */
export function generateEmptyCarePlan(): CarePlan {
  const now = new Date().toISOString();

  return {
    id: 'custom',
    version: 1,
    createdAt: now,
    updatedAt: now,
    routines: [],
  };
}

// ============================================================================
// ITEM TYPE DEFINITIONS (for Add Item workflow)
// ============================================================================

export interface ItemTypeOption {
  type: CarePlanItem['type'];
  label: string;
  emoji: string;
  defaultTarget: number;
  targetType: 'count' | 'done';  // count = numerical, done = 1 (done/later)
  link: string;
  description: string;
}

export const ITEM_TYPE_OPTIONS: ItemTypeOption[] = [
  {
    type: 'meds',
    label: 'Medications',
    emoji: '💊',
    defaultTarget: 1,
    targetType: 'count',
    link: '/medication-confirm',
    description: 'Track medication doses',
  },
  {
    type: 'vitals',
    label: 'Vitals',
    emoji: '📊',
    defaultTarget: 1,
    targetType: 'done',
    link: '/log-vitals',
    description: 'Blood pressure, glucose, weight',
  },
  {
    type: 'meals',
    label: 'Meals',
    emoji: '🍽️',
    defaultTarget: 1,
    targetType: 'done',
    link: '/log-meal',
    description: 'Breakfast, lunch, dinner, snacks',
  },
  {
    type: 'hydration',
    label: 'Hydration',
    emoji: '💧',
    defaultTarget: 8,
    targetType: 'count',
    link: '/log-water',
    description: 'Water intake (glasses)',
  },
  {
    type: 'wellness',
    label: 'Wellness',
    emoji: '🌅',
    defaultTarget: 1,
    targetType: 'done',
    link: '/log-morning-wellness',
    description: 'Morning or evening wellness check-in',
  },
  {
    type: 'custom',
    label: 'Movement / PT',
    emoji: '🚶',
    defaultTarget: 1,
    targetType: 'done',
    link: '/log-activity',
    description: 'Physical therapy or exercise',
  },
  {
    type: 'custom',
    label: 'Notes',
    emoji: '📝',
    defaultTarget: 1,
    targetType: 'done',
    link: '/log-note',
    description: 'General observations',
  },
];

/**
 * Create a new care plan item from a type option
 */
export function createItemFromType(
  typeOption: ItemTypeOption,
  customLabel?: string,
  customTarget?: number
): CarePlanItem {
  const id = `${typeOption.type}-${Date.now()}`;

  return {
    id,
    type: typeOption.type,
    label: customLabel || typeOption.label,
    emoji: typeOption.emoji,
    target: customTarget ?? typeOption.defaultTarget,
    completionRule: typeOption.targetType === 'done' ? 'manual' : 'derived',
    link: typeOption.link,
  };
}

/**
 * Create a new routine with default structure
 */
export function createRoutine(
  id: string,
  name: string,
  emoji: string,
  startTime: string,
  endTime: string
): CarePlanRoutine {
  return {
    id,
    name,
    emoji,
    timeWindow: {
      start: startTime,
      end: endTime,
    },
    items: [],
  };
}

/**
 * Create a new care plan item
 */
export function createItem(
  id: string,
  type: CarePlanItem['type'],
  label: string,
  link: string,
  target: number = 1,
  emoji?: string
): CarePlanItem {
  return {
    id,
    type,
    label,
    emoji,
    target,
    completionRule: 'derived',
    link,
  };
}

/**
 * Get suggested routines based on common patterns
 */
export function getSuggestedRoutines(): { id: string; name: string; emoji: string; description: string }[] {
  return [
    {
      id: 'morning',
      name: 'Morning Routine',
      emoji: '🌅',
      description: 'Start the day: medications, vitals, breakfast',
    },
    {
      id: 'midday',
      name: 'Midday Check-in',
      emoji: '☀️',
      description: 'Lunch, hydration, wellness check',
    },
    {
      id: 'evening',
      name: 'Evening Routine',
      emoji: '🌙',
      description: 'Dinner, evening medications, wind down',
    },
    {
      id: 'bedtime',
      name: 'Bedtime Routine',
      emoji: '🛏️',
      description: 'Night medications, sleep prep',
    },
  ];
}

/**
 * Get suggested items for each type
 */
export function getSuggestedItems(type: CarePlanItem['type']): Partial<CarePlanItem>[] {
  switch (type) {
    case 'meds':
      return [
        { label: 'Morning medications', emoji: '💊', target: 2 },
        { label: 'Afternoon medications', emoji: '💊', target: 1 },
        { label: 'Evening medications', emoji: '💊', target: 2 },
        { label: 'Bedtime medications', emoji: '💊', target: 1 },
      ];
    case 'vitals':
      return [
        { label: 'Blood pressure', emoji: '🩺', target: 1 },
        { label: 'Blood glucose', emoji: '🩸', target: 1 },
        { label: 'Weight', emoji: '⚖️', target: 1 },
        { label: 'Full vitals check', emoji: '📊', target: 1 },
      ];
    case 'meals':
      return [
        { label: 'Breakfast', emoji: '🍳', target: 1 },
        { label: 'Lunch', emoji: '🥗', target: 1 },
        { label: 'Dinner', emoji: '🍽️', target: 1 },
        { label: 'Snack', emoji: '🍎', target: 1 },
      ];
    case 'hydration':
      return [
        { label: 'Water intake', emoji: '💧', target: 8 },
      ];
    case 'sleep':
      return [
        { label: 'Sleep quality', emoji: '😴', target: 1 },
      ];
    default:
      return [];
  }
}
