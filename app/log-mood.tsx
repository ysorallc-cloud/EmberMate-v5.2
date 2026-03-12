// ============================================================================
// LOG MOOD SCREEN - Simple mood logging
// ============================================================================

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { navigateBack } from '../lib/navigate';
import { Colors } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import { SubScreenHeader } from '../components/SubScreenHeader';
import { saveMoodLog } from '../utils/centralStorage';
import { logMood } from '../utils/logEvents';
import { hapticSuccess } from '../utils/hapticFeedback';
import { parseCarePlanContext, getCarePlanBannerText } from '../utils/carePlanRouting';
import { trackCarePlanProgress } from '../utils/carePlanStorage';
import { logError } from '../utils/devLog';
import { emitDataUpdate } from '../lib/events';
import { EVENT } from '../lib/eventNames';
import { emitMoodEvent } from '../utils/eventEmitter';
import { SaveConfirmation } from '../components/common/SaveConfirmation';
import { SAVE_DESTINATIONS } from '../utils/saveDestinations';

const MOODS = [
  { id: 'great', emoji: '😊', label: 'Great' },
  { id: 'good', emoji: '🙂', label: 'Good' },
  { id: 'okay', emoji: '😐', label: 'Okay' },
  { id: 'down', emoji: '😔', label: 'Down' },
  { id: 'difficult', emoji: '😢', label: 'Difficult' },
];

export default function LogMoodScreen() {
  const params = useLocalSearchParams();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Parse CarePlan context from navigation params
  const carePlanContext = parseCarePlanContext(params as Record<string, string>);
  const isFromCarePlan = carePlanContext !== null;

  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [savedPreview, setSavedPreview] = useState('');
  const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  const handleMoodSelect = async (moodId: string) => {
    setSelectedMood(moodId);

    // Convert mood ID to numeric value for storage
    const moodValues: Record<string, number> = {
      'great': 5,
      'good': 4,
      'okay': 3,
      'down': 2,
      'difficult': 1,
    };

    const moodValue = moodValues[moodId] || 3;

    try {
      // Save to legacy storage for backward compatibility
      await saveMoodLog({
        timestamp: new Date().toISOString(),
        mood: moodValue,
        energy: null,
        pain: null,
      });

      // Emit log event for CarePlan/Now page tracking
      await logMood(moodValue, {
        carePlanTaskId: carePlanContext?.carePlanItemId,
        routineId: carePlanContext?.routineId,
        audit: {
          source: isFromCarePlan ? 'careplan' : 'record',
          action: 'direct_tap',
        },
      });

      // Track CarePlan progress if navigated from CarePlan
      if (carePlanContext) {
        await trackCarePlanProgress(
          carePlanContext.routineId,
          carePlanContext.carePlanItemId,
          { logType: 'mood' }
        );
      }

      await hapticSuccess();
      emitDataUpdate(EVENT.MOOD);
      try { await emitMoodEvent(moodValue, moodId); } catch {}

      const moodLabel = MOODS.find(m => m.id === moodId)?.label || moodId;
      setSavedPreview(moodLabel);
      setShowSaveConfirmation(true);
    } catch (error) {
      logError('LogMoodScreen.handleMoodSelect', error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        <SubScreenHeader title="Log Mood" emoji="😊" />

        <ScrollView style={styles.content}>
          {/* CarePlan context banner */}
          {isFromCarePlan && carePlanContext && (
            <View style={styles.carePlanBanner}>
              <Text style={styles.carePlanBannerLabel}>FROM CARE PLAN</Text>
              <Text style={styles.carePlanBannerText}>
                {getCarePlanBannerText(carePlanContext)}
              </Text>
            </View>
          )}

          <View style={styles.moodCard}>
            <Text style={styles.moodSectionLabel}>SELECT MOOD</Text>
            <View style={styles.moodsContainer}>
              {MOODS.map((mood) => (
                <TouchableOpacity
                  key={mood.id}
                  style={[
                    styles.moodButton,
                    selectedMood === mood.id && styles.moodButtonSelected,
                  ]}
                  onPress={() => handleMoodSelect(mood.id)}
                  activeOpacity={0.7}
                  disabled={showSaveConfirmation}
                  accessibilityLabel={`${mood.label} mood`}
                  accessibilityHint="Logs this mood for the current check-in"
                  accessibilityRole="radio"
                  accessibilityState={{ selected: selectedMood === mood.id, disabled: showSaveConfirmation }}
                >
                  <Text style={[styles.moodEmoji, selectedMood === mood.id && styles.moodEmojiSelected]}>
                    {mood.emoji}
                  </Text>
                  <Text style={[styles.moodLabel, selectedMood === mood.id && styles.moodLabelSelected]}>
                    {mood.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

        </ScrollView>
      </LinearGradient>
      <SaveConfirmation
        visible={showSaveConfirmation}
        icon="😊"
        title="Mood Logged"
        preview={savedPreview}
        destinations={SAVE_DESTINATIONS.mood}
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  carePlanBanner: {
    backgroundColor: c.purpleFaint,
    borderWidth: 1,
    borderColor: c.purpleWash,
    borderRadius: 10,
    padding: 10,
    marginTop: 16,
  },
  carePlanBannerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: c.violetBright,
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 4,
  },
  carePlanBannerText: {
    fontSize: 13,
    color: c.textSecondary,
    textAlign: 'center',
  },
  moodCard: {
    backgroundColor: c.cardBackground,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 18,
    padding: 16,
    marginTop: 20,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },
  moodSectionLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: c.textTertiary,
    marginBottom: 14,
  },
  moodsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moodButton: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  moodButtonSelected: {},
  moodEmoji: {
    fontSize: 26,
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: 50,
    overflow: 'hidden',
  },
  moodEmojiSelected: {
    backgroundColor: 'rgba(91, 138, 106, 0.15)',
    borderColor: 'rgba(91, 138, 106, 0.35)',
    shadowColor: '#7BA67E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  moodLabel: {
    fontSize: 9,
    color: c.textTertiary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  moodLabelSelected: {
    color: c.accent,
  },
  confirmationContainer: {
    alignItems: 'center',
    marginTop: 32,
    paddingVertical: 24,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  confirmationEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  confirmationText: {
    fontSize: 18,
    fontWeight: '600',
    color: c.greenBright,
  },
});
