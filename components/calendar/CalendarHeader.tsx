// ============================================================================
// CALENDAR HEADER - Month navigation
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';

interface CalendarHeaderProps {
  currentMonth: Date;
  onPrevious: () => void;
  onNext: () => void;
}

export function CalendarHeader({ currentMonth, onPrevious, onNext }: CalendarHeaderProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.navButton}
        onPress={onPrevious}
        accessibilityLabel="Previous month"
        accessibilityRole="button"
      >
        <Text style={styles.navButtonText}>{'\u2039'}</Text>
      </TouchableOpacity>

      <Text style={styles.monthYear}>{format(currentMonth, 'MMMM yyyy')}</Text>

      <TouchableOpacity
        style={styles.navButton}
        onPress={onNext}
        accessibilityLabel="Next month"
        accessibilityRole="button"
      >
        <Text style={styles.navButtonText}>{'\u203A'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  navButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: {
    fontSize: 28,
    color: c.textPrimary,
    fontWeight: '300',
  },
  monthYear: {
    fontSize: 16,
    fontWeight: '500',
    color: c.textPrimary,
  },
});
