// ============================================================================
// LOG MEDICATION FOR PLAN ITEM
// Contextual logging screen for medications from the Care Plan
// Pre-filled and locked to the specific medication - no search needed
// ============================================================================

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { navigate, navigateBack } from '../lib/navigate';
import { Colors, Spacing, BorderRadius } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import { useCarePlanConfig } from '../hooks/useCarePlanConfig';
import { MedicationPlanItem, formatTimeForDisplay } from '../types/carePlanConfig';
import { saveMedicationLog } from '../utils/centralStorage';
import { hapticSuccess, hapticLight } from '../utils/hapticFeedback';
import { logError } from '../utils/devLog';
import { useDailyCareInstances } from '../hooks/useDailyCareInstances';
import { emitDataUpdate } from '../lib/events';
import { EVENT } from '../lib/eventNames';
import { SaveConfirmation } from '../components/common/SaveConfirmation';
import { SAVE_DESTINATIONS } from '../utils/saveDestinations';

// ============================================================================
// CONSTANTS
// ============================================================================

const SKIP_REASONS = [
  { id: 'out', label: 'Out of medication' },
  { id: 'forgot', label: 'Forgot earlier' },
  { id: 'side_effects', label: 'Side effects' },
  { id: 'not_needed', label: 'Not needed today' },
  { id: 'other', label: 'Other reason' },
];

