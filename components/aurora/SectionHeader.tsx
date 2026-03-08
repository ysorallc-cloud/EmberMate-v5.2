import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Typography, Spacing } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';

interface Props {
  title: string;
  showRule?: boolean;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export const SectionHeader: React.FC<Props> = ({ title, showRule, action }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
  <View style={[styles.container, showRule && styles.containerWithRule]} accessibilityRole="header">
    <Text style={styles.title} accessibilityRole="header">
      {title.toUpperCase()}
    </Text>
    {showRule && !action && (
      <View style={styles.rule} />
    )}
    {action && (
      <TouchableOpacity
        onPress={action.onPress}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={action.label}
        accessibilityHint={`Tap to ${action.label.toLowerCase()}`}
      >
        <Text style={styles.action}>{action.label}</Text>
      </TouchableOpacity>
    )}
  </View>
  );
};

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  containerWithRule: {
    marginTop: 20,
  },
  title: {
    ...Typography.caption,
    color: c.textMuted,
  },
  rule: {
    flex: 1,
    height: 1,
    backgroundColor: c.glassBorder,
    marginLeft: 12,
  },
  action: {
    ...Typography.labelSmall,
    color: c.accent,
  },
});

export default SectionHeader;
