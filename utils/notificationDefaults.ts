// ============================================================================
// NOTIFICATION DEFAULTS
// Default notification configurations by Care Plan item type
// ============================================================================

import type { CarePlanItemType } from '../types/carePlan';
import type { NotificationConfig, NotificationTiming } from '../types/notifications';

/**
 * Default notification configuration for each Care Plan item type.
 *
 * Philosophy:
 * - Medications: Enabled by default with follow-up (critical for adherence)
 * - Vitals: Disabled by default (less time-sensitive)
 * - Mood: Disabled by default (check-in, not urgent)
 * - Nutrition: Disabled by default (natural meal rhythms)
 * - Appointments: Enabled with 30-min advance notice
 * - Others: Disabled by default, can be enabled per-item
 */
export const DEFAULT_NOTIFICATION_CONFIG: Record<CarePlanItemType, NotificationConfig> = {
  medication: {
    enabled: true,
    timing: 'at_time',
    followUp: {
      enabled: true,
      intervalMinutes: 30,
      maxAttempts: 3,
    },
  },
  vitals: {
    enabled: false,
    timing: 'at_time',
    followUp: {
      enabled: false,
      intervalMinutes: 30,
      maxAttempts: 1,
    },
  },
  mood: {
    enabled: false,
    timing: 'at_time',
    followUp: {
      enabled: false,
      intervalMinutes: 30,
      maxAttempts: 1,
    },
  },
  nutrition: {
    enabled: false,
    timing: 'at_time',
    followUp: {
      enabled: false,
      intervalMinutes: 30,
      maxAttempts: 1,
    },
  },
  hydration: {
    enabled: false,
    timing: 'at_time',
    followUp: {
      enabled: false,
      intervalMinutes: 60,
      maxAttempts: 1,
    },
  },
  appointment: {
    enabled: true,
    timing: 'before_30',
    followUp: {
      enabled: false,
      intervalMinutes: 30,
      maxAttempts: 1,
    },
  },
  activity: {
    enabled: false,
    timing: 'at_time',
    followUp: {
      enabled: false,
      intervalMinutes: 30,
      maxAttempts: 1,
    },
  },
  sleep: {
    enabled: false,
    timing: 'at_time',
    followUp: {
      enabled: false,
      intervalMinutes: 30,
      maxAttempts: 1,
    },
  },
  wellness: {
    enabled: false,
    timing: 'at_time',
    followUp: {
      enabled: false,
      intervalMinutes: 30,
      maxAttempts: 1,
    },
  },
  custom: {
    enabled: false,
    timing: 'at_time',
    followUp: {
      enabled: false,
      intervalMinutes: 30,
      maxAttempts: 1,
    },
  },
};

/**
 * Get the default notification config for a given item type.
 * Returns a fresh copy to prevent mutations.
 */
export function getDefaultNotificationConfig(type: CarePlanItemType): NotificationConfig {
  const config = DEFAULT_NOTIFICATION_CONFIG[type] ?? DEFAULT_NOTIFICATION_CONFIG.custom;
  return {
    ...config,
    followUp: { ...config.followUp },
  };
}

/**
 * Convert a timing value to minutes before scheduled time.
 */
export function timingToMinutes(timing: NotificationTiming, customMinutes?: number): number {
  switch (timing) {
    case 'at_time':
      return 0;
    case 'before_5':
      return 5;
    case 'before_15':
      return 15;
    case 'before_30':
      return 30;
    case 'before_60':
      return 60;
    case 'custom':
      return customMinutes ?? 0;
    default:
      return 0;
  }
}

/**
 * Convert minutes to a timing value.
 */
export function minutesToTiming(minutes: number): NotificationTiming {
  switch (minutes) {
    case 0:
      return 'at_time';
    case 5:
      return 'before_5';
    case 15:
      return 'before_15';
    case 30:
      return 'before_30';
    case 60:
      return 'before_60';
    default:
      return 'custom';
  }
}

/**
 * Get a human-readable label for a timing value.
 */
export function getTimingLabel(timing: NotificationTiming, customMinutes?: number): string {
  switch (timing) {
    case 'at_time':
      return 'At scheduled time';
    case 'before_5':
      return '5 minutes before';
    case 'before_15':
      return '15 minutes before';
    case 'before_30':
      return '30 minutes before';
    case 'before_60':
      return '1 hour before';
    case 'custom':
      return customMinutes ? `${customMinutes} minutes before` : 'Custom time';
    default:
      return 'At scheduled time';
  }
}

/**
 * Get a human-readable label for follow-up interval.
 */
export function getFollowUpLabel(intervalMinutes: 15 | 30 | 60): string {
  switch (intervalMinutes) {
    case 15:
      return 'Every 15 minutes';
    case 30:
      return 'Every 30 minutes';
    case 60:
      return 'Every hour';
    default:
      return `Every ${intervalMinutes} minutes`;
  }
}

/**
 * Merge user config with defaults, filling in missing fields.
 */
export function mergeWithDefaults(
  type: CarePlanItemType,
  partial?: Partial<NotificationConfig>
): NotificationConfig {
  const defaults = getDefaultNotificationConfig(type);

  if (!partial) {
    return defaults;
  }

  return {
    enabled: partial.enabled ?? defaults.enabled,
    timing: partial.timing ?? defaults.timing,
    customMinutesBefore: partial.customMinutesBefore ?? defaults.customMinutesBefore,
    followUp: {
      enabled: partial.followUp?.enabled ?? defaults.followUp.enabled,
      intervalMinutes: partial.followUp?.intervalMinutes ?? defaults.followUp.intervalMinutes,
      maxAttempts: partial.followUp?.maxAttempts ?? defaults.followUp.maxAttempts,
    },
  };
}
