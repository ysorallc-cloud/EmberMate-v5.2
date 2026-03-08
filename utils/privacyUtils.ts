// ============================================================================
// PRIVACY UTILITIES
// Human-readable privacy information and data management
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { devLog, logError } from './devLog';
import { StorageKeys } from './storageKeys';
import { safeGetItem } from './safeStorage';

/**
 * Get count of people in care circle
 */
export async function getCareCircleCount(): Promise<number> {
  try {
    const members = await safeGetItem<any[]>(StorageKeys.CARE_CIRCLE, []);
    return Array.isArray(members) ? members.length : 0;
  } catch (error) {
    logError('privacyUtils.getCareCircleCount', error);
    return 0;
  }
}

/**
 * Get data storage location (human-readable)
 */
export function getDataStorageLocation(): {
  location: string;
  description: string;
  technical: string;
} {
  return {
    location: 'On your device',
    description:
      "Your health data stays on your phone. We don't store it on our servers unless you explicitly share it with your care circle.",
    technical: 'Local storage using encrypted AsyncStorage (SQLite)',
  };
}

/**
 * Get company data access policy (human-readable)
 */
export function getCompanyDataAccess(): {
  hasAccess: boolean;
  statement: string;
  details: string;
} {
  return {
    hasAccess: false,
    statement: 'We cannot see your data',
    details:
      'EmberMate does not have access to your health data. It never leaves your device unless you explicitly share it with people in your care circle.',
  };
}

/**
 * Get data retention policy (human-readable)
 */
export function getDataRetentionPolicy(): {
  duration: string;
  description: string;
} {
  return {
    duration: 'Until you delete it',
    description:
      'Your data stays on your device indefinitely. You can export or delete it at any time.',
  };
}

/**
 * Confirm before deleting all data (requires two confirmations)
 */
export async function confirmDeleteAllData(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      'Delete All Data',
      'This will permanently delete all your health data from this device. This cannot be undone.\n\nAre you sure?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: () => {
            // Second confirmation for safety
            Alert.alert(
              'Final Confirmation',
              'This is your last chance. Delete all data permanently?',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                  onPress: () => resolve(false),
                },
                {
                  text: 'Yes, Delete All',
                  style: 'destructive',
                  onPress: () => resolve(true),
                },
              ]
            );
          },
        },
      ]
    );
  });
}

/**
 * Delete all user data (AsyncStorage + keychain)
 * Clears everything so the user can start fresh from onboarding.
 */
export async function deleteAllUserData(): Promise<void> {
  try {
    // 1. Clear all AsyncStorage data
    await AsyncStorage.clear();

    // 2. Clear keychain items (biometric, PIN, encryption)
    const keychainKeys = [
      'embermate_pin_hash',
      'embermate_pin_salt',
      'embermate_session_token',
      'embermate_master_key',
    ];
    for (const key of keychainKeys) {
      try {
        const SecureStore = require('expo-secure-store');
        await SecureStore.deleteItemAsync(key);
      } catch {
        // Key may not exist — safe to ignore
      }
    }

    devLog('Deleted all user data including keychain items');
  } catch (error) {
    logError('privacyUtils.deleteAllUserData', error);
    throw error;
  }
}

/**
 * Calculate approximate data size
 */
export async function getDataSize(): Promise<{
  items: number;
  sizeKB: number;
  sizeFormatted: string;
}> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const userDataKeys = keys.filter(
      (key) => !key.startsWith('system_') && !key.startsWith('app_')
    );

    let totalSize = 0;

    for (const key of userDataKeys) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        // Approximate size in bytes (2 bytes per character in JS strings)
        totalSize += value.length * 2;
      }
    }

    const sizeKB = Math.round(totalSize / 1024);
    const sizeMB = sizeKB / 1024;

    const sizeFormatted =
      sizeMB > 1 ? `${sizeMB.toFixed(1)} MB` : `${Math.max(1, sizeKB)} KB`;

    return {
      items: userDataKeys.length,
      sizeKB,
      sizeFormatted,
    };
  } catch (error) {
    logError('privacyUtils.getDataSize', error);
    return {
      items: 0,
      sizeKB: 0,
      sizeFormatted: '0 KB',
    };
  }
}

/**
 * Get privacy FAQ items
 */
export function getPrivacyFAQ(): Array<{ question: string; answer: string }> {
  return [
    {
      question: 'What data do you collect?',
      answer:
        "We don't collect or store any of your health data on our servers. All your health information stays on your device.",
    },
    {
      question: 'Can my doctor see my data?',
      answer:
        'Only if you add them to your care circle. You control exactly who can see what.',
    },
    {
      question: 'What if I get a new phone?',
      answer:
        "You'll need to export your data before switching and import it on your new device. Your data doesn't sync to the cloud.",
    },
    {
      question: 'Is my data backed up?',
      answer:
        'No. Your data stays only on this device. We recommend exporting it regularly as a backup.',
    },
    {
      question: 'Do you sell my data?',
      answer:
        "Never. We don't have access to your data, so we couldn't sell it even if we wanted to.",
    },
  ];
}