const SIDE_EFFECTS = [
  { id: 'none', label: 'None', emoji: '✓' },
  { id: 'dizzy', label: 'Dizzy', emoji: '😵' },
  { id: 'nausea', label: 'Nausea', emoji: '🤢' },
  { id: 'tired', label: 'Tired', emoji: '😴' },
  { id: 'headache', label: 'Headache', emoji: '🤕' },
  { id: 'other', label: 'Other', emoji: '❓' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

// Simple medication data structure for display
interface MedicationDisplayData {
  id: string;
  name: string;
  dosage: string;
  instructions?: string;
  timesOfDay?: string[];
  customTimes?: string[];
}

export default function LogMedicationPlanItemScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const params = useLocalSearchParams();

  // Get medication ID and instance ID from params
  // medicationId can be either a MedicationPlanItem.id or CarePlanItem.id
  const medicationId = params.medicationId as string;
  const instanceId = params.instanceId as string | undefined;
  const scheduledTime = params.scheduledTime as string | undefined;
  // Direct name/dosage passed from DailyInstancesPanel
  const itemName = params.itemName as string | undefined;
  const itemDosage = params.itemDosage as string | undefined;
  const itemInstructions = params.itemInstructions as string | undefined;

  // Hooks
  const { config } = useCarePlanConfig();
  const { completeInstance, skipInstance } = useDailyCareInstances();

  // State
  const [medicationData, setMedicationData] = useState<MedicationDisplayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [savedPreview, setSavedPreview] = useState('');
  const [mode, setMode] = useState<'confirm' | 'skip'>('confirm');
  const [skipReason, setSkipReason] = useState<string | null>(null);
  const [sideEffects, setSideEffects] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  // Load medication data - try multiple sources
  useEffect(() => {
    // Priority 1: Direct params from DailyInstancesPanel (denormalized data)
    if (itemName) {
      setMedicationData({
        id: medicationId || 'instance',
        name: itemName,
        dosage: itemDosage || '',
        instructions: itemInstructions,
      });
      setLoading(false);
      return;
    }

    // Priority 2: Look up from bucket-based config
    if (config?.meds?.medications && medicationId) {
      const found = config.meds.medications.find(m => m.id === medicationId);
      if (found) {
        setMedicationData({
          id: found.id,
          name: found.name,
          dosage: found.dosage,
          instructions: found.instructions,
          timesOfDay: found.timesOfDay,
          customTimes: found.customTimes,
        });
        setLoading(false);
        return;
      }
    }

    // If no config loaded yet, wait
    if (!config && medicationId) {
      return; // Still loading
    }

    // No medication found
    setLoading(false);
  }, [config, medicationId, itemName, itemDosage, itemInstructions]);

  // Handle Mark as Taken
  const handleMarkTaken = useCallback(async () => {
    if (!medicationData) return;

    setSaving(true);
    try {
      // Save to medication log
      await saveMedicationLog({
        timestamp: new Date().toISOString(),
        medicationIds: [medicationData.id],
        sideEffects: sideEffects.length > 0 ? sideEffects : undefined,
      } as any);

      // Complete the care instance if we have an instance ID
      if (instanceId) {
        await completeInstance(instanceId, 'taken', {
          sideEffect: sideEffects.length > 0 ? sideEffects.join(', ') : undefined,
          notes: notes.trim() || undefined,
        });
        emitDataUpdate(EVENT.DAILY_INSTANCES);
      }

      await hapticSuccess();
      setSavedPreview(medicationData.name);
      setShowConfirmation(true);
    } catch (error) {
      logError('LogMedicationPlanItemScreen.handleMarkTaken', error);
      Alert.alert('Error', 'Failed to log medication');
      setSaving(false);
    }
  }, [medicationData, sideEffects, notes, instanceId, completeInstance]);

  // Handle Skip
  const handleSkip = useCallback(async () => {
    if (!skipReason) {
      Alert.alert('Select a reason', 'Please choose why you are skipping this medication.');
      return;
    }

    setSaving(true);
    try {
      // Skip the care instance
      if (instanceId) {
        await skipInstance(instanceId, `${SKIP_REASONS.find(r => r.id === skipReason)?.label}: ${notes.trim() || 'No additional notes'}`);
        emitDataUpdate(EVENT.DAILY_INSTANCES);
      }

      await hapticLight();
      setSavedPreview('Skipped');
      setShowConfirmation(true);
    } catch (error) {
      logError('LogMedicationPlanItemScreen.handleSkip', error);
      Alert.alert('Error', 'Failed to skip medication');
      setSaving(false);
    }
  }, [skipReason, notes, instanceId, skipInstance]);

  // Handle Snooze (navigate back for now - future: implement snooze)
  const handleSnooze = useCallback(() => {
    Alert.alert(
      'Snooze Reminder',
      'We\'ll remind you again in 30 minutes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Snooze',
          onPress: () => {
            hapticLight();
            navigateBack();
          }
        },
      ]
    );
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LinearGradient
          colors={[colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
          style={styles.gradient}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (!medicationData) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LinearGradient
          colors={[colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
          style={styles.gradient}
        >
          <View style={styles.loadingContainer}>
            <Text style={styles.errorText}>Medication not found</Text>
            <TouchableOpacity
              style={styles.backLink}
              onPress={() => navigateBack()}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <Text style={styles.backLinkText}>Go back</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const timeDisplay = scheduledTime
    ? formatTimeForDisplay(scheduledTime)
    : medicationData.customTimes?.length
      ? medicationData.customTimes.map(t => formatTimeForDisplay(t)).join(', ')
      : medicationData.timesOfDay?.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ') || '';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigateBack()}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Log Medication</Text>
          <View style={{ width: 44 }} />
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={100}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Medication Card - Pre-filled and locked */}
          <View style={styles.medicationCard}>
            <View style={styles.medicationHeader}>
              <Text style={styles.medicationEmoji}>💊</Text>
              <View style={styles.medicationInfo}>
                <Text style={styles.medicationName}>{medicationData.name}</Text>
                {medicationData.dosage && (
                  <Text style={styles.medicationDosage}>{medicationData.dosage}</Text>
                )}
              </View>
              <View style={styles.lockedBadge}>
                <Text style={styles.lockedBadgeText}>FROM PLAN</Text>
              </View>
            </View>

            {timeDisplay && (
              <View style={styles.scheduleRow}>
                <Text style={styles.scheduleLabel}>Scheduled:</Text>
                <Text style={styles.scheduleTime}>{timeDisplay}</Text>
              </View>
            )}

            {medicationData.instructions && (
              <View style={styles.instructionsRow}>
                <Text style={styles.instructionsLabel}>Instructions:</Text>
                <Text style={styles.instructionsText}>{medicationData.instructions}</Text>
              </View>
            )}
          </View>

          {/* Mode Toggle */}
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeButton, mode === 'confirm' && styles.modeButtonActive]}
              onPress={() => setMode('confirm')}
              accessibilityLabel="Mark Taken"
              accessibilityRole="button"
              accessibilityState={{ selected: mode === 'confirm' }}
            >
              <Text style={[styles.modeButtonText, mode === 'confirm' && styles.modeButtonTextActive]}>
                ✓ Mark Taken
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, mode === 'skip' && styles.modeButtonSkip]}
              onPress={() => setMode('skip')}
              accessibilityLabel="Skip"
              accessibilityRole="button"
              accessibilityState={{ selected: mode === 'skip' }}
            >
              <Text style={[styles.modeButtonText, mode === 'skip' && styles.modeButtonTextSkip]}>
                Skip
              </Text>
            </TouchableOpacity>
          </View>

          {/* Confirm Mode - Side Effects */}
          {mode === 'confirm' && (
            <>
              <Text style={styles.sectionLabel}>SIDE EFFECTS (OPTIONAL)</Text>
              <View style={styles.sideEffectsGrid}>
                {SIDE_EFFECTS.map((effect) => {
                  const isNone = effect.id === 'none';
                  const isSelected = isNone
                    ? sideEffects.length === 0
                    : sideEffects.includes(effect.id);

                  return (
                    <TouchableOpacity
                      key={effect.id}
                      style={[
                        styles.sideEffectOption,
                        isSelected && (isNone ? styles.sideEffectOptionNone : styles.sideEffectOptionSelected),
                      ]}
                      onPress={() => {
                        if (isNone) {
                          setSideEffects([]);
                        } else {
                          setSideEffects(prev =>
                            prev.includes(effect.id)
                              ? prev.filter(id => id !== effect.id)
                              : [...prev, effect.id]
                          );
                        }
                      }}
                      accessibilityLabel={`${effect.label} side effect`}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isSelected }}
                    >
                      <Text style={styles.sideEffectEmoji}>{effect.emoji}</Text>
                      <Text style={[
                        styles.sideEffectLabel,
                        isSelected && (isNone ? styles.sideEffectLabelNone : styles.sideEffectLabelSelected),
                      ]}>
                        {effect.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {sideEffects.length > 0 && (
                <View style={styles.selectedSummary}>
                  <Text style={styles.selectedSummaryLabel}>Selected:</Text>
                  <Text style={styles.selectedSummaryText}>
                    {sideEffects.map(id => SIDE_EFFECTS.find(e => e.id === id)?.label).filter(Boolean).join(', ')}
                  </Text>
                </View>
              )}
            </>
          )}

          {/* Skip Mode - Reason Selection */}
          {mode === 'skip' && (
            <>
              <Text style={styles.sectionLabel}>REASON FOR SKIPPING</Text>
              <View style={styles.skipReasonsContainer}>
                {SKIP_REASONS.map((reason) => (
                  <TouchableOpacity
                    key={reason.id}
                    style={[
                      styles.skipReasonOption,
                      skipReason === reason.id && styles.skipReasonOptionSelected,
                    ]}
                    onPress={() => setSkipReason(reason.id)}
                    accessibilityLabel={reason.label}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: skipReason === reason.id }}
                  >
                    <View style={[
                      styles.skipReasonRadio,
                      skipReason === reason.id && styles.skipReasonRadioSelected,
                    ]}>
                      {skipReason === reason.id && <View style={styles.skipReasonRadioDot} />}
                    </View>
                    <Text style={[
                      styles.skipReasonLabel,
                      skipReason === reason.id && styles.skipReasonLabelSelected,
                    ]}>
                      {reason.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Notes (optional) */}
          <Text style={styles.sectionLabel}>NOTES (OPTIONAL)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Add any additional notes..."
            placeholderTextColor={colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            accessibilityLabel="Medication log notes"
          />

          {/* Snooze Option */}
          {mode === 'confirm' && (
            <TouchableOpacity
              style={styles.snoozeButton}
              onPress={handleSnooze}
              accessibilityLabel="Snooze for 30 minutes"
              accessibilityRole="button"
            >
              <Text style={styles.snoozeIcon}>⏰</Text>
              <Text style={styles.snoozeText}>Snooze for 30 minutes</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
        </KeyboardAvoidingView>

        {/* Footer */}
        <View style={styles.footer}>
          {mode === 'confirm' ? (
            <TouchableOpacity
              style={[styles.primaryButton, saving && styles.primaryButtonDisabled]}
              onPress={handleMarkTaken}
              disabled={saving}
              accessibilityLabel={saving ? 'Saving medication' : 'Mark as taken'}
              accessibilityHint="Records this medication dose as taken"
              accessibilityRole="button"
              accessibilityState={{ disabled: saving }}
            >
              <Text style={styles.primaryButtonText}>
                {saving ? 'Saving...' : '✓ Mark as Taken'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.skipButton,
                (!skipReason || saving) && styles.skipButtonDisabled,
              ]}
              onPress={handleSkip}
              disabled={!skipReason || saving}
              accessibilityLabel={saving ? 'Saving skip' : 'Skip this dose'}
              accessibilityHint="Records this dose as skipped with the selected reason"
              accessibilityRole="button"
              accessibilityState={{ disabled: !skipReason || saving }}
            >
              <Text style={styles.skipButtonText}>
                {saving ? 'Saving...' : 'Skip This Dose'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
      <SaveConfirmation
        visible={showConfirmation}
        icon="💊"
        title="Medication Logged"
        preview={savedPreview}
        destinations={SAVE_DESTINATIONS.medication}
        onDismiss={() => navigateBack()}
      />
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  gradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: c.textSecondary,
    marginBottom: 16,
  },
  backLink: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  backLinkText: {
    fontSize: 14,
    color: c.accent,
    fontWeight: '500',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: c.accentHint,
  },
  backButton: {
    width: 44,
    height: 44,
    backgroundColor: c.backgroundElevated,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: c.textPrimary,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: c.textPrimary,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.xl,
  },

  // Medication Card
  medicationCard: {
    backgroundColor: c.sageFaint,
    borderWidth: 1,
    borderColor: c.sageGlow,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  medicationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  medicationEmoji: {
    fontSize: 32,
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 20,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 4,
  },
  medicationDosage: {
    fontSize: 16,
    color: c.accent,
    fontWeight: '500',
  },
  lockedBadge: {
    backgroundColor: c.purpleWash,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  lockedBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: c.purpleBright,
    letterSpacing: 0.5,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: c.glassActive,
  },
  scheduleLabel: {
    fontSize: 13,
    color: c.textSecondary,
    marginRight: 8,
  },
  scheduleTime: {
    fontSize: 13,
    color: c.accent,
    fontWeight: '500',
  },
  instructionsRow: {
    marginTop: Spacing.sm,
  },
  instructionsLabel: {
    fontSize: 12,
    color: c.textMuted,
    marginBottom: 2,
  },
  instructionsText: {
    fontSize: 13,
    color: c.textSecondary,
    fontStyle: 'italic',
  },

  // Mode Toggle
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: c.glassFaint,
    borderRadius: BorderRadius.md,
    padding: 4,
    marginBottom: Spacing.xl,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  modeButtonActive: {
    backgroundColor: c.greenMuted,
  },
  modeButtonSkip: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textSecondary,
  },
  modeButtonTextActive: {
    color: c.green,
  },
  modeButtonTextSkip: {
    color: c.amberBright,
  },

  // Section Label
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textHalf,
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },

  // Side Effects Grid
  sideEffectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  sideEffectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: c.glassFaint,
    borderWidth: 1,
    borderColor: c.glassActive,
    borderRadius: BorderRadius.md,
  },
  sideEffectOptionSelected: {
    backgroundColor: c.amberLight,
    borderColor: c.amberGlow,
  },
  sideEffectOptionNone: {
    backgroundColor: c.greenTint,
    borderColor: c.greenStrong,
  },
  sideEffectEmoji: {
    fontSize: 16,
  },
  sideEffectLabel: {
    fontSize: 13,
    color: c.textSecondary,
  },
  sideEffectLabelSelected: {
    color: c.amber,
    fontWeight: '600',
  },
  sideEffectLabelNone: {
    color: c.green,
    fontWeight: '500',
  },
  selectedSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.amberFaint,
    borderWidth: 1,
    borderColor: c.amberBorder,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: Spacing.xl,
    gap: 6,
  },
  selectedSummaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: c.amber,
  },
  selectedSummaryText: {
    fontSize: 12,
    color: c.textSecondary,
    flex: 1,
  },

  // Skip Reasons
  skipReasonsContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  skipReasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    backgroundColor: c.glassFaint,
    borderWidth: 1,
    borderColor: c.glassActive,
    borderRadius: BorderRadius.md,
  },
  skipReasonOptionSelected: {
    backgroundColor: c.amberBrightTint,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  skipReasonRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: c.textPlaceholder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipReasonRadioSelected: {
    borderColor: c.amberBright,
  },
  skipReasonRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: c.amberBright,
  },
  skipReasonLabel: {
    fontSize: 14,
    color: c.textSecondary,
  },
  skipReasonLabelSelected: {
    color: c.amberBright,
    fontWeight: '500',
  },

  // Notes
  notesInput: {
    backgroundColor: c.glassFaint,
    borderWidth: 1,
    borderColor: c.glassActive,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 14,
    color: c.textPrimary,
    minHeight: 80,
    marginBottom: Spacing.xl,
  },

  // Snooze Button
  snoozeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: c.glassActive,
    borderRadius: BorderRadius.md,
    borderStyle: 'dashed',
  },
  snoozeIcon: {
    fontSize: 16,
  },
  snoozeText: {
    fontSize: 13,
    color: c.textSecondary,
  },

  // Footer
  footer: {
    padding: Spacing.xl,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: c.accentHint,
    backgroundColor: c.background,
  },
  primaryButton: {
    backgroundColor: c.green,
    paddingVertical: 16,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textPrimary,
  },
  skipButton: {
    backgroundColor: c.amberBright,
    paddingVertical: 16,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  skipButtonDisabled: {
    opacity: 0.5,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
});
