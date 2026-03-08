// ============================================================================
// EMBERMATE HIGH CONTRAST THEME OVERRIDES
// Partial overrides applied on top of dark or light theme tokens
// Pure black/white backgrounds, max luminance accent, higher text contrast
// NOTE: Not a route - utility file only
// ============================================================================

export default null;

/** Dark high-contrast overrides */
export const HighContrastDarkOverrides = {
  background: '#000000',
  backgroundAlt: '#0A0A0A',
  backgroundDark: '#000000',
  backgroundDeep: '#050505',
  backgroundElevated: '#111111',

  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.85)',
  textTertiary: 'rgba(255, 255, 255, 0.75)',
  textSoft: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.75)',
  textDisabled: 'rgba(255, 255, 255, 0.5)',
  textHalf: 'rgba(255, 255, 255, 0.7)',
  textPlaceholder: 'rgba(255, 255, 255, 0.65)',
  textBright: 'rgba(255, 255, 255, 0.95)',
  textAlmostFull: '#FFFFFF',
  textNearFull: '#FFFFFF',

  accent: '#2DD4BF',
  accentGradientStart: '#2DD4BF',
  accentGradientMid: '#14B8A6',
  accentGradientEnd: '#5EEAD4',

  border: 'rgba(255, 255, 255, 0.15)',
  borderLight: 'rgba(255, 255, 255, 0.1)',

  tabBarBackground: '#000000',
  tabBarBorder: 'rgba(45, 212, 191, 0.3)',
  menuSurface: '#111111',
};

/** Light high-contrast overrides */
export const HighContrastLightOverrides = {
  background: '#FFFFFF',
  backgroundAlt: '#F5F5F5',
  backgroundDark: '#E5E5E5',
  backgroundDeep: '#F5F5F5',
  backgroundElevated: '#FFFFFF',

  textPrimary: '#000000',
  textSecondary: '#1A1A1A',
  textTertiary: '#2D2D2D',
  textSoft: '#404040',
  textMuted: '#404040',
  textDisabled: '#737373',
  textHalf: '#404040',
  textPlaceholder: '#737373',
  textBright: '#0A0A0A',
  textAlmostFull: '#000000',
  textNearFull: '#000000',

  accent: '#0F766E',
  accentGradientStart: '#0F766E',
  accentGradientMid: '#0D6960',
  accentGradientEnd: '#0D9488',

  border: 'rgba(0, 0, 0, 0.15)',
  borderLight: 'rgba(0, 0, 0, 0.1)',

  tabBarBackground: '#FFFFFF',
  tabBarBorder: 'rgba(15, 118, 110, 0.3)',
  menuSurface: '#FFFFFF',
};
