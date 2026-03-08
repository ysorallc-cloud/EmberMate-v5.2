import React, { useMemo } from 'react';
import { TextInput, View, Text, StyleSheet, TextInputProps, KeyboardTypeOptions } from 'react-native';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';

interface Props {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: KeyboardTypeOptions;
  // Accessibility props
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

export const GlassInput: React.FC<Props> = ({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = 'default',
  accessibilityLabel,
  accessibilityHint,
  testID,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      {label && (
        <Text
          style={styles.label}
          accessibilityRole="text"
          accessible={false}
        >
          {label}
        </Text>
      )}
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        keyboardType={keyboardType}
        accessibilityLabel={accessibilityLabel || label}
        accessibilityHint={accessibilityHint || (placeholder ? `Enter ${placeholder.toLowerCase()}` : undefined)}
        testID={testID}
      />
    </View>
  );
};

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  label: {
    ...Typography.labelSmall,
    color: c.textSecondary,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.glassBorder,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    ...Typography.body,
    color: c.textPrimary,
  },
  inputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
});

export default GlassInput;
