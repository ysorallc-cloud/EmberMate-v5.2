// ============================================================================
// CLOUD BACKUP SERVICE
// Encrypted backup using AES-256-CTR + HMAC-SHA256 for native cloud sync (iCloud/Google Drive)
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Crypto from 'expo-crypto';
import { Alert, Platform } from 'react-native';
import CryptoJS from 'crypto-js';
import { devLog, logError } from './devLog';
import { logAuditEvent, AuditEventType, AuditSeverity } from './auditLog';
import * as SecureStore from 'expo-secure-store';
import { isSensitiveKey, safeGetItem, safeSetItem } from './safeStorage';
import { getSecureItem, setSecureItem } from './secureStorage';
import { StorageKeys, StorageKeyPrefixes } from './storageKeys';

const ENCRYPTION_KEY_ALIAS = 'embermate_master_key';

// ============================================================================
// Types
// ============================================================================

export interface EncryptedBackup {
  version: string;
  algorithm: 'AES-256-CTR-HMAC' | 'AES-256-GCM'; // GCM is legacy label
  timestamp: string;
  iv: string;
  salt: string;
  hmac: string;
  data: string;
  iterations?: number;        // PBKDF2 iteration count (absent = 10,000 for v3.0.0)
  wrappedMasterKey?: string;  // AES-wrapped device master key (hex)
  wrappingSalt?: string;      // Salt used for wrapping key derivation (hex)
}

export interface BackupMetadata {
  filename: string;
  timestamp: string;
  size: number;
  encrypted: boolean;
}

export interface CloudBackupSettings {
  enabled: boolean;
  autoBackupInterval: 'daily' | 'weekly' | 'manual';
  lastBackupTimestamp: string | null;
  backupPassword: string | null; // Stored separately in secure storage
}

// ============================================================================
// Constants
// ============================================================================

const BACKUP_VERSION = '3.1.0'; // v3.1: 100k PBKDF2 iterations (up from 10k)
const BACKUP_DIR = 'EmberMate-Backups';
const BACKUP_SETTINGS_KEY = StorageKeys.CLOUD_BACKUP_SETTINGS;
// OWASP recommends 600,000 iterations for SHA-256; 100,000 is a practical
// compromise for mobile devices. A loading indicator masks the ~1-3s latency.
const PBKDF2_ITERATIONS = 100_000;
// Legacy v3.0.0 backups used 10,000 iterations — needed for backward compat
const LEGACY_PBKDF2_ITERATIONS = 10_000;
const SALT_LENGTH = 32;
const IV_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits

// All storage keys to backup
const STORAGE_KEYS = {
  medications: StorageKeys.MEDICATIONS,
  medicationLogs: StorageKeys.MEDICATION_LOGS,
  appointments: StorageKeys.APPOINTMENTS,
  patientName: StorageKeys.PATIENT_NAME,
  patientInfo: StorageKeys.PATIENT_INFO,
  careTeam: StorageKeys.CARE_TEAM,
  caregivers: StorageKeys.CAREGIVERS,
  settings: StorageKeys.SETTINGS_MODIFIED,
  onboardingComplete: StorageKeys.ONBOARDING_COMPLETE,
  lastResetDate: StorageKeys.LAST_RESET_DATE,
  notificationSettings: StorageKeys.NOTIFICATION_SETTINGS,
};

// ============================================================================
// Crypto Helpers
// ============================================================================

/**
 * Generate cryptographically secure random bytes
 */
async function generateRandomBytes(length: number): Promise<Uint8Array> {
  const bytes = await Crypto.getRandomBytesAsync(length);
  return bytes;
}

/**
 * Convert bytes to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to bytes
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Constant-time string comparison to prevent timing attacks on HMAC verification
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Derive encryption key from password using PBKDF2-like iterated hashing.
 * Note: React Native doesn't have native PBKDF2, so we use iterated SHA-256.
 * @param iterations - Number of hash iterations (defaults to PBKDF2_ITERATIONS)
 */
async function deriveKey(password: string, salt: Uint8Array, iterations: number = PBKDF2_ITERATIONS): Promise<Uint8Array> {
  const saltHex = bytesToHex(salt);

  // Start with combined value
  let hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    password + saltHex
  );

  for (let i = 0; i < iterations; i++) {
    hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      hash + saltHex
    );
  }

  return hexToBytes(hash);
}

