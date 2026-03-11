import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../contexts/ThemeContext';
import { navigate } from '../../lib/navigate';
import { StorageKeys } from '../../utils/storageKeys';
import type { BucketType } from '../../types/carePlanConfig';

interface Suggestion {
  key: string;
  emoji: string;
  title: string;
  subtitle: string;
  route: string;
}

interface SetupGuideCardProps {
  enabledBuckets: BucketType[];
  todayStats: {
    meds?: { total: number };
    vitals?: { total: number };
    meals?: { total: number };
  };
  patientName: string;
}

const DISMISS_KEY = StorageKeys.CHECKLIST_DISMISSED;

export function SetupGuideCard({ enabledBuckets, todayStats, patientName }: SetupGuideCardProps) {
  const { colors } = useTheme();
  const [dismissed, setDismissed] = useState(true); // default hidden until loaded

  useEffect(() => {
    AsyncStorage.getItem(DISMISS_KEY).then(val => {
      setDismissed(val === 'true');
    });
  }, []);

  const handleDismiss = useCallback(async () => {
    setDismissed(true);
    await AsyncStorage.setItem(DISMISS_KEY, 'true');
  }, []);

  if (dismissed) return null;

  const name = patientName && patientName !== 'Patient' ? patientName : '';
  const namePrefix = name ? `${name}'s ` : '';

  // Build suggestions based on enabled but empty buckets
  const suggestions: Suggestion[] = [];

  if (enabledBuckets.includes('meds') && (!todayStats.meds || todayStats.meds.total === 0)) {
    suggestions.push({
      key: 'meds',
      emoji: '\uD83D\uDC8A',
      title: `Add ${namePrefix}medications`,
      subtitle: 'So you never have to wonder if a dose was taken',
      route: '/care-plan/meds',
    });
  }

  if (enabledBuckets.includes('meals') && (!todayStats.meals || todayStats.meals.total === 0)) {
    suggestions.push({
      key: 'meals',
      emoji: '\uD83C\uDF7D\uFE0F',
      title: 'Set up meal tracking',
      subtitle: 'Breakfast, lunch, dinner — we\'ll remind you',
      route: '/care-plan/meals',
    });
  }

  if (enabledBuckets.includes('vitals') && (!todayStats.vitals || todayStats.vitals.total === 0)) {
    suggestions.push({
      key: 'vitals',
      emoji: '\uD83D\uDCCA',
      title: 'Start tracking vitals',
      subtitle: 'Blood pressure, weight, heart rate',
      route: '/care-plan/vitals',
    });
  }

  // Nothing to suggest — all buckets have items
  if (suggestions.length === 0) return null;

  // Show at most 2
  const visible = suggestions.slice(0, 2);

  return (
    <View style={styles.container}>
      <View style={[styles.row, visible.length === 1 && styles.rowSingle]}>
        {visible.map(s => (
          <TouchableOpacity
            key={s.key}
            style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
            onPress={() => navigate(s.route)}
            activeOpacity={0.7}
            accessibilityLabel={`${s.title}. ${s.subtitle}`}
            accessibilityRole="button"
          >
            <Text style={styles.emoji}>{s.emoji}</Text>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{s.title}</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>{s.subtitle}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={styles.dismissBtn} onPress={handleDismiss} activeOpacity={0.7}>
        <Text style={[styles.dismissText, { color: colors.textMuted }]}>Dismiss</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rowSingle: {
    justifyContent: 'center',
  },
  card: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    gap: 6,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 24,
    marginBottom: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 17,
  },
  subtitle: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
  },
  dismissBtn: {
    marginTop: 8,
    paddingVertical: 4,
  },
  dismissText: {
    fontSize: 12,
  },
});
