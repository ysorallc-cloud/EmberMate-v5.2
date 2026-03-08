import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';

interface Props {
  title: string;
  children: React.ReactNode;
}

export function ShiftSection({ title, children }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!children) return null;

  return (
    <View>
      <Text style={styles.sectionHeader}>{title}</Text>
      {children}
    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: c.textMuted,
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  },
});
