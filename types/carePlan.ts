// ============================================================================
// CARE PLAN TYPES - Regimen-Based Architecture
// ============================================================================
// CarePlan = Long-lived regimen source of truth
// DailyCareInstance = Generated schedule for a specific date
// LogEntry = Immutable record of what happened
// ============================================================================

import type { NotificationConfig } from './notifications';

// ============================================================================
// TIME WINDOW
// ============================================================================

export type TimeWindowKind = 'exact' | 'window';
export type TimeWindowLabel = 'morning' | 'afternoon' | 'evening' | 'night' | 'custom';

export interface TimeWindow {
  id: string;
  kind: TimeWindowKind;
  label: TimeWindowLabel;
  customLabel?: string;           // For 'custom' label
  start?: string;                 // HH:mm (for 'window' kind)
  end?: string;                   // HH:mm (for 'window' kind)
  at?: string;                    // HH:mm (for 'exact' kind)
}

// ============================================================================
// CARE PLAN (Regimen - Source of Truth)
// ============================================================================

export type CarePlanStatus = 'active' | 'paused' | 'archived';

export interface CarePlan {
  id: string;
  patientId: string;
  timezone: string;               // IANA timezone (e.g., 'America/New_York')
  startDate: string;              // YYYY-MM-DD
  endDate?: string;               // YYYY-MM-DD (optional)
  status: CarePlanStatus;
  version: number;                // Incremented on changes for tracking
  createdAt: string;              // ISO timestamp
  updatedAt: string;              // ISO timestamp
}

// ============================================================================
// CARE PLAN ITEM (Regimen Definition)
// ============================================================================

export type CarePlanItemType =
  | 'medication'
  | 'activity'
  | 'vitals'
  | 'nutrition'
  | 'appointment'
  | 'hydration'
  | 'mood'
  | 'sleep'
  | 'wellness'
  | 'custom';

export type CarePlanItemPriority = 'required' | 'recommended' | 'optional';

export type ScheduleFrequency = 'daily' | 'weekly' | 'custom';

export interface CarePlanItemSchedule {
  frequency: ScheduleFrequency;
  times: TimeWindow[];            // One or more time windows per day
  daysOfWeek?: number[];          // 0-6 (Sunday-Saturday) for weekly/custom
  skipDates?: string[];           // YYYY-MM-DD dates to skip (optional)
}

export interface MedicationDetails {
  medicationId?: string;          // Link to existing medication
  dose?: string;
  unit?: string;
  route?: string;                 // oral, topical, injection, etc.
  withFood?: boolean;
  instructions?: string;
}

export interface ActivityDetails {
  target?: number;
  unit?: string;                  // steps, minutes, etc.
  activityType?: string;          // walking, exercise, etc.
}

export interface VitalsDetails {
  vitalTypes: string[];           // bp, glucose, heartRate, temperature, oxygen, weight
}

export interface NutritionDetails {
  mealType?: string;              // breakfast, lunch, dinner, snack
  dietaryNotes?: string;
}

export interface HydrationDetails {
  targetGlasses?: number;
}

export interface ItemDependency {
  type: 'with_food' | 'after_item' | 'before_bed' | 'after_waking';
  refItemId?: string;             // Reference to another CarePlanItem
  notes?: string;
}

export interface CarePlanItem {
  id: string;
  carePlanId: string;
  type: CarePlanItemType;
  name: string;
  instructions?: string;
  priority: CarePlanItemPriority;
  active: boolean;
  schedule: CarePlanItemSchedule;

  // Type-specific details
  medicationDetails?: MedicationDetails;
  activityDetails?: ActivityDetails;
  vitalsDetails?: VitalsDetails;
  nutritionDetails?: NutritionDetails;
  hydrationDetails?: HydrationDetails;

  // Notification configuration (per-item)
  notification?: NotificationConfig;

  // Dependencies
  dependencies?: ItemDependency[];

  // Metadata
  emoji?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// DAILY CARE INSTANCE (Generated Schedule for a Date)
// ============================================================================

export type DailyInstanceStatus = 'pending' | 'completed' | 'skipped' | 'missed' | 'partial';

export interface DailyCareInstance {
  id: string;
  carePlanId: string;
  carePlanItemId: string;
  patientId: string;
  date: string;                   // YYYY-MM-DD
  scheduledTime: string;          // ISO timestamp or HH:mm
  windowLabel: TimeWindowLabel;
  windowId: string;               // Reference to TimeWindow.id
  status: DailyInstanceStatus;
  logId?: string;                 // Reference to LogEntry.id when logged
  generatedFromVersion?: number;  // CarePlan version when generated

