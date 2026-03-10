// ============================================================================
// EMBERMATE MIDNIGHT CALM THEME TOKENS
// Deep midnight with soft purple accents
// Colors are initialized at module load based on system appearance.
// NOTE: Not a route - utility file only
// ============================================================================

import { LightColors } from './light-tokens';

// Prevent Expo Router warning (this is not a route component)
export default null;

// ============================================================================
// DARK THEME — Midnight Calm
// ============================================================================

const DarkColors = {
  background: '#0F1A13',
  backgroundAlt: '#0A1410',
  glass: '#162119',
  glassHover: 'rgba(255, 255, 255, 0.06)',
  glassBorder: 'rgba(255, 255, 255, 0.10)',
  glassActive: 'rgba(255, 255, 255, 0.12)',
  glassDim: 'rgba(255, 255, 255, 0.04)',
  glassFaint: 'rgba(255, 255, 255, 0.03)',
  glassSubtle: 'rgba(255, 255, 255, 0.12)',
  glassStrong: 'rgba(255, 255, 255, 0.18)',
  glassBold: 'rgba(255, 255, 255, 0.25)',
  // Surface layers (three-level depth system)
  surface: '#0C0E1A',
  raised: '#111628',
  raised2: '#161D32',
  surfaceElevated: '#1A1A1A',
  // Hero gradient (use as LinearGradient colors array)
  heroGradStart: '#0D1A12',
  heroGradMid: '#152B1C',
  heroGradEnd: '#0F1A13',
  surfaceAlt: 'rgba(255, 255, 255, 0.03)',
  surfaceHighlight: 'rgba(52, 211, 153, 0.08)',
  auroraTeal: 'hsla(160, 40%, 12%, 0.4)',
  auroraPurple: 'hsla(160, 50%, 15%, 0.35)',
  auroraBlue: 'hsla(165, 40%, 10%, 0.3)',
  auroraViolet: 'hsla(155, 45%, 12%, 0.25)',
  auroraRose: 'hsla(160, 35%, 10%, 0.2)',
  // Midnight Cobalt accent
  accent: '#5B8A6A',
  accentLight: 'rgba(91,138,106,0.15)',
  accentBorder: 'rgba(91,138,106,0.22)',
  accentGlow: 'rgba(91,138,106,0.10)',
  accentFaint: 'rgba(91,138,106,0.05)',
  accentTint: 'rgba(91,138,106,0.07)',
  accentDim: 'rgba(91,138,106,0.12)',
  accentHint: 'rgba(91,138,106,0.10)',
  accentSubtle: 'rgba(91,138,106,0.10)',
  accentMuted: 'rgba(91,138,106,0.40)',
  accentGradientStart: '#5B8A6A',
  accentGradientMid: '#4A7C59',
  accentGradientEnd: '#7BA67E',
  green: '#7BA67E',
  greenTint: 'rgba(52, 211, 153, 0.10)',
  greenLight: 'rgba(52, 211, 153, 0.13)',
  greenHint: 'rgba(52, 211, 153, 0.16)',
  greenMuted: 'rgba(52, 211, 153, 0.20)',
  greenBorder: 'rgba(52, 211, 153, 0.25)',
  greenStrong: 'rgba(52, 211, 153, 0.30)',
  greenGlow: 'rgba(52, 211, 153, 0.40)',
  amber: '#D4A853',
  amberDim: 'rgba(212,168,83,0.06)',
  amberFaint: 'rgba(251, 191, 36, 0.06)',
  amberLight: 'rgba(251, 191, 36, 0.10)',
  amberHint: 'rgba(251, 191, 36, 0.12)',
  amberMuted: 'rgba(251, 191, 36, 0.15)',
  amberBorder: 'rgba(251, 191, 36, 0.20)',
  amberGlow: 'rgba(251, 191, 36, 0.35)',
  red: '#F87171',
  redFaint: 'rgba(248, 113, 113, 0.06)',
  redLight: 'rgba(248, 113, 113, 0.10)',
  redHint: 'rgba(248, 113, 113, 0.12)',
  redMuted: 'rgba(248, 113, 113, 0.15)',
  redBorder: 'rgba(248, 113, 113, 0.20)',
  redStrong: 'rgba(248, 113, 113, 0.25)',
  rose: '#FB7185',
  roseLight: 'rgba(251, 113, 133, 0.10)',
  roseBorder: 'rgba(251, 113, 133, 0.20)',
  purple: '#A78BFA',
  purpleFaint: 'rgba(167, 139, 250, 0.06)',
  purpleMuted: 'rgba(167, 139, 250, 0.08)',
  purpleLight: 'rgba(167, 139, 250, 0.10)',
  purpleHint: 'rgba(167, 139, 250, 0.12)',
  purpleWash: 'rgba(167, 139, 250, 0.15)',
  purpleBorder: 'rgba(167, 139, 250, 0.20)',
  purpleStrong: 'rgba(167, 139, 250, 0.25)',
  purpleGlow: 'rgba(167, 139, 250, 0.35)',
  sky: '#7DD3FC',
  skyLight: 'rgba(125, 211, 252, 0.10)',
  skyBorder: 'rgba(125, 211, 252, 0.20)',
  gold: '#FBBF24',
  goldLight: 'rgba(251, 191, 36, 0.10)',
  goldBorder: 'rgba(251, 191, 36, 0.20)',
  violet: '#C4B5FD',
  violetLight: 'rgba(196, 181, 253, 0.10)',
  violetBorder: 'rgba(196, 181, 253, 0.20)',
  violetBright: 'rgba(196, 181, 253, 0.9)',
  blue: '#93C5FD',
  blueFaint: 'rgba(147, 197, 253, 0.06)',
  blueTint: 'rgba(147, 197, 253, 0.08)',
  blueLight: 'rgba(147, 197, 253, 0.10)',
  blueWash: 'rgba(147, 197, 253, 0.15)',
  blueBorder: 'rgba(147, 197, 253, 0.20)',
  indigo: '#A5B4FC',
  indigoLight: 'rgba(165, 180, 252, 0.10)',
  indigoBorder: 'rgba(165, 180, 252, 0.20)',
  orange: '#FB923C',
  orangeLight: 'rgba(251, 146, 60, 0.10)',
  orangeBorder: 'rgba(251, 146, 60, 0.20)',
  cyan: '#67E8F9',
  cyanLight: 'rgba(103, 232, 249, 0.10)',
  cyanBorder: 'rgba(103, 232, 249, 0.20)',
  sage: '#C4B5FD',
  sageHint: 'rgba(196, 181, 253, 0.04)',
  sageTint: 'rgba(196, 181, 253, 0.05)',
  sageFaint: 'rgba(196, 181, 253, 0.06)',
  sageLight: 'rgba(196, 181, 253, 0.08)',
  sageSubtle: 'rgba(196, 181, 253, 0.10)',
  sageBorder: 'rgba(196, 181, 253, 0.12)',
  sageWash: 'rgba(196, 181, 253, 0.15)',
  sageGlow: 'rgba(196, 181, 253, 0.22)',
  sageMuted: 'rgba(196, 181, 253, 0.35)',
  sageSoft: 'rgba(196, 181, 253, 0.55)',
  sageStrong: 'rgba(196, 181, 253, 0.70)',
  sageBright: 'rgba(196, 181, 253, 0.85)',
  sageDim: 'rgba(52, 211, 153, 0.06)',
  purpleBright: '#C4B5FD',
  amberBright: '#FBBF24',
  amberBrightTint: 'rgba(251, 191, 36, 0.08)',
  amberBrightStrong: 'rgba(251, 191, 36, 0.75)',
  greenBright: '#34D399',
  redBright: '#F87171',
  blueBright: '#93C5FD',
  skyBright: '#7DD3FC',
  success: '#34D399',
  warning: '#FBBF24',
  warningLight: 'rgba(251, 191, 36, 0.10)',
  warningBorder: 'rgba(251, 191, 36, 0.25)',
  error: '#F87171',
  textPrimary: '#F2E8D8',
  textSecondary: 'rgba(242,232,216,0.72)',
  textTertiary: 'rgba(255, 255, 255, 0.50)',
  textSoft: 'rgba(255, 255, 255, 0.42)',
  textMuted: 'rgba(255, 255, 255, 0.48)',
  textDisabled: 'rgba(255, 255, 255, 0.28)',
  textHalf: 'rgba(255, 255, 255, 0.42)',
  textPlaceholder: 'rgba(255, 255, 255, 0.35)',
  textBright: 'rgba(255, 255, 255, 0.88)',
  textAlmostFull: 'rgba(255, 255, 255, 0.92)',
  textNearFull: 'rgba(255, 255, 255, 0.96)',
  textHighContrast: '#FFFFFF',
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.05)',
  borderMedium: 'rgba(52, 211, 153, 0.22)',
  borderStrong: 'rgba(52, 211, 153, 0.35)',
  tabBarBackground: '#0C140F',
  tabBarBorder: 'rgba(52, 211, 153, 0.15)',
  tabBarActive: '#34D399',
  tabBarInactive: 'rgba(255, 255, 255, 0.40)',
  overlay: 'rgba(0, 0, 0, 0.90)',
  menuSurface: '#0A0A0A',
  gradientBackground: ['#000000', '#050505'],
  gradientAuroraToday: ['rgba(52, 211, 153, 0.10)', 'transparent'],
  gradientAuroraHub: ['rgba(52, 211, 153, 0.06)', 'transparent'],
  gradientAuroraFamily: ['rgba(52, 211, 153, 0.08)', 'transparent'],
  backgroundGradientStart: '#000000',
  backgroundGradientEnd: '#050505',
  cardBackground: '#111111',
  backgroundDark: '#000000',
  backgroundDeep: '#050505',
  backgroundElevated: '#1A1A1A',
  inputBackground: '#111111',
  switchThumbOn: '#FFFFFF',
  switchThumbOff: '#F4F3F4',
  switchThumb: '#F4F3F4',
  switchTrackOff: 'rgba(255, 255, 255, 0.15)',
};

