// ============================================================================
// VITAL THRESHOLDS — UNIT TESTS
// Tests for getVitalStatus, generateVitalAlert, custom threshold loading
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  VITAL_THRESHOLDS,
  VitalType,
  getVitalStatus,
  generateVitalAlert,
  loadCustomThresholds,
  invalidateThresholdCache,
} from '../vitalThresholds';

const CUSTOM_THRESHOLDS_KEY = '@embermate_custom_vital_thresholds';

describe('vitalThresholds — unit tests', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    invalidateThresholdCache();
  });

  // ==========================================================================
  // VITAL_THRESHOLDS defaults
  // ==========================================================================

  describe('VITAL_THRESHOLDS defaults', () => {
    it('should have all expected vital types', () => {
      const expectedTypes: VitalType[] = [
        'glucose', 'systolic', 'diastolic', 'heartRate', 'spo2', 'temperature',
      ];
      expectedTypes.forEach(type => {
        expect(VITAL_THRESHOLDS[type]).toBeDefined();
        expect(VITAL_THRESHOLDS[type]).toHaveProperty('low');
        expect(VITAL_THRESHOLDS[type]).toHaveProperty('high');
        expect(VITAL_THRESHOLDS[type]).toHaveProperty('criticalLow');
        expect(VITAL_THRESHOLDS[type]).toHaveProperty('criticalHigh');
        expect(VITAL_THRESHOLDS[type]).toHaveProperty('unit');
        expect(VITAL_THRESHOLDS[type]).toHaveProperty('name');
      });
    });

    it('should have valid threshold ordering for all types', () => {
      (Object.keys(VITAL_THRESHOLDS) as VitalType[]).forEach(type => {
        const t = VITAL_THRESHOLDS[type];
        expect(t.criticalLow).toBeLessThan(t.low);
        expect(t.low).toBeLessThan(t.high);
        expect(t.high).toBeLessThanOrEqual(t.criticalHigh);
      });
    });
  });

  // ==========================================================================
  // getVitalStatus — with defaults
  // ==========================================================================

  describe('getVitalStatus — with defaults', () => {
    it('should return normal for values within range', () => {
      const result = getVitalStatus('heartRate', 75);
      expect(result.status).toBe('normal');
      expect(result.label).toBe('✓ Normal');
      expect(result.color).toBe('#34D399');
    });

    it('should return low for values below low threshold', () => {
      const result = getVitalStatus('heartRate', 55);
      expect(result.status).toBe('low');
      expect(result.label).toBe('↓ Low');
      expect(result.color).toBe('#FBBF24');
    });

    it('should return high for values above high threshold', () => {
      const result = getVitalStatus('heartRate', 110);
      expect(result.status).toBe('high');
      expect(result.label).toBe('↑ High');
      expect(result.color).toBe('#FBBF24');
    });

    it('should return critical for values at or below criticalLow', () => {
      const result = getVitalStatus('heartRate', 40);
      expect(result.status).toBe('critical');
      expect(result.label).toContain('Critical');
      expect(result.color).toBe('#F87171');
    });

    it('should return critical for values at or above criticalHigh', () => {
      const result = getVitalStatus('heartRate', 150);
      expect(result.status).toBe('critical');
      expect(result.label).toContain('Critical');
      expect(result.color).toBe('#F87171');
    });

    it('should handle glucose normal range', () => {
      const result = getVitalStatus('glucose', 100);
      expect(result.status).toBe('normal');
    });

    it('should handle SpO2 edge cases', () => {
      // 95 is the low threshold for spo2 — exactly at low is normal
      const atLow = getVitalStatus('spo2', 95);
      expect(atLow.status).toBe('normal');

      // Below low
      const belowLow = getVitalStatus('spo2', 93);
      expect(belowLow.status).toBe('low');
    });

    it('should handle temperature values', () => {
      const normal = getVitalStatus('temperature', 98.6);
      expect(normal.status).toBe('normal');

      const high = getVitalStatus('temperature', 100.5);
      expect(high.status).toBe('high');

      const critical = getVitalStatus('temperature', 103.0);
      expect(critical.status).toBe('critical');
    });

    it('should handle blood pressure systolic', () => {
      const normal = getVitalStatus('systolic', 120);
      expect(normal.status).toBe('normal');

      const high = getVitalStatus('systolic', 145);
      expect(high.status).toBe('high');
    });

    it('should handle blood pressure diastolic', () => {
      const normal = getVitalStatus('diastolic', 75);
      expect(normal.status).toBe('normal');

      const high = getVitalStatus('diastolic', 95);
      expect(high.status).toBe('high');
    });
  });

  // ==========================================================================
  // generateVitalAlert — with defaults
  // ==========================================================================

  describe('generateVitalAlert — with defaults', () => {
    it('should return null for normal values', () => {
      const alert = generateVitalAlert('heartRate', 75);
      expect(alert).toBeNull();
    });

    it('should return alert string for low values', () => {
      const alert = generateVitalAlert('heartRate', 55);
      expect(alert).not.toBeNull();
      expect(alert).toContain('Heart Rate');
      expect(alert).toContain('55');
      expect(alert).toContain('below target');
    });

    it('should return alert string for high values', () => {
      const alert = generateVitalAlert('glucose', 200);
      expect(alert).not.toBeNull();
      expect(alert).toContain('Blood Glucose');
      expect(alert).toContain('200');
      expect(alert).toContain('above target');
    });

    it('should return critical alert for critical values', () => {
      const alert = generateVitalAlert('glucose', 260);
      expect(alert).not.toBeNull();
      expect(alert).toContain('critically');
      expect(alert).toContain('Contact healthcare provider');
    });

    it('should indicate critical low direction', () => {
      const alert = generateVitalAlert('glucose', 50);
      expect(alert).not.toBeNull();
      expect(alert).toContain('critically low');
    });

    it('should indicate critical high direction', () => {
      const alert = generateVitalAlert('temperature', 104);
      expect(alert).not.toBeNull();
      expect(alert).toContain('critically high');
    });
  });

  // ==========================================================================
  // loadCustomThresholds
  // ==========================================================================

  describe('loadCustomThresholds', () => {
    it('should load custom thresholds from AsyncStorage', async () => {
      const custom = {
        heartRate: { low: 50, high: 110, criticalLow: 35, criticalHigh: 160 },
      };
      await AsyncStorage.setItem(CUSTOM_THRESHOLDS_KEY, JSON.stringify(custom));

      await loadCustomThresholds();

      // A value that's normal with defaults (55 bpm) but within custom low-50 range
      // With defaults: 55 < 60 (low) → 'low'
      // With custom: 55 >= 50 (low) and <= 110 (high) → 'normal'
      const result = getVitalStatus('heartRate', 55);
      expect(result.status).toBe('normal');
    });

    it('should handle empty storage gracefully', async () => {
      await loadCustomThresholds();

      // Should fall back to defaults
      const result = getVitalStatus('heartRate', 75);
      expect(result.status).toBe('normal');
    });

    it('should handle corrupted storage data', async () => {
      await AsyncStorage.setItem(CUSTOM_THRESHOLDS_KEY, 'not-json');

      // Should not throw, should fall back to defaults
      await loadCustomThresholds();

      const result = getVitalStatus('heartRate', 75);
      expect(result.status).toBe('normal');
    });

    it('should only apply custom values for vitals that have overrides', async () => {
      const custom = {
        heartRate: { low: 50, high: 110, criticalLow: 35, criticalHigh: 160 },
      };
      await AsyncStorage.setItem(CUSTOM_THRESHOLDS_KEY, JSON.stringify(custom));
      await loadCustomThresholds();

      // Heart rate should use custom
      const hrResult = getVitalStatus('heartRate', 55);
      expect(hrResult.status).toBe('normal'); // 55 >= 50 custom low

      // Glucose should still use defaults
      const glucoseResult = getVitalStatus('glucose', 65);
      expect(glucoseResult.status).toBe('low'); // 65 < 70 default low
    });
  });

  // ==========================================================================
  // invalidateThresholdCache
  // ==========================================================================

  describe('invalidateThresholdCache', () => {
    it('should revert to defaults after cache invalidation', async () => {
      const custom = {
        heartRate: { low: 50, high: 110, criticalLow: 35, criticalHigh: 160 },
      };
      await AsyncStorage.setItem(CUSTOM_THRESHOLDS_KEY, JSON.stringify(custom));
      await loadCustomThresholds();

      // Confirm custom is active
      expect(getVitalStatus('heartRate', 55).status).toBe('normal');

      // Invalidate cache
      invalidateThresholdCache();

      // Should fall back to defaults (cache not loaded)
      expect(getVitalStatus('heartRate', 55).status).toBe('low');
    });

    it('should allow reloading after invalidation', async () => {
      const custom = {
        glucose: { low: 60, high: 160, criticalLow: 45, criticalHigh: 280 },
      };
      await AsyncStorage.setItem(CUSTOM_THRESHOLDS_KEY, JSON.stringify(custom));
      await loadCustomThresholds();

      // Custom active
      expect(getVitalStatus('glucose', 65).status).toBe('normal');

      invalidateThresholdCache();

      // Defaults active
      expect(getVitalStatus('glucose', 65).status).toBe('low');

      // Reload
      await loadCustomThresholds();

      // Custom active again
      expect(getVitalStatus('glucose', 65).status).toBe('normal');
    });
  });

  // ==========================================================================
  // getVitalStatus — with custom thresholds
  // ==========================================================================

  describe('getVitalStatus — with custom thresholds', () => {
    it('should use custom low threshold', async () => {
      const custom = {
        systolic: { low: 85, high: 150, criticalLow: 75, criticalHigh: 190 },
      };
      await AsyncStorage.setItem(CUSTOM_THRESHOLDS_KEY, JSON.stringify(custom));
      await loadCustomThresholds();

      // 88 is below default low (90) but above custom low (85)
      const result = getVitalStatus('systolic', 88);
      expect(result.status).toBe('normal');
    });

    it('should use custom high threshold', async () => {
      const custom = {
        systolic: { low: 85, high: 150, criticalLow: 75, criticalHigh: 190 },
      };
      await AsyncStorage.setItem(CUSTOM_THRESHOLDS_KEY, JSON.stringify(custom));
      await loadCustomThresholds();

      // 145 is above default high (140) but below custom high (150)
      const result = getVitalStatus('systolic', 145);
      expect(result.status).toBe('normal');
    });

    it('should use custom critical thresholds', async () => {
      const custom = {
        glucose: { low: 65, high: 160, criticalLow: 40, criticalHigh: 300 },
      };
      await AsyncStorage.setItem(CUSTOM_THRESHOLDS_KEY, JSON.stringify(custom));
      await loadCustomThresholds();

      // 260 is above default criticalHigh (250) but below custom criticalHigh (300)
      const result = getVitalStatus('glucose', 260);
      expect(result.status).toBe('high');
    });
  });

  // ==========================================================================
  // generateVitalAlert — with custom thresholds
  // ==========================================================================

  describe('generateVitalAlert — with custom thresholds', () => {
    it('should return null when value is normal per custom thresholds', async () => {
      const custom = {
        heartRate: { low: 45, high: 120, criticalLow: 30, criticalHigh: 170 },
      };
      await AsyncStorage.setItem(CUSTOM_THRESHOLDS_KEY, JSON.stringify(custom));
      await loadCustomThresholds();

      // 55 is low with defaults but normal with custom
      const alert = generateVitalAlert('heartRate', 55);
      expect(alert).toBeNull();
    });

    it('should use custom range values in alert message', async () => {
      const custom = {
        heartRate: { low: 50, high: 110, criticalLow: 35, criticalHigh: 160 },
      };
      await AsyncStorage.setItem(CUSTOM_THRESHOLDS_KEY, JSON.stringify(custom));
      await loadCustomThresholds();

      const alert = generateVitalAlert('heartRate', 115);
      expect(alert).not.toBeNull();
      expect(alert).toContain('50-110'); // custom range in message
    });

    it('should generate critical alert using custom critical thresholds', async () => {
      const custom = {
        temperature: { low: 96.5, high: 100.0, criticalLow: 94.0, criticalHigh: 104.0 },
      };
      await AsyncStorage.setItem(CUSTOM_THRESHOLDS_KEY, JSON.stringify(custom));
      await loadCustomThresholds();

      // 103.5 is critical with defaults (>= 103.0) but only high with custom (< 104.0)
      const alert = generateVitalAlert('temperature', 103.5);
      expect(alert).not.toBeNull();
      expect(alert).toContain('above target');
      expect(alert).not.toContain('critically');
    });
  });
});
