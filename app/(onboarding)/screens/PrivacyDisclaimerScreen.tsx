// ============================================================================
// PRIVACY + DISCLAIMER SCREEN - Combined privacy & medical disclaimer
// Screen 3 of 4: Checkbox must be checked before parent enables Next
// ============================================================================

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Linking, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AuroraBackground } from '../components/AuroraBackground';
import { Colors, Spacing, BorderRadius } from '../../../theme/theme-tokens';
import { useTheme } from '../../../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  onDisclaimerAccepted: (accepted: boolean) => void;
}

const PRIVACY_POINTS = [
  { icon: '\u{1F4F1}', label: 'Stays on your phone', desc: 'Nothing is uploaded \u2014 no accounts, no cloud' },
  { icon: '\u{1F510}', label: 'Encrypted storage', desc: 'Protected like your online banking' },
  { icon: '\u270B', label: 'You choose what to share', desc: 'Journal and reports only go where you send them' },
  { icon: '\u{1F6AB}', label: 'No ads, no data selling', desc: 'Ever' },
];

export const PrivacyDisclaimerScreen: React.FC<Props> = ({ onDisclaimerAccepted }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [accepted, setAccepted] = useState(false);

  const toggleAccepted = () => {
    const newValue = !accepted;
    setAccepted(newValue);
    onDisclaimerAccepted(newValue);
  };

  return (
    <View style={styles.container}>
      <AuroraBackground variant="welcome" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.Text entering={FadeInDown.delay(100).duration(300)} style={styles.emoji}>
          {'\u{1F512}'}
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(200).duration(300)} style={styles.title}>
          Your family's health{'\n'}data is safe here.
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(250).duration(300)} style={styles.subtitle}>
          Here's how we protect it.
        </Animated.Text>

        {/* Privacy points */}
        <View style={styles.privacyContainer}>
          {PRIVACY_POINTS.map((point, index) => (
            <Animated.View
              key={index}
              entering={FadeInDown.delay(300 + index * 80).duration(300)}
              style={styles.privacyRow}
            >
              <Text style={styles.privacyIcon}>{point.icon}</Text>
              <View style={styles.privacyTextContainer}>
                <Text style={styles.privacyLabel}>{point.label}</Text>
                <Text style={styles.privacyDesc}>{point.desc}</Text>
              </View>
            </Animated.View>
          ))}
        </View>

        {/* Medical disclaimer */}
        <Animated.View entering={FadeInDown.delay(650).duration(300)} style={styles.disclaimerCard}>
          <Text style={styles.disclaimerText}>
            <Text style={styles.disclaimerBold}>Not a medical device.</Text> EmberMate is a personal tracking tool {'\u2014'} not a substitute for professional medical advice.
          </Text>
        </Animated.View>

        {/* Checkbox */}
        <Animated.View entering={FadeInDown.delay(750).duration(300)} style={styles.checkboxContainer}>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={toggleAccepted}
            activeOpacity={0.7}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: accepted }}
            accessibilityLabel="I understand and accept the terms of use"
          >
            <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
              {accepted && <Text style={styles.checkmark}>{'\u2713'}</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              I understand and accept the{' '}
              <Text
                style={styles.link}
                onPress={() => Linking.openURL('https://www.ysorallc.org/terms')}
              >
                terms of use
              </Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
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
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingBottom: 120,
    paddingTop: 80,
  },
  emoji: {
    fontSize: 56,
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 22,
    fontWeight: '300',
    color: c.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  subtitle: {
    fontSize: 15,
    color: c.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
  },
  privacyContainer: {
    width: '100%',
    gap: 16,
    marginBottom: Spacing.xxl,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  privacyIcon: {
    fontSize: 24,
    marginTop: 2,
  },
  privacyTextContainer: {
    flex: 1,
  },
  privacyLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 2,
  },
  privacyDesc: {
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 18,
  },
  disclaimerCard: {
    width: '100%',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xxl,
  },
  disclaimerText: {
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 20,
  },
  disclaimerBold: {
    fontWeight: '700',
    color: c.amber,
  },
  checkboxContainer: {
    width: '100%',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: c.textPlaceholder,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: c.accent,
    borderColor: c.accent,
  },
  checkmark: {
    fontSize: 14,
    fontWeight: '700',
    color: c.textPrimary,
  },
  checkboxLabel: {
    fontSize: 13,
    color: c.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  link: {
    color: c.accent,
    textDecorationLine: 'underline',
  },
});

export default PrivacyDisclaimerScreen;
