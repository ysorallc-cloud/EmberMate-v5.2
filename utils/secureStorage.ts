// ============================================================================
// SECURE STORAGE UTILITIES
// Production-grade AES-256-CTR + HMAC-SHA256 (Encrypt-then-MAC) encrypted storage for sensitive health data
// ============================================================================

import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';
import { devLog, logError } from './devLog';

/**
 * Encryption key management
 * Uses device keychain/keystore for secure key storage
 */
const ENCRYPTION_KEY_ALIAS = 'embermate_master_key';
const ENCRYPTION_VERSION = 'v3'; // v3: separate enc/mac keys, constant-time HMAC

/**
 * Constant-time string comparison to prevent timing attacks on HMAC verification.
 * Always compares all characters regardless of where differences occur.
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
 * Generate or retrieve encryption key from secure keychain
 * Uses 256-bit key for AES-256 encryption
 */
async function getOrCreateEncryptionKey(): Promise<string> {
  try {
    // Try to get existing key from secure keychain
    let key = await SecureStore.getItemAsync(ENCRYPTION_KEY_ALIAS);

    if (!key) {
      // Generate new cryptographically secure 256-bit key
      const randomBytes = await Crypto.getRandomBytesAsync(32);
      key = Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Store in secure device keychain (not accessible to other apps)
      await SecureStore.setItemAsync(ENCRYPTION_KEY_ALIAS, key, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED,
      });
    }

    return key;
  } catch (error) {
    logError('secureStorage.getOrCreateEncryptionKey', error);
    throw new Error('Failed to initialize encryption');
  }
}

/**
 * Encrypt data using AES-256-CTR with HMAC-SHA256 (Encrypt-then-MAC)
 * Separate keys derived for encryption and authentication.
 *
 * @param data - Plain text data to encrypt
 * @returns Encrypted data in format: version:iv:ciphertext:tag
 */
