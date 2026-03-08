// ============================================================================
// SETTINGS SCREEN - Reorganized with categories and search
// Infrastructure, not interface - Source of truth for Care Hub and daily tracking
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import Constants from 'expo-constants';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  TextInput,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { navigate, navigateReplace } from '../../lib/navigate';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../theme/theme-tokens';
import { safeGetItem, safeSetItem } from '../../utils/safeStorage';
import { useTheme, ThemeMode } from '../../contexts/ThemeContext';
import { SubScreenHeader } from '../../components/SubScreenHeader';
import { generateSampleCorrelationData, clearSampleCorrelationData, hasSampleData } from '../../utils/sampleDataGenerator';
import { StorageKeys } from '../../utils/storageKeys';
import { getMedications } from '../../utils/medicationStorage';
import { getAppointments, getUpcomingAppointments } from '../../utils/appointmentStorage';
import { getCaregivers } from '../../utils/collaborativeCare';
import { exportBackup, clearAllData } from '../../utils/cloudBackup';
import { deleteAllUserData } from '../../utils/privacyUtils';
import { AppStrings } from '../../constants/strings';
import { logError } from '../../utils/devLog';
import { checkFeatureAccess } from '../../utils/featureGate';

// Settings category definitions
interface SettingItem {
  id: string;
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
  color?: string;
}

interface SettingsCategory {
  id: string;
  icon: string;
  title: string;
  items: SettingItem[];
}

