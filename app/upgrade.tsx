// ============================================================================
// UPGRADE SCREEN
// All features free during launch period
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import { SubScreenHeader } from '../components/SubScreenHeader';
import { activatePromoCode } from '../storage/subscriptionRepo';
import { navigateBack } from '../lib/navigate';

export default function UpgradeScreen() {
  const [promoCode, setPromoCode] = useState('');
  const [showPromo, setShowPromo] = useState(false);
  const [promoLoading, setPromoLoading] = useState(false);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        <SubScreenHeader title="Features" />

        <View style={styles.content}>
          <Text style={styles.icon}>{'🎉'}</Text>
          <Text style={styles.title}>All Features Included</Text>
          <Text style={styles.subtitle}>
            All features are included free during our launch period!
          </Text>

          <View style={styles.privacyNote}>
            <Ionicons name="shield-checkmark" size={16} color={colors.success} />
            <Text style={styles.privacyNoteText}>
              Your data stays on your device — no data leaves your phone.
            </Text>
          </View>

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
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  gradient: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  icon: { fontSize: 64, marginBottom: Spacing.lg },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    color: c.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  privacyNote: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.sm,
  },
  privacyNoteText: {
    flex: 1,
    fontSize: 12,
    color: c.textMuted,
    lineHeight: 17,
  },
  secondaryAction: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  secondaryActionText: {
    fontSize: 14,
    color: c.accent,
    fontWeight: '500',
  },
  promoSection: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    width: '100%',
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
});
