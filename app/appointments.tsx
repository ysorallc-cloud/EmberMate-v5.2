// ============================================================================
// APPOINTMENTS SCREEN - Simplified List View
// Clean list of upcoming appointments
// ============================================================================

import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import { navigate } from '../lib/navigate';
import { getUpcomingAppointments, Appointment } from '../utils/appointmentStorage';
import { logError } from '../utils/devLog';

export default function AppointmentsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const loadData = async () => {
    try {
      const appts = await getUpcomingAppointments();
      setAppointments(appts);
    } catch (error) {
      logError('AppointmentsScreen.loadData', error);
    }
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${hour % 12 || 12}:${minutes} ${ampm}`;
  };

  const getDateParts = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    return { day, month };
  };

  const upcomingAppts = appointments.filter(a => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const apptDate = new Date(a.date);
    apptDate.setHours(0, 0, 0, 0);
    return apptDate >= now;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd]} style={styles.gradient}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
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
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigate('/appointment-form')}
              accessibilityLabel="Add new appointment"
              accessibilityRole="button"
            >
              <Text style={styles.addIcon}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Title Section */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>Appointments</Text>
            <Text style={styles.subtitle}>{upcomingAppts.length} upcoming</Text>
          </View>

          {/* Appointment Cards */}
          {upcomingAppts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyTitle}>No appointments scheduled</Text>
              <Text style={styles.emptySubtitle}>Tap + to add</Text>
            </View>
          ) : (
            upcomingAppts.map((appt) => {
              const { day, month } = getDateParts(appt.date);
              return (
                <TouchableOpacity
                  key={appt.id}
                  style={styles.appointmentCard}
                  onPress={() => navigate(`/appointment-form?id=${appt.id}`)}
                  accessibilityLabel={`${appt.specialty} appointment with ${appt.provider} on ${month} ${day} at ${formatTime(appt.time)}, ${appt.location}`}
                  accessibilityRole="button"
                >
                  <View style={styles.dateBlock}>
                    <Text style={styles.dateDay}>{day}</Text>
                    <Text style={styles.dateMonth}>{month}</Text>
                  </View>

                  <View style={styles.details}>
                    <Text style={styles.appointmentType}>{appt.specialty}</Text>
                    <Text style={styles.providerTime}>
                      {appt.provider} • {formatTime(appt.time)}
                    </Text>
                    <Text style={styles.location}>{appt.location}</Text>
                  </View>

                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              );
            })
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
    backgroundColor: c.background
  },
  gradient: {
    flex: 1
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 24
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: '#0f1f1a',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: '#e8f0e8',
  },
  addButton: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(139, 168, 136, 0.9)',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIcon: {
    fontSize: 24,
    color: c.textPrimary,
  },

  // Title Section
  titleSection: {
    marginBottom: 28,
  },
  title: {
    fontFamily: 'Georgia',
    fontSize: 28,
    color: '#e8f0e8',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: c.textHalf,
  },

  // Appointment Card
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    backgroundColor: '#0f1f1a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 168, 136, 0.2)',
    marginBottom: 12,
  },
  dateBlock: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 168, 136, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDay: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e8f0e8',
  },
  dateMonth: {
    fontSize: 10,
    color: 'rgba(139, 168, 136, 0.9)',
  },
  details: {
    flex: 1,
  },
  appointmentType: {
    fontSize: 16,
    fontWeight: '500',
    color: '#e8f0e8',
    marginBottom: 4,
  },
  providerTime: {
    fontSize: 13,
    color: c.textTertiary,
    marginBottom: 2,
  },
  location: {
    fontSize: 12,
    color: c.textMuted,
  },
  chevron: {
    fontSize: 18,
    color: c.textHalf,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    borderWidth: 1,
    borderColor: 'rgba(139, 168, 136, 0.2)',
    borderRadius: 16,
    borderStyle: 'dashed',
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#e8f0e8',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: c.textHalf,
  },
});
