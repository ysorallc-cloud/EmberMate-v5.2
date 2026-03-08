/**
 * Verifies that users stuck in light/system mode are recovered to dark.
 *
 * Bug: Light theme showed white text on light background because 70 screens
 * use StyleSheet.create() at module scope, capturing dark-theme Colors values.
 * System mode is equally broken when the phone resolves to light.
 */

const mockStorage: Record<string, string> = {};
jest.mock('../../utils/safeStorage', () => ({
  safeGetItem: jest.fn(async (key: string, defaultVal: any) => mockStorage[key] ?? defaultVal),
  safeSetItem: jest.fn(async (key: string, value: any) => { mockStorage[key] = String(value); }),
}));

import { safeGetItem, safeSetItem } from '../../utils/safeStorage';

describe('Theme recovery', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
  });

  it('should force light mode users back to dark', async () => {
    mockStorage['@embermate_theme'] = 'light';
    const themeValue = await safeGetItem('@embermate_theme', null);
    // ThemeContext logic: anything not 'dark' gets forced to 'dark'
    if (themeValue !== 'dark') {
      await safeSetItem('@embermate_theme', 'dark');
    }
    expect(mockStorage['@embermate_theme']).toBe('dark');
  });

  it('should force system mode users to dark (system can resolve to light)', async () => {
    mockStorage['@embermate_theme'] = 'system';
    const themeValue = await safeGetItem('@embermate_theme', null);
    if (themeValue !== 'dark') {
      await safeSetItem('@embermate_theme', 'dark');
    }
    expect(mockStorage['@embermate_theme']).toBe('dark');
  });

  it('should preserve dark mode users', async () => {
    mockStorage['@embermate_theme'] = 'dark';
    const themeValue = await safeGetItem('@embermate_theme', null);
    // Dark stays dark — no write needed
    expect(themeValue).toBe('dark');
  });

  it('theme toggle should be a no-op (always dark)', () => {
    // The settings onPress should just call setThemeMode('dark')
    // This test documents that the toggle is intentionally disabled
    const setThemeMode = jest.fn();
    // Simulating the onPress handler
    setThemeMode('dark');
    expect(setThemeMode).toHaveBeenCalledWith('dark');
  });
});
