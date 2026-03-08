import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, BorderRadius, Spacing, Typography } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';

interface QuickAction {
  icon: string;
  label: string;
  onPress: () => void;
  color?: string;
  accessibilityHint?: string;
  testID?: string;
}

interface Props {
  actions: QuickAction[];
}

export const QuickActionGrid: React.FC<Props> = ({ actions }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
  <View style={styles.container} accessibilityRole="toolbar">
    {actions.map((action, i) => (
      <TouchableOpacity
        key={i}
        style={[
          styles.button,
          action.color && {
            backgroundColor: `${action.color}10`,
            borderColor: `${action.color}25`,
          },
        ]}
        onPress={action.onPress}
        activeOpacity={0.7}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={action.label}
        accessibilityHint={action.accessibilityHint || `Tap to ${action.label.toLowerCase()}`}
        testID={action.testID}
      >
        <Text style={styles.icon} importantForAccessibility="no-hide-descendants">{action.icon}</Text>
        <Text style={styles.label} importantForAccessibility="no-hide-descendants">{action.label}</Text>
      </TouchableOpacity>
    ))}
  </View>
  );
};

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  button: {
    flex: 1,
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.glassBorder,
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  icon: {
    fontSize: 22,
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    color: c.textSecondary,
  },
});

export default QuickActionGrid;
