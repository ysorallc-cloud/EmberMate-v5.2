// ============================================================================
// DATA & PRIVACY SETTINGS
// Manage sample data, export data, and privacy controls
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import {
  detectSampleData,
  clearSampleData,
  SampleDataStatus,
} from '../utils/sampleDataManager';
import { resetSampleData, seedScenario, SampleScenario } from '../utils/sampleDataGenerator';
import { safeSetItem } from '../utils/safeStorage';
import { StorageKeys } from '../utils/storageKeys';
import {
  getRetentionPolicy,
  setRetentionPolicy,
  purgeOldData,
  RetentionPolicy,
  RETENTION_OPTIONS,
  getRetentionLabel,
} from '../utils/dataRetention';

// Components
import { AuroraBackground } from '../components/aurora/AuroraBackground';
import { SubScreenHeader } from '../components/SubScreenHeader';
import { logError } from '../utils/devLog';
import { emitDataUpdate } from '../lib/events';
import { EVENT } from '../lib/eventNames';
import { deleteAllUserData } from '../utils/privacyUtils';

export default function DataPrivacySettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [sampleDataStatus, setSampleDataStatus] = useState<SampleDataStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [retentionPolicy, setRetentionPolicyState] = useState<RetentionPolicy>('forever');

  useFocusEffect(
    useCallback(() => {
      loadStatus();
    }, [])
  );

  const loadStatus = async () => {
    setLoading(true);
    try {
      const [status, policy] = await Promise.all([
        detectSampleData(),
        getRetentionPolicy(),
      ]);
      setSampleDataStatus(status);
      setRetentionPolicyState(policy);
    } catch (error) {
      logError('DataPrivacySettingsScreen.loadStatus', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRetentionChange = (policy: RetentionPolicy) => {
    if (policy === 'forever') {
      // No warning needed for "keep forever"
      setRetentionPolicy(policy);
      setRetentionPolicyState(policy);
      return;
    }

    const option = RETENTION_OPTIONS.find(o => o.value === policy);
    const label = option?.label ?? `${policy} days`;

    Alert.alert(
      'Change Data Retention?',
      `Events older than ${label.toLowerCase()} will be permanently deleted. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          style: 'destructive',
          onPress: async () => {
            await setRetentionPolicy(policy);
            setRetentionPolicyState(policy);
            const removed = await purgeOldData();
            if (removed > 0) {
              emitDataUpdate(EVENT.LOGS);
              Alert.alert('Data Purged', `${removed} old event${removed === 1 ? '' : 's'} removed.`);
            }
          },
        },
      ]
    );
  };

  const handleReloadSampleData = () => {
    Alert.alert(
      'Reload Sample Data?',
      'This will clear existing sample data and reload the full Mom profile with medications, vitals, appointments, and more.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reload',
          onPress: async () => {
            setClearing(true);
            try {
              await resetSampleData();
              Alert.alert(
                'Sample Data Reloaded',
                'The full Mom profile has been loaded with medications, vitals, appointments, caregivers, and 14 days of tracking data.',
                [{ text: 'OK', onPress: loadStatus }]
              );
            } catch (error) {
              logError('DataPrivacySettingsScreen.handleReloadSampleData', error);
              Alert.alert('Error', 'Failed to reload sample data. Please try again.');
            } finally {
              setClearing(false);
            }
          },
        },
      ]
    );
  };

  const handleSeedScenario = (scenario: SampleScenario) => {
    const labels: Record<SampleScenario, string> = {
      stable: 'Stable — all tasks complete, normal vitals',
      watch: 'Watch — high BP + 1 overdue non-critical item',
      attention: 'Attention — medication overdue 90 minutes',
    };
    Alert.alert(
      `Seed Scenario: ${scenario.charAt(0).toUpperCase() + scenario.slice(1)}`,
      labels[scenario],
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: async () => {
            setClearing(true);
            try {
              await seedScenario(scenario);
              Alert.alert('Scenario Applied', `Today page will now show Care Status: ${scenario.charAt(0).toUpperCase() + scenario.slice(1)}.`, [{ text: 'OK' }]);
            } catch (error) {
              logError('DataPrivacySettings.seedScenario', error);
              Alert.alert('Error', 'Failed to apply scenario.');
            } finally {
              setClearing(false);
            }
          },
        },
      ]
    );
  };

  const handleClearSampleData = () => {
    if (!sampleDataStatus?.hasSampleData) return;

    Alert.alert(
      'Remove Sample Data?',
      `This will permanently remove ${sampleDataStatus.totalSampleRecords} sample records while preserving all data you've created.\n\nThis cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove Sample Data',
          style: 'destructive',
          onPress: performClear,
        },
      ]
    );
  };

  const performClear = async () => {
    setClearing(true);
    try {
      const result = await clearSampleData();

      if (result.success) {
        Alert.alert(
          'Sample Data Removed',
          `Successfully removed ${result.clearedCount} sample records. Your personal data is untouched.`,
          [{ text: 'OK', onPress: loadStatus }]
        );
      } else {
        Alert.alert(
          'Partial Removal',
          `Removed ${result.clearedCount} records. Some items could not be removed: ${result.errors.join(', ')}`,
          [{ text: 'OK', onPress: loadStatus }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to remove sample data. Please try again.');
    } finally {
      setClearing(false);
    }
  };

  const handleDeleteAllData = () => {
    Alert.alert(
      'Delete All My Data',
      'This will permanently delete ALL your health data from this device. This includes medications, appointments, vitals, notes, and all other records.\n\nThis action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'Are you absolutely sure? All data will be permanently removed.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete All My Data',
                  style: 'destructive',
                  onPress: async () => {
                    setDeleting(true);
                    try {
                      await deleteAllUserData();
                      Alert.alert(
                        'Data Deleted',
                        'All your health data has been permanently removed from this device.',
                        [{ text: 'OK', onPress: () => router.replace('/(onboarding)') }]
                      );
                    } catch (error) {
                      logError('DataPrivacySettingsScreen.handleDeleteAllData', error);
                      Alert.alert('Error', 'Failed to delete data. Please try again.');
                    } finally {
                      setDeleting(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  // Format count for display
  const formatCount = (count: number, singular: string, plural?: string): string => {
    const p = plural || `${singular}s`;
    return `${count} ${count === 1 ? singular : p}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <AuroraBackground variant="settings" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Analyzing data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AuroraBackground variant="settings" />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <SubScreenHeader title="Data & Privacy" emoji="🔒" />

          {/* Privacy Statement */}
          <View style={styles.privacyCard}>
            <Text style={styles.privacyIcon}>🔒</Text>
            <View style={styles.privacyContent}>
              <Text style={styles.privacyTitle}>Your data stays on your device</Text>
              <Text style={styles.privacyText}>
                EmberMate stores all health data locally. Nothing is uploaded without your explicit action.
              </Text>
            </View>
          </View>

          {/* Sample Data Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>SAMPLE DATA</Text>
            <Text style={styles.sectionDescription}>
              Demo data included to help you explore the app
            </Text>

            <View style={styles.settingCard}>
              {sampleDataStatus?.hasSampleData ? (
                <>
                  {/* Sample Data Found */}
                  <View style={styles.sampleDataInfo}>
                    <View style={styles.sampleDataHeader}>
                      <Text style={styles.sampleDataIcon}>📊</Text>
                      <Text style={styles.sampleDataTitle}>Sample data detected</Text>
                    </View>
                    <Text style={styles.sampleDataSubtitle}>
                      {formatCount(sampleDataStatus.totalSampleRecords, 'demo record')} found
                    </Text>

                    {/* Breakdown */}
                    <View style={styles.breakdown}>
                      {sampleDataStatus.counts.medications > 0 && (
                        <View style={styles.breakdownItem}>
                          <Text style={styles.breakdownIcon}>💊</Text>
                          <Text style={styles.breakdownText}>
                            {formatCount(sampleDataStatus.counts.medications, 'medication')}
                          </Text>
                        </View>
                      )}
                      {sampleDataStatus.counts.vitals > 0 && (
                        <View style={styles.breakdownItem}>
                          <Text style={styles.breakdownIcon}>❤️</Text>
                          <Text style={styles.breakdownText}>
                            {formatCount(sampleDataStatus.counts.vitals, 'vital reading')}
                          </Text>
                        </View>
                      )}
                      {sampleDataStatus.counts.moodLogs > 0 && (
                        <View style={styles.breakdownItem}>
                          <Text style={styles.breakdownIcon}>😊</Text>
                          <Text style={styles.breakdownText}>
                            {formatCount(sampleDataStatus.counts.moodLogs, 'mood log')}
                          </Text>
                        </View>
                      )}
                      {sampleDataStatus.counts.appointments > 0 && (
                        <View style={styles.breakdownItem}>
                          <Text style={styles.breakdownIcon}>📅</Text>
                          <Text style={styles.breakdownText}>
                            {formatCount(sampleDataStatus.counts.appointments, 'appointment')}
                          </Text>
                        </View>
                      )}
                      {sampleDataStatus.counts.caregivers > 0 && (
                        <View style={styles.breakdownItem}>
                          <Text style={styles.breakdownIcon}>👥</Text>
                          <Text style={styles.breakdownText}>
                            {formatCount(sampleDataStatus.counts.caregivers, 'care team member')}
                          </Text>
                        </View>
                      )}
                      {sampleDataStatus.counts.dailyTracking > 0 && (
                        <View style={styles.breakdownItem}>
                          <Text style={styles.breakdownIcon}>📈</Text>
                          <Text style={styles.breakdownText}>
                            {formatCount(sampleDataStatus.counts.dailyTracking, 'daily tracking record')}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.settingDivider} />

                  {/* Clear Button */}
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={handleClearSampleData}
                    disabled={clearing}
                    activeOpacity={0.7}
                    accessibilityLabel={clearing ? 'Removing sample data' : 'Remove sample data'}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: clearing }}
                  >
                    {clearing ? (
                      <ActivityIndicator size="small" color={colors.error} />
                    ) : (
                      <>
                        <Text style={styles.clearButtonIcon}>🗑️</Text>
                        <Text style={styles.clearButtonText}>Remove sample data</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <Text style={styles.clearNote}>
                    Removes demo content only. Your personal data will be preserved.
                  </Text>

                  <View style={styles.settingDivider} />

                  {/* Reload Button */}
                  <TouchableOpacity
                    style={styles.reloadButton}
                    onPress={handleReloadSampleData}
                    disabled={clearing}
                    activeOpacity={0.7}
                    accessibilityLabel="Reload sample data"
                    accessibilityRole="button"
                  >
                    <Text style={styles.reloadButtonIcon}>🔄</Text>
                    <Text style={styles.reloadButtonText}>Reload sample data</Text>
                  </TouchableOpacity>

                  {/* ─── SCENARIO TESTING ─── */}
                  <View style={{ paddingHorizontal: 14, paddingTop: 16 }}>
                    <Text style={styles.sectionHeader}>TODAY PAGE SCENARIOS</Text>
                    <Text style={styles.sectionDescription}>
                      Force the Today page into a specific Care Status state for testing. Run "Reload Sample Data" first, then apply a scenario.
                    </Text>
                    {(['stable', 'watch', 'attention'] as SampleScenario[]).map(scenario => (
                      <TouchableOpacity
                        key={scenario}
                        style={styles.scenarioButton}
                        onPress={() => handleSeedScenario(scenario)}
                        disabled={clearing}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.scenarioButtonText}>
                          {scenario === 'stable' && '✓ Seed Stable'}
                          {scenario === 'watch' && '◐ Seed Watch'}
                          {scenario === 'attention' && '! Seed Attention'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : (
                /* No Sample Data */
                <>
                  <View style={styles.noSampleData}>
                    <Text style={styles.noSampleDataIcon}>✓</Text>
                    <View style={styles.noSampleDataContent}>
                      <Text style={styles.noSampleDataTitle}>No sample data</Text>
                      <Text style={styles.noSampleDataText}>
                        All data in the app was created by you.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.settingDivider} />

                  {/* Load Sample Data Button */}
                  <TouchableOpacity
                    style={styles.reloadButton}
                    onPress={handleReloadSampleData}
                    disabled={clearing}
                    activeOpacity={0.7}
                    accessibilityLabel="Load sample data"
                    accessibilityRole="button"
                  >
                    <Text style={styles.reloadButtonIcon}>📊</Text>
                    <Text style={styles.reloadButtonText}>Load sample data</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* Data Management Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>DATA MANAGEMENT</Text>
            <Text style={styles.sectionDescription}>
              Control your health data
            </Text>

            <View style={styles.settingCard}>
              {/* Export Data */}
              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => router.push('/(tabs)/timeline')}
                activeOpacity={0.7}
                accessibilityLabel="Export daily report, share a summary with your care team"
                accessibilityRole="link"
              >
                <View style={styles.settingInfo}>
                  <View style={styles.settingTitleRow}>
                    <Text style={styles.settingIcon}>📤</Text>
                    <Text style={styles.settingLabel}>Export daily report</Text>
                  </View>
                  <Text style={styles.settingHint}>Share a summary with your care team</Text>
                </View>
                <Text style={styles.settingChevron}>›</Text>
              </TouchableOpacity>

              {/* Reset Banner - only show if sample data exists */}
              {sampleDataStatus?.hasSampleData && (
                <>
                  <View style={styles.settingDivider} />
                  <TouchableOpacity
                    style={styles.settingRow}
                    onPress={async () => {
                      await safeSetItem(StorageKeys.SAMPLE_BANNER_MODE, 'full');
                      Alert.alert('Banner Reset', 'The sample data banner will show in full mode again.');
                    }}
                    activeOpacity={0.7}
                    accessibilityLabel="Show sample data banner, re-enable the Now page banner if dismissed"
                    accessibilityRole="button"
                  >
                    <View style={styles.settingInfo}>
                      <View style={styles.settingTitleRow}>
                        <Text style={styles.settingIcon}>📊</Text>
                        <Text style={styles.settingLabel}>Show sample data banner</Text>
                      </View>
                      <Text style={styles.settingHint}>Re-enable the Now page banner if dismissed</Text>
                    </View>
                    <Text style={styles.settingChevron}>›</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* Data Retention Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>DATA RETENTION</Text>
            <Text style={styles.sectionDescription}>
              How long to keep logged events
            </Text>

            <View style={styles.settingCard}>
              {RETENTION_OPTIONS.map((option, index) => {
                const isSelected = retentionPolicy === option.value;
                return (
                  <React.Fragment key={String(option.value)}>
                    {index > 0 && <View style={styles.settingDivider} />}
                    <TouchableOpacity
                      style={styles.settingRow}
                      onPress={() => handleRetentionChange(option.value)}
                      activeOpacity={0.7}
                      accessibilityLabel={`${option.label}, ${option.description}`}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                    >
                      <View style={styles.settingInfo}>
                        <View style={styles.settingTitleRow}>
                          <Text style={styles.retentionRadio}>
                            {isSelected ? '\u25C9' : '\u25CB'}
                          </Text>
                          <Text style={[
                            styles.settingLabel,
                            isSelected && styles.retentionLabelActive,
                          ]}>
                            {option.label}
                          </Text>
                        </View>
                        <Text style={styles.settingHint}>{option.description}</Text>
                      </View>
                    </TouchableOpacity>
                  </React.Fragment>
                );
              })}
            </View>

            {retentionPolicy !== 'forever' && (
              <Text style={styles.retentionWarning}>
                Events older than {getRetentionLabel(retentionPolicy).toLowerCase()} are automatically removed on app launch.
              </Text>
            )}
          </View>

          {/* Delete My Data Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>DELETE MY DATA</Text>
            <Text style={styles.sectionDescription}>
              Permanently remove all health data from this device
            </Text>

            <View style={styles.settingCard}>
              <View style={styles.deleteInfoRow}>
                <Text style={styles.deleteInfoText}>
                  This permanently deletes all your health data including medications, appointments, vitals, care plans, notes, and preferences. Since EmberMate stores data only on your device, no server-side data exists to delete.
                </Text>
              </View>

              <View style={styles.settingDivider} />

              <TouchableOpacity
                style={styles.deleteAllButton}
                onPress={handleDeleteAllData}
                disabled={deleting}
                activeOpacity={0.7}
                accessibilityLabel="Delete all my data permanently"
                accessibilityRole="button"
                accessibilityHint="Permanently removes all health data from this device. This cannot be undone."
              >
                {deleting ? (
                  <ActivityIndicator size="small" color={colors.red} />
                ) : (
                  <>
                    <Text style={styles.deleteAllIcon}>⚠️</Text>
                    <Text style={styles.deleteAllText}>Delete All My Data</Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.deleteNote}>
                This action requires two confirmations and cannot be undone. We recommend exporting your data first.
              </Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Questions about your data? Contact support.
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.xl,
    paddingTop: 0,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: c.textSecondary,
  },


  // Privacy Card
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: c.sageFaint,
    borderWidth: 1,
    borderColor: c.sageWash,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    gap: 12,
  },
  privacyIcon: {
    fontSize: 20,
  },
  privacyContent: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: c.sage,
    marginBottom: 4,
  },
  privacyText: {
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 18,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textHalf,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 13,
    color: c.textTertiary,
    marginBottom: 12,
  },

  // Setting Card
  settingCard: {
    backgroundColor: c.glassFaint,
    borderWidth: 1,
    borderColor: c.glassActive,
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  settingInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  settingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  settingIcon: {
    fontSize: 18,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
  },
  settingHint: {
    fontSize: 12,
    color: c.textHalf,
    marginLeft: 26,
  },
  settingChevron: {
    fontSize: 20,
    color: c.textPlaceholder,
    fontWeight: '600',
  },
  settingDivider: {
    height: 1,
    backgroundColor: c.glassHover,
    marginHorizontal: 14,
  },

  // Sample Data Info
  sampleDataInfo: {
    padding: 14,
  },
  sampleDataHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sampleDataIcon: {
    fontSize: 18,
  },
  sampleDataTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
  },
  sampleDataSubtitle: {
    fontSize: 13,
    color: c.textTertiary,
    marginBottom: 12,
    marginLeft: 26,
  },
  breakdown: {
    backgroundColor: c.glass,
    borderRadius: 8,
    padding: 10,
    gap: 6,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownIcon: {
    fontSize: 14,
    width: 20,
    textAlign: 'center',
  },
  breakdownText: {
    fontSize: 12,
    color: c.textSecondary,
  },

  // Clear Button
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderTopWidth: 1,
    borderTopColor: c.redHint,
    padding: 14,
    marginTop: 0,
  },
  clearButtonIcon: {
    fontSize: 16,
  },
  clearButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: c.red,
  },
  clearNote: {
    fontSize: 11,
    color: c.textMuted,
    textAlign: 'center',
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 8,
  },

  // Reload Button
  reloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(45, 212, 191, 0.08)',
    padding: 14,
  },
  reloadButtonIcon: {
    fontSize: 16,
  },
  reloadButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: c.accent,
  },

  // Scenario Buttons
  scenarioButton: {
    backgroundColor: c.glassDim,
    borderWidth: 1,
    borderColor: c.glassBorder,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
    alignItems: 'center',
  },
  scenarioButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.accent,
  },

  // No Sample Data
  noSampleData: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  noSampleDataIcon: {
    fontSize: 20,
    color: c.green,
  },
  noSampleDataContent: {
    flex: 1,
  },
  noSampleDataTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 2,
  },
  noSampleDataText: {
    fontSize: 12,
    color: c.textHalf,
  },

  // Retention
  retentionRadio: {
    fontSize: 18,
    color: c.accent,
    width: 20,
    textAlign: 'center',
  },
  retentionLabelActive: {
    color: c.accent,
  },
  retentionWarning: {
    fontSize: 12,
    color: c.amber,
    marginTop: Spacing.sm,
    lineHeight: 16,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  footerText: {
    fontSize: 12,
    color: c.textMuted,
  },

  // Delete All Data
  deleteInfoRow: {
    padding: 14,
  },
  deleteInfoText: {
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 19,
  },
  deleteAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderTopWidth: 1,
    borderTopColor: c.redHint,
    padding: 14,
  },
  deleteAllIcon: {
    fontSize: 16,
  },
  deleteAllText: {
    fontSize: 15,
    fontWeight: '700',
    color: c.red,
  },
  deleteNote: {
    fontSize: 11,
    color: c.textMuted,
    textAlign: 'center',
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 8,
  },
});
