// ============================================================================
// INFO TOOLTIP - Contextual help overlay
// Shows explanatory text when users tap info icons or long-press elements
// ============================================================================

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
  ViewStyle,
} from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';

// ============================================================================
// TYPES
// ============================================================================

export interface InfoTooltipProps {
  /** The tooltip content text */
  content: string;

  /** Optional title for the tooltip */
  title?: string;

  /** Children to wrap (usually an info icon or the element itself) */
  children: React.ReactNode;

  /** Trigger type: 'press' for tap, 'longPress' for hold */
  trigger?: 'press' | 'longPress';

  /** Position preference (tooltip will adjust if near screen edge) */
  position?: 'top' | 'bottom' | 'auto';

  /** Whether the tooltip is disabled */
  disabled?: boolean;

  /** Additional style for the trigger wrapper */
  style?: ViewStyle;

  /** Accessibility label for the trigger */
  accessibilityLabel?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  content,
  title,
  children,
  trigger = 'press',
  position = 'auto',
  disabled = false,
  style,
  accessibilityLabel,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [visible, setVisible] = useState(false);

  const handleOpen = useCallback(() => {
    if (!disabled) {
      setVisible(true);
    }
  }, [disabled]);

  const handleClose = useCallback(() => {
    setVisible(false);
  }, []);

  const triggerProps = trigger === 'longPress'
    ? { onLongPress: handleOpen }
    : { onPress: handleOpen };

  return (
    <>
      <TouchableOpacity
        {...triggerProps}
        activeOpacity={0.7}
        style={style}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || 'Show info'}
        accessibilityHint={trigger === 'longPress' ? 'Long press for more information' : 'Tap for more information'}
      >
        {children}
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleClose}
        statusBarTranslucent
      >
        <Pressable
          style={styles.overlay}
          onPress={handleClose}
          accessibilityLabel="Close tooltip"
          accessibilityRole="button"
        >
          <Pressable
            style={styles.tooltipContainer}
            accessibilityRole="none"
            accessibilityLabel="Tooltip content"
          >
            <View style={styles.tooltip}>
              {title && (
                <Text style={styles.title}>{title}</Text>
              )}
              <Text style={styles.content}>{content}</Text>
              <TouchableOpacity
                style={styles.dismissButton}
                onPress={handleClose}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Dismiss"
              >
                <Text style={styles.dismissText}>Got it</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

// ============================================================================
// INFO ICON COMPONENT
// Pre-styled info icon that can be used with InfoTooltip
// ============================================================================

export interface InfoIconProps {
  size?: number;
  color?: string;
  style?: ViewStyle;
}

export const InfoIcon: React.FC<InfoIconProps> = ({
  size = 16,
  color = Colors.textMuted,
  style,
}) => {
  const { colors } = useTheme();
  const themedStyles = useMemo(() => createStyles(colors), [colors]);

  return (
  <View
    style={[
      themedStyles.infoIcon,
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        borderColor: color,
      },
      style,
    ]}
  >
    <Text style={[themedStyles.infoIconText, { fontSize: size * 0.65, color }]}>
      ?
    </Text>
  </View>
  );
};

// ============================================================================
// COMBINED INFO BUTTON
// InfoIcon wrapped with InfoTooltip for common use case
// ============================================================================

export interface InfoButtonProps extends Omit<InfoTooltipProps, 'children'> {
  iconSize?: number;
  iconColor?: string;
}

export const InfoButton: React.FC<InfoButtonProps> = ({
  iconSize = 16,
  iconColor = Colors.textMuted,
  ...tooltipProps
}) => (
  <InfoTooltip {...tooltipProps}>
    <InfoIcon size={iconSize} color={iconColor} />
  </InfoTooltip>
);

// ============================================================================
// STYLES
// ============================================================================

const createStyles = (c: typeof Colors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  tooltipContainer: {
    maxWidth: 320,
    width: '100%',
  },
  tooltip: {
    backgroundColor: c.menuSurface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: c.glassBorder,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: Spacing.sm,
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
    color: c.textSecondary,
  },
  dismissButton: {
    marginTop: Spacing.lg,
    alignSelf: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: c.accentLight,
    borderRadius: BorderRadius.sm,
  },
  dismissText: {
    fontSize: 14,
    fontWeight: '500',
    color: c.accent,
  },
  infoIcon: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIconText: {
    fontWeight: '700',
  },
});

export default InfoTooltip;
