// ============================================================================
// MEDICATION LOG
// Consolidated: Medication dropdown, Dosage, Side Effects, Search
// ============================================================================

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { navigateBack } from '../lib/navigate';
import { Colors } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import { createMedication, markMedicationTaken } from '../utils/medicationStorage';
import { saveMedicationLog } from '../utils/centralStorage';
import { hapticSuccess } from '../utils/hapticFeedback';
import { getTodayProgress, TodayProgress } from '../utils/rhythmStorage';
import { parseCarePlanContext, getCarePlanBannerText } from '../utils/carePlanRouting';
import { trackCarePlanProgress } from '../utils/carePlanStorage';
import { logError } from '../utils/devLog';
import { emitDataUpdate } from '../lib/events';
import { EVENT } from '../lib/eventNames';
import { emitMedicationEvent } from '../utils/eventEmitter';
import { SaveConfirmation } from '../components/common/SaveConfirmation';
import { SAVE_DESTINATIONS } from '../utils/saveDestinations';

// Common medications for dropdown
const COMMON_MEDICATIONS = [
  'Metformin',
  'Lisinopril',
  'Amlodipine',
  'Metoprolol',
  'Atorvastatin',
  'Omeprazole',
  'Levothyroxine',
  'Gabapentin',
  'Losartan',
  'Furosemide',
  'Aspirin',
  'Warfarin',
  'Prednisone',
  'Vitamin D',
  'Vitamin B12',
  'Fish Oil',
  'Calcium',
  'Multivitamin',
  'Acetaminophen',
  'Ibuprofen',
  'Hydrochlorothiazide',
  'Simvastatin',
  'Pantoprazole',
  'Sertraline',
  'Escitalopram',
];

const COMMON_DOSAGES = [
  '5mg', '10mg', '20mg', '25mg', '40mg', '50mg', '75mg', '100mg',
  '150mg', '200mg', '250mg', '300mg', '400mg', '500mg', '600mg',
  '750mg', '800mg', '850mg', '1000mg',
  '25mcg', '50mcg', '75mcg', '100mcg',
  '81mg', '325mg',
  '1000IU', '2000IU', '5000IU',
  '1 tablet', '2 tablets',
];

const SIDE_EFFECTS = [
  { id: 'none', label: 'None' },
  { id: 'dizzy', label: 'Dizzy' },
  { id: 'nausea', label: 'Nausea' },
  { id: 'tired', label: 'Tired' },
  { id: 'headache', label: 'Headache' },
  { id: 'other', label: 'Other' },
];

