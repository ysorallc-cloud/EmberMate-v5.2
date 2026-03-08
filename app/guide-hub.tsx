// ============================================================================
// GUIDE HUB - Learn & Explore: Quick Start, Tips, Feature Guides
// ============================================================================

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, BorderRadius } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import { BackButton } from '../components/common/BackButton';
import { StorageKeys, StorageKeyPrefixes } from '../utils/storageKeys';
import { safeGetItem } from '../utils/safeStorage';

// ============================================================================
// DATA
// ============================================================================

interface QuickStartItem {
  key: string;
  label: string;
  icon: string;
  route: string;
  check: () => Promise<boolean>;
}

const QUICK_START_ITEMS: QuickStartItem[] = [
  {
    key: 'care_plan',
    label: 'Set up a care plan',
    icon: '\uD83D\uDDD2\uFE0F',
    route: '/care-plan',
    check: async () => {
      const legacy = await safeGetItem<any>(StorageKeys.CARE_PLAN_V1, null);
      const bucket = await safeGetItem<any>(StorageKeys.CAREPLAN_CONFIG_V1_DEFAULT, null);
      return legacy !== null || bucket !== null;
    },
  },
  {
    key: 'patient_name',
    label: 'Add who you care for',
    icon: '\uD83D\uDC64',
    route: '/patient',
    check: async () => {
      const name = await safeGetItem<string | null>(StorageKeys.PATIENT_NAME, null);
      return !!name;
    },
  },
  {
    key: 'first_log',
    label: 'Log your first care task',
    icon: '\u2705',
    route: '/log-morning-wellness',
    check: async () => {
      const keys = await AsyncStorage.getAllKeys();
      const instanceKeys = keys.filter(k => k.startsWith(StorageKeyPrefixes.DAILY_INSTANCES));
      for (const key of instanceKeys) {
        const data = await safeGetItem<any>(key, null);
        if (!data) continue;
        try {
          const instances = data.instances || data;
          if (Array.isArray(instances) && instances.some((i: any) => i.status === 'completed')) {
            return true;
          }
        } catch {}
      }
      return false;
    },
  },
];

const TIPS = [
  { icon: '\uD83D\uDCA1', text: 'Tap any medication name in the dropdown to auto-fill dosage suggestions' },
  { icon: '\u23F0', text: 'The Now tab highlights overdue tasks in amber \u2014 catch up with one tap' },
  { icon: '\uD83D\uDCCA', text: 'After 7 days of logging, AI insights and provider prep unlock automatically' },
  { icon: '\uD83D\uDCF1', text: 'Pull down on the Now page to refresh all progress rings' },
  { icon: '\uD83D\uDD14', text: "Medication reminders can follow up 3 times if you haven't logged a dose" },
];

interface FeatureGuide {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  color: string;
  colorBg: string;
  colorBorder: string;
  steps: { title: string; desc: string }[];
}

