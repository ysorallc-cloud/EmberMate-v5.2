// ============================================================================
// WINDOW RECEIPT — Green collapsed strip for fully-completed past windows
// Shows "✓ Morning complete · 8:22 AM" with a summary of what was logged
// ============================================================================

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { parseTimeForDisplay, type TimeWindow } from '../../utils/nowHelpers';

const TIME_WINDOW_LABELS: Record<TimeWindow, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  night: 'Night',
};

interface WindowReceiptProps {
  window: TimeWindow;
  items: any[];
}

export function WindowReceipt({ window: windowKey, items }: WindowReceiptProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [expanded, setExpanded] = useState(false);

  // Completion timestamp: latest updatedAt across items
  const completedAt = items.reduce((latest, item) => {
    const t = new Date(item.updatedAt).getTime();
    return t > latest ? t : latest;
  }, 0);

  const timeStr = completedAt
    ? new Date(completedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : '';

  // Build summary
  const summaryParts: string[] = [];
  const meds = items.filter(i => i.itemType === 'medication' && i.status === 'completed');
  if (meds.length > 0) {
    summaryParts.push(`${meds.length} med${meds.length > 1 ? 's' : ''} taken`);
  }
  const wellness = items.find(i => i.itemType === 'wellness' && i.status === 'completed');
  if (wellness) {
    summaryParts.push('Wellness logged');
  }
  const skipped = items.filter(i => i.status === 'skipped');
  if (skipped.length > 0) {
    summaryParts.push(`${skipped.length} skipped`);
  }
  const otherDone = items.filter(i =>
    i.status === 'completed' && i.itemType !== 'medication' && i.itemType !== 'wellness'
  );
  if (otherDone.length > 0) {
    summaryParts.push(`${otherDone.length} more logged`);
  }
  const summary = summaryParts.join(' · ') || `${items.length} items`;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
        accessibilityLabel={`${TIME_WINDOW_LABELS[windowKey]} complete at ${timeStr}. ${expanded ? 'Collapse' : 'Expand'}`}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <Text style={styles.checkmark}>✓</Text>
        <View style={styles.headerText}>
          <Text style={styles.title}>
            {TIME_WINDOW_LABELS[windowKey]} complete
            {timeStr ? ` · ${timeStr}` : ''}
          </Text>
          <Text style={styles.summary} numberOfLines={1}>{summary}</Text>
        </View>
        <Text style={styles.chevron}>{expanded ? '▼' : '▶'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.itemList}>
          {items.map(item => {
            const isMissed = item.status === 'missed';
            const isSkipped = item.status === 'skipped';
            const statusText = isMissed ? 'Missed' : isSkipped ? 'Skipped' : 'Done';
            const time = parseTimeForDisplay(item.scheduledTime);

            return (
              <View key={item.id} style={styles.item}>
                <Text style={[
                  styles.itemDot,
                  isMissed && styles.itemDotMissed,
                  isSkipped && styles.itemDotSkipped,
                ]}>
                  {isMissed ? '—' : isSkipped ? '–' : '✓'}
                </Text>
                <Text style={styles.itemName} numberOfLines={1}>{item.itemName}</Text>
                <Text style={[styles.itemStatus, isMissed && styles.itemStatusMissed]}>
                  {time ? `${time} · ${statusText}` : statusText}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    marginBottom: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    gap: 6,
  },
  checkmark: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(16, 185, 129, 0.8)',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(16, 185, 129, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summary: {
    fontSize: 11,
    color: c.textMuted,
    marginTop: 1,
  },
  chevron: {
    fontSize: 8,
    color: c.textMuted,
    width: 12,
  },
  itemList: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(16, 185, 129, 0.10)',
    paddingHorizontal: 10,
    paddingBottom: 6,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    gap: 8,
  },
  itemDot: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(16, 185, 129, 0.6)',
    width: 14,
    textAlign: 'center',
  },
  itemDotMissed: {
    color: 'rgba(245, 158, 11, 0.7)',
  },
  itemDotSkipped: {
    color: c.textMuted,
  },
  itemName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: c.textDisabled,
  },
  itemStatus: {
    fontSize: 10,
    color: c.textMuted,
  },
  itemStatusMissed: {
    color: 'rgba(245, 158, 11, 0.6)',
  },
});
