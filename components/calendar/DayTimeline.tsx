// ============================================================================
// DAY DETAIL PANEL - Rich breakdown for selected calendar day
// Replaces basic timeline with 6-category completion grid
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CalendarDay } from '@/types/calendar';
import { Colors } from '@/theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { format, isToday } from 'date-fns';

interface Props {
  day: CalendarDay | null;
}

function MiniProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const { colors } = useTheme();
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <View style={{ height: 3, backgroundColor: colors.border, borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
      <View style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: 2 }} />
    </View>
  );
}

function getStatusColor(done: boolean, colors: typeof Colors): string {
  return done ? '#10B981' : colors.textMuted;
}

function getCountColor(value: number, total: number): string {
  if (value >= total) return '#10B981';
  if (value > 0) return '#F59E0B';
  return '#EF4444';
}

export const DayDetail: React.FC<Props> = ({ day }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!day) return null;

  const dateLabel = isToday(day.date)
    ? `Today, ${format(day.date, 'MMMM d')}`
    : format(day.date, 'MMMM d, yyyy');

  const pct = day.completionPct;

  // Future day
  if (day.isFuture) {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.dateLabel}>{dateLabel}</Text>
          <Text style={styles.upcomingBadge}>Upcoming</Text>
        </View>
        {day.appointment ? (
          <View style={styles.appointmentCard}>
            <Text style={styles.appointmentIcon}>{'\uD83D\uDCC5'}</Text>
            <View>
              <Text style={styles.appointmentProvider}>{day.appointment.provider}</Text>
              <Text style={styles.appointmentMeta}>
                {day.appointment.specialty} {'\u00B7'} {day.appointment.time}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={styles.futureText}>
            {(day.medsTotal || 0) > 0 ? `${day.medsTotal} medications scheduled` : 'No items scheduled'}
          </Text>
        )}
      </View>
    );
  }

  const medsDone = day.medsDone || 0;
  const medsTotal = day.medsTotal || 0;
  const mealsLogged = day.mealsLogged || 0;
  const mealsTotal = day.mealsTotal || 3;
  const waterGlasses = day.waterGlasses || 0;
  const waterTarget = day.waterTarget || 8;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.dateLabel}>{dateLabel}</Text>
        {pct !== undefined && (
          <View style={[
            styles.pctBadge,
            {
              backgroundColor: pct >= 80
                ? 'rgba(16,185,129,0.1)'
                : pct >= 50
                  ? 'rgba(245,158,11,0.08)'
                  : 'rgba(239,68,68,0.08)',
              borderColor: pct >= 80
                ? 'rgba(16,185,129,0.25)'
                : pct >= 50
                  ? 'rgba(245,158,11,0.25)'
                  : 'rgba(239,68,68,0.25)',
            },
          ]}>
            <Text style={[
              styles.pctText,
              {
                color: pct >= 80 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444',
              },
            ]}>
              {pct}% complete
            </Text>
          </View>
        )}
      </View>

      {/* 6-category grid */}
      <View style={styles.grid}>
        {/* Medications */}
        <View style={styles.gridItem}>
          <View style={styles.gridItemHeader}>
            <Text style={styles.gridItemLabel}>{'\uD83D\uDC8A'} Meds</Text>
            <Text style={[styles.gridItemValue, { color: getCountColor(medsDone, medsTotal) }]}>
              {medsDone}/{medsTotal}
            </Text>
          </View>
          {medsTotal > 0 && (
            <MiniProgressBar
              value={medsDone}
              max={medsTotal}
              color={medsDone >= medsTotal ? '#10B981' : '#F59E0B'}
            />
          )}
        </View>

        {/* Meals */}
        <View style={styles.gridItem}>
          <View style={styles.gridItemHeader}>
            <Text style={styles.gridItemLabel}>{'\uD83C\uDF7D\uFE0F'} Meals</Text>
            <Text style={[styles.gridItemValue, { color: getCountColor(mealsLogged, mealsTotal) }]}>
              {mealsLogged}/{mealsTotal}
            </Text>
          </View>
          <MiniProgressBar
            value={mealsLogged}
            max={mealsTotal}
            color={mealsLogged >= mealsTotal ? '#10B981' : '#F59E0B'}
          />
        </View>

        {/* Vitals */}
        <View style={styles.gridItem}>
          <View style={styles.gridItemHeader}>
            <Text style={styles.gridItemLabel}>{'\uD83E\uDE7A'} Vitals</Text>
            <Text style={[styles.gridItemValue, { color: getStatusColor(!!day.vitals, colors) }]}>
              {day.vitals ? '\u2713' : '\u2014'}
            </Text>
          </View>
          {day.vitalsData && (
            <Text style={styles.gridItemDetail}>
              {day.vitalsData.bp ? `BP ${day.vitalsData.bp}` : ''}
              {day.vitalsData.hr ? ` \u00B7 HR ${day.vitalsData.hr}` : ''}
              {day.vitalsData.glucose && day.vitalsData.glucose > 140
                ? ` \u00B7 Glucose ${day.vitalsData.glucose}\u2191`
                : ''}
            </Text>
          )}
        </View>

        {/* Wellness */}
        <View style={styles.gridItem}>
          <View style={styles.gridItemHeader}>
            <Text style={styles.gridItemLabel}>{'\uD83D\uDE0A'} Wellness</Text>
            <Text style={[styles.gridItemValue, { color: getStatusColor(!!day.wellness, colors) }]}>
              {day.wellness ? '\u2713' : '\u2014'}
            </Text>
          </View>
          {day.wellnessData && (
            <Text style={styles.gridItemDetail}>
              {day.wellnessData.mood ? `Mood: ${day.wellnessData.mood}` : ''}
              {day.wellnessData.pain ? ` \u00B7 Pain: ${day.wellnessData.pain}` : ''}
            </Text>
          )}
        </View>

        {/* Water */}
        <View style={styles.gridItem}>
          <View style={styles.gridItemHeader}>
            <Text style={styles.gridItemLabel}>{'\uD83D\uDCA7'} Water</Text>
            <Text style={[styles.gridItemValue, { color: waterGlasses >= 6 ? '#10B981' : colors.textMuted }]}>
              {waterGlasses}/{waterTarget}
            </Text>
          </View>
          <View style={styles.waterDots}>
            {Array.from({ length: waterTarget }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.waterDot,
                  { backgroundColor: i < waterGlasses ? colors.accent : colors.border },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Sleep */}
        <View style={styles.gridItem}>
          <View style={styles.gridItemHeader}>
            <Text style={styles.gridItemLabel}>{'\uD83D\uDE34'} Sleep</Text>
            <Text style={[
              styles.gridItemValue,
              {
                color: day.sleepHours != null && day.sleepHours >= 7
                  ? '#10B981'
                  : day.sleepHours != null
                    ? '#F59E0B'
                    : colors.textMuted,
              },
            ]}>
              {day.sleepHours != null ? `${day.sleepHours}h` : '\u2014'}
            </Text>
          </View>
          {day.sleepQuality && (
            <Text style={styles.gridItemDetail}>Quality: {day.sleepQuality}</Text>
          )}
        </View>
      </View>

      {/* Appointment if present */}
      {day.appointment && (
        <View style={styles.appointmentCard}>
          <Text style={styles.appointmentIcon}>{'\uD83D\uDCC5'}</Text>
          <View>
            <Text style={styles.appointmentProvider}>{day.appointment.provider}</Text>
            <Text style={styles.appointmentMeta}>
              {day.appointment.specialty} {'\u00B7'} {day.appointment.time}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  dateLabel: {
    color: c.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  upcomingBadge: {
    color: c.textMuted,
    fontSize: 11,
  },
  pctBadge: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pctText: {
    fontSize: 12,
    fontWeight: '600',
  },
  futureText: {
    color: c.textMuted,
    fontSize: 13,
    textAlign: 'center',
    padding: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridItem: {
    width: '48%',
    backgroundColor: 'rgba(4,36,32,0.6)',
    borderRadius: 10,
    padding: 10,
  },
  gridItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gridItemLabel: {
    fontSize: 12,
    color: c.textMuted,
  },
  gridItemValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  gridItemDetail: {
    fontSize: 10,
    color: c.textMuted,
    marginTop: 4,
    lineHeight: 14,
  },
  progressBarBg: {
    height: 3,
    backgroundColor: c.border,
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  waterDots: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 6,
  },
  waterDot: {
    flex: 1,
    height: 3,
    borderRadius: 1.5,
  },
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(20,184,166,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(20,184,166,0.25)',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  appointmentIcon: {
    fontSize: 16,
  },
  appointmentProvider: {
    color: c.textPrimary,
    fontSize: 13,
    fontWeight: '500',
  },
  appointmentMeta: {
    color: c.textMuted,
    fontSize: 11,
  },
});
