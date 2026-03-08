// ============================================================================
// LOG MEAL SCREEN
// Individual meal logging with meal type and optional description
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { navigateBack } from '../lib/navigate';
import { Colors, BorderRadius, Spacing } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import { saveDailyTracking, getDailyTracking } from '../utils/dailyTrackingStorage';
import { saveMealsLog, getTodayMealsLog, MealsLog } from '../utils/centralStorage';
import { hapticSuccess } from '../utils/hapticFeedback';
import { getTodayProgress, TodayProgress } from '../utils/rhythmStorage';
import { parseCarePlanContext, getCarePlanBannerText, getPreSelectionHints } from '../utils/carePlanRouting';
import { trackCarePlanProgress } from '../utils/carePlanStorage';
import { logInstanceCompletion, DEFAULT_PATIENT_ID } from '../storage/carePlanRepo';
import { emitDataUpdate } from '../lib/events';
import { EVENT } from '../lib/eventNames';
import { logError } from '../utils/devLog';
import { getTodayDateString } from '../services/carePlanGenerator';
import { emitMealEvent } from '../utils/eventEmitter';

const MEAL_TYPES = [
  { id: 'breakfast', label: 'Breakfast', icon: '🌅' },
  { id: 'lunch', label: 'Lunch', icon: '☀️' },
  { id: 'dinner', label: 'Dinner', icon: '🌙' },
  { id: 'snack', label: 'Snack', icon: '🍎' },
];

// Quick food suggestions per meal type
const QUICK_FOODS: Record<string, { label: string; icon: string }[]> = {
  breakfast: [
    { label: 'Eggs & Toast', icon: '🍳' },
    { label: 'Oatmeal', icon: '🥣' },
    { label: 'Cereal', icon: '🥣' },
    { label: 'Yogurt & Fruit', icon: '🫐' },
    { label: 'Smoothie', icon: '🥤' },
  ],
  lunch: [
    { label: 'Sandwich', icon: '🥪' },
    { label: 'Salad', icon: '🥗' },
    { label: 'Soup', icon: '🍲' },
    { label: 'Leftovers', icon: '📦' },
    { label: 'Fast Food', icon: '🍔' },
  ],
  dinner: [
    { label: 'Chicken & Veggies', icon: '🍗' },
    { label: 'Pasta', icon: '🍝' },
    { label: 'Rice & Protein', icon: '🍚' },
    { label: 'Takeout', icon: '🥡' },
    { label: 'Soup & Bread', icon: '🍞' },
  ],
  snack: [
    { label: 'Fruit', icon: '🍎' },
    { label: 'Nuts', icon: '🥜' },
    { label: 'Crackers', icon: '🍘' },
    { label: 'Protein Bar', icon: '🍫' },
    { label: 'Veggies & Dip', icon: '🥕' },
  ],
};

