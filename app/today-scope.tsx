// ============================================================================
// TODAY'S SCOPE SCREEN
// Temporarily hide items from today without editing Care Plan
// Suppressions are date-scoped and auto-expire tomorrow
// ============================================================================

import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { navigate } from '../lib/navigate';
import { LinearGradient } from 'expo-linear-gradient';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';
import { Colors, Spacing, BorderRadius } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import { useTodayScope } from '../hooks/useTodayScope';
import { useCarePlan } from '../hooks/useCarePlan';
import { useDailyCareInstances } from '../hooks/useDailyCareInstances';
import { useCarePlanConfig } from '../hooks/useCarePlanConfig';
import { BucketType, BUCKET_META } from '../types/carePlanConfig';
import { SubScreenHeader } from '../components/SubScreenHeader';
import { InfoModal, InfoIconButton } from '../components/common/InfoModal';
import { getTodayDateString } from '../services/carePlanGenerator';
import { StorageKeys } from '../utils/storageKeys';

const FIRST_TIME_BANNER_KEY = StorageKeys.TODAY_SCOPE_FIRST_TIME_BANNER_DISMISSED;

// ============================================================================
// ITEM ROW COMPONENT
// ============================================================================

interface ScopeItemRowProps {
  routineId: string;
  itemId: string;
  label: string;
  emoji?: string;
  routineName: string;
  isSuppressed: boolean;
  onToggle: () => void;
}

