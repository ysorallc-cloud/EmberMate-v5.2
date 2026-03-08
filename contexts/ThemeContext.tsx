// ============================================================================
// THEME CONTEXT
// Provides dynamic theming (dark/light/high-contrast) across the app
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';
import { Colors, _syncColors, getDarkColors } from '../theme/theme-tokens';
import { LightColors } from '../theme/light-tokens';
import { HighContrastDarkOverrides, HighContrastLightOverrides } from '../theme/high-contrast-tokens';
import { StorageKeys } from '../utils/storageKeys';

// ============================================================================
// TYPES
// ============================================================================

export type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeContextValue {
  /** The resolved color map (dark or light, with optional high-contrast overrides) */
  colors: typeof Colors;
  /** Current theme mode preference */
  themeMode: ThemeMode;
  /** The resolved theme (always 'dark' or 'light', never 'system') */
  resolvedTheme: 'dark' | 'light';
  /** Whether high contrast is enabled */
  highContrast: boolean;
  /** Update the theme mode */
  setThemeMode: (mode: ThemeMode) => void;
  /** Toggle high contrast on/off */
  setHighContrast: (enabled: boolean) => void;
}

const STORAGE_KEY = StorageKeys.THEME;
const HC_STORAGE_KEY = StorageKeys.HIGH_CONTRAST;

// ============================================================================
// CONTEXT
// ============================================================================

const ThemeContext = createContext<ThemeContextValue>({
  colors: Colors,
  themeMode: 'system',
  resolvedTheme: 'dark',
  highContrast: false,
  setThemeMode: () => {},
  setHighContrast: () => {},
});

// ============================================================================
// PROVIDER
// ============================================================================

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
  const [highContrast, setHighContrastState] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load saved preferences
  useEffect(() => {
    Promise.all([
      safeGetItem<string | null>(STORAGE_KEY, null),
      safeGetItem<string | null>(HC_STORAGE_KEY, null),
    ]).then(([themeValue, hcValue]) => {
      if (themeValue === 'dark' || themeValue === 'light' || themeValue === 'system') {
        setThemeModeState(themeValue);
      }
      // No saved preference → keep 'system' default
      if (hcValue === 'true') {
        setHighContrastState(true);
      }
      setLoaded(true);
    });
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    safeSetItem(STORAGE_KEY, mode);
  }, []);

  const setHighContrast = useCallback((enabled: boolean) => {
    setHighContrastState(enabled);
    safeSetItem(HC_STORAGE_KEY, enabled ? 'true' : 'false');
  }, []);

  // Resolve 'system' to actual theme
  const resolvedTheme: 'dark' | 'light' =
    themeMode === 'system'
      ? (systemScheme === 'light' ? 'light' : 'dark')
      : themeMode;

  // Build final colors: pick base theme, then overlay high-contrast if enabled
  const colors = useMemo(() => {
    const base = resolvedTheme === 'light'
      ? (LightColors as typeof Colors)
      : (getDarkColors() as typeof Colors);

    if (!highContrast) return base;

    const overrides = resolvedTheme === 'light'
      ? HighContrastLightOverrides
      : HighContrastDarkOverrides;

    return { ...base, ...overrides } as typeof Colors;
  }, [resolvedTheme, highContrast]);

  // Keep global Colors object in sync so files that read Colors.X at render
  // time (including static StyleSheet.create references) pick up updates.
  useEffect(() => {
    _syncColors(colors);
  }, [colors]);

  return (
    <ThemeContext.Provider value={{ colors, themeMode, resolvedTheme, highContrast, setThemeMode, setHighContrast }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useTheme() {
  return useContext(ThemeContext);
}
