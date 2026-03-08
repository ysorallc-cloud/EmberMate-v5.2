// ============================================================================
// APP ENTRY POINT
// Handles onboarding gating (P1.1)
// ============================================================================

import { useEffect, useState, useMemo } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { Redirect } from 'expo-router';
import { isOnboardingComplete } from '../utils/sampleData';
import { logError } from '../utils/devLog';
import { Colors } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';

export default function Index() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = useState(true);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Set a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (loading) {
        logError('Index.checkOnboarding', 'Onboarding check timeout');
        setError('Loading is taking longer than expected');
        setLoading(false);
        // Default to onboarding screen on timeout
        setOnboardingDone(false);
      }
    }, 10000); // 10 second timeout

    checkOnboarding();

    return () => clearTimeout(timeout);
  }, []);

  async function checkOnboarding() {
    try {
      const complete = await isOnboardingComplete();
      setOnboardingDone(complete);
      setError(null);
    } catch (error) {
      logError('Index.checkOnboarding', error);
      setError('Failed to load app data');
      // Default to showing onboarding on error
      setOnboardingDone(false);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.accent} />
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
      </View>
    );
  }

  // P1.1: Route to onboarding if not complete, otherwise to Today
  if (onboardingDone) {
    return <Redirect href="/(tabs)/today" />;
  }

  return <Redirect href="/(onboarding)" />;
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: c.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 20,
    color: c.error || '#ff6b6b',
    fontSize: 14,
    textAlign: 'center',
  },
});
