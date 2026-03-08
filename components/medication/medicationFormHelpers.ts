// ============================================================================
// MEDICATION FORM HELPERS
// Constants and utility functions shared across medication form components
// ============================================================================

import {
  getActiveCarePlan,
  createCarePlan,
  upsertCarePlanItem,
  listCarePlanItems,
  DEFAULT_PATIENT_ID,
} from '../../storage/carePlanRepo';
import {
  CarePlanItem,
  TimeWindow,
  TimeWindowLabel,
} from '../../types/carePlan';
import { ScheduleFrequency } from '../../types/carePlanConfig';
import { generateUniqueId } from '../../utils/idGenerator';

// ============================================================================
// TYPES
// ============================================================================

export type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'bedtime';

// ============================================================================
// CONSTANTS
// ============================================================================

export const COMMON_MEDICATIONS = [
  { name: 'Amlodipine', commonDosages: ['2.5mg', '5mg', '10mg'] },
  { name: 'Aspirin', commonDosages: ['81mg', '325mg'] },
  { name: 'Atorvastatin', commonDosages: ['10mg', '20mg', '40mg', '80mg'] },
  { name: 'Acetaminophen', commonDosages: ['325mg', '500mg', '650mg'] },
  { name: 'Clopidogrel', commonDosages: ['75mg'] },
  { name: 'Furosemide', commonDosages: ['20mg', '40mg', '80mg'] },
  { name: 'Gabapentin', commonDosages: ['100mg', '300mg', '600mg'] },
  { name: 'Hydrochlorothiazide', commonDosages: ['12.5mg', '25mg', '50mg'] },
  { name: 'Ibuprofen', commonDosages: ['200mg', '400mg', '600mg', '800mg'] },
  { name: 'Insulin', commonDosages: ['10 units', '15 units', '20 units'] },
  { name: 'Levothyroxine', commonDosages: ['25mcg', '50mcg', '75mcg', '100mcg', '125mcg'] },
  { name: 'Lisinopril', commonDosages: ['5mg', '10mg', '20mg', '40mg'] },
  { name: 'Losartan', commonDosages: ['25mg', '50mg', '100mg'] },
  { name: 'Metformin', commonDosages: ['500mg', '850mg', '1000mg'] },
  { name: 'Metoprolol', commonDosages: ['25mg', '50mg', '100mg'] },
  { name: 'Omeprazole', commonDosages: ['20mg', '40mg'] },
  { name: 'Prednisone', commonDosages: ['5mg', '10mg', '20mg', '50mg'] },
  { name: 'Warfarin', commonDosages: ['1mg', '2mg', '2.5mg', '5mg', '10mg'] },
].sort((a, b) => a.name.localeCompare(b.name));

export const TIME_SLOTS: {
  key: TimeSlot;
  label: string;
  icon: string;
  time: string;
  defaultTime: string;
  displayTime: string;
}[] = [
  { key: 'morning', label: 'AM', icon: '🌅', time: '8:00', defaultTime: '08:00', displayTime: '8:00 AM' },
  { key: 'afternoon', label: 'PM', icon: '☀️', time: '1:00', defaultTime: '13:00', displayTime: '1:00 PM' },
  { key: 'evening', label: 'PM', icon: '🌆', time: '6:00', defaultTime: '18:00', displayTime: '6:00 PM' },
  { key: 'bedtime', label: 'PM', icon: '🌙', time: '10:00', defaultTime: '22:00', displayTime: '10:00 PM' },
];

export const TIME_SLOT_TO_WINDOW: Record<TimeSlot, TimeWindowLabel> = {
  morning: 'morning',
  afternoon: 'afternoon',
  evening: 'evening',
  bedtime: 'night',
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const convertTo12Hour = (time24: string): string => {
  if (!time24 || typeof time24 !== 'string') return 'Time not set';
  const parts = time24.split(':');
  if (parts.length < 2) return 'Time not set';
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return 'Time not set';
  }
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

export const convertTo24Hour = (time12: string): string => {
  const match = time12.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return time12;
  let [, hours, minutes, period] = match;
  let hour = parseInt(hours);
  if (period.toUpperCase() === 'PM' && hour !== 12) hour += 12;
  if (period.toUpperCase() === 'AM' && hour === 12) hour = 0;
  return `${hour.toString().padStart(2, '0')}:${minutes}`;
};

export function createTimeWindowForSlot(timeSlot: TimeSlot, customTime: string): TimeWindow {
  const windowLabel = TIME_SLOT_TO_WINDOW[timeSlot];
  return {
    id: generateUniqueId(),
    kind: 'exact',
    label: windowLabel,
    at: customTime,
  };
}

// ============================================================================
// CARE PLAN SYNC
// ============================================================================

export async function syncMedicationToCarePlan(
  medicationId: string,
  medData: {
    name: string;
    dosage: string;
    time: string;
    timeSlot: TimeSlot;
    notes: string;
    active: boolean;
    scheduleFrequency: ScheduleFrequency;
    scheduleDaysOfWeek?: number[];
  }
): Promise<void> {
  const now = new Date().toISOString();

  let carePlan = await getActiveCarePlan(DEFAULT_PATIENT_ID);
  if (!carePlan) {
    carePlan = await createCarePlan(DEFAULT_PATIENT_ID);
  }

  const existingItems = await listCarePlanItems(carePlan.id);
  let existingItem = existingItems.find(
    item => item.type === 'medication' && item.medicationDetails?.medicationId === medicationId
  );

  let frequency: 'daily' | 'weekly' | 'custom' = 'daily';
  let daysOfWeek: number[] | undefined;

  if (medData.scheduleFrequency === 'daily') {
    frequency = 'daily';
    daysOfWeek = [0, 1, 2, 3, 4, 5, 6];
  } else if (medData.scheduleFrequency === 'every_other_day') {
    frequency = 'custom';
    daysOfWeek = [0, 2, 4, 6];
  } else if (medData.scheduleFrequency === 'weekly') {
    frequency = 'weekly';
    daysOfWeek = medData.scheduleDaysOfWeek || [new Date().getDay()];
  } else if (medData.scheduleFrequency === 'custom') {
    frequency = 'custom';
    daysOfWeek = medData.scheduleDaysOfWeek || [0, 1, 2, 3, 4, 5, 6];
  }

  const timeWindow = createTimeWindowForSlot(medData.timeSlot, medData.time);

  const carePlanItem: CarePlanItem = {
    id: existingItem?.id || generateUniqueId(),
    carePlanId: carePlan.id,
    type: 'medication',
    name: `${medData.name} ${medData.dosage}`,
    instructions: medData.notes || undefined,
    priority: 'required',
    active: medData.active,
    schedule: {
      frequency,
      times: [timeWindow],
      daysOfWeek,
    },
    medicationDetails: {
      medicationId,
      dose: medData.dosage,
      instructions: medData.notes || undefined,
    },
    emoji: '💊',
    createdAt: existingItem?.createdAt || now,
    updatedAt: now,
  };

  await upsertCarePlanItem(carePlanItem);
}