/**
 * Encrypt data using AES-256-CTR with HMAC-SHA256 (Encrypt-then-MAC)
 */
function aesEncrypt(data: string, key: Uint8Array, iv: Uint8Array): { ciphertext: string; hmac: string } {
  const keyWordArray = CryptoJS.lib.WordArray.create(key);
  const ivWordArray = CryptoJS.lib.WordArray.create(iv);

  const encrypted = CryptoJS.AES.encrypt(data, keyWordArray, {
    iv: ivWordArray,
    mode: CryptoJS.mode.CTR,
    padding: CryptoJS.pad.NoPadding,
  });

  const ciphertextHex = encrypted.ciphertext.toString();
  const hmac = CryptoJS.HmacSHA256(ciphertextHex, keyWordArray).toString();

  return { ciphertext: ciphertextHex, hmac };
}

/**
 * Decrypt data using AES-256-CTR with HMAC-SHA256 verification
 */
function aesDecrypt(ciphertextHex: string, key: Uint8Array, ivHex: string, expectedHmac: string): string {
  const keyWordArray = CryptoJS.lib.WordArray.create(key);

  // Verify HMAC before decryption (constant-time comparison)
  const calculatedHmac = CryptoJS.HmacSHA256(ciphertextHex, keyWordArray).toString();
  if (!constantTimeEqual(calculatedHmac, expectedHmac)) {
    throw new Error('Invalid password or corrupted backup');
  }

  const ivWordArray = CryptoJS.enc.Hex.parse(ivHex);
  const ciphertextWordArray = CryptoJS.enc.Hex.parse(ciphertextHex);

  const decrypted = CryptoJS.AES.decrypt(
    { ciphertext: ciphertextWordArray } as any,
    keyWordArray,
    {
      iv: ivWordArray,
      mode: CryptoJS.mode.CTR,
      padding: CryptoJS.pad.NoPadding,
    }
  );

  return decrypted.toString(CryptoJS.enc.Utf8);
}

/**
 * Legacy XOR-based decryption (for restoring v2.0.0 backups only)
 */
function legacyXorDecrypt(encryptedBase64: string, key: Uint8Array): string {
  const encrypted = new Uint8Array(
    atob(encryptedBase64).split('').map(c => c.charCodeAt(0))
  );
  const decrypted = new Uint8Array(encrypted.length);

  for (let i = 0; i < encrypted.length; i++) {
    decrypted[i] = encrypted[i] ^ key[i % key.length];
  }

  return new TextDecoder().decode(decrypted);
}

/**
 * Legacy HMAC calculation (for verifying v2.0.0 backups)
 */
async function legacyCalculateHMAC(data: string, key: Uint8Array): Promise<string> {
  const keyHex = bytesToHex(key);
  const combined = keyHex + data;

  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    combined
  );
}

// ============================================================================
// Backup Creation
// ============================================================================

/**
 * Gather all app data for backup
 */
async function gatherBackupData(): Promise<Record<string, any>> {
  const backupData: Record<string, any> = {};

  try {
    const keys = await AsyncStorage.getAllKeys();
    const items = await AsyncStorage.multiGet(keys);

    for (const [key, value] of items) {
      if (!value) continue;

      // Only backup EmberMate keys
      if (key.startsWith(StorageKeyPrefixes.EMBERMATE_PREFIX) || key.startsWith(StorageKeyPrefixes.EMBERMATE_NS)) {
        if (isSensitiveKey(key)) {
          // Decrypt sensitive keys so backup contains plaintext.
          // The backup's own password-based encryption protects the data.
          const decrypted = await getSecureItem(key, null);
          if (decrypted !== null) {
            backupData[key] = decrypted;
          } else {
            // Fallback: data may be pre-encryption plaintext (stored before
            // encryption was enabled). Include it as-is.
            try {
              backupData[key] = JSON.parse(value);
            } catch {
              backupData[key] = value;
            }
          }
        } else {
          try {
            backupData[key] = JSON.parse(value);
          } catch {
            backupData[key] = value;
          }
        }
      }
    }

    return backupData;
  } catch (error) {
    logError('cloudBackup.gatherBackupData', error);
    throw error;
  }
}

/**
 * Create an encrypted backup with password protection
 */
