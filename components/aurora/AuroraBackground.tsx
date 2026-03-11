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
      'rgba(42, 70, 55, 0.40)',    // Forest green
      'rgba(35, 60, 50, 0.18)',    // Deep forest
      'transparent',
    ],
  },
  hub: {
    colors: [
      'rgba(42, 70, 55, 0.40)',    // Forest green
      'rgba(35, 60, 50, 0.18)',    // Deep forest
      'transparent',
    ],
  },
  log: {
    colors: [
      'rgba(70, 80, 40, 0.35)',    // Olive green
      'rgba(40, 65, 45, 0.18)',    // Deep forest
      'transparent',
    ],
  },
  care: {
    colors: [
      'rgba(50, 80, 55, 0.35)',    // Forest green
      'rgba(35, 60, 50, 0.18)',    // Deep forest
      'transparent',
    ],
  },
  reports: {
    colors: [
      'rgba(42, 70, 55, 0.40)',    // Forest green
      'rgba(35, 60, 50, 0.18)',    // Deep forest
      'transparent',
    ],
  },
  settings: {
    colors: [
      'rgba(35, 55, 45, 0.25)',    // Muted forest
      'rgba(30, 50, 40, 0.12)',    // Deep forest
      'transparent',
    ],
  },
  family: {
    colors: [
      'rgba(50, 80, 55, 0.35)',    // Forest green
      'rgba(35, 60, 50, 0.18)',    // Deep forest
      'transparent',
    ],
  },
  insights: {
    colors: [
      'rgba(42, 70, 55, 0.40)',    // Forest green
      'rgba(35, 60, 50, 0.18)',    // Deep forest
      'transparent',
    ],
  },
  connect: {
    colors: [
      'rgba(50, 80, 55, 0.35)',    // Forest green
      'rgba(35, 60, 50, 0.18)',    // Deep forest
      'transparent',
    ],
  },
};

// Light theme: subtle static gradients (no animation)
const LIGHT_AURORA_CONFIGS: Record<AuroraVariant, {
  colors: [string, string, string];
}> = {
  today: { colors: ['rgba(74, 107, 93, 0.06)', 'rgba(74, 107, 93, 0.02)', 'transparent'] },
  now: { colors: ['rgba(74, 107, 93, 0.06)', 'rgba(74, 107, 93, 0.02)', 'transparent'] },
  journal: { colors: ['rgba(74, 107, 93, 0.05)', 'rgba(74, 107, 93, 0.02)', 'transparent'] },
  hub: { colors: ['rgba(79, 70, 229, 0.05)', 'rgba(13, 148, 136, 0.02)', 'transparent'] },
  log: { colors: ['rgba(217, 119, 6, 0.05)', 'rgba(5, 150, 105, 0.02)', 'transparent'] },
  care: { colors: ['rgba(74, 107, 93, 0.04)', 'rgba(79, 70, 229, 0.02)', 'transparent'] },
  reports: { colors: ['rgba(74, 107, 93, 0.05)', 'rgba(74, 107, 93, 0.02)', 'transparent'] },
  settings: { colors: ['rgba(107, 114, 128, 0.04)', 'rgba(75, 85, 99, 0.02)', 'transparent'] },
  family: { colors: ['rgba(74, 107, 93, 0.04)', 'rgba(79, 70, 229, 0.02)', 'transparent'] },
  insights: { colors: ['rgba(74, 107, 93, 0.05)', 'rgba(74, 107, 93, 0.02)', 'transparent'] },
  connect: { colors: ['rgba(74, 107, 93, 0.04)', 'rgba(79, 70, 229, 0.02)', 'transparent'] },
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
