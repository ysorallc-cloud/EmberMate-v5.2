import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type AuroraVariant = 'today' | 'now' | 'journal' | 'hub' | 'log' | 'care' | 'reports' | 'settings' | 'family' | 'insights' | 'connect';

interface Props {
  variant?: AuroraVariant;
}

const AURORA_CONFIGS: Record<AuroraVariant, {
  colors: [string, string, string];
}> = {
  today: {
    colors: [
      'rgba(42, 90, 60, 0.45)',    // Forest green wash
      'rgba(30, 60, 50, 0.20)',    // Deep forest
      'transparent',
    ],
  },
  now: {
    colors: [
      'rgba(42, 90, 60, 0.45)',    // Forest green wash
      'rgba(30, 60, 50, 0.20)',
      'transparent',
    ],
  },
  journal: {
    colors: [
      'rgba(80, 60, 140, 0.45)',   // Purple
      'rgba(40, 80, 120, 0.2)',    // Blue
      'transparent',
    ],
  },
  hub: {
    colors: [
      'rgba(60, 60, 140, 0.45)',   // Purple-blue
      'rgba(40, 80, 100, 0.2)',    // Teal-blue
      'transparent',
    ],
  },
  log: {
    colors: [
      'rgba(100, 80, 30, 0.4)',    // Amber/orange
      'rgba(40, 80, 60, 0.2)',     // Green-teal
      'transparent',
    ],
  },
  care: {
    colors: [
      'rgba(100, 60, 100, 0.4)',   // Rose/purple
      'rgba(60, 60, 100, 0.25)',   // Purple
      'transparent',
    ],
  },
  reports: {
    colors: [
      'rgba(80, 60, 140, 0.45)',   // Purple
      'rgba(40, 80, 120, 0.2)',    // Blue
      'transparent',
    ],
  },
  settings: {
    colors: [
      'rgba(50, 60, 80, 0.3)',     // Blue-gray
      'rgba(40, 50, 70, 0.15)',    // Darker blue-gray
      'transparent',
    ],
  },
  family: {
    colors: [
      'rgba(100, 60, 100, 0.4)',   // Rose/purple (same as care)
      'rgba(60, 60, 100, 0.25)',   // Purple
      'transparent',
    ],
  },
  insights: {
    colors: [
      'rgba(80, 60, 140, 0.45)',   // Purple (same as reports)
      'rgba(40, 80, 120, 0.2)',    // Blue
      'transparent',
    ],
  },
  connect: {
    colors: [
      'rgba(100, 60, 100, 0.4)',   // Rose/purple
      'rgba(60, 60, 100, 0.25)',   // Purple
      'transparent',
    ],
  },
};

// Light theme: subtle static gradients (no animation)
const LIGHT_AURORA_CONFIGS: Record<AuroraVariant, {
  colors: [string, string, string];
}> = {
  today: { colors: ['rgba(96, 165, 250, 0.06)', 'rgba(96, 165, 250, 0.02)', 'transparent'] },
  now: { colors: ['rgba(96, 165, 250, 0.06)', 'rgba(96, 165, 250, 0.02)', 'transparent'] },
  journal: { colors: ['rgba(124, 58, 237, 0.05)', 'rgba(37, 99, 235, 0.02)', 'transparent'] },
  hub: { colors: ['rgba(79, 70, 229, 0.05)', 'rgba(13, 148, 136, 0.02)', 'transparent'] },
  log: { colors: ['rgba(217, 119, 6, 0.05)', 'rgba(5, 150, 105, 0.02)', 'transparent'] },
  care: { colors: ['rgba(124, 58, 237, 0.04)', 'rgba(79, 70, 229, 0.02)', 'transparent'] },
  reports: { colors: ['rgba(124, 58, 237, 0.05)', 'rgba(37, 99, 235, 0.02)', 'transparent'] },
  settings: { colors: ['rgba(107, 114, 128, 0.04)', 'rgba(75, 85, 99, 0.02)', 'transparent'] },
  family: { colors: ['rgba(124, 58, 237, 0.04)', 'rgba(79, 70, 229, 0.02)', 'transparent'] },
  insights: { colors: ['rgba(124, 58, 237, 0.05)', 'rgba(37, 99, 235, 0.02)', 'transparent'] },
  connect: { colors: ['rgba(124, 58, 237, 0.04)', 'rgba(79, 70, 229, 0.02)', 'transparent'] },
};

export const AuroraBackground: React.FC<Props> = ({ variant = 'today' }) => {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

  // Safety check: fallback to 'today' if invalid variant
  const config = isLight
    ? (LIGHT_AURORA_CONFIGS[variant] || LIGHT_AURORA_CONFIGS.today)
    : (AURORA_CONFIGS[variant] || AURORA_CONFIGS.today);

  // Subtle animation (dark theme only)
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (isLight) return; // No animation in light theme

    translateX.value = withRepeat(
      withTiming(20, { duration: 8000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    translateY.value = withRepeat(
      withTiming(-15, { duration: 10000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    // Cleanup animations on unmount
    return () => {
      cancelAnimation(translateX);
      cancelAnimation(translateY);
    };
  }, [isLight]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  // Light theme: static gradient, no animation
  if (isLight) {
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <LinearGradient
          colors={config.colors}
          locations={[0, 0.4, 0.8]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[styles.primaryGradient, { position: 'absolute', top: 0, left: 0, right: 0, height: 350 }]}
        />
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Primary gradient - top glow */}
      <Animated.View style={[styles.primaryLayer, animatedStyle]}>
        <LinearGradient
          colors={config.colors}
          locations={[0, 0.4, 0.8]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.primaryGradient}
        />
      </Animated.View>

      {/* Secondary gradient - side accent */}
      <View style={styles.secondaryLayer}>
        <LinearGradient
          colors={[config.colors[1], 'transparent']}
          start={{ x: 0, y: 0.3 }}
          end={{ x: 1, y: 0.7 }}
          style={styles.secondaryGradient}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  primaryLayer: {
    position: 'absolute',
    top: -50,
    left: '-15%',
    right: '-15%',
    height: 500,
  },
  primaryGradient: {
    flex: 1,
    borderBottomLeftRadius: 200,
    borderBottomRightRadius: 200,
  },
  secondaryLayer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    height: 300,
  },
  secondaryGradient: {
    flex: 1,
    opacity: 0.6,
  },
});

export default AuroraBackground;
