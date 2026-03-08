// ============================================================================
// SAFE STORAGE UNIT TESTS
// Tests for JSON parsing, corruption recovery, and data validation utilities
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  safeJSONParse,
  safeJSONStringify,
  safeGetItem,
  safeSetItem,
  recoverFromBackup,
  validateStructure,
  safeGetItemWithValidation,
  clearCorruptedData,
  diagnosePotentialCorruption,
} from '../safeStorage';

describe('SafeStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // safeJSONParse Tests
  // ============================================================================
  describe('safeJSONParse', () => {
    it('should parse valid JSON string', () => {
      const validJson = '{"name":"test","value":42}';
      const result = safeJSONParse(validJson, {});

      expect(result).toEqual({ name: 'test', value: 42 });
    });

    it('should return default value for null input', () => {
      const defaultValue = { default: true };
      const result = safeJSONParse(null, defaultValue);

      expect(result).toBe(defaultValue);
    });

    it('should return default value for empty string', () => {
      const defaultValue: string[] = [];
      const result = safeJSONParse('', defaultValue);

      expect(result).toBe(defaultValue);
    });

    it('should return default value for invalid JSON', () => {
      const invalidJson = '{invalid json}';
      const defaultValue = { fallback: true };
      const result = safeJSONParse(invalidJson, defaultValue, 'test_key');

      expect(result).toBe(defaultValue);
    });

    it('should parse arrays correctly', () => {
      const arrayJson = '[1,2,3,"four"]';
      const result = safeJSONParse(arrayJson, []);

      expect(result).toEqual([1, 2, 3, 'four']);
    });

    it('should parse nested objects correctly', () => {
      const nestedJson = '{"level1":{"level2":{"value":"deep"}}}';
      const result = safeJSONParse(nestedJson, {});

      expect(result).toEqual({ level1: { level2: { value: 'deep' } } });
    });

    it('should handle special characters in JSON strings', () => {
      const jsonWithSpecialChars = '{"message":"Hello\\nWorld\\t!"}';
      const result = safeJSONParse(jsonWithSpecialChars, {});

      expect(result).toEqual({ message: 'Hello\nWorld\t!' });
    });
  });

  // ============================================================================
  // safeJSONStringify Tests
  // ============================================================================
  describe('safeJSONStringify', () => {
    it('should stringify objects correctly', () => {
      const obj = { name: 'test', value: 42 };
      const result = safeJSONStringify(obj);

      expect(result).toBe('{"name":"test","value":42}');
    });

    it('should stringify arrays correctly', () => {
      const arr = [1, 2, 3, 'four'];
      const result = safeJSONStringify(arr);

      expect(result).toBe('[1,2,3,"four"]');
    });

    it('should return null for circular references', () => {
      const circularObj: any = { name: 'circular' };
      circularObj.self = circularObj;

      const result = safeJSONStringify(circularObj, 'test_key');

      expect(result).toBeNull();
    });

    it('should handle Date objects', () => {
      const dateObj = { date: new Date('2025-01-01T00:00:00.000Z') };
      const result = safeJSONStringify(dateObj);

      expect(result).toContain('2025-01-01');
    });

    it('should handle null values', () => {
      const result = safeJSONStringify(null);
      expect(result).toBe('null');
    });
  });

  // ============================================================================
  // safeGetItem Tests
  // ============================================================================
  describe('safeGetItem', () => {
    it('should retrieve and parse stored JSON data', async () => {
      const testData = { medications: ['med1', 'med2'] };
      await AsyncStorage.setItem('test_key', JSON.stringify(testData));

      const result = await safeGetItem('test_key', []);

      expect(result).toEqual(testData);
    });

    it('should return default value for missing key', async () => {
      const defaultValue = { default: true };
      const result = await safeGetItem('nonexistent_key', defaultValue);

      expect(result).toBe(defaultValue);
    });

    it('should return default value for corrupted data', async () => {
      await AsyncStorage.setItem('corrupted_key', 'not valid json {{{');

      const defaultValue: string[] = [];
      const result = await safeGetItem('corrupted_key', defaultValue);

      expect(result).toBe(defaultValue);
    });

    it('should handle AsyncStorage errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(
        new Error('Storage error')
      );

      const defaultValue = { fallback: true };
      const result = await safeGetItem('error_key', defaultValue);

      expect(result).toBe(defaultValue);
    });
  });

  // ============================================================================
  // safeSetItem Tests
  // ============================================================================
  describe('safeSetItem', () => {
    it('should store JSON data and return true', async () => {
      const testData = { name: 'test', items: [1, 2, 3] };

      const result = await safeSetItem('test_key', testData);

      expect(result).toBe(true);

      // Verify data was stored
      const stored = await AsyncStorage.getItem('test_key');
      expect(JSON.parse(stored!)).toEqual(testData);
    });

    it('should not create backup on every write (performance optimization)', async () => {
      const originalData = { original: true };
      await AsyncStorage.setItem('backup_test', JSON.stringify(originalData));

      const newData = { new: true };
      await safeSetItem('backup_test', newData);

      // Backup-on-write was removed to reduce I/O overhead
      // Backups are handled by cloudBackup system on explicit user action
      const backup = await AsyncStorage.getItem('backup_test_backup');
      expect(backup).toBeNull();
    });

    it('should return false for unstringifiable data', async () => {
      const circularObj: any = { name: 'circular' };
      circularObj.self = circularObj;

      const result = await safeSetItem('circular_test', circularObj);

      expect(result).toBe(false);
    });

    it('should handle AsyncStorage errors gracefully', async () => {
      // Save original implementation
      const originalSetItem = AsyncStorage.setItem;
      (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(
        new Error('Storage error')
      );

      const result = await safeSetItem('error_test', { data: 'test' });

      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // recoverFromBackup Tests
  // ============================================================================
  describe('recoverFromBackup', () => {
    it('should recover data from backup when available', async () => {
      const backupData = { recovered: true, items: [1, 2, 3] };
      await AsyncStorage.setItem('test_key_backup', JSON.stringify(backupData));

      const result = await recoverFromBackup('test_key', { default: true });

      expect(result).toEqual(backupData);
    });

    it('should restore backup as main value after successful recovery', async () => {
      const backupData = { restored: true };
      await AsyncStorage.setItem('restore_key_backup', JSON.stringify(backupData));

      await recoverFromBackup('restore_key', {});

      // Check main key now has the backup data
      const mainData = await AsyncStorage.getItem('restore_key');
      expect(JSON.parse(mainData!)).toEqual(backupData);
    });

    it('should return default value when no backup exists', async () => {
      const defaultValue = { noBackup: true };
      const result = await recoverFromBackup('no_backup_key', defaultValue);

      expect(result).toBe(defaultValue);
    });

    it('should return default value for corrupted backup', async () => {
      await AsyncStorage.setItem('corrupted_backup_backup', 'not valid json');

      const defaultValue = { fallback: true };
      const result = await recoverFromBackup('corrupted_backup', defaultValue);

      expect(result).toBe(defaultValue);
    });

    it('should handle AsyncStorage errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(
        new Error('Storage error')
      );

      const defaultValue = { error: false };
      const result = await recoverFromBackup('error_key', defaultValue);

      expect(result).toBe(defaultValue);
    });
  });

  // ============================================================================
  // validateStructure Tests
  // ============================================================================
  describe('validateStructure', () => {
    interface TestType {
      id: string;
      name: string;
      value?: number;
    }

    it('should return true for valid structure with all required keys', () => {
      const data = { id: '123', name: 'test', value: 42 };
      const requiredKeys: (keyof TestType)[] = ['id', 'name'];

      const result = validateStructure<TestType>(data, requiredKeys);

      expect(result).toBe(true);
    });

    it('should return false when required keys are missing', () => {
      const data = { id: '123' }; // missing 'name'
      const requiredKeys: (keyof TestType)[] = ['id', 'name'];

      const result = validateStructure<TestType>(data, requiredKeys);

      expect(result).toBe(false);
    });

    it('should return false for null data', () => {
      const requiredKeys: (keyof TestType)[] = ['id', 'name'];

      const result = validateStructure<TestType>(null, requiredKeys);

      expect(result).toBe(false);
    });

    it('should return false for non-object data', () => {
      const requiredKeys: (keyof TestType)[] = ['id', 'name'];

      expect(validateStructure<TestType>('string', requiredKeys)).toBe(false);
      expect(validateStructure<TestType>(123, requiredKeys)).toBe(false);
      expect(validateStructure<TestType>([], requiredKeys)).toBe(false);
    });

    it('should return true for empty required keys array', () => {
      const data = {};
      const requiredKeys: (keyof TestType)[] = [];

      const result = validateStructure<TestType>(data, requiredKeys);

      expect(result).toBe(true);
    });
  });

  // ============================================================================
  // safeGetItemWithValidation Tests
  // ============================================================================
  describe('safeGetItemWithValidation', () => {
    interface Medication {
      id: string;
      name: string;
      dosage: string;
    }

    const defaultMed: Medication = { id: '', name: '', dosage: '' };
    const requiredKeys: (keyof Medication)[] = ['id', 'name', 'dosage'];

    it('should return data when valid structure is found', async () => {
      const validData: Medication = { id: '1', name: 'Aspirin', dosage: '100mg' };
      await AsyncStorage.setItem('valid_med', JSON.stringify(validData));

      const result = await safeGetItemWithValidation('valid_med', defaultMed, requiredKeys);

      expect(result).toEqual(validData);
    });

    it('should try backup when main data is invalid', async () => {
      // Main data missing required key
      await AsyncStorage.setItem('invalid_med', JSON.stringify({ id: '1' }));
      // Backup has valid data
      const backupData: Medication = { id: '2', name: 'Tylenol', dosage: '500mg' };
      await AsyncStorage.setItem('invalid_med_backup', JSON.stringify(backupData));

      const result = await safeGetItemWithValidation('invalid_med', defaultMed, requiredKeys);

      expect(result).toEqual(backupData);
    });

    it('should return default when both main and backup are invalid', async () => {
      await AsyncStorage.setItem('all_invalid', JSON.stringify({ bad: true }));
      await AsyncStorage.setItem('all_invalid_backup', JSON.stringify({ alsoBad: true }));

      const result = await safeGetItemWithValidation('all_invalid', defaultMed, requiredKeys);

      expect(result).toBe(defaultMed);
    });

    it('should return default when key does not exist', async () => {
      const result = await safeGetItemWithValidation('nonexistent', defaultMed, requiredKeys);

      expect(result).toBe(defaultMed);
    });
  });

  // ============================================================================
  // clearCorruptedData Tests
  // ============================================================================
  describe('clearCorruptedData', () => {
    it('should remove both main key and backup', async () => {
      await AsyncStorage.setItem('clear_key', JSON.stringify({ data: true }));
      await AsyncStorage.setItem('clear_key_backup', JSON.stringify({ backup: true }));

      await clearCorruptedData('clear_key');

      const main = await AsyncStorage.getItem('clear_key');
      const backup = await AsyncStorage.getItem('clear_key_backup');

      expect(main).toBeNull();
      expect(backup).toBeNull();
    });

    it('should not throw if keys do not exist', async () => {
      await expect(clearCorruptedData('nonexistent_key')).resolves.not.toThrow();
    });

    it('should handle AsyncStorage errors gracefully', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockRejectedValueOnce(
        new Error('Remove error')
      );

      await expect(clearCorruptedData('error_key')).resolves.not.toThrow();
    });
  });

  // ============================================================================
  // diagnosePotentialCorruption Tests
  // ============================================================================
  describe('diagnosePotentialCorruption', () => {
    it('should categorize healthy JSON data correctly', async () => {
      await AsyncStorage.setItem('healthy1', JSON.stringify({ valid: true }));
      await AsyncStorage.setItem('healthy2', JSON.stringify([1, 2, 3]));

      const result = await diagnosePotentialCorruption();

      expect(result.healthy).toContain('healthy1');
      expect(result.healthy).toContain('healthy2');
      expect(result.corrupted).toHaveLength(0);
    });

    it('should categorize corrupted data correctly', async () => {
      await AsyncStorage.setItem('corrupted1', 'not json {{{');
      await AsyncStorage.setItem('corrupted2', 'also broken }}');
      await AsyncStorage.setItem('valid', JSON.stringify({ ok: true }));

      const result = await diagnosePotentialCorruption();

      expect(result.corrupted).toContain('corrupted1');
      expect(result.corrupted).toContain('corrupted2');
      expect(result.healthy).toContain('valid');
    });

    it('should skip backup keys in diagnostic', async () => {
      await AsyncStorage.setItem('main_key', JSON.stringify({ main: true }));
      await AsyncStorage.setItem('main_key_backup', JSON.stringify({ backup: true }));

      const result = await diagnosePotentialCorruption();

      expect(result.healthy).toContain('main_key');
      expect(result.healthy).not.toContain('main_key_backup');
    });

    it('should handle missing/empty values', async () => {
      await AsyncStorage.setItem('empty_key', '');

      const result = await diagnosePotentialCorruption();

      expect(result.missing).toContain('empty_key');
    });

    it('should handle getAllKeys errors gracefully', async () => {
      (AsyncStorage.getAllKeys as jest.Mock).mockRejectedValueOnce(
        new Error('Keys error')
      );

      const result = await diagnosePotentialCorruption();

      expect(result.healthy).toHaveLength(0);
      expect(result.corrupted).toHaveLength(0);
      expect(result.missing).toHaveLength(0);
    });
  });
});
