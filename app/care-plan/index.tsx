// ============================================================================
// CARE PLAN HOME — Single list with toggles
// ============================================================================

import React, { useState, useCallback, useRef, useMemo } from 'react';
import { navigate } from '../../lib/navigate';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { useCarePlanConfig } from '../../hooks/useCarePlanConfig';
import {
  BucketType,
  BucketConfig,
  BUCKET_META,
  BUCKET_TYPES,
  PRIMARY_BUCKETS,
  SECONDARY_BUCKETS,
  OPTIONAL_BUCKETS,
} from '../../types/carePlanConfig';
import { InfoModal, InfoIconButton } from '../../components/common/InfoModal';
import { CARE_PLAN_TEMPLATES, CarePlanTemplate, TemplateMedSuggestion } from '../../constants/carePlanTemplates';
import { TemplateMedSeedingModal } from '../../components/careplan/TemplateMedSeedingModal';
import { AddItemSheet } from '../../components/careplan/AddItemSheet';

// ============================================================================
// SECTION HEADER ROW
// ============================================================================

function SectionHeaderRow({ title, action, onAction }: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionHeaderTitle}>{title}</Text>
      {action && onAction && (
        <TouchableOpacity onPress={onAction} activeOpacity={0.7}>
          <Text style={styles.sectionHeaderAction}>{action} {'\u2192'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============================================================================
// CATEGORY ROW — replaces BucketCard
// ============================================================================

interface CategoryRowProps {
  bucket: BucketType;
  emoji: string;
  name: string;
  detail: string | null;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  onPress: () => void;
}

function CategoryRow({ bucket, emoji, name, detail, enabled, onToggle, onPress }: CategoryRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <TouchableOpacity
      style={[styles.categoryRow, !enabled && styles.categoryRowDisabled]}
      onPress={enabled ? onPress : undefined}
      activeOpacity={enabled ? 0.7 : 1}
      accessibilityLabel={`${name}, ${enabled ? 'enabled' : 'disabled'}. ${enabled ? 'Tap to configure.' : 'Toggle to enable.'}`}
      accessibilityRole="button"
    >
      {/* Left: emoji + text */}
      <View style={styles.categoryLeft}>
        <Text style={styles.categoryEmoji}>{emoji}</Text>
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryName}>{name}</Text>
          {enabled && detail && <Text style={styles.categoryDetail}>{detail}</Text>}
        </View>
      </View>
      {/* Right: toggle + chevron — fixed width column */}
      <View style={styles.categoryRight}>
        <Switch
          value={enabled}
          onValueChange={onToggle}
          trackColor={{ false: colors.glassStrong, true: colors.accent }}
          thumbColor={enabled ? colors.textPrimary : colors.switchThumbOff}
          ios_backgroundColor={colors.glassStrong}
        />
        {enabled ? (
          <Text style={styles.categoryChevron}>{'\u203A'}</Text>
        ) : (
          <View style={styles.categoryChevronSpacer} />
        )}
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// AI INSIGHT CARD
// ============================================================================

interface AIInsightCardProps {
  icon: string;
  title: string;
  message: string;
  onDismiss?: () => void;
}

function AIInsightCard({ icon, title, message, onDismiss }: AIInsightCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.aiInsightCard}>
      <View style={styles.aiInsightHeader}>
        <Text style={styles.aiInsightIcon}>{icon}</Text>
        <Text style={styles.aiInsightTitle}>{title}</Text>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.aiInsightDismiss} accessibilityLabel={`Dismiss ${title} insight`} accessibilityRole="button">
            <Text style={styles.aiInsightDismissText}>{'\u00D7'}</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.aiInsightMessage}>{message}</Text>
    </View>
  );
}

// ============================================================================
// TEMPLATE CARD
// ============================================================================

interface TemplateCardProps {
  template: CarePlanTemplate;
  onApply: () => void;
}

