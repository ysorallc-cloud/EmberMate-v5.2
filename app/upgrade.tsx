// ============================================================================
// UPGRADE SCREEN
// Premium feature comparison and purchase flow
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import { SubScreenHeader } from '../components/SubScreenHeader';
import { getSubscriptionState, activatePromoCode } from '../storage/subscriptionRepo';
import { SubscriptionTier } from '../types/subscription';
import { navigateBack } from '../lib/navigate';
import { logError } from '../utils/devLog';

interface FeatureRow {
  label: string;
  free: boolean | string;
  premium: boolean | string;
}

const FEATURES: FeatureRow[] = [
  { label: 'Medication tracking', free: true, premium: true },
  { label: 'Appointment management', free: true, premium: true },
  { label: 'Vitals & symptom logging', free: true, premium: true },
  { label: 'Biometric security', free: true, premium: true },
  { label: 'Encrypted local storage', free: true, premium: true },
  { label: 'PDF care summaries', free: true, premium: true },
  { label: 'Patients supported', free: '1', premium: 'Up to 10' },
  { label: 'Advanced Insights', free: false, premium: true },
  { label: 'Correlation reports', free: false, premium: true },
  { label: 'Care team collaboration', free: false, premium: true },
  { label: 'Family activity feed', free: false, premium: true },
];

