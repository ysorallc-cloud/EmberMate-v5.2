// ============================================================================
// NOTIFICATION INTEGRATION TEST
// Validates end-to-end notification flow
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMedications } from '../medicationStorage';
import {
  scheduleMedicationNotifications,
  getNotificationSettings,
  saveNotificationSettings,
  NotificationSettings,
} from '../notificationService';

const MEDICATIONS_KEY = '@embermate_medications';
const LAST_RESET_DATE_KEY = '@embermate_last_med_reset';

describe('Notification System Integration', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2025-01-15T10:00:00.000Z'));
    await AsyncStorage.setItem(LAST_RESET_DATE_KEY, '2025-01-15');
    await AsyncStorage.setItem('@embermate_onboarding_complete', 'true');
    await AsyncStorage.setItem(MEDICATIONS_KEY, JSON.stringify([]));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should create notification service utilities', () => {
    // Test 1: Verify notification service exports exist
    expect(scheduleMedicationNotifications).toBeDefined();
    expect(getNotificationSettings).toBeDefined();
    expect(saveNotificationSettings).toBeDefined();
  });

  test('should have default notification settings', async () => {
    // Test 2: Verify default settings structure
    const settings = await getNotificationSettings();

    expect(settings).toHaveProperty('enabled');
    expect(settings).toHaveProperty('reminderMinutesBefore');
    expect(settings).toHaveProperty('soundEnabled');
    expect(settings).toHaveProperty('vibrationEnabled');
    expect(settings).toHaveProperty('overdueAlertsEnabled');
    expect(settings).toHaveProperty('gracePeriodMinutes');
    expect(settings).toHaveProperty('overdueAlertMinutes');
    expect(settings).toHaveProperty('quietHoursEnabled');
    expect(settings).toHaveProperty('quietHoursStart');
    expect(settings).toHaveProperty('quietHoursEnd');

    expect(typeof settings.enabled).toBe('boolean');
    expect(typeof settings.reminderMinutesBefore).toBe('number');
    expect(typeof settings.soundEnabled).toBe('boolean');
    expect(typeof settings.vibrationEnabled).toBe('boolean');
  });

  test('should save and retrieve notification settings', async () => {
    // Test 3: Verify settings persistence
    const newSettings: NotificationSettings = {
      enabled: false,
      reminderMinutesBefore: 15,
      soundEnabled: false,
      vibrationEnabled: true,
      overdueAlertsEnabled: true,
      gracePeriodMinutes: 10,
      overdueAlertMinutes: 45,
      quietHoursEnabled: false,
      quietHoursStart: '23:00',
      quietHoursEnd: '06:00',
    };

    await saveNotificationSettings(newSettings);
    const retrieved = await getNotificationSettings();

    expect(retrieved).toEqual(newSettings);
  });

  test('notification service integrates with medication storage', async () => {
    // Test 4: Verify integration point exists
    // This test just validates the import chain works
    const medications = await getMedications();
    expect(Array.isArray(medications)).toBe(true);

    // Verify scheduleMedicationNotifications accepts medication array
    await expect(
      scheduleMedicationNotifications(medications)
    ).resolves.not.toThrow();
  });
});