async function encryptData(data: string): Promise<string> {
  try {
    const key = await getOrCreateEncryptionKey();

    // Generate cryptographically random 128-bit IV (16 bytes)
    const ivBytes = await Crypto.getRandomBytesAsync(16);
    const iv = CryptoJS.lib.WordArray.create(ivBytes);

    // Derive separate keys for encryption and authentication
    const masterKey = CryptoJS.enc.Hex.parse(key);
    const encKey = CryptoJS.HmacSHA256('enc', masterKey);
    const macKey = CryptoJS.HmacSHA256('mac', masterKey);

    // Encrypt using AES-256-CTR
    const encrypted = CryptoJS.AES.encrypt(data, encKey, {
      iv: iv,
      mode: CryptoJS.mode.CTR,
      padding: CryptoJS.pad.NoPadding,
    });

    // Create HMAC-SHA256 authentication tag (Encrypt-then-MAC)
    const hmac = CryptoJS.HmacSHA256(encrypted.ciphertext.toString(), macKey);

    // Format: version:iv:ciphertext:tag
    return `${ENCRYPTION_VERSION}:${iv.toString()}:${encrypted.ciphertext.toString()}:${hmac.toString()}`;
  } catch (error) {
    logError('secureStorage.encryptData', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt AES-256-CTR + HMAC-SHA256 encrypted data
 * Verifies authentication tag before decrypting (constant-time comparison)
 *
 * @param encryptedData - Encrypted data in format: version:iv:ciphertext:tag
 * @returns Decrypted plain text
 */
async function decryptData(encryptedData: string): Promise<string> {
  try {
    const key = await getOrCreateEncryptionKey();
    const masterKey = CryptoJS.enc.Hex.parse(key);

    // Parse encrypted data format
    const parts = encryptedData.split(':');

    if (parts.length === 2) {
      // Legacy XOR format (version:data) - migrate to new format
      return await migrateLegacyEncryption(encryptedData);
    }

    if (parts.length !== 4) {
      // Data is not in any recognized encrypted format — likely plain text
      // stored before encryption was enabled. Return as-is.
      return encryptedData;
    }

    const [version, ivHex, ciphertextHex, tagHex] = parts;

    // Derive keys based on encryption version
    let encKey: CryptoJS.lib.WordArray;
    let macKey: CryptoJS.lib.WordArray;

    if (version === 'v3') {
      // v3: separate derived keys for encryption and authentication
      encKey = CryptoJS.HmacSHA256('enc', masterKey);
      macKey = CryptoJS.HmacSHA256('mac', masterKey);
    } else {
      // v2 legacy: same master key for both (backward compatible)
      encKey = masterKey;
      macKey = masterKey;
    }

    // Verify authentication tag (constant-time comparison prevents timing attacks)
    const expectedTag = CryptoJS.HmacSHA256(ciphertextHex, macKey).toString();
    if (!constantTimeEqual(expectedTag, tagHex)) {
      throw new Error('Authentication failed - data may have been tampered with');
    }

    // Decrypt using AES-256-CTR
    const iv = CryptoJS.enc.Hex.parse(ivHex);
    const ciphertextWordArray = CryptoJS.enc.Hex.parse(ciphertextHex);
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: ciphertextWordArray } as any,
      encKey,
      {
        iv: iv,
        mode: CryptoJS.mode.CTR,
        padding: CryptoJS.pad.NoPadding,
      }
    );

    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    // Log as warning, not error — this is expected on fresh installs or format mismatches
    devLog('[secureStorage.decryptData] Decrypt failed:', error instanceof Error ? error.message : error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Migrate legacy XOR-encrypted data to AES-256-CTR + HMAC
 * Ensures backward compatibility with existing user data
 */
async function migrateLegacyEncryption(legacyData: string): Promise<string> {
  try {
    devLog('Migrating legacy encryption to AES-256-CTR+HMAC...');
    const key = await getOrCreateEncryptionKey();

    // Split legacy format (iv:encrypted)
    const [ivHex, encrypted] = legacyData.split(':');

    if (!encrypted) {
      throw new Error('Invalid legacy encrypted data format');
    }

    // Decrypt using legacy XOR method
    const decrypted = xorDecrypt(encrypted, key);

    // Note: Data will be re-encrypted with AES-256 on next write
    return decrypted;
  } catch (error) {
    logError('secureStorage.migrateLegacyEncryption', error);
    throw error;
  }
}

/**
 * Legacy XOR decryption (for backward compatibility only)
 * DO NOT USE FOR NEW ENCRYPTION
 * Uses Uint8Array instead of Buffer (Buffer is not available in React Native)
 */
function xorDecrypt(encrypted: string, key: string): string {
  const encoded = new Uint8Array(
    atob(encrypted).split('').map(c => c.charCodeAt(0))
  );
  const keyBytes = new Uint8Array(
    (key.match(/.{2}/g) || []).map(byte => parseInt(byte, 16))
  );
  const result = new Uint8Array(encoded.length);

  for (let i = 0; i < encoded.length; i++) {
    result[i] = encoded[i] ^ keyBytes[i % keyBytes.length];
  }

  return new TextDecoder().decode(result);
}

/**
 * Store encrypted data in AsyncStorage
 * Uses AES-256-CTR + HMAC-SHA256 encryption with authentication
 *
 * @param key - Storage key
 * @param value - Data to encrypt and store (any JSON-serializable type)
 * @returns Success status
 */
export async function setSecureItem(key: string, value: any): Promise<boolean> {
  try {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    const encrypted = await encryptData(stringValue);
    await AsyncStorage.setItem(key, encrypted);
    return true;
  } catch (error) {
    logError('secureStorage.setSecureItem', error);
    return false;
  }
}

/**
 * Retrieve and decrypt data from AsyncStorage
 * Automatically verifies data authenticity before decryption
 *
 * @param key - Storage key
 * @param defaultValue - Default value if key doesn't exist
 * @returns Decrypted data
 */
export async function getSecureItem<T = any>(key: string, defaultValue?: T): Promise<T> {
  try {
    const encrypted = await AsyncStorage.getItem(key);

    if (!encrypted) {
      return defaultValue as T;
    }

    const decrypted = await decryptData(encrypted);

    try {
      return JSON.parse(decrypted) as T;
    } catch {
      // If not JSON, return as string
      return decrypted as T;
    }
  } catch (error) {
    // Expected on fresh installs or when encryption key changes — not a real error
    devLog('[secureStorage.getSecureItem] Decrypt failed for key, returning default:', key);
    return defaultValue as T;
  }
}

/**
 * Remove encrypted item from AsyncStorage
 */
export async function removeSecureItem(key: string): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    logError('secureStorage.removeSecureItem', error);
    return false;
  }
}

/**
 * Store in device keychain (most secure)
 * Use for passwords, PINs, authentication tokens
 * Hardware-backed encryption on supported devices
 *
 * @param key - Keychain identifier
 * @param value - Sensitive string to store
 */
export async function setKeychainItem(key: string, value: string): Promise<boolean> {
  try {
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED,
    });
    return true;
  } catch (error) {
    logError('secureStorage.setKeychainItem', error);
    return false;
  }
}