export default function MedicationLogScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Parse CarePlan context from navigation params
  const carePlanContext = parseCarePlanContext(params as Record<string, string>);
  const isFromCarePlan = carePlanContext !== null;

  // Form state
  const [selectedMedication, setSelectedMedication] = useState('');
  const [dosage, setDosage] = useState('');
  const [sideEffect, setSideEffect] = useState('none');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMedDropdown, setShowMedDropdown] = useState(false);
  const [showDosageDropdown, setShowDosageDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [savedPreview, setSavedPreview] = useState('');
  const [progress, setProgress] = useState<TodayProgress | null>(null);

  // Load rhythm progress on mount
  React.useEffect(() => {
    const loadProgress = async () => {
      const progressData = await getTodayProgress();
      setProgress(progressData);
    };
    loadProgress();
  }, []);

  // Filter medications based on search
  const filteredMedications = searchQuery.trim()
    ? COMMON_MEDICATIONS.filter(med =>
        med.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : COMMON_MEDICATIONS;

  // Check if search is a custom medication
  const isCustomMedication = searchQuery.trim().length > 0 &&
    !COMMON_MEDICATIONS.some(med =>
      med.toLowerCase() === searchQuery.toLowerCase().trim()
    );

  // Filter dosages based on input
  const filteredDosages = dosage.trim()
    ? COMMON_DOSAGES.filter(d =>
        d.toLowerCase().includes(dosage.toLowerCase())
      )
    : COMMON_DOSAGES.slice(0, 12);

  const handleSelectMedication = (med: string) => {
    setSelectedMedication(med);
    setSearchQuery('');
    setShowMedDropdown(false);
  };

  const handleSelectDosage = (d: string) => {
    setDosage(d);
    setShowDosageDropdown(false);
  };

  const handleAddCustomMedication = () => {
    if (searchQuery.trim()) {
      setSelectedMedication(searchQuery.trim());
      setSearchQuery('');
      setShowMedDropdown(false);
    }
  };

  const handleSave = async () => {
    if (!selectedMedication.trim()) {
      Alert.alert('Required', 'Please select a medication');
      return;
    }
    if (!dosage.trim()) {
      Alert.alert('Required', 'Please enter a dosage');
      return;
    }

    setSaving(true);
    try {
      // Create and save the medication
      const newMed = await createMedication({
        name: selectedMedication.trim(),
        dosage: dosage.trim(),
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        timeSlot: 'morning',
        taken: true,
        active: true,
        notes: sideEffect !== 'none' ? `Side effect: ${sideEffect}` : undefined,
      });

      await markMedicationTaken(newMed.id);

      // Also save to central storage for Now page sync
      await saveMedicationLog({
        timestamp: new Date().toISOString(),
        medicationIds: [newMed.id],
        sideEffects: sideEffect !== 'none' ? [sideEffect] : undefined,
      });

      // Track CarePlan progress if navigated from CarePlan
      if (carePlanContext) {
        await trackCarePlanProgress(
          carePlanContext.routineId,
          carePlanContext.carePlanItemId,
          { logType: 'meds' }
        );
      }

      await hapticSuccess();
      emitDataUpdate(EVENT.MEDICATION);
      try { await emitMedicationEvent(newMed.id, selectedMedication.trim(), 'taken', { dosage: dosage.trim() }); } catch {}
      setSavedPreview(`${selectedMedication.trim()} ${dosage.trim()}`);
      setShowConfirmation(true);
    } catch (error) {
      logError('MedicationLogScreen.handleSave', error);
      Alert.alert('Error', 'Failed to save medication');
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Log Medication</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* CarePlan context banner */}
          {isFromCarePlan && carePlanContext && (
            <View style={[styles.contextBanner, styles.carePlanBanner]}>
              <Text style={styles.carePlanBannerLabel}>FROM CARE PLAN</Text>
              <Text style={styles.contextText}>
                {getCarePlanBannerText(carePlanContext)}
              </Text>
              {carePlanContext.completed !== undefined && carePlanContext.targetCount !== undefined && (
                <Text style={styles.progressText}>
                  {carePlanContext.completed} of {carePlanContext.targetCount} logged today
                </Text>
              )}
            </View>
          )}

          {/* Rhythm context banner (fallback when not from CarePlan) */}
          {!isFromCarePlan && progress && progress.medications.expected > 0 && (
            <View style={styles.contextBanner}>
              <Text style={styles.contextText}>
                {progress.medications.completed} of {progress.medications.expected} doses logged today
              </Text>
            </View>
          )}

          {/* 1. MEDICATION FIELD */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>MEDICATION</Text>

            {/* Selected medication display or search input */}
            {selectedMedication ? (
              <TouchableOpacity
                style={styles.selectedField}
                onPress={() => {
                  setSelectedMedication('');
                  setShowMedDropdown(true);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Selected medication: ${selectedMedication}. Tap to change`}
              >
                <Text style={styles.selectedFieldText}>{selectedMedication}</Text>
                <Text style={styles.changeText}>Change</Text>
              </TouchableOpacity>
            ) : (
              <View>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search or type medication name..."
                  placeholderTextColor={colors.textMuted}
                  value={searchQuery}
                  onChangeText={(text) => {
                    setSearchQuery(text);
                    setShowMedDropdown(true);
                  }}
                  onFocus={() => setShowMedDropdown(true)}
                  accessibilityLabel="Search medication name"
                />

                {/* Dropdown */}
                {showMedDropdown && (
                  <View style={styles.dropdown}>
                    {/* Custom medication option */}
                    {isCustomMedication && (
                      <TouchableOpacity
                        style={styles.customOption}
                        onPress={handleAddCustomMedication}
                        accessibilityRole="button"
                        accessibilityLabel={`Add custom medication: ${searchQuery.trim()}`}
                      >
                        <Text style={styles.customOptionText}>
                          Add "{searchQuery.trim()}"
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* Medication list */}
                    {filteredMedications.slice(0, 8).map((med) => (
                      <TouchableOpacity
                        key={med}
                        style={styles.dropdownItem}
                        onPress={() => handleSelectMedication(med)}
                        accessibilityRole="button"
                        accessibilityLabel={`Select ${med}`}
                      >
                        <Text style={styles.dropdownItemText}>{med}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>

          {/* 2. DOSAGE FIELD */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>DOSAGE</Text>

            <TextInput
              style={styles.dosageInput}
              placeholder="Enter or select dosage (e.g., 50mg)"
              placeholderTextColor={colors.textMuted}
              value={dosage}
              onChangeText={(text) => {
                setDosage(text);
                setShowDosageDropdown(true);
              }}
              onFocus={() => setShowDosageDropdown(true)}
              onBlur={() => setTimeout(() => setShowDosageDropdown(false), 200)}
              accessibilityLabel="Medication dosage"
            />

            {/* Common dosages */}
            {showDosageDropdown && (
              <View style={styles.dosageChips}>
                {filteredDosages.slice(0, 8).map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.dosageChip,
                      dosage === d && styles.dosageChipSelected,
                    ]}
                    onPress={() => handleSelectDosage(d)}
                    accessibilityRole="radio"
                    accessibilityLabel={`Dosage ${d}`}
                    accessibilityState={{ selected: dosage === d }}
                  >
                    <Text style={[
                      styles.dosageChipText,
                      dosage === d && styles.dosageChipTextSelected,
                    ]}>
                      {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* 3. SIDE EFFECTS FIELD */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>SIDE EFFECTS</Text>
            <View style={styles.sideEffectsRow}>
              {SIDE_EFFECTS.map((effect) => (
                <TouchableOpacity
                  key={effect.id}
                  style={[
                    styles.sideEffectChip,
                    sideEffect === effect.id && styles.sideEffectChipSelected,
                  ]}
                  onPress={() => setSideEffect(effect.id)}
                  accessibilityRole="radio"
                  accessibilityLabel={`Side effect: ${effect.label}`}
                  accessibilityState={{ selected: sideEffect === effect.id }}
                >
                  <Text style={[
                    styles.sideEffectText,
                    sideEffect === effect.id && styles.sideEffectTextSelected,
                  ]}>
                    {effect.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Confirmation Summary */}
          {selectedMedication && dosage && (
            <View style={styles.summary}>
              <Text style={styles.summaryLabel}>WILL LOG:</Text>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryMed}>{selectedMedication}</Text>
                <Text style={styles.summaryDosage}>{dosage}</Text>
                {sideEffect !== 'none' && (
                  <Text style={styles.summarySideEffect}>
                    Side effect: {SIDE_EFFECTS.find(e => e.id === sideEffect)?.label}
                  </Text>
                )}
              </View>
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.saveButton,
              (!selectedMedication || !dosage || saving) && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={!selectedMedication || !dosage || saving}
            accessibilityRole="button"
            accessibilityLabel={saving ? 'Saving medication log' : 'Log medication'}
            accessibilityState={{ disabled: !selectedMedication || !dosage || saving }}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Log Medication ✓'}
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
      <SaveConfirmation
        visible={showConfirmation}
        icon="💊"
        title="Medication Confirmed"
        preview={savedPreview}
        destinations={SAVE_DESTINATIONS.medication}
        onDismiss={() => navigateBack()}
      />
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: c.accentHint,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: c.surfaceHighlight,
    borderWidth: 1,
    borderColor: c.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: c.textPrimary,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: c.textPrimary,
  },

  // Content
  content: {
    flex: 1,
    padding: 20,
  },

  // Context banners
  contextBanner: {
    backgroundColor: 'rgba(74, 222, 128, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.15)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 20,
  },
  carePlanBanner: {
    backgroundColor: c.purpleFaint,
    borderColor: c.purpleWash,
  },
  carePlanBannerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: c.violetBright,
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 4,
  },
  contextText: {
    fontSize: 13,
    color: c.textSecondary,
    textAlign: 'center',
  },
  progressText: {
    fontSize: 12,
    color: c.textHalf,
    textAlign: 'center',
    marginTop: 4,
  },

  // Field
  field: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: c.textHalf,
    marginBottom: 10,
  },

  // Search/Selected Field
  searchInput: {
    backgroundColor: c.surfaceHighlight,
    borderWidth: 1,
    borderColor: c.borderMedium,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: c.textPrimary,
  },
  selectedField: {
    backgroundColor: c.greenLight,
    borderWidth: 1,
    borderColor: c.green,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedFieldText: {
    fontSize: 16,
    fontWeight: '600',
    color: c.green,
  },
  changeText: {
    fontSize: 13,
    color: c.textHalf,
  },

  // Dropdown
  dropdown: {
    backgroundColor: c.accentSubtle,
    borderWidth: 1,
    borderColor: c.borderMedium,
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.surfaceElevated,
  },
  dropdownItemText: {
    fontSize: 15,
    color: c.textPrimary,
  },
  customOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: c.sageLight,
    borderBottomWidth: 1,
    borderBottomColor: c.glassActive,
  },
  customOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: c.accent,
  },

  // Dosage
  dosageInput: {
    backgroundColor: c.surfaceHighlight,
    borderWidth: 1,
    borderColor: c.borderMedium,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: c.textPrimary,
    marginBottom: 12,
  },
  dosageChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dosageChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: c.surfaceHighlight,
    borderWidth: 1,
    borderColor: c.accentHint,
    borderRadius: 16,
  },
  dosageChipSelected: {
    backgroundColor: c.greenHint,
    borderColor: c.green,
  },
  dosageChipText: {
    fontSize: 13,
    color: c.textSecondary,
  },
  dosageChipTextSelected: {
    color: c.green,
    fontWeight: '600',
  },

  // Side Effects
  sideEffectsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sideEffectChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: c.surfaceHighlight,
    borderWidth: 1,
    borderColor: c.accentHint,
    borderRadius: 20,
  },
  sideEffectChipSelected: {
    backgroundColor: c.accentHint,
    borderColor: c.accent,
  },
  sideEffectText: {
    fontSize: 13,
    color: c.textSecondary,
  },
  sideEffectTextSelected: {
    color: c.accent,
    fontWeight: '600',
  },

  // Summary
  summary: {
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: c.textHalf,
    marginBottom: 10,
  },
  summaryCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: c.greenMuted,
    borderRadius: 12,
    padding: 16,
  },
  summaryMed: {
    fontSize: 18,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 4,
  },
  summaryDosage: {
    fontSize: 15,
    color: c.green,
    fontWeight: '500',
  },
  summarySideEffect: {
    fontSize: 13,
    color: c.textTertiary,
    marginTop: 8,
    fontStyle: 'italic',
  },

  // Footer
  footer: {
    padding: 20,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: c.accentHint,
    backgroundColor: c.background,
  },
  saveButton: {
    backgroundColor: c.green,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textPrimary,
  },
});