  // Denormalized for display (avoids lookups)
  itemName: string;
  itemType: CarePlanItemType;
  itemEmoji?: string;
  priority: CarePlanItemPriority;
  instructions?: string;
  itemDosage?: string; // For medications - denormalized from MedicationDetails.dose

  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// LOG ENTRY (Immutable Record)
// ============================================================================

export type LogOutcome = 'taken' | 'completed' | 'skipped' | 'partial' | 'missed';

export type LogSource = 'record' | 'journal' | 'now' | 'notification' | 'widget' | 'auto';

export interface LogEntry {
  id: string;
  patientId: string;
  carePlanId?: string;
  carePlanItemId?: string;
  dailyInstanceId?: string;       // Links to DailyCareInstance

  timestamp: string;              // ISO timestamp of when logged
  date: string;                   // YYYY-MM-DD

  outcome: LogOutcome;
  notes?: string;

  // Type-specific data payload
  data?: LogEntryData;

  // Audit trail
  source: LogSource;
  deviceId?: string;
  caregiverName?: string;

  // Immutability flag (enforced by not allowing edits)
  readonly immutable: true;

  createdAt: string;
}

// Union type for log data payloads
export type LogEntryData =
  | MedicationLogData
  | VitalsLogData
  | MoodLogData
  | NutritionLogData
  | HydrationLogData
  | SleepLogData
  | ActivityLogData
  | CustomLogData;

export interface MedicationLogData {
  type: 'medication';
  medicationId?: string;
  medicationName?: string;
  dose?: string;
  sideEffects?: string[];
}

export interface VitalsLogData {
  type: 'vitals';
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
  glucose?: number;
  temperature?: number;
  oxygen?: number;
  weight?: number;
}

export interface MoodLogData {
  type: 'mood';
  mood: number;                   // 1-5 scale
  energy?: number;
  pain?: number;
}

export interface NutritionLogData {
  type: 'nutrition';
  mealType: string;
  description?: string;
  appetite?: 'good' | 'fair' | 'poor' | 'refused';
  amountConsumed?: 'all' | 'most' | 'half' | 'little' | 'none';
  assistanceLevel?: 'independent' | 'verbal' | 'partial' | 'full';
}

export interface HydrationLogData {
  type: 'hydration';
  glasses: number;
}

export interface SleepLogData {
  type: 'sleep';
  hours: number;
  quality?: number;
}

export interface ActivityLogData {
  type: 'activity';
  activityType: string;
  duration?: number;              // minutes
  value?: number;                 // steps, etc.
}

export interface CustomLogData {
  type: 'custom';
  [key: string]: any;
}

// ============================================================================
// AGGREGATED TYPES FOR UI
// ============================================================================

export interface DailySchedule {
  date: string;
  instances: DailyCareInstance[];
  byWindow: {
    morning: DailyCareInstance[];
    afternoon: DailyCareInstance[];
    evening: DailyCareInstance[];
    night: DailyCareInstance[];
  };
  stats: {
    total: number;
    pending: number;
    completed: number;
    skipped: number;
    missed: number;
  };
  nextPending: DailyCareInstance | null;
}

export interface AdherenceStats {
  itemId: string;
  itemName: string;
  itemType: CarePlanItemType;
  dateRange: { start: string; end: string };
  totalInstances: number;
  completedCount: number;
  skippedCount: number;
  missedCount: number;
  adherenceRate: number;          // 0-100
  byWindow: {
    morning: { total: number; completed: number };
    afternoon: { total: number; completed: number };
    evening: { total: number; completed: number };
    night: { total: number; completed: number };
  };
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export interface TimeWindowDefaults {
  morning: { start: string; end: string };
  afternoon: { start: string; end: string };
  evening: { start: string; end: string };
  night: { start: string; end: string };
}

export const DEFAULT_TIME_WINDOWS: TimeWindowDefaults = {
  morning: { start: '06:00', end: '10:00' },
  afternoon: { start: '12:00', end: '14:00' },
  evening: { start: '17:00', end: '20:00' },
  night: { start: '20:00', end: '23:00' },
};

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isMedicationLogData(data: LogEntryData): data is MedicationLogData {
  return data.type === 'medication';
}

export function isVitalsLogData(data: LogEntryData): data is VitalsLogData {
  return data.type === 'vitals';
}

export function isMoodLogData(data: LogEntryData): data is MoodLogData {
  return data.type === 'mood';
}

export function isNutritionLogData(data: LogEntryData): data is NutritionLogData {
  return data.type === 'nutrition';
}

export function isHydrationLogData(data: LogEntryData): data is HydrationLogData {
  return data.type === 'hydration';
}

export function isSleepLogData(data: LogEntryData): data is SleepLogData {
  return data.type === 'sleep';
}

export function isActivityLogData(data: LogEntryData): data is ActivityLogData {
  return data.type === 'activity';
}
