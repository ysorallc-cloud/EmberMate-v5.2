import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import type { AttentionItem } from '../../utils/careSummaryBuilder';

interface Props {
  items: AttentionItem[];
}

export function AttentionSection({ items }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (items.length === 0) {
    return (
      <View style={styles.cardGreen}>
        <Text style={styles.allClearText}>{'\u2713'} Nothing requiring attention right now</Text>
      </View>
    );
  }

  return (
    <View style={styles.cardAmber}>
      {items.map((item, i) => (
        <View key={`${item.text}-${i}`} style={[styles.itemRow, i > 0 && styles.itemRowSpaced]}>
          <Text style={styles.itemText}>{'\u26A0'} {item.text}</Text>
          {item.detail && (
            <Text style={styles.itemDetail}>{item.detail}</Text>
          )}
        </View>
      ))}
    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  cardGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: c.greenHint,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  allClearText: {
    fontSize: 14,
    fontWeight: '500',
    color: c.accent,
  },
  cardAmber: {
    backgroundColor: c.amberFaint,
    borderWidth: 1,
    borderColor: c.amberHint,
    borderLeftWidth: 3,
    borderLeftColor: c.amber,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  itemRow: {},
  itemRowSpaced: {
    marginTop: Spacing.sm,
  },
  itemText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.amber,
  },
  itemDetail: {
    fontSize: 12,
    color: c.textMuted,
    marginTop: 2,
  },
});
