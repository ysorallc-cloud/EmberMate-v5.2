import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';

interface OrientationPromptProps {
  message: string;
  pendingCount: number;
}

export const OrientationPrompt: React.FC<OrientationPromptProps> = ({
  message,
  pendingCount,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  message: {
    fontSize: 14,
    color: c.textSecondary,
    lineHeight: 20,
  },
});
