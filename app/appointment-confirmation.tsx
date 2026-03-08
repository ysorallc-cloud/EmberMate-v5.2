// ============================================================================
// APPOINTMENT CONFIRMATION SCREEN
// Success feedback after saving appointment
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Colors } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';

export default function AppointmentConfirmation() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Extract appointment details from params
  const { date, time, provider, location, type, specialty } = params;

  // Parse date to get day and month
  const getDateParts = () => {
    if (!date || typeof date !== 'string') return { day: '', month: '' };

    // Handle formatted date like "Jan 15, 2026"
    const parts = date.split(' ');
    if (parts.length >= 2) {
      const month = parts[0].toUpperCase();
      const day = parts[1].replace(',', '');
      return { day, month };
    }

    return { day: '', month: '' };
  };

  const { day, month } = getDateParts();

  return (
    <View style={styles.container}>
      {/* Success Icon */}
      <View style={styles.successIcon}>
        <Text style={styles.checkmark}>✓</Text>
      </View>

      <Text style={styles.title}>Appointment saved</Text>
      <Text style={styles.subtitle}>Added to your calendar</Text>

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.dateBlock}>
          <Text style={styles.dateDay}>{day}</Text>
          <Text style={styles.dateMonth}>{month}</Text>
        </View>
        <View style={styles.details}>
          <Text style={styles.provider}>{provider || specialty}</Text>
          <Text style={styles.meta}>
            {time} • {location}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => router.replace('/appointments')}
        accessibilityLabel="View all appointments"
        accessibilityRole="button"
      >
        <Text style={styles.primaryButtonText}>View all appointments</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => router.replace('/appointment-form')}
        accessibilityLabel="Add another appointment"
        accessibilityRole="button"
      >
        <Text style={styles.secondaryButtonText}>+ Add another</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1612',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(139, 168, 136, 0.1)',
    borderWidth: 3,
    borderColor: '#34d399',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  checkmark: {
    fontSize: 36,
    color: '#34d399',
  },
  title: {
    fontFamily: 'Georgia',
    fontSize: 24,
    color: '#e8f0e8',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: c.textHalf,
    marginBottom: 32,
  },
  summaryCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    backgroundColor: '#0f1f1a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 168, 136, 0.2)',
    marginBottom: 32,
  },
  dateBlock: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: 'rgba(139, 168, 136, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDay: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e8f0e8',
  },
  dateMonth: {
    fontSize: 9,
    color: 'rgba(139, 168, 136, 0.9)',
  },
  details: {
    flex: 1,
  },
  provider: {
    fontSize: 15,
    fontWeight: '500',
    color: '#e8f0e8',
    marginBottom: 4,
  },
  meta: {
    fontSize: 13,
    color: c.textHalf,
  },
  primaryButton: {
    width: '100%',
    padding: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(139, 168, 136, 0.9)',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textPrimary,
  },
  secondaryButton: {
    width: '100%',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(139, 168, 136, 0.2)',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    color: c.textHalf,
  },
});
