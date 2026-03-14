// ============================================================================
// CARE PLAN CONFIGURATION TYPES
// The "Brain" - Persistent configuration of what to track and how
// ============================================================================
// Care Plan = configuration of what to track (NOT a daily checklist)
// Now = reflection of plan status and what's due (status view)
// Journal = history review & handoff
// Understand = insights, trends, reports (analysis)
// ============================================================================

// ============================================================================
// BUCKET TYPES - Categories of care to track
// ============================================================================

export type BucketType =
  | 'meds'
  | 'vitals'
  | 'meals'
  | 'water'
  | 'sleep'
  | 'activity'
  | 'wellness'
  | 'appointments';

export const BUCKET_TYPES: BucketType[] = [
  'meds',
  'vitals',
  'meals',
  'water',
  'sleep',
  'activity',
  'wellness',
  'appointments',
];

// Primary buckets shown by default
export const PRIMARY_BUCKETS: BucketType[] = ['meds', 'meals', 'water', 'wellness'];

// Secondary buckets hidden behind "More" initially
export const SECONDARY_BUCKETS: BucketType[] = ['vitals', 'sleep', 'activity'];

// Appointments is optional/separate
export const OPTIONAL_BUCKETS: BucketType[] = ['appointments'];

// ============================================================================
// BUCKET METADATA
// ============================================================================

export interface BucketMeta {
  type: BucketType;
  name: string;
  emoji: string;
  aiInsight: string; // Educational, non-medical description
  route: string; // Log screen route
}

export const BUCKET_META: Record<BucketType, BucketMeta> = {
  meds: {
    type: 'meds',
    name: 'Medications',
    emoji: '\uD83D\uDC8A',
    aiInsight: 'Keeps dosing and adherence accurate for reports and patterns.',
    route: '/medications',
  },
  vitals: {
    type: 'vitals',
    name: 'Vitals',
    emoji: '\uD83D\uDCCA',
    aiInsight: 'Makes trends visible over time, even when readings look fine day to day.',
    route: '/quick-log?expand=vitals',
  },
  meals: {
    type: 'meals',
    name: 'Meals',
    emoji: '\uD83C\uDF7D\uFE0F',
    aiInsight: 'Adds context to mood, energy, and symptoms.',
    route: '/log-meal',
  },
  water: {
    type: 'water',
    name: 'Water',
    emoji: '\uD83D\uDCA7',
    aiInsight: 'Supports hydration goals and explains fatigue or headaches.',
    route: '/quick-log?expand=hydration',
  },
  sleep: {
    type: 'sleep',
    name: 'Sleep',
    emoji: '\uD83D\uDE34',
    aiInsight: 'Links rest quality to symptoms and energy.',
    route: '/quick-log?expand=sleep',
  },
  activity: {
    type: 'activity',
    name: 'Activity',
    emoji: '\uD83D\uDEB6',
    aiInsight: 'Shows how movement connects to energy, mood, and overall wellness.',
    route: '/quick-log?expand=activity',
  },
  wellness: {
    type: 'wellness',
    name: 'Wellness',
    emoji: '\uD83C\uDF05',
    aiInsight: 'Morning and evening check-ins track sleep, mood, orientation, and pain over time.',
    route: '/log-morning-wellness',
  },
  appointments: {
    type: 'appointments',
    name: 'Appointments',
    emoji: '\uD83D\uDCC5',
    aiInsight: 'Prepares visit summaries and keeps care team info organized.',
    route: '/appointments',
  },
};

// ============================================================================
// TIME OF DAY
// ============================================================================

export type TimeOfDay = 'morning' | 'midday' | 'evening' | 'night' | 'custom';

export const TIME_OF_DAY_OPTIONS: { value: TimeOfDay; label: string; time: string }[] = [
  { value: 'morning', label: 'Morning', time: '8:00 AM' },
  { value: 'midday', label: 'Midday', time: '12:00 PM' },
  { value: 'evening', label: 'Evening', time: '6:00 PM' },
  { value: 'night', label: 'Night', time: '9:00 PM' },
  { value: 'custom', label: 'Custom', time: '' },
];

// Default times (HH:mm format)
export const TIME_OF_DAY_DEFAULTS: Record<TimeOfDay, string> = {
  morning: '08:00',
  midday: '12:00',
  evening: '18:00',
  night: '21:00',
  custom: '',
};

