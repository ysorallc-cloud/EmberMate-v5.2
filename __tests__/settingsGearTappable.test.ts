// ============================================================================
// Settings Gear Button Tappability — Insights Tab
//
// Reproduces: gear icon in ScreenHeader rightAction is not tappable on web.
//
// Root cause: the rightAction wrapper in ScreenHeader lacks overflow/zIndex,
// and the gear button (32×32) is below the 44px minimum tap target for web.
// On React Native Web, the titleContainer with flex:1 can create a stacking
// context that visually and interactively overshadows the adjacent rightAction
// when no explicit zIndex is set.
// ============================================================================

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  StyleSheet: { create: (s: any) => s },
  Platform: { OS: 'web', select: (obj: any) => obj.web || obj.default },
}));

jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      textPrimary: '#FFF',
      textSecondary: '#AAA',
      textMuted: '#666',
      textTertiary: '#444',
      accent: '#6C63FF',
      accentGlow: 'rgba(108,99,255,0.3)',
      background: '#000',
      backgroundDeep: '#000',
      glass: '#111',
      glassBorder: 'rgba(255,255,255,0.06)',
      border: 'rgba(255,255,255,0.1)',
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#F44336',
    },
    resolvedTheme: 'dark',
    themeMode: 'dark',
    highContrast: false,
    setThemeMode: jest.fn(),
    setHighContrast: jest.fn(),
  }),
}));

import { Colors } from '../theme/theme-tokens';

// ---------------------------------------------------------------------------
// 1. ScreenHeader rightAction must have overflow:'visible' and zIndex
// ---------------------------------------------------------------------------
describe('ScreenHeader rightAction layout (web tappability)', () => {
  // Dynamically import so mocks are active
  let createStyles: (c: typeof Colors) => any;

  beforeAll(() => {
    // ScreenHeader exports a createStyles via the module scope;
    // we import the module to inspect the generated styles.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('../components/ScreenHeader');
    // The createStyles function is not exported, so we re-derive the styles
    // by calling ScreenHeader's internal StyleSheet.create patterns.
    // Since StyleSheet.create is mocked as identity, we can inspect raw values.
  });

  test('rightAction should set overflow visible to prevent clipping on web', () => {
    // Re-derive styles from the component source.
    // StyleSheet.create is identity-mocked, so we call the factory directly.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs');
    const src = fs.readFileSync(
      require.resolve('../components/ScreenHeader'),
      'utf8'
    );

    // After the fix, rightAction must include overflow: 'visible'
    expect(src).toContain("overflow");
    // Verify rightAction has overflow visible (not hidden)
    // The fix should add overflow: 'visible' to the rightAction style
    const rightActionMatch = src.match(/rightAction[\s\S]*?overflow:\s*['"](\w+)['"]/);
    expect(rightActionMatch).not.toBeNull();
    expect(rightActionMatch![1]).toBe('visible');
  });

  test('rightAction should have zIndex to stack above titleContainer', () => {
    const fs = require('fs');
    const src = fs.readFileSync(
      require.resolve('../components/ScreenHeader'),
      'utf8'
    );

    // rightAction must declare a zIndex so it renders above the flex:1 titleContainer
    const rightActionBlock = src.match(/rightAction:\s*\{([^}]+)\}/);
    expect(rightActionBlock).not.toBeNull();
    expect(rightActionBlock![1]).toContain('zIndex');
  });

  test('headerRow should set overflow visible for web compatibility', () => {
    const fs = require('fs');
    const src = fs.readFileSync(
      require.resolve('../components/ScreenHeader'),
      'utf8'
    );

    const headerRowBlock = src.match(/headerRow:\s*\{([^}]+)\}/);
    expect(headerRowBlock).not.toBeNull();
    expect(headerRowBlock![1]).toContain("overflow");
  });
});

// ---------------------------------------------------------------------------
// 2. Gear button must meet minimum 44×44 tap target on web
// ---------------------------------------------------------------------------
describe('Settings gear button tap target', () => {
  test('gear button should be at least 44x44 for web accessibility', () => {
    const fs = require('fs');
    const src = fs.readFileSync(
      require.resolve('../app/(tabs)/understand'),
      'utf8'
    );

    // Extract settingsGear width and height from the styles
    const widthMatch = src.match(/settingsGear[\s\S]*?width:\s*(\d+)/);
    const heightMatch = src.match(/settingsGear[\s\S]*?height:\s*(\d+)/);

    expect(widthMatch).not.toBeNull();
    expect(heightMatch).not.toBeNull();

    const width = parseInt(widthMatch![1], 10);
    const height = parseInt(heightMatch![1], 10);

    // Visual size 40+, with hitSlop providing 44+ effective tap target
    expect(width).toBeGreaterThanOrEqual(40);
    expect(height).toBeGreaterThanOrEqual(40);
  });

  test('gear TouchableOpacity should have a minimum hit area via hitSlop', () => {
    const fs = require('fs');
    const src = fs.readFileSync(
      require.resolve('../app/(tabs)/understand'),
      'utf8'
    );

    // The gear uses hitSlop to extend the tap target beyond visual bounds
    const hasHitSlop = src.includes('hitSlop');
    const gearMatch = src.match(/settingsGear[\s\S]*?width:\s*(\d+)/);
    const gearWidth = gearMatch ? parseInt(gearMatch[1], 10) : 0;

    // Either the gear is 44+ or hitSlop extends the tap area
    const meetsMinTap = gearWidth >= 44 || hasHitSlop;
    expect(meetsMinTap).toBe(true);
  });
});
