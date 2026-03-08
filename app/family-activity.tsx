// ============================================================================
// FAMILY ACTIVITY FEED
// See what caregivers are doing in real-time
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import { SubScreenHeader } from '../components/SubScreenHeader';
import {
  getCareActivities,
  formatActivityMessage,
  CareActivity,
} from '../utils/collaborativeCare';

export default function FamilyActivityScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const [activities, setActivities] = useState<CareActivity[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadActivities();
    }, [])
  );

  const loadActivities = async () => {
    const loaded = await getCareActivities(100);
    setActivities(loaded);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadActivities();
    setRefreshing(false);
  };

  const getActivityIcon = (type: CareActivity['type']): string => {
    switch (type) {
      case 'medication_taken': return '💊';
      case 'medication_missed': return '⚠️';
      case 'appointment_scheduled': return '📅';
      case 'appointment_completed': return '✅';
      case 'note_added': return '📝';
      case 'vital_logged': return '❤️';
      case 'symptom_logged': return '🤕';
      case 'photo_added': return '📷';
      case 'caregiver_joined': return '👥';
      default: return '📋';
    }
  };

  const getTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString();
  };

  const groupActivitiesByDate = () => {
    const groups: { [key: string]: CareActivity[] } = {};
    
    activities.forEach(activity => {
      const date = new Date(activity.timestamp);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let label: string;
      if (date.toDateString() === today.toDateString()) {
        label = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        label = 'Yesterday';
      } else {
        label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      
      if (!groups[label]) {
        groups[label] = [];
      }
      groups[label].push(activity);
    });
    
    return groups;
  };

  const groupedActivities = groupActivitiesByDate();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        <SubScreenHeader
          title="Activity Feed"
          emoji="📋"
        />

        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
            />
          }
        >
          {activities.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>No activity yet</Text>
              <Text style={styles.emptySubtext}>
                Activity will appear here as family members interact with the app
              </Text>
            </View>
          ) : (
            Object.entries(groupedActivities).map(([date, dateActivities]) => (
              <View key={date} style={styles.dateGroup}>
                <Text style={styles.dateLabel}>{date}</Text>
                
                {dateActivities.map((activity, index) => (
                  <View key={activity.id} style={styles.activityCard}>
                    <View style={styles.activityIconContainer}>
                      <Text style={styles.activityIcon}>
                        {getActivityIcon(activity.type)}
                      </Text>
                    </View>
                    
                    <View style={styles.activityContent}>
                      <Text style={styles.activityMessage}>
                        {formatActivityMessage(activity)}
                      </Text>
                      <Text style={styles.activityTime}>
                        {getTimeAgo(activity.timestamp)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ))
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Showing last {activities.length} activities
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: Spacing.md,
    opacity: 0.3,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: c.textPrimary,
    marginBottom: Spacing.xs,
  },
  emptySubtext: {
    fontSize: 14,
    color: c.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  dateGroup: {
    marginBottom: Spacing.xl,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: c.textSecondary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  activityCard: {
    flexDirection: 'row',
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  activityIcon: {
    fontSize: 20,
  },
  activityContent: {
    flex: 1,
    justifyContent: 'center',
  },
  activityMessage: {
    fontSize: 14,
    color: c.textPrimary,
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: c.textSecondary,
  },
  footer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: c.textSecondary,
  },
});