// ============================================================================
// EXPORTED Colors — initialized based on system appearance at module load.
// This ensures static StyleSheet.create() calls (148 files) capture the
// correct theme values before any component mounts.
// ============================================================================

// Always initialize with dark theme — dark mode is the primary design
export const Colors: typeof DarkColors = { ...DarkColors };

/** Mutate the exported Colors object in-place so every file that reads Colors.X
 *  at render time picks up the active theme without needing a hook. */
export function _syncColors(newColors: Partial<typeof Colors>) {
  Object.assign(Colors, newColors);
}

/** Get the dark color palette (used by ThemeContext) */
export function getDarkColors(): typeof DarkColors {
  return DarkColors;
}
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const Typography = {
  // Display
  displayLarge: {
    fontSize: 42,
    fontWeight: '200' as const,
    letterSpacing: -1,
  },
  displayMedium: {
    fontSize: 32,
    fontWeight: '200' as const,
    letterSpacing: -0.5,
  },
  displaySmall: {
    fontSize: 28,
    fontWeight: '300' as const,
    letterSpacing: -0.5,
  },

  // Headings
  h1: {
    fontSize: 24,
    fontWeight: '400' as const,
  },
  h2: {
    fontSize: 20,
    fontWeight: '500' as const,
  },
  h3: {
    fontSize: 18,
    fontWeight: '500' as const,
  },

  // Body
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400' as const,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
  },

  // Labels
  label: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  labelSmall: {
    fontSize: 12,
    fontWeight: '400' as const,
  },

  // Captions
  caption: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 2,
  },
  captionSmall: {
    fontSize: 10,
    fontWeight: '500' as const,
    letterSpacing: 1,
  },
};

export const Shadows = {
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  }),
  glowSmall: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  }),
  soft: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  elevated: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 6,
  },
};
// Animation constants
export const Animation = {
  aurora: {
    duration: 8000,
    hueShiftRange: 30,
  },
  breathe: {
    duration: 6000,
    scaleRange: [1, 1.03],
  },
  transition: {
    fast: 150,
    normal: 250,
    slow: 400,
  },
};

export const Breakpoints = {
  sm: 375,
  mobile: 430,
  lg: 600,
  tablet: 768,
  desktop: 1024,
};

export const Layout = {
  maxWidth: 430,
  maxWidthTablet: 600,
  maxWidthDesktop: 768,
  paddingHorizontal: 20,
};
