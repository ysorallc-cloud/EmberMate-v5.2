import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';

interface NotificationPromptProps {
  onEnable: () => void;
  onNotNow: () => void;
}

export const NotificationPrompt: React.FC<NotificationPromptProps> = ({
  onEnable,
  onNotNow,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🔔</Text>
      <Text style={styles.title}>Stay on track</Text>
      <Text style={styles.message}>
        Get gentle reminders for medications and appointments
      </Text>
      <View style={styles.buttons}>
        <TouchableOpacity
          style={styles.enableButton}
          onPress={onEnable}
          accessibilityLabel="Enable notifications"
          accessibilityRole="button"
        >
          <Text style={styles.enableText}>Enable</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.notNowButton}
          onPress={onNotNow}
          accessibilityLabel="Not now, skip notifications"
          accessibilityRole="button"
        >
          <Text style={styles.notNowText}>Not now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    backgroundColor: c.amberBrightTint,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  icon: {
    fontSize: 24,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 4,
  },
  message: {
    fontSize: 13,
    color: c.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  enableButton: {
    backgroundColor: c.accent,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  enableText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  notNowButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  notNowText: {
    fontSize: 14,
    color: c.textSecondary,
  },
});
