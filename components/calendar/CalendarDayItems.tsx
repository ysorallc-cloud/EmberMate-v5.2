// ============================================================================
// CALENDAR DAY ITEMS - List of appointments/events for selected day
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { format } from 'date-fns';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { CalendarItem } from '../../types/calendar';
import { APPOINTMENT_TYPES } from '../../constants/appointmentTypes';

interface CalendarDayItemsProps {
  date: Date;
  items: CalendarItem[];
  isLoading: boolean;
  onItemPress: (item: CalendarItem) => void;
}

export function CalendarDayItems({ date, items, isLoading, onItemPress }: CalendarDayItemsProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      {/* Date header */}
      <Text style={styles.dateHeader}>{format(date, 'EEE, MMM d').toUpperCase()}</Text>

      {/* Loading state */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      ) : items.length === 0 ? (
        /* Empty state */
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No appointments or events</Text>
          <Text style={styles.emptySubtext}>Tap a button above to add</Text>
        </View>
      ) : (
        /* Items list */
        <View style={styles.itemsList}>
          {items.map((item) => {
            const isAppointment = item.type === 'appointment';
            const icon = isAppointment
              ? APPOINTMENT_TYPES.find(t => t.id === item.data.type)?.icon || '\uD83D\uDCCB'
              : '\uD83D\uDCCC';
            const title = isAppointment
              ? item.data.providerName
              : item.data.title;
            const time = isAppointment
              ? item.data.time
              : item.data.time || 'All day';
            const subtitle = isAppointment
              ? APPOINTMENT_TYPES.find(t => t.id === item.data.type)?.label
              : item.data.location;

            return (
              <TouchableOpacity
                key={item.data.id}
                style={styles.itemCard}
                onPress={() => onItemPress(item)}
                accessibilityLabel={`${title}, ${formatTime(time)}${subtitle ? `, ${subtitle}` : ''}`}
                accessibilityRole="button"
              >
                <View style={styles.itemContent}>
                  <Text style={styles.itemIcon}>{icon}</Text>
                  <View style={styles.itemText}>
                    <Text style={styles.itemTitle}>{title}</Text>
                    <Text style={styles.itemSubtitle}>
                      {formatTime(time)} {subtitle && `\u2022 ${subtitle}`}
                    </Text>
                  </View>
                  <Text style={styles.itemArrow}>{'\u2192'}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

function formatTime(time: string): string {
  if (time === 'All day') return time;

  try {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  } catch {
    return time;
  }
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    gap: 16,
  },
  dateHeader: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: c.textMuted,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyState: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 14,
    borderStyle: 'dashed',
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: c.textSecondary,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: c.textMuted,
  },
  itemsList: {
    gap: 12,
  },
  itemCard: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 14,
    overflow: 'hidden',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  itemIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  itemText: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: c.textPrimary,
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 13,
    color: c.textSecondary,
  },
  itemArrow: {
    fontSize: 16,
    color: c.textMuted,
    marginLeft: 8,
  },
});
