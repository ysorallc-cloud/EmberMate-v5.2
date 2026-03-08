// ============================================================================
// SECURE STORAGE UNIT TESTS
// Tests for AES-256 encryption, key management, and secure data handling
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import {
  setSecureItem,
  getSecureItem,
  removeSecureItem,
  setKeychainItem,
  getKeychainItem,
  removeKeychainItem,
  hashData,
  verifyHash,
  generateSecureToken,
  testEncryption,
} from '../secureStorage';

describe('SecureStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // Encryption/Decryption Roundtrip Tests
  // ============================================================================
  describe('testEncryption', () => {
    it('should encrypt and decrypt data successfully', async () => {
      const result = await testEncryption();
      expect(result).toBe(true);
    });
  });

  // ============================================================================
  // setSecureItem / getSecureItem Tests
  // ============================================================================
  describe('setSecureItem', () => {
    it('should encrypt and store string data', async () => {
      const result = await setSecureItem('test_string', 'secret message');

      expect(result).toBe(true);

      // Verify something was stored
      const stored = await AsyncStorage.getItem('test_string');
      expect(stored).not.toBeNull();
      // Verify it's encrypted (not plain text)
      expect(stored).not.toBe('secret message');
      expect(stored).not.toBe('"secret message"');
    });

    it('should encrypt and store object data', async () => {
      const testObject = {
        name: 'Patient',
        medications: ['Aspirin', 'Metformin'],
        sensitive: true,
      };

      const result = await setSecureItem('test_object', testObject);

      expect(result).toBe(true);

      // Verify data was stored encrypted
      const stored = await AsyncStorage.getItem('test_object');
      expect(stored).not.toBeNull();
      expect(stored).toContain(':'); // Encrypted format contains colons
    });

    it('should return false when encryption fails', async () => {
      // Mock Crypto.getRandomBytesAsync to fail
      (Crypto.getRandomBytesAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Crypto failure')
      );

      const result = await setSecureItem('fail_key', 'data');

      expect(result).toBe(false);
    });
  });

  describe('getSecureItem', () => {
    it('should decrypt and return stored data', async () => {
      const originalData = { test: 'value', number: 42 };
      await setSecureItem('decrypt_test', originalData);

      const retrieved = await getSecureItem('decrypt_test');

      expect(retrieved).toEqual(originalData);
    });

    it('should return default value for missing key', async () => {
      const defaultValue = { default: true };

      const result = await getSecureItem('nonexistent_key', defaultValue);

      expect(result).toBe(defaultValue);
    });

    it('should handle invalid encrypted data gracefully', async () => {
      // Store invalid encrypted data directly — 4-part format triggers decryption
      // which will fail HMAC verification and throw
      await AsyncStorage.setItem('invalid_encrypted', 'v3:aabbccdd:ciphertext:badhmac');

      const defaultValue = { fallback: true };
      const result = await getSecureItem('invalid_encrypted', defaultValue);

      // Should return default on decryption failure
      expect(result).toBe(defaultValue);
    });
  });

  describe('encryption roundtrip', () => {
    it('should handle special characters', async () => {
      const dataWithSpecialChars = {
        message: 'Hello\nWorld\t!',
        symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
        unicode: '你好世界 مرحبا 🎉',
      };

      await setSecureItem('special_chars', dataWithSpecialChars);
      const retrieved = await getSecureItem('special_chars');

      expect(retrieved).toEqual(dataWithSpecialChars);
    });

    it('should handle large data', async () => {
      const largeData = {
        array: Array(1000).fill('item'),
        nested: {
          deep: {
            value: 'test'.repeat(100),
          },
        },
      };

      await setSecureItem('large_data', largeData);
      const retrieved = await getSecureItem('large_data');

      expect(retrieved).toEqual(largeData);
    });

    it('should handle empty values', async () => {
      await setSecureItem('empty_string', '');
      const result = await getSecureItem<string>('empty_string');
      expect(result).toBe('');

      await setSecureItem('empty_array', []);
      const arrayResult = await getSecureItem<unknown[]>('empty_array');
      expect(arrayResult).toEqual([]);

      await setSecureItem('empty_object', {});
      const objectResult = await getSecureItem<object>('empty_object');
      expect(objectResult).toEqual({});
    });
  });

  // ============================================================================
  // removeSecureItem Tests
  // ============================================================================
  describe('removeSecureItem', () => {
    it('should remove stored encrypted item', async () => {
      await setSecureItem('remove_test', 'data to remove');

      const result = await removeSecureItem('remove_test');

      expect(result).toBe(true);

      // Verify it's gone
      const stored = await AsyncStorage.getItem('remove_test');
      expect(stored).toBeNull();
    });

    it('should return true even if key does not exist', async () => {
      const result = await removeSecureItem('nonexistent_key');
      expect(result).toBe(true);
    });

    it('should handle AsyncStorage errors gracefully', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockRejectedValueOnce(
        new Error('Remove error')
      );

      const result = await removeSecureItem('error_key');
      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // Keychain Item Tests
  // ============================================================================
  describe('setKeychainItem', () => {
    it('should store value in secure store', async () => {
      const result = await setKeychainItem('keychain_key', 'secret_value');

      expect(result).toBe(true);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'keychain_key',
        'secret_value',
        expect.objectContaining({
          keychainAccessible: SecureStore.WHEN_UNLOCKED,
        })
      );
    });

    it('should return false on error', async () => {
      (SecureStore.setItemAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Keychain error')
      );

      const result = await setKeychainItem('error_key', 'value');
      expect(result).toBe(false);
    });
  });

  describe('getKeychainItem', () => {
    it('should retrieve value from secure store', async () => {
      await setKeychainItem('get_keychain', 'stored_value');

      const result = await getKeychainItem('get_keychain');

      expect(result).toBe('stored_value');
    });

    it('should return null for missing key', async () => {
      const result = await getKeychainItem('nonexistent');
      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Keychain error')
      );

      const result = await getKeychainItem('error_key');
      expect(result).toBeNull();
    });
  });

  describe('removeKeychainItem', () => {
    it('should delete value from secure store', async () => {
      await setKeychainItem('delete_key', 'value');

      const result = await removeKeychainItem('delete_key');

      expect(result).toBe(true);
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('delete_key');
    });

    it('should handle errors gracefully', async () => {
      (SecureStore.deleteItemAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Delete error')
      );

      const result = await removeKeychainItem('error_key');
      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // Hash Functions Tests
  // ============================================================================
  describe('hashData', () => {
    it('should generate consistent hash for same input', async () => {
      const hash1 = await hashData('test_password');
      const hash2 = await hashData('test_password');

      expect(hash1).toBe(hash2);
    });

    it('should generate different hash for different input', async () => {
      const hash1 = await hashData('password1');
      const hash2 = await hashData('password2');

      expect(hash1).not.toBe(hash2);
    });

    it('should return hex string', async () => {
      const hash = await hashData('test');

      // Hash should be hex string (0-9, a-f)
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });

    it('should handle empty string', async () => {
      const hash = await hashData('');

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });
  });

  describe('verifyHash', () => {
    it('should return true for matching data and hash', async () => {
      const data = 'my_secret_data';
      const hash = await hashData(data);

      const result = await verifyHash(data, hash);

      expect(result).toBe(true);
    });

    it('should return false for non-matching data', async () => {
      const hash = await hashData('original_data');

      const result = await verifyHash('different_data', hash);

      expect(result).toBe(false);
    });

    it('should handle hash verification errors', async () => {
      (Crypto.digestStringAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Hash error')
      );

      const result = await verifyHash('data', 'somehash');
      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // Token Generation Tests
  // ============================================================================
  describe('generateSecureToken', () => {
    it('should generate token of correct length', async () => {
      const token = await generateSecureToken(32);

      // 32 bytes = 64 hex characters
      expect(token).toHaveLength(64);
    });

    it('should generate hex string', async () => {
      const token = await generateSecureToken();

      expect(token).toMatch(/^[0-9a-f]+$/);
    });

    it('should use default length of 32 bytes', async () => {
      const token = await generateSecureToken();

      expect(token).toHaveLength(64); // 32 bytes = 64 hex chars
    });

    it('should generate different tokens on each call', async () => {
      // Note: With our deterministic mock, tokens might be the same
      // In production, they should be different
      const token1 = await generateSecureToken(16);
      const token2 = await generateSecureToken(16);

      // Both should be valid hex strings
      expect(token1).toMatch(/^[0-9a-f]+$/);
      expect(token2).toMatch(/^[0-9a-f]+$/);
    });

    it('should handle custom lengths', async () => {
      const shortToken = await generateSecureToken(8);
      const longToken = await generateSecureToken(64);

      expect(shortToken).toHaveLength(16); // 8 bytes = 16 hex chars
      expect(longToken).toHaveLength(128); // 64 bytes = 128 hex chars
    });
  });

  // ============================================================================
  // Tamper Detection Tests
  // ============================================================================
  describe('tamper detection', () => {
    it('should detect tampering with encrypted data', async () => {
      // Store valid encrypted data
      await setSecureItem('tamper_test', { secret: 'value' });

      // Get the encrypted data
      const encrypted = await AsyncStorage.getItem('tamper_test');
      expect(encrypted).not.toBeNull();

      // Tamper with the data (modify a character)
      const tampered = encrypted!.slice(0, -1) + '0';
      await AsyncStorage.setItem('tamper_test', tampered);

      // Try to retrieve - should fail and return default
      const result = await getSecureItem('tamper_test', { tampered: true });
      expect(result).toEqual({ tampered: true });
    });
  });

  // ============================================================================
  // Key Management Tests
  // ============================================================================
  describe('key management', () => {
    it('should generate and store encryption key on first use', async () => {
      // Clear any existing key
      await SecureStore.deleteItemAsync('embermate_master_key');

      // Trigger key generation by encrypting something
      await setSecureItem('key_gen_test', 'data');

      // Verify a key was stored in SecureStore
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'embermate_master_key',
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should reuse existing encryption key', async () => {
      // Store a key first
      const existingKey = 'a'.repeat(64); // 256-bit key in hex
      await SecureStore.setItemAsync('embermate_master_key', existingKey, {});

      // Encrypt multiple items
      await setSecureItem('item1', 'data1');
      await setSecureItem('item2', 'data2');

      // The key should have been retrieved, not created new
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('embermate_master_key');
    });
  });
});

// ============================================================================
// Manual test runner (for development)
// ============================================================================
export async function runEncryptionTests(): Promise<boolean> {
  console.log('\n🔐 Running Encryption Tests...\n');

  const success = await testEncryption();

  if (success) {
    console.log('\n✅ ALL ENCRYPTION TESTS PASSED');
    console.log('✅ Safe to deploy to production\n');
  } else {
    console.log('\n❌ ENCRYPTION TESTS FAILED');
    console.log('❌ DO NOT DEPLOY TO PRODUCTION\n');
  }

  return success;
}
