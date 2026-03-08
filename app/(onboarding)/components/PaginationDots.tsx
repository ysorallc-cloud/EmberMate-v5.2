import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../../../theme/theme-tokens';
import { useTheme } from '../../../contexts/ThemeContext';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

interface Props {
  count: number;
  scrollX: Animated.SharedValue<number>;
  width: number;
}

interface DotProps {
  index: number;
  scrollX: Animated.SharedValue<number>;
  width: number;
}

const AnimatedDot: React.FC<DotProps> = ({ index, scrollX, width }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width,
    ];

    const dotWidth = interpolate(
      scrollX.value,
      inputRange,
      [8, 24, 8],
      Extrapolation.CLAMP
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.3, 1, 0.3],
      Extrapolation.CLAMP
    );

    return {
      width: dotWidth,
      opacity,
    };
  });

  return <Animated.View style={[styles.dot, animatedStyle]} />;
};

export const PaginationDots: React.FC<Props> = ({ count, scrollX, width }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <AnimatedDot key={index} index={index} scrollX={scrollX} width={width} />
      ))}
    </View>
  );
};

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: c.textPrimary,
  },
});

export default PaginationDots;
