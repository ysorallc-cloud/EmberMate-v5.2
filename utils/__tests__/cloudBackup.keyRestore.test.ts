// ============================================================================
// Task 1.4: Verify backup includes wrapped master key and restore restores it.
// Without this, device migration orphans all encrypted local data.
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

describe('Task 1.4: Backup includes wrapped master key, restore restores it', () => {

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    (SecureStore as any).__resetStore();
  });

  it('backup includes wrappedMasterKey field in metadata', async () => {
    // Store sensitive data to trigger master key creation
    await setSecureItem('@embermate_central_vitals_logs', [{ id: '1' }]);

    const backup = await createEncryptedBackup('testpassword');
    expect(backup).not.toBeNull();
    expect(backup!.wrappedMasterKey).toBeDefined();
    expect(typeof backup!.wrappedMasterKey).toBe('string');
    expect(backup!.wrappedMasterKey!.length).toBeGreaterThan(0);
    expect(backup!.wrappingSalt).toBeDefined();
    expect(typeof backup!.wrappingSalt).toBe('string');
    expect(backup!.wrappingSalt!.length).toBeGreaterThan(0);
  });

  it('restore overwrites local master key with backed-up key', async () => {
    // --- Device A: store sensitive data ---
    const vitalsData = [{ id: '1', timestamp: '2026-02-28T10:00:00Z', systolic: 120 }];
    await setSecureItem(SENSITIVE_KEY, vitalsData);

    // Capture Device A's master key
    const keyA = await SecureStore.getItemAsync(ENCRYPTION_KEY_ALIAS);
    expect(keyA).toBeDefined();

    // Create backup
    const backup = await createEncryptedBackup('migrationpw');
    expect(backup).not.toBeNull();

    // --- Simulate Device B: fresh keychain ---
    await AsyncStorage.clear();
    (SecureStore as any).__resetStore();

    // Device B generates its own key when we trigger any crypto operation
    // For now, just set a known different key
    await SecureStore.setItemAsync(ENCRYPTION_KEY_ALIAS, 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
    const keyB = await SecureStore.getItemAsync(ENCRYPTION_KEY_ALIAS);
    expect(keyB).not.toBe(keyA);

    // Restore backup
    const restored = await restoreEncryptedBackup(backup!, 'migrationpw');
    expect(restored).toBe(true);

    // After restore, master key should be Device A's key (not B's)
    const restoredKey = await SecureStore.getItemAsync(ENCRYPTION_KEY_ALIAS);
    expect(restoredKey).toBe(keyA);
  });

  it('wrong backup password fails to unwrap master key (restore fails)', async () => {
    await AsyncStorage.setItem('@embermate_patient_name', JSON.stringify('Test'));

    const backup = await createEncryptedBackup('correctpassword');
    expect(backup).not.toBeNull();

    await AsyncStorage.clear();
    (SecureStore as any).__resetStore();

    // Wrong password — entire restore should fail (HMAC check on data fails)
    const restored = await restoreEncryptedBackup(backup!, 'wrongpassword');
    expect(restored).toBe(false);

    // Master key should NOT have been overwritten (no key should exist on fresh device)
    const key = await SecureStore.getItemAsync(ENCRYPTION_KEY_ALIAS);
    expect(key).toBeNull();
  });

  it('backward compat: v3 backup without wrappedMasterKey restores data without touching key', async () => {
    // Create a legacy-style backup (no wrappedMasterKey)
    await AsyncStorage.setItem('@embermate_patient_name', JSON.stringify('Legacy'));

    const backup = await createEncryptedBackup('legacypw');
    expect(backup).not.toBeNull();

    // Remove the wrappedMasterKey fields to simulate a v3.0.0 backup
    const legacyBackup: EncryptedBackup = { ...backup! };
    delete (legacyBackup as any).wrappedMasterKey;
    delete (legacyBackup as any).wrappingSalt;

    // Set up Device B
    await AsyncStorage.clear();
    (SecureStore as any).__resetStore();

    const deviceBKey = 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc';
    await SecureStore.setItemAsync(ENCRYPTION_KEY_ALIAS, deviceBKey);

    // Restore legacy backup
    const restored = await restoreEncryptedBackup(legacyBackup, 'legacypw');
    expect(restored).toBe(true);

    // Device B's key should be untouched (legacy backup doesn't carry master key)
    const keyAfter = await SecureStore.getItemAsync(ENCRYPTION_KEY_ALIAS);
    expect(keyAfter).toBe(deviceBKey);

    // Non-sensitive data should still be restored
    const name = await AsyncStorage.getItem('@embermate_patient_name');
    expect(JSON.parse(name!)).toBe('Legacy');
  });
});
