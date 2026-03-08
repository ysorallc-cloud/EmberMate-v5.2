// ============================================================================
// MEDICATION FORM SCREEN
// Add or edit medication schedules (Step 0: Plan)
// Accessed from medication-schedule screen
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  Switch,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import { SubScreenHeader } from '../components/SubScreenHeader';
import {
  createMedication,
  updateMedication,
  getMedications,
  Medication
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
  REMINDER_TIMING_OPTIONS,
  FollowUpInterval,
  FOLLOW_UP_OPTIONS,
  ScheduleFrequency,
  SCHEDULE_FREQUENCY_OPTIONS,
  ScheduleEndCondition,
  SCHEDULE_END_OPTIONS,
  DAYS_OF_WEEK,
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

type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'bedtime';

// Common medications database for autocomplete
const COMMON_MEDICATIONS = [
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

// Helper function to convert 24-hour to 12-hour format (with NaN protection)
const convertTo12Hour = (time24: string): string => {
  if (!time24 || typeof time24 !== 'string') return 'Time not set';

  const parts = time24.split(':');
  if (parts.length < 2) return 'Time not set';

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  // Validate to prevent NaN
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return 'Time not set';
  }

  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

// Helper function to convert 12-hour to 24-hour format
const convertTo24Hour = (time12: string): string => {
  const match = time12.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return time12; // Return as-is if not valid format
  
  let [, hours, minutes, period] = match;
  let hour = parseInt(hours);
  
  if (period.toUpperCase() === 'PM' && hour !== 12) hour += 12;
  if (period.toUpperCase() === 'AM' && hour === 12) hour = 0;
  
  return `${hour.toString().padStart(2, '0')}:${minutes}`;
};

const TIME_SLOTS: { key: TimeSlot; label: string; icon: string; time: string; defaultTime: string; displayTime: string }[] = [
  { key: 'morning', label: 'AM', icon: '🌅', time: '8:00', defaultTime: '08:00', displayTime: '8:00 AM' },
  { key: 'afternoon', label: 'PM', icon: '☀️', time: '1:00', defaultTime: '13:00', displayTime: '1:00 PM' },
  { key: 'evening', label: 'PM', icon: '🌆', time: '6:00', defaultTime: '18:00', displayTime: '6:00 PM' },
  { key: 'bedtime', label: 'PM', icon: '🌙', time: '10:00', defaultTime: '22:00', displayTime: '10:00 PM' },
];

// Map medication timeSlot to TimeWindowLabel for CarePlanItem
const TIME_SLOT_TO_WINDOW: Record<TimeSlot, TimeWindowLabel> = {
  morning: 'morning',
  afternoon: 'afternoon',
  evening: 'evening',
  bedtime: 'night',
};

// Helper to create a TimeWindow for the CarePlanItem schedule
function createTimeWindowForSlot(timeSlot: TimeSlot, customTime: string): TimeWindow {
  const windowLabel = TIME_SLOT_TO_WINDOW[timeSlot];
  return {
    id: generateUniqueId(),
    kind: 'exact',
    label: windowLabel,
    at: customTime, // HH:mm format
  };
}

// Sync a medication to the CarePlan regimen system
async function syncMedicationToCarePlan(
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

  // Get or create the active CarePlan
  let carePlan = await getActiveCarePlan(DEFAULT_PATIENT_ID);
  if (!carePlan) {
    carePlan = await createCarePlan(DEFAULT_PATIENT_ID);
  }

  // Check if there's already a CarePlanItem for this medication
  const existingItems = await listCarePlanItems(carePlan.id);
  let existingItem = existingItems.find(
    item => item.type === 'medication' && item.medicationDetails?.medicationId === medicationId
  );

  // Map schedule frequency to CarePlanItem frequency
  let frequency: 'daily' | 'weekly' | 'custom' = 'daily';
  let daysOfWeek: number[] | undefined;

  if (medData.scheduleFrequency === 'daily') {
    frequency = 'daily';
    daysOfWeek = [0, 1, 2, 3, 4, 5, 6];
  } else if (medData.scheduleFrequency === 'every_other_day') {
    frequency = 'custom';
    // Calculate alternating days starting from today
    daysOfWeek = [0, 2, 4, 6]; // Sun, Tue, Thu, Sat
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

export default function MedicationFormScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const params = useLocalSearchParams();
  const medId = params.id as string | undefined;
  const source = params.source as string | undefined; // 'careplan' when from Care Plan config
  const isCarePlanSource = source === 'careplan';
  const isEditing = !!medId;

  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot>('morning');
  const [customTime, setCustomTime] = useState('8:00 AM');
  const [customTimeDisplay, setCustomTimeDisplay] = useState('8:00 AM');
  const [notes, setNotes] = useState('');
  const [daysSupply, setDaysSupply] = useState('30');

  // === REMINDERS STATE ===
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderTiming, setReminderTiming] = useState<ReminderTiming>('at_time');
  const [reminderCustomMinutes, setReminderCustomMinutes] = useState('15');
  const [followUpEnabled, setFollowUpEnabled] = useState(false);
  const [followUpInterval, setFollowUpInterval] = useState<FollowUpInterval>(30);

  // === SCHEDULE STATE ===
  const [scheduleFrequency, setScheduleFrequency] = useState<ScheduleFrequency>('daily');
  const [scheduleDaysOfWeek, setScheduleDaysOfWeek] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [scheduleEndCondition, setScheduleEndCondition] = useState<ScheduleEndCondition>('ongoing');

  const [saving, setSaving] = useState(false);
  const [formStep, setFormStep] = useState<1 | 2>(1);
  const [showMedDropdown, setShowMedDropdown] = useState(false);
  const [showDosageDropdown, setShowDosageDropdown] = useState(false);
  const [selectedMedEntry, setSelectedMedEntry] = useState<typeof COMMON_MEDICATIONS[0] | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (isEditing) {
      loadMedication();
    }
  }, [medId, isCarePlanSource]);

  const loadMedication = async () => {
    if (!medId) return;
    try {
      if (isCarePlanSource) {
        // Load from CarePlanConfig
        const planMeds = await getMedicationsFromPlan(DEFAULT_PATIENT_ID);
        const med = planMeds.find(m => m.id === medId);
        if (med) {
          setName(med.name);
          setDosage(med.dosage);
          // Prefer canonical scheduledTimeHHmm, fall back to customTimes
          const time = med.scheduledTimeHHmm || med.customTimes?.[0] || '08:00';
          const displayTime = convertTo12Hour(time);
          setCustomTime(time);
          setCustomTimeDisplay(displayTime);
          setNotes(med.instructions || '');
          setDaysSupply(med.daysSupply?.toString() || '30');

          // Load reminder settings
          setReminderEnabled(med.notificationsEnabled !== false);
          setReminderTiming(med.reminderTiming || 'at_time');
          setReminderCustomMinutes(med.reminderCustomMinutes?.toString() || '15');
          setFollowUpEnabled(med.followUpEnabled || false);
          setFollowUpInterval(med.followUpInterval || 30);

          // Load schedule settings
          setScheduleFrequency(med.scheduleFrequency || 'daily');
          setScheduleDaysOfWeek(med.scheduleDaysOfWeek || [0, 1, 2, 3, 4, 5, 6]);
          setScheduleEndCondition(med.scheduleEndCondition || 'ongoing');

          // Map TimeOfDay to TimeSlot
          const todToSlot: Record<TimeOfDay, TimeSlot> = {
            morning: 'morning',
            midday: 'afternoon',
            evening: 'evening',
            night: 'bedtime',
            custom: 'morning',
          };
          if (med.timesOfDay?.[0]) {
            setSelectedTimeSlot(todToSlot[med.timesOfDay[0]] || 'morning');
          }
        }
      } else {
        // Load from legacy medicationStorage
        const meds = await getMedications();
        const med = meds.find(m => m.id === medId);
        if (med) {
          setName(med.name);
          setDosage(med.dosage);
          const displayTime = convertTo12Hour(med.time);
          setCustomTime(med.time);
          setCustomTimeDisplay(displayTime);
          setNotes(med.notes || '');
          setDaysSupply(med.daysSupply?.toString() || '30');
          setReminderEnabled(med.reminderEnabled !== false);

          // Map legacy reminderMinutesBefore to new reminderTiming
          const mins = med.reminderMinutesBefore || 0;
          if (mins === 0) setReminderTiming('at_time');
          else if (mins <= 15) setReminderTiming('before_15');
          else if (mins <= 30) setReminderTiming('before_30');
          else if (mins <= 60) setReminderTiming('before_60');
          else {
            setReminderTiming('custom');
            setReminderCustomMinutes(mins.toString());
          }

          // Determine time slot from time
          const timeSlot = TIME_SLOTS.find(slot => slot.defaultTime === med.time);
          if (timeSlot) {
            setSelectedTimeSlot(timeSlot.key);
          }
        }
      }
    } catch (error) {
      logError('MedicationFormScreen.loadMedication', error);
    }
  };

  const handleSelectMedication = (medication: typeof COMMON_MEDICATIONS[0]) => {
    setName(medication.name);
    setSelectedMedEntry(medication);
    setShowMedDropdown(false);
    // Auto-select first dosage
    if (medication.commonDosages.length > 0) {
      setDosage(medication.commonDosages[0]);
    }
  };

  const handleSelectDosage = (selectedDosage: string) => {
    setDosage(selectedDosage);
    setShowDosageDropdown(false);
  };

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2500);
  }, []);

  const handleTimeSlotSelect = (slot: TimeSlot) => {
    setSelectedTimeSlot(slot);
    const selectedSlot = TIME_SLOTS.find(s => s.key === slot);
    if (selectedSlot) {
      setCustomTime(selectedSlot.defaultTime);
      setCustomTimeDisplay(selectedSlot.displayTime);
    }
  };

  const handleCustomTimeChange = (text: string) => {
    setCustomTimeDisplay(text);
    // Try to convert to 24-hour for storage
    const time24 = convertTo24Hour(text);
    setCustomTime(time24);
  };

  const handleSave = async () => {
    if (saving) return;

    // Validate medication name
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter a medication name');
      return;
    }

    if (name.trim().length < 2) {
      Alert.alert('Invalid Name', 'Medication name must be at least 2 characters');
      return;
    }

    // Validate dosage
    if (!dosage.trim()) {
      Alert.alert('Required Field', 'Please enter the dosage (e.g., 10mg, 500mcg)');
      return;
    }

    // Validate dosage format - should contain a number
    const dosagePattern = /\d+/;
    if (!dosagePattern.test(dosage)) {
      Alert.alert('Invalid Dosage', 'Dosage must include a number (e.g., 10mg, 500mcg)');
      return;
    }

    // Validate days supply
    const supplyDays = parseInt(daysSupply);
    if (isNaN(supplyDays) || supplyDays < 1 || supplyDays > 365) {
      Alert.alert('Invalid Supply', 'Days supply must be between 1 and 365');
      return;
    }

    // Validate time format
    if (!customTime || customTime.length === 0) {
      Alert.alert('Invalid Time', 'Please select a valid time');
      return;
    }

    setSaving(true);
    try {
      // Map TimeSlot to TimeOfDay for CarePlanConfig
      const slotToTimeOfDay: Record<TimeSlot, TimeOfDay> = {
        morning: 'morning',
        afternoon: 'midday',
        evening: 'evening',
        bedtime: 'night',
      };

      if (isCarePlanSource) {
        // Save to CarePlanConfig bucket system
        // Normalize the time to canonical HH:mm format
        const canonicalTime = normalizeToHHmm(customTime);

        const planMedData: Omit<MedicationPlanItem, 'id' | 'createdAt' | 'updatedAt'> = {
          name: name.trim(),
          dosage: dosage.trim(),
          instructions: notes.trim(),
          timesOfDay: [slotToTimeOfDay[selectedTimeSlot]],
          customTimes: canonicalTime ? [canonicalTime] : [],
          scheduledTimeHHmm: canonicalTime, // CANONICAL: validated "HH:mm" or null
          supplyEnabled: true,
          daysSupply: parseInt(daysSupply) || 30,
          refillThresholdDays: 7,
          active: true,

          // Reminder settings
          notificationsEnabled: reminderEnabled,
          reminderTiming: reminderEnabled ? reminderTiming : undefined,
          reminderCustomMinutes: reminderTiming === 'custom' ? parseInt(reminderCustomMinutes) || 15 : undefined,
          followUpEnabled: reminderEnabled ? followUpEnabled : false,
          followUpInterval: followUpEnabled ? followUpInterval : undefined,
          followUpMaxAttempts: followUpEnabled ? 3 : undefined,

          // Schedule settings
          scheduleFrequency,
          scheduleDaysOfWeek: scheduleFrequency === 'custom' || scheduleFrequency === 'weekly'
            ? scheduleDaysOfWeek
            : undefined,
          scheduleEndCondition,
        };

        if (isEditing && medId) {
          await updateMedicationInPlan(DEFAULT_PATIENT_ID, medId, planMedData);
        } else {
          await addMedicationToPlan(DEFAULT_PATIENT_ID, planMedData);
        }

        // Convert new reminderTiming to legacy reminderMinutesBefore
        const getLegacyReminderMinutes = (): number => {
          const timingMinutes: Record<ReminderTiming, number> = {
            at_time: 0,
            before_15: 15,
            before_30: 30,
            before_60: 60,
            custom: parseInt(reminderCustomMinutes) || 15,
          };
          return timingMinutes[reminderTiming];
        };

        // Also sync to legacy storage for backward compatibility
        const legacyData: Omit<Medication, 'id' | 'createdAt'> = {
          name: name.trim(),
          dosage: dosage.trim(),
          time: customTime,
          timeSlot: selectedTimeSlot,
          notes: notes.trim(),
          daysSupply: parseInt(daysSupply) || 30,
          reminderEnabled: reminderEnabled,
          reminderMinutesBefore: reminderEnabled ? getLegacyReminderMinutes() : undefined,
          active: true,
          taken: false,
        };

        if (isEditing && medId) {
          // Try to update legacy, ignore if not found
          try {
            await updateMedication(medId, legacyData as Partial<Medication>);
          } catch (e) {
            // Legacy record may not exist, that's OK
          }
        } else {
          await createMedication(legacyData);
        }
      } else {
        // Legacy flow - save to medicationStorage first
        // Convert new reminderTiming to legacy reminderMinutesBefore
        const getLegacyMinutes = (): number => {
          const timingMinutes: Record<ReminderTiming, number> = {
            at_time: 0,
            before_15: 15,
            before_30: 30,
            before_60: 60,
            custom: parseInt(reminderCustomMinutes) || 15,
          };
          return timingMinutes[reminderTiming];
        };

        const medData: Omit<Medication, 'id' | 'createdAt'> = {
          name: name.trim(),
          dosage: dosage.trim(),
          time: customTime,
          timeSlot: selectedTimeSlot,
          notes: notes.trim(),
          daysSupply: parseInt(daysSupply) || 30,
          reminderEnabled: reminderEnabled,
          reminderMinutesBefore: reminderEnabled ? getLegacyMinutes() : undefined,
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

        // Also create/update corresponding CarePlanItem for regimen system
        await syncMedicationToCarePlan(medicationId!, {
          name: name.trim(),
          dosage: dosage.trim(),
          time: customTime,
          timeSlot: selectedTimeSlot,
          notes: notes.trim(),
          active: true,
          scheduleFrequency,
          scheduleDaysOfWeek,
        });
      }

      emitDataUpdate(EVENT.MEDICATION);
      emitDataUpdate(EVENT.CARE_PLAN_ITEMS);
      emitDataUpdate(EVENT.DAILY_INSTANCES);
      showToast(`${name.trim()} ${dosage.trim()} ${isEditing ? 'updated' : 'added'}!`);
      setTimeout(() => router.back(), 1200);
    } catch (error) {
      setSaving(false);
      logError('MedicationFormScreen.handleSave', error);
      Alert.alert('Error', 'Failed to save medication');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        <SubScreenHeader title={isEditing ? 'Edit Medication' : 'Add Medication'} emoji="💊" />

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

          {/* Medication Name — Dropdown Selector */}
          <View style={[styles.formGroup, { zIndex: 30 }]}>
            <Text style={styles.label} accessibilityRole="text">Medication Name *</Text>
            <TouchableOpacity
              style={[styles.dropdownTrigger, showMedDropdown && styles.dropdownTriggerOpen]}
              onPress={() => { setShowMedDropdown(!showMedDropdown); setShowDosageDropdown(false); }}
              activeOpacity={0.7}
              accessibilityLabel={name ? `Selected medication: ${name}. Tap to change.` : 'Select medication'}
              accessibilityRole="button"
            >
              <Text style={[styles.dropdownTriggerText, !name && styles.dropdownPlaceholder]}>
                {name || 'Select medication...'}
              </Text>
              <Text style={[styles.dropdownArrow, showMedDropdown && styles.dropdownArrowOpen]}>{'\u25BC'}</Text>
            </TouchableOpacity>
            {showMedDropdown && (
              <ScrollView
                style={styles.dropdownList}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
              >
                {COMMON_MEDICATIONS.map((med, idx) => (
                  <TouchableOpacity
                    key={med.name}
                    style={[styles.dropdownItem, idx < COMMON_MEDICATIONS.length - 1 && styles.dropdownItemBorder]}
                    onPress={() => handleSelectMedication(med)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`${med.name}, ${med.commonDosages.length} dosages`}
                  >
                    <Text style={styles.dropdownItemText}>{med.name}</Text>
                    <Text style={styles.dropdownItemSubtext}>{med.commonDosages.length} dosages</Text>
                  </TouchableOpacity>
                ))}
                {/* Custom option */}
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    setShowMedDropdown(false);
                    setSelectedMedEntry(null);
                    setName('');
                    setDosage('');
                    // Use Alert.prompt on iOS, fallback on Android
                    if (Platform.OS === 'ios' && Alert.prompt) {
                      Alert.prompt(
                        'Custom Medication',
                        'Enter medication name:',
                        (text) => { if (text) setName(text); },
                      );
                    } else {
                      Alert.alert('Custom Medication', 'Enter a custom name using the full medication form.');
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dropdownItemText, { color: colors.accent }]}>+ Custom medication...</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>

          {/* Dosage — Dropdown Selector */}
          <View style={[styles.formGroup, { zIndex: 20 }]}>
            <Text style={styles.label} accessibilityRole="text">Dosage *</Text>
            {selectedMedEntry && selectedMedEntry.commonDosages.length > 0 ? (
              <>
                <TouchableOpacity
                  style={[styles.dropdownTrigger, showDosageDropdown && styles.dropdownTriggerOpen]}
                  onPress={() => { setShowDosageDropdown(!showDosageDropdown); setShowMedDropdown(false); }}
                  activeOpacity={0.7}
                  accessibilityLabel={dosage ? `Selected dosage: ${dosage}. Tap to change.` : 'Select dosage'}
                  accessibilityRole="button"
                >
                  <Text style={[styles.dropdownTriggerText, !dosage && styles.dropdownPlaceholder]}>
                    {dosage || 'Select dosage...'}
                  </Text>
                  <Text style={[styles.dropdownArrow, showDosageDropdown && styles.dropdownArrowOpen]}>{'\u25BC'}</Text>
                </TouchableOpacity>
                {showDosageDropdown && (
                  <ScrollView
                    style={styles.dropdownList}
                    nestedScrollEnabled={true}
                    keyboardShouldPersistTaps="handled"
                  >
                    {selectedMedEntry.commonDosages.map((dose, idx) => (
                      <TouchableOpacity
                        key={dose}
                        style={[styles.dropdownItem, idx < selectedMedEntry.commonDosages.length - 1 && styles.dropdownItemBorder]}
                        onPress={() => handleSelectDosage(dose)}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`Select dosage ${dose}`}
                      >
                        <Text style={styles.dropdownItemText}>{dose}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </>
            ) : (
              <TextInput
                style={styles.input}
                value={dosage}
                onChangeText={setDosage}
                placeholder={name ? 'Enter dosage (e.g., 10mg)' : 'Select medication first'}
                placeholderTextColor={colors.textMuted}
                autoCorrect={false}
                editable={!!name}
                accessibilityLabel="Dosage, required"
                accessibilityHint="Enter the medication dosage"
              />
            )}
          </View>

          {/* Time Slot Selection - Horizontal Icon Row */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Time of Day *</Text>
            <View style={styles.timeSlotRow}>
              {TIME_SLOTS.map(slot => (
                <TouchableOpacity
                  key={slot.key}
                  style={[
                    styles.timeSlotButton,
                    selectedTimeSlot === slot.key && styles.timeSlotButtonActive
                  ]}
                  onPress={() => handleTimeSlotSelect(slot.key)}
                  activeOpacity={0.7}
                  accessibilityRole="radio"
                  accessibilityLabel={`${slot.key}, ${slot.displayTime}`}
                  accessibilityState={{ selected: selectedTimeSlot === slot.key }}
                >
                  <Text style={styles.timeSlotIcon}>{slot.icon}</Text>
                  <Text style={[
                    styles.timeSlotTimeText,
                    selectedTimeSlot === slot.key && styles.timeSlotTimeTextActive
                  ]}>
                    {slot.time}
                  </Text>
                  <Text style={[
                    styles.timeSlotLabelText,
                    selectedTimeSlot === slot.key && styles.timeSlotLabelTextActive
                  ]}>
                    {slot.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Custom Time (Optional) */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Custom Time (Optional)</Text>
            <TextInput
              style={styles.input}
              value={customTimeDisplay}
              onChangeText={handleCustomTimeChange}
              placeholder="e.g., 8:00 AM"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Custom time"
              accessibilityHint="Enter time in 12-hour format"
            />
            <Text style={styles.helpText}>Enter time in 12-hour format (e.g., 8:00 AM, 1:30 PM, 8:00 PM)</Text>
          </View>

          {/* Days Supply */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Days Supply</Text>
            <TextInput
              style={styles.input}
              value={daysSupply}
              onChangeText={setDaysSupply}
              placeholder="30"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              accessibilityLabel="Days supply"
              accessibilityHint="Number of days this supply will last"
            />
            <Text style={styles.helpText}>
              Alerts when supply drops below 7 days
            </Text>
          </View>

          {/* Step 1: Advanced Options link */}
          {formStep === 1 && (
            <>
              <TouchableOpacity
                style={styles.advancedLink}
                onPress={() => setFormStep(2)}
                accessibilityLabel="Show advanced options"
                accessibilityRole="button"
              >
                <Text style={styles.advancedLinkText}>Advanced Options</Text>
                <Text style={styles.advancedLinkArrow}>{'\u25B6'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primarySaveButton, saving && { opacity: 0.5 }]}
                onPress={handleSave}
                disabled={saving}
                accessibilityLabel={isEditing ? 'Save medication changes' : 'Save medication'}
                accessibilityRole="button"
              >
                <Text style={styles.primarySaveButtonText}>
                  {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Save Medication'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* ============================================= */}
          {/* STEP 2: ADVANCED OPTIONS */}
          {/* ============================================= */}
          {formStep === 2 && (
          <>

          {/* Back to basics link */}
          <TouchableOpacity
            style={styles.backToBasicsLink}
            onPress={() => setFormStep(1)}
            accessibilityLabel="Back to basic options"
            accessibilityRole="button"
          >
            <Text style={styles.backToBasicsText}>{'\u2190'} Back</Text>
          </TouchableOpacity>

          {/* ============================================= */}
          {/* REMINDERS SECTION - "When should we notify you?" */}
          {/* ============================================= */}
          <View style={[
            styles.reminderContainer,
            reminderEnabled && styles.reminderContainerActive
          ]}>
            {/* Toggle Row */}
            <TouchableOpacity
              style={styles.reminderToggleRow}
              onPress={() => setReminderEnabled(!reminderEnabled)}
              activeOpacity={0.7}
              accessibilityRole="switch"
              accessibilityLabel="Reminders"
              accessibilityState={{ checked: reminderEnabled }}
            >
              <View style={styles.reminderToggleLeft}>
                <Text style={styles.reminderIcon}>🔔</Text>
                <View style={styles.reminderToggleInfo}>
                  <Text style={styles.reminderToggleLabel}>Reminders</Text>
                  <Text style={styles.reminderToggleDesc}>
                    {reminderEnabled ? 'When should we notify you?' : 'Dose still appears in Care Plan'}
                  </Text>
                </View>
              </View>
              <Switch
                value={reminderEnabled}
                onValueChange={setReminderEnabled}
                trackColor={{ false: colors.textMuted, true: colors.amber }}
                thumbColor={colors.surface}
                ios_backgroundColor={colors.textMuted}
              />
            </TouchableOpacity>

            {/* Reminder Options - Only show when enabled */}
            {reminderEnabled && (
              <View style={styles.reminderOptionsContainer}>
                {/* Timing Options */}
                <Text style={styles.reminderSectionLabel}>Notify me</Text>
                <View style={styles.timingOptionsGrid}>
                  {REMINDER_TIMING_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.timingOption,
                        reminderTiming === option.value && styles.timingOptionActive
                      ]}
                      onPress={() => setReminderTiming(option.value)}
                      activeOpacity={0.7}
                      accessibilityRole="radio"
                      accessibilityLabel={`Notify me ${option.label}`}
                      accessibilityState={{ selected: reminderTiming === option.value }}
                    >
                      <Text style={[
                        styles.timingOptionText,
                        reminderTiming === option.value && styles.timingOptionTextActive
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Custom minutes input */}
                {reminderTiming === 'custom' && (
                  <View style={styles.customInputRow}>
                    <TextInput
                      style={styles.customMinutesInput}
                      value={reminderCustomMinutes}
                      onChangeText={setReminderCustomMinutes}
                      keyboardType="numeric"
                      placeholder="15"
                      placeholderTextColor={colors.textMuted}
                      accessibilityLabel="Custom reminder minutes"
                      accessibilityHint="Minutes before dose to send reminder"
                    />
                    <Text style={styles.customMinutesLabel}>minutes before</Text>
                  </View>
                )}

                {/* Follow-up reminder option */}
                <View style={styles.followUpContainer}>
                  <TouchableOpacity
                    style={styles.followUpToggleRow}
                    onPress={() => setFollowUpEnabled(!followUpEnabled)}
                    activeOpacity={0.7}
                    accessibilityRole="switch"
                    accessibilityLabel="Remind again if not logged"
                    accessibilityState={{ checked: followUpEnabled }}
                  >
                    <View style={styles.followUpInfo}>
                      <Text style={styles.followUpLabel}>Remind again if not logged</Text>
                      <Text style={styles.followUpDesc}>Stops after 3 attempts</Text>
                    </View>
                    <Switch
                      value={followUpEnabled}
                      onValueChange={setFollowUpEnabled}
                      trackColor={{ false: colors.textMuted, true: colors.amber }}
                      thumbColor={colors.surface}
                      ios_backgroundColor={colors.textMuted}
                    />
                  </TouchableOpacity>

                  {followUpEnabled && (
                    <View style={styles.followUpIntervalRow}>
                      <Text style={styles.followUpIntervalLabel}>Remind again after:</Text>
                      <View style={styles.followUpIntervalOptions}>
                        {FOLLOW_UP_OPTIONS.map((option) => (
                          <TouchableOpacity
                            key={option.value}
                            style={[
                              styles.followUpIntervalOption,
                              followUpInterval === option.value && styles.followUpIntervalOptionActive
                            ]}
                            onPress={() => setFollowUpInterval(option.value)}
                            activeOpacity={0.7}
                            accessibilityRole="radio"
                            accessibilityLabel={`Remind again after ${option.label}`}
                            accessibilityState={{ selected: followUpInterval === option.value }}
                          >
                            <Text style={[
                              styles.followUpIntervalText,
                              followUpInterval === option.value && styles.followUpIntervalTextActive
                            ]}>
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* ============================================= */}
          {/* SCHEDULE SECTION - "How often is this taken?" */}
          {/* ============================================= */}
          <View style={styles.scheduleContainer}>
            <View style={styles.scheduleHeader}>
              <Text style={styles.scheduleIcon}>📅</Text>
              <View style={styles.scheduleHeaderInfo}>
                <Text style={styles.scheduleHeaderLabel}>Schedule</Text>
                <Text style={styles.scheduleHeaderDesc}>How often is this taken?</Text>
              </View>
            </View>

            {/* Frequency Options */}
            <View style={styles.frequencyOptionsGrid}>
              {SCHEDULE_FREQUENCY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.frequencyOption,
                    scheduleFrequency === option.value && styles.frequencyOptionActive
                  ]}
                  onPress={() => {
                    setScheduleFrequency(option.value);
                    // Set default days for weekly
                    if (option.value === 'weekly') {
                      setScheduleDaysOfWeek([new Date().getDay()]);
                    } else if (option.value === 'daily') {
                      setScheduleDaysOfWeek([0, 1, 2, 3, 4, 5, 6]);
                    }
                  }}
                  activeOpacity={0.7}
                  accessibilityRole="radio"
                  accessibilityLabel={`Schedule frequency: ${option.label}`}
                  accessibilityState={{ selected: scheduleFrequency === option.value }}
                >
                  <Text style={[
                    styles.frequencyOptionText,
                    scheduleFrequency === option.value && styles.frequencyOptionTextActive
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Day Picker - for 'weekly' or 'custom' */}
            {(scheduleFrequency === 'weekly' || scheduleFrequency === 'custom') && (
              <View style={styles.dayPickerContainer}>
                <Text style={styles.dayPickerLabel}>
                  {scheduleFrequency === 'weekly' ? 'Which day?' : 'Which days?'}
                </Text>
                <View style={styles.dayPickerRow}>
                  {DAYS_OF_WEEK.map((day) => {
                    const isSelected = scheduleDaysOfWeek.includes(day.value);
                    return (
                      <TouchableOpacity
                        key={day.value}
                        style={[
                          styles.dayButton,
                          isSelected && styles.dayButtonActive
                        ]}
                        onPress={() => {
                          if (scheduleFrequency === 'weekly') {
                            // Single select for weekly
                            setScheduleDaysOfWeek([day.value]);
                          } else {
                            // Multi-select for custom
                            if (isSelected) {
                              setScheduleDaysOfWeek(scheduleDaysOfWeek.filter(d => d !== day.value));
                            } else {
                              setScheduleDaysOfWeek([...scheduleDaysOfWeek, day.value].sort());
                            }
                          }
                        }}
                        activeOpacity={0.7}
                        accessibilityRole={scheduleFrequency === 'weekly' ? 'radio' : 'checkbox'}
                        accessibilityLabel={day.label}
                        accessibilityState={scheduleFrequency === 'weekly' ? { selected: isSelected } : { checked: isSelected }}
                      >
                        <Text style={[
                          styles.dayButtonText,
                          isSelected && styles.dayButtonTextActive
                        ]}>
                          {day.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* End Condition */}
            <View style={styles.endConditionContainer}>
              <Text style={styles.endConditionLabel}>Until</Text>
              <View style={styles.endConditionOptions}>
                {SCHEDULE_END_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.endConditionOption,
                      scheduleEndCondition === option.value && styles.endConditionOptionActive
                    ]}
                    onPress={() => setScheduleEndCondition(option.value)}
                    activeOpacity={0.7}
                    accessibilityRole="radio"
                    accessibilityLabel={`Schedule until: ${option.label}`}
                    accessibilityState={{ selected: scheduleEndCondition === option.value }}
                  >
                    <Text style={[
                      styles.endConditionText,
                      scheduleEndCondition === option.value && styles.endConditionTextActive
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Notes */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Notes (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g., Take with food, avoid grapefruit"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              accessibilityLabel="Medication notes"
            />
          </View>

          {/* Step 2 save button */}
          {formStep === 2 && (
            <TouchableOpacity
              style={[styles.primarySaveButton, saving && { opacity: 0.5 }]}
              onPress={handleSave}
              disabled={saving}
              accessibilityLabel={isEditing ? 'Save medication changes' : 'Save medication'}
              accessibilityRole="button"
            >
              <Text style={styles.primarySaveButtonText}>
                {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Save Medication'}
              </Text>
            </TouchableOpacity>
          )}

          </>
          )}

          <TouchableOpacity
            style={[styles.bottomSaveButton, saving && { opacity: 0.5 }]}
            onPress={handleSave}
            disabled={saving}
            accessibilityLabel={isEditing ? 'Save medication changes' : 'Save medication'}
            accessibilityRole="button"
          >
            <Text style={styles.bottomSaveButtonText}>
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Save Medication'}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Confirmation Toast */}
        {toastVisible && (
          <View style={styles.toast}>
            <View style={styles.toastIcon}>
              <Text style={styles.toastIconText}>{'\u2713'}</Text>
            </View>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  bottomSaveButton: {
    backgroundColor: c.accent,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 32,
  },
  bottomSaveButtonText: {
    color: c.background,
    fontSize: 16,
    fontWeight: '700',
  },

  // Form
  formGroup: {
    marginBottom: Spacing.xl,
    position: 'relative',
    zIndex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    fontSize: 16,
    color: c.textPrimary,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  helpText: {
    fontSize: 12,
    color: c.textMuted,
    marginTop: Spacing.sm,
  },

  // Time Slots
  // Horizontal Icon Row for Time Slots
  timeSlotRow: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: c.surface,
    padding: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
  },
  timeSlotButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  timeSlotButtonActive: {
    backgroundColor: c.accentLight,
    borderColor: c.accent,
  },
  timeSlotIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  timeSlotTimeText: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textMuted,
  },
  timeSlotTimeTextActive: {
    color: c.accent,
  },
  timeSlotLabelText: {
    fontSize: 9,
    color: c.textMuted,
    opacity: 0.7,
  },
  timeSlotLabelTextActive: {
    color: c.accent,
  },
  
  // DROPDOWN SELECTORS
  dropdownTrigger: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownTriggerOpen: {
    borderColor: c.accent,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  dropdownTriggerText: {
    fontSize: 16,
    color: c.textPrimary,
    flex: 1,
  },
  dropdownPlaceholder: {
    color: c.textMuted,
  },
  dropdownArrow: {
    fontSize: 12,
    color: c.textMuted,
    marginLeft: 8,
  },
  dropdownArrowOpen: {
    transform: [{ rotate: '180deg' }],
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: c.backgroundElevated,
    borderWidth: 1,
    borderColor: c.accent,
    borderTopWidth: 0,
    borderBottomLeftRadius: BorderRadius.md,
    borderBottomRightRadius: BorderRadius.md,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  dropdownItem: {
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  dropdownItemText: {
    fontSize: 15,
    color: c.textPrimary,
    fontWeight: '500',
  },
  dropdownItemSubtext: {
    fontSize: 12,
    color: c.textMuted,
  },

  // TOAST
  toast: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toastIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastIconText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
  },
  toastText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22c55e',
  },

  // ============================================
  // REMINDERS SECTION STYLES
  // ============================================
  reminderContainer: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  reminderContainerActive: {
    backgroundColor: c.amberFaint,
    borderColor: c.warningBorder,
  },
  reminderToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
  },
  reminderToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  reminderIcon: {
    fontSize: 20,
  },
  reminderToggleInfo: {
    flex: 1,
  },
  reminderToggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 2,
  },
  reminderToggleDesc: {
    fontSize: 11,
    color: c.textMuted,
  },
  reminderOptionsContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: c.amberMuted,
  },
  reminderSectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: c.amberBright,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  timingOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timingOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.warningBorder,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  timingOptionActive: {
    backgroundColor: c.amberMuted,
    borderColor: c.amberBright,
  },
  timingOptionText: {
    fontSize: 13,
    color: c.textSecondary,
  },
  timingOptionTextActive: {
    color: c.amberBright,
    fontWeight: '600',
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: Spacing.sm,
  },
  customMinutesInput: {
    width: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: c.warningBorder,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: c.textPrimary,
    textAlign: 'center',
  },
  customMinutesLabel: {
    fontSize: 13,
    color: c.textSecondary,
  },
  followUpContainer: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: c.amberHint,
  },
  followUpToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  followUpInfo: {
    flex: 1,
  },
  followUpLabel: {
    fontSize: 13,
    color: c.textPrimary,
    marginBottom: 2,
  },
  followUpDesc: {
    fontSize: 10,
    color: c.textMuted,
  },
  followUpIntervalRow: {
    marginTop: Spacing.md,
  },
  followUpIntervalLabel: {
    fontSize: 11,
    color: c.textMuted,
    marginBottom: Spacing.sm,
  },
  followUpIntervalOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  followUpIntervalOption: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: c.warningBorder,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  followUpIntervalOptionActive: {
    backgroundColor: c.amberMuted,
    borderColor: c.amberBright,
  },
  followUpIntervalText: {
    fontSize: 12,
    color: c.textSecondary,
  },
  followUpIntervalTextActive: {
    color: c.amberBright,
    fontWeight: '600',
  },

  // ============================================
  // SCHEDULE SECTION STYLES
  // ============================================
  scheduleContainer: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
    padding: Spacing.lg,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  scheduleIcon: {
    fontSize: 20,
  },
  scheduleHeaderInfo: {
    flex: 1,
  },
  scheduleHeaderLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 2,
  },
  scheduleHeaderDesc: {
    fontSize: 11,
    color: c.textMuted,
  },
  frequencyOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.lg,
  },
  frequencyOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  frequencyOptionActive: {
    backgroundColor: c.accentLight,
    borderColor: c.accent,
  },
  frequencyOptionText: {
    fontSize: 13,
    color: c.textSecondary,
  },
  frequencyOptionTextActive: {
    color: c.accent,
    fontWeight: '600',
  },
  dayPickerContainer: {
    marginBottom: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  dayPickerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textMuted,
    marginBottom: Spacing.sm,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  dayPickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  dayButton: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  dayButtonActive: {
    backgroundColor: c.accentLight,
    borderColor: c.accent,
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textSecondary,
  },
  dayButtonTextActive: {
    color: c.accent,
  },
  endConditionContainer: {
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  endConditionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textMuted,
    marginBottom: Spacing.sm,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  endConditionOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  endConditionOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  endConditionOptionActive: {
    backgroundColor: c.accentLight,
    borderColor: c.accent,
  },
  endConditionText: {
    fontSize: 12,
    color: c.textSecondary,
  },
  endConditionTextActive: {
    color: c.accent,
    fontWeight: '600',
  },

  // Progressive disclosure
  advancedLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    marginBottom: Spacing.lg,
  },
  advancedLinkText: {
    fontSize: 14,
    color: c.accent,
    fontWeight: '500',
  },
  advancedLinkArrow: {
    fontSize: 10,
    color: c.accent,
  },
  backToBasicsLink: {
    paddingVertical: 8,
    marginBottom: Spacing.md,
  },
  backToBasicsText: {
    fontSize: 14,
    color: c.accent,
    fontWeight: '500',
  },
  primarySaveButton: {
    backgroundColor: c.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  primarySaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textPrimary,
  },
});
