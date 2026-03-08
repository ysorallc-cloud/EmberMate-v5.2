// ============================================================================
// CLINICAL CARE SETTINGS
// AsyncStorage-backed toggle for clinical care opt-in (Tier 3)
// ============================================================================

import { safeGetItem, safeSetItem } from './safeStorage';
import { logError } from './devLog';
import { StorageKeys } from './storageKeys';

const CLINICAL_CARE_KEY = StorageKeys.CLINICAL_CARE_SETTINGS;

export interface ClinicalCareSettings {
  enabled: boolean;
  enabledAt?: string;
  mobilityStatus?: string;
  cognitiveBaseline?: string;
  fallRisk?: boolean;
  codeStatus?: string;
  dnr?: boolean;
  wanderingRisk?: boolean;
  fluidTargetOz?: number;
  swallowingIssues?: boolean;
}

export async function getClinicalCareSettings(): Promise<ClinicalCareSettings> {
  try {
    return await safeGetItem<ClinicalCareSettings>(CLINICAL_CARE_KEY, { enabled: false });
  } catch (error) {
    logError('clinicalCareSettings.get', error);
    return { enabled: false };
  }
}

export async function getClinicalCareEnabled(): Promise<boolean> {
  const settings = await getClinicalCareSettings();
  return settings.enabled;
}

export async function setClinicalCareEnabled(enabled: boolean): Promise<void> {
  try {
    const existing = await getClinicalCareSettings();
    const updated: ClinicalCareSettings = {
      ...existing,
      enabled,
      enabledAt: enabled ? new Date().toISOString() : existing.enabledAt,
    };
    await safeSetItem(CLINICAL_CARE_KEY, updated);
  } catch (error) {
    logError('clinicalCareSettings.setEnabled', error);
  }
}

export async function saveClinicalCareSettings(settings: ClinicalCareSettings): Promise<void> {
  try {
    await safeSetItem(CLINICAL_CARE_KEY, settings);
  } catch (error) {
    logError('clinicalCareSettings.save', error);
  }
}