// ============================================================================
// PRIORITY LEVELS
// ============================================================================

export type BucketPriority = 'required' | 'recommended' | 'optional';

export const PRIORITY_OPTIONS: { value: BucketPriority; label: string; description: string }[] = [
  { value: 'required', label: 'Required', description: 'Critical for care - always prompted' },
  { value: 'recommended', label: 'Recommended', description: 'Important - gentle reminders' },
  { value: 'optional', label: 'Optional', description: 'Track when you remember' },
];

// ============================================================================
// NOTIFICATION SCHEDULE
// ============================================================================

export type NotificationRepeat = 'none' | 'daily' | 'weekdays';

export interface NotificationSchedule {
  leadMinutes?: number; // Minutes before time to notify (0, 5, 10, 15, 30)
  repeat?: NotificationRepeat;
}

// ============================================================================
// BUCKET CONFIG - Base configuration for each category
// ============================================================================

export interface BucketConfig {
  enabled: boolean;
  priority: BucketPriority;
  timesOfDay: TimeOfDay[];
  customTimes?: string[]; // HH:mm format
  notificationsEnabled?: boolean;
  notificationSchedule?: NotificationSchedule;
  units?: string; // For water: oz/ml, for weight: lbs/kg
  targets?: {
    dailyGoal?: number;
    min?: number;
    max?: number;
  };
  notes?: string;
}

// ============================================================================
// CATEGORY-SPECIFIC CONFIGS
// ============================================================================

// ============================================================================
// MEDICATION REMINDER TYPES
// ============================================================================

export type ReminderTiming = 'at_time' | 'before_15' | 'before_30' | 'before_60' | 'custom';

export const REMINDER_TIMING_OPTIONS: { value: ReminderTiming; label: string; minutes: number }[] = [
  { value: 'at_time', label: 'At time of dose', minutes: 0 },
  { value: 'before_15', label: '15 minutes before', minutes: 15 },
  { value: 'before_30', label: '30 minutes before', minutes: 30 },
  { value: 'before_60', label: '1 hour before', minutes: 60 },
  { value: 'custom', label: 'Custom', minutes: 0 },
];

export type FollowUpInterval = 15 | 30 | 60;

export const FOLLOW_UP_OPTIONS: { value: FollowUpInterval; label: string }[] = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
];

// ============================================================================
// MEDICATION SCHEDULE TYPES
// ============================================================================

export type ScheduleFrequency = 'daily' | 'every_other_day' | 'weekly' | 'custom';

export const SCHEDULE_FREQUENCY_OPTIONS: { value: ScheduleFrequency; label: string; description?: string }[] = [
  { value: 'daily', label: 'Daily', description: 'Every day' },
  { value: 'every_other_day', label: 'Every other day', description: 'Alternating days' },
  { value: 'weekly', label: 'Weekly', description: 'Once per week' },
  { value: 'custom', label: 'Custom', description: 'Select specific days' },
];

export type ScheduleEndCondition = 'ongoing' | 'until_supply' | 'end_date';

export const SCHEDULE_END_OPTIONS: { value: ScheduleEndCondition; label: string }[] = [
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'until_supply', label: 'Until supply runs out' },
  { value: 'end_date', label: 'End date' },
];

// Day of week helpers (0 = Sunday, 6 = Saturday)
export const DAYS_OF_WEEK = [
  { value: 0, label: 'S', fullLabel: 'Sunday' },
  { value: 1, label: 'M', fullLabel: 'Monday' },
  { value: 2, label: 'T', fullLabel: 'Tuesday' },
  { value: 3, label: 'W', fullLabel: 'Wednesday' },
  { value: 4, label: 'T', fullLabel: 'Thursday' },
  { value: 5, label: 'F', fullLabel: 'Friday' },
  { value: 6, label: 'S', fullLabel: 'Saturday' },
];

// Medication Plan Item (individual medication)
export interface MedicationPlanItem {
  id: string;
  name: string;
  dosage: string;
  instructions?: string; // "take with food"
  timesOfDay: TimeOfDay[];
  customTimes?: string[]; // HH:mm format (legacy, prefer scheduledTimeHHmm)
  scheduledTimeHHmm?: string | null; // CANONICAL: validated "HH:mm" or null if not set
  supplyEnabled?: boolean;
  daysSupply?: number;
  refillThresholdDays?: number; // Default 7
  active: boolean;
  createdAt: string;
  updatedAt: string;

