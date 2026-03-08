// Functional vitals logging
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { navigateBack } from '../lib/navigate';
import { Colors } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import { saveVital } from '../utils/vitalsStorage';
import { saveVitalsLog } from '../utils/centralStorage';
import { hapticSuccess } from '../utils/hapticFeedback';
import { getTodayProgress, TodayProgress } from '../utils/rhythmStorage';
import { parseCarePlanContext, getCarePlanBannerText, CarePlanNavigationContext } from '../utils/carePlanRouting';
import { trackCarePlanProgress } from '../utils/carePlanStorage';
import { logError } from '../utils/devLog';
import { emitDataUpdate } from '../lib/events';
import { EVENT } from '../lib/eventNames';
import { logInstanceCompletion, DEFAULT_PATIENT_ID } from '../storage/carePlanRepo';
import { getTodayDateString } from '../services/carePlanGenerator';
import { SubScreenHeader } from '../components/SubScreenHeader';
import { emitVitalsEvent } from '../utils/eventEmitter';

// Vital sign validation ranges
const VITAL_RANGES: Record<string, { min: number; max: number; warnLow?: number; warnHigh?: number; label: string; unit: string }> = {
  systolic:    { min: 60,  max: 250, warnLow: 90,  warnHigh: 180, label: 'Systolic',    unit: 'mmHg' },
  diastolic:   { min: 40,  max: 150, warnLow: 60,  warnHigh: 120, label: 'Diastolic',   unit: 'mmHg' },
  heartRate:   { min: 30,  max: 220, warnLow: 50,  warnHigh: 100, label: 'Heart rate',   unit: 'bpm' },
  oxygen:      { min: 70,  max: 100, warnLow: 92,                 label: 'SpO2',         unit: '%' },
  temperature: { min: 95,  max: 105, warnLow: 96,  warnHigh: 100.4, label: 'Temperature', unit: '\u00B0F' },
  glucose:     { min: 20,  max: 600, warnLow: 54,  warnHigh: 250, label: 'Glucose',      unit: 'mg/dL' },
  weight:      { min: 50,  max: 700,                               label: 'Weight',       unit: 'lbs' },
};

function validateVital(key: string, value: string): { error?: string; warning?: string } {
  if (!value) return {};
  const num = parseFloat(value);
  if (isNaN(num)) return { error: 'Enter a valid number' };
  const range = VITAL_RANGES[key];
  if (!range) return {};
  if (num < range.min || num > range.max) return { error: `${range.label} must be ${range.min}\u2013${range.max} ${range.unit}` };
  if (range.warnHigh && num > range.warnHigh) return { warning: `${range.label} is above typical range. Double-check reading.` };
  if (range.warnLow && num < range.warnLow) return { warning: `${range.label} is below typical range. Double-check reading.` };
  return {};
}

