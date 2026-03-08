// ============================================================================
// RecentEntriesFeed — Grouped list of recent log entries for the Journal tab
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { navigate } from '../../lib/navigate';
import { RecentEntry, LABEL_MAP } from '../../hooks/useRecentEntries';
import { RecentEntryCard } from './RecentEntryCard';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { LogEventType } from '../../utils/logEvents';

interface Props {
  entries: RecentEntry[];
  loading: boolean;
  activeFilter?: LogEventType | 'all';
}

const FILTER_EMPTY_MESSAGES: Partial<Record<LogEventType | 'all', string>> = {
  all: 'Your recent care activities will appear here',
  medDose: 'No medication logs in the last 48 hours',
  vitals: 'No vitals recorded in the last 48 hours',
  meal: 'No meals logged in the last 48 hours',
  mood: 'No mood entries in the last 48 hours',
  symptom: 'No symptoms logged in the last 48 hours',
  note: 'No notes in the last 48 hours',
  hydration: 'No water logs in the last 48 hours',
  sleep: 'No sleep entries in the last 48 hours',
  activity: 'No activity entries in the last 48 hours',
};

export function RecentEntriesFeed({ entries, loading, activeFilter }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  const handlePress = (entry: RecentEntry) => {
    navigate(entry.route);
  };

  if (loading && entries.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.accent} />
      </View>
    );
  }

  if (entries.length === 0) {
    const filter = activeFilter || 'all';
    const isFiltered = filter !== 'all';
    const title = isFiltered ? `No ${LABEL_MAP[filter as LogEventType] || filter} entries` : 'Nothing logged yet';
    const subtitle = FILTER_EMPTY_MESSAGES[filter] || `No ${LABEL_MAP[filter as LogEventType]?.toLowerCase() || filter} entries in the last 48 hours`;

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyEmoji}>{'\u{1F4D6}'}</Text>
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.emptySubtitle}>{subtitle}</Text>
      </View>
    );
  }

  const todayEntries = entries.filter(e => e.dateGroup === 'Today');
  const yesterdayEntries = entries.filter(e => e.dateGroup === 'Yesterday');

  return (
    <View style={styles.container}>
      {todayEntries.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>TODAY</Text>
          {todayEntries.map(entry => (
            <RecentEntryCard key={entry.id} entry={entry} onPress={handlePress} />
          ))}
        </View>
      )}
      {yesterdayEntries.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>YESTERDAY</Text>
          {yesterdayEntries.map(entry => (
            <RecentEntryCard key={entry.id} entry={entry} onPress={handlePress} />
          ))}
        </View>
      )}
    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  section: {
    marginBottom: 12,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textHalf,
    letterSpacing: 1,
    marginBottom: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: c.textSecondary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: c.textMuted,
    textAlign: 'center',
  },
});
