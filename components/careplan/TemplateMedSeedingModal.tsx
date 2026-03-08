// ============================================================================
// TEMPLATE MED SEEDING MODAL
// After applying a template, suggest medications to add
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { TemplateMedSuggestion } from '../../constants/carePlanTemplates';
import { addMedicationToPlan } from '../../storage/carePlanConfigRepo';
import { DEFAULT_PATIENT_ID } from '../../storage/carePlanRepo';
import { logError } from '../../utils/devLog';

interface TemplateMedSeedingModalProps {
  visible: boolean;
  templateName: string;
  suggestions: TemplateMedSuggestion[];
  onClose: () => void;
}

export function TemplateMedSeedingModal({
  visible,
  templateName,
  suggestions,
  onClose,
}: TemplateMedSeedingModalProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(suggestions.map((_, i) => i))
  );
  const [applying, setApplying] = useState(false);

  const toggleMed = (index: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleApply = async () => {
    const selectedMeds = suggestions.filter((_, i) => selected.has(i));
    if (selectedMeds.length === 0) {
      onClose();
      return;
    }

    setApplying(true);
    try {
      const timeOfDayMap: Record<string, string> = {
        morning: 'morning',
        midday: 'midday',
        evening: 'evening',
        night: 'night',
      };
      const timeHHmmMap: Record<string, string> = {
        morning: '08:00',
        midday: '13:00',
        evening: '18:00',
        night: '22:00',
      };

      for (const med of selectedMeds) {
        await addMedicationToPlan(DEFAULT_PATIENT_ID, {
          name: med.name,
          dosage: med.dosage,
          instructions: '',
          timesOfDay: med.timeSlots.map(s => timeOfDayMap[s] as any),
          customTimes: med.timeSlots.map(s => timeHHmmMap[s]),
          scheduledTimeHHmm: timeHHmmMap[med.timeSlots[0]],
          supplyEnabled: true,
          daysSupply: 30,
          refillThresholdDays: 7,
          active: true,
          notificationsEnabled: true,
          reminderTiming: 'at_time',
          followUpEnabled: false,
          scheduleFrequency: 'daily',
          scheduleEndCondition: 'ongoing',
        });
      }
      onClose();
    } catch (error) {
      logError('TemplateMedSeedingModal.handleApply', error);
      Alert.alert('Error', 'Failed to add some medications');
    } finally {
      setApplying(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Suggested Medications</Text>
          <Text style={styles.subtitle}>
            Based on the {templateName} template. Toggle to select which medications to add.
          </Text>

          {suggestions.map((med, index) => {
            const isSelected = selected.has(index);
            return (
              <TouchableOpacity
                key={`${med.name}-${index}`}
                style={[styles.medRow, isSelected && styles.medRowSelected]}
                onPress={() => toggleMed(index)}
                accessibilityLabel={`${isSelected ? 'Deselect' : 'Select'} ${med.name} ${med.dosage}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
              >
                <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                  {isSelected && <Text style={styles.checkmark}>{'\u2713'}</Text>}
                </View>
                <View style={styles.medInfo}>
                  <Text style={styles.medName}>{med.name}</Text>
                  <Text style={styles.medMeta}>
                    {med.dosage} {'\u00B7'} {med.timesPerDay}x daily
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={onClose}
              accessibilityLabel="Skip adding medications"
              accessibilityRole="button"
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.applyButton, (selected.size === 0 || applying) && styles.applyButtonDisabled]}
              onPress={handleApply}
              disabled={applying}
              accessibilityLabel={`Add ${selected.size} medication${selected.size !== 1 ? 's' : ''}`}
              accessibilityRole="button"
            >
              <Text style={styles.applyButtonText}>
                {applying ? 'Adding...' : `Add ${selected.size} Med${selected.size !== 1 ? 's' : ''}`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: c.menuSurface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.glassBorder,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: c.textMuted,
    marginBottom: 16,
  },
  medRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.glassBorder,
    gap: 12,
  },
  medRowSelected: {
    backgroundColor: c.accentHint,
    borderColor: c.accent,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: c.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: c.accent,
    borderColor: c.accent,
  },
  checkmark: {
    fontSize: 13,
    color: c.textPrimary,
    fontWeight: 'bold',
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    fontSize: 15,
    fontWeight: '500',
    color: c.textPrimary,
  },
  medMeta: {
    fontSize: 12,
    color: c.textMuted,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  skipText: {
    fontSize: 14,
    color: c.textMuted,
    fontWeight: '500',
  },
  applyButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: c.accent,
    borderRadius: 10,
  },
  applyButtonDisabled: {
    opacity: 0.4,
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textPrimary,
  },
});
