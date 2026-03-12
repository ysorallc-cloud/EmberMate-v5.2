// ============================================================================
// INSIGHTS CALENDAR — Adaptive calendar grid for the Insights tab
// Shows 7d (single row), 14d (multi-week), or 30d (full month) with
// heatmap backgrounds and segmented category bars per day.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { CalendarDay } from '../../types/calendar';
import { getHeatColor, getHeatBorder, CAT_COLORS, getDayCategoryColors } from '../../utils/calendarColors';

// ── Segmented bar sub-component ──

function SegBar({ categories, isToday }: { categories: string[]; isToday: boolean }) {
  if (!categories?.length) return null;
  return (
    <View style={segStyles.bar}>
      {categories.map((color, i) => (
        <View
          key={i}
          style={[segStyles.segment, { backgroundColor: isToday ? 'rgba(0,0,0,0.35)' : color }]}
        />
      ))}
    </View>
  );
}

const segStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    gap: 1,
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
    position: 'absolute',
    bottom: 3,
    left: 4,
    right: 4,
  },
  segment: {
    flex: 1,
  },
});

// ── Day headers ──

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// ── Props ──

interface InsightsCalendarProps {
  timeRange: 7 | 14 | 30;
  calendarDays: CalendarDay[];
}

export function InsightsCalendar({ timeRange, calendarDays }: InsightsCalendarProps) {
  const { colors: c } = useTheme();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build the date range to display
  const { days, rangeLabel } = useMemo(() => {
    const end = new Date(today);
    const start = new Date(today);

    if (timeRange === 7) {
      // Current week: go to start of week (Sunday)
      start.setDate(start.getDate() - start.getDay());
      end.setDate(start.getDate() + 6);
    } else if (timeRange === 14) {
      start.setDate(end.getDate() - 13);
    } else {
      // 30d: start of current month
      start.setDate(1);
      end.setMonth(start.getMonth() + 1, 0); // last day of month
    }

    // Build array of dates
    const dates: Date[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      dates.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    // For 14d/30d grid, pad start to align with Sunday
    if (timeRange !== 7) {
      const startDow = dates[0].getDay();
      for (let i = 0; i < startDow; i++) {
        dates.unshift(undefined as unknown as Date); // padding
      }
      // Pad end to fill the last week row
      while (dates.length % 7 !== 0) {
        dates.push(undefined as unknown as Date);
      }
    }

    // Build label
    let label = '';
    if (timeRange === 14) {
      const fmt = (d: Date) =>
        d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
      label = `${fmt(start)} – ${fmt(end)}`;
    } else if (timeRange === 30) {
      label = start
        .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        .toUpperCase();
    }

    return { days: dates, rangeLabel: label };
  }, [timeRange]);

  // Match CalendarDay data to each date
  const findDay = (date: Date | undefined): CalendarDay | undefined => {
    if (!date) return undefined;
    return calendarDays.find(
      (d) =>
        d.date.getFullYear() === date.getFullYear() &&
        d.date.getMonth() === date.getMonth() &&
        d.date.getDate() === date.getDate()
    );
  };

  const isSameDate = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  // ── Render a single day cell ──
  const renderCell = (date: Date | undefined, index: number) => {
    if (!date) {
      return <View key={`pad-${index}`} style={styles.cell} />;
    }

    const dayData = findDay(date);
    const isToday = isSameDate(date, today);
    const isFuture = date > today;
    const pct = dayData?.completionPct;
    const cats = dayData ? getDayCategoryColors(dayData) : [];

    const bgColor = isToday ? c.accent : getHeatColor(pct);
    const borderColor = isToday
      ? c.accent
      : getHeatBorder(pct, c.glassBorder);

    return (
      <View
        key={date.toISOString()}
        style={[
          styles.cell,
          {
            backgroundColor: bgColor,
            borderColor,
            borderWidth: 1,
            opacity: isFuture ? 0.3 : 1,
          },
        ]}
      >
        <Text
          style={[
            styles.cellDate,
            {
              color: isToday ? '#fff' : c.textSecondary,
              fontWeight: isToday ? '700' : '400',
            },
          ]}
        >
          {date.getDate()}
        </Text>
        {timeRange === 7 && pct !== undefined && !isFuture && (
          <Text style={[styles.cellPct, { color: c.textMuted }]}>
            {Math.round(pct)}%
          </Text>
        )}
        <SegBar categories={cats} isToday={isToday} />
      </View>
    );
  };

  // ── Legend ──
  const legend = (
    <View style={styles.legendContainer}>
      <View style={styles.legendRow}>
        <View style={[styles.legendSwatch, { backgroundColor: 'rgba(16,185,129,0.35)' }]} />
        <Text style={[styles.legendLabel, { color: c.textMuted }]}>90%+</Text>
        <View style={[styles.legendSwatch, { backgroundColor: 'rgba(16,185,129,0.18)' }]} />
        <Text style={[styles.legendLabel, { color: c.textMuted }]}>70%+</Text>
        <View style={[styles.legendSwatch, { backgroundColor: 'rgba(245,158,11,0.18)' }]} />
        <Text style={[styles.legendLabel, { color: c.textMuted }]}>&lt;70%</Text>
      </View>
      <View style={styles.legendRow}>
        {Object.entries(CAT_COLORS).map(([key, color]) => (
          <React.Fragment key={key}>
            <View style={[styles.legendBar, { backgroundColor: color }]} />
            <Text style={[styles.legendLabel, { color: c.textMuted }]}>
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </Text>
          </React.Fragment>
        ))}
      </View>
    </View>
  );

  // ── 7-day single row ──
  if (timeRange === 7) {
    return (
      <View style={styles.weekContainer}>
        <View style={styles.weekRow}>
          {days.map((date, i) => (
            <View key={i} style={styles.weekCellWrapper}>
              <Text style={[styles.dayLetter, { color: c.textMuted }]}>
                {DAY_LETTERS[i % 7]}
              </Text>
              {renderCell(date, i)}
            </View>
          ))}
        </View>
        {legend}
      </View>
    );
  }

  // ── 14d / 30d grid ──
  const weeks: (Date | undefined)[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <View
      style={[
        styles.gridContainer,
        {
          backgroundColor: c.glass,
          borderColor: c.glassBorder,
        },
      ]}
    >
      <Text style={[styles.gridHeader, { color: c.textMuted }]}>{rangeLabel}</Text>
      <View style={styles.dayHeaders}>
        {DAY_LETTERS.map((letter, i) => (
          <Text key={i} style={[styles.dayHeaderText, { color: c.textDisabled }]}>
            {letter}
          </Text>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.gridRow}>
          {week.map((date, di) => renderCell(date, wi * 7 + di))}
        </View>
      ))}
      {legend}
    </View>
  );
}

// ── Styles ──

const CELL_SIZE = 38;

const styles = StyleSheet.create({
  // 7d layout
  weekContainer: {
    marginHorizontal: 16,
    marginBottom: 14,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  weekCellWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  dayLetter: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },

  // Grid (14d/30d) layout
  gridContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 14,
  },
  gridHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 10,
    textAlign: 'center',
  },
  dayHeaders: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
  },
  dayHeaderText: {
    fontSize: 10,
    fontWeight: '600',
    width: CELL_SIZE,
    textAlign: 'center',
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
  },

  // Cell
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellDate: {
    fontSize: 13,
  },
  cellPct: {
    fontSize: 8,
    marginTop: 1,
  },

  // Legend
  legendContainer: {
    marginTop: 10,
    gap: 6,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendBar: {
    width: 10,
    height: 3,
    borderRadius: 1.5,
  },
  legendLabel: {
    fontSize: 9,
    marginRight: 4,
  },
});
