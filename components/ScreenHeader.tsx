import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  purpose?: string;
  style?: ViewStyle;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    marginBottom: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: c.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: c.textMuted,
    letterSpacing: 0.2,
    marginTop: 4,
  },
  leftAction: {
    marginBottom: 8,
  },
  rightAction: {
    paddingTop: 2,
    paddingLeft: 12,
  },
  purpose: {
    fontSize: 12,
    color: c.textSecondary,
    marginTop: 3,
    letterSpacing: 0.1,
  },
});

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  purpose,
  style,
  leftAction,
  rightAction,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.container, style]}>
      {leftAction && (
        <View style={styles.leftAction}>
          {leftAction}
        </View>
      )}
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          {purpose && <Text style={styles.purpose}>{purpose}</Text>}
        </View>
        {rightAction && (
          <View style={styles.rightAction}>
            {rightAction}
          </View>
        )}
      </View>
    </View>
  );
};

export default ScreenHeader;
