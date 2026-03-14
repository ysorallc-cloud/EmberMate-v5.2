// ============================================================================
// UNIFIED LOG PAGE - Accordion cards with inline forms per category
// Water: inline counter + quick-add buttons
// Vitals: inline form fields + save
// Meds: inline Take/Skip per medication
// Note: inline text box + save
// Mood: inline emoji select (auto-save)
// Wellness: morning/evening status badges + Start Check-in button
// Others: navigate to dedicated screens
// ============================================================================

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  LayoutAnimation,
  Platform,
  UIManager,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { navigate } from '../lib/navigate';
import { Colors } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import { getFilteredOptions, QuickLogOption } from '../constants/quickLogOptions';
import { useEnabledBuckets } from '../hooks/useCarePlanConfig';
import {
  getTodayLogStatus,
  getTodayWaterLog,
  updateTodayWaterLog,
  TodayLogStatus,
  saveVitalsLog,
  saveNotesLog,
  saveMoodLog,
  saveMealsLog,
  saveSleepLog,
  saveSymptomLog,
} from '../utils/centralStorage';
import { saveVital } from '../utils/vitalsStorage';
import { emitDataUpdate, useDataListener } from '../lib/events';
import { EVENT } from '../lib/eventNames';
import { hapticSuccess } from '../utils/hapticFeedback';
import { logError } from '../utils/devLog';
import { format } from 'date-fns';
import { useDailyCareInstances } from '../hooks/useDailyCareInstances';
import { DailyCareInstance } from '../types/carePlan';
import { getMorningWellness, getEveningWellness } from '../utils/wellnessCheckStorage';
import { getTodayDateString } from '../services/carePlanGenerator';
import {
  emitMedicationEvent,
  emitVitalsEvent,
  emitMealEvent,
  emitHydrationEvent,
  emitSleepEvent,
  emitSymptomEvent,
  emitBathroomEvent,
  emitMoodEvent,
  emitNoteEvent,
  emitCareEvent,
} from '../utils/eventEmitter';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Map quickLogOption IDs to TodayLogStatus keys
const STATUS_MAP: Record<string, keyof TodayLogStatus> = {
  meds: 'medications',
  vitals: 'vitals',
  hydration: 'water',
  meals: 'meals',
  sleep: 'sleep',
  wellness: 'mood',
  symptom: 'symptoms',
  note: 'notes',
};

const WATER_GOAL = 8;

const MOOD_OPTIONS = [
  { emoji: '😢', label: 'Difficult', value: 1 },
  { emoji: '😕', label: 'Down', value: 2 },
  { emoji: '😐', label: 'Okay', value: 3 },
  { emoji: '🙂', label: 'Good', value: 4 },
  { emoji: '😄', label: 'Great', value: 5 },
];

// Categories that have inline forms (no navigation needed)
const INLINE_CATEGORIES = new Set(['hydration', 'vitals', 'meds', 'note', 'wellness', 'meals', 'sleep', 'symptom', 'bathroom', 'activity', 'pain']);

const ACTIVITY_TYPES = ['Walking', 'Exercise', 'Stretching', 'Gardening', 'Chores', 'Other'];
const PAIN_LOCATIONS = ['Head', 'Chest', 'Back', 'Abdomen', 'Joints', 'Other'];
const PAIN_CHARACTERS = ['Sharp', 'Dull', 'Aching', 'Burning'];

