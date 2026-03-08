// ============================================================================
// CALENDAR SCREEN - Month-at-a-glance with completion heatmap
// ============================================================================

import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import { CalendarGrid } from '../components/calendar/CalendarGrid';
import { DayDetail } from '../components/calendar/DayTimeline';
import { useCalendarData } from '../hooks/useCalendarData';
import { format, addMonths, subMonths, isSameDay } from 'date-fns';

export default function CalendarScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const params = useLocalSearchParams();

  const initialDate = params.selectedDate
    ? new Date(params.selectedDate as string)
    : new Date();

  const [currentMonth, setCurrentMonth] = useState(initialDate);
  const [selectedDate, setSelectedDate] = useState(initialDate);

  const { calendarDays, monthSummary, loading } = useCalendarData(currentMonth, selectedDate);

  const selectedDay = useMemo(() => {
    return calendarDays.find(d => isSameDay(d.date, selectedDate)) || null;
  }, [calendarDays, selectedDate]);

  const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

  const handleDayPress = (date: Date) => {
    setSelectedDate(date);
    if (date.getMonth() !== currentMonth.getMonth()) {
      setCurrentMonth(date);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Calendar</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Month Nav */}
          <View style={styles.monthHeader}>
            <TouchableOpacity
              onPress={handlePrevMonth}
              accessibilityLabel="Previous month"
              accessibilityRole="button"
            >
              <Text style={styles.navArrow}>←</Text>
            </TouchableOpacity>

            <Text style={styles.monthTitle}>
              {format(currentMonth, 'MMMM yyyy')}
            </Text>

            <TouchableOpacity
              onPress={handleNextMonth}
              accessibilityLabel="Next month"
              accessibilityRole="button"
            >
              <Text style={styles.navArrow}>→</Text>
            </TouchableOpacity>
          </View>

          {/* Month Summary Strip */}
          {!loading && monthSummary.totalTrackedDays > 0 && (
            <View style={styles.summaryStrip}>
              <View style={[styles.summaryItem, styles.summaryGreen]}>
                <Text style={styles.summaryValue}>{monthSummary.avgCompletion}%</Text>
                <Text style={styles.summaryLabel}>AVG DAILY</Text>
              </View>
              <View style={[styles.summaryItem, styles.summaryAccent]}>
                <Text style={[styles.summaryValue, { color: colors.accent }]}>
                  {monthSummary.perfectDays}
                </Text>
                <Text style={styles.summaryLabel}>PERFECT DAYS</Text>
              </View>
              <View style={[
                styles.summaryItem,
                monthSummary.missedMedDays > 3 ? styles.summaryAmber : styles.summaryNeutral,
              ]}>
                <Text style={[
                  styles.summaryValue,
                  { color: monthSummary.missedMedDays > 3 ? '#F59E0B' : colors.textPrimary },
                ]}>
                  {monthSummary.missedMedDays}
                </Text>
                <Text style={styles.summaryLabel}>MISSED MEDS</Text>
              </View>
            </View>
          )}

          {/* Loading */}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          )}

          {/* Calendar Grid */}
          <CalendarGrid
            days={calendarDays}
            selectedDate={selectedDate}
            onDayPress={handleDayPress}
          />

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: 'rgba(16,185,129,0.35)', borderColor: 'rgba(16,185,129,0.4)' }]} />
              <Text style={styles.legendText}>90%+</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: 'rgba(16,185,129,0.18)', borderColor: 'rgba(16,185,129,0.25)' }]} />
              <Text style={styles.legendText}>70%+</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: 'rgba(245,158,11,0.18)', borderColor: 'rgba(245,158,11,0.25)' }]} />
              <Text style={styles.legendText}>50%+</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#EAB308' }]} />
              <Text style={styles.legendText}>Appt</Text>
            </View>
          </View>

          {/* Selected Day Detail */}
          <DayDetail day={selectedDay} />

          <View style={{ height: 40 }} />
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: c.textPrimary,
    fontSize: 18,
  },
  title: {
    color: c.textPrimary,
    fontSize: 18,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  navArrow: {
    fontSize: 18,
    color: c.textMuted,
    padding: 8,
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: '500',
    color: c.textPrimary,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },

  // Month Summary Strip
  summaryStrip: {
    flexDirection: 'row',
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  summaryGreen: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderColor: 'rgba(16,185,129,0.25)',
  },
  summaryAccent: {
    backgroundColor: 'rgba(20,184,166,0.1)',
    borderColor: 'rgba(20,184,166,0.25)',
  },
  summaryAmber: {
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderColor: 'rgba(245,158,11,0.25)',
  },
  summaryNeutral: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: c.border,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  summaryLabel: {
    fontSize: 9,
    color: c.textMuted,
    marginTop: 1,
  },

  // Legend
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: c.border,
    marginHorizontal: 20,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 3,
    borderWidth: 1,
  },
  legendDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 10,
    color: c.textMuted,
  },
});
