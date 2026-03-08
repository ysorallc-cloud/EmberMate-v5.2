// ============================================================================
// NOTIFICATION REGISTRY
// Storage layer for scheduled notifications
// Tracks notification state for visibility in Support page
// ============================================================================

import { safeGetItem, safeSetItem } from '../utils/safeStorage';
import { generateUniqueId } from '../utils/idGenerator';
import { emitDataUpdate } from '../lib/events';
import { EVENT } from '../lib/eventNames';
import type { ScheduledNotificationV2, DeliveryPreferences, DEFAULT_DELIVERY_PREFERENCES } from '../types/notifications';
import type { CarePlanItemType } from '../types/carePlan';
import { DEFAULT_PATIENT_ID } from '../types/patient';

// ============================================================================
// STORAGE KEYS
// ============================================================================

const KEYS = {
  // Scheduled notifications (indexed by patient)
  SCHEDULED: (patientId: string) => `@embermate_notifications_v2:${patientId}`,

  // Delivery preferences (global, not per-patient)
  DELIVERY_PREFS: () => `@embermate_delivery_prefs_v2`,

  // Notification history (last 7 days)
  HISTORY: (patientId: string) => `@embermate_notification_history_v2:${patientId}`,
};

// ============================================================================
// SCHEDULED NOTIFICATION OPERATIONS
// ============================================================================

/**
 * Get all scheduled notifications for a patient
 */
export async function getScheduledNotifications(
  patientId: string = DEFAULT_PATIENT_ID
): Promise<ScheduledNotificationV2[]> {
  return safeGetItem<ScheduledNotificationV2[]>(KEYS.SCHEDULED(patientId), []);
}

/**
 * Get upcoming notifications (pending, sorted by time)
 */
export async function getUpcomingNotifications(
  patientId: string = DEFAULT_PATIENT_ID,
  limit: number = 10
): Promise<ScheduledNotificationV2[]> {
  const all = await getScheduledNotifications(patientId);
  const now = new Date().toISOString();

  return all
    .filter(n => n.status === 'pending' && n.scheduledFor >= now)
    .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor))
    .slice(0, limit);
}

/**
 * Get notification by ID
 */
export async function getNotificationById(
  patientId: string,
  notificationId: string
): Promise<ScheduledNotificationV2 | null> {
  const all = await getScheduledNotifications(patientId);
  return all.find(n => n.id === notificationId) || null;
}

/**
 * Get notifications for a specific Care Plan item
 */
export async function getNotificationsForItem(
  patientId: string,
  carePlanItemId: string
): Promise<ScheduledNotificationV2[]> {
  const all = await getScheduledNotifications(patientId);
  return all.filter(n => n.carePlanItemId === carePlanItemId);
}

/**
 * Save all scheduled notifications (full replace)
 */
export async function saveScheduledNotifications(
  patientId: string,
  notifications: ScheduledNotificationV2[]
): Promise<void> {
  await safeSetItem(KEYS.SCHEDULED(patientId), notifications);
  emitDataUpdate(EVENT.NOTIFICATIONS);
}

/**
 * Add a new scheduled notification
 */
