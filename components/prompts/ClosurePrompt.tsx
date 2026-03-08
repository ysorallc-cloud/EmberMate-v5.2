import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';

interface ClosurePromptProps {
  message: string;
}

export const ClosurePrompt: React.FC<ClosurePromptProps> = ({ message }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>✨</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    backgroundColor: c.greenTint,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  icon: {
    fontSize: 24,
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    color: c.textPrimary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
