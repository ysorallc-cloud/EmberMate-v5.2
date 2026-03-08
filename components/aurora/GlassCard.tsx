import React, { useMemo } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Colors, BorderRadius, Spacing } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  glow?: string;         // Color for glow effect
  padding?: number;      // Override default padding
  noPadding?: boolean;   // Remove padding entirely
  // Accessibility props
  accessible?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'none' | 'button' | 'link' | 'search' | 'image' | 'text' | 'adjustable' | 'header' | 'summary' | 'alert';
}

export const GlassCard: React.FC<Props> = ({
  children,
  style,
  glow,
  padding,
  noPadding = false,
  accessible,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const cardPadding = noPadding ? 0 : (padding ?? Spacing.xl);

  return (
    <View
      style={[
        styles.container,
        glow && {
          shadowColor: glow,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.4,
          shadowRadius: 20,
          elevation: 8,
        },
        style,
      ]}
      accessible={accessible}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole={accessibilityRole}
    >
      {/* Content */}
      <View style={[styles.content, { padding: cardPadding }]}>
        {children}
      </View>
    </View>
  );
};

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: c.glassBorder,
    backgroundColor: c.glass,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.20,
    shadowRadius: 12,
    elevation: 4,
  },
  content: {
    // Padding applied dynamically
  },
});

export default GlassCard;
