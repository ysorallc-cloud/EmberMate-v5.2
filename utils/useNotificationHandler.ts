// ============================================================================
// USE NOTIFICATION HANDLER HOOK
// Handles notification taps and quick actions
// ============================================================================

import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { markMedicationTaken } from './medicationStorage';
import { hapticSuccess } from './hapticFeedback';
import { devLog, logError } from './devLog';
import { logActivity, getCurrentUser } from './collaborativeCare';

/**
 * Hook to handle notification responses (taps and quick actions)
 * Place this in your root layout to handle notifications app-wide
 */
export function useNotificationHandler() {
  const router = useRouter();
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    // Handler for notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      devLog('Notification received:', notification.request.identifier);
      // Optionally show an in-app banner or update badge
    });

    // Handler for notification taps and quick actions
    responseListener.current = Notifications.addNotificationResponseReceivedListener(async (response) => {
      devLog('Notification action:', response.actionIdentifier);
      
      const data = response.notification.request.content.data;
      const actionId = response.actionIdentifier;

      // Handle quick actions
      if (actionId === 'mark-taken') {
        // Quick action: Mark medication as taken (background action)
        await handleMarkTaken(data);
        return; // Don't navigate, handled in background
      }

      if (actionId === 'snooze') {
        // Quick action: Snooze medication for 15 minutes
        await handleSnooze(data);
        return; // Don't navigate, handled in background
      }

      if (actionId === 'view-details') {
        // Quick action: View appointment details
        router.push('/appointments');
        return;
      }

      if (actionId === 'snooze-appointment') {
        // Quick action: Snooze appointment reminder
        await handleSnoozeAppointment(data);
        return;
      }

      // Handle regular notification taps (default action)
      if (actionId === Notifications.DEFAULT_ACTION_IDENTIFIER) {
        if (data.type === 'medication_reminder') {
          router.push('/(tabs)/home');
        } else if (data.type === 'appointment_reminder') {
          router.push('/appointments');
        } else if (data.type === 'refill_reminder') {
          router.push('/medications');
        } else if (data.type === 'daily_checkin') {
          router.push('/(tabs)/home');
        }
      }
    });

    // Cleanup on unmount
    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [router]);
}

/**
 * Handle "Mark Taken" quick action
 */
async function handleMarkTaken(data: any): Promise<void> {
  try {
    const medicationId = data.medicationId;
    if (!medicationId) {
      logError('useNotificationHandler.handleMarkTaken', 'No medication ID in notification data');
      return;
    }

    await markMedicationTaken(medicationId, true);
    await hapticSuccess();
    
    // Log activity for family/caregivers
    const currentUser = await getCurrentUser();
    await logActivity({
      type: 'medication_taken',
      performedBy: currentUser?.name || 'You',
      performedById: currentUser?.id || 'primary',
      timestamp: new Date().toISOString(),
      details: {
        medicationName: data.medicationName,
        medicationDosage: data.medicationDosage,
        source: 'quick_action',
      },
    });
    
    devLog(`Marked medication ${medicationId} as taken via quick action`);

    // Show a local notification to confirm
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '✓ Medication Logged',
        body: `${data.medicationName || 'Medication'} marked as taken`,
        sound: false,
      },
      trigger: null, // Immediate
    });
  } catch (error) {
    logError('useNotificationHandler.handleMarkTaken', error);
  }
}

/**
 * Handle "Snooze 15m" quick action
 */
async function handleSnooze(data: any): Promise<void> {
  try {
    const snoozeTime = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await Notifications.scheduleNotificationAsync({
      content: {
        title: data.title || '💊 Medication Reminder',
        body: data.body || 'Time to take your medication',
        data: data,
        categoryIdentifier: 'medication',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: snoozeTime,
      },
    });

    devLog('Snoozed medication reminder for 15 minutes');

    // Show confirmation
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Reminder Snoozed',
        body: 'Will remind you again in 15 minutes',
        sound: false,
      },
      trigger: null,
    });
  } catch (error) {
    logError('useNotificationHandler.handleSnooze', error);
  }
}

/**
 * Handle "Remind Later" appointment quick action
 */
async function handleSnoozeAppointment(data: any): Promise<void> {
  try {
    const snoozeTime = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await Notifications.scheduleNotificationAsync({
      content: {
        title: data.title || '📅 Appointment Reminder',
        body: data.body || 'Upcoming appointment',
        data: data,
        categoryIdentifier: 'appointment',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: snoozeTime,
      },
    });

    devLog('Snoozed appointment reminder for 30 minutes');
  } catch (error) {
    logError('useNotificationHandler.handleSnoozeAppointment', error);
  }
}
