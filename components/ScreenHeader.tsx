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
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 16,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.glassBorder,
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
    fontSize: 32,
    fontWeight: '300',
    color: c.textPrimary,
    marginBottom: 0,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: c.textTertiary,
    letterSpacing: 0.2,
    marginTop: 6,
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
