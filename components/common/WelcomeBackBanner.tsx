import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';

interface WelcomeBackBannerProps {
  onDismiss: () => void;
}

export const WelcomeBackBanner: React.FC<WelcomeBackBannerProps> = ({
  onDismiss,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>👋</Text>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.message}>Good to see you again</Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={onDismiss}
        style={styles.dismissButton}
        accessibilityLabel="Dismiss welcome banner"
        accessibilityRole="button"
      >
        <Text style={styles.dismissText}>×</Text>
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    backgroundColor: c.sageLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    fontSize: 20,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
  },
  message: {
    fontSize: 13,
    color: c.textSecondary,
    marginTop: 2,
  },
  dismissButton: {
    padding: 4,
  },
  dismissText: {
    fontSize: 20,
    color: c.textMuted,
  },
});
