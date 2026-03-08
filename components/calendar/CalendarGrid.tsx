// ============================================================================
// CALENDAR GRID - Month view with completion heatmap
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CalendarDay } from '@/types/calendar';
import { Colors } from '@/theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { isSameDay } from 'date-fns';

const DAYS_OF_WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function getHeatColor(pct: number | undefined): string {
  if (pct === undefined || pct < 0) return 'transparent';
  if (pct >= 90) return 'rgba(16,185,129,0.35)';
  if (pct >= 70) return 'rgba(16,185,129,0.18)';
  if (pct >= 50) return 'rgba(245,158,11,0.18)';
  if (pct >= 25) return 'rgba(245,158,11,0.1)';
  return 'rgba(239,68,68,0.1)';
}

function getHeatBorder(pct: number | undefined, colors: typeof Colors): string {
  if (pct === undefined || pct < 0) return colors.border;
  if (pct >= 90) return 'rgba(16,185,129,0.4)';
  if (pct >= 70) return 'rgba(16,185,129,0.25)';
  if (pct >= 50) return 'rgba(245,158,11,0.25)';
  return colors.border;
}

function getDotColor(pct: number | undefined, colors: typeof Colors): string {
  if (pct === undefined) return colors.textMuted;
  if (pct >= 70) return '#10B981';
  if (pct >= 40) return '#F59E0B';
  return '#EF4444';
}

interface Props {
  days: CalendarDay[];
  selectedDate: Date;
  onDayPress: (date: Date) => void;
}

export const CalendarGrid: React.FC<Props> = ({ days, selectedDate, onDayPress }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const today = new Date();

  return (
    <View style={styles.container}>
      {/* Day headers */}
      <View style={styles.row}>
        {DAYS_OF_WEEK.map((day, i) => (
          <View key={i} style={styles.cell}>
            <Text style={styles.dayHeader}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Calendar days */}
      <View style={styles.grid}>
        {days.map((day, i) => {
          const isSelected = isSameDay(day.date, selectedDate);
          const isToday = isSameDay(day.date, today);
          const isFuture = day.isFuture;
          const pct = day.completionPct;

          return (
            <TouchableOpacity
              key={i}
              style={[
                styles.cell,
                styles.dayCell,
                {
                  backgroundColor: isSelected
                    ? colors.accent
                    : getHeatColor(pct),
                  borderWidth: isSelected ? 2 : isToday ? 1.5 : 1,
                  borderColor: isSelected
                    ? colors.accent
                    : isToday
                      ? colors.accent
                      : getHeatBorder(pct, colors),
                  opacity: isFuture ? 0.35 : !day.isCurrentMonth ? 0.25 : 1,
                },
              ]}
              onPress={() => onDayPress(day.date)}
              activeOpacity={0.7}
              accessibilityLabel={`${day.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}${pct !== undefined ? `, ${pct}% complete` : ''}${isToday ? ', today' : ''}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <Text style={[
                styles.dayNumber,
                isSelected && styles.selectedText,
                isToday && !isSelected && styles.todayText,
                (isSelected || isToday) && { fontWeight: '600' as const },
              ]}>
                {day.date.getDate()}
              </Text>

              {/* Indicator dots */}
              {!isFuture && day.isCurrentMonth && (
                <View style={styles.dots}>
                  {day.hasAppointment && (
                    <View style={[
                      styles.dot,
                      { backgroundColor: isSelected ? 'rgba(0,0,0,0.5)' : '#EAB308' },
                    ]} />
                  )}
                  {pct !== undefined && (
                    <View style={[
                      styles.dot,
                      { backgroundColor: isSelected ? 'rgba(0,0,0,0.5)' : getDotColor(pct, colors) },
                    ]} />
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    paddingHorizontal: 12,
  },
  row: {
    flexDirection: 'row',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  cell: {
    width: '14.28%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  dayHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textMuted,
  },
  dayCell: {
    aspectRatio: 1,
    borderRadius: 10,
  },
  dayNumber: {
    fontSize: 14,
    color: c.textPrimary,
  },
  selectedText: {
    color: '#000000',
  },
  todayText: {
    color: c.accent,
  },
  dots: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
