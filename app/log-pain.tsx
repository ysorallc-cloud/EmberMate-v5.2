// ============================================================================
// LOG PAIN - Dedicated NRS 0-10 pain tracking with body location & character
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { navigateBack } from '../lib/navigate';
import { Colors } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import { saveSymptom } from '../utils/symptomStorage';
import { logError } from '../utils/devLog';
import { emitDataUpdate } from '../lib/events';
import { hapticSuccess } from '../utils/hapticFeedback';
import { EVENT } from '../lib/eventNames';
import { getTodayDateString } from '../services/carePlanGenerator';
import { logInstanceCompletion, DEFAULT_PATIENT_ID } from '../storage/carePlanRepo';
import { SubScreenHeader } from '../components/SubScreenHeader';
import { SaveConfirmation } from '../components/common/SaveConfirmation';
import { SAVE_DESTINATIONS } from '../utils/saveDestinations';

const BODY_LOCATIONS = [
  'Head', 'Neck', 'Chest', 'Abdomen', 'Back',
  'Hip', 'Shoulder', 'Arm', 'Leg', 'Incision Site',
];

const PAIN_CHARACTERS = [
  'Aching', 'Sharp', 'Burning', 'Throbbing',
  'Stabbing', 'Cramping', 'Tingling', 'Dull',
];

function getSeverityColor(value: number): string {
  if (value <= 2) return Colors.green;
  if (value <= 4) return Colors.amber;
  if (value <= 6) return Colors.orange;
  if (value <= 8) return Colors.red;
  return Colors.rose;
}

function getSeverityLabel(value: number): string {
  if (value === 0) return 'No Pain';
  if (value <= 2) return 'Mild';
  if (value <= 4) return 'Moderate';
  if (value <= 6) return 'Severe';
  if (value <= 8) return 'Very Severe';
  return 'Worst Possible';
}

export default function LogPainScreen() {
  const params = useLocalSearchParams();
  const [severity, setSeverity] = useState<number | null>(null);
  const [bodyLocation, setBodyLocation] = useState<string | null>(null);
  const [character, setCharacter] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [savedPreview, setSavedPreview] = useState('');
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const canSave = severity !== null;

  const handleSave = async () => {
    if (severity === null || saving) return;

    setSaving(true);
    try {
      const now = new Date();
      await saveSymptom({
        symptom: 'Pain',
        severity,
        description: notes.trim() || undefined,
        bodyLocation: bodyLocation || undefined,
        character: character || undefined,
        timestamp: now.toISOString(),
        date: getTodayDateString(),
      });

      emitDataUpdate(EVENT.SYMPTOMS);

      const instanceId = params.instanceId as string | undefined;
      if (instanceId) {
        try {
          await logInstanceCompletion(DEFAULT_PATIENT_ID, getTodayDateString(), instanceId, 'completed',
            { type: 'custom', pain: { severity, bodyLocation: bodyLocation || undefined, character: character || undefined } },
            { source: 'record' });
          emitDataUpdate(EVENT.DAILY_INSTANCES);
        } catch (err) {
          logError('LogPainScreen.completeInstance', err);
        }
      }

      await hapticSuccess();
      const parts = [`${severity}/10 ${getSeverityLabel(severity)}`];
      if (bodyLocation) parts.push(bodyLocation);
      setSavedPreview(parts.join(' — '));
      setShowConfirmation(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to log pain. Please try again.');
      logError('LogPainScreen.handleSave', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={100}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <SubScreenHeader title="Log Pain" emoji="🩹" />

            <View style={styles.form}>
              {/* NRS 0-10 Scale */}
              <View style={styles.formGroup}>
                <View style={styles.severityHeader}>
                  <Text style={styles.label}>Pain intensity *</Text>
                  {severity !== null && (
                    <Text style={[styles.severityValue, { color: getSeverityColor(severity) }]}>
                      {severity}/10 — {getSeverityLabel(severity)}
                    </Text>
                  )}
                </View>
                <View style={styles.severityScale}>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                    const color = getSeverityColor(num);
                    const isSelected = severity === num;
                    return (
                      <TouchableOpacity
                        key={num}
                        style={[
                          styles.severityButton,
                          isSelected && { backgroundColor: color, borderColor: color },
                        ]}
                        onPress={() => setSeverity(num)}
                        accessibilityLabel={`Pain level ${num} out of 10, ${getSeverityLabel(num)}`}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isSelected }}
                      >
                        <Text
                          style={[
                            styles.severityButtonText,
                            isSelected && styles.severityButtonTextSelected,
                          ]}
                        >
                          {num}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <View style={styles.scaleLabels}>
                  <Text style={styles.scaleLabel}>No Pain</Text>
                  <Text style={styles.scaleLabel}>Worst</Text>
                </View>
              </View>

              {/* Body Location */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Location (optional)</Text>
                <View style={styles.chipGrid}>
                  {BODY_LOCATIONS.map((location) => (
                    <TouchableOpacity
                      key={location}
                      style={[
                        styles.chip,
                        bodyLocation === location && styles.chipSelected,
                      ]}
                      onPress={() => setBodyLocation(bodyLocation === location ? null : location)}
                      accessibilityLabel={`Body location: ${location}`}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: bodyLocation === location }}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          bodyLocation === location && styles.chipTextSelected,
                        ]}
                      >
                        {location}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Pain Character */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Character (optional)</Text>
                <View style={styles.chipGrid}>
                  {PAIN_CHARACTERS.map((ch) => (
                    <TouchableOpacity
                      key={ch}
                      style={[
                        styles.chip,
                        character === ch && styles.chipSelected,
                      ]}
                      onPress={() => setCharacter(character === ch ? null : ch)}
                      accessibilityLabel={`Pain character: ${ch}`}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: character === ch }}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          character === ch && styles.chipTextSelected,
                        ]}
                      >
                        {ch}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Notes */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Notes (optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="When did it start? What makes it better/worse?"
                  placeholderTextColor={colors.textPlaceholder}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  accessibilityLabel="Pain notes"
                />
              </View>

              {/* Save */}
              <TouchableOpacity
                style={[styles.saveButton, (!canSave || saving) && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={!canSave || saving}
                accessibilityLabel={saving ? 'Saving pain entry' : 'Log pain'}
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSave || saving }}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? 'Saving...' : 'Log Pain'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
      <SaveConfirmation
        visible={showConfirmation}
        icon="🩹"
        title="Pain Logged"
        preview={savedPreview}
        destinations={SAVE_DESTINATIONS.pain}
        onDismiss={() => navigateBack()}
      />
    </SafeAreaView>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  gradient: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  form: { gap: 24 },
  formGroup: { gap: 8 },
  label: { fontSize: 13, fontWeight: '500', color: c.textSecondary },
  severityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  severityValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  severityScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  severityButton: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  severityButtonText: {
    fontSize: 12,
    color: c.textSecondary,
  },
  severityButtonTextSelected: {
    color: c.textPrimary,
    fontWeight: '600',
  },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  scaleLabel: {
    fontSize: 11,
    color: c.textMuted,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 20,
  },
  chipSelected: {
    backgroundColor: c.accentLight,
    borderColor: c.accent,
  },
  chipText: {
    fontSize: 14,
    color: c.textSecondary,
  },
  chipTextSelected: {
    color: c.accent,
    fontWeight: '500',
  },
  input: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: c.textPrimary,
  },
  textArea: { minHeight: 80, paddingTop: 14 },
  saveButton: {
    backgroundColor: c.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: c.textPrimary, fontSize: 15, fontWeight: '600' },
});
