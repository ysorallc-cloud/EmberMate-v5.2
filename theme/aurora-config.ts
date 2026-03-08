// ============================================================================
// AURORA VARIANT CONFIGURATION
// Defines color schemes for different aurora backgrounds
// ============================================================================

export default null;

export type AuroraVariant = 'today' | 'now' | 'journal' | 'hub' | 'family' | 'log' | 'reports' | 'insights' | 'settings' | 'member' | 'coffee';

export interface AuroraConfig {
  baseHue1: number;
  baseHue2: number;
  saturation1: number;
  saturation2: number;
  lightness1: number;
  lightness2: number;
  opacity1: number;
  opacity2: number;
}

export const AURORA_CONFIGS: Record<AuroraVariant, AuroraConfig> = {
  // Main tabs
  now: {
    baseHue1: 160,    // Teal (alias for today)
    baseHue2: 280,
    saturation1: 70,
    saturation2: 50,
    lightness1: 30,
    lightness2: 40,
    opacity1: 0.4,
    opacity2: 0.3,
  },
  journal: {
    baseHue1: 260,    // Purple
    baseHue2: 200,    // Blue
    saturation1: 60,
    saturation2: 50,
    lightness1: 22,
    lightness2: 18,
    opacity1: 0.45,
    opacity2: 0.3,
  },
  today: {
    baseHue1: 160,    // Teal
    baseHue2: 280,    // Purple
    saturation1: 70,
    saturation2: 50,
    lightness1: 30,
    lightness2: 40,
    opacity1: 0.4,
    opacity2: 0.3,
  },
  hub: {
    baseHue1: 220,    // Blue
    baseHue2: 260,    // Violet
    saturation1: 60,
    saturation2: 50,
    lightness1: 35,
    lightness2: 30,
    opacity1: 0.35,
    opacity2: 0.25,
  },
  family: {
    baseHue1: 180,    // Teal-cyan
    baseHue2: 320,    // Rose
    saturation1: 50,
    saturation2: 40,
    lightness1: 30,
    lightness2: 35,
    opacity1: 0.3,
    opacity2: 0.25,
  },

  // Sub-page variants
  log: {
    baseHue1: 30,     // Orange
    baseHue2: 168,    // Teal
    saturation1: 70,
    saturation2: 50,
    lightness1: 20,
    lightness2: 15,
    opacity1: 0.4,
    opacity2: 0.3,
  },
  reports: {
    baseHue1: 260,    // Purple
    baseHue2: 200,    // Blue
    saturation1: 60,
    saturation2: 50,
    lightness1: 22,
    lightness2: 18,
    opacity1: 0.45,
    opacity2: 0.3,
  },
  insights: {
    baseHue1: 270,    // Violet
    baseHue2: 220,    // Blue
    saturation1: 55,
    saturation2: 50,
    lightness1: 35,
    lightness2: 30,
    opacity1: 0.35,
    opacity2: 0.25,
  },
  settings: {
    baseHue1: 200,    // Blue-gray
    baseHue2: 240,    // Indigo
    saturation1: 40,
    saturation2: 35,
    lightness1: 28,
    lightness2: 25,
    opacity1: 0.25,
    opacity2: 0.2,
  },
  member: {
    baseHue1: 320,    // Rose
    baseHue2: 280,    // Purple
    saturation1: 50,
    saturation2: 45,
    lightness1: 32,
    lightness2: 28,
    opacity1: 0.3,
    opacity2: 0.25,
  },
  coffee: {
    baseHue1: 25,     // Orange/Ember
    baseHue2: 280,    // Purple (evening)
    saturation1: 80,
    saturation2: 50,
    lightness1: 25,
    lightness2: 20,
    opacity1: 0.35,
    opacity2: 0.2,
  },
};
