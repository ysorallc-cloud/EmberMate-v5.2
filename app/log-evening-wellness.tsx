// ============================================================================
// LOG EVENING WELLNESS CHECK
// Mood, meals logged, day rating, highlights/concerns
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
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
import { useWellnessSettings } from '../hooks/useWellnessSettings';
import { saveEveningWellness, skipEveningWellness } from '../utils/wellnessCheckStorage';
import { listDailyInstances, logInstanceCompletion, DEFAULT_PATIENT_ID } from '../storage/carePlanRepo';
import { getTodayDateString } from '../services/carePlanGenerator';
import { emitDataUpdate } from '../lib/events';
import { hapticSuccess } from '../utils/hapticFeedback';
import { EVENT } from '../lib/eventNames';
import { logWarning } from '../utils/devLog';
import { emitWellnessEvent } from '../utils/eventEmitter';
import { SaveConfirmation } from '../components/common/SaveConfirmation';
import { SAVE_DESTINATIONS } from '../utils/saveDestinations';

const MOOD_OPTIONS = [
  { value: 5, emoji: '😄', label: 'Great' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 3, emoji: '😐', label: 'Managing' },
  { value: 2, emoji: '😟', label: 'Difficult' },
  { value: 1, emoji: '😢', label: 'Struggling' },
] as const;

const ENERGY_OPTIONS = [
  { value: 5, label: 'Energetic' },
  { value: 4, label: 'Good' },
  { value: 3, label: 'Moderate' },
  { value: 2, label: 'Low' },
  { value: 1, label: 'Exhausted' },
] as const;

const SYMPTOM_OPTIONS = [
  'Pain',
  'Nausea',
  'Dizziness',
  'Fatigue',
  'Anxiety',
  'Confusion',
  'None today',
] as const;

const DAY_RATING_OPTIONS = [
  { value: 5, emoji: '⭐⭐⭐⭐⭐', label: 'Excellent' },
  { value: 4, emoji: '⭐⭐⭐⭐', label: 'Good' },
  { value: 3, emoji: '⭐⭐⭐', label: 'Okay' },
  { value: 2, emoji: '⭐⭐', label: 'Difficult' },
  { value: 1, emoji: '⭐', label: 'Very Hard' },
] as const;

const PAIN_LEVEL_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'mild', label: 'Mild' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' },
] as const;

const ALERTNESS_OPTIONS = [
  { value: 'alert', label: 'Alert' },
  { value: 'confused', label: 'Confused' },
  { value: 'drowsy', label: 'Drowsy' },
  { value: 'unresponsive', label: 'Unresponsive' },
] as const;

const BOWEL_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'unknown', label: 'Unknown' },
] as const;

const BATHING_OPTIONS = [
  { value: 'independent', label: 'Independent' },
  { value: 'partial-assist', label: 'Partial Assist' },
  { value: 'full-assist', label: 'Full Assist' },
  { value: 'not-today', label: 'Not Today' },
] as const;

const MOBILITY_OPTIONS = [
  { value: 'independent', label: 'Independent' },
  { value: 'walker', label: 'Walker' },
  { value: 'cane', label: 'Cane' },
  { value: 'wheelchair', label: 'Wheelchair' },
  { value: 'bed-bound', label: 'Bed-bound' },
] as const;

