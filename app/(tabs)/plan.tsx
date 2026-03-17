// ============================================================================
// PLAN TAB - Care plan configuration + settings gateway
// ============================================================================

import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { navigate } from '../../lib/navigate';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { AuroraBackground } from '../../components/aurora/AuroraBackground';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useCarePlanConfig } from '../../hooks/useCarePlanConfig';
import { useAppointments } from '../../hooks/useAppointments';
import { BucketType } from '../../types/carePlanConfig';

// ============================================================================
// BUCKET DISPLAY CONFIG
// ============================================================================

const BUCKET_META: Record<string, { label: string; emoji: string; route: string }> = {
  meds:     { label: 'Medications',   emoji: '\uD83D\uDC8A', route: '/care-plan/meds' },
  vitals:   { label: 'Vitals',        emoji: '\uD83D\uDCCA', route: '/care-plan/vitals' },
  meals:    { label: 'Meals',         emoji: '\uD83C\uDF7D\uFE0F', route: '/care-plan/meals' },
  water:    { label: 'Hydration',     emoji: '\uD83D\uDCA7', route: '/care-plan/water' },
  sleep:    { label: 'Sleep',         emoji: '\uD83D\uDE34', route: '/care-plan/sleep' },
  activity: { label: 'Activity',      emoji: '\uD83C\uDFC3', route: '/care-plan/activity' },
  wellness: { label: 'Wellness',      emoji: '\u2764\uFE0F', route: '/care-plan/wellness' },
};

