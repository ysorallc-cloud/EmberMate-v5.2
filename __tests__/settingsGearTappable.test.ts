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
// 2. Settings gear removed from Insights (accessible via Settings screen)
// ---------------------------------------------------------------------------
describe('Settings gear removed from Insights', () => {
  test('no settingsGear style in understand.tsx', () => {
    const fs = require('fs');
    const src = fs.readFileSync(
      require.resolve('../app/(tabs)/understand'),
      'utf8'
    );
    expect(src).not.toContain('settingsGear');
  });
});
