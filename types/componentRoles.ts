// ============================================================================
// COMPONENT ROLES TYPE DEFINITIONS
// Standardizes sub-card responsibilities across the app
// ============================================================================

/**
 * Component roles define the primary responsibility of a sub-card or component.
 *
 * - `display`: Read-only presentation of data (progress, status, summaries)
 * - `logging`: Interactive capture of care data (completing tasks, recording vitals)
 * - `configuration`: Settings and preferences modification
 *
 * Components should have a single primary role. If a component needs to serve
 * multiple purposes, split it into separate components with distinct roles.
 */
export type ComponentRole = 'display' | 'logging' | 'configuration';

/**
 * Props interface for role-aware components.
 * Components that adopt the role system should extend this interface.
 */
export interface RoleAwareProps {
  /**
   * The primary role this component serves.
   * Used for visual consistency, accessibility labeling, and testing.
   */
  __role: ComponentRole;

  /**
   * Optional role label displayed on the component (e.g., "STATUS", "LOG", "SETTING")
   * When true, uses default label based on role. When string, uses custom label.
   */
  roleLabel?: boolean | string;
}

/**
 * Maps component roles to their default display labels
 */
export const ROLE_LABELS: Record<ComponentRole, string> = {
  display: 'STATUS',
  logging: 'LOG',
  configuration: 'SETTING',
};

/**
 * Gets the display label for a role
 */
export function getRoleLabel(role: ComponentRole, customLabel?: boolean | string): string | null {
  if (customLabel === false || customLabel === undefined) return null;
  if (typeof customLabel === 'string') return customLabel;
  return ROLE_LABELS[role];
}

/**
 * Accessibility hints based on role
 */
export const ROLE_A11Y_HINTS: Record<ComponentRole, string> = {
  display: 'Displays information',
  logging: 'Tap to log or record care activity',
  configuration: 'Tap to change settings',
};

/**
 * Gets the accessibility hint for a role
 */
export function getRoleA11yHint(role: ComponentRole): string {
  return ROLE_A11Y_HINTS[role];
}
