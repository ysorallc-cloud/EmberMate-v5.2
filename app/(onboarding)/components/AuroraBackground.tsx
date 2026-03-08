import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';

export type OnboardingAuroraVariant = 'welcome' | 'track' | 'understand' | 'connect' | 'coffee';

interface Props {
  variant: OnboardingAuroraVariant;
}

const AURORA_CONFIGS: Record<OnboardingAuroraVariant, {
  colors: [string, string, string];
}> = {
  welcome: {
    colors: [
      'rgba(20, 120, 100, 0.5)',   // Teal
      'rgba(40, 80, 100, 0.25)',   // Blue-teal
      'transparent',
    ],
  },
  track: {
    colors: [
      'rgba(40, 100, 60, 0.45)',   // Green-teal
      'rgba(30, 80, 70, 0.2)',     // Darker green
      'transparent',
    ],
  },
  understand: {
    colors: [
      'rgba(80, 60, 140, 0.45)',   // Purple
      'rgba(60, 60, 100, 0.25)',   // Purple-blue
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
  coffee: {
    colors: [
      'rgba(100, 80, 30, 0.4)',    // Amber/orange
      'rgba(60, 50, 30, 0.2)',     // Warm brown
      'transparent',
    ],
  },
};

export const AuroraBackground: React.FC<Props> = ({ variant }) => {
  const config = AURORA_CONFIGS[variant];

  // Subtle animation
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
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

    return () => {
      cancelAnimation(translateX);
      cancelAnimation(translateY);
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

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
    height: 450,
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