function ScopeItemRow({
  label,
  emoji,
  routineName,
  isSuppressed,
  onToggle,
}: ScopeItemRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <TouchableOpacity
      style={[styles.itemRow, isSuppressed && styles.itemRowSuppressed]}
      onPress={onToggle}
      activeOpacity={0.7}
      accessibilityLabel={`${label}, ${routineName}${isSuppressed ? ', hidden from today' : ', showing today'}`}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: !isSuppressed }}
    >
      <View style={styles.itemLeft}>
        <Text style={styles.itemEmoji}>{emoji || '•'}</Text>
        <View style={styles.itemInfo}>
          <Text style={[styles.itemLabel, isSuppressed && styles.itemLabelSuppressed]}>
            {label}
          </Text>
          <Text style={styles.itemRoutine}>{routineName}</Text>
        </View>
      </View>
      <View style={[styles.checkbox, isSuppressed ? styles.checkboxOff : styles.checkboxOn]}>
        <Text style={styles.checkboxIcon}>{isSuppressed ? '' : '✓'}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TodayScopeScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const today = getTodayDateString();
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showFirstTimeBanner, setShowFirstTimeBanner] = useState(false);

  // Check if first-time banner should be shown
  useEffect(() => {
    const checkFirstTimeBanner = async () => {
      try {
        const dismissed = await safeGetItem<string | null>(FIRST_TIME_BANNER_KEY, null);
        if (dismissed !== 'true') {
          setShowFirstTimeBanner(true);
        }
      } catch (error) {
        // Ignore errors
      }
    };
    checkFirstTimeBanner();
  }, []);

  const dismissFirstTimeBanner = async () => {
    setShowFirstTimeBanner(false);
    try {
      await safeSetItem(FIRST_TIME_BANNER_KEY, 'true');
    } catch (error) {
      // Ignore errors
    }
  };

  const {
    suppressedItems,
    loading: scopeLoading,
    toggleSuppression,
    resetToDefaults,
    isSuppressed,
    hasSuppressedItems,
  } = useTodayScope(today);

  const { dayState, loading: carePlanLoading } = useCarePlan();

  // NEW: Also load from the regimen-based system (skip suppression filter to show all items)
  const { state: instancesState, loading: instancesLoading } = useDailyCareInstances(
    today,
    undefined,
    { skipSuppressionFilter: true }
  );

  // Get enabled buckets for Quick Add section
  const { enabledBuckets, loading: configLoading } = useCarePlanConfig();

  const loading = scopeLoading || carePlanLoading || instancesLoading || configLoading;

  // Quick Add routes for each bucket
  const quickAddRoutes: Record<BucketType, { route: string; label: string }> = {
    meds: { route: '/medication-form', label: 'Add medication' },
    vitals: { route: '/care-plan/vitals', label: 'Configure vitals' },
    meals: { route: '/care-plan/meals', label: 'Configure meals' },
    water: { route: '/care-plan/water', label: 'Adjust water goal' },
    sleep: { route: '/care-plan/sleep', label: 'Configure sleep' },
    activity: { route: '/care-plan/activity', label: 'Configure activity' },
    wellness: { route: '/log-morning-wellness', label: 'Wellness check-in' },
    appointments: { route: '/appointments', label: 'Manage appointments' },
  };

  // Flatten all items from either system
  // Priority: new regimen system (instancesState), fallback to old routine system (dayState)
  const allItems = useMemo(() => {
    const items: Array<{
      routineId: string;
      routineName: string;
      itemId: string;
      label: string;
      emoji?: string;
    }> = [];

    // Use new regimen system if available (has instances)
    if (instancesState && instancesState.instances.length > 0) {
      // Build from DailyCareInstances - using windowLabel as routineId, carePlanItemId as itemId
      const windowDisplayNames: Record<string, string> = {
        morning: 'Morning',
        afternoon: 'Afternoon',
        evening: 'Evening',
        night: 'Night',
        custom: 'Custom',
      };

      // Deduplicate by carePlanItemId (same item may appear multiple times)
      const seen = new Set<string>();
      for (const instance of instancesState.instances) {
        const key = `${instance.windowLabel}-${instance.carePlanItemId}`;
        if (seen.has(key)) continue;
        seen.add(key);

        items.push({
          routineId: instance.windowLabel,
          routineName: windowDisplayNames[instance.windowLabel] || instance.windowLabel,
          itemId: instance.carePlanItemId,
          label: instance.itemName,
          emoji: instance.itemEmoji,
        });
      }
      return items;
    }

    // Fallback to old routine system
    if (!dayState?.routines) return [];

    for (const routine of dayState.routines) {
      for (const item of routine.items) {
        items.push({
          routineId: routine.routineId,
          routineName: routine.name,
          itemId: item.itemId,
          label: item.label,
          emoji: item.emoji,
        });
      }
    }

    return items;
  }, [dayState, instancesState]);

  // Group by routine
  const groupedItems = useMemo(() => {
    const groups: Record<string, typeof allItems> = {};
    for (const item of allItems) {
      if (!groups[item.routineName]) {
        groups[item.routineName] = [];
      }
      groups[item.routineName].push(item);
    }
    return groups;
  }, [allItems]);

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd]}
          style={styles.gradient}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        {/* Header */}
        <SubScreenHeader title="Adjust Today" subtitle="Temporarily hide items from today" />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Info button */}
          <View style={styles.titleRow}>
            <InfoIconButton onPress={() => setShowInfoModal(true)} />
          </View>

          {/* Info Modal */}
          <InfoModal
            visible={showInfoModal}
            onClose={() => setShowInfoModal(false)}
            title="About Adjust Today"
            content="Adjust tasks for today without changing your Care Plan. Hidden items won't appear in Now or Record."
            hint="Changes here only apply to today and reset tomorrow automatically."
          />

          {/* First-Time Helper Banner */}
          {showFirstTimeBanner && (
            <View style={styles.firstTimeBanner}>
              <View style={styles.firstTimeBannerContent}>
                <Text style={styles.firstTimeBannerIcon}>👋</Text>
                <Text style={styles.firstTimeBannerText}>
                  Changes here only apply to today. Your Care Plan stays the same.
                </Text>
              </View>
              <TouchableOpacity
                onPress={dismissFirstTimeBanner}
                style={styles.firstTimeBannerDismiss}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel="Dismiss helper banner"
                accessibilityRole="button"
              >
                <Text style={styles.firstTimeBannerDismissText}>×</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Text style={styles.infoIcon}>💡</Text>
            <Text style={styles.infoText}>
              Unchecked items won't appear in Now or Record today. This resets tomorrow.
            </Text>
          </View>

          {/* Quick Add Section */}
          {enabledBuckets.length > 0 && (
            <View style={styles.quickAddSection}>
              <Text style={styles.quickAddLabel}>QUICK ADD</Text>
              <View style={styles.quickAddGrid}>
                {enabledBuckets.slice(0, 6).map((bucket) => {
                  const meta = BUCKET_META[bucket];
                  const quickAdd = quickAddRoutes[bucket];
                  return (
                    <TouchableOpacity
                      key={bucket}
                      style={styles.quickAddButton}
                      onPress={() => navigate(quickAdd.route)}
                      activeOpacity={0.7}
                      accessibilityLabel={quickAdd.label}
                      accessibilityRole="button"
                    >
                      <Text style={styles.quickAddEmoji}>{meta.emoji}</Text>
                      <Text style={styles.quickAddText}>{quickAdd.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Items grouped by routine */}
          {Object.entries(groupedItems).length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyTitle}>No Care Plan items</Text>
              <Text style={styles.emptySubtitle}>
                Set up your Care Plan first to adjust today's scope.
              </Text>
            </View>
          ) : (
            Object.entries(groupedItems).map(([routineName, items]) => (
              <View key={routineName} style={styles.routineSection}>
                <Text style={styles.routineLabel}>{routineName.toUpperCase()}</Text>
                <View style={styles.routineCard}>
                  {items.map((item, index) => (
                    <React.Fragment key={`${item.routineId}-${item.itemId}`}>
                      <ScopeItemRow
                        routineId={item.routineId}
                        itemId={item.itemId}
                        label={item.label}
                        emoji={item.emoji}
                        routineName={item.routineName}
                        isSuppressed={isSuppressed(item.routineId, item.itemId)}
                        onToggle={() => toggleSuppression(item.routineId, item.itemId)}
                      />
                      {index < items.length - 1 && <View style={styles.itemDivider} />}
                    </React.Fragment>
                  ))}
                </View>
              </View>
            ))
          )}

          {/* Reset Button */}
          {hasSuppressedItems && (
            <TouchableOpacity
              style={styles.resetButton}
              onPress={resetToDefaults}
              activeOpacity={0.7}
              accessibilityLabel="Reset to Care Plan Defaults"
              accessibilityRole="button"
            >
              <Text style={styles.resetButtonText}>Reset to Care Plan Defaults</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  gradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 40,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },

  // First-Time Helper Banner
  firstTimeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: c.purpleMuted,
    borderWidth: 1,
    borderColor: c.purpleStrong,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  firstTimeBannerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  firstTimeBannerIcon: {
    fontSize: 16,
  },
  firstTimeBannerText: {
    flex: 1,
    fontSize: 13,
    color: c.purpleBright,
    lineHeight: 18,
  },
  firstTimeBannerDismiss: {
    padding: 4,
    marginLeft: Spacing.sm,
  },
  firstTimeBannerDismissText: {
    fontSize: 18,
    color: c.textHalf,
    lineHeight: 18,
  },
  subtitle: {
    fontSize: 15,
    color: c.textSecondary,
    lineHeight: 22,
  },

  // Info Banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: c.blueFaint,
    borderWidth: 1,
    borderColor: c.blueWash,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  infoIcon: {
    fontSize: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 18,
  },

  // Quick Add Section
  quickAddSection: {
    marginBottom: Spacing.xl,
  },
  quickAddLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textHalf,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  quickAddGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  quickAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: c.sageFaint,
    borderWidth: 1,
    borderColor: c.sageWash,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  quickAddEmoji: {
    fontSize: 14,
  },
  quickAddText: {
    fontSize: 12,
    color: c.accent,
    fontWeight: '500',
  },

  // Routine Section
  routineSection: {
    marginBottom: Spacing.lg,
  },
  routineLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textHalf,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  routineCard: {
    backgroundColor: c.glassFaint,
    borderWidth: 1,
    borderColor: c.glassActive,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },

  // Item Row
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
  },
  itemRowSuppressed: {
    opacity: 0.5,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  itemEmoji: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 15,
    color: c.textPrimary,
    marginBottom: 2,
  },
  itemLabelSuppressed: {
    textDecorationLine: 'line-through',
    color: c.textMuted,
  },
  itemRoutine: {
    fontSize: 12,
    color: c.textMuted,
  },
  itemDivider: {
    height: 1,
    backgroundColor: c.glassHover,
    marginLeft: 56,
  },

  // Checkbox
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  checkboxOn: {
    backgroundColor: c.accent,
    borderColor: c.accent,
  },
  checkboxOff: {
    backgroundColor: 'transparent',
    borderColor: c.textPlaceholder,
  },
  checkboxIcon: {
    fontSize: 16,
    color: c.background,
    fontWeight: '700',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    color: c.textSecondary,
    textAlign: 'center',
  },

  // Reset Button
  resetButton: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: c.amberBright,
  },
});
