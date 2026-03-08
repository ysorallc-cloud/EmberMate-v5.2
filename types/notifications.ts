// ============================================================================
// NOTIFICATION TYPES
// Settings and data structures for push notifications
// ============================================================================
//
// Architecture:
// - NotificationConfig: Per-item configuration (stored with CarePlanItem)
// - DeliveryPreferences: Global delivery settings (sound, vibration, quiet hours)
// - ScheduledNotification: Runtime state of a notification instance
// - NotificationSettings: Legacy settings (being migrated to above)
// ============================================================================

import type { CarePlanItemType } from './carePlan';

// ============================================================================
// NEW UNIFIED TYPES (Phase 1)
// ============================================================================

/**
 * Timing options for when a notification fires relative to scheduled time
 */
export type NotificationTiming =
  | 'at_time'      // Fire at the scheduled time
  | 'before_5'     // Fire 5 minutes before
  | 'before_15'    // Fire 15 minutes before
  | 'before_30'    // Fire 30 minutes before
  | 'before_60'    // Fire 60 minutes before
  | 'custom';      // Use customMinutesBefore

/**
 * Per-item notification configuration
 * Stored with CarePlanItem in the notification field
 */
export interface NotificationConfig {
  enabled: boolean;
  timing: NotificationTiming;
  customMinutesBefore?: number;  // Used when timing is 'custom'
  followUp: {
    enabled: boolean;
    intervalMinutes: 15 | 30 | 60;
    maxAttempts: number;         // Default: 3
  };
}

/**
 * Scheduled notification instance (runtime state)
 * Stored in notification registry
 */
export interface ScheduledNotificationV2 {
  id: string;
  carePlanItemId: string;
  itemType: CarePlanItemType;
  itemName: string;
  scheduledFor: string;          // ISO timestamp when notification should fire
  originalTime: string;          // ISO timestamp of the actual scheduled time
  timing: NotificationTiming;
  status: 'pending' | 'sent' | 'actioned' | 'dismissed' | 'snoozed';
  expoNotificationId?: string;   // Expo's internal notification ID
  followUpAttempt?: number;      // Current follow-up attempt (0 = initial)
  snoozedUntil?: string;         // ISO timestamp if snoozed
  createdAt: string;
  updatedAt: string;
}

/**
 * Global delivery preferences
 * Controls HOW notifications are delivered (not WHAT generates them)
 */
export interface DeliveryPreferences {
  masterEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  quietHours: {
    enabled: boolean;
    start: string;               // HH:mm (e.g., "22:00")
    end: string;                 // HH:mm (e.g., "07:00")
  };
}

export const DEFAULT_DELIVERY_PREFERENCES: DeliveryPreferences = {
  masterEnabled: true,
  soundEnabled: true,
  vibrationEnabled: true,
  quietHours: {
    enabled: true,
    start: '22:00',
    end: '07:00',
  },
};

// ============================================================================
// LEGACY TYPES (kept for migration compatibility)
// ============================================================================

export interface NotificationSettings {
  // Master toggles
  medicationReminders: boolean;
  overdueAlerts: boolean;
  wellnessReminders: boolean;
  appointmentReminders: boolean;

  // Timing
  gracePeriodMinutes: number; // Default: 15
  overdueAlertMinutes: number; // Default: 30
  escalationMinutes: number; // Default: 60
  maxRemindersPerItem: number; // Default: 3

  // Quiet hours
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "22:00"
  quietHoursEnd: string; // "07:00"

  // Sound & vibration
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  criticalAlertsEnabled: boolean; // iOS only - bypass silent mode
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  medicationReminders: true,
  overdueAlerts: true,
  wellnessReminders: true,
  appointmentReminders: true,

  gracePeriodMinutes: 15,
  overdueAlertMinutes: 30,
  escalationMinutes: 60,
  maxRemindersPerItem: 3,

  quietHoursEnabled: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',

  soundEnabled: true,
  vibrationEnabled: true,
  criticalAlertsEnabled: false,
};

export interface ScheduledNotification {
  id: string;
  type: 'scheduled' | 'overdue' | 'escalation';
  itemId: string;
  itemType: 'medication' | 'wellness' | 'appointment';
  scheduledFor: string; // ISO timestamp
  title: string;
  body: string;
  data: Record<string, any>;
  sent: boolean;
  dismissed: boolean;
  actioned: boolean;
}
