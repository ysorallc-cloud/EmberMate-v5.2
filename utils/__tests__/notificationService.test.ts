// ============================================================================
// NOTIFICATION SERVICE TESTS
// Validates medication reminder scheduling and notification management
// ============================================================================

import { scheduleMedicationNotifications, cancelAllNotifications, getScheduledNotifications } from '../notificationService';
import { Medication } from '../medicationStorage';
import * as Notifications from 'expo-notifications';

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockMedication: Medication = {
    id: '1',
    name: 'Test Med',
    dosage: '10mg',
    time: '09:00',
    timeSlot: 'morning',
    taken: false,
    active: true,
    createdAt: '2025-01-01T00:00:00.000Z',
  };

  test('should schedule notification for active medication', async () => {
    await scheduleMedicationNotifications([mockMedication]);

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          title: expect.stringContaining('Medication'),
          body: expect.stringContaining('Test Med'),
        }),
      })
    );
  });

  test('should not schedule notification for inactive medication', async () => {
    const inactiveMed = { ...mockMedication, active: false };
    jest.clearAllMocks(); // Reset call count

    await scheduleMedicationNotifications([inactiveMed]);

    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  test('should cancel all notifications', async () => {
    await cancelAllNotifications();

    expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
  });

  test('should retrieve scheduled notifications', async () => {
    const result = await getScheduledNotifications();

    // The mock returns an empty array by default
    expect(Array.isArray(result)).toBe(true);
    expect(Notifications.getAllScheduledNotificationsAsync).toHaveBeenCalled();
  });

  test('should handle notification permission errors gracefully', async () => {
    // Mock a rejection for this test
    (Notifications.scheduleNotificationAsync as jest.Mock).mockRejectedValueOnce(
      new Error('Permission denied')
    );

    // Should not throw
    await expect(scheduleMedicationNotifications([mockMedication])).resolves.not.toThrow();
  });
});
