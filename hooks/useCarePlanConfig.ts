// ============================================================================
// USE CARE PLAN CONFIG HOOK
// React hook for accessing and managing Care Plan configuration
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { logError } from '../utils/devLog';
import { useDataListener, emitDataUpdate } from '../lib/events';
import { EVENT } from '../lib/eventNames';
import {
  CarePlanConfig,
  BucketType,
  BucketConfig,
  MedsBucketConfig,
  VitalsBucketConfig,
  MedicationPlanItem,
  hasAnyEnabledBucket,
  getEnabledBuckets,
  getBucketStatusText,
} from '../types/carePlanConfig';
import {
  getCarePlanConfig,
  getOrCreateCarePlanConfig,
  saveCarePlanConfig,
  updateBucketConfig,
  setBucketEnabled,
  addMedicationToPlan,
  updateMedicationInPlan,
  removeMedicationFromPlan,
  getActiveMedicationsFromPlan,
  updateVitalsConfig,
} from '../storage/carePlanConfigRepo';
import { DEFAULT_PATIENT_ID } from '../types/patient';

// ============================================================================
// TYPES
// ============================================================================

export interface UseCarePlanConfigReturn {
  // State
  config: CarePlanConfig | null;
  loading: boolean;
  error: Error | null;

  // Derived state
  hasCarePlan: boolean;
  enabledBuckets: BucketType[];

  // Actions
  refresh: () => Promise<void>;
  initializeConfig: () => Promise<CarePlanConfig>;
  updateConfig: (updates: Partial<CarePlanConfig>) => Promise<void>;

  // Bucket operations
  toggleBucket: (bucket: BucketType, enabled: boolean) => Promise<void>;
  updateBucket: (bucket: BucketType, updates: Partial<BucketConfig>) => Promise<void>;
  getBucketStatus: (bucket: BucketType) => string | null;