const SETTINGS_ROWS: { label: string; emoji: string; route: string }[] = [
  { label: 'Patient Profile',       emoji: '\uD83D\uDC64', route: '/patient' },
  { label: 'Notifications',         emoji: '\uD83D\uDD14', route: '/notification-settings' },
  { label: 'Emergency Contacts',    emoji: '\uD83D\uDEA8', route: '/emergency' },
  { label: 'Security',              emoji: '\uD83D\uDD12', route: '/settings/security' },
  { label: 'Backup & Data',         emoji: '\uD83D\uDCBE', route: '/settings/backup' },
  { label: 'All Settings',          emoji: '\u2699\uFE0F', route: '/settings' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PlanTab() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { hasCarePlan, enabledBuckets, refresh: refreshConfig } = useCarePlanConfig();
  const { upcomingAppointments } = useAppointments();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshConfig();
    }, [refreshConfig])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshConfig();
    setRefreshing(false);
  }, [refreshConfig]);

  const buckets = enabledBuckets.length > 0
    ? enabledBuckets
    : ['meds', 'vitals', 'meals', 'water', 'sleep', 'activity', 'wellness'];

  return (
    <View style={styles.container}>
      <AuroraBackground variant="hub" />

      <View style={{ flex: 1 }}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 8 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
        >
          <ScreenHeader title="Care Plan" />

          <View style={styles.content}>

            {/* ═══ CARE PLAN BUCKETS ═══ */}
            <Text style={styles.sectionLabel}>CARE CATEGORIES</Text>
            <View style={styles.bucketGrid}>
              {buckets.map((bucket) => {
                const meta = BUCKET_META[bucket];
                if (!meta) return null;
                return (
                  <TouchableOpacity
                    key={bucket}
                    style={styles.bucketCard}
                    onPress={() => navigate(meta.route)}
                    activeOpacity={0.7}
                    accessibilityLabel={`${meta.label} settings`}
                    accessibilityRole="button"
                  >
                    <Text style={styles.bucketEmoji}>{meta.emoji}</Text>
                    <Text style={styles.bucketLabel}>{meta.label}</Text>
                    <Text style={styles.bucketChevron}>{'\u203A'}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Edit full care plan */}
            <TouchableOpacity
              style={styles.editPlanBtn}
              onPress={() => navigate('/care-plan')}
              activeOpacity={0.7}
              accessibilityLabel="Edit care plan"
              accessibilityRole="button"
            >
              <Text style={styles.editPlanText}>Edit Full Care Plan</Text>
            </TouchableOpacity>

            {/* ═══ APPOINTMENTS ═══ */}
            <Text style={[styles.sectionLabel, { marginTop: 28 }]}>APPOINTMENTS</Text>
            <TouchableOpacity
              style={styles.appointmentCard}
              onPress={() => navigate('/appointments')}
              activeOpacity={0.7}
              accessibilityLabel={`${upcomingAppointments.length} upcoming appointments`}
              accessibilityRole="button"
            >
              <Text style={styles.appointmentEmoji}>{'\uD83D\uDCC5'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.appointmentTitle}>Upcoming Appointments</Text>
                <Text style={styles.appointmentCount}>
                  {upcomingAppointments.length === 0
                    ? 'None scheduled'
                    : `${upcomingAppointments.length} upcoming`}
                </Text>
              </View>
              <Text style={styles.bucketChevron}>{'\u203A'}</Text>
            </TouchableOpacity>

            {/* ═══ SETTINGS ═══ */}
            <Text style={[styles.sectionLabel, { marginTop: 28 }]}>SETTINGS</Text>
            <View style={styles.settingsCard}>
              {SETTINGS_ROWS.map((row, idx) => (
                <TouchableOpacity
                  key={row.route}
                  style={[
                    styles.settingsRow,
                    idx < SETTINGS_ROWS.length - 1 && styles.settingsRowBorder,
                  ]}
                  onPress={() => navigate(row.route)}
                  activeOpacity={0.7}
                  accessibilityLabel={row.label}
                  accessibilityRole="button"
                >
                  <Text style={styles.settingsEmoji}>{row.emoji}</Text>
                  <Text style={styles.settingsLabel}>{row.label}</Text>
                  <Text style={styles.settingsChevron}>{'\u203A'}</Text>
                </TouchableOpacity>
              ))}
            </View>

          </View>

          <View style={{ height: 83 }} />
        </ScrollView>
      </View>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: 8 },
  content: { paddingHorizontal: 24, paddingTop: 8 },

  sectionLabel: {
    fontSize: 9, fontWeight: '600', letterSpacing: 2,
    color: c.textTertiary, textTransform: 'uppercase',
    marginBottom: 12, marginTop: 8,
  },

  // Bucket grid
  bucketGrid: { gap: 8 },
  bucketCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: c.glass, borderWidth: 1, borderColor: c.glassBorder,
    borderRadius: 14, padding: 14,
  },
  bucketEmoji: { fontSize: 20, width: 32, textAlign: 'center' },
  bucketLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: c.textPrimary },
  bucketChevron: { fontSize: 18, color: c.textDisabled, fontWeight: '300' },

  // Edit plan button
  editPlanBtn: {
    marginTop: 12, alignItems: 'center', paddingVertical: 12,
    borderRadius: 12, borderWidth: 1, borderColor: c.accentBorder,
    backgroundColor: c.accentLight,
  },
  editPlanText: { fontSize: 14, fontWeight: '600', color: c.accent },

  // Appointment card
  appointmentCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: c.glass, borderWidth: 1, borderColor: c.glassBorder,
    borderRadius: 14, padding: 14,
  },
  appointmentEmoji: { fontSize: 20, width: 32, textAlign: 'center' },
  appointmentTitle: { fontSize: 15, fontWeight: '500', color: c.textPrimary },
  appointmentCount: { fontSize: 12, color: c.textSecondary, marginTop: 2 },

  // Settings card
  settingsCard: {
    backgroundColor: c.glass, borderWidth: 1, borderColor: c.glassBorder,
    borderRadius: 14, overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14,
  },
  settingsRowBorder: {
    borderBottomWidth: 1, borderBottomColor: c.glassBorder,
  },
  settingsEmoji: { fontSize: 18, width: 28, textAlign: 'center' },
  settingsLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: c.textPrimary },
  settingsChevron: { fontSize: 18, color: c.textDisabled, fontWeight: '300' },
});