export default function LogMeal() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const params = useLocalSearchParams();

  // Parse CarePlan context from navigation params
  const carePlanContext = parseCarePlanContext(params as Record<string, string>);
  const isFromCarePlan = carePlanContext !== null;
  const preSelectionHints = carePlanContext ? getPreSelectionHints(carePlanContext) : null;

  const [selectedMeals, setSelectedMeals] = useState<string[]>([]);
  const [selectedFoods, setSelectedFoods] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<TodayProgress | null>(null);

  const today = getTodayDateString();

  // Load rhythm progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      const progressData = await getTodayProgress();
      setProgress(progressData);
    };
    loadProgress();
  }, []);

  // Pre-select meal type if passed via params or CarePlan context
  useEffect(() => {
    // First priority: explicit mealType param
    if (params.mealType) {
      setSelectedMeals([params.mealType as string]);
    }
    // Second priority: CarePlan context hints
    else if (preSelectionHints?.mealType) {
      const mealId = preSelectionHints.mealType.toLowerCase();
      if (MEAL_TYPES.some(m => m.id === mealId)) {
        setSelectedMeals([mealId]);
      }
    }
    loadExistingData();
  }, []);

  const loadExistingData = async () => {
    try {
      const existing = await getDailyTracking(today);
      if (existing?.meals) {
        const existingMeals: string[] = [];
        if (existing.meals.breakfast) existingMeals.push('breakfast');
        if (existing.meals.lunch) existingMeals.push('lunch');
        if (existing.meals.dinner) existingMeals.push('dinner');
        // Note: snack not stored in DailyTrackingLog.meals, but we still show it
        if (existingMeals.length > 0 && !params.mealType) {
          // Don't override if user came with a specific meal type
          setSelectedMeals(existingMeals);
        }
      }
    } catch (error) {
      logError('LogMeal.loadExistingData', error);
    }
  };

  const toggleMealType = (mealId: string) => {
    setSelectedMeals((prev) =>
      prev.includes(mealId)
        ? prev.filter((id) => id !== mealId)
        : [...prev, mealId]
    );
  };

  const toggleFood = (foodLabel: string) => {
    setSelectedFoods((prev) =>
      prev.includes(foodLabel)
        ? prev.filter((f) => f !== foodLabel)
        : [...prev, foodLabel]
    );
  };

  // Build combined description from quick picks + free text
  const getFullDescription = (): string => {
    const parts: string[] = [];
    if (selectedFoods.length > 0) parts.push(selectedFoods.join(', '));
    if (description.trim()) parts.push(description.trim());
    return parts.join(' — ');
  };

  // Get relevant quick food suggestions based on selected meal types
  const relevantFoods = selectedMeals.length > 0
    ? Array.from(new Map(
        selectedMeals.flatMap(m => QUICK_FOODS[m] || []).map(f => [f.label, f])
      ).values())
    : [];

  const handleSave = async () => {
    if (selectedMeals.length === 0) {
      Alert.alert('Select Meal', 'Please select at least one meal type');
      return;
    }

    setLoading(true);
    try {
      // Build meals object for dailyTrackingStorage
      const meals = {
        breakfast: selectedMeals.includes('breakfast'),
        lunch: selectedMeals.includes('lunch'),
        dinner: selectedMeals.includes('dinner'),
      };

      // If there's a description, we could save it to notes
      // For now, just save the meal tracking
      const updateData: { meals: typeof meals; notes?: string } = { meals };
      const fullDescription = getFullDescription();

      // Optionally append meal description to notes
      if (fullDescription) {
        const existing = await getDailyTracking(today);
        const existingNotes = existing?.notes || '';
        const mealNote = `[Meal] ${selectedMeals.join(', ')}: ${fullDescription}`;
        updateData.notes = existingNotes
          ? `${existingNotes}\n${mealNote}`
          : mealNote;
      }

      // Save to dailyTrackingStorage (legacy)
      await saveDailyTracking(today, updateData);

      // Also save to centralStorage for Now page sync
      // Convert meal IDs to display labels
      const mealLabels = selectedMeals.map(id => {
        const meal = MEAL_TYPES.find(m => m.id === id);
        return meal ? meal.label : id;
      });

      await saveMealsLog({
        timestamp: new Date().toISOString(),
        meals: mealLabels,
        description: fullDescription || undefined,
      });

      // Track CarePlan progress if navigated from CarePlan
      if (carePlanContext) {
        await trackCarePlanProgress(
          carePlanContext.routineId,
          carePlanContext.carePlanItemId,
          { logType: 'meals' }
        );
      }

      // Mark the daily care instance as completed (updates progress card)
      const instanceId = params.instanceId as string | undefined;
      if (instanceId) {
        try {
          await logInstanceCompletion(
            DEFAULT_PATIENT_ID,
            today,
            instanceId,
            'completed',
            { type: 'nutrition', mealType: selectedMeals.join(', ') },
            { source: 'record' }
          );
          emitDataUpdate(EVENT.DAILY_INSTANCES);
        } catch (err) {
          logError('LogMeal.completeInstance', err);
        }
      }

      try { for (const m of selectedMeals) { await emitMealEvent(m); } } catch {}
      await hapticSuccess();
      navigateBack();
    } catch (error) {
      logError('LogMeal.handleSave', error);
      Alert.alert('Error', 'Failed to save meal data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigateBack()}
                accessibilityLabel="Go back"
                accessibilityRole="button"
              >
                <Text style={styles.backIcon}>←</Text>
              </TouchableOpacity>
              <Text style={styles.title}>Log Meal</Text>
              <View style={{ width: 44 }} />
            </View>

            {/* CarePlan context banner */}
            {isFromCarePlan && carePlanContext && (
              <View style={[styles.contextBanner, styles.carePlanBanner]}>
                <Text style={styles.carePlanBannerLabel}>FROM CARE PLAN</Text>
                <Text style={styles.contextText}>
                  {getCarePlanBannerText(carePlanContext)}
                </Text>
              </View>
            )}

            {/* Rhythm context banner (fallback when not from CarePlan) */}
            {!isFromCarePlan && progress && progress.meals.expected > 0 && (
              <View style={styles.contextBanner}>
                <Text style={styles.contextText}>
                  {progress.meals.completed} of {progress.meals.expected} meals logged today
                </Text>
              </View>
            )}

            {/* Meal Type Selection */}
            <View style={styles.section}>
              <Text style={styles.label}>Meal Type</Text>
              <View style={styles.mealGrid}>
                {MEAL_TYPES.map((meal) => (
                  <TouchableOpacity
                    key={meal.id}
                    style={[
                      styles.mealCard,
                      selectedMeals.includes(meal.id) && styles.mealCardSelected,
                    ]}
                    onPress={() => toggleMealType(meal.id)}
                    accessibilityLabel={`${meal.label}, ${selectedMeals.includes(meal.id) ? 'selected' : 'not selected'}`}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selectedMeals.includes(meal.id) }}
                  >
                    <Text style={styles.mealIcon}>{meal.icon}</Text>
                    <Text
                      style={[
                        styles.mealLabel,
                        selectedMeals.includes(meal.id) && styles.mealLabelSelected,
                      ]}
                    >
                      {meal.label}
                    </Text>
                    {selectedMeals.includes(meal.id) && (
                      <View style={styles.checkBadge}>
                        <Text style={styles.checkBadgeText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.hint}>Tap to select one or more meals</Text>
            </View>

            {/* Description (Optional) */}
            <View style={styles.section}>
              <Text style={styles.label}>What did you eat? (optional)</Text>

              {/* Quick food suggestions */}
              {relevantFoods.length > 0 && (
                <View style={styles.quickFoodsContainer}>
                  {relevantFoods.map((food) => {
                    const isSelected = selectedFoods.includes(food.label);
                    return (
                      <TouchableOpacity
                        key={food.label}
                        style={[
                          styles.quickFoodChip,
                          isSelected && styles.quickFoodChipSelected,
                        ]}
                        onPress={() => toggleFood(food.label)}
                        accessibilityLabel={`${food.label}, ${isSelected ? 'selected' : 'not selected'}`}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: isSelected }}
                      >
                        <Text style={styles.quickFoodIcon}>{food.icon}</Text>
                        <Text style={[
                          styles.quickFoodLabel,
                          isSelected && styles.quickFoodLabelSelected,
                        ]}>{food.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <TextInput
                style={styles.descriptionInput}
                placeholder="Oatmeal with berries and coffee..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                value={description}
                onChangeText={setDescription}
                textAlignVertical="top"
                accessibilityLabel="Meal description"
              />
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>

          {/* Footer Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.saveButton,
                loading && styles.saveButtonDisabled,
                selectedMeals.length === 0 && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={loading || selectedMeals.length === 0}
              accessibilityLabel={loading ? 'Saving meal' : 'Log meal'}
              accessibilityHint="Saves the selected meals and notes"
              accessibilityRole="button"
              accessibilityState={{ disabled: loading || selectedMeals.length === 0 }}
            >
              <Text style={styles.saveButtonText}>
                {loading ? 'Saving...' : 'Log Meal'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: c.surfaceHighlight,
    borderWidth: 1,
    borderColor: c.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: c.textPrimary,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: c.textPrimary,
  },

  // Rhythm context banner
  contextBanner: {
    backgroundColor: 'rgba(74, 222, 128, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.15)',
    borderRadius: 10,
    padding: 10,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  carePlanBanner: {
    backgroundColor: c.purpleFaint,
    borderColor: c.purpleWash,
  },
  carePlanBannerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: c.violetBright,
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 4,
  },
  contextText: {
    fontSize: 13,
    color: c.textSecondary,
    textAlign: 'center',
  },

  // Section
  section: {
    padding: Spacing.xl,
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: c.accent,
    marginBottom: Spacing.lg,
  },
  hint: {
    fontSize: 13,
    color: c.textMuted,
    marginTop: Spacing.md,
    textAlign: 'center',
  },

  // Meal Grid
  mealGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  mealCard: {
    width: '47%',
    backgroundColor: c.surfaceHighlight,
    borderWidth: 1,
    borderColor: c.accentHint,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    position: 'relative',
  },
  mealCardSelected: {
    backgroundColor: c.greenLight,
    borderColor: c.green,
  },
  mealIcon: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  mealLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: c.textSecondary,
  },
  mealLabelSelected: {
    color: c.green,
    fontWeight: '600',
  },
  checkBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: c.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadgeText: {
    color: c.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Description Input
  descriptionInput: {
    backgroundColor: c.surfaceHighlight,
    borderWidth: 1,
    borderColor: c.accentHint,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    color: c.textPrimary,
    fontSize: 15,
    minHeight: 120,
  },

  // Quick Food Suggestions
  quickFoodsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.lg,
  },
  quickFoodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surfaceHighlight,
    borderWidth: 1,
    borderColor: c.accentHint,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  quickFoodChipSelected: {
    backgroundColor: c.greenLight,
    borderColor: c.green,
  },
  quickFoodIcon: {
    fontSize: 16,
  },
  quickFoodLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: c.textSecondary,
  },
  quickFoodLabelSelected: {
    color: c.green,
    fontWeight: '600',
  },

  // Footer
  footer: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: c.accentHint,
    backgroundColor: c.background,
  },
  saveButton: {
    backgroundColor: c.orange,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: c.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
