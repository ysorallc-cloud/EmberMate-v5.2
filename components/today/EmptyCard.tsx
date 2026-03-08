// ============================================================================
// EMPTY CARD - No tasks scheduled (Default surface)
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';

export const EmptyCard: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  const handleAddSomething = () => {
    router.push('/calendar');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>📅</Text>
      <Text style={styles.label}>SCHEDULE</Text>
      <Text style={styles.message}>No upcoming tasks scheduled.</Text>
      <Text style={styles.submessage}>
        Tap to add an appointment or medication.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={handleAddSomething}
        accessibilityLabel="Add an appointment or medication"
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>+ Add something</Text>
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
  },
  icon: {
    fontSize: 24,
    marginBottom: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: c.textMuted,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: c.textPrimary,
    textAlign: 'center',
  },
  submessage: {
    fontSize: 12,
    color: c.textMuted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  button: {
    backgroundColor: c.accentLight,
    borderWidth: 1,
    borderColor: c.accent,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  buttonText: {
    fontSize: 13,
    color: c.accent,
    fontWeight: '500',
  },
});
