// ============================================================================
// VitalsGuidance — Inline decision support when a vital exceeds threshold
// 3-step flow: re-check → log re-check → call nurse line
// Renders below UpNextCard on the Now tab, NOT a separate screen
// ============================================================================

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Colors, BorderRadius, Spacing } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { navigate } from '../../lib/navigate';
import type { VitalExceedance } from '../../utils/vitalsGuidance';
import { generateNurseScript, type NurseScriptInput } from '../../utils/vitalsGuidance';
import type { Medication } from '../../utils/medicationStorage';
import type { VitalReading } from '../../utils/vitalsStorage';

interface VitalsGuidanceProps {
  exceedance: VitalExceedance;
  medications: Medication[];
  recentReadings: VitalReading[];
  onDismiss: () => void;
}

export const VitalsGuidance: React.FC<VitalsGuidanceProps> = ({
  exceedance,
  medications,
  recentReadings,
  onDismiss,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [currentStep, setCurrentStep] = useState(0); // 0, 1, 2
  const [timerActive, setTimerActive] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(15 * 60); // 15 minutes
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isCritical = exceedance.status === 'critical';

  // Timer for step 1
  useEffect(() => {
    if (timerActive && secondsLeft > 0) {
      timerRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            setTimerActive(false);
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleStartTimer = useCallback(() => {
    setTimerActive(true);
  }, []);

  const handleCompleteStep1 = useCallback(() => {
    setTimerActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setCurrentStep(1);
  }, []);

  const handleLogRecheck = useCallback(() => {
    navigate('/quick-log?expand=vitals');
    setCurrentStep(2);
  }, []);

  const nurseScript = generateNurseScript({
    currentReading: { type: exceedance.type, value: exceedance.value },
    recentReadings,
    medications,
  });

  const statusColor = isCritical ? colors.red : colors.amber;
  const statusBg = isCritical ? colors.redFaint : colors.amberFaint;
  const statusBorder = isCritical ? colors.redBorder : colors.amberBorder;

  return (
    <View style={[styles.container, { borderColor: statusBorder, backgroundColor: statusBg }]} testID="vitals-guidance">
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerIcon}>{isCritical ? '\u26A0\uFE0F' : '\u2139\uFE0F'}</Text>
          <View>
            <Text style={[styles.headerTitle, { color: statusColor }]}>
              {exceedance.name}: {exceedance.value} {exceedance.unit}
            </Text>
            <Text style={styles.headerSubtitle}>
              {isCritical ? 'Critically out of range' : 'Above target range'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={onDismiss}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Dismiss vitals guidance"
          accessibilityRole="button"
        >
          <Text style={styles.dismissIcon}>{'\u2715'}</Text>
        </TouchableOpacity>
      </View>

      {/* Steps */}
      <View style={styles.steps}>
        {/* Step 1: Re-check in 15 min */}
        <View style={[styles.step, currentStep === 0 && styles.stepActive]}>
          <View style={[styles.stepDot, currentStep > 0 && styles.stepDotComplete]}>
            <Text style={styles.stepDotText}>{currentStep > 0 ? '\u2713' : '1'}</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, currentStep > 0 && styles.stepTitleDone]}>
              Re-check in 15 minutes
            </Text>
            {currentStep === 0 && (
              <>
                <Text style={styles.stepDesc}>
                  Rest quietly, then take another reading to confirm.
                </Text>
                {timerActive ? (
                  <View style={styles.timerRow}>
                    <Text style={styles.timerText}>{formatTime(secondsLeft)}</Text>
                    <TouchableOpacity
                      style={styles.stepButton}
                      onPress={handleCompleteStep1}
                      accessibilityLabel="Done re-checking"
                      accessibilityRole="button"
                    >
                      <Text style={styles.stepButtonText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                ) : secondsLeft === 0 ? (
                  <TouchableOpacity
                    style={styles.stepButton}
                    onPress={handleCompleteStep1}
                    accessibilityLabel="Timer complete, proceed to log re-check"
                    accessibilityRole="button"
                  >
                    <Text style={styles.stepButtonText}>Ready to re-check</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.stepButton}
                    onPress={handleStartTimer}
                    accessibilityLabel="Start 15-minute timer"
                    accessibilityRole="button"
                  >
                    <Text style={styles.stepButtonText}>Start Timer (15 min)</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>

        {/* Step 2: Log re-check */}
        <View style={[styles.step, currentStep === 1 && styles.stepActive, currentStep < 1 && styles.stepLocked]}>
          <View style={[styles.stepDot, currentStep > 1 && styles.stepDotComplete, currentStep < 1 && styles.stepDotLocked]}>
            <Text style={[styles.stepDotText, currentStep < 1 && styles.stepDotTextLocked]}>
              {currentStep > 1 ? '\u2713' : '2'}
            </Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, currentStep > 1 && styles.stepTitleDone, currentStep < 1 && styles.stepTitleLocked]}>
              Log your re-check
            </Text>
            {currentStep === 1 && (
              <>
                <Text style={styles.stepDesc}>
                  Record the new reading so you can share it.
                </Text>
                <TouchableOpacity
                  style={styles.stepButton}
                  onPress={handleLogRecheck}
                  accessibilityLabel="Log vitals re-check"
                  accessibilityRole="button"
                >
                  <Text style={styles.stepButtonText}>Log Vitals</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Step 3: Call nurse line */}
        <View style={[styles.step, currentStep === 2 && styles.stepActive, currentStep < 2 && styles.stepLocked]}>
          <View style={[styles.stepDot, currentStep < 2 && styles.stepDotLocked]}>
            <Text style={[styles.stepDotText, currentStep < 2 && styles.stepDotTextLocked]}>3</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, currentStep < 2 && styles.stepTitleLocked]}>
              Call nurse line
            </Text>
            {currentStep === 2 && (
              <>
                <Text style={styles.stepDesc}>
                  Share these details when you call:
                </Text>
                <View style={styles.scriptBox}>
                  <Text style={styles.scriptText}>{nurseScript}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.stepButton, { backgroundColor: colors.accent }]}
                  onPress={() => Linking.openURL('tel:')}
                  accessibilityLabel="Open phone to call nurse line"
                  accessibilityRole="button"
                >
                  <Text style={[styles.stepButtonText, { color: colors.textPrimary }]}>Call Now</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>

      {/* HIPAA disclaimer */}
      <Text style={styles.disclaimer}>
        This is based on your logged data, not medical advice.
      </Text>
    </View>
  );
};

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flex: 1,
  },
  headerIcon: {
    fontSize: 18,
    marginTop: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 12,
    color: c.textMuted,
    marginTop: 2,
  },
  dismissIcon: {
    fontSize: 14,
    color: c.textMuted,
    padding: 4,
  },
  steps: {
    gap: 4,
  },
  step: {
    flexDirection: 'row',
    paddingVertical: 8,
    gap: 10,
  },
  stepActive: {
    // active step styling handled by children
  },
  stepLocked: {
    opacity: 0.5,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepDotComplete: {
    backgroundColor: c.green,
  },
  stepDotLocked: {
    backgroundColor: c.glassDim,
  },
  stepDotText: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textPrimary,
  },
  stepDotTextLocked: {
    color: c.textMuted,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textBright,
  },
  stepTitleDone: {
    color: c.green,
    textDecorationLine: 'line-through',
  },
  stepTitleLocked: {
    color: c.textMuted,
  },
  stepDesc: {
    fontSize: 13,
    color: c.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  timerText: {
    fontSize: 20,
    fontWeight: '700',
    color: c.accent,
    fontVariant: ['tabular-nums'],
  },
  stepButton: {
    backgroundColor: c.glass,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
    marginTop: 8,
    borderWidth: 1,
    borderColor: c.glassBorder,
  },
  stepButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.accent,
  },
  scriptBox: {
    backgroundColor: c.amberFaint,
    borderWidth: 1,
    borderColor: c.amberBorder,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  scriptText: {
    fontSize: 12,
    color: c.textSecondary,
    lineHeight: 18,
    fontFamily: 'System',
  },
  disclaimer: {
    fontSize: 11,
    color: c.textMuted,
    fontStyle: 'italic',
    marginTop: 12,
    textAlign: 'center',
  },
});
