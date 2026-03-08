import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';

interface WellnessSnapItem {
  emoji: string;
  label: string;
  value: string;
  color?: string;
}

interface WellnessSnapStripProps {
  items: WellnessSnapItem[];
}

export function WellnessSnapStrip({ items }: WellnessSnapStripProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (items.length === 0) return null;

  return (
    <View style={styles.container}>
      {items.map((item, i) => (
        <View key={i} style={styles.item}>
          <Text style={styles.emoji}>{item.emoji}</Text>
          <Text style={styles.label}>{item.label}</Text>
          <Text style={[styles.value, item.color ? { color: item.color } : null]}>
            {item.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: c.glassFaint,
    borderWidth: 1,
    borderColor: c.glassActive,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    marginBottom: 16,
  },
  item: {
    alignItems: 'center',
    gap: 3,
  },
  emoji: {
    fontSize: 18,
  },
  label: {
    fontSize: 10,
    color: c.textMuted,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textPrimary,
  },
});
