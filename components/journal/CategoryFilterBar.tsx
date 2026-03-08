// ============================================================================
// CategoryFilterBar — Horizontal scrollable filter chips for Journal feed
// ============================================================================

import React, { useMemo } from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { LogEventType } from '../../utils/logEvents';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';

// ============================================================================
// FILTER OPTIONS
// ============================================================================

interface FilterOption {
  key: LogEventType | 'all';
  label: string;
  emoji: string;
}

const FILTERS: FilterOption[] = [
  { key: 'all',     label: 'All',      emoji: '' },
  { key: 'medDose', label: 'Meds',     emoji: '\u{1F48A}' },
  { key: 'vitals',  label: 'Vitals',   emoji: '\u{1F4CA}' },
  { key: 'meal',    label: 'Meals',    emoji: '\u{1F37D}\uFE0F' },
  { key: 'mood',    label: 'Mood',     emoji: '\u{1F60A}' },
  { key: 'symptom', label: 'Symptoms', emoji: '\u{1FA7A}' },
  { key: 'note',    label: 'Notes',    emoji: '\u{1F4DD}' },
];

// ============================================================================
// COMPONENT
// ============================================================================

interface Props {
  selectedFilter: LogEventType | 'all';
  onFilterChange: (filter: LogEventType | 'all') => void;
}

export function CategoryFilterBar({ selectedFilter, onFilterChange }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      style={styles.scrollView}
    >
      {FILTERS.map(filter => {
        const isActive = selectedFilter === filter.key;
        return (
          <TouchableOpacity
            key={filter.key}
            style={[styles.chip, isActive && styles.chipActive]}
            onPress={() => onFilterChange(filter.key)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`Filter by ${filter.label}`}
          >
            {filter.emoji ? (
              <Text style={styles.chipEmoji}>{filter.emoji}</Text>
            ) : null}
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const createStyles = (c: typeof Colors) => StyleSheet.create({
  scrollView: {
    marginBottom: Spacing.md,
  },
  container: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.glassHover,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 5,
  },
  chipActive: {
    backgroundColor: c.accentLight,
    borderColor: c.accentBorder,
  },
  chipEmoji: {
    fontSize: 14,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: c.textMuted,
  },
  chipTextActive: {
    color: c.accent,
    fontWeight: '600',
  },
});
