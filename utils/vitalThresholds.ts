// utils/vitalThresholds.ts

import { Colors } from '../theme/theme-tokens';
import { logError } from './devLog';
import { StorageKeys } from './storageKeys';
import { safeGetItem } from './safeStorage';

const CUSTOM_THRESHOLDS_KEY = StorageKeys.CUSTOM_VITAL_THRESHOLDS;

export const VITAL_THRESHOLDS = {
  glucose: {
    low: 70,
    high: 140,
    criticalLow: 54,
    criticalHigh: 250,
    unit: 'mg/dL',
    name: 'Blood Glucose',
  },
  systolic: {
    low: 90,
    high: 140,
    criticalLow: 80,
    criticalHigh: 180,
    unit: 'mmHg',
    name: 'Systolic BP',
  },
  diastolic: {
    low: 60,
    high: 90,
    criticalLow: 50,
    criticalHigh: 120,
    unit: 'mmHg',
    name: 'Diastolic BP',
  },
  heartRate: {
    low: 60,
    high: 100,
    criticalLow: 40,
    criticalHigh: 150,
    unit: 'bpm',
    name: 'Heart Rate',
  },
  spo2: {
    low: 95,
    high: 100,
    criticalLow: 90,
    criticalHigh: 100,
    unit: '%',
    name: 'Oxygen Saturation',
  },
  temperature: {
    low: 97.0,
    high: 99.5,
    criticalLow: 95.0,
    criticalHigh: 103.0,
    unit: '°F',
    name: 'Temperature',
  },
};

export type VitalType = keyof typeof VITAL_THRESHOLDS;

// Cache for custom thresholds to avoid repeated AsyncStorage reads
let cachedCustomThresholds: Partial<Record<VitalType, { low: number; high: number; criticalLow: number; criticalHigh: number }>> | null = null;
let cacheLoaded = false;

/** Load custom thresholds from storage into cache */
export const loadCustomThresholds = async () => {
  try {
    const stored = await safeGetItem<typeof cachedCustomThresholds>(CUSTOM_THRESHOLDS_KEY, null);
    cachedCustomThresholds = stored;
    cacheLoaded = true;
  } catch (error) {
    logError('vitalThresholds.loadCustomThresholds', error);
    cachedCustomThresholds = null;
    cacheLoaded = true;
  }
};

/** Invalidate the cache so next getEffectiveThreshold re-reads storage */
export const invalidateThresholdCache = () => {
  cacheLoaded = false;
  cachedCustomThresholds = null;
};

/** Get the effective threshold for a vital type (custom if set, otherwise default) */
const getEffectiveThreshold = (type: VitalType) => {
  const defaults = VITAL_THRESHOLDS[type];
  if (!cacheLoaded || !cachedCustomThresholds) {
    return defaults;
  }
  const custom = cachedCustomThresholds[type];
  if (!custom) {
    return defaults;
  }
  return {
    ...defaults,
    low: custom.low,
    high: custom.high,
    criticalLow: custom.criticalLow,
    criticalHigh: custom.criticalHigh,
  };
};

export const getVitalStatus = (type: VitalType, value: number) => {
  const threshold = getEffectiveThreshold(type);

  if (value <= threshold.criticalLow || value >= threshold.criticalHigh) {
    return { status: 'critical', label: value < threshold.low ? '↓ Critical' : '↑ Critical', color: Colors.red };
  }
  if (value < threshold.low) {
    return { status: 'low', label: '↓ Low', color: Colors.amber };
  }
  if (value > threshold.high) {
    return { status: 'high', label: '↑ High', color: Colors.amber };
  }
  return { status: 'normal', label: '✓ Normal', color: Colors.green };
};

export const generateVitalAlert = (type: VitalType, value: number): string | null => {
  const threshold = getEffectiveThreshold(type);
  const status = getVitalStatus(type, value);

  if (status.status === 'critical') {
    return `${threshold.name} ${value} ${threshold.unit} is critically ${value < threshold.low ? 'low' : 'high'}. Contact healthcare provider.`;
  }
  if (status.status === 'high') {
    return `${threshold.name} ${value} ${threshold.unit} is above target (${threshold.low}-${threshold.high}). Consider checking again in 2 hours.`;
  }
  if (status.status === 'low') {
    return `${threshold.name} ${value} ${threshold.unit} is below target (${threshold.low}-${threshold.high}). Monitor closely.`;
  }
  return null;
};