function TemplateCard({ template, onApply }: TemplateCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const bucketNames = template.enabledBuckets
    .map(b => BUCKET_META[b].name)
    .join(', ');

  return (
    <TouchableOpacity
      style={styles.templateCard}
      onPress={onApply}
      activeOpacity={0.7}
      accessibilityLabel={`Apply ${template.name} template`}
      accessibilityRole="button"
    >
      <View style={styles.templateHeader}>
        <Text style={styles.templateEmoji}>{template.emoji}</Text>
        <Text style={styles.templateName}>{template.name}</Text>
      </View>
      <Text style={styles.templateDescription}>{template.description}</Text>
      <Text style={styles.templateBuckets}>Enables: {bucketNames}</Text>
    </TouchableOpacity>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CarePlanHomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    config,
    loading,
    hasCarePlan,
    enabledBuckets,
    toggleBucket,
    updateBucket,
    getBucketStatus,
    initializeConfig,
  } = useCarePlanConfig();

  const [dismissedInsights, setDismissedInsights] = useState<string[]>([]);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [addItemWindow, setAddItemWindow] = useState<string | null>(null);
  const [medSeedingTemplate, setMedSeedingTemplate] = useState<{ name: string; suggestions: TemplateMedSuggestion[] } | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // All buckets in a single list
  const allBuckets: BucketType[] = [...PRIMARY_BUCKETS, ...SECONDARY_BUCKETS, ...OPTIONAL_BUCKETS];
  const enabledBucketSet = new Set(enabledBuckets);

  // Ensure config exists on first load
  React.useEffect(() => {
    if (!loading && !config) {
      initializeConfig();
    }
  }, [loading, config, initializeConfig]);

  const handleToggleBucket = useCallback(async (bucket: BucketType, enabled: boolean) => {
    await toggleBucket(bucket, enabled);
  }, [toggleBucket]);

  const handleConfigureBucket = useCallback((bucket: BucketType) => {
    switch (bucket) {
      case 'meds': navigate('/care-plan/meds'); break;
      case 'vitals': navigate('/care-plan/vitals'); break;
      case 'meals': navigate('/care-plan/meals'); break;
      case 'water': navigate('/care-plan/water'); break;
      case 'sleep': navigate('/care-plan/sleep'); break;
      case 'activity': navigate('/care-plan/activity'); break;
      case 'appointments': navigate('/appointments'); break;
      default: break;
    }
  }, []);

  const dismissInsight = useCallback((id: string) => {
    setDismissedInsights(prev => [...prev, id]);
  }, []);

  const applyTemplate = useCallback(async (template: CarePlanTemplate) => {
    let currentConfig = config;
    if (!currentConfig) {
      currentConfig = await initializeConfig();
    }

    const enabledSet = new Set(template.enabledBuckets);

    for (const bucket of BUCKET_TYPES) {
      if (!enabledSet.has(bucket)) {
        await updateBucket(bucket, { enabled: false });
      }
    }

    for (const bucket of template.enabledBuckets) {
      const suggestion = template.suggestedSettings[bucket];
      const updates: Partial<BucketConfig> = { enabled: true };

      if (suggestion) {
        if (suggestion.priority) updates.priority = suggestion.priority;
        if (suggestion.timesOfDay) updates.timesOfDay = suggestion.timesOfDay;
      }

      await updateBucket(bucket, updates);

      if (suggestion) {
        const bucketSpecific: Record<string, any> = {};
        if (suggestion.vitalTypes) bucketSpecific.vitalTypes = suggestion.vitalTypes;
        if (suggestion.frequency) bucketSpecific.frequency = suggestion.frequency;
        if (suggestion.trackingStyle) bucketSpecific.trackingStyle = suggestion.trackingStyle;
        if (suggestion.dailyGoalGlasses) bucketSpecific.dailyGoalGlasses = suggestion.dailyGoalGlasses;

        if (Object.keys(bucketSpecific).length > 0) {
          await updateBucket(bucket, bucketSpecific);
        }
      }
    }

    if (template.suggestedMedications && template.suggestedMedications.length > 0) {
      setMedSeedingTemplate({
        name: template.name,
        suggestions: template.suggestedMedications,
      });
    }
  }, [config, initializeConfig, updateBucket]);

  // ============================================================================
  // CONTEXTUAL INSIGHT
  // ============================================================================

  const getContextualInsight = useCallback(() => {
    if (!config) return null;

    if (!hasCarePlan && !dismissedInsights.includes('start-simple')) {
      return {
        id: 'start-simple',
        icon: '\uD83D\uDCA1',
        title: 'Start simple',
        message: 'Try enabling Medications and Mood first. You can add more categories anytime.',
      };
    }

    if (config.meds.enabled) {
      const medsConfig = config.meds;
      if (!medsConfig.medications?.length && !dismissedInsights.includes('add-meds')) {
        return {
          id: 'add-meds',
          icon: '\uD83D\uDC8A',
          title: 'Add medications',
          message: 'Tap Configure on Medications to add your first medication and set up reminders.',
        };
      }

      const medsWithSupply = (medsConfig.medications || []).filter(m => m.supplyEnabled && m.active);
      const medsNeedingRefill = medsWithSupply.filter(m =>
        m.daysSupply !== undefined && m.refillThresholdDays !== undefined &&
        m.daysSupply <= m.refillThresholdDays
      );
      if (medsNeedingRefill.length > 0 && !dismissedInsights.includes('refill-reminder')) {
        return {
          id: 'refill-reminder',
          icon: '\uD83D\uDD14',
          title: 'Refill reminder',
          message: `${medsNeedingRefill[0].name} supply is running low. Consider ordering a refill soon.`,
        };
      }
    }

    const enabledCount = enabledBuckets.length;
    if (enabledCount >= 6 && !dismissedInsights.includes('focus-suggestion')) {
      return {
        id: 'focus-suggestion',
        icon: '\uD83C\uDFAF',
        title: 'Focus for better habits',
        message: "You've enabled many categories. Consider starting with 2-3 that matter most, then add more once those feel natural.",
      };
    }

    if (config.vitals.enabled) {
      const vitalsConfig = config.vitals;
      if ((!vitalsConfig.vitalTypes || vitalsConfig.vitalTypes.length === 0) && !dismissedInsights.includes('select-vitals')) {
        return {
          id: 'select-vitals',
          icon: '\uD83D\uDCCA',
          title: 'Choose vitals to track',
          message: 'Tap Configure on Vitals to select which measurements to track.',
        };
      }
    }

    if (hasCarePlan && config) {
      const anyNotificationsEnabled = enabledBuckets.some((bucket: BucketType) => config[bucket]?.notificationsEnabled);
      if (!anyNotificationsEnabled && !dismissedInsights.includes('enable-notifications')) {
        return {
          id: 'enable-notifications',
          icon: '\uD83D\uDD14',
          title: 'Stay on track',
          message: 'Enable reminders on any category to get gentle notifications when things are due.',
        };
      }
    }

    return null;
  }, [config, hasCarePlan, enabledBuckets, dismissedInsights]);

  const contextualInsight = getContextualInsight();

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
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} accessibilityLabel="Go back" accessibilityRole="button">
            <Text style={styles.backIcon}>{'\u2190'}</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerLabel}>CUSTOMIZE TRACKING</Text>
          </View>
          <InfoIconButton onPress={() => setShowInfoModal(true)} />
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Info Modal */}
          <InfoModal
            visible={showInfoModal}
            onClose={() => setShowInfoModal(false)}
            title="Customize Tracking"
            content="Adjust what you track and when. Changes take effect immediately."
            hint="Use 'Adjust Today' from the Now screen for one-day changes that reset tomorrow."
          />

          {/* Quick Start Templates — only when no care plan exists */}
          {!hasCarePlan && (
            <>
              <Text style={styles.templateIntroLabel}>QUICK START</Text>
              <Text style={styles.templateIntro}>
                Choose a template to get started, then customize as needed.
              </Text>
              {CARE_PLAN_TEMPLATES.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onApply={() => applyTemplate(template)}
                />
              ))}
            </>
          )}

          {/* Contextual AI Insight */}
          {contextualInsight && (
            <AIInsightCard
              icon={contextualInsight.icon}
              title={contextualInsight.title}
              message={contextualInsight.message}
              onDismiss={() => dismissInsight(contextualInsight.id)}
            />
          )}

          {/* ═══ CATEGORIES — single flat list ═══ */}
          <SectionHeaderRow title={"Categories"} />

          {allBuckets.map(bucket => {
            const isEnabled = enabledBucketSet.has(bucket);
            return (
              <CategoryRow
                key={bucket}
                bucket={bucket}
                emoji={BUCKET_META[bucket].emoji}
                name={BUCKET_META[bucket].name}
                detail={isEnabled ? getBucketStatus(bucket) : null}
                enabled={isEnabled}
                onToggle={(val) => handleToggleBucket(bucket, val)}
                onPress={() => handleConfigureBucket(bucket)}
              />
            );
          })}

          {/* Bottom spacing */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </LinearGradient>

      {/* Add Item Sheet */}
      <AddItemSheet
        visible={!!addItemWindow}
        windowLabel={addItemWindow ?? undefined}
        onClose={() => setAddItemWindow(null)}
      />

      {/* Med Seeding Modal */}
      {medSeedingTemplate && (
        <TemplateMedSeedingModal
          visible={!!medSeedingTemplate}
          templateName={medSeedingTemplate.name}
          suggestions={medSeedingTemplate.suggestions}
          onClose={() => setMedSeedingTemplate(null)}
        />
      )}
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Platform.OS === 'android' ? 20 : 0,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    backgroundColor: c.backgroundElevated,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: c.textPrimary,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerLabel: {
    fontSize: 11,
    color: c.textMuted,
    letterSpacing: 1,
    fontWeight: '600',
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 40,
  },

  // Section Header Row
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
    marginTop: 8,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  sectionHeaderAction: {
    fontSize: 12,
    fontWeight: '500',
    color: c.accent,
  },

  // Category Row
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.025)',
  },
  categoryRowDisabled: {
    opacity: 0.45,
  },
  categoryLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    gap: 12,
    paddingRight: 12,
  },
  categoryEmoji: {
    fontSize: 22,
    width: 32,
    textAlign: 'center',
    flexShrink: 0,
  },
  categoryInfo: {
    flex: 1,
    minWidth: 0,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
  },
  categoryDetail: {
    fontSize: 11,
    color: c.textMuted,
    marginTop: 2,
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexShrink: 0,
    width: 72,
    gap: 8,
  },
  categoryChevron: {
    fontSize: 20,
    color: c.textMuted,
    width: 16,
    textAlign: 'center',
  },
  categoryChevronSpacer: {
    width: 16,
  },

  // AI Insight Card
  aiInsightCard: {
    backgroundColor: c.purpleMuted,
    borderWidth: 1,
    borderColor: c.purpleStrong,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  aiInsightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  aiInsightIcon: {
    fontSize: 20,
  },
  aiInsightTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: c.purpleBright,
  },
  aiInsightDismiss: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiInsightDismissText: {
    fontSize: 20,
    color: c.textHalf,
  },
  aiInsightMessage: {
    fontSize: 14,
    color: c.textSecondary,
    lineHeight: 20,
  },

  // Templates
  templateIntroLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textHalf,
    letterSpacing: 1,
    marginBottom: Spacing.md,
    marginTop: Spacing.xl,
  },
  templateIntro: {
    fontSize: 14,
    color: c.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  templateCard: {
    backgroundColor: c.glassFaint,
    borderWidth: 1,
    borderColor: c.glassActive,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  templateEmoji: {
    fontSize: 22,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textPrimary,
  },
  templateDescription: {
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  templateBuckets: {
    fontSize: 12,
    color: c.accent,
    fontWeight: '500',
  },
});
