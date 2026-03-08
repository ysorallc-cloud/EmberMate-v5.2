// ============================================================================
// COMMON COMPONENT STYLES
// Shared styles to reduce duplication across screens
// NOTE: Not a route - utility file only
// ============================================================================

import { StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { Colors, Spacing, BorderRadius } from './theme-tokens';
import { useTheme } from '../contexts/ThemeContext';

// Prevent Expo Router warning (this is not a route component)
export default null;

export const createCommonStyles = (c: typeof Colors) => StyleSheet.create({
  // BACK BUTTON - Used across 20+ screens
  backButton: {
    width: 44,
    height: 44,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  backIcon: {
    fontSize: 24,
    color: c.textPrimary,
  },

  // HEADER ELEMENTS
  headerWrapper: {
    position: 'relative',
  },

  headerLabel: {
    fontSize: 11,
    color: c.textMuted,
    letterSpacing: 1,
    fontWeight: '600',
  },

  // ACTION BUTTONS
  saveButton: {
    backgroundColor: c.accentLight,
    borderWidth: 1,
    borderColor: c.accentBorder,
    borderRadius: 12,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: c.accent,
  },

  primaryButton: {
    backgroundColor: c.accent,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: c.background,
  },

  secondaryButton: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },

  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: c.textSecondary,
  },

  // FORM INPUTS
  input: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
    color: c.textPrimary,
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: c.textSecondary,
    marginBottom: Spacing.sm,
  },

  inputError: {
    borderColor: c.error,
  },

  inputHelpText: {
    fontSize: 12,
    color: c.textMuted,
    marginTop: Spacing.xs,
  },

  // SECTION HEADERS
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: c.textMuted,
    marginBottom: Spacing.md,
  },

  // CARDS
  card: {
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },

  // EMPTY STATES
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: Spacing.xl,
  },

  emptyIcon: {
    fontSize: 64,
    marginBottom: Spacing.xl,
    opacity: 0.3,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: c.textPrimary,
    marginBottom: Spacing.sm,
  },

  emptyText: {
    fontSize: 14,
    color: c.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // LOADING STATES
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.background,
  },

  loadingText: {
    fontSize: 14,
    color: c.textSecondary,
    marginTop: Spacing.md,
  },

  // DIVIDERS
  divider: {
    height: 1,
    backgroundColor: c.border,
    marginVertical: Spacing.md,
  },

  dividerThick: {
    height: 2,
    backgroundColor: c.borderMedium,
    marginVertical: Spacing.lg,
  },
});

export const createLayoutStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },

  gradient: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },

  centeredContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
});

/** Frozen dark-theme instances for backward compat with non-migrated files */
export const CommonStyles = createCommonStyles(Colors);
export const LayoutStyles = createLayoutStyles(Colors);

/** Hook that returns theme-aware common styles */
export function useCommonStyles() {
  const { colors } = useTheme();
  return useMemo(() => createCommonStyles(colors), [colors]);
}

/** Hook that returns theme-aware layout styles */
export function useLayoutStyles() {
  const { colors } = useTheme();
  return useMemo(() => createLayoutStyles(colors), [colors]);
}
