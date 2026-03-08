// ============================================================================
// SUBCARD - Universal sub-card component
// Provides consistent layout and styling for all sub-cards across the app
// ============================================================================

import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  AccessibilityRole,
} from 'react-native';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import {
  SubCardTokens,
  SubCardRoleColors,
  SubCardStatusColors,
  SubCardTypography,
  SubCardStatus,
} from '../../theme/subCardTokens';
import {
  ComponentRole,
  getRoleLabel,
  getRoleA11yHint,
} from '../../types/componentRoles';

// ============================================================================
// TYPES
// ============================================================================

export type SubCardVariant = 'standard' | 'compact' | 'expanded';

export interface SubCardProps {
  /** Component role for styling and accessibility */
  __role: ComponentRole;

  /** Main content area */
  content: React.ReactNode;

  /** Leading element (icon/avatar) - renders in 44x44 container */
  leading?: React.ReactNode;

  /** Trailing element (action/status indicator) */
  trailing?: React.ReactNode;

  /** Size variant */
  variant?: SubCardVariant;

  /** Status for color theming (overrides role-based colors) */
  status?: SubCardStatus;

  /** Optional label displayed above content (e.g., "UP NEXT") */
  label?: string;

  /** Show role label badge (true for default, string for custom) */
  roleLabel?: boolean | string;

  /** Press handler - makes the card interactive */
  onPress?: () => void;

  /** Long press handler */
  onLongPress?: () => void;

  /** Accessibility label */
  accessibilityLabel?: string;

  /** Accessibility hint */
  accessibilityHint?: string;

  /** Additional container styles */
  style?: ViewStyle;

  /** Whether to disable the press effect */
  disabled?: boolean;

  /** Test ID for testing */
  testID?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const SubCard: React.FC<SubCardProps> = ({
  __role,
  content,
  leading,
  trailing,
  variant = 'standard',
  status,
  label,
  roleLabel,
  onPress,
  onLongPress,
  accessibilityLabel,
  accessibilityHint,
  style,
  disabled = false,
  testID,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Get colors based on status (if provided) or role
  const roleColors = SubCardRoleColors[__role];
  const statusColors = status ? SubCardStatusColors[status] : null;

  const backgroundColor = statusColors?.background ?? roleColors.background;
  const borderColor = statusColors?.border ?? roleColors.border;

  // Get variant-specific padding
  const variantConfig = SubCardTokens.variants[variant];

  // Get role label if enabled
  const displayRoleLabel = getRoleLabel(__role, roleLabel);

  // Build accessibility props
  const a11yRole: AccessibilityRole = onPress ? 'button' : 'none';
  const a11yHint = accessibilityHint || (onPress ? getRoleA11yHint(__role) : undefined);

  // Container styles
  const containerStyle: ViewStyle = {
    backgroundColor,
    borderWidth: 1,
    borderColor,
    borderRadius: SubCardTokens.borderRadius,
    paddingHorizontal: SubCardTokens.padding.horizontal,
    paddingVertical: variantConfig.paddingVertical,
    minHeight: variantConfig.minHeight,
    flexDirection: 'row',
    alignItems: 'center',
    ...style,
  };

  // Render content
  const renderContent = () => (
    <>
      {/* Leading element */}
      {leading && (
        <View style={styles.leading}>
          {leading}
        </View>
      )}

      {/* Main content */}
      <View style={styles.content}>
        {/* Label row */}
        {(label || displayRoleLabel) && (
          <View style={styles.labelRow}>
            {label && (
              <Text style={[styles.label, { color: roleColors.accent }]}>
                {label}
              </Text>
            )}
            {displayRoleLabel && (
              <Text
                style={[
                  styles.roleLabel,
                  {
                    backgroundColor: roleColors.labelBackground,
                    color: roleColors.labelColor,
                  },
                ]}
              >
                {displayRoleLabel}
              </Text>
            )}
          </View>
        )}
        {content}
      </View>

      {/* Trailing element */}
      {trailing && (
        <View style={styles.trailing}>
          {trailing}
        </View>
      )}
    </>
  );

  // If interactive, wrap in TouchableOpacity
  if (onPress || onLongPress) {
    return (
      <TouchableOpacity
        style={containerStyle}
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.8}
        disabled={disabled}
        accessible={true}
        accessibilityRole={a11yRole}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={a11yHint}
        accessibilityState={{ disabled }}
        testID={testID}
      >
        {renderContent()}
      </TouchableOpacity>
    );
  }

  // Otherwise, render as View
  return (
    <View
      style={containerStyle}
      accessible={true}
      accessibilityRole="none"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      {renderContent()}
    </View>
  );
};

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

/**
 * Standard leading icon container
 */
export const SubCardIcon: React.FC<{
  emoji?: string;
  icon?: React.ReactNode;
  backgroundColor?: string;
}> = ({ emoji, icon, backgroundColor }) => (
  <View
    style={[
      styles.iconContainer,
      backgroundColor ? { backgroundColor } : null,
    ]}
  >
    {emoji ? <Text style={styles.iconEmoji}>{emoji}</Text> : icon}
  </View>
);

/**
 * Standard content block with title and subtitle
 */
export const SubCardContent: React.FC<{
  title: string;
  subtitle?: string;
  titleColor?: string;
  subtitleColor?: string;
}> = ({
  title,
  subtitle,
  titleColor = Colors.textPrimary,
  subtitleColor = Colors.textSecondary,
}) => (
  <>
    <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
    {subtitle && (
      <Text style={[styles.subtitle, { color: subtitleColor }]}>{subtitle}</Text>
    )}
  </>
);

/**
 * Arrow trailing indicator
 */
export const SubCardArrow: React.FC<{ color?: string }> = ({
  color = Colors.textMuted,
}) => (
  <Text style={[styles.arrow, { color }]}>→</Text>
);

/**
 * Checkmark trailing indicator
 */
export const SubCardCheck: React.FC<{ color?: string }> = ({
  color = Colors.green,
}) => (
  <Text style={[styles.check, { color }]}>✓</Text>
);

// ============================================================================
// STYLES
// ============================================================================

const createStyles = (c: typeof Colors) => StyleSheet.create({
  leading: {
    marginRight: SubCardTokens.gap,
  },
  content: {
    flex: 1,
  },
  trailing: {
    marginLeft: SubCardTokens.gap,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  label: {
    ...SubCardTypography.label,
  },
  roleLabel: {
    ...SubCardTypography.roleLabel,
    overflow: 'hidden',
  },
  iconContainer: {
    width: SubCardTokens.leadingSize,
    height: SubCardTokens.leadingSize,
    borderRadius: SubCardTokens.leadingBorderRadius,
    backgroundColor: c.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 22,
  },
  title: {
    ...SubCardTypography.title,
    color: c.textPrimary,
  },
  subtitle: {
    ...SubCardTypography.subtitle,
    color: c.textSecondary,
    marginTop: 1,
  },
  arrow: {
    fontSize: 18,
  },
  check: {
    fontSize: 18,
    fontWeight: '600',
  },
});

export default SubCard;
