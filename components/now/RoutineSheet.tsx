// ============================================================================
// ROUTINE SHEET — Batch logging overlay for a time window
// "Start Morning" button opens this sheet listing all pending items
// Individual row taps still work normally when sheet is closed
// ============================================================================

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { parseTimeForDisplay, type TimeWindow } from '../../utils/nowHelpers';

const TIME_WINDOW_LABELS: Record<TimeWindow, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  night: 'Night',
};

const TIME_WINDOW_EMOJI: Record<TimeWindow, string> = {
  morning: '🌅',
  afternoon: '☀️',
  evening: '🌙',
  night: '🌑',
};

interface RoutineSheetProps {
  visible: boolean;
  window: TimeWindow;
  items: any[];
  onItemPress: (instance: any) => void;
  onDismiss: () => void;
}

export function RoutineSheet({
  visible,
  window: windowKey,
  items,
  onItemPress,
  onDismiss,
}: RoutineSheetProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const pendingItems = items.filter(i => i.status === 'pending');
  const doneItems = items.filter(i =>
    i.status === 'completed' || i.status === 'skipped' || i.status === 'missed'
  );

  const handleItemPress = useCallback((instance: any) => {
    onDismiss();
    // Small delay to let modal close before navigation
    setTimeout(() => onItemPress(instance), 150);
  }, [onItemPress, onDismiss]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onDismiss}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerEmoji}>{TIME_WINDOW_EMOJI[windowKey]}</Text>
            <View>
              <Text style={styles.headerTitle}>
                {TIME_WINDOW_LABELS[windowKey]} Routine
              </Text>
              <Text style={styles.headerSub}>
                {pendingItems.length} remaining · {doneItems.length} done
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={onDismiss}
            style={styles.closeButton}
            accessibilityLabel="Close routine sheet"
            accessibilityRole="button"
          >
            <Text style={styles.closeText}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Pending items */}
          {pendingItems.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>TO DO</Text>
              {pendingItems.map((instance, index) => {
                const time = parseTimeForDisplay(instance.scheduledTime);
                return (
                  <TouchableOpacity
                    key={instance.id}
                    style={[
                      styles.itemRow,
                      index < pendingItems.length - 1 && styles.itemRowBorder,
                    ]}
                    onPress={() => handleItemPress(instance)}
                    activeOpacity={0.7}
                    accessibilityLabel={`Log ${instance.itemName}`}
                    accessibilityRole="button"
                  >
                    <View style={styles.itemDot} />
                    <View style={styles.itemBody}>
                      <Text style={styles.itemName}>{instance.itemName}</Text>
                      {(time || instance.instructions || instance.itemDosage) && (
                        <Text style={styles.itemSub} numberOfLines={1}>
                          {[time, instance.itemDosage, instance.instructions]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                      )}
                    </View>
                    <View style={styles.logButton}>
                      <Text style={styles.logButtonText}>Log</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {/* Done items */}
          {doneItems.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>COMPLETED</Text>
              {doneItems.map((instance, index) => {
                const time = parseTimeForDisplay(instance.scheduledTime);
                const isMissed = instance.status === 'missed';
                const statusText = isMissed ? 'Missed' : instance.status === 'skipped' ? 'Skipped' : 'Done';

                return (
                  <View
                    key={instance.id}
                    style={[
                      styles.itemRow,
                      styles.itemRowDone,
                      index < doneItems.length - 1 && styles.itemRowBorder,
                    ]}
                  >
                    <Text style={[styles.doneIcon, isMissed && styles.missedIcon]}>
                      {isMissed ? '—' : '✓'}
                    </Text>
                    <View style={styles.itemBody}>
                      <Text style={styles.itemNameDone}>{instance.itemName}</Text>
                      <Text style={styles.itemSubDone}>
                        {time ? `${time} · ${statusText}` : statusText}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </>
          )}

          {/* All done */}
          {pendingItems.length === 0 && doneItems.length > 0 && (
            <View style={styles.allDoneCard}>
              <Text style={styles.allDoneEmoji}>✓</Text>
              <Text style={styles.allDoneText}>
                {TIME_WINDOW_LABELS[windowKey]} routine complete
              </Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: c.glassHover,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerEmoji: {
    fontSize: 28,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: c.textPrimary,
  },
  headerSub: {
    fontSize: 13,
    color: c.textMuted,
    marginTop: 2,
  },
  closeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: c.glassActive,
  },
  closeText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.accent,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textMuted,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  itemRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: c.glassDim,
  },
  itemRowDone: {
    opacity: 0.5,
  },
  itemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.accent,
  },
  itemBody: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '500',
    color: c.textPrimary,
    marginBottom: 2,
  },
  itemSub: {
    fontSize: 12,
    color: c.textMuted,
  },
  itemNameDone: {
    fontSize: 14,
    fontWeight: '500',
    color: c.textDisabled,
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },
  itemSubDone: {
    fontSize: 11,
    color: c.textMuted,
  },
  doneIcon: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(16, 185, 129, 0.6)',
    width: 16,
    textAlign: 'center',
  },
  missedIcon: {
    color: 'rgba(245, 158, 11, 0.7)',
  },
  logButton: {
    backgroundColor: c.glassActive,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
  },
  logButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textPrimary,
  },
  allDoneCard: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  allDoneEmoji: {
    fontSize: 32,
    color: 'rgba(16, 185, 129, 0.8)',
    fontWeight: '700',
  },
  allDoneText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(16, 185, 129, 0.8)',
  },
});
