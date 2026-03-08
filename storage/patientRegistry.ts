// ============================================================================
// PATIENT REGISTRY
// Manages multi-patient data: add, remove, switch active patient
// ============================================================================

import { safeGetItem, safeSetItem } from '../utils/safeStorage';
import { emitDataUpdate } from '../lib/events';
import { EVENT } from '../lib/eventNames';
import { generateUniqueId } from '../utils/idGenerator';
import { GlobalKeys } from '../utils/storageKeys';
import { Patient, PatientRegistry, DEFAULT_PATIENT_ID } from '../types/patient';
import { getSubscriptionState } from './subscriptionRepo';
import { TIER_LIMITS } from '../types/subscription';

// ============================================================================
// DEFAULT REGISTRY
// ============================================================================

function createDefaultRegistry(): PatientRegistry {
  const now = new Date().toISOString();
  return {
    patients: [
      {
        id: DEFAULT_PATIENT_ID,
        name: 'Patient',
        relationship: 'self',
        createdAt: now,
        updatedAt: now,
        isDefault: true,
      },
    ],
    activePatientId: DEFAULT_PATIENT_ID,
    version: 1,
  };
}

// ============================================================================
// REGISTRY OPERATIONS
// ============================================================================

/**
 * Get the patient registry. Returns default registry with 1 patient if none exists.
 */
export async function getPatientRegistry(): Promise<PatientRegistry> {
  const registry = await safeGetItem<PatientRegistry | null>(GlobalKeys.PATIENT_REGISTRY, null);
  if (!registry || !registry.patients || registry.patients.length === 0) {
    return createDefaultRegistry();
  }
  return registry;
}

/**
 * Convenience — returns the active patient ID
 */
export async function getActivePatientId(): Promise<string> {
  const registry = await getPatientRegistry();
  return registry.activePatientId;
}

/**
 * Switch active patient
 */
export async function setActivePatient(patientId: string): Promise<void> {
  const registry = await getPatientRegistry();
  const exists = registry.patients.some(p => p.id === patientId);
  if (!exists) {
    throw new Error(`Patient ${patientId} not found in registry`);
  }
  registry.activePatientId = patientId;
  registry.version += 1;
  await safeSetItem(GlobalKeys.PATIENT_REGISTRY, registry);
  emitDataUpdate(EVENT.PATIENT);
}

/**
 * Add a new patient. Returns the created patient.
 * Checks feature gate before allowing a second patient.
 */
export async function addPatient(
  name: string,
  relationship?: Patient['relationship']
): Promise<Patient> {
  const registry = await getPatientRegistry();

  // Inline feature gate check to avoid circular dependency with featureGate.ts
  const subState = await getSubscriptionState();
  const limits = TIER_LIMITS[subState.tier];
  if (registry.patients.length >= limits.maxPatients) {
    throw new Error('Upgrade to Premium to add more patients.');
  }
  const now = new Date().toISOString();

  const patient: Patient = {
    id: generateUniqueId(),
    name,
    relationship,
    createdAt: now,
    updatedAt: now,
    isDefault: false,
  };

  registry.patients.push(patient);
  registry.version += 1;
  await safeSetItem(GlobalKeys.PATIENT_REGISTRY, registry);
  emitDataUpdate(EVENT.PATIENT);
  return patient;
}

/**
 * Update a patient's name or relationship
 */
export async function updatePatient(
  patientId: string,
  updates: Partial<Pick<Patient, 'name' | 'relationship'>>
): Promise<Patient | null> {
  const registry = await getPatientRegistry();
  const index = registry.patients.findIndex(p => p.id === patientId);
  if (index === -1) return null;

  registry.patients[index] = {
    ...registry.patients[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  registry.version += 1;
  await safeSetItem(GlobalKeys.PATIENT_REGISTRY, registry);
  emitDataUpdate(EVENT.PATIENT);
  return registry.patients[index];
}

/**
 * Remove a patient. Cannot remove the default patient.
 */
export async function removePatient(patientId: string): Promise<boolean> {
  const registry = await getPatientRegistry();
  const patient = registry.patients.find(p => p.id === patientId);
  if (!patient || patient.isDefault) return false;

  registry.patients = registry.patients.filter(p => p.id !== patientId);

  // If removing the active patient, switch to default
  if (registry.activePatientId === patientId) {
    registry.activePatientId = DEFAULT_PATIENT_ID;
  }

  registry.version += 1;
  await safeSetItem(GlobalKeys.PATIENT_REGISTRY, registry);
  emitDataUpdate(EVENT.PATIENT);
  return true;
}

/**
 * List all patients
 */
export async function listPatients(): Promise<Patient[]> {
  const registry = await getPatientRegistry();
  return registry.patients;
}
