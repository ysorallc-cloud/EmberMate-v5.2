// ============================================================================
// COFFEE MOMENT - Minimal Implementation (Enhanced)
// "This wasn't for the app. This was for you."
//
// Core principle: Friction-based, peripheral, zero-commitment
// - No tracking, no streaks, no "how did that feel?"
// - Silent return after completion
// - Tap anywhere to exit early
// - NOW includes: visual breathing guide + countdown + affirmation
// ============================================================================

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';

import { Colors } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';

const AFFIRMATIONS = [
  'You are doing an incredible job, even on the hard days.',
  'Taking care of yourself is taking care of those you love.',
  "It's okay to rest. You deserve moments of peace.",
  'Small steps forward are still progress worth celebrating.',
  'Your compassion is a gift to everyone around you.',
  'Every breath you take is an act of courage.',
];

// 4-4-4 box breathing: 4s inhale, 4s hold, 4s exhale = 12s per cycle
// 5 cycles = 60 seconds
const PHASE_DURATION = 4; // seconds per phase
type BreathPhase = 'inhale' | 'hold' | 'exhale';

const PHASE_LABELS: Record<BreathPhase, string> = {
  inhale: 'Breathe in',
  hold: 'Hold',
  exhale: 'Breathe out',
};

interface CoffeeMomentMinimalProps {
  visible: boolean;
  onClose: () => void;
  microcopy?: string;
  duration?: number;
}

export const CoffeeMomentMinimal: React.FC<CoffeeMomentMinimalProps> = ({
  visible,
  onClose,
  microcopy = 'Pause for a minute',
  duration = 60,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [secondsLeft, setSecondsLeft] = useState(duration);
  const [phase, setPhase] = useState<BreathPhase>('inhale');
  const [phaseSeconds, setPhaseSeconds] = useState(PHASE_DURATION);
  const [affirmation] = useState(
    AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)]
  );

  // Breathing orb animation
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const orbOpacity = useRef(new Animated.Value(0.3)).current;

  // Reset everything when modal opens
  useEffect(() => {
    if (visible) {
      setSecondsLeft(duration);
      setPhase('inhale');
      setPhaseSeconds(PHASE_DURATION);
      scaleAnim.setValue(0.6);
      orbOpacity.setValue(0.3);
    }
  }, [visible, duration]);

  // Main countdown timer (1 tick/second)
  useEffect(() => {
    if (!visible) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });

      // Phase timer
      setPhaseSeconds((prev) => {
        if (prev <= 1) {
          // Advance to next phase
          setPhase((currentPhase) => {
            if (currentPhase === 'inhale') return 'hold';
            if (currentPhase === 'hold') return 'exhale';
            return 'inhale'; // exhale -> inhale
          });
          return PHASE_DURATION;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [visible]);

  // Animate orb based on breath phase
  useEffect(() => {
    if (!visible) return;

    if (phase === 'inhale') {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1.0,
          duration: PHASE_DURATION * 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(orbOpacity, {
          toValue: 0.8,
          duration: PHASE_DURATION * 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    } else if (phase === 'hold') {
      // Stay at current size — no animation needed
    } else if (phase === 'exhale') {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.6,
          duration: PHASE_DURATION * 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(orbOpacity, {
          toValue: 0.3,
          duration: PHASE_DURATION * 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [phase, visible]);

  // Countdown ring dimensions
  const ringSize = 200;
  const strokeWidth = 3;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = secondsLeft / duration;
  const strokeDashoffset = circumference * (1 - progress);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleExit = () => {
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleExit}
    >
      <Pressable
        style={styles.container}
        onPress={handleExit}
        accessibilityLabel="Dismiss breathing exercise"
        accessibilityRole="button"
      >
        <LinearGradient
          colors={['#0d1f1c', '#0a0f14']}
          style={styles.gradient}
        >
          {/* Close button */}
          <TouchableOpacity
            onPress={handleExit}
            style={{
              position: 'absolute',
              top: 60,
              right: 20,
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: 'rgba(255,255,255,0.08)',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
            accessibilityLabel="Close breathing exercise"
            accessibilityRole="button"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>{'\u2715'}</Text>
          </TouchableOpacity>

          {/* Microcopy — permission, not invitation */}
          <Text style={styles.microcopy}>{microcopy}</Text>

          {/* Breathing guide — orb inside countdown ring */}
          <View style={styles.breathingArea}>
            {/* Countdown ring (SVG) */}
            <Svg
              width={ringSize}
              height={ringSize}
              style={styles.countdownRing}
            >
              {/* Background track */}
              <Circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.04)"
                strokeWidth={strokeWidth}
              />
              {/* Progress arc */}
              <Circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={radius}
                fill="none"
                stroke="rgba(20, 184, 166, 0.3)"
                strokeWidth={strokeWidth}
                strokeDasharray={`${circumference}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
              />
            </Svg>

            {/* Breathing orb (animated) */}
            <Animated.View
              style={[
                styles.breathingOrb,
                {
                  transform: [{ scale: scaleAnim }],
                  opacity: orbOpacity,
                },
              ]}
            />

            {/* Center text — phase + countdown */}
            <View style={styles.centerText}>
              <Text style={styles.phaseText}>{PHASE_LABELS[phase]}</Text>
              <Text style={styles.phaseTimer}>{phaseSeconds}</Text>
            </View>
          </View>

          {/* Overall timer */}
          <Text style={styles.timer}>{formatTime(secondsLeft)}</Text>

          {/* Affirmation */}
          <Text style={styles.affirmation}>{affirmation}</Text>

          {/* Tap to dismiss hint */}
          <Text style={styles.dismissHint}>Tap anywhere to return</Text>
        </LinearGradient>
      </Pressable>
    </Modal>
  );
};

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  microcopy: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: 40,
  },

  // Breathing area — positions ring and orb concentrically
  breathingArea: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  countdownRing: {
    position: 'absolute',
  },
  breathingOrb: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.25)',
  },
  centerText: {
    alignItems: 'center',
    zIndex: 1,
  },
  phaseText: {
    fontSize: 15,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  phaseTimer: {
    fontSize: 36,
    fontWeight: '200',
    color: 'rgba(20, 184, 166, 0.9)',
  },

  // Overall timer
  timer: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
    marginBottom: 24,
  },

  // Affirmation
  affirmation: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 22,
    fontStyle: 'italic',
    paddingHorizontal: 20,
    marginBottom: 40,
  },

  // Dismiss hint
  dismissHint: {
    position: 'absolute',
    bottom: 50,
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    overflow: 'hidden',
  },
});

export default CoffeeMomentMinimal;
