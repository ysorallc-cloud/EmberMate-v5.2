// ============================================================================
// STATUS NARRATIVE
// Renders the generated prose narrative string in a styled card
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';

interface StatusNarrativeProps {
  narrative: string;
}

export function StatusNarrative({ narrative }: StatusNarrativeProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!narrative) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.narrative}>{narrative}</Text>
    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  card: {
    borderLeftWidth: 3,
    borderLeftColor: c.accent,
    backgroundColor: c.glassFaint,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
  },
  narrative: {
    fontSize: 14,
    color: c.textSecondary,
    lineHeight: 22,
  },
});
