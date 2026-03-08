// ============================================================================
// CARE PLAN CONFIG REPOSITORY
// Storage layer for the Care Plan configuration (bucket-based system)
// ============================================================================

import { safeGetItem, safeSetItem } from '../utils/safeStorage';
import { emitDataUpdate } from '../lib/events';
import { EVENT } from '../lib/eventNames';
import {
  CarePlanConfig,
  BucketType,
  BucketConfig,
  MedsBucketConfig,
  VitalsBucketConfig,
  MedicationPlanItem,
  createDefaultCarePlanConfig,
  hasAnyEnabledBucket,
} from '../types/carePlanConfig';
import { generateUniqueId } from '../utils/idGenerator';
import { DEFAULT_PATIENT_ID } from '../types/patient';

// ============================================================================
// STORAGE KEYS
// ============================================================================

const KEYS = {
  CONFIG: (patientId: string) => `@embermate_careplan_config_v1:${patientId}`,
};

// ============================================================================
// CARE PLAN CONFIG OPERATIONS
// ============================================================================

/**
 * Get the Care Plan configuration for a patient
 * Returns null if no config exists
 */
export async function getCarePlanConfig(
  patientId: string = DEFAULT_PATIENT_ID
): Promise<CarePlanConfig | null> {
  return safeGetItem<CarePlanConfig | null>(KEYS.CONFIG(patientId), null);
}

/**
 * Get or create the Care Plan configuration
 * Creates a default config if none exists
 */
export async function getOrCreateCarePlanConfig(
  patientId: string = DEFAULT_PATIENT_ID
): Promise<CarePlanConfig> {
  let config = await getCarePlanConfig(patientId);
  if (!config) {
    config = createDefaultCarePlanConfig(patientId);
    await saveCarePlanConfig(config);
  }
  return config;
}

/**
 * Save the Care Plan configuration
 */
export async function saveCarePlanConfig(config: CarePlanConfig): Promise<void> {
  const updated: CarePlanConfig = {
    ...config,
    updatedAt: new Date().toISOString(),
    version: (config.version || 0) + 1,
  };
  const ok = await safeSetItem(KEYS.CONFIG(config.patientId), updated);
  if (ok) emitDataUpdate(EVENT.CARE_PLAN_CONFIG);
}

/**
 * Check if a Care Plan config exists and has any enabled buckets
 */
export async function hasCarePlan(
  patientId: string = DEFAULT_PATIENT_ID
): Promise<boolean> {
  const config = await getCarePlanConfig(patientId);
  if (!config) return false;
  return hasAnyEnabledBucket(config);
}

/**
 * Update a specific bucket configuration
 */
export async function updateBucketConfig(
  patientId: string,
  bucketType: BucketType,
  updates: Partial<BucketConfig>
): Promise<CarePlanConfig> {
  const config = await getOrCreateCarePlanConfig(patientId);

  config[bucketType] = {
    ...config[bucketType],
    ...updates,
  } as any; // Type assertion needed due to specialized bucket types

  await saveCarePlanConfig(config);
  return config;
}

/**
 * Enable or disable a bucket
 */
export async function setBucketEnabled(
  patientId: string,
  bucketType: BucketType,
  enabled: boolean
): Promise<CarePlanConfig> {
  return updateBucketConfig(patientId, bucketType, { enabled });
}

// ============================================================================
// MEDICATION OPERATIONS
// ============================================================================

/**
 * Add a medication to the meds bucket
 */