  // ===== REMINDERS (Notify Me) =====
  // Controls WHEN alerts fire, not the schedule itself
  notificationsEnabled?: boolean; // Master toggle (default: true for meds)
  reminderTiming?: ReminderTiming; // When to notify relative to dose time
  reminderCustomMinutes?: number; // Only used when reminderTiming === 'custom'
  followUpEnabled?: boolean; // Remind again if not logged
  followUpInterval?: FollowUpInterval; // How often to follow up (15, 30, 60 min)
  followUpMaxAttempts?: number; // Hard stop after X attempts (default: 3)

  // ===== SCHEDULE (Repeat) =====
  // Controls WHEN the dose occurs (which days it appears in Care Plan)
  scheduleFrequency?: ScheduleFrequency; // How often (default: 'daily' for meds)
  scheduleDaysOfWeek?: number[]; // For 'weekly' or 'custom': which days (0-6)
  scheduleEndCondition?: ScheduleEndCondition; // When to stop
  scheduleEndDate?: string; // ISO date for 'end_date' condition
}

// Meds Bucket extends base config with medication list
export interface MedsBucketConfig extends BucketConfig {
  medications: MedicationPlanItem[];
}

// Vitals Bucket extends base config with vital types
export type VitalType = 'bp' | 'hr' | 'spo2' | 'glucose' | 'temp' | 'weight';

export interface VitalsBucketConfig extends BucketConfig {
  vitalTypes: VitalType[];
  frequency?: 'daily' | 'weekly' | 'as_needed';
}

export const VITAL_TYPE_OPTIONS: { value: VitalType; label: string; emoji: string }[] = [
  { value: 'bp', label: 'Blood Pressure', emoji: '\uD83E\uDE78' },
  { value: 'hr', label: 'Heart Rate', emoji: '\u2764\uFE0F' },
  { value: 'spo2', label: 'Oxygen Level', emoji: '\uD83E\uDEC1' },
  { value: 'glucose', label: 'Blood Sugar', emoji: '\uD83E\uDE78' },
  { value: 'temp', label: 'Temperature', emoji: '\uD83C\uDF21\uFE0F' },
  { value: 'weight', label: 'Weight', emoji: '\u2696\uFE0F' },
];

// Meals/Water Bucket extends with tracking style
export type TrackingStyle = 'quick' | 'detailed';

export interface MealsBucketConfig extends BucketConfig {
  trackingStyle?: TrackingStyle;
}

// Water reminder frequency options
export type WaterReminderFrequency = 'none' | 'every_2h' | 'every_3h' | 'every_4h' | 'custom';

export const WATER_REMINDER_OPTIONS: { value: WaterReminderFrequency; label: string; description: string }[] = [
  { value: 'none', label: 'No reminders', description: 'Log when you remember' },
  { value: 'every_2h', label: 'Every 2 hours', description: '8am - 8pm' },
  { value: 'every_3h', label: 'Every 3 hours', description: '8am - 8pm' },
  { value: 'every_4h', label: 'Every 4 hours', description: '8am - 8pm' },
  { value: 'custom', label: 'Custom times', description: 'Set specific reminder times' },
];

export interface WaterBucketConfig extends BucketConfig {
  trackingStyle?: TrackingStyle;
  dailyGoalGlasses?: number; // Default 8
  reminderFrequency?: WaterReminderFrequency; // Default 'none'
  reminderTimes?: string[]; // HH:mm format for custom reminders
}

// ============================================================================
// CARE PLAN - Main configuration object
// ============================================================================

export interface CarePlanConfig {
  id: string;
  patientId: string;
  createdAt: string;
  updatedAt: string;
  version: number;

  // Bucket configurations
  meds: MedsBucketConfig;
  vitals: VitalsBucketConfig;
  meals: MealsBucketConfig;
  water: WaterBucketConfig;
  sleep: BucketConfig;
  activity: BucketConfig;
  wellness: BucketConfig;
  appointments: BucketConfig;
}

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

export const DEFAULT_BUCKET_CONFIG: BucketConfig = {
  enabled: false,
  priority: 'recommended',
  timesOfDay: ['morning'],
  notificationsEnabled: false,
};

