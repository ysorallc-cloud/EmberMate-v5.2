// ============================================================================
// WATER LOGGING SCREEN - Quick Water Counter
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { navigateBack } from '../lib/navigate';
import { AuroraBackground } from '../components/aurora/AuroraBackground';
import { Colors, Spacing } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import { getTodayWaterLog, updateTodayWaterLog } from '../utils/centralStorage';
import { logError } from '../utils/devLog';
import { emitDataUpdate } from '../lib/events';
import { hapticSuccess } from '../utils/hapticFeedback';
import { EVENT } from '../lib/eventNames';
import { logInstanceCompletion, DEFAULT_PATIENT_ID } from '../storage/carePlanRepo';
import { getTodayDateString } from '../services/carePlanGenerator';
import { emitHydrationEvent } from '../utils/eventEmitter';

const WATER_GOAL = 8;

export default function LogWaterScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const params = useLocalSearchParams();
  const [glasses, setGlasses] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadWaterData();
  }, []);

  const loadWaterData = async () => {
    try {
      const todayWater = await getTodayWaterLog();
      if (todayWater?.glasses) {
        setGlasses(todayWater.glasses);
      }
    } catch (error) {
      logError('LogWaterScreen.loadWaterData', error);
    }
  };

  const handleIncrement = () => {
    setGlasses(prev => Math.min(prev + 1, WATER_GOAL + 4));
  };

  const handleDecrement = () => {
    setGlasses(prev => Math.max(prev - 1, 0));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateTodayWaterLog(glasses);

      // Mark the daily care instance as completed (updates progress card)
      const instanceId = params.instanceId as string | undefined;
      if (instanceId) {
        try {
          await logInstanceCompletion(
            DEFAULT_PATIENT_ID,
            getTodayDateString(),
            instanceId,
            'completed',
            { type: 'hydration', glasses },
            { source: 'record' }
          );
          emitDataUpdate(EVENT.DAILY_INSTANCES);
        } catch (err) {
          logError('LogWater.completeInstance', err);
        }
      }

      emitDataUpdate(EVENT.WATER);
      try { await emitHydrationEvent(glasses); } catch {}
      await hapticSuccess();
      navigateBack();
    } catch (error) {
      logError('LogWaterScreen.handleSave', error);
      Alert.alert('Error', 'Failed to save water intake');
    } finally {
      setSaving(false);
    }
  };

  const progressPercent = Math.min((glasses / WATER_GOAL) * 100, 100);

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
          <Text style={styles.title}>Water today?</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          <Text style={styles.subtitle}>Quick count</Text>

          {/* Water Counter */}
          <View style={styles.counterContainer}>
            <TouchableOpacity
              style={styles.counterButton}
              onPress={handleDecrement}
              disabled={glasses === 0}
              accessibilityLabel="Decrease water by one glass"
              accessibilityRole="button"
            >
              <Text style={[styles.counterButtonText, glasses === 0 && styles.counterButtonDisabled]}>−</Text>
            </TouchableOpacity>

            <View style={styles.counterDisplay}>
              <Text style={styles.counterNumber}>{glasses}</Text>
              <Text style={styles.counterLabel}>of {WATER_GOAL} glasses</Text>
            </View>

            <TouchableOpacity
              style={styles.counterButton}
              onPress={handleIncrement}
              accessibilityLabel="Increase water by one glass"
              accessibilityRole="button"
            >
              <Text style={styles.counterButtonText}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {glasses >= WATER_GOAL ? '✓ Goal reached!' : `${WATER_GOAL - glasses} more to go`}
            </Text>
          </View>

          {/* Quick Add Buttons */}
          <View style={styles.quickAddRow}>
            {[1, 2, 3, 4].map(num => (
              <TouchableOpacity
                key={num}
                style={styles.quickAddButton}
                onPress={() => setGlasses(prev => Math.min(prev + num, WATER_GOAL + 4))}
                accessibilityLabel={`Add ${num} glass${num !== 1 ? 'es' : ''}`}
                accessibilityRole="button"
              >
                <Text style={styles.quickAddText}>+{num}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Save Button */}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
            accessibilityLabel={saving ? "Saving water intake" : "Save water intake"}
            accessibilityHint="Saves the water intake amount"
            accessibilityRole="button"
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: c.textMuted,
    marginBottom: 40,
  },

  // Counter
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 30,
    marginBottom: 40,
  },
  counterButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: c.sageBorder,
    borderWidth: 1,
    borderColor: c.sageGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterButtonText: {
    fontSize: 32,
    fontWeight: '300',
    color: c.accent,
  },
  counterButtonDisabled: {
    opacity: 0.3,
  },
  counterDisplay: {
    alignItems: 'center',
  },
  counterNumber: {
    fontSize: 72,
    fontWeight: '200',
    color: c.textPrimary,
  },
  counterLabel: {
    fontSize: 14,
    color: c.textMuted,
    marginTop: -5,
  },

  // Progress
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 40,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: c.glassActive,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: c.cyan,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    color: c.textSecondary,
  },

  // Quick Add
  quickAddRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickAddButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: c.surfaceElevated,
    borderWidth: 1,
    borderColor: c.glassActive,
    borderRadius: 8,
  },
  quickAddText: {
    fontSize: 14,
    fontWeight: '500',
    color: c.textSecondary,
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
