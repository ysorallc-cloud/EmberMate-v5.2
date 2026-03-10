// ============================================================================
// SUB-SCREEN HEADER
// Standardized header for all non-tab screens (log forms, settings, reports)
// Uses BackButton with icon variant for consistent navigation
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Colors } from '../theme/theme-tokens';
import { BackButton } from './common/BackButton';

interface SubScreenHeaderProps {
  title: string;
  subtitle?: string;
  emoji?: string;
  rightAction?: React.ReactNode;
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '300',
    color: c.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: c.textTertiary,
    marginTop: 2,
  },
  emoji: {
    fontSize: 24,
  },
});

export const SubScreenHeader: React.FC<SubScreenHeaderProps> = ({
  title,
  subtitle,
  emoji,
  rightAction,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container} accessibilityRole="header">
      <BackButton variant="icon" />
      <View style={styles.titleBlock}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
      </View>
      {emoji && !rightAction && <Text style={styles.emoji}>{emoji}</Text>}
      {rightAction}
    </View>
  );
};

export default SubScreenHeader;
