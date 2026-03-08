// ============================================================================
// LOADING SKELETON COMPONENT
// Provides visual feedback while data is loading
// ============================================================================

import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Colors, Spacing, BorderRadius } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';

interface LoadingSkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function LoadingSkeleton({
  width = '100%',
  height = 20,
  borderRadius: radius = 8,
  style
}: LoadingSkeletonProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius: radius,
          opacity,
        },
        style,
      ]}
    />
  );
}

// Predefined skeleton layouts for common patterns
export function MedicationCardSkeleton() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.cardSkeleton}>
      <View style={styles.cardHeader}>
        <LoadingSkeleton width={56} height={56} borderRadius={14} />
        <View style={styles.cardInfo}>
          <LoadingSkeleton width="60%" height={18} />
          <LoadingSkeleton width="40%" height={14} style={{ marginTop: 6 }} />
          <LoadingSkeleton width="50%" height={12} style={{ marginTop: 4 }} />
        </View>
      </View>
      <View style={styles.cardFooter}>
        <LoadingSkeleton width="30%" height={12} />
        <LoadingSkeleton width="20%" height={12} />
      </View>
    </View>
  );
}

export function AppointmentCardSkeleton() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.cardSkeleton}>
      <View style={styles.appointmentHeader}>
        <LoadingSkeleton width={60} height={60} borderRadius={12} />
        <View style={styles.cardInfo}>
          <LoadingSkeleton width="70%" height={18} />
          <LoadingSkeleton width="50%" height={14} style={{ marginTop: 6 }} />
          <LoadingSkeleton width="60%" height={12} style={{ marginTop: 4 }} />
        </View>
      </View>
    </View>
  );
}

export function ListItemSkeleton() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.listItemSkeleton}>
      <LoadingSkeleton width={40} height={40} borderRadius={20} />
      <View style={styles.listItemInfo}>
        <LoadingSkeleton width="70%" height={16} />
        <LoadingSkeleton width="50%" height={12} style={{ marginTop: 6 }} />
      </View>
      <LoadingSkeleton width={20} height={20} borderRadius={10} />
    </View>
  );
}

export function LoadingScreen({ message = 'Loading...' }: { message?: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.loadingScreen}>
      <LoadingSkeleton width={100} height={100} borderRadius={50} />
      <LoadingSkeleton width={200} height={20} style={{ marginTop: 20 }} />
      {message && <LoadingSkeleton width={150} height={14} style={{ marginTop: 10 }} />}
    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  skeleton: {
    backgroundColor: c.surface,
  },

  cardSkeleton: {
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },

  cardHeader: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },

  cardInfo: {
    flex: 1,
  },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },

  appointmentHeader: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },

  listItemSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },

  listItemInfo: {
    flex: 1,
  },

  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.background,
    padding: Spacing.xl,
  },
});
