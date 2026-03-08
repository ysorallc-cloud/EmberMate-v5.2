// ============================================================================
// LOG SYMPTOM - Functional symptom logging
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
import { navigate, navigateBack } from '../lib/navigate';
import { Colors } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import { saveSymptom } from '../utils/symptomStorage';
import { logError } from '../utils/devLog';
import { emitDataUpdate } from '../lib/events';
import { emitSymptomEvent } from '../utils/eventEmitter';
import { hapticSuccess } from '../utils/hapticFeedback';
import { EVENT } from '../lib/eventNames';
import { getTodayDateString } from '../services/carePlanGenerator';
import { logInstanceCompletion, DEFAULT_PATIENT_ID } from '../storage/carePlanRepo';
import { SubScreenHeader } from '../components/SubScreenHeader';

const COMMON_SYMPTOMS = [
  'Pain', 'Nausea', 'Dizziness', 'Fatigue',
  'Headache', 'Shortness of Breath', 'Fever', 'Other',
];

export default function LogSymptomScreen() {
  const params = useLocalSearchParams();
  const [selectedSymptom, setSelectedSymptom] = useState('');
  const [customSymptom, setCustomSymptom] = useState('');
  const [severity, setSeverity] = useState(5);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleSymptomSelect = (symptom: string) => {
    if (symptom === 'Pain') {
      const instanceId = params.instanceId as string | undefined;
      navigate(instanceId ? `/log-pain?instanceId=${instanceId}` : '/log-pain');
      return;
    }
    setSelectedSymptom(symptom);
  };

  const handleSave = async () => {
    const symptomToLog = selectedSymptom === 'Other' ? customSymptom : selectedSymptom;

    if (!symptomToLog.trim()) {
      Alert.alert('Required', 'Please select or enter a symptom');
      return;
    }

    setSaving(true);
    try {
      const now = new Date();
      await saveSymptom({
        symptom: symptomToLog.trim(),
        severity,
        description: description.trim(),
        timestamp: now.toISOString(),
        date: getTodayDateString(),
      });

      emitDataUpdate(EVENT.SYMPTOMS);
      try { await emitSymptomEvent(symptomToLog.trim(), String(severity), { notes: description.trim() || undefined }); } catch {}

      const instanceId = params.instanceId as string | undefined;
      if (instanceId) {
        try {
          await logInstanceCompletion(DEFAULT_PATIENT_ID, getTodayDateString(), instanceId, 'completed',
            { type: 'custom', symptom: { name: symptomToLog.trim(), severity } },
            { source: 'record' });
          emitDataUpdate(EVENT.DAILY_INSTANCES);
        } catch (err) {
          logError('LogSymptomScreen.completeInstance', err);
        }
      }

      await hapticSuccess();
      navigateBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to log symptom. Please try again.');
      logError('LogSymptomScreen.handleSave', error);
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
            <SubScreenHeader title="Log Symptom" emoji="🤒" />

            {/* Form */}
            <View style={styles.form}>
              {/* Symptom Selection */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>What symptom? *</Text>
                <View style={styles.symptomGrid}>
                  {COMMON_SYMPTOMS.map((symptom) => (
                    <TouchableOpacity
                      key={symptom}
                      style={[
                        styles.symptomChip,
                        selectedSymptom === symptom && styles.symptomChipSelected,
                      ]}
                      onPress={() => handleSymptomSelect(symptom)}
                      accessibilityLabel={`${symptom} symptom`}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: selectedSymptom === symptom }}
                    >
                      <Text
                        style={[
                          styles.symptomChipText,
                          selectedSymptom === symptom && styles.symptomChipTextSelected,
                        ]}
                      >
                        {symptom}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Custom Symptom */}
              {selectedSymptom === 'Other' && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Specify symptom</Text>
                  <TextInput
                    style={styles.input}
                    value={customSymptom}
                    onChangeText={setCustomSymptom}
                    placeholder="Enter symptom name"
                    placeholderTextColor={colors.textMuted}
                    accessibilityLabel="Custom symptom name"
                  />
                </View>
              )}

              {/* Severity */}
              <View style={styles.formGroup}>
                <View style={styles.severityHeader}>
                  <Text style={styles.label}>Severity</Text>
                  <Text style={styles.severityValue}>{severity}/10</Text>
                </View>
                <View style={styles.severityScale}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <TouchableOpacity
                      key={num}
                      style={[
                        styles.severityButton,
                        severity === num && styles.severityButtonSelected,
                      ]}
                      onPress={() => setSeverity(num)}
                      accessibilityLabel={`Severity ${num} out of 10`}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: severity === num }}
                    >
                      <Text
                        style={[
                          styles.severityButtonText,
                          severity === num && styles.severityButtonTextSelected,
                        ]}
                      >
                        {num}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Description */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Additional notes (optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="When did it start? What makes it better/worse?"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  accessibilityLabel="Symptom notes"
                />
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
                accessibilityLabel={saving ? 'Saving symptom' : 'Log symptom'}
                accessibilityHint="Saves the symptom with severity rating"
                accessibilityRole="button"
                accessibilityState={{ disabled: saving }}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? 'Saving...' : 'Log Symptom'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
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
  textArea: { minHeight: 100, paddingTop: 14 },
  symptomGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  symptomChip: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  symptomChipSelected: {
    backgroundColor: c.accentLight,
    borderColor: c.accent,
  },
  symptomChipText: {
    fontSize: 14,
    color: c.textSecondary,
  },
  symptomChipTextSelected: {
    color: c.accent,
    fontWeight: '500',
  },
  severityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  severityValue: {
    fontSize: 16,
    fontWeight: '600',
    color: c.accent,
  },
  severityScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
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
  severityButtonSelected: {
    backgroundColor: c.accent,
    borderColor: c.accent,
  },
  severityButtonText: {
    fontSize: 13,
    color: c.textSecondary,
  },
  severityButtonTextSelected: {
    color: c.textPrimary,
    fontWeight: '600',
  },
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
