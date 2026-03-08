// ============================================================================
// CLOUD BACKUP SERVICE TESTS
// Tests for encrypted backup creation, restoration, and file management
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import {
  createEncryptedBackup,
  restoreEncryptedBackup,
  quickBackup,
  quickRestore,
  getCloudBackupSettings,
  saveCloudBackupSettings,
  isAutoBackupDue,
  getBackupHistory,
  saveBackupToFile,
  EncryptedBackup,
} from '../cloudBackup';
import { getSecureItem } from '../secureStorage';

const BACKUP_SETTINGS_KEY = '@embermate_cloud_backup_settings';

describe('CloudBackup', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    // Set up some test data
    await AsyncStorage.setItem('@embermate_medications', JSON.stringify([
      { id: '1', name: 'Test Med', dosage: '10mg' }
    ]));
    await AsyncStorage.setItem('@embermate_appointments', JSON.stringify([
      { id: '1', provider: 'Dr. Test', date: '2025-01-20' }
    ]));
  });

  // ============================================================================
  // Encryption Tests
  // ============================================================================
  describe('createEncryptedBackup', () => {
    it('should create an encrypted backup with proper structure', async () => {
      const backup = await createEncryptedBackup('testpassword123');

      expect(backup).not.toBeNull();
      expect(backup!.version).toBe('3.1.0');
      expect(backup!.algorithm).toBe('AES-256-CTR-HMAC');
      expect(backup!.timestamp).toBeDefined();
      expect(backup!.iv).toBeDefined();
      expect(backup!.salt).toBeDefined();
      expect(backup!.hmac).toBeDefined();
      expect(backup!.data).toBeDefined();
    });

    it('should generate unique salt for each backup', async () => {
      const backup1 = await createEncryptedBackup('testpassword123');
      const backup2 = await createEncryptedBackup('testpassword123');

      expect(backup1!.salt).not.toBe(backup2!.salt);
    });

    it('should encrypt the data (not plain JSON)', async () => {
      const backup = await createEncryptedBackup('testpassword123');

      // The data should not be valid JSON (it's encrypted)
      expect(() => JSON.parse(backup!.data)).toThrow();
    });
  });

  describe('restoreEncryptedBackup', () => {
    it('should restore backup with correct password', async () => {
      const password = 'correctpassword';

      // Create backup
      const backup = await createEncryptedBackup(password);
      expect(backup).not.toBeNull();

      // Clear storage
      await AsyncStorage.clear();

      // Verify data is gone
      const medsBefore = await AsyncStorage.getItem('@embermate_medications');
      expect(medsBefore).toBeNull();

      // Restore
      const success = await restoreEncryptedBackup(backup!, password);
      expect(success).toBe(true);

      // Verify data is back (sensitive keys are now encrypted at rest,
      // so read via getSecureItem which handles decryption)
      const meds = await getSecureItem('@embermate_medications', null as any);
      expect(meds).not.toBeNull();
      expect((meds as any[])[0].name).toBe('Test Med');
    });

    it('should fail restore with wrong password', async () => {
      const backup = await createEncryptedBackup('correctpassword');

      // Clear storage
      await AsyncStorage.clear();

      // Try to restore with wrong password
      const success = await restoreEncryptedBackup(backup!, 'wrongpassword');
      expect(success).toBe(false);

      // Data should not be restored
      const meds = await AsyncStorage.getItem('@embermate_medications');
      expect(meds).toBeNull();
    });

    it('should fail with invalid backup format', async () => {
      const invalidBackup = {
        version: '2.0.0',
        algorithm: 'AES-256-GCM',
        timestamp: new Date().toISOString(),
        // Missing required fields
      } as EncryptedBackup;

      const success = await restoreEncryptedBackup(invalidBackup, 'anypassword');
      expect(success).toBe(false);
    });
  });

  // ============================================================================
  // Quick Backup/Restore Tests
  // ============================================================================
  describe('quickBackup', () => {
    it('should fail with password less than 6 characters', async () => {
      const result = await quickBackup('12345');

      expect(result.success).toBe(false);
      expect(result.error).toContain('6 characters');
    });

    it('should succeed with valid password', async () => {
      const result = await quickBackup('validpassword');

      expect(result.success).toBe(true);
      expect(result.filePath).toBeDefined();
    });
  });

  describe('quickRestore', () => {
    it('should fail without password', async () => {
      const result = await quickRestore('/some/path', '');

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });
  });

  // ============================================================================
  // Settings Tests
  // ============================================================================
  describe('getCloudBackupSettings', () => {
    it('should return default settings when none exist', async () => {
      const settings = await getCloudBackupSettings();

      expect(settings.enabled).toBe(false);
      expect(settings.autoBackupInterval).toBe('manual');
      expect(settings.lastBackupTimestamp).toBeNull();
    });

    it('should return saved settings', async () => {
      const savedSettings = {
        enabled: true,
        autoBackupInterval: 'daily' as const,
        lastBackupTimestamp: '2025-01-15T10:00:00.000Z',
        backupPassword: null,
      };

      await AsyncStorage.setItem(BACKUP_SETTINGS_KEY, JSON.stringify(savedSettings));

      const settings = await getCloudBackupSettings();

      expect(settings.enabled).toBe(true);
      expect(settings.autoBackupInterval).toBe('daily');
      expect(settings.lastBackupTimestamp).toBe('2025-01-15T10:00:00.000Z');
    });
  });

  describe('saveCloudBackupSettings', () => {
    it('should persist settings', async () => {
      const settings = {
        enabled: true,
        autoBackupInterval: 'weekly' as const,
        lastBackupTimestamp: '2025-01-20T10:00:00.000Z',
        backupPassword: null,
      };

      await saveCloudBackupSettings(settings);

      const saved = await AsyncStorage.getItem(BACKUP_SETTINGS_KEY);
      expect(saved).not.toBeNull();

      const parsed = JSON.parse(saved!);
      expect(parsed.enabled).toBe(true);
      expect(parsed.autoBackupInterval).toBe('weekly');
    });
  });

  // ============================================================================
  // Auto-Backup Tests
  // ============================================================================
  describe('isAutoBackupDue', () => {
    it('should return false when disabled', async () => {
      await saveCloudBackupSettings({
        enabled: false,
        autoBackupInterval: 'daily',
        lastBackupTimestamp: null,
        backupPassword: null,
      });

      const isDue = await isAutoBackupDue();
      expect(isDue).toBe(false);
    });

    it('should return false for manual mode', async () => {
      await saveCloudBackupSettings({
        enabled: true,
        autoBackupInterval: 'manual',
        lastBackupTimestamp: null,
        backupPassword: null,
      });

      const isDue = await isAutoBackupDue();
      expect(isDue).toBe(false);
    });

    it('should return true when no previous backup exists', async () => {
      await saveCloudBackupSettings({
        enabled: true,
        autoBackupInterval: 'daily',
        lastBackupTimestamp: null,
        backupPassword: null,
      });

      const isDue = await isAutoBackupDue();
      expect(isDue).toBe(true);
    });

    it('should return true when daily backup is more than 24 hours old', async () => {
      const oldTimestamp = new Date();
      oldTimestamp.setHours(oldTimestamp.getHours() - 25); // 25 hours ago

      await saveCloudBackupSettings({
        enabled: true,
        autoBackupInterval: 'daily',
        lastBackupTimestamp: oldTimestamp.toISOString(),
        backupPassword: null,
      });

      const isDue = await isAutoBackupDue();
      expect(isDue).toBe(true);
    });

    it('should return false when daily backup is less than 24 hours old', async () => {
      const recentTimestamp = new Date();
      recentTimestamp.setHours(recentTimestamp.getHours() - 12); // 12 hours ago

      await saveCloudBackupSettings({
        enabled: true,
        autoBackupInterval: 'daily',
        lastBackupTimestamp: recentTimestamp.toISOString(),
        backupPassword: null,
      });

      const isDue = await isAutoBackupDue();
      expect(isDue).toBe(false);
    });
  });

  // ============================================================================
  // File Management Tests
  // ============================================================================
  describe('getBackupHistory', () => {
    it('should return empty array when no backups exist', async () => {
      const history = await getBackupHistory();
      expect(history).toEqual([]);
    });
  });

  describe('saveBackupToFile', () => {
    it('should save backup and update last backup timestamp', async () => {
      const backup = await createEncryptedBackup('testpassword');

      const filePath = await saveBackupToFile(backup!);

      expect(filePath).not.toBeNull();
      expect(filePath).toContain('EmberMate-Backup');
      expect(filePath).toContain('.emb');

      // Verify settings were updated
      const settings = await getCloudBackupSettings();
      expect(settings.lastBackupTimestamp).not.toBeNull();
    });
  });
});
