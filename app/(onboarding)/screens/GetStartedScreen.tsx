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
import { getActiveCarePlan, createCarePlan, upsertCarePlanItem } from '../../../storage/carePlanRepo';
import { generateUniqueId } from '../../../utils/idGenerator';
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
import type { CarePlanItem } from '../../../types/carePlan';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TOTAL_STEPS = 6; // 0=name, 1-4=questions, 5=first medication

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

const MED_FREQ_OPTIONS: { value: 'once' | 'twice' | 'three'; label: string }[] = [
  { value: 'once', label: 'Morning' },
  { value: 'twice', label: 'Twice daily' },
  { value: 'three', label: 'Three times' },
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

  // First medication step
  const [medName, setMedName] = useState('');
  const [medFreq, setMedFreq] = useState<'once' | 'twice' | 'three'>('once');
  const [mealReminders, setMealReminders] = useState(true);
  const [medAdded, setMedAdded] = useState(false);
  const [medSkipped, setMedSkipped] = useState(false);

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

  const saveFirstMedication = async (carePlanId: string) => {
    const name = medName.trim();
    if (!name) return;

    const timeWindows = medFreq === 'three'
      ? [
          { id: generateUniqueId(), kind: 'window' as const, label: 'morning' as const },
          { id: generateUniqueId(), kind: 'window' as const, label: 'afternoon' as const },
          { id: generateUniqueId(), kind: 'window' as const, label: 'evening' as const },
        ]
      : medFreq === 'twice'
      ? [
          { id: generateUniqueId(), kind: 'window' as const, label: 'morning' as const },
          { id: generateUniqueId(), kind: 'window' as const, label: 'evening' as const },
        ]
      : [{ id: generateUniqueId(), kind: 'window' as const, label: 'morning' as const }];

    const now = new Date().toISOString();
    const item: CarePlanItem = {
      id: generateUniqueId(),
      carePlanId,
      type: 'medication',
      name,
      priority: 'required',
      active: true,
      emoji: '\uD83D\uDC8A',
      schedule: { frequency: 'daily', times: timeWindows },
      medicationDetails: { dose: '', unit: '', route: 'oral' },
      createdAt: now,
      updatedAt: now,
    };
    await upsertCarePlanItem(item);
  };

  const saveMealReminders = async (carePlanId: string) => {
    const now = new Date().toISOString();
    const meals = [
      { name: 'Breakfast', label: 'morning' as const, emoji: '\uD83C\uDF73' },
      { name: 'Lunch', label: 'afternoon' as const, emoji: '\uD83C\uDF7D\uFE0F' },
      { name: 'Dinner', label: 'evening' as const, emoji: '\uD83C\uDF5D' },
    ];
    for (const meal of meals) {
      const item: CarePlanItem = {
        id: generateUniqueId(),
        carePlanId,
        type: 'nutrition',
        name: meal.name,
        priority: 'recommended',
        active: true,
        emoji: meal.emoji,
        schedule: {
          frequency: 'daily',
          times: [{ id: generateUniqueId(), kind: 'window', label: meal.label }],
        },
        nutritionDetails: { mealType: meal.name.toLowerCase() },
        createdAt: now,
        updatedAt: now,
      };
      await upsertCarePlanItem(item);
    }
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

        // Create care plan and add first items
        let plan = await getActiveCarePlan();
        if (!plan) plan = await createCarePlan();

        if (medAdded && medName.trim()) {
          await saveFirstMedication(plan.id);
        }
        if (mealReminders && careAreas.includes('meals')) {
          await saveMealReminders(plan.id);
        }
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

  // ── Step 4: Cadence (single) ──
  const renderCadenceStep = () => (
    <>
      <Text style={styles.stepQuestion}>When do you usually check in?</Text>
      {CADENCE_OPTIONS.map(opt => (
        <TouchableOpacity
          key={opt.value}
          style={[styles.singleCard, cadence === opt.value && styles.singleCardActive]}
          onPress={() => { setCadence(opt.value); goNext(); }}
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
    </>
  );

  // ── Step 5: First medication (skippable) + finish ──
  const showMedsPrompt = careAreas.includes('medications');
  const showMealsPrompt = careAreas.includes('meals');

  const handleAddMed = () => {
    if (medName.trim()) {
      setMedAdded(true);
    }
  };

  const renderFirstMedStep = () => (
    <>
      {showMedsPrompt && !medAdded && !medSkipped && (
        <>
          <Text style={styles.stepQuestion}>
            {isSelf ? "Let's add your most important one" : "Let's add the most important one"}
          </Text>
          <Text style={styles.stepHint}>You can add more anytime in Care Plan</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Medication name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Lisinopril, Metformin"
              placeholderTextColor={colors.textSecondary}
              value={medName}
              onChangeText={setMedName}
              autoCapitalize="words"
              returnKeyType="done"
            />
          </View>

          <Text style={[styles.inputLabel, { textAlign: 'center', marginBottom: 8 }]}>How often?</Text>
          <View style={styles.freqRow}>
            {MED_FREQ_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, medFreq === opt.value && styles.chipActive]}
                onPress={() => setMedFreq(opt.value)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipLabel, medFreq === opt.value && styles.chipLabelActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.nextBtn, !medName.trim() && styles.nextBtnDisabled]}
            onPress={handleAddMed}
            disabled={!medName.trim()}
            activeOpacity={0.8}
          >
            <Text style={styles.nextBtnText}>Add</Text>
          </TouchableOpacity>
        </>
      )}

      {showMedsPrompt && medAdded && (
        <Animated.View entering={FadeInDown.duration(300)} style={styles.medAddedCard}>
          <Text style={styles.medAddedEmoji}>{'\uD83D\uDC8A'}</Text>
          <Text style={[styles.cardLabel, { color: colors.accent }]}>
            {medName} added
          </Text>
          <Text style={styles.cardDesc}>
            {medFreq === 'once' ? 'Morning' : medFreq === 'twice' ? 'Twice daily' : 'Three times a day'}
          </Text>
        </Animated.View>
      )}

      {showMealsPrompt && (
        <TouchableOpacity
          style={[styles.mealToggle, mealReminders && styles.mealToggleActive]}
          onPress={() => setMealReminders(!mealReminders)}
          activeOpacity={0.8}
        >
          <Text style={styles.chipIcon}>{'\uD83C\uDF7D\uFE0F'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardLabel, mealReminders && { color: colors.accent }]}>
              Meal reminders
            </Text>
            <Text style={styles.cardDesc}>Breakfast, lunch, and dinner</Text>
          </View>
          <View style={[styles.toggleDot, mealReminders && styles.toggleDotActive]} />
        </TouchableOpacity>
      )}

      {!showMedsPrompt && !showMealsPrompt && (
        <Text style={styles.stepQuestion}>You're all set!</Text>
      )}

      {(medAdded || medSkipped || !showMedsPrompt) && (
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

      {showMedsPrompt && !medAdded && !medSkipped && (
        <TouchableOpacity
          style={styles.skipLink}
          onPress={() => setMedSkipped(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.skipLinkText}>Skip for now</Text>
        </TouchableOpacity>
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
        {step === 5 && renderFirstMedStep()}

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
    backgroundColor: c.accentGlow,
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
    backgroundColor: c.accentGlow,
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

  // First med step
  freqRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  medAddedCard: {
    alignItems: 'center',
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.accent,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: 4,
  },
  medAddedEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  mealToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  mealToggleActive: {
    borderColor: c.accent,
    backgroundColor: c.accentGlow,
  },
  toggleDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: c.border,
  },
  toggleDotActive: {
    borderColor: c.accent,
    backgroundColor: c.accent,
  },
  skipLink: {
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  skipLinkText: {
    fontSize: 14,
    color: c.textSecondary,
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
