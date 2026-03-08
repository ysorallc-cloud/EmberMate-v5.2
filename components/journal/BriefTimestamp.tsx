// ============================================================================
// BRIEF TIMESTAMP
// Shows when the Care Brief was generated
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';

interface BriefTimestampProps {
  generatedAt: Date;
}

export function BriefTimestamp({ generatedAt }: BriefTimestampProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const formatted = generatedAt.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  const dateStr = generatedAt.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        Generated {dateStr} at {formatted}
      </Text>
    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  text: {
    fontSize: 11,
    color: c.textMuted,
  },
});
