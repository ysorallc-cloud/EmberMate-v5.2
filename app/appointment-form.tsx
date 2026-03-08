// ============================================================================
// APPOINTMENT FORM SCREEN - Single Card Design
// Add or edit appointments (Step 0: Plan)
// Accessed from appointments screen
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import { SubScreenHeader } from '../components/SubScreenHeader';
import {
  createAppointment,
  updateAppointment,
  getAppointments,
  Appointment
} from '../utils/appointmentStorage';
import { logError } from '../utils/devLog';
import { emitDataUpdate } from '../lib/events';
import { EVENT } from '../lib/eventNames';

type AppointmentType = 'doctor' | 'lab' | 'pharmacy' | 'hospital';

const APPOINTMENT_TYPES = [
  { id: 'doctor' as AppointmentType, label: 'Doctor', icon: '🩺' },
  { id: 'lab' as AppointmentType, label: 'Lab', icon: '🧪' },
  { id: 'pharmacy' as AppointmentType, label: 'Pharmacy', icon: '💊' },
  { id: 'hospital' as AppointmentType, label: 'Hospital', icon: '🏥' },
];

export default function AppointmentFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const apptId = params.id as string | undefined;
  const isEditing = !!apptId;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [appointmentType, setAppointmentType] = useState<AppointmentType>('doctor');
  const [title, setTitle] = useState('');
  const [provider, setProvider] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(true);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [tempTime, setTempTime] = useState(new Date());

  useEffect(() => {
    if (isEditing) {
      loadAppointment();
    } else {
      // Check if date parameter is provided
      if (params.date) {
        // Parse date in local timezone to avoid UTC conversion issues
        const dateStr = params.date as string;
        const [year, month, day] = dateStr.split('-').map(Number);
        const providedDate = new Date(year, month - 1, day); // month is 0-indexed
        if (!isNaN(providedDate.getTime())) {
          setDate(providedDate);
        }
      }

      // Set default time to 9:00 AM
      const defaultTime = new Date();
      defaultTime.setHours(9, 0, 0, 0);
      setTime(defaultTime);
    }
  }, [apptId, params.date]);

  const loadAppointment = async () => {
    if (!apptId) return;
    try {
      const appts = await getAppointments();
      const appt = appts.find(a => a.id === apptId);
      if (appt) {
        // Parse date and time
        const [year, month, day] = appt.date.split('-').map(Number);
        const appointmentDate = new Date(year, month - 1, day);
        setDate(appointmentDate);

        // Parse time safely with NaN protection
        const timeParts = appt.time?.split(':') || [];
        const hours = parseInt(timeParts[0], 10);
        const minutes = parseInt(timeParts[1], 10);
        const appointmentTime = new Date();
        if (!isNaN(hours) && !isNaN(minutes)) {
          appointmentTime.setHours(hours, minutes, 0, 0);
        } else {
          appointmentTime.setHours(9, 0, 0, 0); // Default to 9:00 AM
        }
        setTime(appointmentTime);

        setTitle(appt.title || '');
        setProvider(appt.provider);
        setLocation(appt.location);
        setNotes(appt.notes || '');
        setReminderEnabled(appt.reminderEnabled !== false); // Default to true

        // Determine appointment type from specialty
        const specialtyLower = appt.specialty.toLowerCase();
        if (specialtyLower.includes('lab')) setAppointmentType('lab');
        else if (specialtyLower.includes('pharmacy')) setAppointmentType('pharmacy');
        else if (specialtyLower.includes('hospital')) setAppointmentType('hospital');
        else setAppointmentType('doctor');

        if (appt.notes) setShowNotesInput(true);
      }
    } catch (error) {
      logError('AppointmentFormScreen.loadAppointment', error);
    }
  };

  const formatDate = (d: Date): string => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  };

  const formatTime = (t: Date): string => {
    let hours = t.getHours();
    const minutes = t.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutesStr} ${ampm}`;
  };

  const formatDateForStorage = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatTimeForStorage = (t: Date): string => {
    const hours = String(t.getHours()).padStart(2, '0');
    const minutes = String(t.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const openDatePicker = () => {
    setTempDate(date);
    setShowTimePicker(false);
    setShowDatePicker(true);
  };

  const openTimePicker = () => {
    setTempTime(time);
    setShowDatePicker(false);
    setShowTimePicker(true);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (selectedDate) setDate(selectedDate);
    } else {
      if (selectedDate) setTempDate(selectedDate);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
      if (selectedTime) setTime(selectedTime);
    } else {
      if (selectedTime) setTempTime(selectedTime);
    }
  };

  const confirmDate = () => {
    setDate(tempDate);
    setShowDatePicker(false);
  };

  const cancelDate = () => {
    setShowDatePicker(false);
  };

  const confirmTime = () => {
    setTime(tempTime);
    setShowTimePicker(false);
  };

  const cancelTime = () => {
    setShowTimePicker(false);
  };

  const handleSave = async () => {
    // Validate provider name
    if (!provider.trim()) {
      Alert.alert('Required Field', 'Please enter the provider or doctor name');
      return;
    }

    if (provider.trim().length < 2) {
      Alert.alert('Invalid Provider', 'Provider name must be at least 2 characters');
      return;
    }

    // Warn if appointment is in the past (unless editing)
    if (!isEditing) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const apptDate = new Date(date);
      apptDate.setHours(0, 0, 0, 0);
      if (apptDate < today) {
        Alert.alert(
          'Past Date',
          'This appointment date is in the past. Do you want to continue?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Continue', onPress: () => proceedWithSave() }
          ]
        );
        return;
      }
    }

    await proceedWithSave();
  };

  const proceedWithSave = async () => {
    try {
      const typeLabel = APPOINTMENT_TYPES.find(t => t.id === appointmentType)?.label || 'Doctor';

      if (isEditing && apptId) {
        const apptData: Partial<Appointment> = {
          title: title.trim() || undefined,
          date: formatDateForStorage(date),
          time: formatTimeForStorage(time),
          provider: provider.trim(),
          specialty: typeLabel,
          location: location.trim() || 'Not specified',
          notes: notes.trim(),
          reminderEnabled: reminderEnabled,
          completed: false,
          cancelled: false,
        };

        await updateAppointment(apptId, apptData);
        emitDataUpdate(EVENT.APPOINTMENTS);
        router.back();
      } else {
        const apptData: Omit<Appointment, 'id' | 'createdAt'> = {
          title: title.trim() || undefined,
          date: formatDateForStorage(date),
          time: formatTimeForStorage(time),
          provider: provider.trim(),
          specialty: typeLabel,
          location: location.trim() || 'Not specified',
          notes: notes.trim(),
          reminderEnabled: reminderEnabled,
          hasBrief: false,
          completed: false,
          cancelled: false,
        };

        await createAppointment(apptData);
        emitDataUpdate(EVENT.APPOINTMENTS);
        // Navigate to confirmation screen with appointment details
        router.replace({
          pathname: '/appointment-confirmation' as any,
          params: {
            date: formatDate(date),
            time: formatTime(time),
            provider: provider.trim(),
            location: location.trim() || 'Not specified',
            type: appointmentType,
            specialty: typeLabel,
          }
        });
      }
    } catch (error) {
      logError('AppointmentFormScreen.proceedWithSave', error);
      Alert.alert('Error', 'Failed to save appointment. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        <SubScreenHeader title={isEditing ? 'Edit Appointment' : 'Schedule Appointment'} emoji="📅" />

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

          {/* Single Card Container */}
          <View style={styles.card}>
            {/* Date & Time Row */}
            <View style={styles.dateTimeRow}>
              <View style={styles.dateTimeField}>
                <Text style={styles.fieldLabel}>DATE</Text>
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={openDatePicker}
                  accessibilityRole="button"
                  accessibilityLabel={`Appointment date: ${formatDate(date)}. Tap to change`}
                >
                  <Text style={styles.dateTimeIcon}>📅</Text>
                  <Text style={styles.dateTimeText}>{formatDate(date)}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.dateTimeField}>
                <Text style={styles.fieldLabel}>TIME</Text>
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={openTimePicker}
                  accessibilityRole="button"
                  accessibilityLabel={`Appointment time: ${formatTime(time)}. Tap to change`}
                >
                  <Text style={styles.dateTimeIcon}>🕐</Text>
                  <Text style={styles.dateTimeText}>{formatTime(time)}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Appointment Type Selector */}
            <View style={styles.typeSection}>
              <Text style={styles.fieldLabel}>APPOINTMENT TYPE</Text>
              <View style={styles.typePills}>
                {APPOINTMENT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.typePill,
                      appointmentType === type.id && styles.typePillActive
                    ]}
                    onPress={() => setAppointmentType(type.id)}
                    accessibilityRole="radio"
                    accessibilityLabel={`Appointment type: ${type.label}`}
                    accessibilityState={{ selected: appointmentType === type.id }}
                  >
                    <Text style={styles.typePillIcon}>{type.icon}</Text>
                    <Text
                      style={[
                        styles.typePillText,
                        appointmentType === type.id && styles.typePillTextActive
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.divider} />

            {/* Title (Optional) */}
            <View style={styles.inputSection}>
              <Text style={styles.fieldLabel}>TITLE (OPTIONAL)</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g., Annual Checkup, Follow-up Visit"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
                autoCorrect={false}
                spellCheck={false}
                textContentType="none"
                accessibilityLabel="Appointment title, optional"
              />
            </View>

            {/* Provider Name */}
            <View style={styles.inputSection}>
              <Text style={styles.fieldLabel}>PROVIDER NAME *</Text>
              <TextInput
                style={styles.input}
                value={provider}
                onChangeText={setProvider}
                placeholder="e.g., Dr. Sarah Johnson"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
                autoCorrect={false}
                spellCheck={false}
                textContentType="none"
                accessibilityLabel="Provider name, required"
              />
            </View>

            {/* Location */}
            <View style={styles.inputSection}>
              <Text style={styles.fieldLabel}>LOCATION</Text>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="e.g., Medical Center Downtown"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
                autoCorrect={false}
                spellCheck={false}
                textContentType="none"
                accessibilityLabel="Appointment location"
              />
            </View>

            {/* Expandable Reminder Controls */}
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
                accessibilityLabel="Appointment reminder"
                accessibilityState={{ checked: reminderEnabled }}
              >
                <View style={styles.reminderToggleLeft}>
                  <Text style={styles.reminderIcon}>🔔</Text>
                  <View style={styles.reminderToggleInfo}>
                    <Text style={styles.reminderToggleLabel}>Reminder</Text>
                    <Text style={styles.reminderToggleDesc}>
                      {reminderEnabled ? 'Notifications enabled' : 'Get notified before appointment'}
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

              {/* Expandable Reminder Schedule */}
              {reminderEnabled && (
                <View style={styles.reminderExpandedSection}>
                  <Text style={styles.reminderExpandedLabel}>NOTIFICATION SCHEDULE</Text>
                  <View style={styles.reminderScheduleInfo}>
                    <View style={styles.reminderScheduleRow}>
                      <Ionicons name="calendar-outline" size={16} color={colors.amber} />
                      <Text style={styles.reminderScheduleText}>1 day before at 9:00 AM</Text>
                    </View>
                    <View style={styles.reminderScheduleRow}>
                      <Ionicons name="time-outline" size={16} color={colors.amber} />
                      <Text style={styles.reminderScheduleText}>1 hour before appointment</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Expandable Notes Section */}
          {!showNotesInput ? (
            <TouchableOpacity
              style={styles.addNotesButton}
              onPress={() => setShowNotesInput(true)}
              accessibilityRole="button"
              accessibilityLabel="Add notes or reminders"
            >
              <Text style={styles.addNotesText}>+ Add notes or reminders</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.notesCard}>
              <Text style={styles.fieldLabel}>NOTES</Text>
              <TextInput
                style={styles.notesTextArea}
                value={notes}
                onChangeText={setNotes}
                placeholder="e.g., Bring medication list, fasting required"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                autoCorrect={false}
                spellCheck={false}
                accessibilityLabel="Appointment notes"
                textContentType="none"
                textAlignVertical="top"
              />
            </View>
          )}

          <TouchableOpacity
            style={styles.bottomSaveButton}
            onPress={handleSave}
            accessibilityRole="button"
            accessibilityLabel={isEditing ? 'Save appointment changes' : 'Save new appointment'}
          >
            <Text style={styles.bottomSaveButtonText}>
              {isEditing ? 'Save Changes' : 'Save Appointment'}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Date Picker - iOS: Modal, Android: native dialog */}
        {Platform.OS === 'ios' && showDatePicker && (
          <Modal transparent animationType="slide">
            <View style={styles.pickerOverlay}>
              <View style={styles.pickerContainer}>
                <View style={styles.pickerHeader}>
                  <TouchableOpacity onPress={cancelDate}>
                    <Text style={styles.pickerCancel}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.pickerTitle}>Select Date</Text>
                  <TouchableOpacity onPress={confirmDate}>
                    <Text style={styles.pickerDone}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  style={{ height: 200 }}
                />
              </View>
            </View>
          </Modal>
        )}
        {Platform.OS === 'android' && showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}

        {/* Time Picker - iOS: Modal, Android: native dialog */}
        {Platform.OS === 'ios' && showTimePicker && (
          <Modal transparent animationType="slide">
            <View style={styles.pickerOverlay}>
              <View style={styles.pickerContainer}>
                <View style={styles.pickerHeader}>
                  <TouchableOpacity onPress={cancelTime}>
                    <Text style={styles.pickerCancel}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.pickerTitle}>Select Time</Text>
                  <TouchableOpacity onPress={confirmTime}>
                    <Text style={styles.pickerDone}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={tempTime}
                  mode="time"
                  display="spinner"
                  onChange={handleTimeChange}
                  style={{ height: 200 }}
                />
              </View>
            </View>
          </Modal>
        )}
        {Platform.OS === 'android' && showTimePicker && (
          <DateTimePicker
            value={time}
            mode="time"
            display="default"
            onChange={handleTimeChange}
          />
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

  // Single Card
  card: {
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },

  // Date & Time Row
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeField: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: c.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  dateTimeIcon: {
    fontSize: 18,
  },
  dateTimeText: {
    fontSize: 15,
    color: c.textPrimary,
    fontWeight: '500',
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: c.border,
    marginVertical: 16,
  },

  // Appointment Type
  typeSection: {
    marginBottom: 4,
  },
  typePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  typePillActive: {
    backgroundColor: c.accentLight,
    borderColor: c.accent,
  },
  typePillIcon: {
    fontSize: 16,
  },
  typePillText: {
    fontSize: 14,
    color: c.textSecondary,
    fontWeight: '500',
  },
  typePillTextActive: {
    color: c.accent,
    fontWeight: '600',
  },

  // Input Sections
  inputSection: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: c.textPrimary,
  },

  // Add Notes Button
  addNotesButton: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  addNotesText: {
    fontSize: 14,
    color: c.textMuted,
    fontWeight: '500',
  },

  // Notes Card (Expanded)
  notesCard: {
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 16,
    padding: 20,
  },
  notesTextArea: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: c.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // Expandable Reminder Controls
  reminderContainer: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
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
    padding: 16,
  },
  reminderToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    fontWeight: '500',
    color: c.textPrimary,
    marginBottom: 2,
  },
  reminderToggleDesc: {
    fontSize: 11,
    color: c.textTertiary,
  },
  reminderExpandedSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: c.amberMuted,
  },
  reminderExpandedLabel: {
    fontSize: 10,
    color: c.amber,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  reminderScheduleInfo: {
    gap: 10,
  },
  reminderScheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reminderScheduleText: {
    fontSize: 13,
    color: c.textSecondary,
  },

  // iOS Picker Modal
  pickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  pickerContainer: {
    backgroundColor: c.surfaceAlt,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 34,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textPrimary,
  },
  pickerCancel: {
    fontSize: 16,
    color: c.textSecondary,
  },
  pickerDone: {
    fontSize: 16,
    fontWeight: '600',
    color: c.accent,
  },
});