export default function LogVitalsScreen() {
  const params = useLocalSearchParams();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Parse CarePlan context from navigation params
  const carePlanContext = parseCarePlanContext(params as Record<string, string>);
  const isFromCarePlan = carePlanContext !== null;

  // Prepopulate with typical values - user can adjust if needed
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [oxygen, setOxygen] = useState('');
  const [temperature, setTemperature] = useState('');
  const [glucose, setGlucose] = useState('');
  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [progress, setProgress] = useState<TodayProgress | null>(null);

  // Validation
  const validations = {
    systolic: validateVital('systolic', systolic),
    diastolic: validateVital('diastolic', diastolic),
    heartRate: validateVital('heartRate', heartRate),
    oxygen: validateVital('oxygen', oxygen),
    temperature: validateVital('temperature', temperature),
    glucose: validateVital('glucose', glucose),
    weight: validateVital('weight', weight),
  };
  const hasErrors = Object.values(validations).some(v => v.error);

  // Load rhythm progress on mount
  React.useEffect(() => {
    const loadProgress = async () => {
      const progressData = await getTodayProgress();
      setProgress(progressData);
    };
    loadProgress();
  }, []);

  const handleSave = async () => {
    if (hasErrors) return;
    setSaving(true);
    try {
      const now = new Date();

      // Save to vitalsStorage (for detailed vitals history)
      if (systolic && diastolic) {
        await saveVital({ type: 'systolic', value: parseFloat(systolic), unit: 'mmHg', timestamp: now.toISOString() });
        await saveVital({ type: 'diastolic', value: parseFloat(diastolic), unit: 'mmHg', timestamp: now.toISOString() });
      }
      if (heartRate) await saveVital({ type: 'heartRate', value: parseFloat(heartRate), unit: 'bpm', timestamp: now.toISOString() });
      if (oxygen) await saveVital({ type: 'oxygen', value: parseFloat(oxygen), unit: '%', timestamp: now.toISOString() });
      if (temperature) await saveVital({ type: 'temperature', value: parseFloat(temperature), unit: '\u00B0F', timestamp: now.toISOString() });
      if (glucose) await saveVital({ type: 'glucose', value: parseFloat(glucose), unit: 'mg/dL', timestamp: now.toISOString() });
      if (weight) await saveVital({ type: 'weight', value: parseFloat(weight), unit: 'lbs', timestamp: now.toISOString() });

      // Also save to centralStorage for Now page sync
      await saveVitalsLog({
        timestamp: now.toISOString(),
        systolic: systolic ? parseFloat(systolic) : undefined,
        diastolic: diastolic ? parseFloat(diastolic) : undefined,
        heartRate: heartRate ? parseFloat(heartRate) : undefined,
        oxygen: oxygen ? parseFloat(oxygen) : undefined,
        temperature: temperature ? parseFloat(temperature) : undefined,
        glucose: glucose ? parseFloat(glucose) : undefined,
        weight: weight ? parseFloat(weight) : undefined,
      });

      // Track CarePlan progress if navigated from CarePlan
      if (carePlanContext) {
        await trackCarePlanProgress(
          carePlanContext.routineId,
          carePlanContext.carePlanItemId,
          { logType: 'vitals' }
        );
      }

      // Mark the daily care instance as completed (updates progress card)
      const instanceId = params.instanceId as string | undefined;
      if (instanceId) {
        try {
          await logInstanceCompletion(
            DEFAULT_PATIENT_ID,
            getTodayDateString(),
            instanceId,
            'completed',
            { type: 'vitals', systolic: Number(systolic) || undefined, diastolic: Number(diastolic) || undefined, heartRate: Number(heartRate) || undefined, oxygen: Number(oxygen) || undefined, temperature: Number(temperature) || undefined, glucose: Number(glucose) || undefined, weight: Number(weight) || undefined },
            { source: 'record' }
          );
          emitDataUpdate(EVENT.DAILY_INSTANCES);
        } catch (err) {
          logError('LogVitals.completeInstance', err);
        }
      }

      await hapticSuccess();
      emitDataUpdate(EVENT.VITALS);
      try { await emitVitalsEvent({ systolic: systolic ? parseFloat(systolic) : undefined, diastolic: diastolic ? parseFloat(diastolic) : undefined, heartRate: heartRate ? parseFloat(heartRate) : undefined, oxygen: oxygen ? parseFloat(oxygen) : undefined, temperature: temperature ? parseFloat(temperature) : undefined, glucose: glucose ? parseFloat(glucose) : undefined, weight: weight ? parseFloat(weight) : undefined }); } catch {}
      navigateBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to log vitals');
      logError('LogVitalsScreen.handleSave', error);
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd]} style={styles.gradient}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={100}>
        <ScrollView style={styles.scrollView}>
          <View style={styles.content}>
            <SubScreenHeader title="Log Vitals" subtitle="Blood pressure, glucose & more" emoji="❤️" />

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
            {!isFromCarePlan && progress && progress.vitals.expected > 0 && (
              <View style={styles.contextBanner}>
                <Text style={styles.contextText}>
                  {progress.vitals.completed} of {progress.vitals.expected} vitals checks logged today
                </Text>
              </View>
            )}

            <View style={styles.form}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Blood Pressure</Text>
                <View style={styles.bpRow}>
                  <TextInput onFocus={() => setFocusedField('systolic')} onBlur={() => setFocusedField(null)} style={[styles.input, styles.bpInput, focusedField === 'systolic' && styles.inputFocused, validations.systolic.error && styles.inputError]} value={systolic} onChangeText={setSystolic} placeholder="120" keyboardType="numeric" placeholderTextColor={colors.textMuted} accessibilityLabel="Systolic blood pressure" />
                  <Text style={styles.bpSlash}>/</Text>
                  <TextInput onFocus={() => setFocusedField('diastolic')} onBlur={() => setFocusedField(null)} style={[styles.input, styles.bpInput, focusedField === 'diastolic' && styles.inputFocused, validations.diastolic.error && styles.inputError]} value={diastolic} onChangeText={setDiastolic} placeholder="80" keyboardType="numeric" placeholderTextColor={colors.textMuted} accessibilityLabel="Diastolic blood pressure" />
                  <Text style={styles.unit}>mmHg</Text>
                </View>
                {(validations.systolic.error || validations.diastolic.error) && (
                  <Text style={styles.validationError}>{validations.systolic.error || validations.diastolic.error}</Text>
                )}
                {!validations.systolic.error && !validations.diastolic.error && (validations.systolic.warning || validations.diastolic.warning) && (
                  <Text style={styles.validationWarning}>{validations.systolic.warning || validations.diastolic.warning}</Text>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Heart Rate</Text>
                <View style={styles.inputRow}>
                  <TextInput onFocus={() => setFocusedField('heartRate')} onBlur={() => setFocusedField(null)} style={[styles.input, styles.flex1, focusedField === 'heartRate' && styles.inputFocused, validations.heartRate.error && styles.inputError]} value={heartRate} onChangeText={setHeartRate} placeholder="72" keyboardType="numeric" placeholderTextColor={colors.textMuted} accessibilityLabel="Heart rate in beats per minute" />
                  <Text style={styles.unit}>bpm</Text>
                </View>
                {validations.heartRate.error && <Text style={styles.validationError}>{validations.heartRate.error}</Text>}
                {!validations.heartRate.error && validations.heartRate.warning && <Text style={styles.validationWarning}>{validations.heartRate.warning}</Text>}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>SpO2</Text>
                <View style={styles.inputRow}>
                  <TextInput onFocus={() => setFocusedField('oxygen')} onBlur={() => setFocusedField(null)} style={[styles.input, styles.flex1, focusedField === 'oxygen' && styles.inputFocused, validations.oxygen.error && styles.inputError]} value={oxygen} onChangeText={setOxygen} placeholder="98" keyboardType="numeric" placeholderTextColor={colors.textMuted} accessibilityLabel="Oxygen saturation percentage" />
                  <Text style={styles.unit}>%</Text>
                </View>
                {validations.oxygen.error && <Text style={styles.validationError}>{validations.oxygen.error}</Text>}
                {!validations.oxygen.error && validations.oxygen.warning && <Text style={styles.validationWarning}>{validations.oxygen.warning}</Text>}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Temperature</Text>
                <View style={styles.inputRow}>
                  <TextInput onFocus={() => setFocusedField('temperature')} onBlur={() => setFocusedField(null)} style={[styles.input, styles.flex1, focusedField === 'temperature' && styles.inputFocused, validations.temperature.error && styles.inputError]} value={temperature} onChangeText={setTemperature} placeholder="98.6" keyboardType="numeric" placeholderTextColor={colors.textMuted} accessibilityLabel="Temperature in degrees Fahrenheit" />
                  <Text style={styles.unit}>{'\u00B0'}F</Text>
                </View>
                {validations.temperature.error && <Text style={styles.validationError}>{validations.temperature.error}</Text>}
                {!validations.temperature.error && validations.temperature.warning && <Text style={styles.validationWarning}>{validations.temperature.warning}</Text>}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Blood Glucose</Text>
                <View style={styles.inputRow}>
                  <TextInput onFocus={() => setFocusedField('glucose')} onBlur={() => setFocusedField(null)} style={[styles.input, styles.flex1, focusedField === 'glucose' && styles.inputFocused, validations.glucose.error && styles.inputError]} value={glucose} onChangeText={setGlucose} placeholder="100" keyboardType="numeric" placeholderTextColor={colors.textMuted} accessibilityLabel="Blood glucose in milligrams per deciliter" />
                  <Text style={styles.unit}>mg/dL</Text>
                </View>
                {validations.glucose.error && <Text style={styles.validationError}>{validations.glucose.error}</Text>}
                {!validations.glucose.error && validations.glucose.warning && <Text style={styles.validationWarning}>{validations.glucose.warning}</Text>}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Weight</Text>
                <View style={styles.inputRow}>
                  <TextInput onFocus={() => setFocusedField('weight')} onBlur={() => setFocusedField(null)} style={[styles.input, styles.flex1, focusedField === 'weight' && styles.inputFocused, validations.weight.error && styles.inputError]} value={weight} onChangeText={setWeight} placeholder="150" keyboardType="numeric" placeholderTextColor={colors.textMuted} accessibilityLabel="Weight in pounds" />
                  <Text style={styles.unit}>lbs</Text>
                </View>
                {validations.weight.error && <Text style={styles.validationError}>{validations.weight.error}</Text>}
                {!validations.weight.error && validations.weight.warning && <Text style={styles.validationWarning}>{validations.weight.warning}</Text>}
              </View>

              {/* Medical Disclaimer */}
              <View style={styles.disclaimerBanner}>
                <Text style={styles.disclaimerText}>
                  <Text style={styles.disclaimerBold}>Not a medical device.</Text>{' '}
                  Readings are for personal tracking only. Consult your healthcare provider for clinical decisions.
                </Text>
              </View>

              <TouchableOpacity style={[styles.saveButton, (saving || hasErrors) && styles.saveButtonDisabled]} onPress={handleSave} disabled={saving || hasErrors} accessibilityLabel={saving ? 'Saving vitals' : hasErrors ? 'Fix invalid values to save' : 'Log vitals'} accessibilityHint="Saves blood pressure, glucose, and weight readings" accessibilityRole="button" accessibilityState={{ disabled: saving || hasErrors }}>
                <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Log Vitals'}</Text>
              </TouchableOpacity>
              {hasErrors && <Text style={styles.validationError}>Fix invalid values above to save</Text>}
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
  form: { gap: 24 },
  formGroup: { gap: 8 },
  label: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: c.textTertiary,
    marginBottom: 5,
  },
  input: {
    backgroundColor: c.surfaceElevated,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: c.textPrimary,
  },
  inputFocused: {
    borderColor: 'rgba(52, 211, 153, 0.35)',
  },
  bpRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bpInput: { flex: 1 },
  bpSlash: { fontSize: 24, color: c.textMuted },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex1: { flex: 1 },
  unit: { fontSize: 13, color: c.textMuted, minWidth: 50 },
  inputError: { borderColor: 'rgba(239, 68, 68, 0.5)' },
  validationError: { fontSize: 11, color: '#EF4444', marginTop: 4 },
  validationWarning: { fontSize: 11, color: '#F59E0B', marginTop: 4 },
  saveButton: { backgroundColor: c.accent, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 12 },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: c.textPrimary, fontSize: 15, fontWeight: '600' },
  disclaimerBanner: { backgroundColor: 'rgba(251, 191, 36, 0.1)', borderLeftWidth: 3, borderLeftColor: '#F59E0B', borderRadius: 8, padding: 12, marginTop: 8 },
  disclaimerText: { fontSize: 12, color: c.textSecondary, lineHeight: 17 },
  disclaimerBold: { fontWeight: '700', color: c.textPrimary },
});