export async function addMedicationToPlan(
  patientId: string,
  medication: Omit<MedicationPlanItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<MedicationPlanItem> {
  const config = await getOrCreateCarePlanConfig(patientId);
  const now = new Date().toISOString();

  const newMed: MedicationPlanItem = {
    ...medication,
    id: generateUniqueId(),
    createdAt: now,
    updatedAt: now,
  };

  const medsConfig = config.meds as MedsBucketConfig;
  medsConfig.medications = [...(medsConfig.medications || []), newMed];

  // Auto-enable meds bucket when first medication is added
  if (!medsConfig.enabled) {
    medsConfig.enabled = true;
  }

  await saveCarePlanConfig(config);
  return newMed;
}

/**
 * Update a medication in the plan
 */
export async function updateMedicationInPlan(
  patientId: string,
  medicationId: string,
  updates: Partial<MedicationPlanItem>
): Promise<MedicationPlanItem | null> {
  const config = await getOrCreateCarePlanConfig(patientId);
  const medsConfig = config.meds as MedsBucketConfig;

  const index = medsConfig.medications?.findIndex(m => m.id === medicationId) ?? -1;
  if (index === -1) return null;

  const updatedMed: MedicationPlanItem = {
    ...medsConfig.medications[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  medsConfig.medications[index] = updatedMed;
  await saveCarePlanConfig(config);
  return updatedMed;
}

/**
 * Remove a medication from the plan
 */
export async function removeMedicationFromPlan(
  patientId: string,
  medicationId: string
): Promise<void> {
  const config = await getOrCreateCarePlanConfig(patientId);
  const medsConfig = config.meds as MedsBucketConfig;

  medsConfig.medications = (medsConfig.medications || []).filter(m => m.id !== medicationId);
  await saveCarePlanConfig(config);
}

/**
 * Get all medications from the plan
 */
export async function getMedicationsFromPlan(
  patientId: string = DEFAULT_PATIENT_ID
): Promise<MedicationPlanItem[]> {
  const config = await getCarePlanConfig(patientId);
  if (!config) return [];

  const medsConfig = config.meds as MedsBucketConfig;
  return medsConfig.medications || [];
}

/**
 * Get active medications from the plan
 */
export async function getActiveMedicationsFromPlan(
  patientId: string = DEFAULT_PATIENT_ID
): Promise<MedicationPlanItem[]> {
  const meds = await getMedicationsFromPlan(patientId);
  return meds.filter(m => m.active);
}

// ============================================================================
// VITALS OPERATIONS
// ============================================================================

/**
 * Update vitals bucket configuration
 */
export async function updateVitalsConfig(
  patientId: string,
  updates: Partial<VitalsBucketConfig>
): Promise<CarePlanConfig> {
  const config = await getOrCreateCarePlanConfig(patientId);

  config.vitals = {
    ...config.vitals,
    ...updates,
  };

  await saveCarePlanConfig(config);
  return config;
}

// ============================================================================
// MIGRATION HELPERS
// ============================================================================

/**
 * Import medications from the old medication storage to the Care Plan config
 * Returns the number of medications imported
 */
export async function importMedicationsToCarePlan(
  patientId: string,
  medications: Array<{
    id: string;
    name: string;
    dosage: string;
    time?: string;
    timeSlot?: string;
    notes?: string;
    daysSupply?: number;
    reminderEnabled?: boolean;
    active?: boolean;
  }>
): Promise<number> {
  const config = await getOrCreateCarePlanConfig(patientId);
  const medsConfig = config.meds as MedsBucketConfig;
  const now = new Date().toISOString();

  let imported = 0;

  for (const med of medications) {
    // Check if medication already exists by name
    const exists = medsConfig.medications?.some(
      m => m.name.toLowerCase() === med.name.toLowerCase() && m.dosage === med.dosage
    );

    if (!exists) {
      // Map timeSlot to TimeOfDay
      const timeOfDay = mapTimeSlotToTimeOfDay(med.timeSlot);

      const newMed: MedicationPlanItem = {
        id: med.id || generateUniqueId(),
        name: med.name,
        dosage: med.dosage,
        instructions: med.notes,
        timesOfDay: [timeOfDay],
        customTimes: med.time ? [med.time] : undefined,
        supplyEnabled: med.daysSupply != null,
        daysSupply: med.daysSupply,
        refillThresholdDays: 7,
        notificationsEnabled: med.reminderEnabled ?? false,
        active: med.active !== false,
        createdAt: now,
        updatedAt: now,
      };

      medsConfig.medications = [...(medsConfig.medications || []), newMed];
      imported++;
    }
  }

  if (imported > 0) {
    // Auto-enable meds bucket
    medsConfig.enabled = true;
    await saveCarePlanConfig(config);
  }

  return imported;
}

/**
 * Map old timeSlot to new TimeOfDay
 */
function mapTimeSlotToTimeOfDay(timeSlot?: string): 'morning' | 'midday' | 'evening' | 'night' {
  switch (timeSlot) {
    case 'morning':
      return 'morning';
    case 'afternoon':
      return 'midday';
    case 'evening':
      return 'evening';
    case 'bedtime':
    case 'night':
      return 'night';
    default:
      return 'morning';
  }
}

// ============================================================================
// CLEAR / RESET
// ============================================================================

/**
 * Reset Care Plan config to defaults
 */
export async function resetCarePlanConfig(
  patientId: string = DEFAULT_PATIENT_ID
): Promise<CarePlanConfig> {
  const config = createDefaultCarePlanConfig(patientId);
  await saveCarePlanConfig(config);
  return config;
}
