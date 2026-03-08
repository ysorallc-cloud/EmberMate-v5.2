// ============================================================================
// MEDICATION INTERACTIONS SCREEN
// View and manage medication interaction warnings
// ============================================================================

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import { checkMedicationInteractions } from '../utils/medicationStorage';
import { DrugInteraction } from '../utils/drugInteractions';
import InteractionWarnings from '../components/InteractionWarnings';
import { logError } from '../utils/devLog';

export default function InteractionsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const [interactions, setInteractions] = useState<DrugInteraction[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadInteractions();
    }, [])
  );

  const loadInteractions = async () => {
    try {
      const found = await checkMedicationInteractions();
      setInteractions(found);
    } catch (error) {
      logError('InteractionsScreen.loadInteractions', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInteractions();
    setRefreshing(false);
  }, []);

  const highRisk = interactions.filter((i) => i.severity === 'high');
  const moderateRisk = interactions.filter((i) => i.severity === 'moderate');
  const lowRisk = interactions.filter((i) => i.severity === 'low');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerLabel}>INTERACTIONS</Text>
            <View style={styles.placeholder} />
          </View>

          <Text style={styles.title}>Drug Interactions</Text>

          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle" size={20} color={colors.accent} />
            <Text style={styles.infoText}>
              This screens against 22 common drug interactions. Always consult your
              healthcare provider or pharmacist for complete interaction information.
            </Text>
          </View>

          {/* Limitation Banner */}
          <View style={styles.limitationBanner}>
            <Ionicons name="alert-circle" size={20} color={colors.amber} style={styles.limitationIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.limitationTitle}>Limited Database</Text>
              <Text style={styles.limitationText}>
                This checks 22 common interactions only. Always verify with your pharmacist
                for a complete screening.
              </Text>
            </View>
          </View>

          {/* Summary Cards */}
          <View style={styles.summaryCards}>
            <View style={[styles.summaryCard, { borderLeftColor: colors.red }]}>
              <Text style={styles.summaryValue}>{highRisk.length}</Text>
              <Text style={styles.summaryLabel}>High Risk</Text>
            </View>

            <View style={[styles.summaryCard, { borderLeftColor: colors.amber }]}>
              <Text style={styles.summaryValue}>{moderateRisk.length}</Text>
              <Text style={styles.summaryLabel}>Moderate</Text>
            </View>

            <View style={[styles.summaryCard, { borderLeftColor: colors.gold }]}>
              <Text style={styles.summaryValue}>{lowRisk.length}</Text>
              <Text style={styles.summaryLabel}>Low Risk</Text>
            </View>
          </View>

          {/* Interactions Display */}
          {!loading && interactions.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle" size={64} color={colors.accent} />
              <Text style={styles.emptyTitle}>No Interactions Detected</Text>
              <Text style={styles.emptyText}>
                Your current medications don't have any known interactions in our database.
              </Text>
              <Text style={styles.emptySubtext}>
                Note: This database contains common interactions. Always inform your doctor and
                pharmacist about all medications you're taking.
              </Text>
            </View>
          )}

          {interactions.length > 0 && (
            <InteractionWarnings interactions={interactions} />
          )}

          {/* Medical Disclaimer */}
          <View style={styles.disclaimerBanner}>
            <Text style={styles.disclaimerText}>
              ⚕️ <Text style={styles.disclaimerBold}>Not a medical device.</Text>{' '}
              This interaction checker uses a limited database and is not a substitute for professional pharmacist or physician review.
              Always consult your healthcare provider before making medication changes.
            </Text>
          </View>

          {/* Database Info */}
          <View style={styles.databaseInfo}>
            <Text style={styles.databaseTitle}>About This Database</Text>
            <Text style={styles.databaseText}>
              • Contains common drug-drug interactions{'\n'}
              • Based on FDA and clinical data{'\n'}
              • Stored locally on your device (no internet required){'\n'}
              • Updated with each app version{'\n'}
              • Not a substitute for professional advice
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 20 : 0,
    paddingBottom: Spacing.md,
  },
    backButton: {
    width: 44,
    height: 44,
    backgroundColor: c.surface,
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
  headerLabel: { fontSize: 11, color: c.textMuted, letterSpacing: 1, fontWeight: '600' },
  placeholder: { width: 40 },
  title: { fontSize: 28, fontWeight: '300', color: c.textPrimary, marginBottom: Spacing.lg },
  infoBanner: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgba(255, 140, 148, 0.1)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 18,
  },
  limitationBanner: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(234, 179, 8, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.25)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  limitationIcon: {
    marginTop: 2,
  },
  limitationTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: c.amber,
    marginBottom: 2,
  },
  limitationText: {
    fontSize: 12,
    color: c.textSecondary,
    lineHeight: 17,
  },
  summaryCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: Spacing.xl,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: c.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderLeftWidth: 4,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: c.textSecondary,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    backgroundColor: c.surface,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: c.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: c.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
    paddingHorizontal: Spacing.xl,
  },
  emptySubtext: {
    fontSize: 13,
    color: c.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: Spacing.xl,
    fontStyle: 'italic',
  },
  databaseInfo: {
    backgroundColor: c.surfaceAlt,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
  },
  disclaimerBanner: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: c.amber,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  disclaimerText: {
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 19,
  },
  disclaimerBold: {
    fontWeight: '700',
    color: c.textPrimary,
  },
  databaseTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 8,
  },
  databaseText: {
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 20,
  },
});
