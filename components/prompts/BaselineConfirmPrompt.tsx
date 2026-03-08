import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { BaselineCategory, CategoryBaseline, getBaselineLanguage } from '../../utils/baselineStorage';

interface BaselineConfirmPromptProps {
  category: BaselineCategory;
  baseline: CategoryBaseline;
  onYes: () => void;
  onNotReally: () => void;
  onDismiss: () => void;
}

function getCategoryLabel(category: BaselineCategory): string {
  switch (category) {
    case 'meals':
      return 'Meals';
    case 'vitals':
      return 'Vitals';
    case 'meds':
      return 'Medications';
    default:
      return category;
  }
}

function getBaselineDescription(category: BaselineCategory, dailyCount: number): string {
  const { adverb } = getBaselineLanguage('tentative'); // Use soft language

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

export const BaselineConfirmPrompt: React.FC<BaselineConfirmPromptProps> = ({
  category,
  baseline,
  onYes,
  onNotReally,
  onDismiss,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.message}>
        {getBaselineDescription(category, baseline.dailyCount)} Does this sound right?
      </Text>
      <View style={styles.buttons}>
        <TouchableOpacity
          style={styles.yesButton}
          onPress={onYes}
          accessibilityLabel={`Yes, ${getCategoryLabel(category)} baseline is correct`}
          accessibilityRole="button"
        >
          <Text style={styles.yesText}>Yes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.notReallyButton}
          onPress={onNotReally}
          accessibilityLabel={`No, ${getCategoryLabel(category)} baseline is not correct`}
          accessibilityRole="button"
        >
          <Text style={styles.notReallyText}>Not really</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={onDismiss}
          accessibilityLabel={`Dismiss ${getCategoryLabel(category)} baseline prompt`}
          accessibilityRole="button"
        >
          <Text style={styles.dismissText}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    backgroundColor: c.glassFaint,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  message: {
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  buttons: {
    flexDirection: 'row',
    gap: 8,
  },
  yesButton: {
    backgroundColor: c.sageBorder,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  yesText: {
    fontSize: 13,
    fontWeight: '500',
    color: c.accent,
  },
  notReallyButton: {
    backgroundColor: c.glassHover,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  notReallyText: {
    fontSize: 13,
    color: c.textTertiary,
  },
  dismissButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  dismissText: {
    fontSize: 13,
    color: c.textMuted,
  },
});
