// ============================================================================
// EMERGENCY CONTACTS SCREEN
// Quick access to care team contacts with Emergency Mode for 1-tap calling
// ============================================================================

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Linking, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import { getCareTeam, CareTeamMember } from '../utils/careTeamStorage';
import { getEmergencyNumber } from '../utils/emergencyContacts';
import { logError } from '../utils/devLog';

export default function EmergencyScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const [careTeam, setCareTeam] = useState<CareTeamMember[]>([]);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [emergencyNumber, setEmergencyNumber] = useState('911');

  useEffect(() => {
    setEmergencyNumber(getEmergencyNumber());
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    try {
      const team = await getCareTeam();
      setCareTeam(team);
    } catch (error) {
      logError('EmergencyScreen.loadData', error);
    }
  };

  const handleCall = (phone: string | undefined, name: string) => {
    if (!phone) return;

    // In emergency mode, call immediately without confirmation
    if (emergencyMode) {
      Linking.openURL(`tel:${phone}`);
      return;
    }

    Alert.alert(
      `Call ${name}?`,
      phone,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call', onPress: () => Linking.openURL(`tel:${phone}`) },
      ]
    );
  };

  const handleCallEmergency = () => {
    // In emergency mode, call immediately
    if (emergencyMode) {
      Linking.openURL(`tel:${emergencyNumber}`);
      return;
    }

    Alert.alert(
      `Call ${emergencyNumber}?`,
      'This will dial emergency services.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: `Call ${emergencyNumber}`, style: 'destructive', onPress: () => Linking.openURL(`tel:${emergencyNumber}`) },
      ]
    );
  };

  const handleShareLocation = async () => {
    // Open device's maps app which can then share location
    Alert.alert(
      'Share Location',
      'Opening Maps to share your current location...',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Maps',
          onPress: () => {
            // Try to open maps with current location
            const scheme = Platform.select({
              ios: 'maps:0,0?q=',
              android: 'geo:0,0?q='
            });
            const url = Platform.select({
              ios: 'maps:0,0',
              android: 'geo:0,0'
            });
            Linking.openURL(url || 'maps:0,0');
          },
        },
      ]
    );
  };

  const handleViewMedicalInfo = () => {
    router.push('/patient');
  };

  const toggleEmergencyMode = () => {
    if (!emergencyMode) {
      Alert.alert(
        'Enable Emergency Mode?',
        `In Emergency Mode:\n\n• Tap any contact to call instantly (no confirmation)\n• ${emergencyNumber} calls are immediate\n• Location sharing is quick access\n\nEnable for true emergencies only.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Enable', style: 'destructive', onPress: () => setEmergencyMode(true) },
        ]
      );
    } else {
      setEmergencyMode(false);
    }
  };

  const emergencyContacts = careTeam.filter(c => c.isEmergencyContact);
  const otherContacts = careTeam.filter(c => !c.isEmergencyContact);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd]} style={styles.gradient}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/today')} accessibilityLabel="Go back" accessibilityRole="button">
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerLabel}>EMERGENCY</Text>
            <View style={styles.placeholder} />
          </View>

          <Text style={styles.title}>Emergency Contacts</Text>

          {/* Emergency Mode Toggle */}
          {!emergencyMode ? (
            <TouchableOpacity
              style={styles.emergencyModeButton}
              onPress={toggleEmergencyMode}
              activeOpacity={0.8}
              accessibilityLabel="Enable emergency mode"
              accessibilityRole="button"
            >
              <Text style={styles.emergencyModeIcon}>🚨</Text>
              <Text style={styles.emergencyModeText}>Enable Emergency Mode</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.emergencyModeActive}>
              <View style={styles.emergencyModeActiveHeader}>
                <View>
                  <Text style={styles.emergencyModeActiveTitle}>🚨 EMERGENCY MODE ACTIVE</Text>
                  <Text style={styles.emergencyModeActiveSubtitle}>
                    Tap contacts to call instantly (no confirmation)
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.exitEmergencyButton}
                  onPress={toggleEmergencyMode}
                  accessibilityLabel="Exit emergency mode"
                  accessibilityRole="button"
                >
                  <Text style={styles.exitEmergencyText}>Exit</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Emergency Call Button */}
          <TouchableOpacity
            style={[styles.emergencyButton, emergencyMode && styles.emergencyButtonActive]}
            onPress={handleCallEmergency}
            activeOpacity={0.8}
            accessibilityLabel={`Call ${emergencyNumber} emergency services`}
            accessibilityRole="button"
          >
            <Ionicons name="call" size={28} color={colors.textPrimary} />
            <View style={styles.emergencyButtonText}>
              <Text style={styles.emergencyButtonTitle}>Call {emergencyNumber}</Text>
              <Text style={styles.emergencyButtonSubtitle}>Emergency Services</Text>
            </View>
            {emergencyMode && (
              <View style={styles.oneTapBadge}>
                <Text style={styles.oneTapBadgeText}>1-TAP</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Quick Actions (Location & Medical Info) */}
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={handleShareLocation}
              activeOpacity={0.7}
              accessibilityLabel="Share location"
              accessibilityRole="button"
            >
              <Text style={styles.quickActionIcon}>📍</Text>
              <Text style={styles.quickActionLabel}>Share Location</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={handleViewMedicalInfo}
              activeOpacity={0.7}
              accessibilityLabel="View medical info"
              accessibilityRole="button"
            >
              <Text style={styles.quickActionIcon}>🩺</Text>
              <Text style={styles.quickActionLabel}>Medical Info</Text>
            </TouchableOpacity>
          </View>

          {/* Emergency Contacts */}
          {emergencyContacts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>PRIMARY CONTACTS</Text>
              {emergencyContacts.map(contact => (
                <TouchableOpacity
                  key={contact.id}
                  style={[
                    styles.contactCard,
                    emergencyMode && styles.contactCardEmergency
                  ]}
                  onPress={() => handleCall(contact.phone, contact.name)}
                  activeOpacity={0.7}
                  accessibilityLabel={`Call ${contact.name}, ${contact.role}`}
                  accessibilityRole="button"
                >
                  <View style={styles.contactIcon}>
                    <Text style={styles.contactInitials}>
                      {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </Text>
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Text style={styles.contactRole}>{contact.role}</Text>
                    <Text style={styles.contactPhone}>{contact.phone}</Text>
                  </View>
                  <Ionicons
                    name="call"
                    size={22}
                    color={emergencyMode ? colors.error : colors.accent}
                  />
                  {emergencyMode && (
                    <View style={styles.noConfirmBadge}>
                      <Text style={styles.noConfirmText}>NO CONFIRM</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Care Team */}
          {otherContacts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>CARE TEAM</Text>
              {otherContacts.map(contact => (
                <TouchableOpacity
                  key={contact.id}
                  style={[
                    styles.contactCard,
                    emergencyMode && styles.contactCardEmergency
                  ]}
                  onPress={() => handleCall(contact.phone, contact.name)}
                  activeOpacity={0.7}
                  accessibilityLabel={`Call ${contact.name}, ${contact.role}`}
                  accessibilityRole="button"
                >
                  <View style={[styles.contactIcon, styles.contactIconSecondary]}>
                    <Text style={styles.contactInitials}>
                      {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </Text>
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Text style={styles.contactRole}>{contact.role}</Text>
                    <Text style={styles.contactPhone}>{contact.phone}</Text>
                  </View>
                  <Ionicons
                    name={emergencyMode ? "call" : "call-outline"}
                    size={22}
                    color={emergencyMode ? colors.error : colors.textSecondary}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}

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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'android' ? 20 : 0, paddingBottom: Spacing.md },
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

  // Emergency Mode Toggle
  emergencyModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: c.redMuted,
    borderWidth: 2,
    borderColor: c.error,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  emergencyModeIcon: {
    fontSize: 18,
  },
  emergencyModeText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.error,
  },
  emergencyModeActive: {
    backgroundColor: c.redStrong,
    borderWidth: 2,
    borderColor: c.error,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  emergencyModeActiveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emergencyModeActiveTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: c.error,
    marginBottom: 4,
  },
  emergencyModeActiveSubtitle: {
    fontSize: 12,
    color: '#fca5a5',
  },
  exitEmergencyButton: {
    backgroundColor: c.error,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  exitEmergencyText: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textPrimary,
  },

  // Emergency Call Button
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    backgroundColor: c.error,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  emergencyButtonActive: {
    shadowColor: c.error,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  emergencyButtonText: { flex: 1 },
  emergencyButtonTitle: { fontSize: 20, fontWeight: '600', color: c.textPrimary },
  emergencyButtonSubtitle: { fontSize: 14, color: c.textBright },
  oneTapBadge: {
    backgroundColor: c.textPlaceholder,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  oneTapBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textPrimary,
  },

  // Quick Actions
  quickActionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 12,
    color: c.textSecondary,
  },

  // Sections
  section: { marginBottom: Spacing.xl },
  sectionLabel: { fontSize: 11, color: c.textMuted, letterSpacing: 0.8, fontWeight: '600', marginBottom: Spacing.md },

  // Contact Cards
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    position: 'relative',
  },
  contactCardEmergency: {
    borderColor: c.error,
    shadowColor: c.error,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: c.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  contactIconSecondary: { backgroundColor: c.surfaceAlt },
  contactInitials: { fontSize: 16, fontWeight: '600', color: c.accent },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 16, color: c.textPrimary, fontWeight: '500', marginBottom: 2 },
  contactRole: { fontSize: 13, color: c.textSecondary, marginBottom: 2 },
  contactPhone: { fontSize: 13, color: c.accent },
  noConfirmBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: c.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  noConfirmText: {
    fontSize: 10,
    fontWeight: '600',
    color: c.textPrimary,
  },
});