export default function LogEveningWellnessScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { instanceId: routeInstanceId } = useLocalSearchParams<{ instanceId?: string }>();
  const { settings } = useWellnessSettings();
  const eveningOptional = settings.evening.optionalChecks ?? {};
  const hasAnyOptionalEnabled = Object.values(eveningOptional).some(Boolean);
  const [mood, setMood] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [mealsLogged, setMealsLogged] = useState(false);
  const [dayRating, setDayRating] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [highlights, setHighlights] = useState('');
  const [concerns, setConcerns] = useState('');
  const [showCareDetails, setShowCareDetails] = useState(false);
  const [painLevel, setPainLevel] = useState<'none' | 'mild' | 'moderate' | 'severe' | null>(null);
  const [alertness, setAlertness] = useState<'alert' | 'confused' | 'drowsy' | 'unresponsive' | null>(null);
  const [bowelMovement, setBowelMovement] = useState<'yes' | 'no' | 'unknown' | null>(null);
  const [bathingStatus, setBathingStatus] = useState<'independent' | 'partial-assist' | 'full-assist' | 'not-today' | null>(null);
  const [mobilityStatus, setMobilityStatus] = useState<'independent' | 'walker' | 'cane' | 'wheelchair' | 'bed-bound' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [savedPreview, setSavedPreview] = useState('');

  const toggleSymptom = (symptom: string) => {
    if (symptom === 'None today') {
      setSymptoms(['None today']);
    } else {
      setSymptoms((prev) => {
        const filtered = prev.filter((s) => s !== 'None today');
        return filtered.includes(symptom)
          ? filtered.filter((s) => s !== symptom)
          : [...filtered, symptom];
      });
    }
  };

  const canSubmit = mood !== null && dayRating !== null;

  const handleSkip = async () => {
    Alert.alert(
      'Skip Evening Wellness Check?',
      'This will mark the check as complete without logging details.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: async () => {
            try {
              const today = getTodayDateString();
              await skipEveningWellness(today);
              // Bridge to care plan instance
              try {
                const instances = await listDailyInstances(DEFAULT_PATIENT_ID, today);
                const inst = routeInstanceId
                  ? instances.find(i => i.id === routeInstanceId)
                  : instances.find(i => i.itemType === 'wellness' && i.windowLabel === 'evening' && i.status === 'pending');
                if (inst) {
                  await logInstanceCompletion(DEFAULT_PATIENT_ID, today, inst.id, 'skipped');
                  emitDataUpdate(EVENT.DAILY_INSTANCES);
                }
              } catch (e) {
                logWarning('EveningWellness.updateCarePlan', String(e));
              }
              emitDataUpdate(EVENT.WELLNESS);
              await hapticSuccess();
              setSavedPreview('Skipped');
              setShowConfirmation(true);
            } catch (error) {
              Alert.alert('Error', 'Failed to skip wellness check');
            }
          },
        },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const today = getTodayDateString();
      await saveEveningWellness(today, {
        mood: mood!,
        mealsLogged,
        dayRating: dayRating!,
        ...(energyLevel !== null && { energyLevel }),
        ...(symptoms.length > 0 && { symptoms }),
        highlights: highlights || undefined,
        concerns: concerns || undefined,
        ...(painLevel && { painLevel }),
        ...(alertness && { alertness }),
        ...(bowelMovement && { bowelMovement }),
        ...(bathingStatus && { bathingStatus }),
        ...(mobilityStatus && { mobilityStatus }),
        completedAt: new Date(),
      });
      // Bridge to care plan instance
      try {
        const instances = await listDailyInstances(DEFAULT_PATIENT_ID, today);
        const inst = routeInstanceId
          ? instances.find(i => i.id === routeInstanceId)
          : instances.find(i => i.itemType === 'wellness' && i.windowLabel === 'evening' && i.status === 'pending');
        if (inst) {
          await logInstanceCompletion(DEFAULT_PATIENT_ID, today, inst.id, 'completed');
          emitDataUpdate(EVENT.DAILY_INSTANCES);
        }
      } catch (e) {
        logWarning('EveningWellness.updateCarePlan', String(e));
      }
      emitDataUpdate(EVENT.WELLNESS);
      try { await emitWellnessEvent('evening', { mood: mood!, dayRating: dayRating!, mealsLogged }); } catch {}
      await hapticSuccess();
      const moodLabel = MOOD_OPTIONS.find(o => o.value === mood)?.label || '';
      const dayLabel = DAY_RATING_OPTIONS.find(o => o.value === dayRating)?.label || '';
      setSavedPreview(`Mood: ${moodLabel}, Day: ${dayLabel}`);
      setShowConfirmation(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to save wellness check');
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigateBack()} accessibilityLabel="Go back" accessibilityRole="button">
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Evening Wellness Check</Text>
          <TouchableOpacity onPress={handleSkip} accessibilityLabel="Skip evening wellness check" accessibilityRole="button">
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={100}>
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Mood */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How are they feeling now?</Text>
            <View style={styles.optionGrid}>
              {MOOD_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    mood === option.value && styles.optionButtonSelected,
                  ]}
                  onPress={() => setMood(option.value)}
                  accessibilityLabel={option.label}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: mood === option.value }}
                >
                  <Text style={styles.optionEmoji}>{option.emoji}</Text>
                  <Text
                    style={[
                      styles.optionLabel,
                      mood === option.value && styles.optionLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Energy Level */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Energy level today?</Text>
            <Text style={styles.sectionSubtitle}>Optional</Text>
            <View style={styles.chipRow}>
              {ENERGY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.chip,
                    energyLevel === option.value && styles.chipSelected,
                  ]}
                  onPress={() => setEnergyLevel(energyLevel === option.value ? null : option.value)}
                  accessibilityLabel={`Energy: ${option.label}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: energyLevel === option.value }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      energyLevel === option.value && styles.chipTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Symptoms */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Any symptoms today?</Text>
            <Text style={styles.sectionSubtitle}>Optional — select all that apply</Text>
            <View style={styles.chipRow}>
              {SYMPTOM_OPTIONS.map((symptom) => (
                <TouchableOpacity
                  key={symptom}
                  style={[
                    styles.chip,
                    symptoms.includes(symptom) && styles.chipSelected,
                  ]}
                  onPress={() => toggleSymptom(symptom)}
                  accessibilityLabel={symptom}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: symptoms.includes(symptom) }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      symptoms.includes(symptom) && styles.chipTextSelected,
                    ]}
                  >
                    {symptom}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Meals Logged */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Meals tracked today?</Text>
            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setMealsLogged(!mealsLogged)}
              accessibilityLabel="Meals were logged today"
              accessibilityRole="checkbox"
              accessibilityState={{ checked: mealsLogged }}
            >
              <View
                style={[
                  styles.checkbox,
                  mealsLogged && styles.checkboxChecked,
                ]}
              >
                {mealsLogged && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.toggleLabel}>
                Yes, meals were logged in Quick Log
              </Text>
            </TouchableOpacity>
          </View>

          {/* Day Rating */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How was the day overall?</Text>
            <View style={styles.ratingList}>
              {DAY_RATING_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.ratingOption,
                    dayRating === option.value && styles.ratingOptionSelected,
                  ]}
                  onPress={() => setDayRating(option.value)}
                  accessibilityLabel={option.label}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: dayRating === option.value }}
                >
                  <Text style={styles.ratingEmoji}>{option.emoji}</Text>
                  <Text
                    style={[
                      styles.ratingLabel,
                      dayRating === option.value && styles.ratingLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  <View
                    style={[
                      styles.radio,
                      dayRating === option.value && styles.radioSelected,
                    ]}
                  >
                    {dayRating === option.value && (
                      <View style={styles.radioDot} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Highlights (Optional) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Any highlights today?</Text>
            <Text style={styles.sectionSubtitle}>Optional</Text>
            <TextInput
              style={styles.textInput}
              value={highlights}
              onChangeText={setHighlights}
              placeholder="Good moments, wins, positives..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              accessibilityLabel="Today's highlights"
            />
          </View>

          {/* Concerns (Optional) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Any concerns?</Text>
            <Text style={styles.sectionSubtitle}>Optional</Text>
            <TextInput
              style={styles.textInput}
              value={concerns}
              onChangeText={setConcerns}
              placeholder="Things to watch, issues to discuss..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              accessibilityLabel="Today's concerns"
            />
          </View>

          {/* Care Details (collapsible, only shown if any optional field is enabled) */}
          {hasAnyOptionalEnabled && (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.careDetailsToggle}
                onPress={() => setShowCareDetails(!showCareDetails)}
                accessibilityLabel="Add care details"
                accessibilityRole="button"
                accessibilityState={{ expanded: showCareDetails }}
              >
                <Text style={styles.careDetailsToggleText}>
                  Add care details (optional)
                </Text>
                <Text style={styles.careDetailsToggleArrow}>
                  {showCareDetails ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>

              {showCareDetails && (
                <View style={styles.careDetailsContent}>
                  {/* Pain Level */}
                  {(eveningOptional.painLevel ?? false) && (
                    <View style={styles.careDetailGroup}>
                      <Text style={styles.careDetailLabel}>Pain Level</Text>
                      <View style={styles.chipRow}>
                        {PAIN_LEVEL_OPTIONS.map((option) => (
                          <TouchableOpacity
                            key={option.value}
                            style={[
                              styles.chip,
                              painLevel === option.value && styles.chipSelected,
                            ]}
                            onPress={() => setPainLevel(painLevel === option.value ? null : option.value)}
                            accessibilityLabel={option.label}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: painLevel === option.value }}
                          >
                            <Text
                              style={[
                                styles.chipText,
                                painLevel === option.value && styles.chipTextSelected,
                              ]}
                            >
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Alertness */}
                  {(eveningOptional.alertness ?? false) && (
                    <View style={styles.careDetailGroup}>
                      <Text style={styles.careDetailLabel}>Alertness</Text>
                      <View style={styles.chipRow}>
                        {ALERTNESS_OPTIONS.map((option) => (
                          <TouchableOpacity
                            key={option.value}
                            style={[
                              styles.chip,
                              alertness === option.value && styles.chipSelected,
                            ]}
                            onPress={() => setAlertness(alertness === option.value ? null : option.value)}
                            accessibilityLabel={option.label}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: alertness === option.value }}
                          >
                            <Text
                              style={[
                                styles.chipText,
                                alertness === option.value && styles.chipTextSelected,
                              ]}
                            >
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Bowel Movement */}
                  {(eveningOptional.bowelMovement ?? false) && (
                    <View style={styles.careDetailGroup}>
                      <Text style={styles.careDetailLabel}>Bowel Movement</Text>
                      <View style={styles.chipRow}>
                        {BOWEL_OPTIONS.map((option) => (
                          <TouchableOpacity
                            key={option.value}
                            style={[
                              styles.chip,
                              bowelMovement === option.value && styles.chipSelected,
                            ]}
                            onPress={() => setBowelMovement(bowelMovement === option.value ? null : option.value)}
                            accessibilityLabel={option.label}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: bowelMovement === option.value }}
                          >
                            <Text
                              style={[
                                styles.chipText,
                                bowelMovement === option.value && styles.chipTextSelected,
                              ]}
                            >
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Bathing */}
                  {(eveningOptional.bathingStatus ?? false) && (
                    <View style={styles.careDetailGroup}>
                      <Text style={styles.careDetailLabel}>Bathing</Text>
                      <View style={styles.chipRow}>
                        {BATHING_OPTIONS.map((option) => (
                          <TouchableOpacity
                            key={option.value}
                            style={[
                              styles.chip,
                              bathingStatus === option.value && styles.chipSelected,
                            ]}
                            onPress={() => setBathingStatus(bathingStatus === option.value ? null : option.value)}
                            accessibilityLabel={option.label}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: bathingStatus === option.value }}
                          >
                            <Text
                              style={[
                                styles.chipText,
                                bathingStatus === option.value && styles.chipTextSelected,
                              ]}
                            >
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Mobility */}
                  {(eveningOptional.mobilityStatus ?? false) && (
                    <View style={styles.careDetailGroup}>
                      <Text style={styles.careDetailLabel}>Mobility</Text>
                      <View style={styles.chipRow}>
                        {MOBILITY_OPTIONS.map((option) => (
                          <TouchableOpacity
                            key={option.value}
                            style={[
                              styles.chip,
                              mobilityStatus === option.value && styles.chipSelected,
                            ]}
                            onPress={() => setMobilityStatus(mobilityStatus === option.value ? null : option.value)}
                            accessibilityLabel={option.label}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: mobilityStatus === option.value }}
                          >
                            <Text
                              style={[
                                styles.chipText,
                                mobilityStatus === option.value && styles.chipTextSelected,
                              ]}
                            >
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </ScrollView>
        </KeyboardAvoidingView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            accessibilityLabel={isSubmitting ? 'Saving evening wellness check' : 'Complete evening wellness check'}
            accessibilityHint="Saves evening wellness check answers"
            accessibilityRole="button"
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Saving...' : 'Complete Check'}
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
      <SaveConfirmation
        visible={showConfirmation}
        icon="🌙"
        title="Evening Check-In Saved"
        preview={savedPreview}
        destinations={SAVE_DESTINATIONS.wellness}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 18,
    color: c.textPrimary,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: c.textPrimary,
  },
  skipText: {
    fontSize: 16,
    color: c.textMuted,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: c.textMuted,
    marginBottom: 12,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  optionButton: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  optionButtonSelected: {
    backgroundColor: c.accentHint,
    borderColor: c.accent,
  },
  optionEmoji: {
    fontSize: 32,
  },
  optionLabel: {
    fontSize: 12,
    color: c.textSecondary,
  },
  optionLabelSelected: {
    color: c.accent,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginTop: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: c.border,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: c.accent,
    borderColor: c.accent,
  },
  checkmark: {
    fontSize: 14,
    color: c.textPrimary,
    fontWeight: 'bold',
  },
  toggleLabel: {
    flex: 1,
    fontSize: 15,
    color: c.textPrimary,
  },
  ratingList: {
    gap: 12,
    marginTop: 12,
  },
  ratingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  ratingOptionSelected: {
    backgroundColor: c.accentHint,
    borderColor: c.accent,
  },
  ratingEmoji: {
    fontSize: 20,
  },
  ratingLabel: {
    flex: 1,
    fontSize: 15,
    color: c.textSecondary,
  },
  ratingLabelSelected: {
    color: c.accent,
    fontWeight: '600',
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: c.border,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: c.accent,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: c.accent,
  },
  textInput: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    padding: 14,
    color: c.textPrimary,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
    marginTop: 12,
  },
  // Care Details collapsible section
  careDetailsToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
  },
  careDetailsToggleText: {
    fontSize: 15,
    color: c.textMuted,
  },
  careDetailsToggleArrow: {
    fontSize: 12,
    color: c.textMuted,
  },
  careDetailsContent: {
    marginTop: 16,
    gap: 20,
  },
  careDetailGroup: {
    gap: 8,
  },
  careDetailLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: c.textPrimary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 20,
  },
  chipSelected: {
    backgroundColor: c.accentHint,
    borderColor: c.accent,
  },
  chipText: {
    fontSize: 14,
    color: c.textSecondary,
  },
  chipTextSelected: {
    color: c.accent,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  submitButton: {
    paddingVertical: 16,
    backgroundColor: c.accent,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: c.borderStrong,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textPrimary,
  },
});