export async function createEncryptedBackup(password: string): Promise<EncryptedBackup | null> {
  try {
    // Gather all data
    const data = await gatherBackupData();
    const dataString = JSON.stringify(data);

    // Generate salt and IV
    const salt = await generateRandomBytes(SALT_LENGTH);
    const iv = await generateRandomBytes(IV_LENGTH);

    // Derive encryption key from password
    const key = await deriveKey(password, salt);

    // Encrypt the data using AES-256-CTR + HMAC-SHA256
    const { ciphertext: encryptedData, hmac } = aesEncrypt(dataString, key, iv);

    const backup: EncryptedBackup = {
      version: BACKUP_VERSION,
      algorithm: 'AES-256-CTR-HMAC',
      timestamp: new Date().toISOString(),
      iv: bytesToHex(iv),
      salt: bytesToHex(salt),
      hmac,
      data: encryptedData,
      iterations: PBKDF2_ITERATIONS,
    };

    // Wrap the device master key so it can be restored on another device
    try {
      const masterKey = await SecureStore.getItemAsync(ENCRYPTION_KEY_ALIAS);
      if (masterKey) {
        const wrappingSalt = await generateRandomBytes(SALT_LENGTH);
        const wrappingKey = await deriveKey(password, wrappingSalt);
        const wrappingIv = await generateRandomBytes(IV_LENGTH);
        const { ciphertext: wrappedKey, hmac: wrappingHmac } = aesEncrypt(masterKey, wrappingKey, wrappingIv);
        // Pack as iv:ciphertext:hmac so we can unwrap later
        backup.wrappedMasterKey = bytesToHex(wrappingIv) + ':' + wrappedKey + ':' + wrappingHmac;
        backup.wrappingSalt = bytesToHex(wrappingSalt);
      }
    } catch (wrapError) {
      // Non-fatal: backup still works, just without key portability
      devLog('[cloudBackup] Could not wrap master key:', wrapError);
    }

    // Log audit event
    await logAuditEvent(
      AuditEventType.DATA_BACKUP_CREATED,
      'Encrypted backup created',
      AuditSeverity.INFO,
      { version: BACKUP_VERSION, encrypted: true }
    );

    return backup;
  } catch (error) {
    logError('cloudBackup.createEncryptedBackup', error);
    return null;
  }
}

/**
 * Restore data from an encrypted backup
 */
export async function restoreEncryptedBackup(
  backup: EncryptedBackup,
  password: string
): Promise<boolean> {
  try {
    // Verify version
    if (!backup.version || !backup.data || !backup.salt || !backup.hmac) {
      throw new Error('Invalid backup format');
    }

    // Derive key from password using the iteration count stored in the backup.
    // v3.0.0 backups don't have this field and used 10,000 iterations.
    const salt = hexToBytes(backup.salt);
    const restoreIterations = backup.iterations ?? LEGACY_PBKDF2_ITERATIONS;
    const key = await deriveKey(password, salt, restoreIterations);

    // Decrypt based on backup version
    let decryptedString: string;
    if (backup.version === '3.0.0' || backup.version === '3.1.0') {
      // v3: AES-256-CTR + HMAC (verifies HMAC internally with constant-time comparison)
      decryptedString = aesDecrypt(backup.data, key, backup.iv, backup.hmac);
    } else {
      // v2 legacy: XOR encryption with simple HMAC
      const calculatedHmac = await legacyCalculateHMAC(backup.data, key);
      if (!constantTimeEqual(calculatedHmac, backup.hmac)) {
        throw new Error('Invalid password or corrupted backup');
      }
      decryptedString = legacyXorDecrypt(backup.data, key);
    }
    const data = JSON.parse(decryptedString);

    // Unwrap and restore the master encryption key (if present in backup)
    if (backup.wrappedMasterKey && backup.wrappingSalt) {
      try {
        const wrappingSalt = hexToBytes(backup.wrappingSalt);
        const wrappingKey = await deriveKey(password, wrappingSalt);
        const [wrappingIvHex, wrappedCiphertext, wrappingHmac] = backup.wrappedMasterKey.split(':');
        const unwrappedMasterKey = aesDecrypt(wrappedCiphertext, wrappingKey, wrappingIvHex, wrappingHmac);
        await SecureStore.setItemAsync(ENCRYPTION_KEY_ALIAS, unwrappedMasterKey, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED,
        });
      } catch (keyError) {
        // If key unwrapping fails, the data password was already verified above,
        // so this is a corrupted wrappedMasterKey field — log but continue.
        devLog('[cloudBackup] Could not unwrap master key:', keyError);
      }
    }

    // Restore all data — route sensitive keys through setSecureItem
    // so they're re-encrypted with the current device's master key.
    // Non-sensitive keys go through safeSetItem for consistency.
    for (const [key, value] of Object.entries(data)) {
      if (isSensitiveKey(key)) {
        await setSecureItem(key, value);
      } else {
        await safeSetItem(key, value);
      }
    }

    // Log audit event
    await logAuditEvent(
      AuditEventType.DATA_RESTORED,
      'Data restored from encrypted backup',
      AuditSeverity.INFO,
      { version: backup.version, timestamp: backup.timestamp }
    );

    return true;
  } catch (error) {
    logError('cloudBackup.restoreEncryptedBackup', error);

    // Log failed attempt
    await logAuditEvent(
      AuditEventType.DATA_RESTORE_FAILED,
      error instanceof Error ? error.message : 'Unknown error',
      AuditSeverity.WARNING,
      {}
    );

    return false;
  }
}