export async function addScheduledNotification(
  patientId: string,
  notification: Omit<ScheduledNotificationV2, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ScheduledNotificationV2> {
  const now = new Date().toISOString();
  const newNotification: ScheduledNotificationV2 = {
    ...notification,
    id: generateUniqueId(),
    createdAt: now,
    updatedAt: now,
  };

  const all = await getScheduledNotifications(patientId);
  all.push(newNotification);
  await saveScheduledNotifications(patientId, all);

  return newNotification;
}

/**
 * Update notification status
 */
export async function updateNotificationStatus(
  patientId: string,
  notificationId: string,
  status: ScheduledNotificationV2['status'],
  updates?: Partial<Pick<ScheduledNotificationV2, 'expoNotificationId' | 'snoozedUntil' | 'followUpAttempt'>>
): Promise<ScheduledNotificationV2 | null> {
  const all = await getScheduledNotifications(patientId);
  const index = all.findIndex(n => n.id === notificationId);

  if (index === -1) return null;

  const now = new Date().toISOString();
  all[index] = {
    ...all[index],
    ...updates,
    status,
    updatedAt: now,
  };

  await saveScheduledNotifications(patientId, all);

  // If actioned, dismissed, or sent - move to history
  if (['actioned', 'dismissed', 'sent'].includes(status)) {
    await addToHistory(patientId, all[index]);
  }

  return all[index];
}

/**
 * Snooze a notification
 */
export async function snoozeNotification(
  patientId: string,
  notificationId: string,
  snoozeDurationMinutes: number
): Promise<ScheduledNotificationV2 | null> {
  const snoozedUntil = new Date(Date.now() + snoozeDurationMinutes * 60 * 1000).toISOString();

  return updateNotificationStatus(patientId, notificationId, 'snoozed', {
    snoozedUntil,
  });
}

/**
 * Dismiss a notification
 */
export async function dismissNotification(
  patientId: string,
  notificationId: string
): Promise<ScheduledNotificationV2 | null> {
  return updateNotificationStatus(patientId, notificationId, 'dismissed');
}

/**
 * Remove notifications for a Care Plan item (when item is deleted/deactivated)
 */
export async function removeNotificationsForItem(
  patientId: string,
  carePlanItemId: string
): Promise<number> {
  const all = await getScheduledNotifications(patientId);
  const filtered = all.filter(n => n.carePlanItemId !== carePlanItemId);
  const removedCount = all.length - filtered.length;

  if (removedCount > 0) {
    await saveScheduledNotifications(patientId, filtered);
  }

  return removedCount;
}

/**
 * Clear all scheduled notifications (for reschedule)
 */
export async function clearAllScheduledNotifications(
  patientId: string = DEFAULT_PATIENT_ID
): Promise<void> {
  await saveScheduledNotifications(patientId, []);
}

/**
 * Replace notifications for a specific item (useful for reschedule)
 */
export async function replaceNotificationsForItem(
  patientId: string,
  carePlanItemId: string,
  newNotifications: Omit<ScheduledNotificationV2, 'id' | 'createdAt' | 'updatedAt'>[]
): Promise<ScheduledNotificationV2[]> {
  // Remove existing for this item
  await removeNotificationsForItem(patientId, carePlanItemId);

  // Add new ones
  const now = new Date().toISOString();
  const created: ScheduledNotificationV2[] = newNotifications.map(n => ({
    ...n,
    id: generateUniqueId(),
    createdAt: now,
    updatedAt: now,
  }));

  const all = await getScheduledNotifications(patientId);
  all.push(...created);
  await saveScheduledNotifications(patientId, all);

  return created;
}

// ============================================================================
// DELIVERY PREFERENCES OPERATIONS
// ============================================================================

/**
 * Get delivery preferences
 */
export async function getDeliveryPreferences(): Promise<DeliveryPreferences> {
  const defaults: DeliveryPreferences = {
    masterEnabled: true,
    soundEnabled: true,
    vibrationEnabled: true,
    quietHours: {
      enabled: true,
      start: '22:00',
      end: '07:00',
    },
  };

  return safeGetItem<DeliveryPreferences>(KEYS.DELIVERY_PREFS(), defaults);
}

/**
 * Save delivery preferences
 */
export async function saveDeliveryPreferences(
  prefs: DeliveryPreferences
): Promise<void> {
  await safeSetItem(KEYS.DELIVERY_PREFS(), prefs);
  emitDataUpdate(EVENT.DELIVERY_PREFERENCES);
}

/**
 * Update specific delivery preference fields
 */
export async function updateDeliveryPreferences(
  updates: Partial<DeliveryPreferences>
): Promise<DeliveryPreferences> {
  const current = await getDeliveryPreferences();
  const updated: DeliveryPreferences = {
    ...current,
    ...updates,
    quietHours: {
      ...current.quietHours,
      ...(updates.quietHours || {}),
    },
  };
  await saveDeliveryPreferences(updated);
  return updated;
}

// ============================================================================
// NOTIFICATION HISTORY OPERATIONS
// ============================================================================

interface NotificationHistoryEntry extends ScheduledNotificationV2 {
  finalStatus: ScheduledNotificationV2['status'];
  completedAt: string;
}

/**
 * Get notification history (last 7 days)
 */
export async function getNotificationHistory(
  patientId: string = DEFAULT_PATIENT_ID,
  limit: number = 50
): Promise<NotificationHistoryEntry[]> {
  const history = await safeGetItem<NotificationHistoryEntry[]>(KEYS.HISTORY(patientId), []);
  return history.slice(-limit);
}

/**
 * Add notification to history
 */
async function addToHistory(
  patientId: string,
  notification: ScheduledNotificationV2
): Promise<void> {
  const history = await getNotificationHistory(patientId, 500);
  const now = new Date().toISOString();

  const entry: NotificationHistoryEntry = {
    ...notification,
    finalStatus: notification.status,
    completedAt: now,
  };

  history.push(entry);

  // Keep only last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const filtered = history.filter(h => h.completedAt >= sevenDaysAgo);

  await safeSetItem(KEYS.HISTORY(patientId), filtered);
}

/**
 * Clear notification history (for testing/reset)
 */
export async function clearNotificationHistory(
  patientId: string = DEFAULT_PATIENT_ID
): Promise<void> {
  await safeSetItem(KEYS.HISTORY(patientId), []);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a notification is overdue (snoozed past snooze time)
 */
export function isNotificationOverdue(notification: ScheduledNotificationV2): boolean {
  const now = new Date();

  if (notification.status === 'snoozed' && notification.snoozedUntil) {
    return new Date(notification.snoozedUntil) <= now;
  }

  return notification.status === 'pending' && new Date(notification.scheduledFor) <= now;
}

/**
 * Get count of pending notifications by type
 */
export async function getPendingCountByType(
  patientId: string = DEFAULT_PATIENT_ID
): Promise<Record<CarePlanItemType, number>> {
  const all = await getScheduledNotifications(patientId);
  const pending = all.filter(n => n.status === 'pending');

  const counts: Partial<Record<CarePlanItemType, number>> = {};
  for (const n of pending) {
    counts[n.itemType] = (counts[n.itemType] || 0) + 1;
  }

  return counts as Record<CarePlanItemType, number>;
}

/**
 * Get the next notification (soonest pending)
 */
export async function getNextNotification(
  patientId: string = DEFAULT_PATIENT_ID
): Promise<ScheduledNotificationV2 | null> {
  const upcoming = await getUpcomingNotifications(patientId, 1);
  return upcoming[0] || null;
}

// ============================================================================
// CLEANUP OPERATIONS
// ============================================================================

/**
 * Remove expired/old pending notifications (cleanup job)
 */
export async function cleanupOldNotifications(
  patientId: string = DEFAULT_PATIENT_ID
): Promise<number> {
  const all = await getScheduledNotifications(patientId);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Keep notifications scheduled for today or future, or recently sent
  const filtered = all.filter(n => {
    // Keep if scheduled for future
    if (n.scheduledFor > oneDayAgo) return true;
    // Keep if still pending (might need follow-up)
    if (n.status === 'pending' && n.scheduledFor > oneDayAgo) return true;
    // Remove everything else that's old
    return false;
  });

  const removedCount = all.length - filtered.length;
  if (removedCount > 0) {
    await saveScheduledNotifications(patientId, filtered);
  }

  return removedCount;
}

/**
 * Clear all notification data for a patient (for testing/reset)
 */
export async function clearAllNotificationData(
  patientId: string = DEFAULT_PATIENT_ID
): Promise<void> {
  await clearAllScheduledNotifications(patientId);
  await clearNotificationHistory(patientId);
  emitDataUpdate(EVENT.NOTIFICATIONS);
}
