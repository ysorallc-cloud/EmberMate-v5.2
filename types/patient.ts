// ============================================================================
// PATIENT TYPES
// Multi-patient support data structures
// ============================================================================

export interface Patient {
  id: string;
  name: string;
  relationship?: 'self' | 'parent' | 'spouse' | 'child' | 'other';
  createdAt: string;
  updatedAt: string;
  isDefault: boolean;
}

export interface PatientRegistry {
  patients: Patient[];
  activePatientId: string;
  version: number;
}

export const DEFAULT_PATIENT_ID = 'default';