  // Medication operations
  addMedication: (med: Omit<MedicationPlanItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<MedicationPlanItem>;
  updateMedication: (id: string, updates: Partial<MedicationPlanItem>) => Promise<MedicationPlanItem | null>;
  removeMedication: (id: string) => Promise<void>;
  getActiveMedications: () => MedicationPlanItem[];

  // Vitals operations
  updateVitals: (updates: Partial<VitalsBucketConfig>) => Promise<void>;
}

// ============================================================================
// HOOK
// ============================================================================

export function useCarePlanConfig(
  patientId: string = DEFAULT_PATIENT_ID
): UseCarePlanConfigReturn {
  const [config, setConfig] = useState<CarePlanConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Load the Care Plan config
   */
  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const loadedConfig = await getCarePlanConfig(patientId);
      setConfig(loadedConfig);
    } catch (err) {
      logError('useCarePlanConfig.loadConfig', err);
      setError(err instanceof Error ? err : new Error('Failed to load config'));
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  // Initial load
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Listen for relevant updates only
  useDataListener((category) => {
    if (['carePlanConfig', 'carePlanItems', 'sampleDataCleared', 'patient'].includes(category)) {
      loadConfig();
    }
  });

  /**
   * Initialize config if it doesn't exist
   */
  const initializeConfig = useCallback(async (): Promise<CarePlanConfig> => {
    const newConfig = await getOrCreateCarePlanConfig(patientId);
    setConfig(newConfig);
    return newConfig;
  }, [patientId]);

  /**
   * Update the config
   */
  const updateConfig = useCallback(async (updates: Partial<CarePlanConfig>) => {
    if (!config) {
      await initializeConfig();
    }
    const currentConfig = config || (await getOrCreateCarePlanConfig(patientId));
    const updatedConfig: CarePlanConfig = {
      ...currentConfig,
      ...updates,
    };
    await saveCarePlanConfig(updatedConfig);
    setConfig(updatedConfig);
  }, [config, patientId, initializeConfig]);

  /**
   * Toggle a bucket on/off
   */
  const toggleBucket = useCallback(async (bucket: BucketType, enabled: boolean) => {
    const updatedConfig = await setBucketEnabled(patientId, bucket, enabled);
    setConfig(updatedConfig);
    emitDataUpdate(EVENT.CARE_PLAN_CONFIG);
  }, [patientId]);

  /**
   * Update a bucket's config
   */
  const updateBucket = useCallback(async (bucket: BucketType, updates: Partial<BucketConfig>) => {
    const updatedConfig = await updateBucketConfig(patientId, bucket, updates);
    setConfig(updatedConfig);
    emitDataUpdate(EVENT.CARE_PLAN_CONFIG);
  }, [patientId]);

  /**
   * Get bucket status text
   */
  const getBucketStatus = useCallback((bucket: BucketType): string | null => {
    if (!config) return null;
    return getBucketStatusText(config, bucket);
  }, [config]);

  /**
   * Add a medication
   */
  const addMedication = useCallback(async (
    med: Omit<MedicationPlanItem, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<MedicationPlanItem> => {
    const newMed = await addMedicationToPlan(patientId, med);
    await loadConfig(); // Refresh to get updated config
    return newMed;
  }, [patientId, loadConfig]);

  /**
   * Update a medication
   */
  const updateMedication = useCallback(async (
    id: string,
    updates: Partial<MedicationPlanItem>
  ): Promise<MedicationPlanItem | null> => {
    const updated = await updateMedicationInPlan(patientId, id, updates);
    await loadConfig();
    emitDataUpdate(EVENT.CARE_PLAN_ITEMS);
    emitDataUpdate(EVENT.DAILY_INSTANCES);
    return updated;
  }, [patientId, loadConfig]);

  /**
   * Remove a medication
   */
  const removeMedication = useCallback(async (id: string) => {
    await removeMedicationFromPlan(patientId, id);
    await loadConfig();
    emitDataUpdate(EVENT.CARE_PLAN_ITEMS);
    emitDataUpdate(EVENT.DAILY_INSTANCES);
  }, [patientId, loadConfig]);

  /**
   * Get active medications from current config
   */
  const getActiveMedications = useCallback((): MedicationPlanItem[] => {
    if (!config) return [];
    const medsConfig = config.meds as MedsBucketConfig;
    return (medsConfig.medications || []).filter(m => m.active);
  }, [config]);

  /**
   * Update vitals config
   */
  const updateVitals = useCallback(async (updates: Partial<VitalsBucketConfig>) => {
    const updatedConfig = await updateVitalsConfig(patientId, updates);
    setConfig(updatedConfig);
  }, [patientId]);

  // Derived state
  const hasCarePlanValue = config ? hasAnyEnabledBucket(config) : false;
  const enabledBuckets = config ? getEnabledBuckets(config) : [];

  return {
    config,
    loading,
    error,
    hasCarePlan: hasCarePlanValue,
    enabledBuckets,
    refresh: loadConfig,
    initializeConfig,
    updateConfig,
    toggleBucket,
    updateBucket,
    getBucketStatus,
    addMedication,
    updateMedication,
    removeMedication,
    getActiveMedications,
    updateVitals,
  };
}

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

/**
 * Simple hook to check if Care Plan exists
 */
export function useHasCarePlanConfig(patientId: string = DEFAULT_PATIENT_ID): {
  hasCarePlan: boolean;
  loading: boolean;
} {
  const { hasCarePlan, loading } = useCarePlanConfig(patientId);
  return { hasCarePlan, loading };
}

/**
 * Hook to get enabled buckets only
 */
export function useEnabledBuckets(patientId: string = DEFAULT_PATIENT_ID): {
  enabledBuckets: BucketType[];
  loading: boolean;
} {
  const { enabledBuckets, loading } = useCarePlanConfig(patientId);
  return { enabledBuckets, loading };
}
