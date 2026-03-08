// ============================================================================
// MEDICATION FORM STATE HOOK
// Consolidated useReducer for all medication form state
// ============================================================================

import { useReducer, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  createMedication,
  updateMedication,
  getMedications,
  Medication,
} from '../utils/medicationStorage';
import {
  getActiveCarePlan,
  createCarePlan,
  upsertCarePlanItem,
  listCarePlanItems,
  DEFAULT_PATIENT_ID,
} from '../storage/carePlanRepo';
import {
  addMedicationToPlan,
  updateMedicationInPlan,
  getMedicationsFromPlan,
  getOrCreateCarePlanConfig,
} from '../storage/carePlanConfigRepo';
import {
  MedicationPlanItem,
  TimeOfDay,
  normalizeToHHmm,
  ReminderTiming,
  FollowUpInterval,
  ScheduleFrequency,
  ScheduleEndCondition,
} from '../types/carePlanConfig';
import {
  CarePlanItem,
  TimeWindow,
  TimeWindowLabel,
} from '../types/carePlan';
import { generateUniqueId } from '../utils/idGenerator';
import { logError } from '../utils/devLog';
import { emitDataUpdate } from '../lib/events';
import { EVENT } from '../lib/eventNames';
import {
  TimeSlot,
  TIME_SLOTS,
  TIME_SLOT_TO_WINDOW,
  convertTo12Hour,
  convertTo24Hour,
  createTimeWindowForSlot,
  syncMedicationToCarePlan,
} from '../components/medication/medicationFormHelpers';

// ============================================================================
// STATE
// ============================================================================

export interface MedicationFormState {
  // Basic fields
  name: string;
  dosage: string;
  selectedTimeSlot: TimeSlot;
  customTime: string;
  customTimeDisplay: string;
  notes: string;
  daysSupply: string;

  // Reminders
  reminderEnabled: boolean;
  reminderTiming: ReminderTiming;
  reminderCustomMinutes: string;
  followUpEnabled: boolean;
  followUpInterval: FollowUpInterval;

  // Schedule
  scheduleFrequency: ScheduleFrequency;
  scheduleDaysOfWeek: number[];
  scheduleEndCondition: ScheduleEndCondition;

  // UI
  saving: boolean;
  formStep: 1 | 2;
  showMedSuggestions: boolean;
  showDosageSuggestions: boolean;
  medSuggestions: Array<{ name: string; commonDosages: string[] }>;
  dosageSuggestions: string[];
}

const initialState: MedicationFormState = {
  name: '',
  dosage: '',
  selectedTimeSlot: 'morning',
  customTime: '08:00',
  customTimeDisplay: '8:00 AM',
  notes: '',
  daysSupply: '30',

  reminderEnabled: true,
  reminderTiming: 'at_time',
  reminderCustomMinutes: '15',
  followUpEnabled: false,
  followUpInterval: 30,

  scheduleFrequency: 'daily',
  scheduleDaysOfWeek: [0, 1, 2, 3, 4, 5, 6],
  scheduleEndCondition: 'ongoing',

  saving: false,
  formStep: 1,
  showMedSuggestions: false,
  showDosageSuggestions: false,
  medSuggestions: [],
  dosageSuggestions: [],
};

// ============================================================================
// ACTIONS
// ============================================================================

type MedicationFormAction =
  | { type: 'SET_FIELD'; field: keyof MedicationFormState; value: any }
  | { type: 'SELECT_MEDICATION'; name: string; commonDosages: string[] }
  | { type: 'SELECT_TIME_SLOT'; slot: TimeSlot }
  | { type: 'SET_FREQUENCY'; frequency: ScheduleFrequency }
  | { type: 'LOAD_MEDICATION'; data: Partial<MedicationFormState> }
  | { type: 'SET_SAVING'; saving: boolean }
  | { type: 'UPDATE_MED_SUGGESTIONS'; suggestions: Array<{ name: string; commonDosages: string[] }> };

function medicationFormReducer(
  state: MedicationFormState,
  action: MedicationFormAction
): MedicationFormState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };

    case 'SELECT_MEDICATION':
      return {
        ...state,
        name: action.name,
        showMedSuggestions: false,
        dosageSuggestions: action.commonDosages,
        showDosageSuggestions: true,
      };

    case 'SELECT_TIME_SLOT': {
      const slot = TIME_SLOTS.find(s => s.key === action.slot);
      return {
        ...state,
        selectedTimeSlot: action.slot,
        customTime: slot?.defaultTime || state.customTime,
        customTimeDisplay: slot?.displayTime || state.customTimeDisplay,
      };
    }

    case 'SET_FREQUENCY': {
      let days = state.scheduleDaysOfWeek;
      if (action.frequency === 'weekly') {
        days = [new Date().getDay()];
      } else if (action.frequency === 'daily') {
        days = [0, 1, 2, 3, 4, 5, 6];
      }
      return {
        ...state,
        scheduleFrequency: action.frequency,
        scheduleDaysOfWeek: days,
      };
    }

    case 'LOAD_MEDICATION':
      return { ...state, ...action.data };

    case 'SET_SAVING':
      return { ...state, saving: action.saving };

    case 'UPDATE_MED_SUGGESTIONS':
      return {
        ...state,
        medSuggestions: action.suggestions,
        showMedSuggestions: action.suggestions.length > 0,
      };

    default:
      return state;
  }
}

