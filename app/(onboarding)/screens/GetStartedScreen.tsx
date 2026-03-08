// ============================================================================
// GET STARTED SCREEN - 4-step question flow + patient name
// Screen 4 of 4: Collects name, asks 4 questions, generates care plan
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AuroraBackground } from '../components/AuroraBackground';
import { Colors, Spacing, BorderRadius } from '../../../theme/theme-tokens';
import { useTheme } from '../../../contexts/ThemeContext';
import { updatePatient } from '../../../storage/patientRegistry';
import { saveCarePlanConfig } from '../../../storage/carePlanConfigRepo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageKeys } from '../../../utils/storageKeys';
import {
  generateCarePlanFromOnboarding,
  OnboardingAnswers,
  CareRelationship,
  CareArea,
  ConcernArea,
  CheckInCadence,
} from '../../../utils/onboardingToPlan';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TOTAL_STEPS = 5; // 0=name, 1-4=questions

// ── Step option definitions ──

const RELATIONSHIP_OPTIONS: { value: CareRelationship; label: string; icon: string }[] = [
  { value: 'parent', label: 'A parent', icon: '\uD83D\uDC75' },
  { value: 'spouse', label: 'My spouse/partner', icon: '\uD83D\uDC91' },
  { value: 'child', label: 'My child', icon: '\uD83D\uDC76' },
  { value: 'self', label: 'Myself', icon: '\uD83D\uDE4B' },
  { value: 'other', label: 'Someone else', icon: '\uD83E\uDD1D' },
];

const CARE_AREA_OPTIONS: { value: CareArea; label: string; icon: string }[] = [
  { value: 'medications', label: 'Medications', icon: '\uD83D\uDC8A' },
  { value: 'meals', label: 'Meals & nutrition', icon: '\uD83C\uDF7D\uFE0F' },
  { value: 'doctor_visits', label: 'Doctor visits', icon: '\uD83C\uDFE5' },
  { value: 'wellness', label: 'Daily wellness', icon: '\uD83C\uDF05' },
  { value: 'vitals', label: 'Vital signs', icon: '\u2764\uFE0F' },
];

const CONCERN_OPTIONS: { value: ConcernArea; label: string; icon: string }[] = [
  { value: 'missed_medication', label: 'A medication dose', icon: '\uD83D\uDC8A' },
  { value: 'symptom_change', label: 'A symptom change', icon: '\uD83E\uDD12' },
  { value: 'hydration', label: 'Hydration', icon: '\uD83D\uDCA7' },
  { value: 'sleep_patterns', label: 'Sleep patterns', icon: '\uD83D\uDCA4' },
  { value: 'weight_changes', label: 'Weight changes', icon: '\u2696\uFE0F' },
];

const CADENCE_OPTIONS: { value: CheckInCadence; label: string; desc: string }[] = [
  { value: 'morning_only', label: 'Morning only', desc: 'One check-in per day' },
  { value: 'morning_evening', label: 'Morning + Evening', desc: 'Start and end of day' },
  { value: 'three_times', label: 'Three times a day', desc: 'Morning, midday, evening' },
  { value: 'flexible', label: 'Flexible', desc: "I'll log when I can" },
];

// ── Component ──

interface Props {
  onComplete: (seedData: boolean) => void;
  careMode?: 'caregiver' | 'self';
}

