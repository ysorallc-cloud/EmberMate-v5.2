import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';

interface Props {
  label: string;
  value: string;
  color: string;
  size?: number;
  accessibilityLabel?: string;
}

export const StatusOrb: React.FC<Props> = ({
  label,
  value,
  color,
  size = 90,
  accessibilityLabel: customAccessibilityLabel,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const fontSize = Math.max(14, size * 0.2);
  const labelSize = Math.max(9, size * 0.12);
  const defaultAccessibilityLabel = `${label}: ${value}`;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: `${color}12`,
          borderColor: `${color}30`,
        },
      ]}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={customAccessibilityLabel || defaultAccessibilityLabel}
    >
      <Text
        style={[styles.value, { fontSize, color }]}
        importantForAccessibility="no-hide-descendants"
      >
        {value}
      </Text>
      <Text
        style={[styles.label, { fontSize: labelSize }]}
        importantForAccessibility="no-hide-descendants"
      >
        {label}
      </Text>
    </View>
  );
};

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontWeight: '600',
  },
  label: {
    color: c.textMuted,
    marginTop: 2,
  },
});

export default StatusOrb;