// ============================================================================
// HOOK
// ============================================================================

export function useMedicationForm() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const medId = params.id as string | undefined;
  const source = params.source as string | undefined;
  const isCarePlanSource = source === 'careplan';
  const isEditing = !!medId;

  const [state, dispatch] = useReducer(medicationFormReducer, initialState);

  // Load existing medication for editing
  useEffect(() => {
    if (isEditing) {
      loadMedication();
    }
  }, [medId, isCarePlanSource]);

  const loadMedication = async () => {
    if (!medId) return;
    try {
      if (isCarePlanSource) {
        const planMeds = await getMedicationsFromPlan(DEFAULT_PATIENT_ID);
        const med = planMeds.find(m => m.id === medId);
        if (med) {
          const time = med.scheduledTimeHHmm || med.customTimes?.[0] || '08:00';
          const todToSlot: Record<TimeOfDay, TimeSlot> = {
            morning: 'morning',
            midday: 'afternoon',
            evening: 'evening',
            night: 'bedtime',
            custom: 'morning',
          };
          dispatch({
            type: 'LOAD_MEDICATION',
            data: {
              name: med.name,
              dosage: med.dosage,
              customTime: time,
              customTimeDisplay: convertTo12Hour(time),
              notes: med.instructions || '',
              daysSupply: med.daysSupply?.toString() || '30',
              reminderEnabled: med.notificationsEnabled !== false,
              reminderTiming: med.reminderTiming || 'at_time',
              reminderCustomMinutes: med.reminderCustomMinutes?.toString() || '15',
              followUpEnabled: med.followUpEnabled || false,
              followUpInterval: med.followUpInterval || 30,
              scheduleFrequency: med.scheduleFrequency || 'daily',
              scheduleDaysOfWeek: med.scheduleDaysOfWeek || [0, 1, 2, 3, 4, 5, 6],
              scheduleEndCondition: med.scheduleEndCondition || 'ongoing',
              selectedTimeSlot: med.timesOfDay?.[0]
                ? (todToSlot[med.timesOfDay[0]] || 'morning')
                : 'morning',
            },
          });
        }
      } else {
        const meds = await getMedications();
        const med = meds.find(m => m.id === medId);
        if (med) {
          const mins = med.reminderMinutesBefore || 0;
          let timing: ReminderTiming = 'at_time';
          if (mins === 0) timing = 'at_time';
          else if (mins <= 15) timing = 'before_15';
          else if (mins <= 30) timing = 'before_30';
          else if (mins <= 60) timing = 'before_60';
          else timing = 'custom';

          const timeSlot = TIME_SLOTS.find(slot => slot.defaultTime === med.time);
          dispatch({
            type: 'LOAD_MEDICATION',
            data: {
              name: med.name,
              dosage: med.dosage,
              customTime: med.time,
              customTimeDisplay: convertTo12Hour(med.time),
              notes: med.notes || '',
              daysSupply: med.daysSupply?.toString() || '30',
              reminderEnabled: med.reminderEnabled !== false,
              reminderTiming: timing,
              reminderCustomMinutes: timing === 'custom' ? mins.toString() : '15',
              selectedTimeSlot: timeSlot?.key || 'morning',
            },
          });
        }
      }
    } catch (error) {
      logError('useMedicationForm.loadMedication', error);
    }
  };

  // Validate and save
  const handleSave = useCallback(async () => {
    if (state.saving) return;

    if (!state.name.trim()) {
      Alert.alert('Required Field', 'Please enter a medication name');
      return;
    }
    if (state.name.trim().length < 2) {
      Alert.alert('Invalid Name', 'Medication name must be at least 2 characters');
      return;
    }
    if (!state.dosage.trim()) {
      Alert.alert('Required Field', 'Please enter the dosage (e.g., 10mg, 500mcg)');
      return;
    }
    if (!/\d+/.test(state.dosage)) {
      Alert.alert('Invalid Dosage', 'Dosage must include a number (e.g., 10mg, 500mcg)');
      return;
    }
    const supplyDays = parseInt(state.daysSupply);
    if (isNaN(supplyDays) || supplyDays < 1 || supplyDays > 365) {
      Alert.alert('Invalid Supply', 'Days supply must be between 1 and 365');
      return;
    }
    if (!state.customTime || state.customTime.length === 0) {
      Alert.alert('Invalid Time', 'Please select a valid time');
      return;
    }

    dispatch({ type: 'SET_SAVING', saving: true });
    try {
      const slotToTimeOfDay: Record<TimeSlot, TimeOfDay> = {
        morning: 'morning',
        afternoon: 'midday',
        evening: 'evening',
        bedtime: 'night',
      };

      const getLegacyReminderMinutes = (): number => {
        const timingMinutes: Record<ReminderTiming, number> = {
          at_time: 0,
          before_15: 15,
          before_30: 30,
          before_60: 60,
          custom: parseInt(state.reminderCustomMinutes) || 15,
        };
        return timingMinutes[state.reminderTiming];
      };

      if (isCarePlanSource) {
        const canonicalTime = normalizeToHHmm(state.customTime);
        const planMedData: Omit<MedicationPlanItem, 'id' | 'createdAt' | 'updatedAt'> = {
          name: state.name.trim(),
          dosage: state.dosage.trim(),
          instructions: state.notes.trim(),
          timesOfDay: [slotToTimeOfDay[state.selectedTimeSlot]],
          customTimes: canonicalTime ? [canonicalTime] : [],
          scheduledTimeHHmm: canonicalTime,
          supplyEnabled: true,
          daysSupply: parseInt(state.daysSupply) || 30,
          refillThresholdDays: 7,
          active: true,
          notificationsEnabled: state.reminderEnabled,
          reminderTiming: state.reminderEnabled ? state.reminderTiming : undefined,
          reminderCustomMinutes: state.reminderTiming === 'custom' ? parseInt(state.reminderCustomMinutes) || 15 : undefined,
          followUpEnabled: state.reminderEnabled ? state.followUpEnabled : false,
          followUpInterval: state.followUpEnabled ? state.followUpInterval : undefined,
          followUpMaxAttempts: state.followUpEnabled ? 3 : undefined,
          scheduleFrequency: state.scheduleFrequency,
          scheduleDaysOfWeek: state.scheduleFrequency === 'custom' || state.scheduleFrequency === 'weekly'
            ? state.scheduleDaysOfWeek
            : undefined,
          scheduleEndCondition: state.scheduleEndCondition,
        };

        if (isEditing && medId) {
          await updateMedicationInPlan(DEFAULT_PATIENT_ID, medId, planMedData);
        } else {
          await addMedicationToPlan(DEFAULT_PATIENT_ID, planMedData);
        }

        // Sync to legacy storage
        const legacyData: Omit<Medication, 'id' | 'createdAt'> = {
          name: state.name.trim(),
          dosage: state.dosage.trim(),
          time: state.customTime,
          timeSlot: state.selectedTimeSlot,
          notes: state.notes.trim(),
          daysSupply: parseInt(state.daysSupply) || 30,
          reminderEnabled: state.reminderEnabled,
          reminderMinutesBefore: state.reminderEnabled ? getLegacyReminderMinutes() : undefined,
          active: true,
          taken: false,
        };

        if (isEditing && medId) {
          try {
            await updateMedication(medId, legacyData as Partial<Medication>);
          } catch (e) {
            // Legacy record may not exist
          }
        } else {
          await createMedication(legacyData);
        }
      } else {
        // Legacy flow
        const medData: Omit<Medication, 'id' | 'createdAt'> = {
          name: state.name.trim(),
          dosage: state.dosage.trim(),
          time: state.customTime,
          timeSlot: state.selectedTimeSlot,
          notes: state.notes.trim(),
          daysSupply: parseInt(state.daysSupply) || 30,
          reminderEnabled: state.reminderEnabled,
          reminderMinutesBefore: state.reminderEnabled ? getLegacyReminderMinutes() : undefined,
          active: true,
          taken: false,
        };

        let medicationId = medId;
        if (isEditing && medId) {
          await updateMedication(medId, medData as Partial<Medication>);
        } else {
          const createdMed = await createMedication(medData);
          medicationId = createdMed.id;
        }

        await syncMedicationToCarePlan(medicationId!, {
          name: state.name.trim(),
          dosage: state.dosage.trim(),
          time: state.customTime,
          timeSlot: state.selectedTimeSlot,
          notes: state.notes.trim(),
          active: true,
          scheduleFrequency: state.scheduleFrequency,
          scheduleDaysOfWeek: state.scheduleDaysOfWeek,
        });
      }

      emitDataUpdate(EVENT.MEDICATION);
      emitDataUpdate(EVENT.CARE_PLAN_ITEMS);
      emitDataUpdate(EVENT.DAILY_INSTANCES);
      router.back();
    } catch (error) {
      dispatch({ type: 'SET_SAVING', saving: false });
      logError('useMedicationForm.handleSave', error);
      Alert.alert('Error', 'Failed to save medication');
    }
  }, [state, isCarePlanSource, isEditing, medId, router]);

  // Handle custom time input
  const handleCustomTimeChange = useCallback((text: string) => {
    dispatch({ type: 'SET_FIELD', field: 'customTimeDisplay', value: text });
    dispatch({ type: 'SET_FIELD', field: 'customTime', value: convertTo24Hour(text) });
  }, []);

  return {
    state,
    dispatch,
    isEditing,
    isCarePlanSource,
    handleSave,
    handleCustomTimeChange,
  };
}
