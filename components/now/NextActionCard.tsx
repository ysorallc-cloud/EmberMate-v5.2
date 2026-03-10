import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { navigate } from '../../lib/navigate';

interface NextActionCardProps {
  nextTask: {
    id: string;
    label: string;
    sub: string;
    emoji: string;
    isMed?: boolean;
    overdue?: boolean;
  } | null;
  appointment: {
    provider: string;
    date: string;
    time: string;
  } | null;
  currentTimeWindow: string;
  onConfirm: (taskId: string) => void;
  onPrepVisit: () => void;
}

export function NextActionCard({ nextTask, appointment, currentTimeWindow, onConfirm, onPrepVisit }: NextActionCardProps) {
  const { colors } = useTheme();
  const hasAppt = !!appointment;
  const nextLabel = nextTask?.overdue
    ? 'NEXT \u00B7 OVERDUE'
    : `NEXT \u00B7 ${currentTimeWindow.toUpperCase()}`;

  return (
    <View style={[styles.row, hasAppt ? styles.rowDouble : styles.rowSingle]}>
      {/* Appointment card */}
      {hasAppt && appointment && (
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
          onPress={onPrepVisit}
          activeOpacity={0.7}
          accessibilityLabel={`Appointment with ${appointment.provider}. Tap to prepare.`}
          accessibilityRole="button"
        >
          <View style={[styles.iconBox, { backgroundColor: colors.purpleFaint, borderColor: colors.purpleBorder }]}>
            <Text style={styles.iconEmoji}>{'\uD83D\uDCC5'}</Text>
          </View>
          <View>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{appointment.provider}</Text>
            <Text style={[styles.cardSub, { color: colors.textMuted }]}>{appointment.date} \u00B7 {appointment.time}</Text>
          </View>
          <Text style={[styles.cardAction, { color: colors.purple }]}>Prep visit {'\u203A'}</Text>
        </TouchableOpacity>
      )}

      {/* Next task card */}
      {nextTask ? (
        <TouchableOpacity
          style={[
            styles.card,
            { backgroundColor: colors.glass, borderColor: colors.glassBorder },
            !hasAppt && styles.cardFullWidth,
          ]}
          activeOpacity={1}
          accessibilityLabel={`Next: ${nextTask.label}. ${nextTask.sub}`}
          accessibilityRole="text"
        >
          {hasAppt ? (
            // Vertical layout when side-by-side
            <>
              <View style={styles.nextHeader}>
                <View style={[styles.iconBox, { backgroundColor: colors.accentGlow, borderColor: 'rgba(91,138,106,0.15)' }]}>
                  <Text style={styles.iconEmoji}>{nextTask.emoji}</Text>
                </View>
                <Text style={[styles.nextLabel, { color: nextTask.overdue ? colors.amber : colors.textTertiary }]}>{nextLabel}</Text>
              </View>
              <View>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{nextTask.label}</Text>
                <Text style={[styles.cardSub, { color: colors.textMuted }]}>{nextTask.sub}</Text>
              </View>
              <TouchableOpacity
                onPress={() => onConfirm(nextTask.id)}
                activeOpacity={0.7}
                accessibilityLabel={nextTask.isMed ? 'Confirm all medications' : 'Mark as done'}
                accessibilityRole="button"
              >
                <LinearGradient
                  colors={[colors.accent, '#4A7C59']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.confirmBtn}
                >
                  <Text style={[styles.confirmText, { color: colors.textPrimary }]}>
                    {nextTask.isMed ? 'Confirm All' : 'Done'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : (
            // Horizontal layout when full-width
            <View style={styles.fullWidthRow}>
              <View style={[styles.iconBoxLarge, { backgroundColor: colors.accentGlow, borderColor: 'rgba(91,138,106,0.15)' }]}>
                <Text style={styles.iconEmojiLarge}>{nextTask.emoji}</Text>
              </View>
              <View style={styles.fullWidthContent}>
                <Text style={[styles.nextLabel, { color: nextTask.overdue ? colors.amber : colors.textTertiary }]}>{nextLabel}</Text>
                <Text style={[styles.cardTitleLarge, { color: colors.textPrimary }]}>{nextTask.label}</Text>
                <Text style={[styles.cardSub, { color: colors.textMuted }]}>{nextTask.sub}</Text>
              </View>
              <TouchableOpacity
                onPress={() => onConfirm(nextTask.id)}
                activeOpacity={0.7}
                accessibilityLabel={nextTask.isMed ? 'Confirm all medications' : 'Mark as done'}
                accessibilityRole="button"
              >
                <LinearGradient
                  colors={[colors.accent, '#4A7C59']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.confirmBtnHoriz}
                >
                  <Text style={[styles.confirmText, { color: colors.textPrimary }]}>
                    {nextTask.isMed ? 'Confirm All' : 'Done'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      ) : (
        // All done state
        <View style={[styles.card, styles.allDone, { backgroundColor: colors.greenTint, borderColor: colors.greenBorder }]}>
          <Text style={styles.allDoneEmoji}>{'\uD83C\uDF31'}</Text>
          <Text style={[styles.allDoneText, { color: colors.accentGradientEnd }]}>All tended to</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row' as const,
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  rowDouble: {},
  rowSingle: {},
  card: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  cardFullWidth: {},
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  iconBoxLarge: {
    width: 46,
    height: 46,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  iconEmoji: {
    fontSize: 15,
  },
  iconEmojiLarge: {
    fontSize: 22,
  },
  nextHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  nextLabel: {
    fontSize: 9,
    fontWeight: '600' as const,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    lineHeight: 17,
  },
  cardTitleLarge: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  cardSub: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  cardAction: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  confirmBtn: {
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center' as const,
  },
  confirmBtnHoriz: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  confirmText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  fullWidthRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 14,
  },
  fullWidthContent: {
    flex: 1,
  },
  allDone: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexDirection: 'row' as const,
    gap: 8,
    padding: 20,
  },
  allDoneEmoji: {
    fontSize: 24,
  },
  allDoneText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
});
