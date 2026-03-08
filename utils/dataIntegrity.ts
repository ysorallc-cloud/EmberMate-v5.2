// ============================================================================
// DATA INTEGRITY CHECKS
// Validates CarePlan references against actual data sources
// Detects orphaned references and provides fix actions
// ============================================================================

import { CarePlan, CarePlanItem, CarePlanRoutine } from '../types/dayState';
import { getMedications, Medication } from './medicationStorage';
import { getUpcomingAppointments, Appointment } from './appointmentStorage';

// ============================================================================
// TYPES
// ============================================================================

export type IntegrityIssueType =
  | 'missing_medication'
  | 'missing_appointment'
  | 'invalid_reference'
  | 'orphaned_task';

export type IntegrityIssueSeverity = 'error' | 'warning' | 'info';

export interface IntegrityIssue {
  id: string;
  type: IntegrityIssueType;
  severity: IntegrityIssueSeverity;
  message: string;
  suggestion: string;

  // Context for fix actions
  routineId?: string;
  itemId?: string;
  missingId?: string;

  // Fix action
  fixAction?: 'remove_item' | 'update_reference' | 'add_entity';
}

export interface IntegrityReport {
  isValid: boolean;
  issues: IntegrityIssue[];
  checkedAt: string;

  // Summary counts
  errorCount: number;
  warningCount: number;
  infoCount: number;
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Run all integrity checks on a CarePlan
 */
export async function validateCarePlan(carePlan: CarePlan | null): Promise<IntegrityReport> {
  const issues: IntegrityIssue[] = [];

  if (!carePlan) {
    return {
      isValid: true,
      issues: [],
      checkedAt: new Date().toISOString(),
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
    };
  }

  // Load current data sources
  const [medications, appointments] = await Promise.all([
    getMedications(),
    getUpcomingAppointments(),
  ]);

  const activeMedIds = new Set(medications.filter(m => m.active !== false).map(m => m.id));
  const appointmentIds = new Set(appointments.map(a => a.id));

  // Check each routine and item
  for (const routine of carePlan.routines) {
    for (const item of routine.items) {
      // Check medication references
      if (item.type === 'meds' && item.metadata?.medicationIds) {
        for (const medId of item.metadata.medicationIds) {
          if (!activeMedIds.has(medId)) {
            issues.push({
              id: `missing_med_${routine.id}_${item.id}_${medId}`,
              type: 'missing_medication',
              severity: 'warning',
              message: `Medication removed from "${item.label}"`,
              suggestion: 'The referenced medication no longer exists. Remove this reference or add the medication back.',
              routineId: routine.id,
              itemId: item.id,
              missingId: medId,
              fixAction: 'remove_item',
            });
          }
        }
      }

      // Check appointment references
      if (item.type === 'appointment' && item.metadata?.appointmentId) {
        if (!appointmentIds.has(item.metadata.appointmentId)) {
          issues.push({
            id: `missing_appt_${routine.id}_${item.id}_${item.metadata.appointmentId}`,
            type: 'missing_appointment',
            severity: 'info',
            message: `Appointment completed or removed from "${item.label}"`,
            suggestion: 'This appointment is no longer scheduled. The task can be removed.',
            routineId: routine.id,
            itemId: item.id,
            missingId: item.metadata.appointmentId,
            fixAction: 'remove_item',
          });
        }
      }
    }
  }

  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const infoCount = issues.filter(i => i.severity === 'info').length;

  return {
    isValid: errorCount === 0,
    issues,
    checkedAt: new Date().toISOString(),
    errorCount,
    warningCount,
    infoCount,
  };
}

/**
 * Check if a specific medication is referenced in the CarePlan
 */
export function isMedicationInCarePlan(carePlan: CarePlan | null, medicationId: string): boolean {
  if (!carePlan) return false;

  for (const routine of carePlan.routines) {
    for (const item of routine.items) {
      if (item.type === 'meds' && item.metadata?.medicationIds?.includes(medicationId)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Get items that reference a specific medication
 */
export function getItemsForMedication(
  carePlan: CarePlan | null,
  medicationId: string
): { routine: CarePlanRoutine; item: CarePlanItem }[] {
  const results: { routine: CarePlanRoutine; item: CarePlanItem }[] = [];

  if (!carePlan) return results;

  for (const routine of carePlan.routines) {
    for (const item of routine.items) {
      if (item.type === 'meds' && item.metadata?.medicationIds?.includes(medicationId)) {
        results.push({ routine, item });
      }
    }
  }

  return results;
}

// ============================================================================
// EMPTY STATE CHECKS
// ============================================================================

export interface EmptyStateInfo {
  type: 'medications' | 'appointments' | 'careplan';
  isEmpty: boolean;
  message: string;
  actionLabel: string;
  actionRoute: string;
}

/**
 * Check if medications are empty and return empty state info
 */
export async function checkMedicationsEmpty(): Promise<EmptyStateInfo> {
  const medications = await getMedications();
  const activeMeds = medications.filter(m => m.active !== false);

  return {
    type: 'medications',
    isEmpty: activeMeds.length === 0,
    message: 'No medications set up yet',
    actionLabel: 'Add medication',
    actionRoute: '/medication-form',
  };
}

/**
 * Check if appointments are empty and return empty state info
 */
export async function checkAppointmentsEmpty(): Promise<EmptyStateInfo> {
  const appointments = await getUpcomingAppointments();

  return {
    type: 'appointments',
    isEmpty: appointments.length === 0,
    message: 'No appointments scheduled',
    actionLabel: 'Add appointment',
    actionRoute: '/appointment-form',
  };
}

// ============================================================================
// FIX ACTIONS
// ============================================================================

/**
 * Remove an item from a CarePlan routine
 * Returns updated CarePlan or null if no change needed
 */
export function removeItemFromCarePlan(
  carePlan: CarePlan,
  routineId: string,
  itemId: string
): CarePlan {
  return {
    ...carePlan,
    updatedAt: new Date().toISOString(),
    routines: carePlan.routines.map(routine => {
      if (routine.id !== routineId) return routine;
      return {
        ...routine,
        items: routine.items.filter(item => item.id !== itemId),
      };
    }),
  };
}

/**
 * Remove a medication reference from a CarePlan item
 */
export function removeMedicationReference(
  carePlan: CarePlan,
  routineId: string,
  itemId: string,
  medicationId: string
): CarePlan {
  return {
    ...carePlan,
    updatedAt: new Date().toISOString(),
    routines: carePlan.routines.map(routine => {
      if (routine.id !== routineId) return routine;
      return {
        ...routine,
        items: routine.items.map(item => {
          if (item.id !== itemId || !item.metadata?.medicationIds) return item;
          return {
            ...item,
            metadata: {
              ...item.metadata,
              medicationIds: item.metadata.medicationIds.filter(id => id !== medicationId),
            },
          };
        }),
      };
    }),
  };
}
