// ============================================================================
// CAUGHT UP CARD - All done for today (Green)
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';

export const CaughtUpCard: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.checkContainer}>
        <Text style={styles.checkIcon}>✓</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>ALL DONE FOR TODAY</Text>
        <Text style={styles.title}>Great job! Rest up.</Text>
      </View>
    </View>
  );
};

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    backgroundColor: c.greenLight,
    borderWidth: 1,
    borderColor: c.greenBorder,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: c.glassActive,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkIcon: {
    fontSize: 18,
    color: c.green,
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: c.green,
    marginBottom: 2,
  },
  title: {
    fontSize: 14,
    color: c.textPrimary,
  },
});
