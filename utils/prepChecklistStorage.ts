// ============================================================================
// PREP CHECKLIST STORAGE
// Auto-generated and custom prep checklists for appointments
// ============================================================================

import {
  PrepChecklistItem,
  AppointmentPrepChecklist,
  getDefaultPrepChecklist,
} from '../types/schedule';
import { Appointment } from './appointmentStorage';
import { getMedications } from './medicationStorage';
import { getTodayVitalsLog } from './centralStorage';
import { logError } from './devLog';
import { StorageKeys } from './storageKeys';
import { safeGetItem, safeSetItem } from './safeStorage';

const PREP_CHECKLIST_KEY = StorageKeys.PREP_CHECKLISTS;

// ============================================================================
// STORAGE OPERATIONS
// ============================================================================

/**
 * Get all stored prep checklists
 */
async function getAllChecklists(): Promise<Record<string, AppointmentPrepChecklist>> {
  try {
    return await safeGetItem<Record<string, AppointmentPrepChecklist>>(PREP_CHECKLIST_KEY, {});
  } catch (error) {
    logError('prepChecklistStorage.getAllChecklists', error);
    return {};
  }
}

/**
 * Save all prep checklists
 */
async function saveAllChecklists(
  checklists: Record<string, AppointmentPrepChecklist>
): Promise<void> {
  try {
    await safeSetItem(PREP_CHECKLIST_KEY, checklists);
  } catch (error) {
    logError('prepChecklistStorage.saveAllChecklists', error);
  }
}

/**
 * Get prep checklist for an appointment
 * Creates a new one if it doesn't exist
 */
export async function getPrepChecklist(
  appointment: Appointment
): Promise<AppointmentPrepChecklist> {
  const checklists = await getAllChecklists();

  if (checklists[appointment.id]) {
    return checklists[appointment.id];
  }

  // Generate a new checklist
  const newChecklist = await generatePrepChecklist(appointment);
  checklists[appointment.id] = newChecklist;
  await saveAllChecklists(checklists);

  return newChecklist;
}

/**
 * Update a prep checklist item
 */
export async function updatePrepChecklistItem(
  appointmentId: string,
  itemId: string,
  checked: boolean
): Promise<AppointmentPrepChecklist | null> {
  const checklists = await getAllChecklists();

  if (!checklists[appointmentId]) {
    return null;
  }

  const checklist = checklists[appointmentId];
  const itemIndex = checklist.items.findIndex(item => item.id === itemId);

  if (itemIndex === -1) {
    return null;
  }

  checklist.items[itemIndex].checked = checked;
  checklist.updatedAt = new Date().toISOString();

  checklists[appointmentId] = checklist;
  await saveAllChecklists(checklists);

  return checklist;
}

/**
 * Add a custom item to a prep checklist
 */
export async function addCustomPrepItem(
  appointmentId: string,
  label: string
): Promise<AppointmentPrepChecklist | null> {
  const checklists = await getAllChecklists();

  if (!checklists[appointmentId]) {
    return null;
  }

  const checklist = checklists[appointmentId];
  const newItem: PrepChecklistItem = {
    id: `custom-${Date.now()}`,
    label,
    checked: false,
    source: 'custom',
  };

  checklist.items.push(newItem);
  checklist.updatedAt = new Date().toISOString();

  checklists[appointmentId] = checklist;
  await saveAllChecklists(checklists);

  return checklist;
}

/**
 * Remove a custom item from a prep checklist
 */
export async function removeCustomPrepItem(
  appointmentId: string,
  itemId: string
): Promise<AppointmentPrepChecklist | null> {
  const checklists = await getAllChecklists();

  if (!checklists[appointmentId]) {
    return null;
  }

  const checklist = checklists[appointmentId];
  const item = checklist.items.find(i => i.id === itemId);

  // Only allow removing custom items
  if (!item || item.source !== 'custom') {
    return checklist;
  }

  checklist.items = checklist.items.filter(i => i.id !== itemId);
  checklist.updatedAt = new Date().toISOString();

  checklists[appointmentId] = checklist;
  await saveAllChecklists(checklists);

  return checklist;
}

/**
 * Delete a prep checklist (when appointment is deleted)
 */
export async function deletePrepChecklist(appointmentId: string): Promise<void> {
  const checklists = await getAllChecklists();
  delete checklists[appointmentId];
  await saveAllChecklists(checklists);
}

// ============================================================================
// CHECKLIST GENERATION
// ============================================================================

/**
 * Generate a prep checklist for an appointment
 * Includes default items + smart items based on care plan data
 */
export async function generatePrepChecklist(
  appointment: Appointment
): Promise<AppointmentPrepChecklist> {
  const now = new Date().toISOString();

  // Start with default items for the specialty
  const defaultItems = getDefaultPrepChecklist(appointment.specialty);

  // Get smart items based on user data
  const smartItems = await generateSmartPrepItems(appointment);

  // Merge, avoiding duplicates
  const allItems = [...defaultItems];
  for (const smartItem of smartItems) {
    if (!allItems.some(item => item.id === smartItem.id)) {
      allItems.push(smartItem);
    }
  }

  return {
    appointmentId: appointment.id,
    items: allItems,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Generate smart prep items based on user's care plan data
 */
async function generateSmartPrepItems(
  appointment: Appointment
): Promise<PrepChecklistItem[]> {
  const items: PrepChecklistItem[] = [];

  try {
    // Check if user has medications
    const medications = await getMedications();
    if (medications.length > 0) {
      items.push({
        id: 'smart-meds-count',
        label: `Review ${medications.length} current medications`,
        emoji: '💊',
        checked: false,
        source: 'auto',
      });
    }

    // Check if user has recent vitals
    const vitalsLog = await getTodayVitalsLog();
    if (vitalsLog) {
      items.push({
        id: 'smart-vitals-recent',
        label: 'Vitals logged today - bring printout',
        emoji: '📊',
        checked: false,
        source: 'auto',
      });
    }

    // Add specialty-specific smart items
    const specialty = appointment.specialty.toLowerCase();

    if (specialty.includes('cardio')) {
      if (!vitalsLog) {
        items.push({
          id: 'smart-bp-before',
          label: 'Log blood pressure before appointment',
          emoji: '🩺',
          checked: false,
          source: 'auto',
        });
      }
    }

    if (specialty.includes('endocrin') || specialty.includes('diabetes')) {
      items.push({
        id: 'smart-glucose-log',
        label: 'Bring glucose readings from past week',
        emoji: '🩸',
        checked: false,
        source: 'auto',
      });
    }

  } catch (error) {
    logError('prepChecklistStorage.generateSmartPrepItems', error);
  }

  return items;
}

// ============================================================================
// CHECKLIST PROGRESS
// ============================================================================

/**
 * Get completion progress for a prep checklist
 */
export function getChecklistProgress(checklist: AppointmentPrepChecklist): {
  completed: number;
  total: number;
  percentage: number;
  isComplete: boolean;
} {
  const completed = checklist.items.filter(item => item.checked).length;
  const total = checklist.items.length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    completed,
    total,
    percentage,
    isComplete: completed === total && total > 0,
  };
}

/**
 * Check if an appointment has a prep checklist started
 */
export async function hasStartedPrep(appointmentId: string): Promise<boolean> {
  const checklists = await getAllChecklists();
  const checklist = checklists[appointmentId];

  if (!checklist) return false;

  return checklist.items.some(item => item.checked);
}
