import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { navigate } from '../../lib/navigate';

interface CaregiverZoneProps {
  completedCount: number;
  skippedCount: number;
  onPause: () => void;
}

export function CaregiverZone({ completedCount, skippedCount, onPause }: CaregiverZoneProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { borderTopColor: colors.glassBorder }]}>
      <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>FOR YOU</Text>
      <View style={styles.grid}>
        {/* Handoff */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
          onPress={() => navigate('/(tabs)/journal')}
          activeOpacity={0.7}
          accessibilityLabel={`Handoff: ${completedCount} items logged. Tap to view.`}
          accessibilityRole="button"
        >
          <View style={[styles.iconBox, { backgroundColor: colors.accentGlow, borderColor: 'rgba(91,138,106,0.12)' }]}>
            <Text style={styles.iconEmoji}>{'\uD83D\uDCCB'}</Text>
          </View>
          <View>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Handoff</Text>
            <Text style={[styles.cardSub, { color: colors.textMuted }]}>{completedCount} logged</Text>
          </View>
          <Text style={[styles.cardAction, { color: colors.accent }]}>View {'\u203A'}</Text>
        </TouchableOpacity>

        {/* Notes */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
          onPress={() => navigate('/quick-log?expand=note')}
          activeOpacity={0.7}
          accessibilityLabel="Add a note"
          accessibilityRole="button"
        >
          <View style={[styles.iconBox, { backgroundColor: colors.purpleFaint, borderColor: 'rgba(167,139,250,0.12)' }]}>
            <Text style={styles.iconEmoji}>{'\uD83D\uDCDD'}</Text>
          </View>
          <View>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Notes</Text>
            <Text style={[styles.cardSub, { color: colors.textMuted }]}>Add a note</Text>
          </View>
          <Text style={[styles.cardAction, { color: colors.purple }]}>Log {'\u203A'}</Text>
        </TouchableOpacity>

        {/* Coffee Moment / Pause */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
          onPress={onPause}
          activeOpacity={0.7}
          accessibilityLabel="Take a 1-minute breathing pause"
          accessibilityRole="button"
        >
          <View style={[styles.iconBox, { backgroundColor: colors.amberDim, borderColor: 'rgba(212,168,83,0.12)' }]}>
            <Text style={styles.iconEmoji}>{'\u2615'}</Text>
          </View>
          <View>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Pause</Text>
            <Text style={[styles.cardSub, { color: colors.textMuted }]}>Breathe + tips</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    marginTop: 24,
    paddingTop: 16,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
    paddingLeft: 4,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    gap: 10,
  },
  card: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    paddingHorizontal: 14,
    gap: 8,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 15,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  cardSub: {
    fontSize: 11,
    marginTop: 2,
  },
  cardAction: {
    fontSize: 11,
    fontWeight: '500',
  },
});
