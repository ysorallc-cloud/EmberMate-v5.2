// ============================================================================
// USE NOTIFICATIONS HOOK
// Unified hook for notification state and actions
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { logError } from '../utils/devLog';
import { AppState } from 'react-native';
import { useDataListener } from '../lib/events';
import type {
  ScheduledNotificationV2,
  DeliveryPreferences,
  NotificationConfig,
} from '../types/notifications';
import type { CarePlanItemType } from '../types/carePlan';
import {
  getUpcomingNotifications,
  getScheduledNotifications,
  snoozeNotification as snoozeInRegistry,
  dismissNotification as dismissInRegistry,
  getDeliveryPreferences,
  updateDeliveryPreferences as updatePrefsInRegistry,
  getNotificationHistory,
  updateNotificationStatus,
} from '../storage/notificationRegistry';
import {
  getCarePlanItem,
  upsertCarePlanItem,
  getActiveCarePlan,
} from '../storage/carePlanRepo';
import { getDefaultNotificationConfig } from '../utils/notificationDefaults';
import { rescheduleAllNotifications } from '../utils/notificationService';

// ============================================================================
// TYPES
// ============================================================================

export interface UseNotificationsReturn {
  // State
  upcoming: ScheduledNotificationV2[];
  all: ScheduledNotificationV2[];
  deliveryPrefs: DeliveryPreferences;
  loading: boolean;
  error: string | null;

  // Actions
  snooze: (notificationId: string, minutes?: number) => Promise<void>;
  dismiss: (notificationId: string) => Promise<void>;
  markActioned: (notificationId: string) => Promise<void>;
  updateDeliveryPrefs: (prefs: Partial<DeliveryPreferences>) => Promise<void>;
  refresh: () => Promise<void>;

  // Item config helpers
  getConfigForItem: (itemId: string) => Promise<NotificationConfig | undefined>;
  updateConfigForItem: (itemId: string, config: NotificationConfig) => Promise<void>;
  toggleItemNotifications: (itemId: string, enabled: boolean) => Promise<void>;
}

// ============================================================================
// HOOK
// ============================================================================

export function useNotifications(patientId: string = 'default'): UseNotificationsReturn {
  const [upcoming, setUpcoming] = useState<ScheduledNotificationV2[]>([]);
  const [all, setAll] = useState<ScheduledNotificationV2[]>([]);
  const [deliveryPrefs, setDeliveryPrefs] = useState<DeliveryPreferences>({
    masterEnabled: true,
    soundEnabled: true,
    vibrationEnabled: true,
    quietHours: { enabled: true, start: '22:00', end: '07:00' },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load notifications and preferences
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [upcomingData, allData, prefs] = await Promise.all([
        getUpcomingNotifications(patientId, 10),
        getScheduledNotifications(patientId),
        getDeliveryPreferences(),
      ]);

      setUpcoming(upcomingData);
      setAll(allData);
      setDeliveryPrefs(prefs);
    } catch (err) {
      logError('useNotifications.loadData', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Listen for data updates
  useDataListener((category) => {
    if (['notifications', 'deliveryPreferences', 'carePlanItems'].includes(category)) {
      loadData();
    }
  });

  // Refresh every minute to update time displays, only when app is active
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (!interval) {
        interval = setInterval(() => { loadData(); }, 60000);
      }
    };
    const stopPolling = () => {
      if (interval) { clearInterval(interval); interval = null; }
    };

    startPolling();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') { startPolling(); }
      else { stopPolling(); }
    });

    return () => {
      stopPolling();
      subscription.remove();
    };
  }, [loadData]);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const snooze = useCallback(async (notificationId: string, minutes: number = 15) => {
    try {
      await snoozeInRegistry(patientId, notificationId, minutes);
      await loadData();
    } catch (err) {
      logError('useNotifications.snooze', err);
      throw err;
    }
  }, [patientId, loadData]);

  const dismiss = useCallback(async (notificationId: string) => {
    try {
      await dismissInRegistry(patientId, notificationId);
      await loadData();
    } catch (err) {
      logError('useNotifications.dismiss', err);
      throw err;
    }
  }, [patientId, loadData]);

  const markActioned = useCallback(async (notificationId: string) => {
    try {
      await updateNotificationStatus(patientId, notificationId, 'actioned');
      await loadData();
    } catch (err) {
      logError('useNotifications.markActioned', err);
      throw err;
    }
  }, [patientId, loadData]);

  const updateDeliveryPrefs = useCallback(async (updates: Partial<DeliveryPreferences>) => {
    try {
      const newPrefs = await updatePrefsInRegistry(updates);
      setDeliveryPrefs(newPrefs);

      // Reschedule all notifications with new preferences
      await rescheduleAllNotifications(patientId);
    } catch (err) {
      logError('useNotifications.updateDeliveryPrefs', err);
      throw err;
    }
  }, [patientId]);

  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  // ============================================================================
  // ITEM CONFIG HELPERS
  // ============================================================================

  const getConfigForItem = useCallback(async (itemId: string): Promise<NotificationConfig | undefined> => {
    try {
      const carePlan = await getActiveCarePlan(patientId);
      if (!carePlan) return undefined;

      const item = await getCarePlanItem(carePlan.id, itemId);
      if (!item) return undefined;

      // Return item config or defaults based on type
      return item.notification || getDefaultNotificationConfig(item.type);
    } catch (err) {
      logError('useNotifications.getConfigForItem', err);
      return undefined;
    }
  }, [patientId]);

  const updateConfigForItem = useCallback(async (itemId: string, config: NotificationConfig) => {
    try {
      const carePlan = await getActiveCarePlan(patientId);
      if (!carePlan) throw new Error('No active care plan');

      const item = await getCarePlanItem(carePlan.id, itemId);
      if (!item) throw new Error('Item not found');

      // Update item with new notification config
      await upsertCarePlanItem({
        ...item,
        notification: config,
      });

      // Reschedule notifications
      await rescheduleAllNotifications(patientId);
    } catch (err) {
      logError('useNotifications.updateConfigForItem', err);
      throw err;
    }
  }, [patientId]);

  const toggleItemNotifications = useCallback(async (itemId: string, enabled: boolean) => {
    try {
      const currentConfig = await getConfigForItem(itemId);
      if (!currentConfig) throw new Error('Could not get config');

      await updateConfigForItem(itemId, {
        ...currentConfig,
        enabled,
      });
    } catch (err) {
      logError('useNotifications.toggleItemNotifications', err);
      throw err;
    }
  }, [getConfigForItem, updateConfigForItem]);

  return {
    // State
    upcoming,
    all,
    deliveryPrefs,
    loading,
    error,

    // Actions
    snooze,
    dismiss,
    markActioned,
    updateDeliveryPrefs,
    refresh,

    // Item config helpers
    getConfigForItem,
    updateConfigForItem,
    toggleItemNotifications,
  };
}

export default useNotifications;