export default function QuickLogMoreScreen() {
  const router = useRouter();
  const { expand } = useLocalSearchParams<{ expand?: string }>();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { enabledBuckets } = useEnabledBuckets();
  const { core, more, disabled } = getFilteredOptions(enabledBuckets);
  const allEnabled = [...core, ...more];

  const [expandedId, setExpandedId] = useState<string | null>(expand || null);
  const [logStatus, setLogStatus] = useState<TodayLogStatus | null>(null);
  const [waterGlasses, setWaterGlasses] = useState(0);

  // Vitals inline state
  const [vSystolic, setVSystolic] = useState('');
  const [vDiastolic, setVDiastolic] = useState('');
  const [vHeartRate, setVHeartRate] = useState('');
  const [vOxygen, setVOxygen] = useState('');
  const [vGlucose, setVGlucose] = useState('');
  const [vWeight, setVWeight] = useState('');
  const [vTemperature, setVTemperature] = useState('');
  const [vitalsSaving, setVitalsSaving] = useState(false);

  // Note inline state
  const [noteText, setNoteText] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);

  // Mood inline state
  const [selectedMood, setSelectedMood] = useState<number | null>(null);

  // Wellness state
  const [morningDone, setMorningDone] = useState(false);
  const [eveningDone, setEveningDone] = useState(false);

  // Meals inline state
  const [selectedMeal, setSelectedMeal] = useState<string | null>(null);
  const [mealsSaving, setMealsSaving] = useState(false);

  // Sleep inline state
  const [sleepHours, setSleepHours] = useState('');
  const [sleepQuality, setSleepQuality] = useState<number | null>(null);
  const [sleepSaving, setSleepSaving] = useState(false);

  // Symptom inline state
  const [symptomText, setSymptomText] = useState('');
  const [symptomSeverity, setSymptomSeverity] = useState<number | null>(null);
  const [symptomSaving, setSymptomSaving] = useState(false);

  // Bathroom inline state
  const [bathroomType, setBathroomType] = useState<string | null>(null);
  const [bathroomNotes, setBathroomNotes] = useState('');
  const [bathroomSaving, setBathroomSaving] = useState(false);

  // Sleep notes
  const [sleepNotes, setSleepNotes] = useState('');

  // Symptom description
  const [symptomDescription, setSymptomDescription] = useState('');

  // Activity inline state
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [activityDuration, setActivityDuration] = useState('');
  const [activityNotes, setActivityNotes] = useState('');
  const [activitySaving, setActivitySaving] = useState(false);

  // Pain inline state
  const [painSeverity, setPainSeverity] = useState<number | null>(null);
  const [painLocation, setPainLocation] = useState<string | null>(null);
  const [painCharacter, setPainCharacter] = useState<string | null>(null);
  const [painNotes, setPainNotes] = useState('');
  const [painSaving, setPainSaving] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ message: string; undoAction?: () => void } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  // Meds from daily care instances
  const { state: medState, completeInstance } = useDailyCareInstances();
  const medItems = (medState?.instances ?? []).filter(
    (i: DailyCareInstance) => i.itemType === 'medication'
  );

  // Load today's log status and water count
  const loadStatus = useCallback(async () => {
    try {
      const today = getTodayDateString();
      const [status, water, mw, ew] = await Promise.all([
        getTodayLogStatus(),
        getTodayWaterLog(),
        getMorningWellness(today),
        getEveningWellness(today),
      ]);
      setLogStatus(status);
      if (water?.glasses != null) setWaterGlasses(water.glasses);
      setMorningDone(!!mw);
      setEveningDone(!!ew);
    } catch (error) {
      logError('UnifiedLog.loadStatus', error);
    }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);
  useDataListener(loadStatus);

  const isDone = (optionId: string): boolean => {
    if (!logStatus) return false;
    if (optionId === 'hydration') return waterGlasses >= WATER_GOAL;
    const key = STATUS_MAP[optionId];
    return key ? logStatus[key] : false;
  };

  const getStatusDesc = (option: QuickLogOption): string => {
    if (option.id === 'hydration') return `${waterGlasses} of ${WATER_GOAL} glasses`;
    if (option.id === 'meds') {
      const taken = medItems.filter((m: DailyCareInstance) => m.status === 'completed' || m.status === 'skipped').length;
      const total = medItems.length;
      if (total === 0) return 'No medications scheduled';
      return `${taken} of ${total} taken`;
    }
    if (option.id === 'wellness') {
      if (morningDone && eveningDone) return 'Morning + evening done';
      if (morningDone) return 'Morning done · evening pending';
      return 'Not yet started';
    }
    const done = isDone(option.id);
    if (done) return 'Logged today';
    return option.description;
  };

  const handleToggle = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(prev => (prev === id ? null : id));
  };

  // ── Toast helper ──
  const showToast = (message: string, undoAction?: () => void) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, undoAction });
    Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        setToast(null);
      });
    }, 3000);
  };

  // ── Water handlers ──
  const addWater = async (amount: number) => {
    const newCount = Math.min(waterGlasses + amount, WATER_GOAL + 4);
    setWaterGlasses(newCount);
    try {
      await updateTodayWaterLog(newCount);
      emitDataUpdate(EVENT.WATER);
      try { await emitHydrationEvent(newCount, { source: 'quick_log' }); } catch {}
      if (newCount >= WATER_GOAL && waterGlasses < WATER_GOAL) await hapticSuccess();
    } catch (error) {
      logError('UnifiedLog.addWater', error);
    }
  };

  const handleWaterDecrement = async () => {
    const newCount = Math.max(waterGlasses - 1, 0);
    setWaterGlasses(newCount);
    try {
      await updateTodayWaterLog(newCount);
      emitDataUpdate(EVENT.WATER);
      try { await emitHydrationEvent(newCount, { source: 'quick_log' }); } catch {}
    } catch (error) {
      logError('UnifiedLog.waterDecrement', error);
    }
  };

  // ── Vitals save ──
  const handleSaveVitals = async () => {
    const sys = vSystolic ? parseInt(vSystolic, 10) : undefined;
    const dia = vDiastolic ? parseInt(vDiastolic, 10) : undefined;
    const hr = vHeartRate ? parseInt(vHeartRate, 10) : undefined;
    const o2 = vOxygen ? parseInt(vOxygen, 10) : undefined;
    const glu = vGlucose ? parseInt(vGlucose, 10) : undefined;
    const wt = vWeight ? parseFloat(vWeight) : undefined;
    const temp = vTemperature ? parseFloat(vTemperature) : undefined;

    if (!sys && !dia && !hr && !o2 && !glu && !wt && !temp) return;

    setVitalsSaving(true);
    try {
      const ts = new Date().toISOString();
      // Save individual vitals
      const saves: Promise<void>[] = [];
      if (sys) saves.push(saveVital({ type: 'systolic', value: sys, timestamp: ts, unit: 'mmHg' }));
      if (dia) saves.push(saveVital({ type: 'diastolic', value: dia, timestamp: ts, unit: 'mmHg' }));
      if (hr) saves.push(saveVital({ type: 'heartRate', value: hr, timestamp: ts, unit: 'bpm' }));
      if (o2) saves.push(saveVital({ type: 'oxygen', value: o2, timestamp: ts, unit: '%' }));
      if (glu) saves.push(saveVital({ type: 'glucose', value: glu, timestamp: ts, unit: 'mg/dL' }));
      if (wt) saves.push(saveVital({ type: 'weight', value: wt, timestamp: ts, unit: 'lbs' }));
      if (temp) saves.push(saveVital({ type: 'temperature', value: temp, timestamp: ts, unit: '°F' }));
      await Promise.all(saves);

      // Also save combined log
      await saveVitalsLog({
        timestamp: ts,
        systolic: sys,
        diastolic: dia,
        heartRate: hr,
        glucose: glu,
        weight: wt,
        oxygen: o2,
      });
      emitDataUpdate(EVENT.VITALS);
      try { await emitVitalsEvent({ systolic: sys, diastolic: dia, heartRate: hr, oxygen: o2, glucose: glu, weight: wt, temperature: temp }, { source: 'quick_log' }); } catch {}
      await hapticSuccess();
      showToast('Vitals saved');
      // Clear fields
      setVSystolic(''); setVDiastolic(''); setVHeartRate('');
      setVOxygen(''); setVGlucose(''); setVWeight(''); setVTemperature('');
    } catch (error) {
      logError('UnifiedLog.saveVitals', error);
    } finally {
      setVitalsSaving(false);
    }
  };

  // ── Note save ──
  const handleSaveNote = async () => {
    const trimmed = noteText.trim();
    if (!trimmed) return;
    setNoteSaving(true);
    try {
      await saveNotesLog({ timestamp: new Date().toISOString(), content: trimmed });
      emitDataUpdate(EVENT.NOTES);
      try { await emitNoteEvent(trimmed, { source: 'quick_log' }); } catch {}
      await hapticSuccess();
      showToast('Note saved');
      setNoteText('');
    } catch (error) {
      logError('UnifiedLog.saveNote', error);
    } finally {
      setNoteSaving(false);
    }
  };

  // ── Mood save ──
  const handleMoodSelect = async (value: number) => {
    setSelectedMood(value);
    try {
      await saveMoodLog({ timestamp: new Date().toISOString(), mood: value, energy: null, pain: null });
      emitDataUpdate(EVENT.MOOD);
      const label = MOOD_OPTIONS.find(m => m.value === value)?.label || '';
      try { await emitMoodEvent(value, label, { source: 'quick_log' }); } catch {}
      await hapticSuccess();
      showToast(`Mood: ${label}`);
    } catch (error) {
      logError('UnifiedLog.saveMood', error);
    }
  };

  // ── Med Take/Skip ──
  const handleMedAction = async (instanceId: string, outcome: 'taken' | 'skipped') => {
    try {
      const result = await completeInstance(instanceId, outcome);
      if (result) {
        emitDataUpdate(EVENT.MEDICATION);
        emitDataUpdate(EVENT.DAILY_INSTANCES);
        try { await emitMedicationEvent(result.instance.carePlanItemId, result.instance.itemName, outcome, { source: 'quick_log' }); } catch {}
        await hapticSuccess();
        showToast(`${result.instance.itemName} ${outcome === 'taken' ? 'logged' : 'skipped'}`);
      }
    } catch (error) {
      logError('UnifiedLog.medAction', error);
    }
  };

  // ── Meals save ──
  const handleSaveMeal = async (meal: string) => {
    setSelectedMeal(meal);
    setMealsSaving(true);
    try {
      await saveMealsLog({
        timestamp: new Date().toISOString(),
        meals: [meal],
        mealType: meal.toLowerCase(),
      });
      emitDataUpdate(EVENT.LOGS);
      try { await emitMealEvent(meal.toLowerCase(), { source: 'quick_log' }); } catch {}
      await hapticSuccess();
      showToast(`${meal} logged`);
      setSelectedMeal(null);
    } catch (error) {
      logError('UnifiedLog.saveMeal', error);
    } finally {
      setMealsSaving(false);
    }
  };

  // ── Sleep save ──
  const handleSaveSleep = async () => {
    const hours = parseFloat(sleepHours);
    if (isNaN(hours) || !sleepQuality) return;
    setSleepSaving(true);
    try {
      await saveSleepLog({
        timestamp: new Date().toISOString(),
        hours,
        quality: sleepQuality,
        notes: sleepNotes.trim() || undefined,
      });
      emitDataUpdate(EVENT.LOGS);
      try { await emitSleepEvent(hours, String(sleepQuality), { source: 'quick_log', notes: sleepNotes.trim() || undefined }); } catch {}
      await hapticSuccess();
      showToast('Sleep logged');
      setSleepHours('');
      setSleepQuality(null);
      setSleepNotes('');
    } catch (error) {
      logError('UnifiedLog.saveSleep', error);
    } finally {
      setSleepSaving(false);
    }
  };

  // ── Symptom save ──
  const handleSaveSymptom = async () => {
    const trimmed = symptomText.trim();
    if (!trimmed) return;
    setSymptomSaving(true);
    try {
      await saveSymptomLog({
        timestamp: new Date().toISOString(),
        symptoms: [trimmed],
        severity: symptomSeverity ?? undefined,
        description: symptomDescription.trim() || undefined,
      });
      emitDataUpdate(EVENT.SYMPTOMS);
      try { await emitSymptomEvent(trimmed, symptomSeverity != null ? String(symptomSeverity) : 'unknown', { source: 'quick_log', description: symptomDescription.trim() || undefined }); } catch {}
      await hapticSuccess();
      showToast('Symptom logged');
      setSymptomText('');
      setSymptomSeverity(null);
      setSymptomDescription('');
    } catch (error) {
      logError('UnifiedLog.saveSymptom', error);
    } finally {
      setSymptomSaving(false);
    }
  };

  // ── Bathroom save (uses notes log) ──
  const handleSaveBathroom = async (type: string) => {
    setBathroomType(type);
    setBathroomSaving(true);
    try {
      const notes = bathroomNotes.trim();
      await saveNotesLog({
        timestamp: new Date().toISOString(),
        content: notes ? `Bathroom: ${type} — ${notes}` : `Bathroom: ${type}`,
      });
      emitDataUpdate(EVENT.NOTES);
      try { await emitBathroomEvent(type, { source: 'quick_log', notes: notes || undefined }); } catch {}
      await hapticSuccess();
      showToast(`Bathroom: ${type} logged`);
      setBathroomType(null);
      setBathroomNotes('');
    } catch (error) {
      logError('UnifiedLog.saveBathroom', error);
    } finally {
      setBathroomSaving(false);
    }
  };

  // ── Activity save ──
  const handleSaveActivity = async () => {
    if (selectedActivities.length === 0) return;
    setActivitySaving(true);
    try {
      const duration = activityDuration ? parseInt(activityDuration, 10) : undefined;
      const notes = activityNotes.trim();
      await emitCareEvent('activity_logged', {
        activities: selectedActivities,
        duration,
        notes: notes || undefined,
        source: 'quick_log',
      });
      await saveNotesLog({
        timestamp: new Date().toISOString(),
        content: `Activity: ${selectedActivities.join(', ')}${duration ? ` (${duration} min)` : ''}${notes ? ` — ${notes}` : ''}`,
      });
      emitDataUpdate(EVENT.LOGS);
      await hapticSuccess();
      showToast('Activity logged');
      setSelectedActivities([]);
      setActivityDuration('');
      setActivityNotes('');
    } catch (error) {
      logError('UnifiedLog.saveActivity', error);
    } finally {
      setActivitySaving(false);
    }
  };

  // ── Pain save ──
  const handleSavePain = async () => {
    if (painSeverity == null) return;
    setPainSaving(true);
    try {
      const notes = painNotes.trim();
      const description = [
        painLocation && `Location: ${painLocation}`,
        painCharacter && `Type: ${painCharacter}`,
        notes,
      ].filter(Boolean).join('. ');
      await saveSymptomLog({
        timestamp: new Date().toISOString(),
        symptoms: ['Pain'],
        severity: painSeverity,
        description: description || undefined,
      });
      emitDataUpdate(EVENT.SYMPTOMS);
      try { await emitSymptomEvent('Pain', String(painSeverity), { source: 'quick_log', painLevel: painSeverity, location: painLocation, character: painCharacter }); } catch {}
      await hapticSuccess();
      showToast(`Pain (${painSeverity}/10) logged`);
      setPainSeverity(null);
      setPainLocation(null);
      setPainCharacter(null);
      setPainNotes('');
    } catch (error) {
      logError('UnifiedLog.savePain', error);
    } finally {
      setPainSaving(false);
    }
  };

  // Sort: pending first, then completed
  const sortedOptions = [...allEnabled].sort((a, b) => {
    const aDone = isDone(a.id) ? 1 : 0;
    const bDone = isDone(b.id) ? 1 : 0;
    return aDone - bDone;
  });

  // Count completions
  const doneCount = allEnabled.filter(o => isDone(o.id)).length;
  const totalCount = allEnabled.length;

  // Find first done item index for COMPLETED divider
  const firstDoneIndex = sortedOptions.findIndex(o => isDone(o.id));

  const today = format(new Date(), 'EEEE, MMM d');
  const hasVitalsData = vSystolic || vDiastolic || vHeartRate || vOxygen || vGlucose || vWeight || vTemperature;

  // ── Render inline content per category ──
  const renderInlineContent = (option: QuickLogOption) => {
    switch (option.id) {
      case 'hydration':
        return (
          <View style={styles.waterSection}>
            <View style={styles.waterCounter}>
              <TouchableOpacity
                style={styles.waterBtn}
                onPress={handleWaterDecrement}
                disabled={waterGlasses <= 0}
                accessibilityLabel="Remove glass"
              >
                <Text style={[styles.waterBtnText, waterGlasses <= 0 && styles.waterBtnDisabled]}>−</Text>
              </TouchableOpacity>
              <View style={styles.waterDisplay}>
                <Text style={styles.waterCount}>{waterGlasses}</Text>
                <Text style={styles.waterGoal}>of {WATER_GOAL} glasses</Text>
              </View>
              <TouchableOpacity
                style={[styles.waterBtn, styles.waterBtnAdd]}
                onPress={() => addWater(1)}
                accessibilityLabel="Add glass"
              >
                <Text style={styles.waterBtnAddText}>+</Text>
              </TouchableOpacity>
            </View>
            {/* Glass visualization */}
            <View style={styles.glassRow}>
              {Array.from({ length: WATER_GOAL }).map((_, i) => (
                <View key={i} style={[styles.glass, i < waterGlasses && styles.glassFilled]}>
                  {i < waterGlasses && <View style={styles.glassFill} />}
                </View>
              ))}
            </View>
            {/* Quick-add buttons */}
            <View style={styles.quickAddRow}>
              {[1, 2, 3].map(n => (
                <TouchableOpacity
                  key={n}
                  style={styles.quickAddBtn}
                  onPress={() => addWater(n)}
                  accessibilityLabel={`Add ${n} glass${n > 1 ? 'es' : ''}`}
                >
                  <Text style={styles.quickAddText}>+{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 'vitals':
        return (
          <View style={styles.vitalsSection}>
            <Text style={styles.fieldSectionLabel}>BLOOD PRESSURE</Text>
            <View style={styles.fieldRow}>
              <View style={styles.fieldWrapper}>
                <TextInput
                  style={styles.fieldInput}
                  value={vSystolic}
                  onChangeText={setVSystolic}
                  placeholder="—"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  accessibilityLabel="Systolic"
                />
                <Text style={styles.fieldUnit}>sys</Text>
              </View>
              <Text style={styles.fieldDivider}>/</Text>
              <View style={styles.fieldWrapper}>
                <TextInput
                  style={styles.fieldInput}
                  value={vDiastolic}
                  onChangeText={setVDiastolic}
                  placeholder="—"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  accessibilityLabel="Diastolic"
                />
                <Text style={styles.fieldUnit}>dia</Text>
              </View>
            </View>
            <View style={styles.fieldRow}>
              <View style={styles.fieldWrapper}>
                <Text style={styles.fieldLabel}>HEART RATE</Text>
                <View style={styles.fieldInputRow}>
                  <TextInput
                    style={styles.fieldInput}
                    value={vHeartRate}
                    onChangeText={setVHeartRate}
                    placeholder="—"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    accessibilityLabel="Heart rate"
                  />
                  <Text style={styles.fieldUnit}>bpm</Text>
                </View>
              </View>
              <View style={styles.fieldWrapper}>
                <Text style={styles.fieldLabel}>OXYGEN</Text>
                <View style={styles.fieldInputRow}>
                  <TextInput
                    style={styles.fieldInput}
                    value={vOxygen}
                    onChangeText={setVOxygen}
                    placeholder="—"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    accessibilityLabel="Oxygen saturation"
                  />
                  <Text style={styles.fieldUnit}>%</Text>
                </View>
              </View>
            </View>
            <View style={styles.fieldRow}>
              <View style={styles.fieldWrapper}>
                <Text style={styles.fieldLabel}>GLUCOSE</Text>
                <View style={styles.fieldInputRow}>
                  <TextInput
                    style={styles.fieldInput}
                    value={vGlucose}
                    onChangeText={setVGlucose}
                    placeholder="—"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    accessibilityLabel="Glucose"
                  />
                  <Text style={styles.fieldUnit}>mg/dL</Text>
                </View>
              </View>
              <View style={styles.fieldWrapper}>
                <Text style={styles.fieldLabel}>WEIGHT</Text>
                <View style={styles.fieldInputRow}>
                  <TextInput
                    style={styles.fieldInput}
                    value={vWeight}
                    onChangeText={setVWeight}
                    placeholder="—"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    accessibilityLabel="Weight"
                  />
                  <Text style={styles.fieldUnit}>lbs</Text>
                </View>
              </View>
            </View>
            <View style={styles.fieldRow}>
              <View style={styles.fieldWrapper}>
                <Text style={styles.fieldLabel}>TEMPERATURE</Text>
                <View style={styles.fieldInputRow}>
                  <TextInput
                    style={styles.fieldInput}
                    value={vTemperature}
                    onChangeText={setVTemperature}
                    placeholder="—"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    accessibilityLabel="Temperature"
                  />
                  <Text style={styles.fieldUnit}>°F</Text>
                </View>
              </View>
              <View style={styles.fieldWrapper} />
            </View>
            <View style={styles.saveRow}>
              <TouchableOpacity
                style={[styles.saveBtn, (!hasVitalsData || vitalsSaving) && styles.saveBtnDisabled]}
                onPress={handleSaveVitals}
                disabled={!hasVitalsData || vitalsSaving}
              >
                <Text style={styles.saveBtnText}>{vitalsSaving ? 'Saving...' : 'Save Vitals'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'meds':
        return (
          <View style={styles.medsSection}>
            {medItems.length === 0 ? (
              <Text style={styles.medsEmpty}>No medications scheduled today</Text>
            ) : (
              medItems.map((med: DailyCareInstance, i: number) => {
                const isTaken = med.status === 'completed';
                const isSkipped = med.status === 'skipped';
                const isDoneStatus = isTaken || isSkipped;
                return (
                  <View
                    key={med.id}
                    style={[styles.medRow, i < medItems.length - 1 && styles.medRowBorder]}
                  >
                    <View style={styles.medInfo}>
                      <Text style={[styles.medName, isDoneStatus && styles.medNameDone]}>
                        {med.itemName}{med.itemDosage ? ` ${med.itemDosage}` : ''}
                      </Text>
                      <Text style={styles.medTime}>{med.windowLabel}</Text>
                    </View>
                    {isTaken ? (
                      <View style={styles.medTakenBadge}>
                        <Text style={styles.medTakenText}>Taken ✓</Text>
                      </View>
                    ) : isSkipped ? (
                      <View style={styles.medSkippedBadge}>
                        <Text style={styles.medSkippedText}>Skipped</Text>
                      </View>
                    ) : (
                      <View style={styles.medActions}>
                        <TouchableOpacity
                          style={styles.medTakeBtn}
                          onPress={() => handleMedAction(med.id, 'taken')}
                          accessibilityLabel={`Take ${med.itemName}`}
                        >
                          <Text style={styles.medTakeBtnText}>Take</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.medSkipBtn}
                          onPress={() => handleMedAction(med.id, 'skipped')}
                          accessibilityLabel={`Skip ${med.itemName}`}
                        >
                          <Text style={styles.medSkipBtnText}>Skip</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })
            )}
            {medItems.length > 0 && (
              <TouchableOpacity
                style={styles.detailsLink}
                onPress={() => navigate('/medication-confirm')}
              >
                <Text style={styles.detailsLinkText}>Details → for side effects or notes</Text>
              </TouchableOpacity>
            )}
          </View>
        );

      case 'note':
        return (
          <View style={styles.noteSection}>
            <TextInput
              style={styles.noteInput}
              value={noteText}
              onChangeText={setNoteText}
              placeholder="Quick observation..."
              placeholderTextColor={colors.textMuted}
              multiline
              textAlignVertical="top"
              accessibilityLabel="Note text"
            />
            <View style={styles.saveRow}>
              <TouchableOpacity
                style={[styles.saveBtn, (!noteText.trim() || noteSaving) && styles.saveBtnDisabled]}
                onPress={handleSaveNote}
                disabled={!noteText.trim() || noteSaving}
              >
                <Text style={styles.saveBtnText}>{noteSaving ? 'Saving...' : 'Save Note'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'wellness':
        return (
          <View style={styles.wellnessSection}>
            <View style={styles.wellnessBadgeRow}>
              <View style={[styles.wellnessBadge, morningDone ? styles.wellnessBadgeDone : styles.wellnessBadgePending]}>
                <Text style={morningDone ? styles.wellnessBadgeDoneText : styles.wellnessBadgePendingText}>
                  {morningDone ? '✓ Morning done' : 'Morning pending'}
                </Text>
              </View>
              <View style={[styles.wellnessBadge, eveningDone ? styles.wellnessBadgeDone : styles.wellnessBadgePending]}>
                <Text style={eveningDone ? styles.wellnessBadgeDoneText : styles.wellnessBadgePendingText}>
                  {eveningDone ? '✓ Evening done' : 'Evening pending'}
                </Text>
              </View>
            </View>
            {(!morningDone || !eveningDone) && (
              <TouchableOpacity
                style={styles.startCheckinBtn}
                onPress={() => {
                  if (!morningDone) {
                    navigate('/log-morning-wellness');
                  } else {
                    navigate('/log-evening-wellness');
                  }
                }}
              >
                <Text style={styles.startCheckinEmoji}>{!morningDone ? '☀️' : '🌙'}</Text>
                <Text style={styles.startCheckinText}>
                  Start {!morningDone ? 'Morning' : 'Evening'} Check-in
                </Text>
                <Text style={styles.startCheckinArrow}>→</Text>
              </TouchableOpacity>
            )}
          </View>
        );

      case 'meals':
        return (
          <View style={styles.mealsSection}>
            <Text style={styles.fieldSectionLabel}>QUICK LOG A MEAL</Text>
            <View style={styles.mealButtons}>
              {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map(meal => (
                <TouchableOpacity
                  key={meal}
                  style={[styles.mealBtn, selectedMeal === meal && styles.mealBtnActive]}
                  onPress={() => handleSaveMeal(meal)}
                  disabled={mealsSaving}
                  accessibilityLabel={`Log ${meal}`}
                >
                  <Text style={[styles.mealBtnText, selectedMeal === meal && styles.mealBtnTextActive]}>
                    {meal}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.detailsLink}
              onPress={() => navigate('/log-meal')}
            >
              <Text style={styles.detailsLinkText}>Add details →</Text>
            </TouchableOpacity>
          </View>
        );

      case 'sleep':
        return (
          <View style={styles.sleepSection}>
            <View style={styles.fieldRow}>
              <View style={styles.fieldWrapper}>
                <Text style={styles.fieldLabel}>HOURS SLEPT</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={sleepHours}
                  onChangeText={setSleepHours}
                  placeholder="—"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  accessibilityLabel="Hours slept"
                />
              </View>
            </View>
            <Text style={[styles.fieldLabel, { marginTop: 10 }]}>QUALITY</Text>
            <View style={styles.qualityRow}>
              {[1, 2, 3, 4, 5].map(q => (
                <TouchableOpacity
                  key={q}
                  style={[styles.qualityBtn, sleepQuality === q && styles.qualityBtnActive]}
                  onPress={() => setSleepQuality(q)}
                  accessibilityLabel={`Quality ${q} of 5`}
                >
                  <Text style={[styles.qualityBtnText, sleepQuality === q && styles.qualityBtnTextActive]}>
                    {q}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.noteInput, { marginTop: 10, minHeight: 40 }]}
              value={sleepNotes}
              onChangeText={setSleepNotes}
              placeholder="Notes (optional)"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Sleep notes"
            />
            <View style={styles.saveRow}>
              <TouchableOpacity
                style={[styles.saveBtn, (!sleepHours || !sleepQuality || sleepSaving) && styles.saveBtnDisabled]}
                onPress={handleSaveSleep}
                disabled={!sleepHours || !sleepQuality || sleepSaving}
              >
                <Text style={styles.saveBtnText}>{sleepSaving ? 'Saving...' : 'Save Sleep'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'symptom':
        return (
          <View style={styles.symptomSection}>
            <TextInput
              style={styles.noteInput}
              value={symptomText}
              onChangeText={setSymptomText}
              placeholder="Describe symptom..."
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Symptom description"
            />
            <Text style={[styles.fieldLabel, { marginTop: 10 }]}>SEVERITY</Text>
            <View style={styles.qualityRow}>
              {[1, 2, 3, 4, 5].map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.qualityBtn, symptomSeverity === s && styles.severityBtnActive]}
                  onPress={() => setSymptomSeverity(s)}
                  accessibilityLabel={`Severity ${s} of 5`}
                >
                  <Text style={[styles.qualityBtnText, symptomSeverity === s && styles.severityBtnTextActive]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.noteInput, { marginTop: 10, minHeight: 40 }]}
              value={symptomDescription}
              onChangeText={setSymptomDescription}
              placeholder="Additional details (optional)"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Symptom details"
            />
            <View style={styles.saveRow}>
              <TouchableOpacity
                style={[styles.saveBtn, (!symptomText.trim() || symptomSaving) && styles.saveBtnDisabled]}
                onPress={handleSaveSymptom}
                disabled={!symptomText.trim() || symptomSaving}
              >
                <Text style={styles.saveBtnText}>{symptomSaving ? 'Saving...' : 'Save Symptom'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'bathroom':
        return (
          <View style={styles.bathroomSection}>
            <Text style={styles.fieldSectionLabel}>QUICK LOG</Text>
            <View style={styles.mealButtons}>
              {['Bowel Movement', 'Urination', 'Incontinence'].map(type => (
                <TouchableOpacity
                  key={type}
                  style={[styles.mealBtn, bathroomType === type && styles.mealBtnActive]}
                  onPress={() => handleSaveBathroom(type)}
                  disabled={bathroomSaving}
                  accessibilityLabel={`Log ${type}`}
                >
                  <Text style={[styles.mealBtnText, bathroomType === type && styles.mealBtnTextActive]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.noteInput, { marginTop: 10, minHeight: 40 }]}
              value={bathroomNotes}
              onChangeText={setBathroomNotes}
              placeholder="Notes (optional)"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Bathroom notes"
            />
          </View>
        );

      case 'activity':
        return (
          <View style={styles.activitySection}>
            <Text style={styles.fieldSectionLabel}>ACTIVITY TYPE</Text>
            <View style={styles.mealButtons}>
              {ACTIVITY_TYPES.map(type => {
                const selected = selectedActivities.includes(type);
                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.mealBtn, selected && styles.mealBtnActive]}
                    onPress={() => setSelectedActivities(prev =>
                      selected ? prev.filter(t => t !== type) : [...prev, type]
                    )}
                    accessibilityLabel={`${type}${selected ? ' selected' : ''}`}
                  >
                    <Text style={[styles.mealBtnText, selected && styles.mealBtnTextActive]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.fieldRow}>
              <View style={styles.fieldWrapper}>
                <Text style={styles.fieldLabel}>DURATION (MINUTES)</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={activityDuration}
                  onChangeText={setActivityDuration}
                  placeholder="—"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  accessibilityLabel="Duration in minutes"
                />
              </View>
            </View>
            <TextInput
              style={[styles.noteInput, { marginTop: 10, minHeight: 40 }]}
              value={activityNotes}
              onChangeText={setActivityNotes}
              placeholder="Notes (optional)"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Activity notes"
            />
            <View style={styles.saveRow}>
              <TouchableOpacity
                style={[styles.saveBtn, (selectedActivities.length === 0 || activitySaving) && styles.saveBtnDisabled]}
                onPress={handleSaveActivity}
                disabled={selectedActivities.length === 0 || activitySaving}
              >
                <Text style={styles.saveBtnText}>{activitySaving ? 'Saving...' : 'Save Activity'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'pain':
        return (
          <View style={styles.painSection}>
            <Text style={styles.fieldSectionLabel}>SEVERITY (1-10)</Text>
            <View style={styles.painScaleRow}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                <TouchableOpacity
                  key={n}
                  style={[styles.painScaleBtn, painSeverity === n && styles.painScaleBtnActive]}
                  onPress={() => setPainSeverity(n)}
                  accessibilityLabel={`Pain level ${n}`}
                >
                  <Text style={[styles.painScaleBtnText, painSeverity === n && styles.painScaleBtnTextActive]}>
                    {n}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.fieldSectionLabel, { marginTop: 12 }]}>LOCATION</Text>
            <View style={styles.mealButtons}>
              {PAIN_LOCATIONS.map(loc => (
                <TouchableOpacity
                  key={loc}
                  style={[styles.mealBtn, painLocation === loc && styles.severityBtnActive]}
                  onPress={() => setPainLocation(painLocation === loc ? null : loc)}
                  accessibilityLabel={`Pain location: ${loc}`}
                >
                  <Text style={[styles.mealBtnText, painLocation === loc && styles.severityBtnTextActive]}>
                    {loc}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.fieldSectionLabel, { marginTop: 12 }]}>TYPE</Text>
            <View style={styles.mealButtons}>
              {PAIN_CHARACTERS.map(ch => (
                <TouchableOpacity
                  key={ch}
                  style={[styles.mealBtn, painCharacter === ch && styles.severityBtnActive]}
                  onPress={() => setPainCharacter(painCharacter === ch ? null : ch)}
                  accessibilityLabel={`Pain type: ${ch}`}
                >
                  <Text style={[styles.mealBtnText, painCharacter === ch && styles.severityBtnTextActive]}>
                    {ch}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.noteInput, { marginTop: 10, minHeight: 40 }]}
              value={painNotes}
              onChangeText={setPainNotes}
              placeholder="Notes (optional)"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Pain notes"
            />
            <View style={styles.saveRow}>
              <TouchableOpacity
                style={[styles.saveBtn, (painSeverity == null || painSaving) && styles.saveBtnDisabled]}
                onPress={handleSavePain}
                disabled={painSeverity == null || painSaving}
              >
                <Text style={styles.saveBtnText}>{painSaving ? 'Saving...' : 'Save Pain'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Log</Text>
            <Text style={styles.headerDate}>{today} · {doneCount} of {totalCount} complete</Text>
          </View>
          <View style={styles.backButton} />
        </View>

        {/* Toast */}
        {toast && (
          <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
            <Text style={styles.toastIcon}>✓</Text>
            <Text style={styles.toastText}>{toast.message}</Text>
          </Animated.View>
        )}

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {sortedOptions.map((option, index) => {
            const done = isDone(option.id);
            const expanded = expandedId === option.id;
            const isInline = INLINE_CATEGORIES.has(option.id);
            const showCompletedDivider = firstDoneIndex > 0 && index === firstDoneIndex;

            return (
              <React.Fragment key={option.id}>
                {/* COMPLETED section divider */}
                {showCompletedDivider && (
                  <Text style={styles.completedDivider}>COMPLETED</Text>
                )}

                <View style={[styles.accordionCard, expanded && styles.accordionCardExpanded]}>
                  {/* Card header */}
                  <TouchableOpacity
                    style={styles.accordionHeader}
                    onPress={() => handleToggle(option.id)}
                    activeOpacity={0.7}
                    accessibilityLabel={`${option.label}: ${getStatusDesc(option)}`}
                    accessibilityRole="button"
                  >
                    <View style={[styles.accordionIcon, done && styles.accordionIconDone]}>
                      <Text style={styles.accordionIconText}>
                        {done ? '✓' : option.icon}
                      </Text>
                    </View>
                    <View style={styles.accordionContent}>
                      <Text style={[styles.accordionLabel, done && styles.accordionLabelDone]}>
                        {option.label}
                      </Text>
                      <Text style={styles.accordionDesc}>{getStatusDesc(option)}</Text>
                    </View>
                    <Text style={[styles.chevron, expanded && styles.chevronOpen]}>▼</Text>
                  </TouchableOpacity>

                  {/* Expanded content */}
                  {expanded && (
                    <View style={styles.accordionBody}>
                      {isInline ? (
                        renderInlineContent(option)
                      ) : (
                        <TouchableOpacity
                          style={styles.goButton}
                          onPress={() => navigate(option.screen)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.goButtonText}>
                            {done ? `Update ${option.label}` : `Log ${option.label}`}
                          </Text>
                          <Text style={styles.goButtonArrow}>→</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              </React.Fragment>
            );
          })}

          {/* Disabled categories */}
          {disabled.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>NOT IN YOUR CARE PLAN</Text>
              {disabled.map(option => (
                <View key={option.id} style={[styles.accordionCard, styles.disabledCard]}>
                  <View style={styles.accordionHeader}>
                    <View style={[styles.accordionIcon, styles.accordionIconDisabled]}>
                      <Text style={styles.accordionIconText}>{option.icon}</Text>
                    </View>
                    <View style={styles.accordionContent}>
                      <Text style={styles.disabledLabel}>{option.label}</Text>
                      <Text style={styles.accordionDesc}>{option.description}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => navigate('/care-plan')}
                      accessibilityLabel={`Enable ${option.label} in care plan`}
                    >
                      <Text style={styles.enableLink}>Enable →</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  gradient: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: c.border,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: c.surface,
    borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center',
  },
  backButtonText: { color: c.textPrimary, fontSize: 18 },
  headerCenter: { alignItems: 'center' },
  title: { color: c.textPrimary, fontSize: 18, fontWeight: '600' },
  headerDate: { color: c.textMuted, fontSize: 11, marginTop: 2 },
  content: { flex: 1 },
  contentContainer: { paddingHorizontal: 20, paddingTop: 16 },

  // Toast
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(16,185,129,0.12)', borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.25)', borderRadius: 8,
    paddingVertical: 8, paddingHorizontal: 12,
    marginHorizontal: 20, marginTop: 8,
  },
  toastIcon: { fontSize: 12, color: '#10B981' },
  toastText: { fontSize: 12, color: '#10B981', fontWeight: '500', flex: 1 },

  // Completed divider
  completedDivider: {
    fontSize: 9, fontWeight: '700', color: c.textMuted,
    letterSpacing: 1, marginTop: 8, marginBottom: 6,
  },

  // Accordion card
  accordionCard: {
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
    borderRadius: 12, marginBottom: 8, overflow: 'hidden',
  },
  accordionCardExpanded: { borderColor: c.accentBorder },
  accordionHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  accordionIcon: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: c.accentLight,
    alignItems: 'center', justifyContent: 'center',
  },
  accordionIconDone: { backgroundColor: 'rgba(16,185,129,0.12)' },
  accordionIconDisabled: { backgroundColor: c.glassDim },
  accordionIconText: { fontSize: 16 },
  accordionContent: { flex: 1 },
  accordionLabel: { fontSize: 14, fontWeight: '600', color: c.textPrimary },
  accordionLabelDone: { color: '#10B981' },
  accordionDesc: { fontSize: 11, color: c.textMuted, marginTop: 1 },
  chevron: { fontSize: 10, color: c.textMuted },
  chevronOpen: { transform: [{ rotate: '180deg' }] },
  accordionBody: { borderTopWidth: 1, borderTopColor: c.border, padding: 14 },

  // Go button (navigate to screen)
  goButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: c.accentLight, borderWidth: 1, borderColor: c.accentBorder,
    borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, gap: 8,
  },
  goButtonText: { fontSize: 14, fontWeight: '600', color: c.accent },
  goButtonArrow: { fontSize: 14, color: c.accent },

  // ── Water ──
  waterSection: { alignItems: 'center' },
  waterCounter: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  waterBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: c.surface,
    borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center',
  },
  waterBtnText: { fontSize: 20, color: c.textMuted, fontWeight: '300', lineHeight: 22 },
  waterBtnDisabled: { opacity: 0.3 },
  waterBtnAdd: { backgroundColor: 'rgba(59,130,246,0.15)', borderColor: 'rgba(59,130,246,0.3)' },
  waterBtnAddText: { fontSize: 20, color: '#5B8A6A', fontWeight: '300', lineHeight: 22 },
  waterDisplay: { alignItems: 'center' },
  waterCount: { fontSize: 36, fontWeight: '700', color: '#5B8A6A' },
  waterGoal: { fontSize: 10, color: c.textMuted },
  glassRow: { flexDirection: 'row', justifyContent: 'center', gap: 4, marginTop: 10 },
  glass: {
    width: 22, height: 26, borderRadius: 4, borderWidth: 1,
    borderColor: c.border, overflow: 'hidden', justifyContent: 'flex-end',
  },
  glassFilled: { borderColor: 'rgba(59,130,246,0.4)' },
  glassFill: {
    width: '100%', height: '70%', backgroundColor: 'rgba(59,130,246,0.25)',
    borderBottomLeftRadius: 3, borderBottomRightRadius: 3,
  },
  quickAddRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  quickAddBtn: {
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
    borderRadius: 6, paddingVertical: 4, paddingHorizontal: 12,
  },
  quickAddText: { fontSize: 11, color: c.textSecondary, fontWeight: '500' },

  // ── Vitals ──
  vitalsSection: {},
  fieldSectionLabel: {
    fontSize: 9, fontWeight: '700', color: c.textMuted,
    letterSpacing: 0.5, marginBottom: 4,
  },
  fieldRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', marginTop: 10 },
  fieldWrapper: { flex: 1 },
  fieldLabel: {
    fontSize: 9, fontWeight: '700', color: c.textMuted,
    letterSpacing: 0.3, marginBottom: 3,
  },
  fieldInputRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fieldInput: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1,
    borderColor: c.border, borderRadius: 7, paddingVertical: 7,
    paddingHorizontal: 9, fontSize: 15, fontWeight: '600', color: c.textPrimary,
  },
  fieldUnit: { fontSize: 9, color: c.textMuted },
  fieldDivider: { color: c.textMuted, fontSize: 14, marginBottom: 8 },
  saveRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
  saveBtn: {
    backgroundColor: c.accent, borderRadius: 7,
    paddingVertical: 6, paddingHorizontal: 14,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontSize: 12, fontWeight: '600', color: '#fff' },

  // ── Meds ──
  medsSection: {},
  medsEmpty: { fontSize: 12, color: c.textMuted, textAlign: 'center', paddingVertical: 8 },
  medRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  medRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  medInfo: { flex: 1 },
  medName: { fontSize: 12, fontWeight: '500', color: c.textPrimary },
  medNameDone: { color: '#10B981' },
  medTime: { fontSize: 10, color: c.textMuted, marginTop: 1 },
  medActions: { flexDirection: 'row', gap: 5 },
  medTakeBtn: {
    backgroundColor: 'rgba(20,184,166,0.12)', borderWidth: 1,
    borderColor: 'rgba(20,184,166,0.25)', borderRadius: 6,
    paddingVertical: 4, paddingHorizontal: 10,
  },
  medTakeBtnText: { fontSize: 11, color: c.accent, fontWeight: '600' },
  medSkipBtn: {
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
    borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8,
  },
  medSkipBtnText: { fontSize: 11, color: c.textMuted },
  medTakenBadge: {
    backgroundColor: 'rgba(16,185,129,0.12)', borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.25)', borderRadius: 6,
    paddingVertical: 4, paddingHorizontal: 10,
  },
  medTakenText: { fontSize: 11, color: '#10B981', fontWeight: '600' },
  medSkippedBadge: {
    backgroundColor: 'rgba(245,158,11,0.12)', borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.25)', borderRadius: 6,
    paddingVertical: 4, paddingHorizontal: 10,
  },
  medSkippedText: { fontSize: 11, color: '#F59E0B', fontWeight: '600' },
  detailsLink: { marginTop: 6, alignItems: 'flex-end' },
  detailsLinkText: { fontSize: 10, color: c.accent },

  // ── Note ──
  noteSection: {},
  noteInput: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1,
    borderColor: c.border, borderRadius: 8, padding: 10,
    minHeight: 70, fontSize: 12, color: c.textPrimary,
  },

  // ── Wellness ──
  wellnessSection: {},
  wellnessBadgeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  wellnessBadge: { borderRadius: 4, paddingVertical: 3, paddingHorizontal: 8 },
  wellnessBadgeDone: { backgroundColor: 'rgba(16,185,129,0.12)' },
  wellnessBadgePending: { backgroundColor: 'rgba(245,158,11,0.12)' },
  wellnessBadgeDoneText: { fontSize: 10, color: '#10B981', fontWeight: '500' },
  wellnessBadgePendingText: { fontSize: 10, color: '#F59E0B', fontWeight: '500' },
  startCheckinBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: c.accentLight, borderWidth: 1, borderColor: c.accentBorder,
    borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, gap: 6,
  },
  startCheckinEmoji: { fontSize: 12 },
  startCheckinText: { fontSize: 13, fontWeight: '600', color: c.accent },
  startCheckinArrow: { fontSize: 12, color: c.accent },

  // ── Meals ──
  mealsSection: {},
  mealButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mealBtn: {
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
    borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14,
  },
  mealBtnActive: { backgroundColor: c.accentLight, borderColor: c.accentBorder },
  mealBtnText: { fontSize: 13, fontWeight: '500', color: c.textSecondary },
  mealBtnTextActive: { color: c.accent },

  // ── Sleep ──
  sleepSection: {},
  qualityRow: { flexDirection: 'row', gap: 8 },
  qualityBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: c.surface,
    borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center',
  },
  qualityBtnActive: { backgroundColor: 'rgba(59,130,246,0.15)', borderColor: 'rgba(59,130,246,0.3)' },
  qualityBtnText: { fontSize: 14, fontWeight: '600', color: c.textMuted },
  qualityBtnTextActive: { color: '#5B8A6A' },

  // ── Symptom ──
  symptomSection: {},
  severityBtnActive: { backgroundColor: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.3)' },
  severityBtnTextActive: { color: '#F59E0B' },

  // ── Bathroom ──
  bathroomSection: {},

  // ── Activity ──
  activitySection: {},

  // ── Pain ──
  painSection: {},
  painScaleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  painScaleBtn: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: c.surface,
    borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center',
  },
  painScaleBtnActive: { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.3)' },
  painScaleBtnText: { fontSize: 11, fontWeight: '600', color: c.textMuted },
  painScaleBtnTextActive: { color: '#EF4444' },

  // Disabled section
  sectionLabel: {
    fontSize: 11, fontWeight: '600', letterSpacing: 0.5,
    color: c.textMuted, marginBottom: 12, marginTop: 24,
  },
  disabledCard: { opacity: 0.6 },
  disabledLabel: { fontSize: 14, fontWeight: '500', color: c.textMuted },
  enableLink: { fontSize: 13, color: c.accent, fontWeight: '500' },
});
