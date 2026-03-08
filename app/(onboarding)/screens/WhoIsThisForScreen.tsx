// ============================================================================
// WHO IS THIS FOR SCREEN - Care mode selection
// Screen 2 of 4: Caregiver vs self-care — card tap auto-advances
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AuroraBackground } from '../components/AuroraBackground';
import { Colors, Spacing, BorderRadius } from '../../../theme/theme-tokens';
import { useTheme } from '../../../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  onSelectMode: (mode: 'caregiver' | 'self') => void;
}

export const WhoIsThisForScreen: React.FC<Props> = ({ onSelectMode }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      <AuroraBackground variant="welcome" />
      <View style={styles.content}>
        <Animated.Text entering={FadeInDown.delay(100).duration(300)} style={styles.title}>
          Who are you caring for?
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(200).duration(300)} style={styles.subtitle}>
          This helps us adjust the experience for you.
        </Animated.Text>

        <View style={styles.cardsContainer}>
          <Animated.View entering={FadeInDown.delay(300).duration(300)}>
            <TouchableOpacity
              style={styles.card}
              onPress={() => onSelectMode('caregiver')}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Someone I care for — a parent, partner, or loved one"
            >
              <Text style={styles.cardEmoji}>{'\u{1F468}\u200D\u{1F469}\u200D\u{1F467}'}</Text>
              <Text style={styles.cardTitle}>Someone I care for</Text>
              <Text style={styles.cardDesc}>A parent, partner, or loved one</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(400).duration(300)}>
            <TouchableOpacity
              style={styles.card}
              onPress={() => onSelectMode('self')}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Myself — I'm tracking my own health"
            >
              <Text style={styles.cardEmoji}>{'\u{1F64B}'}</Text>
              <Text style={styles.cardTitle}>Myself</Text>
              <Text style={styles.cardDesc}>I'm tracking my own health</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        <Animated.Text entering={FadeInDown.delay(500).duration(300)} style={styles.footer}>
          You can change this anytime in Settings.
        </Animated.Text>
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
  title: {
    fontSize: 26,
    fontWeight: '300',
    color: c.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  subtitle: {
    fontSize: 15,
    color: c.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xxxl,
  },
  cardsContainer: {
    width: '100%',
    gap: 16,
  },
  card: {
    width: '100%',
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  cardEmoji: {
    fontSize: 36,
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 14,
    color: c.textSecondary,
  },
  footer: {
    fontSize: 13,
    color: c.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.xxl,
  },
});

export default WhoIsThisForScreen;
