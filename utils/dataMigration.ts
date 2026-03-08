// ============================================================================
// DATA MIGRATION — Plaintext → Encrypted Storage
// One-time migration that re-saves sensitive keys through the encryption layer.
// Runs at app startup; safe to re-run (idempotent via MIGRATION_FLAG).
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { setSecureItem } from './secureStorage';
import { isSensitiveKey } from './safeStorage';
import { devLog, logError } from './devLog';
import { StorageKeys } from './storageKeys';

const MIGRATION_FLAG = StorageKeys.ENCRYPTION_MIGRATED_V1;

export async function migrateToEncryptedStorage(): Promise<void> {
  try {
    const alreadyMigrated = await AsyncStorage.getItem(MIGRATION_FLAG);
    if (alreadyMigrated) return;

    devLog('[Migration] Starting encryption migration...');

    const allKeys = await AsyncStorage.getAllKeys();
    let migrated = 0;

    for (const key of allKeys) {
      if (!isSensitiveKey(key)) continue;

      try {
        const plaintext = await AsyncStorage.getItem(key);
        if (!plaintext) continue;

        // Check if already encrypted (v3: or v2: format from secureStorage)
        if (plaintext.startsWith('v3:') || plaintext.startsWith('v2:')) continue;

        // Re-save through encrypted path
        await setSecureItem(key, plaintext);
        migrated++;
      } catch (err) {
        logError('dataMigration.migrateKey', err, { key });
        // Continue with other keys on failure
      }
    }

    // Set migration flag
    await AsyncStorage.setItem(MIGRATION_FLAG, new Date().toISOString());
    devLog(`[Migration] Encryption migration complete: ${migrated} keys migrated`);
  } catch (error) {
    logError('dataMigration.migrateToEncryptedStorage', error);
    // Don't throw — migration failure shouldn't break app startup
  }
}
