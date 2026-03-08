import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { navigate } from '../../lib/navigate';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';

interface NudgePromptProps {
  message: string;
  route: string;
  category: string;
}

export const NudgePrompt: React.FC<NudgePromptProps> = ({
  message,
  route,
  category,
}) => {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => navigate(route)}
      activeOpacity={0.7}
      accessibilityLabel={`${category} nudge: ${message}`}
      accessibilityRole="link"
    >
      <Text style={styles.message}>{message}</Text>
      <Text style={styles.arrow}>→</Text>
    </TouchableOpacity>
  );
};

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    backgroundColor: c.sageLight,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  message: {
    fontSize: 14,
    color: c.textPrimary,
    flex: 1,
  },
  arrow: {
    fontSize: 16,
    color: c.accent,
    marginLeft: 8,
  },
});
