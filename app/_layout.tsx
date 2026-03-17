// ============================================================================
// ROOT LAYOUT
// App shell with navigation structure
// ============================================================================

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, Platform, useWindowDimensions, AppState, AppStateStatus, TouchableOpacity } from 'react-native';
import { useEffect, useRef, useState, useCallback } from 'react';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';
import { requestNotificationPermissions } from '../utils/notificationService';
import { useNotificationHandler } from '../utils/useNotificationHandler';
import { runStartupSequence } from '../services/appStartup';
import { isBiometricEnabled, shouldLockSession, requireAuthentication, updateLastActivity, getAutoLockTimeout, getPINLockoutInfo, PINLockoutInfo } from '../utils/biometricAuth';
import { shouldShowIntegrityWarning } from '../utils/deviceIntegrity';
import { logError } from '../utils/devLog';
import ErrorBoundary from '../components/ErrorBoundary';
import { PatientProvider } from '../contexts/PatientContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '../theme/theme-tokens';
import { StorageKeys } from '../utils/storageKeys';
function WebContainer({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();

  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  // Responsive breakpoints - narrower for better readability
  const isSmallScreen = width <= 768;
  const isMediumScreen = width > 768 && width <= 1024;
  const isLargeScreen = width > 1024;

  // Calculate container width - much narrower for data readability
  let containerWidth = '100%';
  if (isSmallScreen) {
    containerWidth = '100%'; // Full width on mobile
  } else if (isMediumScreen) {
    containerWidth = '440px'; // Tablet - phone-like width
  } else {
    containerWidth = '480px'; // Desktop - comfortable phone-like width
  }

  return (
    <View style={styles.webOuter}>
      <View style={[
        styles.webInner,
        {
          width: containerWidth as any,
          maxWidth: isSmallScreen ? '100%' : 480,
        }
      ]}>
        {children}
      </View>
    </View>
  );
}

function RootLayout() {
  // Handle notification taps
  useNotificationHandler();
  const insets = useSafeAreaInsets();
  const notificationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [locked, setLocked] = useState(false);
  const [lockoutInfo, setLockoutInfo] = useState<PINLockoutInfo | null>(null);
  const [integrityWarning, setIntegrityWarning] = useState(false);
  const lockoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef(AppState.currentState);

  const checkSessionLock = useCallback(async () => {
    try {
      const enabled = await isBiometricEnabled();
      if (!enabled) return;
      const timeout = await getAutoLockTimeout();
      const stale = await shouldLockSession(timeout);
      if (stale) setLocked(true);
    } catch (err) {
      logError('RootLayout.checkSessionLock', err);
    }
  }, []);

  const refreshLockout = useCallback(async () => {
    const info = await getPINLockoutInfo();
    setLockoutInfo(info);
    // If locked, set a timer to refresh countdown
    if (info.locked && info.lockoutSeconds > 0) {
      lockoutTimerRef.current = setTimeout(() => refreshLockout(), 1000);
    }
  }, []);

  const handleUnlock = useCallback(async () => {
    const info = await getPINLockoutInfo();
    if (info.locked) {
      setLockoutInfo(info);
      return;
    }
    const success = await requireAuthentication();
    if (success) {
      setLockoutInfo(null);
      await updateLastActivity();
      setLocked(false);
    } else {
      await refreshLockout();
    }
  }, [refreshLockout]);

  useEffect(() => {
    // Orchestrated startup: error reporting → migrations → daily reset → cleanup
    runStartupSequence();

    // Check device integrity (jailbreak/root) — non-blocking warning
    shouldShowIntegrityWarning().then(async compromised => {
      if (compromised) {
        const dismissed = await safeGetItem<boolean>('@integrity_banner_dismissed', false);
        if (!dismissed) setIntegrityWarning(true);
      }
    });

    // Notification permissions handled separately (needs delay for UX)
    requestNotificationPermissionsOnStartup();

    // Track activity for session timeout + check lock on resume
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active' && appStateRef.current.match(/inactive|background/)) {
        checkSessionLock();
        updateLastActivity();
      }
      appStateRef.current = nextState;
    });

    // Cleanup timer and subscription on unmount
    return () => {
      subscription.remove();
      if (notificationTimerRef.current) {
        clearTimeout(notificationTimerRef.current);
        notificationTimerRef.current = null;
      }
      if (lockoutTimerRef.current) {
        clearTimeout(lockoutTimerRef.current);
        lockoutTimerRef.current = null;
      }
    };
  }, [checkSessionLock]);

  async function requestNotificationPermissionsOnStartup() {
    try {
      // Only request on first launch or if not yet requested
      const hasAskedBefore = await safeGetItem<string | null>(StorageKeys.NOTIFICATION_PERMISSIONS_ASKED, null);

      if (!hasAskedBefore) {
        // Wait a moment to let UI settle before showing permission dialog
        // Store ref for cleanup on unmount
        notificationTimerRef.current = setTimeout(async () => {
          await requestNotificationPermissions();
          await safeSetItem(StorageKeys.NOTIFICATION_PERMISSIONS_ASKED, 'true');
          notificationTimerRef.current = null;
        }, 1000);
      }
    } catch (error) {
      // Non-critical — permission dialog failure shouldn't crash the app
      if (__DEV__) console.error('Error requesting notification permissions:', error);
    }
  }

  if (locked) {
    const isLockedOut = lockoutInfo?.locked;
    return (
      <ErrorBoundary>
        <WebContainer>
          <StatusBar style="light" />
          <View style={styles.lockScreen}>
            <Text style={styles.lockIcon}>{'\uD83D\uDD12'}</Text>
            <Text style={styles.lockTitle}>EmberMate Locked</Text>
            <Text style={styles.lockSubtitle}>
              {isLockedOut
                ? `Too many attempts. Try again in ${lockoutInfo.lockoutSeconds}s`
                : 'Authenticate to continue'}
            </Text>
            {!isLockedOut && lockoutInfo && lockoutInfo.attemptsRemaining < 3 && (
              <Text style={styles.lockAttempts}>
                {lockoutInfo.attemptsRemaining} attempt{lockoutInfo.attemptsRemaining !== 1 ? 's' : ''} remaining
              </Text>
            )}
            <TouchableOpacity
              style={[styles.lockButton, isLockedOut && styles.lockButtonDisabled]}
              onPress={handleUnlock}
              disabled={isLockedOut}
              accessibilityRole="button"
            >
              <Text style={[styles.lockButtonText, isLockedOut && styles.lockButtonTextDisabled]}>
                {isLockedOut ? 'Locked Out' : 'Unlock'}
              </Text>
            </TouchableOpacity>
          </View>
        </WebContainer>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
      <WebContainer>
        <StatusBar style="light" />
        {integrityWarning && (
          <View style={[styles.integrityBanner, { paddingTop: insets.top + 10 }]}>
            <Text style={styles.integrityText}>
              {'\u26A0\uFE0F'} This device may be jailbroken or rooted. Your health data could be at risk. Use a secure device for best protection.
            </Text>
            <TouchableOpacity onPress={() => { setIntegrityWarning(false); safeSetItem('@integrity_banner_dismissed', true); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.integrityDismiss}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}
        <PatientProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="calendar" options={{ presentation: 'modal' }} />
          <Stack.Screen name="medication-form" />
          <Stack.Screen name="medication-interactions" />
          <Stack.Screen name="medications" />
          <Stack.Screen name="appointment-form" />
          <Stack.Screen name="appointments" />
          <Stack.Screen name="emergency" />
          <Stack.Screen name="upgrade" options={{ presentation: 'modal' }} />
          <Stack.Screen name="log-meal" />
          <Stack.Screen name="log-morning-wellness" />
          <Stack.Screen name="log-evening-wellness" />
          <Stack.Screen name="care-report" />
          <Stack.Screen name="provider-prep" />
          <Stack.Screen name="family-sharing" />
          <Stack.Screen name="caregiver-management" />
          <Stack.Screen name="notification-settings" />
          <Stack.Screen name="care-plan" />
          <Stack.Screen name="log-medication-plan-item" />
          <Stack.Screen name="vital-threshold-settings" />
          <Stack.Screen name="patient" />
          <Stack.Screen name="data-privacy-settings" />
          <Stack.Screen name="correlation-report" />
          <Stack.Screen name="appointment-confirmation" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="medication-confirm" />
          <Stack.Screen name="quick-log" />
          <Stack.Screen name="insights" />
          <Stack.Screen name="guide-hub" />
          <Stack.Screen name="hub" />
        </Stack>
        </PatientProvider>
      </WebContainer>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  webOuter: {
    flex: 1,
    backgroundColor: Colors.backgroundDeep, // Match app background
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  webInner: {
    flex: 1,
    backgroundColor: Colors.background,
    boxShadow: '0px 0px 30px rgba(0, 0, 0, 0.4)',
    // Add border radius for larger screens
    borderRadius: 0,
  },
  webInnerConstrained: {
    // Legacy style - no longer used but kept for compatibility
    maxWidth: 480,
  },
  lockScreen: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  lockIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  lockTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.textBright,
    marginBottom: 8,
  },
  lockSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  lockButton: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  lockButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  lockAttempts: {
    fontSize: 13,
    color: Colors.amber ?? '#fbbf24',
    marginBottom: 12,
  },
  lockButtonDisabled: {
    backgroundColor: Colors.border ?? '#333',
    opacity: 0.6,
  },
  lockButtonTextDisabled: {
    color: Colors.textMuted ?? '#888',
  },
  integrityBanner: {
    backgroundColor: '#422006',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(251, 191, 36, 0.4)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  integrityText: {
    flex: 1,
    fontSize: 13,
    color: '#FDE68A',
    lineHeight: 18,
  },
  integrityDismiss: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#FCD34D',
  },
});

export default RootLayout;
