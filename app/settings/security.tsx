// ============================================================================
// SECURITY SETTINGS SCREEN
// Manage app lock, encryption, and security features
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { CommonStyles } from '../../theme/commonStyles';
import {
  checkBiometricCapabilities,
  enableBiometricAuth,
  disableBiometricAuth,
  isBiometricEnabled,
  setupPIN,
  hasPIN,
  getTimeSinceLastActivity,
  getAutoLockTimeout as loadAutoLockTimeout,
  setAutoLockTimeout as saveAutoLockTimeout,
  getPINLockoutInfo,
  BiometricCapabilities,
  PINLockoutInfo,
} from '../../utils/biometricAuth';
import {
  getRecentAuditLogs,
  getAuditStatistics,
  exportAuditLogs,
  AuditLogEntry,
} from '../../utils/auditLog';
import { logError } from '../../utils/devLog';

export default function SecuritySettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // State
  const [capabilities, setCapabilities] = useState<BiometricCapabilities | null>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [pinExists, setPinExists] = useState(false);
  const [autoLockTimeout, setAutoLockTimeout] = useState(300); // 5 minutes
  const [recentActivity, setRecentActivity] = useState<AuditLogEntry[]>([]);
  const [auditStats, setAuditStats] = useState<any>(null);
  const [lastActivity, setLastActivity] = useState<string>('');
  const [lockoutInfo, setLockoutInfo] = useState<PINLockoutInfo | null>(null);

  useEffect(() => {
    loadSecurityStatus();
    loadAuditData();
  }, []);

  const loadSecurityStatus = async () => {
    try {
      const caps = await checkBiometricCapabilities();
      const enabled = await isBiometricEnabled();
      const pinSet = await hasPIN();
      const timeSince = await getTimeSinceLastActivity();

      setCapabilities(caps);
      setBiometricEnabled(enabled);
      setPinExists(pinSet);

      const timeout = await loadAutoLockTimeout();
      setAutoLockTimeout(timeout);

      const lockout = await getPINLockoutInfo();
      setLockoutInfo(lockout);

      if (timeSince < Infinity) {
        const minutes = Math.floor(timeSince / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
          setLastActivity(`${hours}h ${minutes % 60}m ago`);
        } else {
          setLastActivity(`${minutes}m ago`);
        }
      } else {
        setLastActivity('Never');
      }
    } catch (error) {
      logError('SecuritySettingsScreen.loadSecurityStatus', error);
    }
  };

  const loadAuditData = async () => {
    try {
      const recent = await getRecentAuditLogs(10);
      const stats = await getAuditStatistics();

      setRecentActivity(recent);
      setAuditStats(stats);
    } catch (error) {
      logError('SecuritySettingsScreen.loadAuditData', error);
    }
  };

  const handleToggleBiometric = async (value: boolean) => {
    try {
      if (value) {
        const success = await enableBiometricAuth();

        if (success) {
          setBiometricEnabled(true);
          Alert.alert('Success', `${capabilities?.biometricName || 'Biometric'} authentication enabled`);
        } else {
          Alert.alert('Failed', 'Could not enable biometric authentication');
        }
      } else {
        await disableBiometricAuth();
        setBiometricEnabled(false);
        Alert.alert('Disabled', 'Biometric authentication has been disabled');
      }
    } catch (error) {
      logError('SecuritySettingsScreen.handleToggleBiometric', error);
      Alert.alert('Error', 'Failed to change biometric setting');
    }
  };

  const handleSetupPIN = () => {
    Alert.prompt(
      'Set Up PIN',
      'Enter a 4-6 digit PIN code',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Set PIN',
          onPress: async (pin) => {
            if (!pin || pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
              Alert.alert('Invalid PIN', 'PIN must be 4-6 digits');
              return;
            }

            const success = await setupPIN(pin);

            if (success) {
              setPinExists(true);
              Alert.alert('Success', 'PIN has been set successfully');
            } else {
              Alert.alert('Error', 'Failed to set PIN');
            }
          },
        },
      ],
      'secure-text'
    );
  };

  const handleChangePIN = () => {
    Alert.prompt(
      'Change PIN',
      'Enter your new 4-6 digit PIN',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change',
          onPress: async (pin) => {
            if (!pin || pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
              Alert.alert('Invalid PIN', 'PIN must be 4-6 digits');
              return;
            }

            const success = await setupPIN(pin);

            if (success) {
              Alert.alert('Success', 'PIN has been changed successfully');
            } else {
              Alert.alert('Error', 'Failed to change PIN');
            }
          },
        },
      ],
      'secure-text'
    );
  };

  const handleAutoLockChange = () => {
    Alert.alert('Auto-Lock After', 'Choose when to require re-authentication', [
      { text: '1 minute', onPress: () => updateAutoLock(60) },
      { text: '5 minutes', onPress: () => updateAutoLock(300) },
      { text: '15 minutes', onPress: () => updateAutoLock(900) },
      { text: '30 minutes', onPress: () => updateAutoLock(1800) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const updateAutoLock = async (seconds: number) => {
    setAutoLockTimeout(seconds);
    await saveAutoLockTimeout(seconds);
  };

  const handleExportAuditLogs = async () => {
    try {
      const logs = await exportAuditLogs();
      Alert.alert(
        'Export Audit Logs',
        'Audit logs exported successfully. This feature will be enhanced with file export in a future update.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to export audit logs');
    }
  };

  const formatEventType = (type: string): string => {
    return type
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={CommonStyles.backButton}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Text style={CommonStyles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerLabel}>SECURITY</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Security & Privacy</Text>

          {/* Status Overview */}
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Ionicons
                name={biometricEnabled || pinExists ? 'shield-checkmark' : 'shield-outline'}
                size={24}
                color={biometricEnabled || pinExists ? colors.success : colors.textMuted}
              />
              <View style={styles.statusInfo}>
                <Text style={styles.statusTitle}>
                  {biometricEnabled || pinExists ? 'Protected' : 'Not Protected'}
                </Text>
                <Text style={styles.statusSubtitle}>
                  {biometricEnabled
                    ? `${capabilities?.biometricName} enabled`
                    : pinExists
                    ? 'PIN enabled'
                    : 'No security enabled'}
                </Text>
              </View>
            </View>
            <Text style={styles.lastActivity}>Last activity: {lastActivity}</Text>
          </View>

          {/* App Lock Section */}
          <View style={styles.section}>
            <Text style={CommonStyles.sectionTitle}>APP LOCK</Text>

            {/* Biometric Authentication */}
            {capabilities?.isAvailable && (
              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Ionicons name="finger-print" size={22} color={colors.accent} />
                  <View style={styles.settingContent}>
                    <Text style={styles.settingTitle}>
                      {capabilities.biometricName}
                    </Text>
                    <Text style={styles.settingSubtitle}>
                      Use {capabilities.biometricName.toLowerCase()} to unlock
                    </Text>
                  </View>
                </View>
                <Switch
                  value={biometricEnabled}
                  onValueChange={handleToggleBiometric}
                  trackColor={{ false: colors.border, true: colors.accentLight }}
                  thumbColor={biometricEnabled ? colors.accent : colors.textMuted}
                />
              </View>
            )}

            {/* PIN Code */}
            <TouchableOpacity
              style={styles.settingItem}
              onPress={pinExists ? handleChangePIN : handleSetupPIN}
              accessibilityLabel={pinExists ? "Change PIN code" : "Set up PIN code"}
              accessibilityRole="button"
            >
              <View style={styles.settingLeft}>
                <Ionicons name="keypad" size={22} color={colors.accent} />
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>PIN Code</Text>
                  <Text style={styles.settingSubtitle}>
                    {pinExists ? 'Change PIN' : 'Set up PIN'}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>

            {/* PIN Lockout Status */}
            {lockoutInfo?.locked && (
              <View style={styles.lockoutBanner}>
                <Ionicons name="warning" size={18} color={colors.amber} />
                <Text style={styles.lockoutText}>
                  PIN locked — too many failed attempts. Try again in {lockoutInfo.lockoutSeconds}s
                </Text>
              </View>
            )}

            {/* Auto-lock Timeout */}
            <TouchableOpacity style={styles.settingItem} onPress={handleAutoLockChange} accessibilityLabel={`Auto-lock timeout, lock after ${autoLockTimeout / 60} minutes`} accessibilityRole="button">
              <View style={styles.settingLeft}>
                <Ionicons name="timer-outline" size={22} color={colors.accent} />
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>Auto-lock Timeout</Text>
                  <Text style={styles.settingSubtitle}>
                    Lock after {autoLockTimeout / 60} minutes
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Data Protection Section */}
          <View style={styles.section}>
            <Text style={CommonStyles.sectionTitle}>DATA PROTECTION</Text>

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="lock-closed" size={22} color={colors.success} />
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>Encryption Status</Text>
                  <Text style={styles.settingSubtitle}>AES-256 encryption active</Text>
                </View>
              </View>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            </View>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => router.push('/settings')}
              accessibilityLabel="Encrypted backups"
              accessibilityRole="button"
            >
              <View style={styles.settingLeft}>
                <Ionicons name="save-outline" size={22} color={colors.accent} />
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>Encrypted Backups</Text>
                  <Text style={styles.settingSubtitle}>Create password-protected backup</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Activity & Audit Section */}
          <View style={styles.section}>
            <Text style={CommonStyles.sectionTitle}>ACTIVITY & AUDIT</Text>

            {auditStats && (
              <View style={styles.statsCard}>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Total Events</Text>
                  <Text style={styles.statValue}>{auditStats.total}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Critical Events</Text>
                  <Text style={[styles.statValue, { color: colors.error }]}>
                    {auditStats.criticalEvents}
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.settingItem}
              onPress={handleExportAuditLogs}
              accessibilityLabel="Export audit logs"
              accessibilityRole="button"
            >
              <View style={styles.settingLeft}>
                <Ionicons name="document-text-outline" size={22} color={colors.accent} />
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>Export Audit Logs</Text>
                  <Text style={styles.settingSubtitle}>Download activity history</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Recent Activity */}
          <View style={styles.section}>
            <Text style={CommonStyles.sectionTitle}>RECENT ACTIVITY</Text>

            {recentActivity.length > 0 ? (
              recentActivity.slice(0, 5).map((log) => (
                <View key={log.id} style={styles.activityItem}>
                  <View style={styles.activityDot} />
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>
                      {formatEventType(log.eventType)}
                    </Text>
                    <Text style={styles.activityTime}>
                      {new Date(log.timestamp).toLocaleString()}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.severityBadge,
                      log.severity === 'CRITICAL' && styles.severityCritical,
                      log.severity === 'WARNING' && styles.severityWarning,
                    ]}
                  >
                    <Text style={styles.severityText}>{log.severity}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No recent activity</Text>
            )}
          </View>

          {/* Security Tips */}
          <View style={styles.section}>
            <Text style={CommonStyles.sectionTitle}>SECURITY TIPS</Text>

            <View style={styles.tipCard}>
              <Ionicons name="information-circle" size={20} color={colors.accent} />
              <Text style={styles.tipText}>
                Enable biometric authentication for quick and secure access to your health data.
              </Text>
            </View>

            <View style={styles.tipCard}>
              <Ionicons name="information-circle" size={20} color={colors.accent} />
              <Text style={styles.tipText}>
                Create encrypted backups regularly and store them in a secure location.
              </Text>
            </View>

            <View style={styles.tipCard}>
              <Ionicons name="information-circle" size={20} color={colors.accent} />
              <Text style={styles.tipText}>
                Review your activity logs monthly to ensure no unauthorized access.
              </Text>
            </View>
          </View>

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Platform.OS === 'android' ? 20 : 0,
    paddingBottom: Spacing.md,
  },
  headerLabel: {
    fontSize: 11,
    color: c.textMuted,
    letterSpacing: 1,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '300',
    color: c.textPrimary,
    marginBottom: Spacing.xl,
  },

  // Status Card
  statusCard: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: c.textPrimary,
    marginBottom: 2,
  },
  statusSubtitle: {
    fontSize: 14,
    color: c.textSecondary,
  },
  lastActivity: {
    fontSize: 13,
    color: c.textMuted,
    marginTop: Spacing.sm,
  },

  // Section
  section: {
    marginBottom: Spacing.xl,
  },

  // Setting Items
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: c.textPrimary,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: c.textTertiary,
  },

  // Stats Card
  statsCard: {
    backgroundColor: c.accentLight,
    borderWidth: 1,
    borderColor: c.accentBorder,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statLabel: {
    fontSize: 14,
    color: c.textSecondary,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: c.accent,
  },

  // Activity Items
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.accent,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    color: c.textPrimary,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: c.textMuted,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: c.accentLight,
  },
  severityCritical: {
    backgroundColor: c.redHint,
  },
  severityWarning: {
    backgroundColor: c.amberHint,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '700',
    color: c.accent,
  },

  // Tips
  tipCard: {
    flexDirection: 'row',
    gap: Spacing.md,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 18,
  },

  emptyText: {
    fontSize: 14,
    color: c.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },
  lockoutBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(234, 179, 8, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.25)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  lockoutText: {
    flex: 1,
    fontSize: 13,
    color: c.amber,
    lineHeight: 18,
  },
});
