// ============================================================================
// SUB-CARD VISUAL TOKENS
// Standardized design tokens for sub-card components
// ============================================================================

import { Colors, Spacing, BorderRadius } from './theme-tokens';
import { ComponentRole } from '../types/componentRoles';

/**
 * Standard sub-card dimensions and spacing
 */
export const SubCardTokens = {
  // Layout
  padding: {
    horizontal: Spacing.lg, // 16px
    vertical: 14,
  },
  borderRadius: BorderRadius.md + 2, // 14px
  leadingSize: 44,
  leadingBorderRadius: BorderRadius.md, // 12px
  gap: Spacing.md, // 12px

  // Variants
  variants: {
    standard: {
      paddingVertical: 14,
      minHeight: 72,
    },
    compact: {
      paddingVertical: 10,
      minHeight: 56,
    },
    expanded: {
      paddingVertical: 18,
      minHeight: 88,
    },
  },
} as const;

/**
 * Role-based color schemes for sub-cards
 */
export const SubCardRoleColors: Record<ComponentRole, {
  background: string;
  border: string;
  accent: string;
  labelBackground: string;
  labelColor: string;
}> = {
  display: {
    background: Colors.glass,
    border: Colors.glassBorder,
    accent: Colors.accent,
    labelBackground: Colors.accentHint,
    labelColor: Colors.accent,
  },
  logging: {
    background: Colors.glass,
    border: Colors.glassBorder,
    accent: Colors.green,
    labelBackground: Colors.greenHint,
    labelColor: Colors.green,
  },
  configuration: {
    background: Colors.glass,
    border: Colors.glassBorder,
    accent: Colors.purple,
    labelBackground: Colors.purpleHint,
    labelColor: Colors.purple,
  },
};

/**
 * Status-based color schemes (for task/item states)
 */
export const SubCardStatusColors = {
  pending: {
    background: Colors.glass,
    border: Colors.glassBorder,
    iconBackground: Colors.surfaceElevated,
  },
  active: {
    background: Colors.goldLight,
    border: Colors.goldBorder,
    iconBackground: Colors.glassActive,
  },
  completed: {
    background: Colors.greenLight,
    border: Colors.greenBorder,
    iconBackground: Colors.greenMuted,
  },
  skipped: {
    background: Colors.glass,
    border: Colors.glassBorder,
    iconBackground: Colors.surfaceElevated,
  },
  overdue: {
    background: Colors.amberLight,
    border: Colors.amberBorder,
    iconBackground: Colors.amberMuted,
  },
  missed: {
    background: Colors.redLight,
    border: Colors.redBorder,
    iconBackground: Colors.redMuted,
  },
} as const;

export type SubCardStatus = keyof typeof SubCardStatusColors;

/**
 * Typography for sub-cards
 */
export const SubCardTypography = {
  label: {
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  title: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '400' as const,
  },
  roleLabel: {
    fontSize: 8,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
} as const;
