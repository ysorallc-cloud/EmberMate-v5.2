// ============================================================================
// BACK BUTTON - Standardized Navigation Component
// Provides consistent styling and safe fallback navigation
// ============================================================================

import React, { useCallback, useMemo } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  AccessibilityProps,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { navigateReplace } from '../../lib/navigate';
import { Colors, Spacing } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';

// ============================================================================
// TYPES
// ============================================================================

export interface BackButtonProps {
  /**
   * Display variant:
   * - 'icon': Shows only the ← arrow (default, most common)
   * - 'text': Shows "← Back" with text label
   */
  variant?: 'icon' | 'text';

  /**
   * Custom back handler. If provided, overrides default navigation.
   * Useful for screens that need to save state before navigating.
   */
  onPress?: () => void;

  /**
   * Fallback route if router.back() would exit the app.
   * Defaults to '/(tabs)/home' (the home screen).
   */
  fallbackRoute?: string;

  /**
   * Custom accessibility label.
   * Defaults to "Go back" or "Back".
   */
  accessibilityLabel?: string;

  /**
   * Style override for the container.
   */
  style?: object;

  /**
   * Whether the button is disabled.
   */
  disabled?: boolean;
}

// ============================================================================
// SAFE NAVIGATION LOGIC
// ============================================================================

/**
 * Routes that are considered "root" routes where back should fallback
 * instead of potentially exiting the app.
 */
const ROOT_ROUTES = new Set([
  '/(tabs)/home',
  '/(tabs)/log',
  '/(tabs)/timeline',
  '/(tabs)/plan',
  '/(tabs)/family',
  '/(tabs)/support',
  '/settings',
  '/care-plan',
]);

/**
 * Default fallback route when back navigation isn't safe.
 */
const DEFAULT_FALLBACK = '/(tabs)/home';

// ============================================================================
// COMPONENT
// ============================================================================

export function BackButton({
  variant = 'icon',
  onPress,
  fallbackRoute = DEFAULT_FALLBACK,
  accessibilityLabel,
  style,
  disabled = false,
}: BackButtonProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const router = useRouter();
  const pathname = usePathname();

  const handlePress = useCallback(() => {
    // If custom handler provided, use it
    if (onPress) {
      onPress();
      return;
    }

    // Check if we're at a root route where back might exit the app
    const isAtRoot = ROOT_ROUTES.has(pathname);

    if (isAtRoot) {
      // At a root route - use fallback instead of back
      navigateReplace(fallbackRoute);
    } else {
      // Try to go back, with fallback if needed
      // On web, router.canGoBack() is unreliable.
      // Try browser history first, fall back to router, then replace.
      try {
        if (typeof window !== 'undefined' && window.history?.length > 1) {
          router.back();
        } else if (router.canGoBack && typeof router.canGoBack === 'function' && router.canGoBack()) {
          router.back();
        } else {
          navigateReplace(fallbackRoute);
        }
      } catch {
        navigateReplace(fallbackRoute);
      }
    }
  }, [onPress, pathname, router, fallbackRoute]);

  const a11yLabel = accessibilityLabel || (variant === 'text' ? 'Back' : 'Go back');

  if (variant === 'text') {
    return (
      <TouchableOpacity
        style={[styles.textButton, style]}
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.7}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        accessibilityHint="Navigate to previous screen"
      >
        <Text style={[styles.textLabel, disabled && styles.disabled]}>← Back</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.iconButton, style, disabled && styles.iconButtonDisabled]}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint="Navigate to previous screen"
    >
      <Text style={[styles.icon, disabled && styles.disabled]}>←</Text>
    </TouchableOpacity>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const createStyles = (c: typeof Colors) => StyleSheet.create({
  // Icon-only variant (most common)
  iconButton: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonDisabled: {
    opacity: 0.5,
  },
  icon: {
    fontSize: 16,
    color: c.textPrimary,
  },

  // Text variant
  textButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  textLabel: {
    fontSize: 14,
    color: c.accent,
    fontWeight: '500',
  },

  // Disabled state
  disabled: {
    opacity: 0.5,
  },
});

// ============================================================================
// EXPORTS
// ============================================================================

export default BackButton;