export const DEFAULT_MEDS_CONFIG: MedsBucketConfig = {
  ...DEFAULT_BUCKET_CONFIG,
  medications: [],
};

export const DEFAULT_VITALS_CONFIG: VitalsBucketConfig = {
  ...DEFAULT_BUCKET_CONFIG,
  vitalTypes: ['bp', 'hr'],
  frequency: 'daily',
};

export const DEFAULT_MEALS_CONFIG: MealsBucketConfig = {
  ...DEFAULT_BUCKET_CONFIG,
  timesOfDay: ['morning', 'midday', 'evening'],
  trackingStyle: 'quick',
};

export const DEFAULT_WATER_CONFIG: WaterBucketConfig = {
  ...DEFAULT_BUCKET_CONFIG,
  trackingStyle: 'quick',
  dailyGoalGlasses: 8,
  units: 'glasses',
};

export function createDefaultCarePlanConfig(patientId: string): CarePlanConfig {
  const now = new Date().toISOString();
  return {
    id: `careplan_${Date.now()}`,
    patientId,
    createdAt: now,
    updatedAt: now,
    version: 1,
    meds: { ...DEFAULT_MEDS_CONFIG, enabled: true, priority: 'required', timesOfDay: ['morning', 'midday', 'evening'] },
    vitals: { ...DEFAULT_VITALS_CONFIG },
    meals: { ...DEFAULT_MEALS_CONFIG, enabled: true, priority: 'recommended', timesOfDay: ['morning', 'midday', 'evening'] },
    water: { ...DEFAULT_WATER_CONFIG, enabled: true, priority: 'recommended' },
    sleep: { ...DEFAULT_BUCKET_CONFIG },
    activity: { ...DEFAULT_BUCKET_CONFIG },
    wellness: { ...DEFAULT_BUCKET_CONFIG, enabled: true, priority: 'recommended', timesOfDay: ['morning', 'evening'] },
    appointments: { ...DEFAULT_BUCKET_CONFIG },
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if any bucket is enabled in the care plan
 */
export function hasAnyEnabledBucket(config: CarePlanConfig): boolean {
  return BUCKET_TYPES.some(bucket => config[bucket]?.enabled === true);
}

/**
 * Get list of enabled bucket types
 */
export function getEnabledBuckets(config: CarePlanConfig): BucketType[] {
  const buckets = BUCKET_TYPES.filter(bucket => config[bucket]?.enabled === true);
  // Wellness is always-on — force-include if missing
  if (!buckets.includes('wellness')) buckets.push('wellness');
  return buckets;
}

/**
 * Get bucket config by type
 */
export function getBucketConfig(config: CarePlanConfig, bucket: BucketType): BucketConfig {
  return config[bucket];
}

/**
 * Check if a specific bucket is enabled
 */
export function isBucketEnabled(config: CarePlanConfig, bucket: BucketType): boolean {
  return config[bucket]?.enabled === true;
}

/**
 * Get status text for a bucket (e.g., "3 meds", "BP + HR")
 */
export function getBucketStatusText(config: CarePlanConfig, bucket: BucketType): string | null {
  const bucketConfig = config[bucket];
  if (!bucketConfig?.enabled) return null;

  switch (bucket) {
    case 'meds': {
      const medsConfig = bucketConfig as MedsBucketConfig;
      const activeMeds = medsConfig.medications?.filter(m => m.active) || [];
      return activeMeds.length > 0 ? `${activeMeds.length} meds` : null;
    }
    case 'vitals': {
      const vitalsConfig = bucketConfig as VitalsBucketConfig;
      const types = vitalsConfig.vitalTypes || [];
      if (types.length === 0) return null;
      if (types.length <= 2) {
        return types.map(t => t.toUpperCase()).join(' + ');
      }
      return `${types.length} vitals`;
    }
    case 'meals': {
      const mealsConfig = bucketConfig as MealsBucketConfig;
      const times = mealsConfig.timesOfDay || [];
      const mealNames: Record<string, string> = {
        morning: 'Breakfast',
        midday: 'Lunch',
        evening: 'Dinner',
        night: 'Snack',
      };
      if (times.length === 0) return null;
      const names = times.map(t => mealNames[t] || t).join(', ');
      const style = mealsConfig.trackingStyle === 'detailed' ? 'Detailed' : 'Quick';
      return `${names} · ${style} log`;
    }
    case 'water': {
      const waterConfig = bucketConfig as WaterBucketConfig;
      const goal = waterConfig.dailyGoalGlasses || 8;
      return `Goal: ${goal} ${waterConfig.units || 'glasses'}`;
    }
    case 'sleep': {
      const times = bucketConfig.timesOfDay || [];
      if (times.length === 0) return null;
      return `Tracked ${times.join(', ')}`;
    }
    case 'activity': {
      const times = bucketConfig.timesOfDay || [];
      if (times.length === 0) return null;
      return `Tracked ${times.join(', ')}`;
    }
    default:
      return null;
  }
}

/**
 * Parse time string safely (handles HH:mm, ISO timestamps, and various formats)
 */
export function parseTimeString(time: string): { hours: number; minutes: number } | null {
  if (!time || typeof time !== 'string') return null;

  const trimmed = time.trim();

  // Try ISO timestamp format (e.g., "2026-02-02T08:00:00" or "2026-02-02T08:00")
  if (trimmed.includes('T')) {
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return { hours: date.getHours(), minutes: date.getMinutes() };
    }
  }

  // Try HH:mm format (e.g., "08:00" or "8:00")
  const matchHHmm = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (matchHHmm) {
    const hours = parseInt(matchHHmm[1], 10);
    const minutes = parseInt(matchHHmm[2], 10);
    if (!isNaN(hours) && !isNaN(minutes) && hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return { hours, minutes };
    }
  }

  return null;
}

/**
 * Format time for display (handles NaN safely)
 */
export function formatTimeForDisplay(time: string | undefined | null): string {
  if (!time) return 'Time not set';

  const parsed = parseTimeString(time);
  if (!parsed) return 'Time not set';

  const { hours, minutes } = parsed;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

/**
 * Convert 12-hour time to HH:mm format
 */
export function parseDisplayTimeToHHmm(displayTime: string): string | null {
  const match = displayTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const isPM = match[3].toUpperCase() === 'PM';

  if (isNaN(hours) || isNaN(minutes)) return null;

  if (isPM && hours !== 12) hours += 12;
  if (!isPM && hours === 12) hours = 0;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Generate water reminder times based on frequency
 * Returns array of HH:mm strings
 */
export function generateWaterReminderTimes(frequency: WaterReminderFrequency, customTimes?: string[]): string[] {
  switch (frequency) {
    case 'none':
      return [];
    case 'every_2h':
      // 8am, 10am, 12pm, 2pm, 4pm, 6pm, 8pm
      return ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
    case 'every_3h':
      // 8am, 11am, 2pm, 5pm, 8pm
      return ['08:00', '11:00', '14:00', '17:00', '20:00'];
    case 'every_4h':
      // 8am, 12pm, 4pm, 8pm
      return ['08:00', '12:00', '16:00', '20:00'];
    case 'custom':
      return customTimes || [];
    default:
      return [];
  }
}

/**
 * Normalize any valid time format to canonical HH:mm
 * Accepts: HH:mm, ISO timestamp, 12-hour format (8:00 AM)
 * Returns: "HH:mm" string or null if invalid
 */
export function normalizeToHHmm(time: string | undefined | null): string | null {
  if (!time || typeof time !== 'string') return null;

  const trimmed = time.trim();

  // If already in HH:mm format, validate and return
  const hhmmMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmmMatch) {
    const hours = parseInt(hhmmMatch[1], 10);
    const minutes = parseInt(hhmmMatch[2], 10);
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
  }

  // Try ISO timestamp format
  if (trimmed.includes('T')) {
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      const hours = date.getHours();
      const minutes = date.getMinutes();
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
  }

  // Try 12-hour format (8:00 AM, 1:30 PM)
  const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = parseInt(ampmMatch[2], 10);
    const isPM = ampmMatch[3].toUpperCase() === 'PM';

    if (!isNaN(hours) && !isNaN(minutes) && hours >= 1 && hours <= 12 && minutes >= 0 && minutes < 60) {
      if (isPM && hours !== 12) hours += 12;
      if (!isPM && hours === 12) hours = 0;
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
  }

  return null;
}