export default function UpgradeScreen() {
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>('free');
  const [promoCode, setPromoCode] = useState('');
  const [showPromo, setShowPromo] = useState(false);
  const [promoLoading, setPromoLoading] = useState(false);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    loadTier();
  }, []);

  const loadTier = async () => {
    try {
      const state = await getSubscriptionState();
      setCurrentTier(state.tier);
    } catch (error) {
      logError('UpgradeScreen.loadTier', error);
    }
  };

  const handleSubscribe = () => {
    // TODO: Wire to RevenueCat / react-native-purchases when IAP library is installed
    // Purchases.purchaseProduct('embermate_premium_monthly')
    Alert.alert(
      'Coming Soon',
      'In-app purchases are being finalized. Check back in the next update!',
      [{ text: 'OK' }],
    );
  };

  const handleRestorePurchases = () => {
    // TODO: Wire to RevenueCat restore
    // Purchases.restorePurchases()
    Alert.alert(
      'Restore Purchases',
      'Purchase restoration will be available when in-app purchases are configured.',
      [{ text: 'OK' }],
    );
  };

  const handleRedeemPromo = async () => {
    const code = promoCode.trim();
    if (!code) return;

    setPromoLoading(true);
    try {
      const success = await activatePromoCode(code);
      if (success) {
        Alert.alert('Success', 'Premium activated! Enjoy all features.', [
          { text: 'OK', onPress: () => navigateBack() },
        ]);
      } else {
        Alert.alert('Invalid Code', 'That promo code was not recognized. Please check and try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to redeem code. Please try again.');
    } finally {
      setPromoLoading(false);
      setPromoCode('');
    }
  };

  if (currentTier === 'premium') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LinearGradient
          colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd]}
          style={styles.gradient}
        >
          <SubScreenHeader title="Premium" />
          <View style={styles.premiumActive}>
            <Text style={styles.premiumActiveIcon}>{'⭐'}</Text>
            <Text style={styles.premiumActiveTitle}>You're on Premium</Text>
            <Text style={styles.premiumActiveText}>
              All features are unlocked. Thank you for supporting EmberMate!
            </Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        <SubScreenHeader title="Upgrade" />

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={styles.hero}>
            <Text style={styles.heroIcon}>{'⭐'}</Text>
            <Text style={styles.heroTitle}>EmberMate Premium</Text>
            <Text style={styles.heroSubtitle}>
              Unlock advanced insights, care team collaboration, and support for up to 10 patients.
            </Text>
          </View>

          {/* Feature Comparison */}
          <View style={styles.tableCard}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>Feature</Text>
              <Text style={[styles.tableHeaderText, styles.tableCol]}>Free</Text>
              <Text style={[styles.tableHeaderText, styles.tableCol, { color: colors.accent }]}>Premium</Text>
            </View>

            {FEATURES.map((f, i) => (
              <View
                key={f.label}
                style={[styles.tableRow, i === FEATURES.length - 1 && { borderBottomWidth: 0 }]}
              >
                <Text style={[styles.tableLabel, { flex: 1 }]}>{f.label}</Text>
                <View style={styles.tableCol}>
                  {typeof f.free === 'boolean' ? (
                    <Ionicons
                      name={f.free ? 'checkmark-circle' : 'close-circle'}
                      size={18}
                      color={f.free ? colors.success : colors.textMuted}
                    />
                  ) : (
                    <Text style={styles.tableCellText}>{f.free}</Text>
                  )}
                </View>
                <View style={styles.tableCol}>
                  {typeof f.premium === 'boolean' ? (
                    <Ionicons
                      name={f.premium ? 'checkmark-circle' : 'close-circle'}
                      size={18}
                      color={f.premium ? colors.accent : colors.textMuted}
                    />
                  ) : (
                    <Text style={[styles.tableCellText, { color: colors.accent }]}>{f.premium}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>

          {/* Subscribe Button */}
          <TouchableOpacity
            style={styles.subscribeButton}
            onPress={handleSubscribe}
            activeOpacity={0.8}
            accessibilityLabel="Subscribe to Premium"
            accessibilityRole="button"
          >
            <Text style={styles.subscribeButtonText}>Upgrade to Premium</Text>
          </TouchableOpacity>

          {/* Restore + Promo */}
          <TouchableOpacity
            style={styles.secondaryAction}
            onPress={handleRestorePurchases}
            accessibilityLabel="Restore purchases"
            accessibilityRole="button"
          >
            <Text style={styles.secondaryActionText}>Restore Purchases</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryAction}
            onPress={() => setShowPromo(!showPromo)}
            accessibilityLabel="Redeem promo code"
            accessibilityRole="button"
          >
            <Text style={styles.secondaryActionText}>
              {showPromo ? 'Hide Promo Code' : 'Have a Promo Code?'}
            </Text>
          </TouchableOpacity>

          {showPromo && (
            <View style={styles.promoSection}>
              <TextInput
                style={styles.promoInput}
                value={promoCode}
                onChangeText={setPromoCode}
                placeholder="Enter code"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[styles.promoButton, (!promoCode.trim() || promoLoading) && styles.promoButtonDisabled]}
                onPress={handleRedeemPromo}
                disabled={!promoCode.trim() || promoLoading}
                accessibilityLabel="Redeem promo code"
                accessibilityRole="button"
              >
                <Text style={styles.promoButtonText}>
                  {promoLoading ? 'Checking...' : 'Redeem'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Privacy Note */}
          <View style={styles.privacyNote}>
            <Ionicons name="shield-checkmark" size={16} color={colors.success} />
            <Text style={styles.privacyNoteText}>
              Your data stays on your device. Premium only unlocks features — no data leaves your phone.
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  gradient: { flex: 1 },
  scrollView: { flex: 1, paddingHorizontal: Spacing.xl },

  // Hero
  hero: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  heroIcon: { fontSize: 48, marginBottom: Spacing.md },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: c.textPrimary,
    marginBottom: Spacing.sm,
  },
  heroSubtitle: {
    fontSize: 15,
    color: c.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.lg,
  },

  // Feature Table
  tableCard: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    backgroundColor: c.surfaceAlt,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: c.textSecondary,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  tableLabel: {
    fontSize: 14,
    color: c.textPrimary,
  },
  tableCol: {
    width: 64,
    alignItems: 'center',
  },
  tableCellText: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textSecondary,
    textAlign: 'center',
  },

  // Subscribe Button
  subscribeButton: {
    backgroundColor: c.accent,
    borderRadius: BorderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  subscribeButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Secondary Actions
  secondaryAction: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  secondaryActionText: {
    fontSize: 14,
    color: c.accent,
    fontWeight: '500',
  },

  // Promo
  promoSection: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  promoInput: {
    flex: 1,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: c.textPrimary,
    letterSpacing: 2,
    fontWeight: '600',
  },
  promoButton: {
    backgroundColor: c.accent,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
  },
  promoButtonDisabled: {
    opacity: 0.4,
  },
  promoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Privacy Note
  privacyNote: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.sm,
  },
  privacyNoteText: {
    flex: 1,
    fontSize: 12,
    color: c.textMuted,
    lineHeight: 17,
  },

  // Premium Active State
  premiumActive: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  premiumActiveIcon: { fontSize: 64, marginBottom: Spacing.lg },
  premiumActiveTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: Spacing.sm,
  },
  premiumActiveText: {
    fontSize: 15,
    color: c.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
