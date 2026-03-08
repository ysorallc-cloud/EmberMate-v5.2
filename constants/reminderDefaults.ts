// ============================================================================
// REMINDER DEFAULT SETTINGS
// Default reminder configurations for appointments and events
// ============================================================================

import { ReminderTime } from '../types/calendar';

export const DEFAULT_APPOINTMENT_REMINDERS: ReminderTime[] = [
  { type: 'days_before', value: 1, notificationTime: '09:00' },
  { type: 'hours_before', value: 1 },
];

export const DEFAULT_EVENT_REMINDERS: ReminderTime[] = [
  { type: 'hours_before', value: 2 },
];