// ============================================================================
// Backup File Management
// ============================================================================

/**
 * Get the backup directory path
 */
function getBackupDirectory(): string {
  return `${FileSystem.documentDirectory}${BACKUP_DIR}/`;
}

/**
 * Ensure backup directory exists
 */
async function ensureBackupDirectory(): Promise<void> {
  const dirPath = getBackupDirectory();
  const dirInfo = await FileSystem.getInfoAsync(dirPath);

  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
  }
}

/**
 * Save encrypted backup to file
 */
export async function saveBackupToFile(
  backup: EncryptedBackup
): Promise<string | null> {
  try {
    await ensureBackupDirectory();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `EmberMate-Backup-${timestamp}.emb`;
    const filePath = `${getBackupDirectory()}${filename}`;

    await FileSystem.writeAsStringAsync(
      filePath,
      JSON.stringify(backup),
      { encoding: FileSystem.EncodingType.UTF8 }
    );

    // Update last backup timestamp
    const settings = await getCloudBackupSettings();
    settings.lastBackupTimestamp = new Date().toISOString();
    await saveCloudBackupSettings(settings);

    return filePath;
  } catch (error) {
    logError('cloudBackup.saveBackupToFile', error);
    return null;
  }
}

/**
 * Load backup from file
 */
export async function loadBackupFromFile(filePath: string): Promise<EncryptedBackup | null> {
  try {
    const content = await FileSystem.readAsStringAsync(filePath, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    return JSON.parse(content) as EncryptedBackup;
  } catch (error) {
    logError('cloudBackup.loadBackupFromFile', error);
    return null;
  }
}

/**
 * Get list of available backups
 */
export async function getBackupHistory(): Promise<BackupMetadata[]> {
  try {
    await ensureBackupDirectory();
    const dirPath = getBackupDirectory();

    // List all files in backup directory
    const files = await FileSystem.readDirectoryAsync(dirPath);

    const backups: BackupMetadata[] = [];

    for (const filename of files) {
      if (!filename.endsWith('.emb')) continue;

      const filePath = `${dirPath}${filename}`;
      const info = await FileSystem.getInfoAsync(filePath);

      if (info.exists && !info.isDirectory) {
        backups.push({
          filename,
          timestamp: extractTimestampFromFilename(filename),
          size: info.size || 0,
          encrypted: true,
        });
      }
    }

    // Sort by timestamp, newest first
    return backups.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  } catch (error) {
    logError('cloudBackup.getBackupHistory', error);
    return [];
  }
}

/**
 * Extract timestamp from backup filename
 */
function extractTimestampFromFilename(filename: string): string {
  // Filename format: EmberMate-Backup-2025-01-30T10-30-45.emb
  const match = filename.match(/EmberMate-Backup-(.+)\.emb/);
  if (match) {
    // Convert back to ISO format
    return match[1].replace(/-(\d{2})-(\d{2})-(\d{2})$/, ':$1:$2:$3') + 'Z';
  }
  return new Date().toISOString();
}

/**
 * Delete a backup file
 */
export async function deleteBackup(filename: string): Promise<boolean> {
  try {
    const filePath = `${getBackupDirectory()}${filename}`;
    await FileSystem.deleteAsync(filePath);
    return true;
  } catch (error) {
    logError('cloudBackup.deleteBackup', error);
    return false;
  }
}

/**
 * Delete old backups, keeping only the most recent N
 */
export async function cleanupOldBackups(keepCount: number = 5): Promise<number> {
  try {
    const backups = await getBackupHistory();

    if (backups.length <= keepCount) {
      return 0;
    }

    const toDelete = backups.slice(keepCount);
    let deletedCount = 0;

    for (const backup of toDelete) {
      const success = await deleteBackup(backup.filename);
      if (success) deletedCount++;
    }

    return deletedCount;
  } catch (error) {
    logError('cloudBackup.cleanupOldBackups', error);
    return 0;
  }
}

// ============================================================================
// Backup Settings
// ============================================================================

/**
 * Get cloud backup settings
 */
export async function getCloudBackupSettings(): Promise<CloudBackupSettings> {
  return safeGetItem<CloudBackupSettings>(BACKUP_SETTINGS_KEY, {
    enabled: false,
    autoBackupInterval: 'manual',
    lastBackupTimestamp: null,
    backupPassword: null,
  });
}

/**
 * Save cloud backup settings
 */
export async function saveCloudBackupSettings(
  settings: CloudBackupSettings
): Promise<void> {
  try {
    await safeSetItem(BACKUP_SETTINGS_KEY, settings);
  } catch (error) {
    logError('cloudBackup.saveCloudBackupSettings', error);
    throw error;
  }
}

// ============================================================================
// Auto-Backup Scheduling
// ============================================================================

/**
 * Check if auto-backup is due
 */
export async function isAutoBackupDue(): Promise<boolean> {
  try {
    const settings = await getCloudBackupSettings();

    if (!settings.enabled || settings.autoBackupInterval === 'manual') {
      return false;
    }

    if (!settings.lastBackupTimestamp) {
      return true;
    }

    const lastBackup = new Date(settings.lastBackupTimestamp);
    const now = new Date();
    const diffMs = now.getTime() - lastBackup.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    switch (settings.autoBackupInterval) {
      case 'daily':
        return diffHours >= 24;
      case 'weekly':
        return diffHours >= 168; // 7 * 24
      default:
        return false;
    }
  } catch (error) {
    logError('cloudBackup.isAutoBackupDue', error);
    return false;
  }
}

/**
 * Perform auto-backup if due
 * Call this on app startup or resume
 */
export async function performAutoBackupIfDue(password: string): Promise<boolean> {
  try {
    const isDue = await isAutoBackupDue();

    if (!isDue) {
      return false;
    }

    const backup = await createEncryptedBackup(password);
    if (!backup) {
      return false;
    }

    const filePath = await saveBackupToFile(backup);
    if (!filePath) {
      return false;
    }

    // Cleanup old backups
    await cleanupOldBackups(5);

    devLog('Auto-backup completed:', filePath);
    return true;
  } catch (error) {
    logError('cloudBackup.performAutoBackupIfDue', error);
    return false;
  }
}

// ============================================================================
// Quick Backup & Restore (One-step operations)
// ============================================================================

/**
 * Quick backup: Create and save encrypted backup
 */
export async function quickBackup(password: string): Promise<{
  success: boolean;
  filePath?: string;
  error?: string;
}> {
  try {
    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }

    const backup = await createEncryptedBackup(password);
    if (!backup) {
      return { success: false, error: 'Failed to create backup' };
    }

    const filePath = await saveBackupToFile(backup);
    if (!filePath) {
      return { success: false, error: 'Failed to save backup file' };
    }

    return { success: true, filePath };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Quick restore: Load and restore from backup file
 */
export async function quickRestore(
  filePath: string,
  password: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    if (!password) {
      return { success: false, error: 'Password is required' };
    }

    const backup = await loadBackupFromFile(filePath);
    if (!backup) {
      return { success: false, error: 'Failed to load backup file' };
    }

    const restored = await restoreEncryptedBackup(backup, password);
    if (!restored) {
      return { success: false, error: 'Invalid password or corrupted backup' };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get backup info without decrypting
 */
export async function getBackupInfo(filePath: string): Promise<{
  version: string;
  timestamp: string;
  encrypted: boolean;
} | null> {
  try {
    const backup = await loadBackupFromFile(filePath);
    if (!backup) return null;

    return {
      version: backup.version,
      timestamp: backup.timestamp,
      encrypted: backup.algorithm === 'AES-256-CTR-HMAC' || backup.algorithm === 'AES-256-GCM',
    };
  } catch (error) {
    logError('cloudBackup.getBackupInfo', error);
    return null;
  }
}

// ============================================================================
// Legacy v1 Backup Support (consolidated from dataBackup.ts)
// Handles the plain BackupData format (version 1.0.0) and its encryption.
// ============================================================================

export interface BackupData {
  version: string;
  timestamp: string;
  encrypted?: boolean;
  checksum?: string;
  data: {
    medications: any[];
    medicationLogs: any[];
    appointments: any[];
    patientInfo: any;
    careTeam: any[];
    caregivers: any[];
    settings: any;
  };
}

const LEGACY_STORAGE_KEYS = {
  medications: StorageKeys.MEDICATIONS,
  medicationLogs: StorageKeys.MEDICATION_LOGS,
  appointments: StorageKeys.APPOINTMENTS,
  patientName: StorageKeys.PATIENT_NAME,
  patientInfo: StorageKeys.PATIENT_INFO,
  careTeam: StorageKeys.CARE_TEAM,
  caregivers: StorageKeys.CAREGIVERS,
  settings: StorageKeys.SETTINGS_MODIFIED,
  onboardingComplete: StorageKeys.ONBOARDING_COMPLETE,
  lastResetDate: StorageKeys.LAST_RESET_DATE,
};

/**
 * Create a plain (v1) backup of all app data
 */
async function createLegacyBackup(): Promise<BackupData | null> {
  try {
    const backup: BackupData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      data: {
        medications: [],
        medicationLogs: [],
        appointments: [],
        patientInfo: {},
        careTeam: [],
        caregivers: [],
        settings: {},
      },
    };

    const keys = await AsyncStorage.getAllKeys();
    const items = await AsyncStorage.multiGet(keys);

    items.forEach(([key, value]) => {
      if (!value) return;
      try {
        const parsedValue = JSON.parse(value);
        switch (key) {
          case LEGACY_STORAGE_KEYS.medications:
            backup.data.medications = parsedValue;
            break;
          case LEGACY_STORAGE_KEYS.medicationLogs:
            backup.data.medicationLogs = parsedValue;
            break;
          case LEGACY_STORAGE_KEYS.appointments:
            backup.data.appointments = parsedValue;
            break;
          case LEGACY_STORAGE_KEYS.patientInfo:
          case LEGACY_STORAGE_KEYS.patientName:
            backup.data.patientInfo = { ...backup.data.patientInfo, [key]: parsedValue };
            break;
          case LEGACY_STORAGE_KEYS.careTeam:
            backup.data.careTeam = parsedValue;
            break;
          case LEGACY_STORAGE_KEYS.caregivers:
            backup.data.caregivers = parsedValue;
            break;
          default:
            if (key.startsWith(StorageKeyPrefixes.EMBERMATE_NS) || key.startsWith(StorageKeyPrefixes.EMBERMATE_PREFIX)) {
              backup.data.settings[key] = parsedValue;
            }
        }
      } catch (err) {
        // Skip unparseable values
      }
    });

    return backup;
  } catch (error) {
    logError('cloudBackup.createLegacyBackup', error);
    return null;
  }
}

/**
 * Restore data from a plain v1 BackupData object
 */
export async function restoreLegacyBackup(backup: BackupData): Promise<boolean> {
  try {
    if (!backup.version || !backup.data) {
      return false;
    }

    const storageOperations: Array<[string, string]> = [];

    if (backup.data.medications?.length) {
      storageOperations.push([
        LEGACY_STORAGE_KEYS.medications,
        JSON.stringify(backup.data.medications),
      ]);
    }

    if (backup.data.medicationLogs?.length) {
      storageOperations.push([
        LEGACY_STORAGE_KEYS.medicationLogs,
        JSON.stringify(backup.data.medicationLogs),
      ]);
    }

    if (backup.data.appointments?.length) {
      storageOperations.push([
        LEGACY_STORAGE_KEYS.appointments,
        JSON.stringify(backup.data.appointments),
      ]);
    }

    if (backup.data.patientInfo && Object.keys(backup.data.patientInfo).length > 0) {
      Object.entries(backup.data.patientInfo).forEach(([key, value]) => {
        storageOperations.push([key, JSON.stringify(value)]);
      });
    }

    if (backup.data.careTeam?.length) {
      storageOperations.push([
        LEGACY_STORAGE_KEYS.careTeam,
        JSON.stringify(backup.data.careTeam),
      ]);
    }

    if (backup.data.caregivers?.length) {
      storageOperations.push([
        LEGACY_STORAGE_KEYS.caregivers,
        JSON.stringify(backup.data.caregivers),
      ]);
    }

    if (backup.data.settings && Object.keys(backup.data.settings).length > 0) {
      Object.entries(backup.data.settings).forEach(([key, value]) => {
        storageOperations.push([key, JSON.stringify(value)]);
      });
    }

    if (storageOperations.length > 0) {
      await AsyncStorage.multiSet(storageOperations);
    }

    return true;
  } catch (error) {
    logError('cloudBackup.restoreLegacyBackup', error);
    return false;
  }
}

/**
 * Export backup data to a JSON file and share it
 */
export async function exportBackup(encrypt: boolean = false): Promise<boolean> {
  try {
    const backup = await createLegacyBackup();
    if (!backup) {
      throw new Error('Failed to create backup');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `EmberMate-Backup-${timestamp}.json`;
    const fileUri = `${FileSystem.documentDirectory}${filename}`;

    const backupData = JSON.stringify(backup, null, 2);

    await FileSystem.writeAsStringAsync(
      fileUri,
      backupData,
      { encoding: FileSystem.EncodingType.UTF8 }
    );

    await logAuditEvent(
      AuditEventType.DATA_BACKUP_CREATED,
      'Plain backup exported',
      AuditSeverity.INFO,
      { filename, encrypted: false }
    );

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Export EmberMate Backup',
        UTI: 'public.json',
      });
    } else {
      Alert.alert(
        'Backup Created',
        `Backup saved to:\n${fileUri}\n\nYou can find it in your device's file manager.`
      );
    }

    return true;
  } catch (error) {
    logError('cloudBackup.exportBackup', error);
    Alert.alert('Export Failed', 'Could not export backup data. Please try again.');
    return false;
  }
}

/**
 * Clear all app data (factory reset)
 */
export async function clearAllData(): Promise<boolean> {
  try {
    await AsyncStorage.clear();
    return true;
  } catch (error) {
    logError('cloudBackup.clearAllData', error);
    return false;
  }
}

/**
 * Check if a backup file string is encrypted
 */
export function isBackupEncrypted(fileContent: string): boolean {
  try {
    const parsed = JSON.parse(fileContent);

    // Encrypted format (has salt and hmac)
    if (parsed.salt && parsed.hmac && parsed.data) {
      return true;
    }

    // Old format with encrypted flag
    if (parsed.encrypted === true) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Get backup info from file content without decrypting
 */
export function getBackupPreview(fileContent: string): {
  encrypted: boolean;
  timestamp?: string;
  version?: string;
} | null {
  try {
    const parsed = JSON.parse(fileContent);

    // Encrypted format
    if (parsed.salt && parsed.hmac) {
      return {
        encrypted: true,
        timestamp: undefined,
        version: parsed.version,
      };
    }

    // Plain backup
    return {
      encrypted: parsed.encrypted || false,
      timestamp: parsed.timestamp,
      version: parsed.version,
    };
  } catch {
    return null;
  }
}

/**
 * Import and restore from a legacy encrypted backup file (dataBackup v1/v2 format).
 * Handles AES-256-CBC+PBKDF2 ("v2") and XOR+SHA ("v1") encryption.
 */
export async function importEncryptedBackup(
  fileContent: string,
  password: string
): Promise<boolean> {
  try {
    const payload = JSON.parse(fileContent);

    // Check if this is a v3 EncryptedBackup (cloudBackup format)
    if (payload.version === '3.0.0' && payload.algorithm) {
      return await restoreEncryptedBackup(payload as EncryptedBackup, password);
    }

    // dataBackup "v2" format: AES-256-CBC + PBKDF2
    if (payload.version === 'v2' && payload.salt && payload.iv && payload.hmac && payload.data) {
      const backup = await decryptDataBackupV2(payload, password);
      if (!backup) {
        Alert.alert('Restore Failed', 'Invalid password or corrupted backup file.');
        return false;
      }
      return await restoreLegacyBackup(backup);
    }

    // dataBackup "v1" format: XOR + 100-iteration SHA (no version field)
    if (payload.salt && payload.hmac && payload.data && !payload.version) {
      const backup = await decryptDataBackupV1(payload, password);
      if (!backup) {
        Alert.alert('Restore Failed', 'Invalid password or corrupted backup file.');
        return false;
      }
      return await restoreLegacyBackup(backup);
    }

    // cloudBackup v2 legacy format (XOR + 10k-iteration SHA)
    if (payload.version && payload.salt && payload.hmac && payload.data) {
      return await restoreEncryptedBackup(payload as EncryptedBackup, password);
    }

    Alert.alert('Restore Failed', 'Unrecognized backup format.');
    return false;
  } catch (error) {
    logError('cloudBackup.importEncryptedBackup', error);
    Alert.alert('Import Failed', 'Could not import the backup file. Please check the password and try again.');
    return false;
  }
}

/**
 * Decrypt dataBackup "v2" format (AES-256-CBC + PBKDF2 via CryptoJS, 100k iterations)
 */
async function decryptDataBackupV2(
  payload: { version: string; salt: string; iv: string; hmac: string; data: string },
  password: string
): Promise<BackupData | null> {
  try {
    const PBKDF2_ITERATIONS_V2 = 100_000;
    const PBKDF2_KEY_SIZE_V2 = 256 / 32;

    const salt = CryptoJS.enc.Hex.parse(payload.salt);
    const iv = CryptoJS.enc.Hex.parse(payload.iv);

    const derivedKey = CryptoJS.PBKDF2(password, salt, {
      keySize: PBKDF2_KEY_SIZE_V2 + (256 / 32),
      iterations: PBKDF2_ITERATIONS_V2,
      hasher: CryptoJS.algo.SHA256,
    });

    const encKey = CryptoJS.lib.WordArray.create(derivedKey.words.slice(0, 8));
    const macKey = CryptoJS.lib.WordArray.create(derivedKey.words.slice(8, 16));

    // Verify HMAC
    const calculatedHmac = CryptoJS.HmacSHA256(payload.data, macKey).toString();
    if (!constantTimeEqual(calculatedHmac, payload.hmac)) {
      return null;
    }

    const ciphertext = CryptoJS.enc.Hex.parse(payload.data);
    const cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext });
    const decrypted = CryptoJS.AES.decrypt(cipherParams, encKey, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
  } catch (error) {
    logError('cloudBackup.decryptDataBackupV2', error);
    return null;
  }
}

/**
 * Decrypt dataBackup "v1" format (XOR + 100-iteration SHA-256 KDF)
 */
async function decryptDataBackupV1(
  payload: { salt: string; hmac: string; data: string },
  password: string
): Promise<BackupData | null> {
  try {
    const passwordSuffix = password.substring(0, 8);
    let hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      password + payload.salt
    );
    for (let i = 0; i < 100; i++) {
      hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        hash + passwordSuffix
      );
    }

    const keyBytes = new Uint8Array(hash.length / 2);
    for (let i = 0; i < hash.length; i += 2) {
      keyBytes[i / 2] = parseInt(hash.substr(i, 2), 16);
    }

    const encrypted = new Uint8Array(
      atob(payload.data).split('').map(c => c.charCodeAt(0))
    );
    const decrypted = new Uint8Array(encrypted.length);
    for (let i = 0; i < encrypted.length; i++) {
      decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length];
    }

    const decryptedString = new TextDecoder().decode(decrypted);
    return JSON.parse(decryptedString);
  } catch (error) {
    logError('cloudBackup.decryptDataBackupV1', error);
    return null;
  }
}

/**
 * Get backup statistics from current data
 */
export async function getBackupStats(): Promise<{
  medications: number;
  appointments: number;
  logs: number;
  lastBackup?: string;
} | null> {
  try {
    const backup = await createLegacyBackup();
    if (!backup) return null;

    return {
      medications: backup.data.medications?.length || 0,
      appointments: backup.data.appointments?.length || 0,
      logs: backup.data.medicationLogs?.length || 0,
      lastBackup: backup.timestamp,
    };
  } catch (error) {
    logError('cloudBackup.getBackupStats', error);
    return null;
  }
}
