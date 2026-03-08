import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';

interface RegulationPromptProps {
  message: string;
  onDismiss: () => void;
}

export const RegulationPrompt: React.FC<RegulationPromptProps> = ({
  message,
  onDismiss,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      <TouchableOpacity
        onPress={onDismiss}
        style={styles.dismissButton}
        accessibilityLabel="Dismiss regulation prompt"
        accessibilityRole="button"
      >
        <Text style={styles.dismissText}>Dismiss</Text>
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    backgroundColor: c.purpleMuted,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  message: {
    fontSize: 14,
    color: c.textPrimary,
    lineHeight: 20,
    marginBottom: 12,
  },
  dismissButton: {
    alignSelf: 'flex-end',
  },
  dismissText: {
    fontSize: 13,
    color: c.accent,
  },
});