const FEATURE_GUIDES: FeatureGuide[] = [
  {
    id: 'now',
    icon: '\u2600\uFE0F',
    title: 'Now Tab',
    subtitle: 'Your daily command center',
    color: Colors.amber,
    colorBg: 'rgba(245, 158, 11, 0.08)',
    colorBorder: 'rgba(245, 158, 11, 0.25)',
    steps: [
      { title: 'Progress Rings', desc: 'Show completion for meds, vitals, meals, and wellness checks at a glance.' },
      { title: 'Next Up Card', desc: 'Highlights your most urgent task \u2014 tap it to go directly to that log screen.' },
      { title: 'Quick Log Bar', desc: 'One-tap access to log vitals, mood, water, meals, and notes without navigating away.' },
      { title: 'Care Insights', desc: 'AI-powered observations surface when patterns are detected in your data.' },
    ],
  },
  {
    id: 'journal',
    icon: '\uD83D\uDCD6',
    title: 'Journal Tab',
    subtitle: "The day's full story",
    color: '#F43F5E',
    colorBg: 'rgba(244, 63, 94, 0.12)',
    colorBorder: 'rgba(244, 63, 94, 0.25)',
    steps: [
      { title: 'Timeline View', desc: 'Every logged event appears chronologically \u2014 meds, vitals, moods, notes, meals.' },
      { title: 'Day Navigation', desc: "Swipe or tap dates to review any previous day's complete record." },
      { title: 'Quick Notes', desc: 'Add free-text observations inline \u2014 they show up in care summaries too.' },
    ],
  },
  {
    id: 'insights',
    icon: '\uD83D\uDCCA',
    title: 'Insights Tab',
    subtitle: 'Patterns, meds & appointments',
    color: Colors.accent,
    colorBg: Colors.accentDim,
    colorBorder: Colors.accentGlow,
    steps: [
      { title: 'Trends', desc: 'Charts show BP, mood, sleep, and med adherence over 7 or 30 day windows.' },
      { title: 'Medications', desc: 'Manage your full medication list \u2014 add, edit, set reminders, track supply.' },
      { title: 'Appointments', desc: 'Schedule visits, get prep checklists, and build care briefs to bring with you.' },
      { title: 'Care Brief', desc: 'Auto-generated summary of recent health data \u2014 exportable as PDF for providers.' },
    ],
  },
  {
    id: 'team',
    icon: '\uD83D\uDC65',
    title: 'Team Tab',
    subtitle: 'Your care circle & self-care',
    color: Colors.accent,
    colorBg: 'rgba(20, 184, 166, 0.06)',
    colorBorder: 'rgba(20, 184, 166, 0.25)',
    steps: [
      { title: 'Emergency Contacts', desc: 'One-tap calling in Emergency Mode \u2014 no confirmations, just speed.' },
      { title: 'Care Team', desc: 'Add doctors, nurses, family, and friends with roles and contact preferences.' },
      { title: 'Coffee Moment', desc: 'A 60-second breathing pause \u2014 because caregivers need care too.' },
    ],
  },
  {
    id: 'careplan',
    icon: '\uD83D\uDDC2\uFE0F',
    title: 'Care Plan',
    subtitle: 'Customize what you track',
    color: '#0EA5E9',
    colorBg: 'rgba(14, 165, 233, 0.12)',
    colorBorder: 'rgba(14, 165, 233, 0.25)',
    steps: [
      { title: 'Buckets', desc: 'Toggle categories on/off \u2014 meds, vitals, meals, mood, sleep, hydration.' },
      { title: 'Schedules', desc: 'Set time windows for each task \u2014 morning, afternoon, evening, bedtime.' },
      { title: 'Wellness Checks', desc: 'Configure morning and evening wellness surveys with optional clinical fields.' },
    ],
  },
  {
    id: 'sample',
    icon: '\uD83E\uDDEA',
    title: 'Sample Data',
    subtitle: 'Try features risk-free',
    color: '#10B981',
    colorBg: 'rgba(16, 185, 129, 0.1)',
    colorBorder: 'rgba(16, 185, 129, 0.25)',
    steps: [
      { title: 'Generate', desc: 'Settings \u2192 Advanced \u2192 Generate Sample Data fills the app with realistic demo entries.' },
      { title: 'Explore', desc: 'See how trends, journal, and care briefs look with 2 weeks of data already logged.' },
      { title: 'Clear', desc: 'Remove all sample data anytime \u2014 your real entries stay untouched.' },
    ],
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export default function GuideHubScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);
  const [tipIndex, setTipIndex] = useState(0);
  const tipInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Quick Start checks
  const runChecks = useCallback(async () => {
    const results: Record<string, boolean> = {};
    for (const item of QUICK_START_ITEMS) {
      try {
        results[item.key] = await item.check();
      } catch {
        results[item.key] = false;
      }
    }
    setCompleted(results);
  }, []);

  useFocusEffect(useCallback(() => { runChecks(); }, [runChecks]));

  // Tips auto-rotate
  useEffect(() => {
    tipInterval.current = setInterval(() => {
      setTipIndex(i => (i + 1) % TIPS.length);
    }, 5000);
    return () => { if (tipInterval.current) clearInterval(tipInterval.current); };
  }, []);

  const advanceTip = () => {
    setTipIndex(i => (i + 1) % TIPS.length);
    if (tipInterval.current) clearInterval(tipInterval.current);
    tipInterval.current = setInterval(() => {
      setTipIndex(i => (i + 1) % TIPS.length);
    }, 5000);
  };

  const handleResetHints = async () => {
    Alert.alert(
      'Reset All Hints?',
      'This will bring back dismissed tips, checklists, and prompts across the app.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          onPress: async () => {
            try {
              const allKeys = await AsyncStorage.getAllKeys();
              const dismissKeys = allKeys.filter(k =>
                k === StorageKeys.CHECKLIST_DISMISSED ||
                k.startsWith(StorageKeyPrefixes.PROMPT_DISMISSED) ||
                k === StorageKeys.SAMPLE_BANNER_DISMISSED ||
                k === 'welcome_banner_dismissed'
              );
              if (dismissKeys.length > 0) {
                await AsyncStorage.multiRemove(dismissKeys);
              }
              Alert.alert('Done', 'All hints and prompts have been restored.');
            } catch {
              Alert.alert('Error', 'Failed to reset hints.');
            }
          },
        },
      ]
    );
  };

  const doneCount = QUICK_START_ITEMS.filter(i => completed[i.key]).length;
  const allDone = doneCount === QUICK_START_ITEMS.length;
  const tip = TIPS[tipIndex];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <BackButton />
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.headerLabel}>LEARN & EXPLORE</Text>
            <Text style={styles.title}>Guide Hub</Text>
          </View>
          <View style={styles.backButton} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.subtitle}>
            Come back anytime — your progress is saved
          </Text>

          {/* Quick Start Checklist */}
          {!allDone && (
            <View style={styles.quickStartCard}>
              <View style={styles.quickStartHeader}>
                <Text style={styles.quickStartTitle}>Quick Start</Text>
                <Text style={styles.quickStartCount}>{doneCount} of {QUICK_START_ITEMS.length}</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${(doneCount / QUICK_START_ITEMS.length) * 100}%` }]} />
              </View>
              {QUICK_START_ITEMS.map(item => {
                const done = completed[item.key];
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.quickStartItem, done && styles.quickStartItemDone]}
                    onPress={() => !done && router.push(item.route as any)}
                    activeOpacity={done ? 1 : 0.7}
                    disabled={done}
                  >
                    <View style={[styles.quickStartCheck, done && styles.quickStartCheckDone]}>
                      {done && <Text style={styles.quickStartCheckmark}>{'\u2713'}</Text>}
                    </View>
                    <Text style={[styles.quickStartLabel, done && styles.quickStartLabelDone]}>
                      {item.label}
                    </Text>
                    <Text style={styles.quickStartIcon}>{item.icon}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Tips Carousel */}
          <TouchableOpacity style={styles.tipCard} onPress={advanceTip} activeOpacity={0.8}>
            <Text style={styles.tipIcon}>{tip.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.tipLabel}>TIP {tipIndex + 1}/{TIPS.length}</Text>
              <Text style={styles.tipText}>{tip.text}</Text>
            </View>
          </TouchableOpacity>

          {/* Feature Guides */}
          <Text style={styles.sectionLabel}>FEATURE GUIDES</Text>
          {FEATURE_GUIDES.map(guide => (
            <TouchableOpacity
              key={guide.id}
              style={[
                styles.guideCard,
                expandedGuide === guide.id && {
                  backgroundColor: guide.colorBg,
                  borderColor: guide.colorBorder,
                },
              ]}
              onPress={() => setExpandedGuide(expandedGuide === guide.id ? null : guide.id)}
              activeOpacity={0.8}
            >
              <View style={styles.guideHeader}>
                <Text style={styles.guideIcon}>{guide.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.guideTitle}>{guide.title}</Text>
                  <Text style={styles.guideSubtitle}>{guide.subtitle}</Text>
                </View>
                <Text style={[
                  styles.guideChevron,
                  { color: guide.color },
                  expandedGuide === guide.id && styles.guideChevronExpanded,
                ]}>
                  {'\u203A'}
                </Text>
              </View>

              {expandedGuide === guide.id && (
                <View style={styles.guideSteps}>
                  <View style={[styles.guideDivider, { backgroundColor: guide.colorBorder }]} />
                  {guide.steps.map((step, i) => (
                    <View key={i} style={styles.guideStep}>
                      <View style={[styles.guideStepNumber, { backgroundColor: `${guide.color}20` }]}>
                        <Text style={[styles.guideStepNumberText, { color: guide.color }]}>{i + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.guideStepTitle}>{step.title}</Text>
                        <Text style={styles.guideStepDesc}>{step.desc}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          ))}

          {/* Reset Hints */}
          <TouchableOpacity style={styles.resetCard} onPress={handleResetHints} activeOpacity={0.7}>
            <View style={{ flex: 1 }}>
              <Text style={styles.resetTitle}>Reset all hints & prompts</Text>
              <Text style={styles.resetSubtitle}>Brings back dismissed tips across the app</Text>
            </View>
            <Text style={styles.resetAction}>Reset</Text>
          </TouchableOpacity>

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: c.textPrimary,
    fontSize: 18,
  },
  headerLabel: {
    fontSize: 10,
    color: c.textMuted,
    letterSpacing: 1,
    fontWeight: '600',
  },
  title: {
    color: c.textPrimary,
    fontSize: 20,
    fontWeight: '300',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 13,
    color: c.textSecondary,
    marginTop: 16,
    marginBottom: 20,
  },

  // Quick Start
  quickStartCard: {
    backgroundColor: 'rgba(20, 184, 166, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.25)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  quickStartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickStartTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  quickStartCount: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: c.accent,
    borderRadius: 2,
  },
  quickStartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    marginBottom: 6,
  },
  quickStartItemDone: {
    opacity: 0.5,
  },
  quickStartCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(20, 184, 166, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickStartCheckDone: {
    borderColor: '#10B981',
    backgroundColor: '#10B981',
  },
  quickStartCheckmark: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
  },
  quickStartLabel: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  quickStartLabelDone: {
    textDecorationLine: 'line-through',
  },
  quickStartIcon: {
    fontSize: 16,
  },

  // Tips
  tipCard: {
    backgroundColor: 'rgba(251, 191, 36, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
    borderRadius: 12,
    padding: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 56,
  },
  tipIcon: {
    fontSize: 18,
  },
  tipLabel: {
    fontSize: 10,
    color: '#FBBF24',
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 3,
  },
  tipText: {
    fontSize: 12,
    color: c.textSecondary,
    lineHeight: 16,
  },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textMuted,
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 8,
  },

  // Feature Guides
  guideCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 8,
  },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  guideIcon: {
    fontSize: 24,
  },
  guideTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textPrimary,
  },
  guideSubtitle: {
    fontSize: 11,
    color: c.textMuted,
    marginTop: 1,
  },
  guideChevron: {
    fontSize: 18,
    fontWeight: '500',
  },
  guideChevronExpanded: {
    transform: [{ rotate: '90deg' }],
  },
  guideSteps: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  guideDivider: {
    height: 1,
    marginBottom: 12,
  },
  guideStep: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  guideStepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  guideStepNumberText: {
    fontSize: 11,
    fontWeight: '700',
  },
  guideStepTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 2,
  },
  guideStepDesc: {
    fontSize: 12,
    color: c.textSecondary,
    lineHeight: 17,
  },

  // Reset
  resetCard: {
    marginTop: 20,
    padding: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resetTitle: {
    fontSize: 13,
    color: c.textSecondary,
  },
  resetSubtitle: {
    fontSize: 11,
    color: c.textMuted,
    marginTop: 2,
  },
  resetAction: {
    fontSize: 13,
    color: c.accent,
    fontWeight: '600',
  },
});