/**
 * Retrieve from device keychain
 */
export async function getKeychainItem(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    logError('secureStorage.getKeychainItem', error);
    return null;
  }
}

/**
 * Remove from device keychain
 */
export async function removeKeychainItem(key: string): Promise<boolean> {
  try {
    await SecureStore.deleteItemAsync(key);
    return true;
  } catch (error) {
    logError('secureStorage.removeKeychainItem', error);
    return false;
  }
}

/**
 * Hash sensitive data using SHA-256 (one-way)
 * Use for password verification, data integrity checks
 */
export async function hashData(data: string): Promise<string> {
  try {
    const digest = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      data
    );
    return digest;
  } catch (error) {
    logError('secureStorage.hashData', error);
    throw error;
  }
}

/**
 * Verify hashed data matches original
 */
export async function verifyHash(data: string, hash: string): Promise<boolean> {
  try {
    const newHash = await hashData(data);
    return newHash === hash;
  } catch (error) {
    logError('secureStorage.verifyHash', error);
    return false;
  }
}

/**
 * Generate cryptographically secure random token
 * Uses device's secure random number generator
 *
 * @param length - Number of random bytes (default: 32 for 256-bit)
 * @returns Hexadecimal token string
 */
export async function generateSecureToken(length: number = 32): Promise<string> {
  try {
    const bytes = await Crypto.getRandomBytesAsync(length);
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } catch (error) {
    logError('secureStorage.generateSecureToken', error);
    throw error;
  }
}

/**
 * Test encryption/decryption functionality
 * Use for verification before production deployment
 */
export async function testEncryption(): Promise<boolean> {
  try {
    const testData = {
      message: 'EmberMate Health Data Test',
      timestamp: new Date().toISOString(),
      sensitiveInfo: 'Patient medication: Metformin 500mg',
    };

    // Test encryption
    const encrypted = await encryptData(JSON.stringify(testData));
    devLog('Encryption successful');

    // Test decryption
    const decrypted = await decryptData(encrypted);
    const parsed = JSON.parse(decrypted);

    // Verify data integrity
    if (parsed.message !== testData.message ||
        parsed.sensitiveInfo !== testData.sensitiveInfo) {
      throw new Error('Decrypted data does not match original');
    }

    devLog('Decryption and integrity verified');

    // Test tamper detection
    try {
      const tamperedData = encrypted.replace(/.$/, '0'); // Modify last character
      await decryptData(tamperedData);
      logError('secureStorage.testEncryption', 'Tamper detection FAILED - this should have thrown an error');
      return false;
    } catch (error) {
      devLog('Tamper detection successful');
    }

    return true;
  } catch (error) {
    logError('secureStorage.testEncryption', error);
    return false;
  }
}
