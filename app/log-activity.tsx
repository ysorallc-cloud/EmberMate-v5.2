// ============================================================================
// ACTIVITY LOGGING SCREEN - Simple Activity Tracker
// ============================================================================

import React, { useState, useMemo } from 'react';
import { devLog, logError } from '../utils/devLog';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { navigateBack } from '../lib/navigate';
import { AuroraBackground } from '../components/aurora/AuroraBackground';
import { Colors } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import { logInstanceCompletion, DEFAULT_PATIENT_ID } from '../storage/carePlanRepo';
import { emitDataUpdate } from '../lib/events';
import { hapticSuccess } from '../utils/hapticFeedback';
import { EVENT } from '../lib/eventNames';
import { getTodayDateString } from '../services/carePlanGenerator';
import { emitActivityEvent } from '../utils/eventEmitter';

const ACTIVITY_TYPES = [
  { id: 'walk', emoji: '🚶', label: 'Walking' },
  { id: 'exercise', emoji: '💪', label: 'Exercise' },
  { id: 'stretch', emoji: '🧘', label: 'Stretching' },
  { id: 'garden', emoji: '🌱', label: 'Gardening' },
  { id: 'chores', emoji: '🧹', label: 'Chores' },
  { id: 'other', emoji: '✨', label: 'Other' },
];

export default function LogActivityScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const params = useLocalSearchParams();
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleActivity = (activityId: string) => {
    setSelectedActivities(prev =>
      prev.includes(activityId)
        ? prev.filter(id => id !== activityId)
        : [...prev, activityId]
    );
  };

  const handleSave = async () => {
    if (selectedActivities.length === 0) {
      Alert.alert('Select Activity', 'Please select at least one activity type');
      return;
    }

    try {
      setSaving(true);
      // For now, just log to console - can be connected to storage later
      devLog('Activity logged:', { selectedActivities, duration, notes });
      try { await emitActivityEvent({ activities: selectedActivities, duration: parseInt(duration) || 0, notes }); } catch {}

      // Mark the daily care instance as completed (updates progress card)
      const instanceId = params.instanceId as string | undefined;
      if (instanceId) {
        try {
          await logInstanceCompletion(
            DEFAULT_PATIENT_ID,
            getTodayDateString(),
            instanceId,
            'completed',
            { type: 'activity', activityType: selectedActivities.join(', '), duration: parseInt(duration) || 0 },
            { source: 'record' }
          );
          emitDataUpdate(EVENT.DAILY_INSTANCES);
        } catch (err) {
          logError('LogActivity.completeInstance', err);
        }
      }

      await hapticSuccess();
      navigateBack();
    } catch (error) {
      logError('LogActivityScreen.handleSave', error);
      Alert.alert('Error', 'Failed to save activity');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <AuroraBackground variant="log" />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigateBack()}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Activity today?</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          <Text style={styles.subtitle}>What did they do?</Text>

          {/* Activity Types */}
          <View style={styles.activityGrid}>
            {ACTIVITY_TYPES.map(activity => (
              <TouchableOpacity
                key={activity.id}
                style={[
                  styles.activityCard,
                  selectedActivities.includes(activity.id) && styles.activityCardSelected,
                ]}
                onPress={() => toggleActivity(activity.id)}
                accessibilityLabel={`${activity.label}, ${selectedActivities.includes(activity.id) ? 'selected' : 'not selected'}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selectedActivities.includes(activity.id) }}
              >
                <Text style={styles.activityEmoji}>{activity.emoji}</Text>
                <Text style={[
                  styles.activityLabel,
                  selectedActivities.includes(activity.id) && styles.activityLabelSelected,
                ]}>
                  {activity.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Duration */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>How long? (optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., 30 minutes"
              placeholderTextColor={colors.textPlaceholder}
              value={duration}
              onChangeText={setDuration}
              accessibilityLabel="Activity duration"
            />
          </View>

          {/* Notes */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Any observations..."
              placeholderTextColor={colors.textPlaceholder}
              multiline
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
              accessibilityLabel="Activity notes"
            />
          </View>
        </View>

        {/* Save Button */}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
            accessibilityLabel={saving ? 'Saving activity' : 'Save activity'}
            accessibilityHint="Saves the selected activities and details"
            accessibilityRole="button"
            accessibilityState={{ disabled: saving }}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Done ✓'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 28,
    color: c.textPrimary,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: c.textPrimary,
  },
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  subtitle: {
    fontSize: 14,
    color: c.textMuted,
    marginBottom: 20,
  },

  // Activity Grid
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 30,
  },
  activityCard: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: c.glassFaint,
    borderWidth: 1,
    borderColor: c.glassActive,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  activityCardSelected: {
    backgroundColor: c.sageBorder,
    borderColor: c.accent,
  },
  activityEmoji: {
    fontSize: 28,
  },
  activityLabel: {
    fontSize: 12,
    color: c.textSecondary,
  },
  activityLabelSelected: {
    color: c.accent,
  },

  // Inputs
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    color: c.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: c.glassFaint,
    borderWidth: 1,
    borderColor: c.glassActive,
    borderRadius: 10,
    padding: 14,
    color: c.textPrimary,
    fontSize: 15,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // Bottom
  bottomActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: c.glassHover,
  },
  saveButton: {
    backgroundColor: c.accent,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: c.background,
  },
});
