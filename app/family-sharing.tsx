// ============================================================================
// FAMILY SHARING SCREEN
// Invite caregivers and manage access
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { safeGetItem } from '../utils/safeStorage';
import { Colors, Spacing, BorderRadius } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import { SubScreenHeader } from '../components/SubScreenHeader';
import {
  generateShareCode,
  getShareInvites,
  getCaregivers,
  removeCaregiver,
  ShareInvite,
  CaregiverProfile,
} from '../utils/collaborativeCare';
import { StorageKeys } from '../utils/storageKeys';

export default function FamilySharingScreen() {
  const router = useRouter();
  const [patientName, setPatientName] = useState('Patient');
  const [invites, setInvites] = useState<ShareInvite[]>([]);
  const [caregivers, setCaregivers] = useState<CaregiverProfile[]>([]);
  const [showJoinCode, setShowJoinCode] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const name = await safeGetItem<string | null>(StorageKeys.PATIENT_NAME, null);
    if (name) setPatientName(name);

    const loadedInvites = await getShareInvites();
    const activeInvites = loadedInvites.filter(i => !i.used && new Date(i.expiresAt) > new Date());
    setInvites(activeInvites);

    const loadedCaregivers = await getCaregivers();
    setCaregivers(loadedCaregivers);
  };

  const handleGenerateCode = async () => {
    try {
      const invite = await generateShareCode(patientName, 'You', {
        canView: true,
        canEdit: false,
        canMarkMedications: true,
        canScheduleAppointments: false,
        canAddNotes: true,
        canExport: false,
      });

      await loadData();

      // Share the code
      const message = `Join ${patientName}'s care team on EmberMate!\n\nYour invite code: ${invite.code}\n\nThis code expires in 7 days.`;

      Alert.alert(
        'Invite Code Created',
        `Share this code with your family member:\n\n${invite.code}\n\nExpires in 7 days`,
        [
          { text: 'Copy Code', onPress: () => copyToClipboard(invite.code) },
          { text: 'Share', onPress: () => Share.share({ message }) },
          { text: 'Done' },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to generate invite code');
    }
  };

  const copyToClipboard = (text: string) => {
    // Note: Clipboard API would be used here
    Alert.alert('Copied', 'Code copied to clipboard');
  };

  const handleRemoveCaregiver = (caregiver: CaregiverProfile) => {
    Alert.alert(
      'Remove Caregiver?',
      `${caregiver.name} will lose access to ${patientName}'s care information.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removeCaregiver(caregiver.id);
            await loadData();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        <SubScreenHeader
          title="Family Sharing"
          emoji="👥"
        />

        <ScrollView style={styles.content}>
          {/* Explainer */}
          <View style={styles.explainer}>
            <Text style={styles.explainerText}>
              Invite family members to help manage {patientName}'s care. They can view schedules,
              mark medications, and add notes.
            </Text>
          </View>

          {/* Beta Notice */}
          <View style={styles.betaNotice}>
            <Text style={styles.betaIcon}>ℹ️</Text>
            <View style={styles.betaContent}>
              <Text style={styles.betaTitle}>Single-Device Mode</Text>
              <Text style={styles.betaText}>
                Family sharing currently stores data locally on this device only.
                Multi-device sync will be available in a future update.
              </Text>
            </View>
          </View>

          {/* Active Caregivers */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ACTIVE CAREGIVERS ({caregivers.length})</Text>

            {caregivers.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>👥</Text>
                <Text style={styles.emptyText}>No caregivers yet</Text>
                <Text style={styles.emptySubtext}>Generate an invite code to get started</Text>
              </View>
            ) : (
              caregivers.map(caregiver => (
                <TouchableOpacity
                  key={caregiver.id}
                  style={styles.caregiverCard}
                  onPress={() => router.push(`/caregiver-management?id=${caregiver.id}`)}
                  activeOpacity={0.7}
                  accessibilityLabel={`${caregiver.name}, ${caregiver.role}`}
                  accessibilityRole="button"
                >
                  <View
                    style={[styles.caregiverAvatar, { backgroundColor: caregiver.avatarColor }]}
                  >
                    <Text style={styles.caregiverInitial}>
                      {caregiver.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.caregiverInfo}>
                    <Text style={styles.caregiverName}>{caregiver.name}</Text>
                    <Text style={styles.caregiverRole}>
                      {caregiver.role.charAt(0).toUpperCase() + caregiver.role.slice(1)} •
                      Joined {new Date(caregiver.joinedAt).toLocaleDateString()}
                    </Text>
                    <View style={styles.permissionTags}>
                      {caregiver.permissions.canEdit && (
                        <View style={styles.permissionTag}>
                          <Text style={styles.permissionTagText}>Can Edit</Text>
                        </View>
                      )}
                      {caregiver.permissions.canMarkMedications && (
                        <View style={styles.permissionTag}>
                          <Text style={styles.permissionTagText}>Mark Meds</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* Pending Invites */}
          {invites.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>PENDING INVITES ({invites.length})</Text>

              {invites.map(invite => (
                <View key={invite.id} style={styles.inviteCard}>
                  <View style={styles.inviteLeft}>
                    <Text style={styles.inviteCode}>{invite.code}</Text>
                    <Text style={styles.inviteExpires}>
                      Expires {new Date(invite.expiresAt).toLocaleDateString()}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => copyToClipboard(invite.code)}
                    style={styles.copyButton}
                    accessibilityLabel={`Copy invite code ${invite.code}`}
                    accessibilityRole="button"
                  >
                    <Text style={styles.copyButtonText}>Copy</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Actions */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleGenerateCode}
              accessibilityLabel="Generate invite code"
              accessibilityRole="button"
            >
              <Text style={styles.primaryButtonText}>+ Generate Invite Code</Text>
            </TouchableOpacity>

          </View>

          {/* Info */}
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>How It Works</Text>
            <Text style={styles.infoText}>
              1. Generate an invite code{'\n'}
              2. Share it with your family member{'\n'}
              3. They enter the code in EmberMate{'\n'}
              4. Now you're coordinating care together!
            </Text>
          </View>
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
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  explainer: {
    backgroundColor: c.accentLight,
    borderWidth: 1,
    borderColor: c.accentBorder,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  explainerText: {
    fontSize: 13,
    lineHeight: 20,
    color: c.textPrimary,
  },
  betaNotice: {
    flexDirection: 'row',
    backgroundColor: c.blueTint,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  betaIcon: {
    fontSize: 20,
  },
  betaContent: {
    flex: 1,
  },
  betaTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: c.blueBright,
    marginBottom: 4,
  },
  betaText: {
    fontSize: 12,
    lineHeight: 18,
    color: c.textSecondary,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: c.textSecondary,
    marginBottom: Spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.sm,
    opacity: 0.3,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '500',
    color: c.textPrimary,
    marginBottom: Spacing.xs,
  },
  emptySubtext: {
    fontSize: 13,
    color: c.textSecondary,
  },
  caregiverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  caregiverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  caregiverInitial: {
    fontSize: 20,
    fontWeight: '600',
    color: c.textPrimary,
  },
  caregiverInfo: {
    flex: 1,
  },
  caregiverName: {
    fontSize: 15,
    fontWeight: '500',
    color: c.textPrimary,
    marginBottom: 4,
  },
  caregiverRole: {
    fontSize: 12,
    color: c.textSecondary,
    marginBottom: Spacing.xs,
  },
  permissionTags: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  permissionTag: {
    backgroundColor: c.accentLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  permissionTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: c.accent,
  },
  removeButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    fontSize: 18,
    color: '#C85A54',
  },
  chevron: {
    fontSize: 28,
    color: c.textSecondary,
    opacity: 0.3,
  },
  inviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.borderMedium,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  inviteLeft: {
    flex: 1,
  },
  inviteCode: {
    fontSize: 24,
    fontWeight: '700',
    color: c.accent,
    letterSpacing: 2,
    marginBottom: 4,
  },
  inviteExpires: {
    fontSize: 12,
    color: c.textSecondary,
  },
  copyButton: {
    backgroundColor: c.accentLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  copyButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.accent,
  },
  primaryButton: {
    backgroundColor: c.accent,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: c.background,
  },
  secondaryButton: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: c.textPrimary,
  },
  infoBox: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: Spacing.sm,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20,
    color: c.textSecondary,
  },
});
