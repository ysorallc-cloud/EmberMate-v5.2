// ============================================================================
// DOSAGE SECTION
// Medication name + dosage inputs with autocomplete suggestions
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { COMMON_MEDICATIONS, TIME_SLOTS, TimeSlot } from './medicationFormHelpers';
import { MedicationFormState } from '../../hooks/useMedicationForm';

interface Props {
  state: MedicationFormState;
  dispatch: React.Dispatch<any>;
  handleCustomTimeChange: (text: string) => void;
}

export function DosageSection({ state, dispatch, handleCustomTimeChange }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const handleMedicationNameChange = (text: string) => {
    dispatch({ type: 'SET_FIELD', field: 'name', value: text });
    if (text.length >= 1) {
      const matches = COMMON_MEDICATIONS.filter(med =>
        med.name.toLowerCase().includes(text.toLowerCase())
      );
      dispatch({ type: 'UPDATE_MED_SUGGESTIONS', suggestions: matches });
    } else {
      dispatch({ type: 'SET_FIELD', field: 'showMedSuggestions', value: false });
    }
  };

  const handleSelectMedication = (medication: typeof COMMON_MEDICATIONS[0]) => {
    dispatch({ type: 'SELECT_MEDICATION', name: medication.name, commonDosages: medication.commonDosages });
  };

  const handleDosageChange = (text: string) => {
    dispatch({ type: 'SET_FIELD', field: 'dosage', value: text });
    if (state.dosageSuggestions.length > 0) {
      const matches = state.dosageSuggestions.filter(d =>
        d.toLowerCase().includes(text.toLowerCase())
      );
      dispatch({ type: 'SET_FIELD', field: 'showDosageSuggestions', value: matches.length > 0 && text.length > 0 });
    }
  };

  return (
    <>
      {/* Medication Name */}
      <View style={styles.formGroup}>
        <Text style={styles.label} accessibilityRole="text">Medication Name *</Text>
        <TextInput
          style={styles.input}
          value={state.name}
          onChangeText={handleMedicationNameChange}
          onFocus={() => {
            if (state.name.length >= 1) {
              const matches = COMMON_MEDICATIONS.filter(med =>
                med.name.toLowerCase().includes(state.name.toLowerCase())
              );
              dispatch({ type: 'UPDATE_MED_SUGGESTIONS', suggestions: matches });
            }
          }}
          placeholder="e.g., Lisinopril"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="words"
          autoCorrect={false}
          accessibilityLabel="Medication name, required"
          accessibilityHint="Enter the name of the medication"
        />
        {state.showMedSuggestions && state.medSuggestions.length > 0 && (
          <ScrollView
            style={styles.suggestionsContainer}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
          >
            {state.medSuggestions.slice(0, 8).map((med, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.suggestionItem}
                onPress={() => handleSelectMedication(med)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Select ${med.name}, common dosages: ${med.commonDosages.join(', ')}`}
              >
                <Text style={styles.suggestionText}>{med.name}</Text>
                <Text style={styles.suggestionSubtext}>
                  Common: {med.commonDosages.join(', ')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Dosage */}
      <View style={styles.formGroup}>
        <Text style={styles.label} accessibilityRole="text">Dosage *</Text>
        <TextInput
          style={styles.input}
          value={state.dosage}
          onChangeText={handleDosageChange}
          placeholder="e.g., 10mg"
          placeholderTextColor={colors.textMuted}
          autoCorrect={false}
          accessibilityLabel="Dosage, required"
          accessibilityHint="Enter the medication dosage"
        />
        {state.showDosageSuggestions && state.dosageSuggestions.length > 0 && (
          <ScrollView
            style={styles.suggestionsContainer}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
          >
            {state.dosageSuggestions.map((dose, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.suggestionItem}
                onPress={() => {
                  dispatch({ type: 'SET_FIELD', field: 'dosage', value: dose });
                  dispatch({ type: 'SET_FIELD', field: 'showDosageSuggestions', value: false });
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Select dosage ${dose}`}
              >
                <Text style={styles.suggestionText}>{dose}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Time Slot Selection */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Time of Day *</Text>
        <View style={styles.timeSlotRow}>
          {TIME_SLOTS.map(slot => (
            <TouchableOpacity
              key={slot.key}
              style={[
                styles.timeSlotButton,
                state.selectedTimeSlot === slot.key && styles.timeSlotButtonActive,
              ]}
              onPress={() => dispatch({ type: 'SELECT_TIME_SLOT', slot: slot.key })}
              activeOpacity={0.7}
              accessibilityRole="radio"
              accessibilityLabel={`${slot.key}, ${slot.displayTime}`}
              accessibilityState={{ selected: state.selectedTimeSlot === slot.key }}
            >
              <Text style={styles.timeSlotIcon}>{slot.icon}</Text>
              <Text style={[
                styles.timeSlotTimeText,
                state.selectedTimeSlot === slot.key && styles.timeSlotTimeTextActive,
              ]}>
                {slot.time}
              </Text>
              <Text style={[
                styles.timeSlotLabelText,
                state.selectedTimeSlot === slot.key && styles.timeSlotLabelTextActive,
              ]}>
                {slot.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Custom Time */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Custom Time (Optional)</Text>
        <TextInput
          style={styles.input}
          value={state.customTimeDisplay}
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
          value={state.daysSupply}
          onChangeText={(text) => dispatch({ type: 'SET_FIELD', field: 'daysSupply', value: text })}
          placeholder="30"
          placeholderTextColor={colors.textMuted}
          keyboardType="numeric"
          accessibilityLabel="Days supply"
          accessibilityHint="Number of days this supply will last"
        />
        <Text style={styles.helpText}>Alerts when supply drops below 7 days</Text>
      </View>
    </>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
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
  helpText: {
    fontSize: 12,
    color: c.textMuted,
    marginTop: Spacing.sm,
  },
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
  timeSlotIcon: { fontSize: 20, marginBottom: 2 },
  timeSlotTimeText: { fontSize: 11, fontWeight: '600', color: c.textMuted },
  timeSlotTimeTextActive: { color: c.accent },
  timeSlotLabelText: { fontSize: 9, color: c.textMuted, opacity: 0.7 },
  timeSlotLabelTextActive: { color: c.accent },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: c.backgroundElevated,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: BorderRadius.md,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  suggestionItem: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  suggestionText: { fontSize: 15, color: c.textPrimary, fontWeight: '500' },
  suggestionSubtext: { fontSize: 12, color: c.textMuted, marginTop: 2 },
});