export default function SettingsScreen() {
  const router = useRouter();
  const { themeMode, setThemeMode, highContrast, setHighContrast, colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [patientName, setPatientName] = useState('');
  const [hasSample, setHasSample] = useState(false);
  const [lastModified, setLastModified] = useState<string>('');
  const [use24HourTime, setUse24HourTime] = useState(false);
  const [medicationCount, setMedicationCount] = useState(0);
  const [appointmentCount, setAppointmentCount] = useState(0);
  const [caregiverCount, setCaregiverCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({
    advanced: true, // Advanced collapsed by default
  });

  useEffect(() => {
    loadPatientName();
    checkSampleData();
    loadLastModified();
    loadTimePreference();
  }, []);

  // Reload counts when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadCounts();
    }, [])
  );

  const loadCounts = async () => {
    try {
      // Load medication count
      const meds = await getMedications();
      const activeMeds = meds.filter(m => m.active);
      setMedicationCount(activeMeds.length);

      // Load appointment count
      const upcomingAppts = await getUpcomingAppointments();
      setAppointmentCount(upcomingAppts.length);

      // Load caregiver count
      const caregivers = await getCaregivers();
      setCaregiverCount(caregivers.length);
    } catch (error) {
      logError('SettingsScreen.loadCounts', error);
    }
  };

  const loadLastModified = async () => {
    try {
      const timestamp = await safeGetItem<string | null>(StorageKeys.SETTINGS_MODIFIED, null);
      if (timestamp) {
        const date = new Date(timestamp);
        setLastModified(date.toLocaleDateString());
      }
    } catch (error) {
      logError('SettingsScreen.loadLastModified', error);
    }
  };

  const updateLastModified = async () => {
    try {
      await safeSetItem(StorageKeys.SETTINGS_MODIFIED, new Date().toISOString());
      await loadLastModified();
    } catch (error) {
      logError('SettingsScreen.updateLastModified', error);
    }
  };

  const loadTimePreference = async () => {
    try {
      const preference = await safeGetItem<string | null>(StorageKeys.USE_24_HOUR_TIME, null);
      setUse24HourTime(preference === 'true');
    } catch (error) {
      logError('SettingsScreen.loadTimePreference', error);
    }
  };

  const toggleTimeFormat = async () => {
    try {
      const newValue = !use24HourTime;
      setUse24HourTime(newValue);
      await safeSetItem(StorageKeys.USE_24_HOUR_TIME, newValue.toString());
      await updateLastModified();
    } catch (error) {
      logError('SettingsScreen.toggleTimeFormat', error);
    }
  };

  const checkSampleData = async () => {
    const exists = await hasSampleData();
    setHasSample(exists);
  };

  const loadPatientName = async () => {
    try {
      const name = await safeGetItem<string | null>(StorageKeys.PATIENT_NAME, null);
      if (name) setPatientName(name);
    } catch (error) {
      logError('SettingsScreen.loadPatientName', error);
    }
  };

  const handleGenerateSample = async () => {
    Alert.alert(
      'Generate Sample Data',
      'This creates test data for development. Your existing data won\'t be affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async () => {
            await generateSampleCorrelationData();
            await checkSampleData();
            Alert.alert('Done', 'Sample data created. Check Today and Insights tabs.');
          }
        }
      ]
    );
  };

  const handleBackupData = async () => {
    try {
      const success = await exportBackup();
      if (success) {
        Alert.alert(
          'Backup Complete',
          'Your data has been exported successfully. Save this file in a secure location.'
        );
      }
    } catch (error) {
      logError('SettingsScreen.handleBackupData', error);
      Alert.alert('Backup Failed', 'Could not create backup. Please try again.');
    }
  };

  const handleDeleteMyData = async () => {
    Alert.alert(
      'Delete My Data',
      'This permanently removes all your health data from this device, including medications, appointments, vitals, and patient information.\n\nThis cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All My Data',
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
                    try {
                      await deleteAllUserData();
                      Alert.alert('Data Deleted', 'All your data has been permanently removed from this device.', [
                        {
                          text: 'OK',
                          onPress: () => {
                            navigateReplace('/(onboarding)');
                          },
                        },
                      ]);
                    } catch {
                      Alert.alert('Error', 'Could not delete data. Please try again.');
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

  const handleClearSample = async () => {
    Alert.alert(
      'Clear Sample Data',
      'This removes test data only. Your real data stays intact.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearSampleCorrelationData();
            await checkSampleData();
            Alert.alert('Done', 'Sample data removed.');
          }
        }
      ]
    );
  };

  const handleResetOnboarding = async () => {
    Alert.alert(
      'Reset Onboarding',
      'This will show the welcome screens again the next time you open the app. Your data will not be affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(StorageKeys.ONBOARDING_COMPLETE);
              // Also clear sample data flag so re-onboarding can seed fresh
              await AsyncStorage.removeItem(StorageKeys.SAMPLE_DATA_INITIALIZED);
              Alert.alert(
                'Onboarding Reset',
                'The onboarding screens will appear when you reload the app.',
                [
                  {
                    text: 'Reload Now',
                    onPress: () => navigateReplace('/(onboarding)'),
                  },
                  {
                    text: 'Later',
                    style: 'cancel',
                  },
                ]
              );
            } catch (error) {
              logError('SettingsScreen.handleResetOnboarding', error);
              Alert.alert('Error', 'Could not reset onboarding. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleExportData = async () => {
    try {
      const medications = await getMedications();
      const appointments = await getAppointments();

      const exportData = {
        medications,
        appointments,
        exportDate: new Date().toISOString(),
        version: '1.0'
      };

      const jsonString = JSON.stringify(exportData, null, 2);

      await Share.share({
        message: jsonString,
        title: 'EmberMate Export'
      });
    } catch (error) {
      logError('SettingsScreen.handleExportData', error);
      Alert.alert('Error', 'Export failed. Please try again.');
    }
  };

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  // Define all settings organized into categories
  const categories: SettingsCategory[] = useMemo(() => [
    {
      id: 'profile',
      icon: '👤',
      title: 'Profile & Medical Info',
      items: [
        {
          id: 'care-plan',
          icon: '📋',
          title: 'Care Plan',
          subtitle: 'What to track daily',
          color: 'rgba(147, 197, 253, 0.14)',
          onPress: () => navigate('/care-plan'),
        },
        {
          id: 'patient',
          icon: '👤',
          title: 'Patient Information',
          subtitle: `${patientName || 'Patient'} • Medical history & allergies`,
          color: 'rgba(52, 211, 153, 0.14)',
          onPress: () => router.push('/patient'),
        },
        {
          id: 'medications',
          icon: '💊',
          title: 'Medications',
          subtitle: `${medicationCount} active`,
          color: 'rgba(52, 211, 153, 0.14)',
          onPress: () => router.push('/medications'),
        },
        {
          id: 'appointments',
          icon: '📅',
          title: 'Appointments',
          subtitle: `${appointmentCount} upcoming`,
          color: 'rgba(167, 139, 250, 0.14)',
          onPress: () => router.push('/appointments'),
        },
        {
          id: 'emergency',
          icon: '🚨',
          title: 'Emergency Contacts',
          subtitle: 'Quick dial contacts',
          color: 'rgba(248, 113, 113, 0.14)',
          onPress: () => router.push('/emergency'),
        },
        {
          id: 'vital-thresholds',
          icon: '📊',
          title: 'Vital Sign Ranges',
          subtitle: 'Custom alert thresholds',
          color: 'rgba(251, 191, 36, 0.14)',
          onPress: () => navigate('/vital-threshold-settings'),
        },
      ],
    },
    {
      id: 'appearance',
      icon: '🎨',
      title: 'Appearance & Experience',
      items: [
        {
          id: 'theme',
          icon: '🌙',
          title: 'Theme',
          subtitle: 'Dark',
          color: 'rgba(255, 255, 255, 0.07)',
          onPress: () => {
            // Light mode disabled — StyleSheet.create() at module scope captures
            // dark theme Colors at import time. 70+ screens show white text on
            // light background. Requires full migration to useTheme() hook.
            // System mode also broken when phone is in light mode.
            setThemeMode('dark');
          },
        },
        {
          id: 'high-contrast',
          icon: '🔲',
          title: 'High Contrast',
          subtitle: highContrast ? 'On — increased text and border contrast' : 'Off',
          color: 'rgba(255, 255, 255, 0.07)',
          onPress: () => setHighContrast(!highContrast),
        },
        {
          id: 'time-format',
          icon: '🕐',
          title: '24-Hour Time Format',
          subtitle: use24HourTime ? 'Currently using 24-hour format' : 'Currently using 12-hour format',
          color: 'rgba(255, 255, 255, 0.07)',
          onPress: toggleTimeFormat,
        },
      ],
    },
    {
      id: 'notifications',
      icon: '🔔',
      title: 'Notifications & Reminders',
      items: [
        {
          id: 'notification-settings',
          icon: '🔔',
          title: 'Notification Settings',
          subtitle: 'Sound, quiet hours, escalation',
          color: 'rgba(251, 191, 36, 0.14)',
          onPress: () => router.push('/notification-settings'),
        },
      ],
    },
    {
      id: 'careTeam',
      icon: '👥',
      title: 'Care Team',
      items: [
        {
          id: 'manage-caregivers',
          icon: '👤',
          title: 'Manage Caregivers',
          subtitle: `${caregiverCount} connected`,
          color: 'rgba(255, 255, 255, 0.07)',
          onPress: async () => {
            const result = await checkFeatureAccess('care_team');
            if (result.allowed) {
              router.push('/caregiver-management');
            } else {
              router.push('/upgrade');
            }
          },
        },
        {
          id: 'family-sharing',
          icon: '🔗',
          title: 'Family Sharing',
          subtitle: 'Invite & manage access',
          color: 'rgba(255, 255, 255, 0.07)',
          onPress: async () => {
            const result = await checkFeatureAccess('care_team');
            if (result.allowed) {
              router.push('/family-sharing');
            } else {
              router.push('/upgrade');
            }
          },
        },
        {
          id: 'care-team-activity',
          icon: '📋',
          title: 'Care Team Activity',
          subtitle: 'Recent caregiver actions',
          color: 'rgba(255, 255, 255, 0.07)',
          onPress: async () => {
            const result = await checkFeatureAccess('activity_feed');
            if (result.allowed) {
              router.push('/family-activity');
            } else {
              router.push('/upgrade');
            }
          },
        },
      ],
    },
    {
      id: 'privacy',
      icon: '🔒',
      title: 'Privacy & Data',
      items: [
        {
          id: 'security',
          icon: '🔒',
          title: 'Security Settings',
          subtitle: 'App lock, encryption, audit logs',
          color: 'rgba(255, 255, 255, 0.07)',
          onPress: () => router.push('/settings/security'),
        },
        {
          id: 'data-privacy',
          icon: '🛡️',
          title: 'Data & Privacy',
          subtitle: 'Sample data, retention, sharing controls',
          color: 'rgba(255, 255, 255, 0.07)',
          onPress: () => navigate('/data-privacy-settings'),
        },
        {
          id: 'backup',
          icon: '💾',
          title: 'Backup & Restore',
          subtitle: 'Back up before switching devices — data is local only',
          color: 'rgba(255, 255, 255, 0.07)',
          onPress: () => router.push('/settings/backup'),
        },
        {
          id: 'export-summary',
          icon: '📤',
          title: 'Export Summary',
          subtitle: 'Create care summary PDF',
          color: 'rgba(255, 255, 255, 0.07)',
          onPress: () => router.push('/care-report?scope=full'),
        },
        {
          id: 'delete-my-data',
          icon: '🗑️',
          title: 'Delete My Data',
          subtitle: 'Permanently remove all health data from this device',
          color: 'rgba(255, 255, 255, 0.07)',
          onPress: handleDeleteMyData,
          danger: true,
        },
      ],
    },
    {
      id: 'about',
      icon: 'ℹ️',
      title: 'About & Support',
      items: [
        {
          id: 'help-guides',
          icon: '❓',
          title: 'Help & Guides',
          subtitle: 'How to use EmberMate',
          color: 'rgba(255, 255, 255, 0.07)',
          onPress: () => router.push('/guide-hub'),
        },
        {
          id: 'privacy-policy',
          icon: '📄',
          title: 'Privacy Policy',
          subtitle: 'How we handle your data',
          color: 'rgba(255, 255, 255, 0.07)',
          onPress: () => Linking.openURL('https://ysorallc.org/privacy'),
        },
        {
          id: 'terms-of-service',
          icon: '📋',
          title: 'Terms of Service',
          subtitle: 'Usage terms and conditions',
          color: 'rgba(255, 255, 255, 0.07)',
          onPress: () => Linking.openURL('https://ysorallc.org/terms'),
        },
        {
          id: 'reset-onboarding',
          icon: '🔄',
          title: 'Reset Onboarding',
          subtitle: 'View welcome screens again',
          color: 'rgba(255, 255, 255, 0.07)',
          onPress: handleResetOnboarding,
        },
        {
          id: 'version',
          icon: 'ℹ️',
          title: 'Version',
          subtitle: Constants.expoConfig?.version ?? '5.8.0',
          color: 'rgba(255, 255, 255, 0.07)',
          onPress: () => {},
        },
      ],
    },
    {
      id: 'advanced',
      icon: '⚙️',
      title: 'Advanced',
      items: [],
    },
  ], [patientName, medicationCount, appointmentCount, caregiverCount, use24HourTime, hasSample]);

  // Filter settings based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;

    const query = searchQuery.toLowerCase();
    return categories
      .map(category => ({
        ...category,
        items: category.items.filter(
          item =>
            item.title.toLowerCase().includes(query) ||
            (item.subtitle && item.subtitle.toLowerCase().includes(query))
        ),
      }))
      .filter(category => category.items.length > 0);
  }, [categories, searchQuery]);

  const renderSettingItem = (item: SettingItem) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.settingItem, item.danger && styles.dangerItem]}
      onPress={item.onPress}
      activeOpacity={0.7}
      accessibilityLabel={`${item.title}${item.subtitle ? `, ${item.subtitle}` : ''}`}
      accessibilityRole="button"
    >
      <View style={[styles.settingIconWell, { backgroundColor: item.color ?? 'rgba(255,255,255,0.07)' }]}>
        <Text style={styles.settingIconEmoji}>{item.icon}</Text>
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, item.danger && styles.dangerText]}>
          {item.title}
        </Text>
        {item.subtitle && (
          <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
        )}
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );

  const renderCategory = (category: SettingsCategory) => {
    const isCollapsed = collapsedCategories[category.id];

    return (
      <View key={category.id} style={styles.categoryContainer}>
        <TouchableOpacity
          style={styles.categoryHeader}
          onPress={() => toggleCategory(category.id)}
          activeOpacity={0.7}
          accessibilityLabel={`${category.title}, ${category.items.length} settings, ${isCollapsed ? 'collapsed' : 'expanded'}`}
          accessibilityRole="button"
          accessibilityState={{ expanded: !isCollapsed }}
        >
          <Text style={styles.categoryIcon}>{category.icon}</Text>
          <View style={styles.categoryTitleContainer}>
            <Text style={styles.categoryTitle}>{category.title}</Text>
            <Text style={styles.categoryCount}>{category.items.length} settings</Text>
          </View>
          <Text style={styles.collapseIcon}>{isCollapsed ? '▶' : '▼'}</Text>
        </TouchableOpacity>

        {!isCollapsed && (
          <View style={styles.categoryItems}>
            {category.items.map(renderSettingItem)}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        <SubScreenHeader
          title="Settings"
          emoji="⚙️"
        />

        <ScrollView style={styles.content}>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="🔍 Search settings..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              accessibilityLabel="Search settings"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearSearch}
                onPress={() => setSearchQuery('')}
                accessibilityLabel="Clear search"
                accessibilityRole="button"
              >
                <Text style={styles.clearSearchText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Last Modified */}
          {lastModified && (
            <View style={styles.infoBanner}>
              <Text style={styles.infoBannerText}>Last updated: {lastModified}</Text>
            </View>
          )}

          {/* Search Results or Categories */}
          {searchQuery.trim() ? (
            <View style={styles.searchResults}>
              <Text style={styles.searchResultsTitle}>
                {filteredCategories.reduce((acc, cat) => acc + cat.items.length, 0)} results
              </Text>
              {filteredCategories.map(category =>
                category.items.map(renderSettingItem)
              )}
            </View>
          ) : (
            <>
              {categories.map(renderCategory)}
            </>
          )}

          {/* Health Disclaimer */}
          <View style={styles.disclaimerBanner} accessibilityRole="text">
            <Text style={styles.disclaimerIcon}>⚕️</Text>
            <Text style={styles.disclaimerText}>{AppStrings.disclaimer.short}</Text>
          </View>

          {/* App Footer */}
          <View style={styles.appFooter}>
            <Image
              source={require('../../assets/images/embermate-icon.png')}
              style={styles.appFooterIcon}
              accessibilityLabel="EmberMate"
            />
            <Text style={styles.appFooterName}>EmberMate</Text>
            <Text style={styles.appFooterVersion}>v{Constants.expoConfig?.version ?? '5.8.0'}</Text>
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    backgroundColor: c.surfaceElevated,
    borderWidth: 1,
    borderColor: c.glassActive,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: c.textPrimary,
    fontSize: 14,
  },
  clearSearch: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  clearSearchText: {
    fontSize: 14,
    color: c.textMuted,
  },
  searchResults: {
    marginBottom: 20,
  },
  searchResultsTitle: {
    fontSize: 12,
    color: c.textMuted,
    marginBottom: 12,
  },

  infoBanner: {
    backgroundColor: 'rgba(232, 155, 95, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(232, 155, 95, 0.15)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
  },
  infoBannerText: {
    fontSize: 12,
    color: c.textSecondary,
    textAlign: 'center',
  },

  // Categories
  categoryContainer: {
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  categoryIcon: {
    fontSize: 24,
  },
  categoryTitleContainer: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: c.textPrimary,
    marginBottom: 2,
  },
  categoryCount: {
    fontSize: 12,
    color: c.textMuted,
  },
  collapseIcon: {
    fontSize: 12,
    color: c.textMuted,
  },
  categoryItems: {
    borderTopWidth: 1,
    borderTopColor: c.border,
  },

  // Setting Items
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  settingIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  settingIconWell: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
    flexShrink: 0,
  },
  settingIconEmoji: {
    fontSize: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: c.textPrimary,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 12,
    color: c.textTertiary,
  },
  arrow: {
    fontSize: 16,
    color: c.textMuted,
  },

  dangerItem: {
    backgroundColor: c.redFaint,
  },
  dangerText: {
    color: c.error,
  },

  // Health Disclaimer
  disclaimerBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(232, 155, 95, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(232, 155, 95, 0.15)',
    borderRadius: 10,
    padding: 14,
    marginTop: 8,
    gap: 10,
  },
  disclaimerIcon: {
    fontSize: 16,
    marginTop: 1,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: c.textSecondary,
    lineHeight: 18,
  },
  appFooter: {
    alignItems: 'center',
    marginTop: 24,
    paddingBottom: 8,
  },
  appFooterIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    marginBottom: 8,
  },
  appFooterName: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textSecondary,
    marginBottom: 2,
  },
  appFooterVersion: {
    fontSize: 12,
    color: c.textMuted,
  },

  // Toggle (for time format)
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: c.glassActive,
    borderWidth: 2,
    borderColor: c.border,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: c.accent,
    borderColor: c.accent,
  },
  toggleDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: c.textTertiary,
  },
  toggleDotActive: {
    backgroundColor: c.background,
    alignSelf: 'flex-end',
  },
});
