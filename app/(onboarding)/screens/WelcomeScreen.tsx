// ============================================================================
// WELCOME SCREEN - Empathy-first introduction
// Screen 1 of 4: Lead with emotional connection, then value points
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AuroraBackground } from '../components/AuroraBackground';
import { Colors, Spacing } from '../../../theme/theme-tokens';
import { useTheme } from '../../../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const VALUE_POINTS = [
  { icon: '\u{1F48A}', text: 'Track medications, meals, and vitals in one place' },
  { icon: '\u{1F4CA}', text: 'Spot patterns a doctor visit might miss' },
  { icon: '\u{1F512}', text: 'Private — your data never leaves this device' },
];

export const WelcomeScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      <AuroraBackground variant="welcome" />
      <View style={styles.content}>
        <Animated.View entering={FadeInDown.delay(100).duration(300)}>
          <Image
            source={require('../../../assets/images/embermate-icon.png')}
            style={styles.appIcon}
            accessibilityLabel="EmberMate"
          />
        </Animated.View>
        <Animated.Text entering={FadeInDown.delay(200).duration(300)} style={styles.title}>
          Caring for someone{'\n'}is a lot to carry.
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(250).duration(300)} style={styles.subtitle}>
          EmberMate helps you stay organized so you can focus on what matters — being present.
        </Animated.Text>
        <View style={styles.pointsContainer}>
          {VALUE_POINTS.map((point, index) => (
            <Animated.View
              key={index}
              entering={FadeInDown.delay(300 + index * 100).duration(300)}
              style={styles.pointRow}
            >
              <Text style={styles.pointIcon}>{point.icon}</Text>
              <Text style={styles.pointText}>{point.text}</Text>
            </Animated.View>
          ))}
        </View>
      </View>
    </View>
  );
};

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flex: 1,
    width: SCREEN_WIDTH,
    backgroundColor: c.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingBottom: 100,
  },
  appIcon: {
    width: 88,
    height: 88,
    borderRadius: 20,
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 22,
    fontWeight: '300',
    color: c.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 15,
    color: c.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xxxl,
    paddingHorizontal: Spacing.md,
  },
  pointsContainer: {
    width: '100%',
    gap: 16,
    marginTop: Spacing.md,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pointIcon: {
    fontSize: 22,
  },
  pointText: {
    fontSize: 14,
    color: c.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
});

export default WelcomeScreen;
