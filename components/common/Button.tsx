// ============================================================================
// REUSABLE BUTTON COMPONENT
// Consistent button styling with variants, sizes, and accessibility
// ============================================================================

import React, { useMemo } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps {
  // Content
  title: string;
  icon?: string;
  iconPosition?: 'left' | 'right';

  // Behavior
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;

  // Styling
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;

  // Accessibility
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  icon,
  iconPosition = 'left',
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
  testID,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isDisabled = disabled || loading;

  const variantStyles = getVariantStyles(variant, isDisabled, colors);
  const sizeStyles = getSizeStyles(size);

  return (
    <TouchableOpacity
      style={[
        styles.base,
        variantStyles.container,
        sizeStyles.container,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{
        disabled: isDisabled,
        busy: loading,
      }}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variantStyles.loaderColor}
        />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && (
            <Text style={[styles.icon, sizeStyles.icon, { marginRight: Spacing.xs }]}>
              {icon}
            </Text>
          )}
          <Text
            style={[
              styles.text,
              variantStyles.text,
              sizeStyles.text,
              isDisabled && styles.disabledText,
              textStyle,
            ]}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <Text style={[styles.icon, sizeStyles.icon, { marginLeft: Spacing.xs }]}>
              {icon}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

// Variant-specific styles
const getVariantStyles = (variant: ButtonVariant, disabled: boolean, c: typeof Colors) => {
  const styles: {
    container: ViewStyle;
    text: TextStyle;
    loaderColor: string;
  } = {
    container: {},
    text: {},
    loaderColor: c.textPrimary,
  };

  switch (variant) {
    case 'primary':
      styles.container = {
        backgroundColor: disabled ? `${c.accent}60` : c.accent,
        borderWidth: 0,
        shadowColor: c.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: disabled ? 0 : 0.30,
        shadowRadius: 12,
        elevation: disabled ? 0 : 5,
      };
      styles.text = {
        color: '#0c0e14',
        fontWeight: '600',
      };
      styles.loaderColor = c.textPrimary;
      break;

    case 'secondary':
      styles.container = {
        backgroundColor: c.glass,
        borderWidth: 1,
        borderColor: c.glassBorder,
      };
      styles.text = {
        color: c.textPrimary,
        fontWeight: '500',
      };
      styles.loaderColor = c.textPrimary;
      break;

    case 'outline':
      styles.container = {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: c.accent,
      };
      styles.text = {
        color: c.accent,
        fontWeight: '500',
      };
      styles.loaderColor = c.accent;
      break;

    case 'danger':
      styles.container = {
        backgroundColor: disabled ? `${c.red}60` : c.red,
        borderWidth: 0,
      };
      styles.text = {
        color: c.textPrimary,
        fontWeight: '600',
      };
      styles.loaderColor = c.textPrimary;
      break;

    case 'success':
      styles.container = {
        backgroundColor: disabled ? `${c.green}60` : c.green,
        borderWidth: 0,
      };
      styles.text = {
        color: c.textPrimary,
        fontWeight: '600',
      };
      styles.loaderColor = c.textPrimary;
      break;

    case 'ghost':
      styles.container = {
        backgroundColor: 'transparent',
        borderWidth: 0,
      };
      styles.text = {
        color: c.accent,
        fontWeight: '500',
      };
      styles.loaderColor = c.accent;
      break;
  }

  return styles;
};

// Size-specific styles
const getSizeStyles = (size: ButtonSize) => {
  const styles: {
    container: ViewStyle;
    text: TextStyle;
    icon: TextStyle;
  } = {
    container: {},
    text: {},
    icon: {},
  };

  switch (size) {
    case 'small':
      styles.container = {
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.sm,
      };
      styles.text = {
        fontSize: 13,
      };
      styles.icon = {
        fontSize: 14,
      };
      break;

    case 'medium':
      styles.container = {
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        borderRadius: BorderRadius.md,
      };
      styles.text = {
        fontSize: 15,
      };
      styles.icon = {
        fontSize: 16,
      };
      break;

    case 'large':
      styles.container = {
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing.xl,
        borderRadius: 14,
      };
      styles.text = {
        fontSize: 17,
      };
      styles.icon = {
        fontSize: 18,
      };
      break;
  }

  return styles;
};

const createStyles = (c: typeof Colors) => StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    textAlign: 'center',
  },
  icon: {
    textAlign: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.6,
  },
  disabledText: {
    opacity: 0.8,
  },
});

// Also export a LinkButton for text-only links
interface LinkButtonProps {
  title: string;
  onPress: () => void;
  color?: string;
  size?: 'small' | 'medium' | 'large';
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const LinkButton: React.FC<LinkButtonProps> = ({
  title,
  onPress,
  color = Colors.accent,
  size = 'medium',
  accessibilityLabel,
  accessibilityHint,
}) => {
  const fontSize = size === 'small' ? 13 : size === 'large' ? 17 : 15;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessible={true}
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
    >
      <Text style={{ color, fontSize, fontWeight: '500' }}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

// Icon-only button
interface IconButtonProps {
  icon: string;
  onPress: () => void;
  size?: number;
  color?: string;
  backgroundColor?: string;
  disabled?: boolean;
  accessibilityLabel: string;
  accessibilityHint?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onPress,
  size = 44,
  color = Colors.textPrimary,
  backgroundColor = Colors.glass,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text style={{ fontSize: size * 0.45, color }}>
        {icon}
      </Text>
    </TouchableOpacity>
  );
};

export default Button;
