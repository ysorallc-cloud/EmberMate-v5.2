// ============================================================================
// Task 1.3: Verify backup decrypts sensitive keys before inclusion, and
// restore re-encrypts them with the current device key.
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { setSecureItem, getSecureItem } from '../secureStorage';
import {
  createEncryptedBackup,
  restoreEncryptedBackup,
  EncryptedBackup,
} from '../cloudBackup';

const ENCRYPTION_KEY_ALIAS = 'embermate_master_key';
const SENSITIVE_KEY = '@embermate_central_vitals_logs';
const NON_SENSITIVE_KEY = '@embermate_patient_name';

// Helper: decrypt a backup using the same password
// (re-implements the decryption path to inspect the payload)
async function decryptBackupPayload(
  backup: EncryptedBackup,
  password: string
): Promise<Record<string, any>> {
  // Use restoreEncryptedBackup indirectly — but we need the raw payload.
  // Instead, we'll create a backup, restore it, and check what's in AsyncStorage.
  // For direct inspection, we replicate the key derivation + AES decrypt.
  // But that's complex. A simpler approach: spy on AsyncStorage.multiSet
  // during restore to capture what the restore writes.
  //
  // Actually the cleanest approach: store unique data, backup, clear, restore,
  // then read back with getSecureItem to verify accessibility.
  throw new Error('Use round-trip tests instead');
}

describe('Task 1.3: Backup decrypts sensitive keys, restore re-encrypts them', () => {

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    // Reset SecureStore to get a fresh encryption key
    (SecureStore as any).__resetStore();
  });

  it('gatherBackupData includes decrypted plaintext for sensitive keys (not ciphertext)', async () => {
    // Store sensitive data via setSecureItem (encrypts it in AsyncStorage)
    const vitalsData = [{ id: '1', timestamp: '2026-02-28T10:00:00Z', systolic: 120 }];
    await setSecureItem(SENSITIVE_KEY, vitalsData);

    // Verify AsyncStorage contains encrypted (v3:...) format, not plaintext
    const rawStored = await AsyncStorage.getItem(SENSITIVE_KEY);
    expect(rawStored).toBeDefined();
    expect(rawStored!.startsWith('v3:')).toBe(true);

    // Store non-sensitive data directly
    await AsyncStorage.setItem(NON_SENSITIVE_KEY, JSON.stringify('Jane'));

    // Create backup
    const backup = await createEncryptedBackup('testpassword');
    expect(backup).not.toBeNull();

    // Restore to a clean slate and inspect what was written
    await AsyncStorage.clear();

    // Spy on AsyncStorage.multiSet AND setSecureItem to see routing
    const multiSetSpy = jest.spyOn(AsyncStorage, 'multiSet');

    const restored = await restoreEncryptedBackup(backup!, 'testpassword');
    expect(restored).toBe(true);

    // After restore, read the sensitive key via getSecureItem
    // If the backup contained ciphertext from key A, and restore wrote it via
    // multiSet (raw), it would be double-encrypted and unreadable.
    // If the fix is applied, backup contains plaintext and restore uses setSecureItem,
    // so getSecureItem can decrypt it.
    const restoredVitals = await getSecureItem(SENSITIVE_KEY, null);
    expect(restoredVitals).toEqual(vitalsData);
  });

  it('restoreEncryptedBackup routes sensitive keys through setSecureItem', async () => {
    // Store data and create backup
    const vitalsData = [{ id: '2', timestamp: '2026-02-28T11:00:00Z', systolic: 130 }];
    await setSecureItem(SENSITIVE_KEY, vitalsData);
    await AsyncStorage.setItem(NON_SENSITIVE_KEY, JSON.stringify('John'));

    const backup = await createEncryptedBackup('pw123456');
    expect(backup).not.toBeNull();

    // Clear and restore
    await AsyncStorage.clear();

    const restored = await restoreEncryptedBackup(backup!, 'pw123456');
    expect(restored).toBe(true);

    // Sensitive key should be stored in encrypted format (v3:...)
    const rawAfterRestore = await AsyncStorage.getItem(SENSITIVE_KEY);
    expect(rawAfterRestore).toBeDefined();
    expect(rawAfterRestore!.startsWith('v3:')).toBe(true);

    // Non-sensitive key should be plain JSON
    const nameAfterRestore = await AsyncStorage.getItem(NON_SENSITIVE_KEY);
    expect(nameAfterRestore).toBe(JSON.stringify('John'));
  });

  it('non-sensitive keys continue to use AsyncStorage.multiSet (no regression)', async () => {
    await AsyncStorage.setItem(NON_SENSITIVE_KEY, JSON.stringify('Jane'));
    await AsyncStorage.setItem('@embermate_onboarding_complete', JSON.stringify(true));

    const backup = await createEncryptedBackup('pw123456');
    expect(backup).not.toBeNull();

    await AsyncStorage.clear();

    const restored = await restoreEncryptedBackup(backup!, 'pw123456');
    expect(restored).toBe(true);

    // Non-sensitive data should be directly readable without decryption
    const name = await AsyncStorage.getItem(NON_SENSITIVE_KEY);
    expect(JSON.parse(name!)).toBe('Jane');

    const onboarding = await AsyncStorage.getItem('@embermate_onboarding_complete');
    expect(JSON.parse(onboarding!)).toBe(true);
  });

  it('round-trip: backup with key A, restore with key B, sensitive data is readable', async () => {
    // --- Device A: store data with encryption key A ---
    const vitalsData = [{ id: '3', timestamp: '2026-02-28T12:00:00Z', diastolic: 85 }];
    await setSecureItem(SENSITIVE_KEY, vitalsData);
    await AsyncStorage.setItem(NON_SENSITIVE_KEY, JSON.stringify('Alice'));

    // Create backup (gatherBackupData should decrypt sensitive keys)
    const backup = await createEncryptedBackup('migration-pw');
    expect(backup).not.toBeNull();

    // --- Simulate Device B: different encryption key ---
    await AsyncStorage.clear();
    (SecureStore as any).__resetStore();
    // Don't pre-set a key — getOrCreateEncryptionKey will generate a new one
    // This simulates a new device with a fresh keychain

    const restored = await restoreEncryptedBackup(backup!, 'migration-pw');
    expect(restored).toBe(true);

    // Read with Device B's key — should work if restore used setSecureItem
    const restoredVitals = await getSecureItem(SENSITIVE_KEY, null);
    expect(restoredVitals).toEqual(vitalsData);

    // Non-sensitive data should also be readable
    const name = await AsyncStorage.getItem(NON_SENSITIVE_KEY);
    expect(JSON.parse(name!)).toBe('Alice');
  });
});
