// ============================================================================
// VITAL THRESHOLD SETTINGS — INTEGRATION TEST
// Flow: Save custom thresholds → load cache → verify alert logic → reset
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

describe('Vital Threshold Settings — Integration', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    invalidateThresholdCache();
  });

  // ==========================================================================
  // Full settings flow
  // ==========================================================================

  it('should complete full custom threshold lifecycle', async () => {
    // Step 1: Initially, use defaults
    expect(getVitalStatus('systolic', 88).status).toBe('low'); // 88 < 90 default low

    // Step 2: Simulate saving custom thresholds from settings screen
    const customThresholds = {
      systolic: { low: 85, high: 150, criticalLow: 70, criticalHigh: 200 },
      diastolic: { low: 55, high: 95, criticalLow: 45, criticalHigh: 130 },
    };
    await AsyncStorage.setItem(CUSTOM_THRESHOLDS_KEY, JSON.stringify(customThresholds));

    // Step 3: Load custom thresholds (as app startup or save handler would do)
    await loadCustomThresholds();

    // Step 4: Verify custom thresholds take effect
    expect(getVitalStatus('systolic', 88).status).toBe('normal');  // 88 >= 85 custom low
    expect(getVitalStatus('diastolic', 57).status).toBe('normal'); // 57 >= 55 custom low

    // Step 5: Non-customized vitals should still use defaults
    expect(getVitalStatus('heartRate', 55).status).toBe('low'); // still using defaults

    // Step 6: Simulate removing custom thresholds (reset to defaults)
    await AsyncStorage.removeItem(CUSTOM_THRESHOLDS_KEY);
    await loadCustomThresholds();

    // Step 7: Verify defaults are restored
    expect(getVitalStatus('systolic', 88).status).toBe('low'); // back to default behavior
  });

  // ==========================================================================
  // Multiple vital customization
  // ==========================================================================

  it('should handle customizing all vitals simultaneously', async () => {
    const allCustom: Record<string, any> = {
      glucose: { low: 65, high: 160, criticalLow: 45, criticalHigh: 280 },
      systolic: { low: 85, high: 150, criticalLow: 70, criticalHigh: 200 },
      diastolic: { low: 55, high: 95, criticalLow: 45, criticalHigh: 130 },
      heartRate: { low: 50, high: 110, criticalLow: 35, criticalHigh: 165 },
      spo2: { low: 92, high: 100, criticalLow: 85, criticalHigh: 100 },
      temperature: { low: 96.5, high: 100.0, criticalLow: 94.0, criticalHigh: 104.0 },
    };

    await AsyncStorage.setItem(CUSTOM_THRESHOLDS_KEY, JSON.stringify(allCustom));
    await loadCustomThresholds();

    // Test each vital with a value that differs between default and custom behavior
    expect(getVitalStatus('glucose', 67).status).toBe('normal');      // default: low
    expect(getVitalStatus('systolic', 88).status).toBe('normal');     // default: low
    expect(getVitalStatus('diastolic', 57).status).toBe('normal');    // default: low
    expect(getVitalStatus('heartRate', 55).status).toBe('normal');    // default: low
    expect(getVitalStatus('spo2', 93).status).toBe('normal');         // default: low
    expect(getVitalStatus('temperature', 96.8).status).toBe('normal'); // default: low
  });

  // ==========================================================================
  // Alert messages reflect custom ranges
  // ==========================================================================

  it('should generate alerts using custom threshold ranges', async () => {
    const custom = {
      heartRate: { low: 50, high: 110, criticalLow: 35, criticalHigh: 160 },
    };
    await AsyncStorage.setItem(CUSTOM_THRESHOLDS_KEY, JSON.stringify(custom));
    await loadCustomThresholds();

    // Value above custom high (110) but below default criticalHigh (150)
    const alert = generateVitalAlert('heartRate', 120);
    expect(alert).not.toBeNull();
    expect(alert).toContain('above target');
    expect(alert).toContain('50-110'); // custom range in message

    // Value in custom normal range (default would flag as low)
    const noAlert = generateVitalAlert('heartRate', 55);
    expect(noAlert).toBeNull();
  });

  // ==========================================================================
  // Critical alerts with custom thresholds
  // ==========================================================================

  it('should use custom critical thresholds for severe alerts', async () => {
    const custom = {
      glucose: { low: 65, high: 160, criticalLow: 40, criticalHigh: 300 },
    };
    await AsyncStorage.setItem(CUSTOM_THRESHOLDS_KEY, JSON.stringify(custom));
    await loadCustomThresholds();

    // 260 is critical with defaults (>= 250) but just high with custom (< 300)
    const result = getVitalStatus('glucose', 260);
    expect(result.status).toBe('high');

    const alert = generateVitalAlert('glucose', 260);
    expect(alert).toContain('above target');
    expect(alert).not.toContain('critically');

    // 300 should be critical with custom thresholds
    const criticalResult = getVitalStatus('glucose', 300);
    expect(criticalResult.status).toBe('critical');

    const criticalAlert = generateVitalAlert('glucose', 300);
    expect(criticalAlert).toContain('critically');
    expect(criticalAlert).toContain('Contact healthcare provider');
  });

  // ==========================================================================
  // Updating thresholds mid-session
  // ==========================================================================

  it('should handle threshold updates during a session', async () => {
    // Start with one set of custom thresholds
    const v1 = {
      heartRate: { low: 50, high: 110, criticalLow: 35, criticalHigh: 160 },
    };
    await AsyncStorage.setItem(CUSTOM_THRESHOLDS_KEY, JSON.stringify(v1));
    await loadCustomThresholds();

    expect(getVitalStatus('heartRate', 55).status).toBe('normal');

    // Update to tighter thresholds
    const v2 = {
      heartRate: { low: 58, high: 105, criticalLow: 38, criticalHigh: 155 },
    };
    await AsyncStorage.setItem(CUSTOM_THRESHOLDS_KEY, JSON.stringify(v2));
    await loadCustomThresholds();

    // 55 is now below the new custom low (58)
    expect(getVitalStatus('heartRate', 55).status).toBe('low');
  });

  // ==========================================================================
  // Storage persistence
  // ==========================================================================

  it('should persist thresholds across cache invalidation and reload', async () => {
    const custom = {
      temperature: { low: 96.0, high: 100.5, criticalLow: 93.0, criticalHigh: 105.0 },
    };
    await AsyncStorage.setItem(CUSTOM_THRESHOLDS_KEY, JSON.stringify(custom));
    await loadCustomThresholds();

    // Custom active
    expect(getVitalStatus('temperature', 96.3).status).toBe('normal');

    // Simulate app restart: invalidate cache, reload
    invalidateThresholdCache();

    // Falls back to defaults while cache is invalid
    expect(getVitalStatus('temperature', 96.3).status).toBe('low');

    // Reload simulates app startup
    await loadCustomThresholds();

    // Custom is back from AsyncStorage
    expect(getVitalStatus('temperature', 96.3).status).toBe('normal');
  });

  // ==========================================================================
  // Partial reset (remove one vital's custom thresholds)
  // ==========================================================================

  it('should handle removing a single vital from custom thresholds', async () => {
    const custom = {
      heartRate: { low: 50, high: 110, criticalLow: 35, criticalHigh: 160 },
      glucose: { low: 60, high: 160, criticalLow: 45, criticalHigh: 280 },
    };
    await AsyncStorage.setItem(CUSTOM_THRESHOLDS_KEY, JSON.stringify(custom));
    await loadCustomThresholds();

    expect(getVitalStatus('heartRate', 55).status).toBe('normal');
    expect(getVitalStatus('glucose', 65).status).toBe('normal');

    // Remove only heartRate custom thresholds
    const updated = {
      glucose: { low: 60, high: 160, criticalLow: 45, criticalHigh: 280 },
    };
    await AsyncStorage.setItem(CUSTOM_THRESHOLDS_KEY, JSON.stringify(updated));
    await loadCustomThresholds();

    // heartRate back to defaults, glucose still custom
    expect(getVitalStatus('heartRate', 55).status).toBe('low');
    expect(getVitalStatus('glucose', 65).status).toBe('normal');
  });
});
