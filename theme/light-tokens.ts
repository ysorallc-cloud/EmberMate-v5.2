// ============================================================================
// EMBERMATE WARM LINEN LIGHT THEME
// Rich linen background, opaque white cards, sage accents
// NOTE: Not a route - utility file only
// ============================================================================

export default null;

export const LightColors = {
  // Base — warm linen
  background: '#E8E4DE',
  backgroundAlt: '#E0DCD6',

  // Surfaces — OPAQUE white, not translucent. This is critical:
  // 148 components use static StyleSheet.create with these tokens.
  // Translucent white on linen = muddy off-white. Opaque = clean.
  glass: '#FFFFFF',
  glassHover: '#FFFFFF',
  glassBorder: 'rgba(0, 0, 0, 0.06)',
  glassActive: 'rgba(0, 0, 0, 0.08)',
  glassDim: '#F5F3EF',
  glassFaint: '#F5F3EF',
  glassSubtle: 'rgba(0, 0, 0, 0.07)',
  glassStrong: 'rgba(0, 0, 0, 0.12)',
  glassBold: 'rgba(0, 0, 0, 0.18)',

  // Surfaces — white cards
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceAlt: '#F5F3EF',
  surfaceHighlight: 'rgba(74, 107, 93, 0.08)',

  // Aurora Colors — warm washes
  auroraTeal: 'hsla(153, 18%, 85%, 0.5)',
  auroraPurple: 'hsla(30, 20%, 87%, 0.3)',
  auroraBlue: 'hsla(153, 15%, 87%, 0.3)',
  auroraViolet: 'hsla(30, 15%, 87%, 0.2)',
  auroraRose: 'hsla(30, 25%, 85%, 0.2)',

  // Primary Accent — sage green
  accent: '#4A6B5D',
  accentLight: 'rgba(74, 107, 93, 0.10)',
  accentBorder: 'rgba(74, 107, 93, 0.20)',
  accentGlow: 'rgba(74, 107, 93, 0.25)',
  accentFaint: 'rgba(74, 107, 93, 0.04)',
  accentTint: 'rgba(74, 107, 93, 0.05)',
  accentDim: 'rgba(74, 107, 93, 0.06)',
  accentHint: 'rgba(74, 107, 93, 0.10)',
  accentSubtle: 'rgba(74, 107, 93, 0.10)',
  accentMuted: 'rgba(74, 107, 93, 0.35)',
  accentGradientStart: '#4A6B5D',
  accentGradientMid: '#3D5A4E',
  accentGradientEnd: '#6B8F7E',

  // Semantic Colors
  green: '#3D7A5F',
  greenTint: 'rgba(61, 122, 95, 0.06)',
  greenLight: 'rgba(61, 122, 95, 0.08)',
  greenHint: 'rgba(61, 122, 95, 0.10)',
  greenMuted: 'rgba(61, 122, 95, 0.12)',
  greenBorder: 'rgba(61, 122, 95, 0.18)',
  greenStrong: 'rgba(61, 122, 95, 0.22)',
  greenGlow: 'rgba(61, 122, 95, 0.28)',

  amber: '#A16207',
  amberFaint: 'rgba(161, 98, 7, 0.05)',
  amberLight: 'rgba(161, 98, 7, 0.08)',
  amberHint: 'rgba(161, 98, 7, 0.10)',
  amberMuted: 'rgba(161, 98, 7, 0.12)',
  amberBorder: 'rgba(161, 98, 7, 0.18)',
  amberGlow: 'rgba(161, 98, 7, 0.25)',

  red: '#B91C1C',
  redFaint: 'rgba(185, 28, 28, 0.05)',
  redLight: 'rgba(185, 28, 28, 0.08)',
  redHint: 'rgba(185, 28, 28, 0.10)',
  redMuted: 'rgba(185, 28, 28, 0.12)',
  redBorder: 'rgba(185, 28, 28, 0.18)',
  redStrong: 'rgba(185, 28, 28, 0.22)',

  rose: '#9F1239',
  roseLight: 'rgba(159, 18, 57, 0.08)',
  roseBorder: 'rgba(159, 18, 57, 0.18)',

  purple: '#6D5A8A',
  purpleFaint: 'rgba(109, 90, 138, 0.05)',
  purpleMuted: 'rgba(109, 90, 138, 0.07)',
  purpleLight: 'rgba(109, 90, 138, 0.08)',
  purpleHint: 'rgba(109, 90, 138, 0.10)',
  purpleWash: 'rgba(109, 90, 138, 0.12)',
  purpleBorder: 'rgba(109, 90, 138, 0.18)',
  purpleStrong: 'rgba(109, 90, 138, 0.22)',
  purpleGlow: 'rgba(109, 90, 138, 0.28)',

  sky: '#3D7A8A',
  skyLight: 'rgba(61, 122, 138, 0.08)',
  skyBorder: 'rgba(61, 122, 138, 0.18)',

  gold: '#B8860B',
  goldLight: 'rgba(184, 134, 11, 0.08)',
  goldBorder: 'rgba(184, 134, 11, 0.18)',

  violet: '#6D5A8A',
  violetLight: 'rgba(109, 90, 138, 0.08)',
  violetBorder: 'rgba(109, 90, 138, 0.18)',
  violetBright: '#6D5A8A',

  blue: '#4A6B8A',
  blueFaint: 'rgba(74, 107, 138, 0.05)',
  blueTint: 'rgba(74, 107, 138, 0.06)',
  blueLight: 'rgba(74, 107, 138, 0.08)',
  blueWash: 'rgba(74, 107, 138, 0.12)',
  blueBorder: 'rgba(74, 107, 138, 0.18)',

  indigo: '#5A5A8A',
  indigoLight: 'rgba(90, 90, 138, 0.08)',
  indigoBorder: 'rgba(90, 90, 138, 0.18)',

  orange: '#C2622D',
  orangeLight: 'rgba(194, 98, 45, 0.08)',
  orangeBorder: 'rgba(194, 98, 45, 0.18)',

  cyan: '#3D7A7A',
  cyanLight: 'rgba(61, 122, 122, 0.08)',
  cyanBorder: 'rgba(61, 122, 122, 0.18)',

  // Sage tones
  sage: '#4A6B5D',
  sageHint: 'rgba(74, 107, 93, 0.03)',
  sageTint: 'rgba(74, 107, 93, 0.04)',
  sageFaint: 'rgba(74, 107, 93, 0.05)',
  sageLight: 'rgba(74, 107, 93, 0.06)',
  sageSubtle: 'rgba(74, 107, 93, 0.08)',
  sageBorder: 'rgba(74, 107, 93, 0.12)',
  sageWash: 'rgba(74, 107, 93, 0.15)',
  sageGlow: 'rgba(74, 107, 93, 0.20)',
  sageMuted: 'rgba(74, 107, 93, 0.28)',
  sageSoft: 'rgba(74, 107, 93, 0.45)',
  sageStrong: 'rgba(74, 107, 93, 0.55)',
  sageBright: 'rgba(74, 107, 93, 0.75)',
  sageDim: 'rgba(74, 107, 93, 0.05)',

  // Chart variants
  purpleBright: '#6D5A8A',
  amberBright: '#A16207',
  amberBrightTint: 'rgba(161, 98, 7, 0.06)',
  amberBrightStrong: 'rgba(161, 98, 7, 0.6)',
  greenBright: '#3D7A5F',
  redBright: '#B91C1C',
  blueBright: '#4A6B8A',
  skyBright: '#3D7A8A',

  // Status
  success: '#3D7A5F',
  warning: '#A16207',
  warningLight: 'rgba(161, 98, 7, 0.08)',
  warningBorder: 'rgba(161, 98, 7, 0.20)',
  error: '#B91C1C',

  // Text — darker for linen contrast
  textPrimary: '#2D3B36',
  textSecondary: '#4A5550',
  textTertiary: '#5C6B63',
  textSoft: '#78716C',
  textMuted: '#78716C',
  textDisabled: '#A8A29E',
  textHalf: '#78716C',
  textPlaceholder: '#A8A29E',
  textBright: '#2D3B36',
  textAlmostFull: '#1E2A25',
  textNearFull: '#1A231F',
  textHighContrast: '#1A231F',

  // Borders
  border: 'rgba(0, 0, 0, 0.06)',
  borderLight: 'rgba(0, 0, 0, 0.04)',
  borderMedium: 'rgba(74, 107, 93, 0.18)',
  borderStrong: 'rgba(74, 107, 93, 0.28)',

  // Tab Bar
  tabBarBackground: '#FFFFFF',
  tabBarBorder: 'rgba(0, 0, 0, 0.06)',
  tabBarActive: '#4A6B5D',
  tabBarInactive: '#A8A29E',

  // Overlay
  overlay: 'rgba(45, 59, 54, 0.55)',
  menuSurface: '#FFFFFF',

  // Gradients
  gradientBackground: ['#E8E4DE', '#E0DCD6'],
  gradientAuroraToday: ['rgba(74, 107, 93, 0.05)', 'transparent'],
  gradientAuroraHub: ['rgba(109, 90, 138, 0.05)', 'transparent'],
  gradientAuroraFamily: ['rgba(184, 134, 11, 0.05)', 'transparent'],

  // Compatibility
  backgroundGradientStart: '#E8E4DE',
  backgroundGradientEnd: '#E0DCD6',
  cardBackground: '#FFFFFF',

  // Background variants
  backgroundDark: '#DCD8D2',
  backgroundDeep: '#E0DCD6',
  backgroundElevated: '#FFFFFF',

  // Input
  inputBackground: '#F5F3EF',

  // Switch
  switchThumbOn: '#FFFFFF',
  switchThumbOff: '#FFFFFF',
  switchThumb: '#FFFFFF',
  switchTrackOff: 'rgba(0, 0, 0, 0.15)',
};