export const GetStartedScreen: React.FC<Props> = ({ onComplete, careMode = 'caregiver' }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [step, setStep] = useState(0);
  const [patientName, setPatientName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  // Answer state
  const [relationship, setRelationship] = useState<CareRelationship | null>(null);
  const [careAreas, setCareAreas] = useState<CareArea[]>([]);
  const [concerns, setConcerns] = useState<ConcernArea[]>([]);
  const [cadence, setCadence] = useState<CheckInCadence | null>(null);

  const isSelf = careMode === 'self';

  const animateStep = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  const goNext = () => {
    animateStep();
    setStep(s => Math.min(s + 1, TOTAL_STEPS - 1));
  };

  const goBack = () => {
    animateStep();
    setStep(s => Math.max(s - 1, 0));
  };

  const toggleCareArea = (area: CareArea) => {
    setCareAreas(prev =>
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    );
  };

  const toggleConcern = (concern: ConcernArea) => {
    setConcerns(prev =>
      prev.includes(concern) ? prev.filter(c => c !== concern) : [...prev, concern]
    );
  };

  const handleComplete = async (seedData: boolean) => {
    setLoadingMessage(seedData ? 'Creating sample data...' : 'Setting things up...');
    setIsLoading(true);

    if (!seedData) {
      try {
        const name = patientName.trim() || 'Patient';
        await AsyncStorage.setItem(StorageKeys.PATIENT_NAME, name);
        await updatePatient('default', { name });

        // Generate personalized config from onboarding answers
        const fullAnswers: OnboardingAnswers = {
          relationship: relationship || (isSelf ? 'self' : 'parent'),
          careAreas: careAreas.length > 0 ? careAreas : ['medications', 'meals'],
          concerns: concerns.length > 0 ? concerns : ['missed_medication'],
          cadence: cadence || 'morning_evening',
        };

        const config = generateCarePlanFromOnboarding(fullAnswers);
        await saveCarePlanConfig(config);
      } catch {}
    }

    onComplete(seedData);
  };

  // ── Loading state ──
  if (isLoading) {
    return (
      <View style={styles.container}>
        <AuroraBackground variant="welcome" />
        <View style={styles.loadingOverlay}>
          <Image
            source={require('../../../assets/images/embermate-icon.png')}
            style={styles.loadingIcon}
            accessibilityLabel="EmberMate"
          />
          <ActivityIndicator size="large" color={colors.accent} style={styles.loadingSpinner} />
          <Text style={styles.loadingText}>{loadingMessage}</Text>
        </View>
      </View>
    );
  }

  // ── Progress dots ──
  const renderProgress = () => (
    <View style={styles.progressRow}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View key={i} style={[styles.progressDot, i <= step && styles.progressDotActive]} />
      ))}
    </View>
  );

  // ── Step 0: Name ──
  const renderNameStep = () => (
    <>
      <Animated.Text entering={FadeInDown.delay(100).duration(300)} style={styles.title}>
        Almost there.
      </Animated.Text>
      <Animated.View entering={FadeInDown.delay(150).duration(300)} style={styles.inputContainer}>
        <Text style={styles.inputLabel}>{isSelf ? 'Your name' : 'Their name'}</Text>
        <TextInput
          style={styles.input}
          placeholder={isSelf ? 'Your name' : 'e.g. Mom, Dad'}
          placeholderTextColor={colors.textSecondary}
          value={patientName}
          onChangeText={setPatientName}
          autoCapitalize="words"
          returnKeyType="done"
        />
      </Animated.View>
      <TouchableOpacity style={styles.nextBtn} onPress={goNext} activeOpacity={0.8}>
        <Text style={styles.nextBtnText}>Next</Text>
      </TouchableOpacity>
    </>
  );

  // ── Step 1: Relationship ──
  const renderRelationshipStep = () => (
    <>
      <Text style={styles.stepQuestion}>
        {isSelf ? 'Tell us about yourself' : 'Who are you caring for?'}
      </Text>
      {RELATIONSHIP_OPTIONS.map(opt => (
        <TouchableOpacity
          key={opt.value}
          style={[styles.singleCard, relationship === opt.value && styles.singleCardActive]}
          onPress={() => { setRelationship(opt.value); goNext(); }}
          activeOpacity={0.8}
        >
          <Text style={styles.cardIcon}>{opt.icon}</Text>
          <Text style={[styles.cardLabel, relationship === opt.value && styles.cardLabelActive]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </>
  );

  // ── Step 2: Care areas (multi) ──
  const renderCareAreasStep = () => (
    <>
      <Text style={styles.stepQuestion}>What do you help with most?</Text>
      <Text style={styles.stepHint}>Select all that apply</Text>
      <View style={styles.chipGrid}>
        {CARE_AREA_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.chip, careAreas.includes(opt.value) && styles.chipActive]}
            onPress={() => toggleCareArea(opt.value)}
            activeOpacity={0.8}
          >
            <Text style={styles.chipIcon}>{opt.icon}</Text>
            <Text style={[styles.chipLabel, careAreas.includes(opt.value) && styles.chipLabelActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity
        style={[styles.nextBtn, careAreas.length === 0 && styles.nextBtnDisabled]}
        onPress={goNext}
        disabled={careAreas.length === 0}
        activeOpacity={0.8}
      >
        <Text style={styles.nextBtnText}>Next</Text>
      </TouchableOpacity>
    </>
  );

  // ── Step 3: Concerns (multi) ──
  const renderConcernsStep = () => (
    <>
      <Text style={styles.stepQuestion}>What do you worry about missing?</Text>
      <Text style={styles.stepHint}>Select all that apply</Text>
      <View style={styles.chipGrid}>
        {CONCERN_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.chip, concerns.includes(opt.value) && styles.chipActive]}
            onPress={() => toggleConcern(opt.value)}
            activeOpacity={0.8}
          >
            <Text style={styles.chipIcon}>{opt.icon}</Text>
            <Text style={[styles.chipLabel, concerns.includes(opt.value) && styles.chipLabelActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity
        style={[styles.nextBtn, concerns.length === 0 && styles.nextBtnDisabled]}
        onPress={goNext}
        disabled={concerns.length === 0}
        activeOpacity={0.8}
      >
        <Text style={styles.nextBtnText}>Next</Text>
      </TouchableOpacity>
    </>
  );

  // ── Step 4: Cadence (single) + finish ──
  const renderCadenceStep = () => (
    <>
      <Text style={styles.stepQuestion}>When do you usually check in?</Text>
      {CADENCE_OPTIONS.map(opt => (
        <TouchableOpacity
          key={opt.value}
          style={[styles.singleCard, cadence === opt.value && styles.singleCardActive]}
          onPress={() => setCadence(opt.value)}
          activeOpacity={0.8}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardLabel, cadence === opt.value && styles.cardLabelActive]}>
              {opt.label}
            </Text>
            <Text style={styles.cardDesc}>{opt.desc}</Text>
          </View>
        </TouchableOpacity>
      ))}

      {cadence && (
        <>
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => handleComplete(false)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Start fresh with personalized tracking"
          >
            <Text style={styles.optionTitle}>Start Fresh</Text>
            <Text style={styles.optionSubtitle}>Begin tracking right away</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionCard, styles.optionCardSecondary]}
            onPress={() => handleComplete(true)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Explore with sample data"
          >
            <Text style={styles.optionTitle}>Explore with Sample Data</Text>
            <Text style={styles.optionSubtitle}>
              See 14 days of realistic data {'\u2014'} medications, vitals, and insights
            </Text>
          </TouchableOpacity>
        </>
      )}
    </>
  );

  return (
    <View style={styles.container}>
      <AuroraBackground variant="welcome" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {renderProgress()}

        {/* Back button for steps 1-4 */}
        {step > 0 && (
          <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.7}>
            <Text style={styles.backBtnText}>{'\u2190'} Back</Text>
          </TouchableOpacity>
        )}

        {step === 0 && renderNameStep()}
        {step === 1 && renderRelationshipStep()}
        {step === 2 && renderCareAreasStep()}
        {step === 3 && renderConcernsStep()}
        {step === 4 && renderCadenceStep()}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flex: 1,
    width: SCREEN_WIDTH,
    backgroundColor: c.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xxl,
    paddingTop: 60,
    paddingBottom: 40,
  },

  // Progress
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: Spacing.xl,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  progressDotActive: {
    backgroundColor: c.accent,
  },

  // Back
  backBtn: {
    marginBottom: Spacing.md,
  },
  backBtnText: {
    fontSize: 14,
    color: c.textSecondary,
  },

  // Step question
  stepQuestion: {
    fontSize: 22,
    fontWeight: '300',
    color: c.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  stepHint: {
    fontSize: 13,
    color: c.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },

  // Name step
  title: {
    fontSize: 26,
    fontWeight: '300',
    color: c.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  inputContainer: {
    marginBottom: Spacing.xl,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textSecondary,
    marginBottom: 6,
    textAlign: 'center',
  },
  input: {
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    fontSize: 16,
    color: c.textPrimary,
    textAlign: 'center',
  },

  // Single select card
  singleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  singleCardActive: {
    borderColor: c.accent,
    backgroundColor: 'rgba(20,184,166,0.08)',
  },
  cardIcon: {
    fontSize: 24,
  },
  cardLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: c.textPrimary,
  },
  cardLabelActive: {
    color: c.accent,
  },
  cardDesc: {
    fontSize: 12,
    color: c.textSecondary,
    marginTop: 2,
  },

  // Multi-select chip
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: 6,
  },
  chipActive: {
    borderColor: c.accent,
    backgroundColor: 'rgba(20,184,166,0.08)',
  },
  chipIcon: {
    fontSize: 16,
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: c.textSecondary,
  },
  chipLabelActive: {
    color: c.accent,
  },

  // Next button
  nextBtn: {
    backgroundColor: c.accent,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  nextBtnDisabled: {
    opacity: 0.4,
  },
  nextBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textPrimary,
  },

  // Finish options
  optionCard: {
    width: '100%',
    backgroundColor: c.accent,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  optionCardSecondary: {
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.border,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 13,
    color: c.textSecondary,
    textAlign: 'center',
  },

  // Loading overlay
  loadingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60,
  },
  loadingIcon: {
    width: 72,
    height: 72,
    borderRadius: 16,
    marginBottom: Spacing.xl,
  },
  loadingSpinner: {
    marginBottom: Spacing.lg,
  },
  loadingText: {
    fontSize: 16,
    color: c.textSecondary,
    fontWeight: '500',
  },
});

export default GetStartedScreen;
