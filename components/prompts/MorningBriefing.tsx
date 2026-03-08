// ============================================================================
// MorningBriefing - Single consolidated prompt card for the Now screen
// Replaces: OrientationPrompt, ClosurePrompt, RegulationPrompt,
//   BaselineConfirmPrompt, WelcomeBackBanner, NotificationPrompt
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { Colors, BorderRadius, Spacing } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import type { BaselineCategory, CategoryBaseline, TodayVsBaseline } from '../../utils/baselineStorage';
import { getBaselineLanguage } from '../../utils/baselineStorage';
import { saveDailyCheck, getTodayCheck } from '../../utils/caregiverWellnessStorage';
import { getTodayDateString } from '../../services/carePlanGenerator';

export interface MorningBriefingProps {
  patientName: string;
  itemCount: number;
  lastVisitHours: number | null;
  orientationMessage: string | null;
  closureMessage: string | null;
  regulationMessage: string | null;
  baselineToConfirm: { category: BaselineCategory; baseline: CategoryBaseline } | null;
  todayVsBaseline?: TodayVsBaseline[];
  isFirstUse?: boolean;
  onDismiss: () => void;
  onBaselineConfirm: (yes: boolean) => void;
  onBaselineDismiss?: () => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function getLastVisitText(hours: number | null): string {
  if (hours === null || hours > 500) return '';
  if (hours < 1) return 'just now';
  if (hours < 24) return `${Math.round(hours)}h ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

function getCategoryLabel(category: BaselineCategory): string {
  switch (category) {
    case 'meals': return 'Meals';
    case 'vitals': return 'Vitals';
    case 'meds': return 'Medications';
    default: return category;
  }
}

function getBaselineDescription(category: BaselineCategory, dailyCount: number): string {
  const { adverb } = getBaselineLanguage('tentative');
  switch (category) {
    case 'meals':
      return `Meals are ${adverb} logged ${dailyCount} time${dailyCount !== 1 ? 's' : ''} per day.`;
    case 'vitals':
      return `Vitals are ${adverb} checked ${dailyCount} time${dailyCount !== 1 ? 's' : ''} per day.`;
    case 'meds':
      return `${dailyCount} medication${dailyCount !== 1 ? 's' : ''} ${adverb} taken per day.`;
    default:
      return '';
  }
}

export const MorningBriefing: React.FC<MorningBriefingProps> = ({
  patientName,
  itemCount,
  lastVisitHours,
  orientationMessage,
  closureMessage,
  regulationMessage,
  baselineToConfirm,
  todayVsBaseline,
  isFirstUse = false,
  onDismiss,
  onBaselineConfirm,
  onBaselineDismiss,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [expanded, setExpanded] = useState(false);

  // Caregiver self-check state (Task 4.3)
  const [selfCheckSleep, setSelfCheckSleep] = useState<number | null>(null);
  const [selfCheckStress, setSelfCheckStress] = useState<number | null>(null);
  const [selfCheckMeals, setSelfCheckMeals] = useState<number | null>(null);
  const [selfCheckDone, setSelfCheckDone] = useState(false);
  const [selfCheckAcknowledged, setSelfCheckAcknowledged] = useState(false);

  // Check if already completed today
  useEffect(() => {
    getTodayCheck().then(check => {
      if (check) setSelfCheckDone(true);
    });
  }, []);

  const handleSelfCheckSave = async () => {
    if (selfCheckSleep && selfCheckStress && selfCheckMeals) {
      await saveDailyCheck({
        date: getTodayDateString(),
        sleep: selfCheckSleep,
        stress: selfCheckStress,
        meals: selfCheckMeals,
      });
      setSelfCheckDone(true);
      setSelfCheckAcknowledged(true);
      setTimeout(() => setSelfCheckAcknowledged(false), 2000);
    }
  };

  const handleSelfCheckSkip = () => {
    setSelfCheckDone(true);
  };

  // Don't render during first-time onboarding
  if (isFirstUse) return null;

  // Build summary line parts
  const summaryParts: string[] = [];
  if (itemCount > 0) {
    summaryParts.push(`${itemCount} item${itemCount !== 1 ? 's' : ''} today`);
  }
  const visitText = getLastVisitText(lastVisitHours);
  if (visitText) {
    summaryParts.push(`last visit ${visitText}`);
  }

  const hasDetails = !!(orientationMessage || closureMessage || regulationMessage || baselineToConfirm);
  const greeting = getGreeting();

  return (
    <View style={styles.container} testID="morning-briefing">
      {/* Header row: greeting + dismiss */}
      <View style={styles.header}>
        <View style={styles.greetingRow}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.patientName}>, {patientName}</Text>
        </View>
        <TouchableOpacity
          onPress={onDismiss}
          style={styles.dismissButton}
          accessibilityLabel="Dismiss morning briefing"
          accessibilityRole="button"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.dismissIcon}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Summary line */}
      {summaryParts.length > 0 && (
        <Text style={styles.summary}>
          {summaryParts.join(' · ')}
          {closureMessage ? ' · All done!' : ''}
        </Text>
      )}

      {/* Caregiver Self-Check (Task 4.3) */}
      {!selfCheckDone && !closureMessage && (
        <View style={styles.selfCheckContainer}>
          {/* Sleep row */}
          <View style={styles.selfCheckRow}>
            <Text style={styles.selfCheckLabel}>
              {selfCheckSleep === null ? 'How did you sleep?' : 'Sleep'}
            </Text>
            <View style={styles.selfCheckBoxes}>
              {[1, 2, 3, 4, 5].map(n => (
                <TouchableOpacity
                  key={`sleep-${n}`}
                  style={[styles.selfCheckBox, selfCheckSleep === n && styles.selfCheckBoxActive]}
                  onPress={() => setSelfCheckSleep(n)}
                  accessibilityLabel={`Sleep rating ${n} of 5`}
                  accessibilityRole="button"
                >
                  <Text style={[styles.selfCheckBoxText, selfCheckSleep === n && styles.selfCheckBoxTextActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Stress row — appears after sleep rated */}
          {selfCheckSleep !== null && (
            <View style={styles.selfCheckRow}>
              <Text style={styles.selfCheckLabel}>Stress level?</Text>
              <View style={styles.selfCheckBoxes}>
                {[1, 2, 3, 4, 5].map(n => (
                  <TouchableOpacity
                    key={`stress-${n}`}
                    style={[styles.selfCheckBox, selfCheckStress === n && styles.selfCheckBoxActive]}
                    onPress={() => setSelfCheckStress(n)}
                    accessibilityLabel={`Stress rating ${n} of 5`}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.selfCheckBoxText, selfCheckStress === n && styles.selfCheckBoxTextActive]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Meals row — appears after stress rated */}
          {selfCheckStress !== null && (
            <View style={styles.selfCheckRow}>
              <Text style={styles.selfCheckLabel}>Eating well?</Text>
              <View style={styles.selfCheckBoxes}>
                {[1, 2, 3, 4, 5].map(n => (
                  <TouchableOpacity
                    key={`meals-${n}`}
                    style={[styles.selfCheckBox, selfCheckMeals === n && styles.selfCheckBoxActive]}
                    onPress={() => {
                      setSelfCheckMeals(n);
                    }}
                    accessibilityLabel={`Meals rating ${n} of 5`}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.selfCheckBoxText, selfCheckMeals === n && styles.selfCheckBoxTextActive]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Save / Skip */}
          <View style={styles.selfCheckActions}>
            {selfCheckMeals !== null && (
              <TouchableOpacity
                style={styles.selfCheckSaveButton}
                onPress={handleSelfCheckSave}
                accessibilityLabel="Save self-check"
                accessibilityRole="button"
              >
                <Text style={styles.selfCheckSaveText}>Save</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleSelfCheckSkip}
              accessibilityLabel="Skip self-check"
              accessibilityRole="button"
            >
              <Text style={styles.selfCheckSkipText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Self-check acknowledgment */}
      {selfCheckAcknowledged && (
        <Text style={styles.selfCheckAck}>Noted</Text>
      )}

      {/* Closure message */}
      {closureMessage && (
        <Text style={styles.closureText}>{closureMessage}</Text>
      )}

      {/* Expandable details */}
      {hasDetails && !closureMessage && (
        <>
          <Pressable
            onPress={() => setExpanded(!expanded)}
            style={styles.detailsToggle}
            accessibilityRole="button"
            accessibilityLabel={expanded ? 'Hide details' : 'Show details'}
          >
            <Text style={styles.detailsToggleText}>
              {expanded ? 'Hide details' : 'Details'}
            </Text>
          </Pressable>

          {expanded && (
            <View style={styles.detailsSection}>
              {orientationMessage && (
                <Text style={styles.detailText}>{orientationMessage}</Text>
              )}
              {regulationMessage && (
                <Text style={styles.detailText}>{regulationMessage}</Text>
              )}

              {/* Inline baseline confirmation */}
              {baselineToConfirm && (
                <View style={styles.baselineConfirm}>
                  <Text style={styles.baselineText}>
                    {getBaselineDescription(baselineToConfirm.category, baselineToConfirm.baseline.dailyCount)}{' '}
                    Does this seem right?
                  </Text>
                  <View style={styles.baselineButtons}>
                    <TouchableOpacity
                      style={styles.baselineYes}
                      onPress={() => onBaselineConfirm(true)}
                      accessibilityLabel={`Yes, ${getCategoryLabel(baselineToConfirm.category)} baseline is correct`}
                      accessibilityRole="button"
                    >
                      <Text style={styles.baselineYesText}>Yes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.baselineNo}
                      onPress={() => onBaselineConfirm(false)}
                      accessibilityLabel={`No, ${getCategoryLabel(baselineToConfirm.category)} baseline is not correct`}
                      accessibilityRole="button"
                    >
                      <Text style={styles.baselineNoText}>Not really</Text>
                    </TouchableOpacity>
                    {onBaselineDismiss && (
                      <TouchableOpacity
                        style={styles.baselineDismissBtn}
                        onPress={onBaselineDismiss}
                        accessibilityRole="button"
                      >
                        <Text style={styles.baselineDismissText}>Dismiss</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </View>
          )}
        </>
      )}
    </View>
  );
};

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    backgroundColor: c.accentFaint,
    borderWidth: 1,
    borderColor: c.accentBorder,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexShrink: 1,
  },
  greeting: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textPrimary,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: c.accent,
  },
  dismissButton: {
    padding: 4,
  },
  dismissIcon: {
    fontSize: 14,
    color: c.textMuted,
  },
  summary: {
    fontSize: 13,
    color: c.textSecondary,
    marginTop: 6,
    lineHeight: 18,
  },
  closureText: {
    fontSize: 14,
    color: c.green,
    marginTop: 8,
    lineHeight: 20,
  },
  detailsToggle: {
    marginTop: 10,
    paddingVertical: 4,
  },
  detailsToggleText: {
    fontSize: 13,
    color: c.accent,
    fontWeight: '500',
  },
  detailsSection: {
    marginTop: 8,
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 18,
  },
  baselineConfirm: {
    backgroundColor: c.glassFaint,
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  baselineText: {
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  baselineButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  baselineYes: {
    backgroundColor: c.sageBorder,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  baselineYesText: {
    fontSize: 13,
    fontWeight: '500',
    color: c.accent,
  },
  baselineNo: {
    backgroundColor: c.glassHover,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  baselineNoText: {
    fontSize: 13,
    color: c.textTertiary,
  },
  baselineDismissBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  baselineDismissText: {
    fontSize: 13,
    color: c.textMuted,
  },
  // Self-check styles (Task 4.3)
  selfCheckContainer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: c.glassBorder,
    paddingTop: 10,
  },
  selfCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  selfCheckLabel: {
    fontSize: 13,
    color: c.textSecondary,
    flex: 1,
  },
  selfCheckBoxes: {
    flexDirection: 'row',
    gap: 4,
  },
  selfCheckBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: c.glassFaint,
    borderWidth: 1,
    borderColor: c.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selfCheckBoxActive: {
    backgroundColor: c.accent,
    borderColor: c.accent,
  },
  selfCheckBoxText: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textMuted,
  },
  selfCheckBoxTextActive: {
    color: c.textPrimary,
  },
  selfCheckActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  selfCheckSaveButton: {
    backgroundColor: c.sageBorder,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  selfCheckSaveText: {
    fontSize: 13,
    fontWeight: '500',
    color: c.accent,
  },
  selfCheckSkipText: {
    fontSize: 13,
    color: c.textMuted,
  },
  selfCheckAck: {
    fontSize: 13,
    color: c.green,
    marginTop: 6,
    fontWeight: '500',
  },
});
