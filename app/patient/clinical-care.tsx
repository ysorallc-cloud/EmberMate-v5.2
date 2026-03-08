// ============================================================================
// CLINICAL CARE SETTINGS
// Opt-in screen for Tier 3 clinical detail in Care Brief
// ============================================================================

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { SubScreenHeader } from '../../components/SubScreenHeader';
import {
  getClinicalCareSettings,
  saveClinicalCareSettings,
  ClinicalCareSettings,
} from '../../utils/clinicalCareSettings';

const DEFAULT_SETTINGS: ClinicalCareSettings = {
  enabled: false,
};

export default function ClinicalCareScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<ClinicalCareSettings>(DEFAULT_SETTINGS);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [])
  );

  const loadSettings = async () => {
    const stored = await getClinicalCareSettings();
    setSettings(stored);
  };

  const update = async (partial: Partial<ClinicalCareSettings>) => {
    const updated = { ...settings, ...partial };
    if (partial.enabled === true && !settings.enabledAt) {
      updated.enabledAt = new Date().toISOString();
    }
    setSettings(updated);
    await saveClinicalCareSettings(updated);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        <SubScreenHeader
          title="Clinical Care"
          emoji={'\u{1F3E5}'}
        />

        <ScrollView style={styles.scroll}>
          {/* Explanation */}
          <View style={styles.explainer}>
            <Text style={styles.explainerText}>
              These settings add clinical detail to your Care Brief for professional caregivers or complex care situations. When enabled, additional safety and clinical fields appear in your daily summary.
            </Text>
          </View>

          {/* Master Toggle */}
          <View style={styles.toggleCard}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>Enable Clinical Care</Text>
                <Text style={styles.toggleHint}>
                  Adds Safety & Alerts section and clinical context to your Care Brief
                </Text>
              </View>
              <Switch
                value={settings.enabled}
                onValueChange={(v) => update({ enabled: v })}
                trackColor={{ false: colors.border, true: colors.accentBorder }}
                thumbColor={settings.enabled ? colors.accent : colors.textMuted}
                accessibilityLabel="Enable clinical care settings"
              />
            </View>
          </View>

          {/* Clinical Fields (shown when enabled) */}
          {settings.enabled && (
            <>
              <Text style={styles.sectionLabel}>CLINICAL DETAILS</Text>

              {/* Mobility Status */}
              <View style={styles.fieldCard}>
                <Text style={styles.fieldLabel}>Mobility Status</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={settings.mobilityStatus || ''}
                  onChangeText={(v) => update({ mobilityStatus: v || undefined })}
                  placeholder="e.g., Ambulatory with walker, Wheelchair"
                  placeholderTextColor={colors.textMuted}
                  accessibilityLabel="Mobility status"
                />
              </View>

              {/* Cognitive Baseline */}
              <View style={styles.fieldCard}>
                <Text style={styles.fieldLabel}>Cognitive Baseline</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={settings.cognitiveBaseline || ''}
                  onChangeText={(v) => update({ cognitiveBaseline: v || undefined })}
                  placeholder="e.g., Alert and oriented x3, Mild dementia"
                  placeholderTextColor={colors.textMuted}
                  accessibilityLabel="Cognitive baseline"
                />
              </View>

              {/* Code Status */}
              <View style={styles.fieldCard}>
                <Text style={styles.fieldLabel}>Code Status</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={settings.codeStatus || ''}
                  onChangeText={(v) => update({ codeStatus: v || undefined })}
                  placeholder="e.g., Full Code, DNR/DNI, Comfort Care"
                  placeholderTextColor={colors.textMuted}
                  accessibilityLabel="Code status"
                />
              </View>

              {/* Fluid Target */}
              <View style={styles.fieldCard}>
                <Text style={styles.fieldLabel}>Fluid Target (oz/day)</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={settings.fluidTargetOz?.toString() || ''}
                  onChangeText={(v) => {
                    const num = parseInt(v, 10);
                    update({ fluidTargetOz: isNaN(num) ? undefined : num });
                  }}
                  placeholder="e.g., 64"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  accessibilityLabel="Fluid target in ounces"
                />
              </View>

              <Text style={styles.sectionLabel}>RISK FACTORS</Text>

              {/* Fall Risk */}
              <View style={styles.toggleCard}>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Fall Risk</Text>
                  <Switch
                    value={settings.fallRisk ?? false}
                    onValueChange={(v) => update({ fallRisk: v })}
                    trackColor={{ false: colors.border, true: 'rgba(248, 113, 113, 0.4)' }}
                    thumbColor={settings.fallRisk ? colors.redBright : colors.textMuted}
                    accessibilityLabel="Fall risk toggle"
                  />
                </View>
              </View>

              {/* DNR */}
              <View style={styles.toggleCard}>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>DNR Order</Text>
                  <Switch
                    value={settings.dnr ?? false}
                    onValueChange={(v) => update({ dnr: v })}
                    trackColor={{ false: colors.border, true: 'rgba(248, 113, 113, 0.4)' }}
                    thumbColor={settings.dnr ? colors.redBright : colors.textMuted}
                    accessibilityLabel="DNR order toggle"
                  />
                </View>
              </View>

              {/* Wandering Risk */}
              <View style={styles.toggleCard}>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Wandering Risk</Text>
                  <Switch
                    value={settings.wanderingRisk ?? false}
                    onValueChange={(v) => update({ wanderingRisk: v })}
                    trackColor={{ false: colors.border, true: 'rgba(248, 113, 113, 0.4)' }}
                    thumbColor={settings.wanderingRisk ? colors.redBright : colors.textMuted}
                    accessibilityLabel="Wandering risk toggle"
                  />
                </View>
              </View>

              {/* Swallowing Issues */}
              <View style={styles.toggleCard}>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Swallowing Issues</Text>
                  <Switch
                    value={settings.swallowingIssues ?? false}
                    onValueChange={(v) => update({ swallowingIssues: v })}
                    trackColor={{ false: colors.border, true: colors.amberBorder }}
                    thumbColor={settings.swallowingIssues ? colors.amber : colors.textMuted}
                    accessibilityLabel="Swallowing issues toggle"
                  />
                </View>
              </View>
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  gradient: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  explainer: {
    backgroundColor: c.glassHover,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  explainerText: {
    fontSize: 14,
    color: c.textSecondary,
    lineHeight: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textTertiary,
    letterSpacing: 1.2,
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  },
  toggleCard: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
  },
  toggleHint: {
    fontSize: 12,
    color: c.textMuted,
    marginTop: 4,
    lineHeight: 18,
  },
  fieldCard: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textSecondary,
    marginBottom: Spacing.sm,
  },
  fieldInput: {
    fontSize: 14,
    color: c.textPrimary,
    backgroundColor: c.glassFaint,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
