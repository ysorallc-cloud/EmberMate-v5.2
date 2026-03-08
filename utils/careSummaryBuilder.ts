// ============================================================================
// CARE SUMMARY BUILDER
// Aggregates today's care data into a compact handoff summary
// ============================================================================

import { StorageKeys } from './storageKeys';
import { safeGetItem } from './safeStorage';
import { getMorningWellness, getEveningWellness } from './wellnessCheckStorage';
import { getUpcomingAppointments } from './appointmentStorage';
import { getTodayVitalsLog, getMealsLogs, getTodaySleepLog, getTodayWaterLog } from './centralStorage';
import { listDailyInstances, listLogsByDate, DEFAULT_PATIENT_ID } from '../storage/carePlanRepo';
import { ensureDailyInstances, getTodayDateString } from '../services/carePlanGenerator';
import { getMedicalInfo, MedicalInfo } from './medicalInfo';
import { getClinicalCareSettings, ClinicalCareSettings } from './clinicalCareSettings';
import { getEmergencyContacts, EmergencyContact } from './emergencyContacts';
import { getPatientRegistry } from '../storage/patientRegistry';
import { logError } from './devLog';

// ============================================================================
// TYPES
// ============================================================================

export interface TodaySummary {
  medsAdherence: { taken: number; total: number };
  orientation: string | null;
  painLevel: string | null;
  appetite: string | null;
  alertness: string | null;
  bowelMovement: string | null;
  bathingStatus: string | null;
  mobilityStatus: string | null;
  vitalsReading: string | null;
  mealsStatus: { logged: number; total: number; overdueNames: string[] } | null;
  moodArc: string | null;
  overdueItems: string[];
  nextAppointment: { provider: string; specialty: string; date: string } | null;
  flaggedItems: string[];
}

// ============================================================================
// DISPLAY LABELS
// ============================================================================

const ORIENTATION_LABELS: Record<string, string> = {
  'alert-oriented': 'Alert & Oriented',
  'confused-responsive': 'Confused but Responsive',
  'disoriented': 'Disoriented',
  'unresponsive': 'Unresponsive',
};

const PAIN_LABELS: Record<string, string> = {
  none: 'None',
  mild: 'Mild',
  moderate: 'Moderate',
  severe: 'Severe',
};

const APPETITE_LABELS: Record<string, string> = {
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
  refused: 'Refused',
};

const ALERTNESS_LABELS: Record<string, string> = {
  alert: 'Alert',
  confused: 'Confused',
  drowsy: 'Drowsy',
  unresponsive: 'Unresponsive',
};

const MOOD_DISPLAY: Record<string, string> = {
  '1': 'Struggling', struggling: 'Struggling',
  '2': 'Difficult', difficult: 'Difficult',
  '3': 'Managing', managing: 'Managing',
  '4': 'Good', good: 'Good',
  '5': 'Great', great: 'Great',
};

// ============================================================================
// BUILDER
// ============================================================================

export async function buildTodaySummary(): Promise<TodaySummary> {
  const today = getTodayDateString();

  // Use ensureDailyInstances for deduplicated instances (same pipeline as Now page)
  const instances = await ensureDailyInstances(DEFAULT_PATIENT_ID, today);
  const [morningWellness, eveningWellness, todayVitals, mealsLogs, upcomingAppointments] =
    await Promise.all([
      getMorningWellness(today),
      getEveningWellness(today),
      getTodayVitalsLog(),
      getMealsLogs(),
      getUpcomingAppointments(),
    ]);

  // Medication adherence from DailyCareInstance (same source as Now tab)
  const medInstances = instances.filter(i => i.itemType === 'medication');
  const medsTaken = medInstances.filter(i => i.status === 'completed').length;
  const medsTotal = medInstances.length;

  // Orientation from morning wellness
  const orientation = morningWellness?.orientation
    ? ORIENTATION_LABELS[morningWellness.orientation] ?? morningWellness.orientation
    : null;

  // Pain level from evening wellness
  const painLevel = eveningWellness?.painLevel
    ? PAIN_LABELS[eveningWellness.painLevel] ?? eveningWellness.painLevel
    : null;

  // Alertness from evening wellness
  const alertness = eveningWellness?.alertness
    ? ALERTNESS_LABELS[eveningWellness.alertness] ?? eveningWellness.alertness
    : null;

  // Optional clinical fields from evening wellness
  const bowelMovement = eveningWellness?.bowelMovement ?? null;
  const bathingStatus = eveningWellness?.bathingStatus ?? null;
  const mobilityStatus = eveningWellness?.mobilityStatus ?? null;

  // Vitals reading from centralStorage
  let vitalsReading: string | null = null;
  if (todayVitals) {
    const parts: string[] = [];
    if (todayVitals.systolic != null && todayVitals.diastolic != null) {
      parts.push(`BP ${todayVitals.systolic}/${todayVitals.diastolic}`);
    }
    if (todayVitals.heartRate != null) parts.push(`HR ${todayVitals.heartRate}`);
    if (todayVitals.glucose != null) parts.push(`Glucose ${todayVitals.glucose}`);
    if (parts.length > 0) vitalsReading = parts.join(' \u00B7 ');
  }

  // Meals status from instances + centralStorage for appetite
  const mealInstances = instances.filter(i => i.itemType === 'nutrition');
  const mealsCompleted = mealInstances.filter(i => i.status === 'completed').length;
  const now = new Date();
  const overdueNames = mealInstances
    .filter(i => i.status === 'pending' && new Date(i.scheduledTime) < now)
    .map(i => i.itemName);
  const mealsStatus = mealInstances.length > 0
    ? { logged: mealsCompleted, total: mealInstances.length, overdueNames }
    : null;

  // Appetite from most recent centralStorage meals log today
  const todayStr = new Date().toDateString();
  const todayMeals = mealsLogs.filter(m => new Date(m.timestamp).toDateString() === todayStr);
  const lastMeal = todayMeals.length > 0 ? todayMeals[0] : null; // logs are unshifted (newest first)
  const appetite = lastMeal?.appetite
    ? APPETITE_LABELS[lastMeal.appetite] ?? lastMeal.appetite
    : null;

  // Mood arc from wellness checks
  let moodArc: string | null = null;
  if (morningWellness?.mood || eveningWellness?.mood) {
    const moods: string[] = [];
    if (morningWellness?.mood) moods.push(MOOD_DISPLAY[String(morningWellness.mood)] || String(morningWellness.mood));
    if (eveningWellness?.mood) moods.push(MOOD_DISPLAY[String(eveningWellness.mood)] || String(eveningWellness.mood));
    moodArc = moods.length > 1 ? moods.join(' \u2192 ') : moods[0];
  }

  // Overdue items (pending instances past their scheduled time)
  const overdueItems = instances
    .filter(i => i.status === 'pending' && new Date(i.scheduledTime) < now)
    .map(i => i.itemName);

  // Next appointment
  const nextAppt = upcomingAppointments.length > 0 ? upcomingAppointments[0] : null;
  const nextAppointment = nextAppt
    ? {
        provider: nextAppt.provider,
        specialty: nextAppt.specialty,
        date: nextAppt.date,
      }
    : null;

  // Flagged items
  const flaggedItems: string[] = [];

  const notTaken = medsTotal - medsTaken;
  if (notTaken > 0) {
    flaggedItems.push(`${notTaken} med${notTaken > 1 ? 's' : ''} not logged`);
  }

  if (
    morningWellness?.orientation &&
    ['confused-responsive', 'disoriented', 'unresponsive'].includes(morningWellness.orientation)
  ) {
    flaggedItems.push(
      ORIENTATION_LABELS[morningWellness.orientation] ?? morningWellness.orientation
    );
  }

  if (eveningWellness?.painLevel === 'severe') {
    flaggedItems.push('Severe pain reported');
  }

  if (lastMeal?.appetite && ['poor', 'refused'].includes(lastMeal.appetite)) {
    flaggedItems.push('Poor appetite');
  }

  return {
    medsAdherence: { taken: medsTaken, total: medsTotal },
    orientation,
    painLevel,
    appetite,
    alertness,
    bowelMovement,
    bathingStatus,
    mobilityStatus,
    vitalsReading,
    mealsStatus,
    moodArc,
    overdueItems,
    nextAppointment,
    flaggedItems,
  };
}

// ============================================================================
// SHIFT REPORT TYPES (used by Journal narrative components)
// ============================================================================

export interface MedicationDetail {
  name: string;
  dosage?: string;
  instructions?: string;
  status: 'completed' | 'pending' | 'skipped' | 'missed';
  scheduledTime: string;
  takenAt?: string;
  sideEffects?: string[];
}

export interface VitalsDetail {
  scheduled: boolean;
  recorded: boolean;
  scheduledTime?: string;
  recordedAt?: string;
  readings?: {
    systolic?: number;
    diastolic?: number;
    heartRate?: number;
    glucose?: number;
    temperature?: number;
    oxygen?: number;
    weight?: number;
  };
}

export interface MoodDetail {
  entries: { source: string; label: string }[];
  morningWellness?: {
    sleepQuality: number;
    mood: string;
    orientation?: string;
  };
  eveningWellness?: {
    dayRating: number;
    painLevel?: string;
    alertness?: string;
    bowelMovement?: string;
    bathingStatus?: string;
    mobilityStatus?: string;
  };
}

export interface MealsDetail {
  total: number;
  meals: {
    name: string;
    status: 'completed' | 'pending' | 'skipped' | 'missed';
    appetite?: string;
    scheduledTime?: string;
  }[];
}

export interface AttentionItem {
  text: string;
  detail?: string;
}

export interface ShiftReport {
  medications: MedicationDetail[];
  vitals: VitalsDetail;
  mood: MoodDetail;
  meals: MealsDetail;
  attentionItems: AttentionItem[];
  nextAppointment: { provider: string; specialty: string; date: string } | null;
}

// ============================================================================
// SHIFT REPORT BUILDER
// ============================================================================

export async function buildShiftReport(): Promise<ShiftReport> {
  const today = getTodayDateString();

  const [instances, logs, morningWellness, eveningWellness, todayVitals, mealsLogs, upcomingAppointments] =
    await Promise.all([
      listDailyInstances(DEFAULT_PATIENT_ID, today),
      listLogsByDate(DEFAULT_PATIENT_ID, today),
      getMorningWellness(today),
      getEveningWellness(today),
      getTodayVitalsLog(),
      getMealsLogs(),
      getUpcomingAppointments(),
    ]);

  // --- Medications ---
  const medInstances = instances.filter(i => i.itemType === 'medication');
  const medications: MedicationDetail[] = medInstances.map(inst => {
    const log = inst.logId ? logs.find(l => l.id === inst.logId) : undefined;
    const medData = log?.data && 'type' in log.data && log.data.type === 'medication' ? log.data : undefined;
    return {
      name: inst.itemName,
      dosage: inst.itemDosage,
      instructions: inst.instructions,
      status: inst.status as MedicationDetail['status'],
      scheduledTime: inst.scheduledTime,
      takenAt: log?.timestamp,
      sideEffects: medData?.sideEffects,
    };
  });

  // --- Vitals ---
  const vitalsInstances = instances.filter(i => i.itemType === 'vitals');
  const vitalsScheduled = vitalsInstances.length > 0;
  const vitalsRecorded = todayVitals != null || vitalsInstances.some(i => i.status === 'completed');
  const vitals: VitalsDetail = {
    scheduled: vitalsScheduled,
    recorded: vitalsRecorded,
    scheduledTime: vitalsInstances[0]?.scheduledTime,
  };
  if (todayVitals) {
    vitals.readings = {
      systolic: todayVitals.systolic,
      diastolic: todayVitals.diastolic,
      heartRate: todayVitals.heartRate,
      glucose: todayVitals.glucose,
      temperature: todayVitals.temperature,
      oxygen: todayVitals.oxygen,
      weight: todayVitals.weight,
    };
    vitals.recordedAt = todayVitals.timestamp;
  }

  // --- Mood & Wellness (mood is captured within wellness checks) ---
  const moodEntries: MoodDetail['entries'] = [];
  if (morningWellness?.mood) {
    moodEntries.push({
      source: 'morning-wellness',
      label: MOOD_DISPLAY[String(morningWellness.mood)] || String(morningWellness.mood),
    });
  }
  if (eveningWellness?.mood) {
    moodEntries.push({
      source: 'evening-wellness',
      label: MOOD_DISPLAY[String(eveningWellness.mood)] || String(eveningWellness.mood),
    });
  }

  const mood: MoodDetail = { entries: moodEntries };
  if (morningWellness) {
    mood.morningWellness = {
      sleepQuality: morningWellness.sleepQuality ?? 0,
      mood: MOOD_DISPLAY[String(morningWellness.mood)] || String(morningWellness.mood) || 'Unknown',
      orientation: morningWellness.orientation
        ? ORIENTATION_LABELS[morningWellness.orientation] ?? morningWellness.orientation
        : undefined,
    };
  }
  if (eveningWellness) {
    mood.eveningWellness = {
      dayRating: eveningWellness.dayRating ?? 0,
      painLevel: eveningWellness.painLevel
        ? PAIN_LABELS[eveningWellness.painLevel] ?? eveningWellness.painLevel
        : undefined,
    };
  }

  // --- Meals ---
  const mealInstances = instances.filter(i => i.itemType === 'nutrition');
  const todayStr = new Date().toDateString();
  const todayMeals = mealsLogs.filter((m: any) => new Date(m.timestamp).toDateString() === todayStr);

  const meals: MealsDetail = {
    total: mealInstances.length,
    meals: mealInstances.map(inst => {
      const matchedMeal = todayMeals.find((m: any) =>
        m.mealType?.toLowerCase() === inst.itemName.toLowerCase()
      );
      return {
        name: inst.itemName,
        status: inst.status as MealsDetail['meals'][number]['status'],
        appetite: matchedMeal?.appetite
          ? APPETITE_LABELS[matchedMeal.appetite] ?? matchedMeal.appetite
          : undefined,
        scheduledTime: inst.scheduledTime,
      };
    }),
  };

  // --- Attention Items ---
  const attentionItems: AttentionItem[] = [];
  const now = new Date();

  // Overdue medications
  const overdueMeds = medInstances.filter(
    i => i.status === 'pending' && new Date(i.scheduledTime) < now
  );
  for (const m of overdueMeds) {
    attentionItems.push({
      text: `${m.itemName} not yet logged`,
      detail: m.itemDosage,
    });
  }

  // Orientation concern
  if (
    morningWellness?.orientation &&
    ['confused-responsive', 'disoriented', 'unresponsive'].includes(morningWellness.orientation)
  ) {
    attentionItems.push({
      text: ORIENTATION_LABELS[morningWellness.orientation] ?? morningWellness.orientation,
      detail: 'from morning wellness check',
    });
  }

  // Severe pain
  if (eveningWellness?.painLevel === 'severe') {
    attentionItems.push({
      text: 'Severe pain reported',
      detail: 'from evening wellness check',
    });
  }

  // Poor appetite
  const lastMeal = todayMeals.length > 0 ? todayMeals[0] : null;
  if (lastMeal?.appetite && ['poor', 'refused'].includes(lastMeal.appetite)) {
    attentionItems.push({
      text: 'Poor appetite',
      detail: `${lastMeal.mealType || 'Meal'} — ${APPETITE_LABELS[lastMeal.appetite] ?? lastMeal.appetite}`,
    });
  }

  // Evening wellness check not completed
  if (!eveningWellness && now.getHours() >= 20) {
    attentionItems.push({
      text: 'Evening wellness check not completed',
    });
  }

  // --- Next Appointment ---
  const nextAppt = upcomingAppointments.length > 0 ? upcomingAppointments[0] : null;
  const nextAppointment = nextAppt
    ? { provider: nextAppt.provider, specialty: nextAppt.specialty, date: nextAppt.date }
    : null;

  return {
    medications,
    vitals,
    mood,
    meals,
    attentionItems,
    nextAppointment,
  };
}

// ============================================================================
// REDACTED SHARE SUMMARY
// Strips sensitive details (exact vitals, dosages) for quick text sharing.
// Only includes aggregated counts and status labels — no raw health values.
// ============================================================================

export interface ShareSummary {
  medsStatus: string;
  vitalsStatus: string;
  wellnessStatus: string;
  mealsStatus: string;
  attentionCount: number;
  nextAppointment: string | null;
  generatedAt: string;
}

export async function buildShareSummary(): Promise<ShareSummary> {
  const report = await buildShiftReport();

  // Medications: count only, no names or dosages
  const medsTaken = report.medications.filter(m => m.status === 'completed' || m.status === 'skipped').length;
  const medsTotal = report.medications.length;
  const medsStatus = medsTotal > 0
    ? `${medsTaken}/${medsTotal} medications logged`
    : 'No medications scheduled';

  // Vitals: recorded/not recorded only, no actual readings
  const vitalsStatus = report.vitals.recorded
    ? 'Vitals recorded today'
    : report.vitals.scheduled
    ? 'Vitals scheduled but not yet recorded'
    : 'No vitals scheduled';

  // Wellness: mood label only, no pain/orientation details
  const moodLabels = report.mood.entries.map(e => e.label);
  const wellnessStatus = moodLabels.length > 0
    ? `Mood: ${moodLabels.join(' → ')}`
    : 'No wellness checks completed';

  // Meals: count only
  const mealsCompleted = report.meals.meals.filter(m => m.status === 'completed' || m.status === 'skipped').length;
  const mealsStatus = report.meals.total > 0
    ? `${mealsCompleted}/${report.meals.total} meals logged`
    : 'No meals scheduled';

  // Appointment: provider name only, no specialty
  const nextAppointment = report.nextAppointment
    ? `Next appointment: ${new Date(report.nextAppointment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : null;

  return {
    medsStatus,
    vitalsStatus,
    wellnessStatus,
    mealsStatus,
    attentionCount: report.attentionItems.length,
    nextAppointment,
    generatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// CARE BRIEF — Progressive Disclosure Model (v5.4)
// ============================================================================

export interface SafetyData {
  fallRisk: boolean;
  wanderingRisk: boolean;
  codeStatus?: string;
  dnr: boolean;
  mobilityStatus?: string;
  cognitiveBaseline?: string;
  emergencyContacts?: EmergencyContact[];
}

export interface CareBrief {
  patient: {
    name: string;
    relationship?: string;
    age?: string;
    gender?: string;
    bloodType?: string;
    conditions?: string[];
    allergies?: string[];
    mobilityStatus?: string;
    cognitiveBaseline?: string;
  };

  sections: {
    medications: boolean;
    vitals: boolean;
    vitalsHaveBaselines: boolean;
    nutrition: boolean;
    symptoms: boolean;
    safety: boolean;
    showExportPdf: boolean;
  };

  statusNarrative: string;

  medications: MedicationDetail[];
  vitals: VitalsDetail;
  mood: MoodDetail;
  meals: MealsDetail;
  attentionItems: AttentionItem[];
  nextAppointment: { provider: string; specialty: string; date: string } | null;

  wellnessChecks: { done: number; total: number };
  sleep: { logged: boolean; hours?: number; quality?: number };
  hydration: { glasses?: number; logged: boolean };
  medicalInfo: MedicalInfo | null;
  safety: SafetyData | null;
  clinicalSettings: ClinicalCareSettings;
  interpretations: {
    medications?: string;
    vitals?: string;
    nutrition?: string;
  };
  handoffNarrative: string;
  generatedAt: Date;
}

export interface DefaultOpenSections {
  status: boolean;
  meds: boolean;
  vitals: boolean;
  nutrition: boolean;
  symptoms: boolean;
  safety: boolean;
  attention: boolean;
}

// ============================================================================
// CARE BRIEF BUILDER
// ============================================================================

export async function buildCareBrief(): Promise<CareBrief> {
  const today = getTodayDateString();

  let instances: Awaited<ReturnType<typeof ensureDailyInstances>>;
  let logs: Awaited<ReturnType<typeof listLogsByDate>>;
  let morningWellness: Awaited<ReturnType<typeof getMorningWellness>>;
  let eveningWellness: Awaited<ReturnType<typeof getEveningWellness>>;
  let todayVitals: Awaited<ReturnType<typeof getTodayVitalsLog>>;
  let mealsLogs: Awaited<ReturnType<typeof getMealsLogs>>;
  let upcomingAppointments: Awaited<ReturnType<typeof getUpcomingAppointments>>;
  let sleepLog: Awaited<ReturnType<typeof getTodaySleepLog>>;
  let waterLog: Awaited<ReturnType<typeof getTodayWaterLog>>;
  let medInfo: MedicalInfo | null;
  let clinicalSettings: ClinicalCareSettings;
  let patientName: string;
  let emergencyContacts: EmergencyContact[];
  let patientRegistry: Awaited<ReturnType<typeof getPatientRegistry>>;

  try {
    // Use ensureDailyInstances (same pipeline as Now page) to get deduplicated,
    // stale-cleaned instances — keeps Journal in sync with Now page counts.
    const dedupedInstances = await ensureDailyInstances(DEFAULT_PATIENT_ID, today);

    instances = dedupedInstances;

    [logs, morningWellness, eveningWellness, todayVitals, mealsLogs, upcomingAppointments, sleepLog, waterLog, medInfo, clinicalSettings, patientName, emergencyContacts, patientRegistry] =
      await Promise.all([
        listLogsByDate(DEFAULT_PATIENT_ID, today),
        getMorningWellness(today),
        getEveningWellness(today),
        getTodayVitalsLog(),
        getMealsLogs(),
        getUpcomingAppointments(),
        getTodaySleepLog(),
        getTodayWaterLog(),
        getMedicalInfo(),
        getClinicalCareSettings(),
        safeGetItem<string | null>(StorageKeys.PATIENT_NAME, null).then(n => n || 'Patient'),
        getEmergencyContacts(),
        getPatientRegistry(),
      ]);
  } catch (error) {
    logError('buildCareBrief.fetchData', error);
    throw error;
  }

  // --- Build ShiftReport data (reuse same logic) ---
  const medInstances = instances.filter(i => i.itemType === 'medication');
  const medications: MedicationDetail[] = medInstances.map(inst => {
    const log = inst.logId ? logs.find(l => l.id === inst.logId) : undefined;
    const medData = log?.data && 'type' in log.data && log.data.type === 'medication' ? log.data : undefined;
    return {
      name: inst.itemName,
      dosage: inst.itemDosage,
      instructions: inst.instructions,
      status: inst.status as MedicationDetail['status'],
      scheduledTime: inst.scheduledTime,
      takenAt: log?.timestamp,
      sideEffects: medData?.sideEffects,
    };
  });

  const vitalsInstances = instances.filter(i => i.itemType === 'vitals');
  const vitalsScheduled = vitalsInstances.length > 0;
  const vitalsRecorded = todayVitals != null || vitalsInstances.some(i => i.status === 'completed');
  const vitals: VitalsDetail = {
    scheduled: vitalsScheduled,
    recorded: vitalsRecorded,
    scheduledTime: vitalsInstances[0]?.scheduledTime,
  };
  if (todayVitals) {
    vitals.readings = {
      systolic: todayVitals.systolic,
      diastolic: todayVitals.diastolic,
      heartRate: todayVitals.heartRate,
      glucose: todayVitals.glucose,
      temperature: todayVitals.temperature,
      oxygen: todayVitals.oxygen,
      weight: todayVitals.weight,
    };
    vitals.recordedAt = todayVitals.timestamp;
  }

  const moodEntries: MoodDetail['entries'] = [];
  if (morningWellness?.mood) {
    moodEntries.push({ source: 'morning-wellness', label: MOOD_DISPLAY[String(morningWellness.mood)] || String(morningWellness.mood) });
  }
  if (eveningWellness?.mood) {
    moodEntries.push({ source: 'evening-wellness', label: MOOD_DISPLAY[String(eveningWellness.mood)] || String(eveningWellness.mood) });
  }
  const mood: MoodDetail = { entries: moodEntries };
  if (morningWellness) {
    mood.morningWellness = {
      sleepQuality: morningWellness.sleepQuality ?? 0,
      mood: MOOD_DISPLAY[String(morningWellness.mood)] || String(morningWellness.mood) || 'Unknown',
      orientation: morningWellness.orientation
        ? ORIENTATION_LABELS[morningWellness.orientation] ?? morningWellness.orientation
        : undefined,
    };
  }
  if (eveningWellness) {
    mood.eveningWellness = {
      dayRating: eveningWellness.dayRating ?? 0,
      painLevel: eveningWellness.painLevel
        ? PAIN_LABELS[eveningWellness.painLevel] ?? eveningWellness.painLevel
        : undefined,
    };
  }

  const mealInstances = instances.filter(i => i.itemType === 'nutrition');
  const todayStr = new Date().toDateString();
  const todayMeals = mealsLogs.filter((m: any) => new Date(m.timestamp).toDateString() === todayStr);
  const meals: MealsDetail = {
    total: mealInstances.length,
    meals: mealInstances.map(inst => {
      const matchedMeal = todayMeals.find((m: any) =>
        m.mealType?.toLowerCase() === inst.itemName.toLowerCase()
      );
      return {
        name: inst.itemName,
        status: inst.status as MealsDetail['meals'][number]['status'],
        appetite: matchedMeal?.appetite
          ? APPETITE_LABELS[matchedMeal.appetite] ?? matchedMeal.appetite
          : undefined,
        scheduledTime: inst.scheduledTime,
      };
    }),
  };

  // --- Attention Items ---
  const attentionItems: AttentionItem[] = [];
  const now = new Date();

  const overdueMeds = medInstances.filter(i => i.status === 'pending' && new Date(i.scheduledTime) < now);
  for (const m of overdueMeds) {
    attentionItems.push({ text: `${m.itemName} not yet logged`, detail: m.itemDosage });
  }
  if (morningWellness?.orientation && ['confused-responsive', 'disoriented', 'unresponsive'].includes(morningWellness.orientation)) {
    attentionItems.push({ text: ORIENTATION_LABELS[morningWellness.orientation] ?? morningWellness.orientation, detail: 'from morning wellness check' });
  }
  if (eveningWellness?.painLevel === 'severe') {
    attentionItems.push({ text: 'Severe pain reported', detail: 'from evening wellness check' });
  }
  const lastMeal = todayMeals.length > 0 ? todayMeals[0] : null;
  if (lastMeal?.appetite && ['poor', 'refused'].includes(lastMeal.appetite)) {
    attentionItems.push({ text: 'Poor appetite', detail: `${lastMeal.mealType || 'Meal'} — ${APPETITE_LABELS[lastMeal.appetite] ?? lastMeal.appetite}` });
  }
  if (!eveningWellness && now.getHours() >= 20) {
    attentionItems.push({ text: 'Evening wellness check not completed' });
  }

  // Clinical safety attention items
  if (clinicalSettings.enabled) {
    if (clinicalSettings.fallRisk) {
      attentionItems.push({ text: 'Fall risk identified', detail: 'Clinical care setting' });
    }
    if (clinicalSettings.wanderingRisk) {
      attentionItems.push({ text: 'Wandering risk identified', detail: 'Clinical care setting' });
    }
  }

  // --- Next Appointment ---
  const nextAppt = upcomingAppointments.length > 0 ? upcomingAppointments[0] : null;
  const nextAppointment = nextAppt
    ? { provider: nextAppt.provider, specialty: nextAppt.specialty, date: nextAppt.date }
    : null;

  // --- Wellness checks (from instances, same source as Now page) ---
  const wellnessInstances = instances.filter(i => i.itemType === 'wellness');
  const wellnessChecks = {
    done: wellnessInstances.filter(i => i.status === 'completed' || i.status === 'skipped').length,
    total: wellnessInstances.length,
  };

  // --- Sleep & Hydration ---
  const sleep = {
    logged: sleepLog != null,
    hours: sleepLog?.hours,
    quality: sleepLog?.quality,
  };
  const hydration = {
    logged: waterLog != null,
    glasses: waterLog?.glasses,
  };

  // --- Compute section visibility ---
  const hasMeds = medications.length > 0;
  const hasVitals = vitals.scheduled || vitals.recorded;
  const hasNutrition = meals.total > 0 || hydration.logged;
  const hasSymptoms = mood.entries.length > 0 || mood.morningWellness != null || mood.eveningWellness != null;
  const clinicalEnabled = clinicalSettings.enabled;

  // Count active data types for tier computation
  const dataTypeCount = [hasMeds, hasVitals, hasNutrition, hasSymptoms, sleep.logged].filter(Boolean).length;
  const isTier2 = dataTypeCount >= 2;

  const sections = {
    medications: hasMeds,
    vitals: hasVitals,
    vitalsHaveBaselines: isTier2 && hasVitals,
    nutrition: hasNutrition,
    symptoms: hasSymptoms,
    safety: clinicalEnabled,
    showExportPdf: isTier2,
  };

  // --- Safety data (Tier 3) ---
  let safety: SafetyData | null = null;
  if (clinicalEnabled) {
    safety = {
      fallRisk: clinicalSettings.fallRisk ?? false,
      wanderingRisk: clinicalSettings.wanderingRisk ?? false,
      codeStatus: clinicalSettings.codeStatus,
      dnr: clinicalSettings.dnr ?? false,
      mobilityStatus: clinicalSettings.mobilityStatus,
      cognitiveBaseline: clinicalSettings.cognitiveBaseline,
      emergencyContacts: emergencyContacts.length > 0 ? emergencyContacts : undefined,
    };
  }

  // --- Patient snapshot ---
  const activeDiagnoses = medInfo?.diagnoses?.filter(d => d.status === 'active').map(d => d.condition) ?? [];
  const activePatient = patientRegistry?.patients?.find(p => p.id === patientRegistry.activePatientId);
  const relationship = activePatient?.relationship && activePatient.relationship !== 'self'
    ? activePatient.relationship
    : undefined;
  const patient = {
    name: patientName,
    relationship,
    age: medInfo?.age,
    gender: medInfo?.gender,
    bloodType: medInfo?.bloodType,
    conditions: activeDiagnoses.length > 0 ? activeDiagnoses : undefined,
    allergies: medInfo?.allergies && medInfo.allergies.length > 0 ? medInfo.allergies : undefined,
    mobilityStatus: clinicalEnabled ? clinicalSettings.mobilityStatus : undefined,
    cognitiveBaseline: clinicalEnabled ? clinicalSettings.cognitiveBaseline : undefined,
  };

  // --- Status narrative ---
  const statusNarrative = buildStatusNarrative({
    medications, vitals, mood, meals, sleep, hydration,
    morningWellness, attentionItems, clinicalEnabled, safety,
  });

  // --- Interpretations (plain-English flags for clinical context) ---
  const interpretations: CareBrief['interpretations'] = {};

  // Medications: flag when any med skipped without reason
  const skippedMeds = medications.filter(m => m.status === 'skipped' || m.status === 'missed');
  const pendingOverdue = medications.filter(m => m.status === 'pending' && new Date(m.scheduledTime) < new Date());
  if (skippedMeds.length > 0) {
    const names = skippedMeds.map(m => m.name).join(', ');
    interpretations.medications = `${names} ${skippedMeds.length === 1 ? 'was' : 'were'} skipped today. Check whether this was intentional or if there's a side effect concern.`;
  } else if (pendingOverdue.length > 0) {
    const names = pendingOverdue.map(m => m.name).join(', ');
    interpretations.medications = `${names} ${pendingOverdue.length === 1 ? 'is' : 'are'} overdue. Confirm whether ${pendingOverdue.length === 1 ? 'it was' : 'they were'} taken but not logged, or missed entirely.`;
  }

  // Vitals: flag when glucose or BP exceeds typical thresholds
  if (vitals.recorded && vitals.readings) {
    const r = vitals.readings;
    const vitalFlags: string[] = [];
    if (r.systolic != null && r.diastolic != null && (r.systolic >= 140 || r.diastolic >= 90)) {
      vitalFlags.push(`Blood pressure ${r.systolic}/${r.diastolic} is elevated`);
    }
    if (r.glucose != null && r.glucose >= 150) {
      vitalFlags.push(`Glucose ${r.glucose} mg/dL is above typical range`);
    }
    if (vitalFlags.length > 0) {
      interpretations.vitals = `${vitalFlags.join('. ')}. Compare with their usual baseline — if this is a pattern, it may be worth mentioning at the next visit.`;
    }
  }

  // Nutrition: flag when hydration low + diabetes condition, or poor appetite
  const hasDiabetes = activeDiagnoses.some(d => d.toLowerCase().includes('diabet'));
  const lowHydration = hydration.logged && hydration.glasses != null && hydration.glasses < 4;
  const poorAppetite = lastMeal?.appetite && ['poor', 'refused'].includes(lastMeal.appetite);
  if (lowHydration && hasDiabetes) {
    interpretations.nutrition = `Only ${hydration.glasses} glasses of water logged with a diabetes diagnosis. Dehydration can affect blood sugar levels — encourage more fluids.`;
  } else if (poorAppetite && hasDiabetes) {
    interpretations.nutrition = `Poor appetite today with a diabetes diagnosis. Reduced food intake can affect blood sugar — monitor glucose closely.`;
  } else if (lowHydration) {
    interpretations.nutrition = `Only ${hydration.glasses} glasses of water logged today. Encourage more fluids, especially if medications require adequate hydration.`;
  } else if (poorAppetite) {
    interpretations.nutrition = `Appetite was poor today. If this continues, it may be worth discussing at the next appointment.`;
  }

  // --- Handoff Narrative (conversational summary for care transitions) ---
  const handoffParts: string[] = [];

  // Day assessment
  const allMedsTaken = medications.length > 0 && medications.every(m => m.status === 'completed' || m.status === 'skipped');
  const missedMeds = medications.filter(m => m.status === 'missed');
  if (medications.length === 0) {
    handoffParts.push(`No medications are scheduled today.`);
  } else if (allMedsTaken) {
    handoffParts.push(`All ${medications.length} medications have been taken.`);
  } else if (missedMeds.length > 0) {
    const taken = medications.filter(m => m.status === 'completed' || m.status === 'skipped').length;
    handoffParts.push(`${taken} of ${medications.length} medications taken. ${missedMeds.map(m => m.name).join(', ')} missed.`);
  } else {
    const taken = medications.filter(m => m.status === 'completed' || m.status === 'skipped').length;
    handoffParts.push(`${taken} of ${medications.length} medications have been logged so far.`);
  }

  // Attention items rewritten conversationally
  for (const item of attentionItems) {
    if (item.detail) {
      handoffParts.push(`${item.text} — ${item.detail}.`);
    } else {
      handoffParts.push(`${item.text}.`);
    }
  }

  // Next appointment if within 5 days
  if (nextAppointment) {
    const apptDate = new Date(nextAppointment.date);
    const daysUntil = Math.ceil((apptDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil >= 0 && daysUntil <= 5) {
      handoffParts.push(`Upcoming ${nextAppointment.specialty} appointment with ${nextAppointment.provider} ${daysUntil === 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`}.`);
    }
  }

  // Pending evening tasks
  if (!eveningWellness && new Date().getHours() < 22) {
    handoffParts.push(`Evening wellness check still needs to be completed.`);
  }

  const handoffNarrative = handoffParts.length > 0
    ? handoffParts.join(' ')
    : 'Day is going smoothly with no items requiring special attention.';

  return {
    patient,
    sections,
    statusNarrative,
    medications,
    vitals,
    mood,
    meals,
    attentionItems,
    nextAppointment,
    wellnessChecks,
    sleep,
    hydration,
    medicalInfo: medInfo,
    safety,
    clinicalSettings,
    interpretations,
    handoffNarrative,
    generatedAt: new Date(),
  };
}

// ============================================================================
// STATUS NARRATIVE BUILDER
// ============================================================================

interface NarrativeInput {
  medications: MedicationDetail[];
  vitals: VitalsDetail;
  mood: MoodDetail;
  meals: MealsDetail;
  sleep: { logged: boolean; hours?: number; quality?: number };
  hydration: { glasses?: number; logged: boolean };
  morningWellness: any;
  attentionItems: AttentionItem[];
  clinicalEnabled: boolean;
  safety: SafetyData | null;
}

export function buildStatusNarrative(input: NarrativeInput): string {
  const parts: string[] = [];

  // Orientation / alertness
  if (input.morningWellness?.orientation) {
    const label = ORIENTATION_LABELS[input.morningWellness.orientation] ?? input.morningWellness.orientation;
    if (input.clinicalEnabled) {
      parts.push(`${label} this morning.`);
    } else {
      parts.push(`${label}.`);
    }
  }

  // Sleep
  if (input.sleep.logged && input.sleep.hours != null) {
    parts.push(`Slept ${input.sleep.hours}h.`);
  }

  // Medications
  const medsTaken = input.medications.filter(m => m.status === 'completed' || m.status === 'skipped');
  const medsMissed = input.medications.filter(m => m.status === 'missed');
  const medsTotal = input.medications.length;
  if (medsTotal > 0) {
    if (medsTaken.length === medsTotal) {
      const firstMed = medsTaken[0];
      const time = firstMed.takenAt
        ? new Date(firstMed.takenAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        : '';
      if (medsTotal === 1 && time) {
        parts.push(`${firstMed.name} taken at ${time}.`);
      } else {
        parts.push(`All ${medsTotal} medications taken.`);
      }
    } else if (medsMissed.length > 0) {
      parts.push(`${medsTaken.length}/${medsTotal} medications taken. ${medsMissed.map(m => m.name).join(', ')} missed.`);
    } else {
      parts.push(`${medsTaken.length}/${medsTotal} medications logged.`);
    }
  }

  // Vitals
  if (input.vitals.recorded && input.vitals.readings) {
    const r = input.vitals.readings;
    const vParts: string[] = [];
    if (r.systolic != null && r.diastolic != null) {
      const bpStr = `BP ${r.systolic}/${r.diastolic}`;
      if (input.clinicalEnabled && input.safety) {
        vParts.push(bpStr);
      } else {
        vParts.push(bpStr);
      }
    }
    if (r.heartRate != null) vParts.push(`HR ${r.heartRate}`);
    if (r.glucose != null) vParts.push(`Glucose ${r.glucose}`);
    if (vParts.length > 0) {
      parts.push(`${vParts.join(', ')}.`);
    }
  }

  // Meals/appetite
  const completedMeals = input.meals.meals.filter(m => m.status === 'completed');
  if (completedMeals.length > 0) {
    const lastCompleted = completedMeals[completedMeals.length - 1];
    if (lastCompleted.appetite) {
      parts.push(`Appetite ${lastCompleted.appetite.toLowerCase()} at ${lastCompleted.name.toLowerCase()}.`);
    }
  }

  // Hydration
  if (input.hydration.logged && input.hydration.glasses != null) {
    parts.push(`${input.hydration.glasses} glasses of water.`);
  }

  // Mood
  if (input.mood.entries.length > 0) {
    const labels = input.mood.entries.map(e => e.label);
    if (labels.length === 1) {
      parts.push(`Mood: ${labels[0]}.`);
    } else {
      parts.push(`Mood: ${labels[0]} \u2192 ${labels[labels.length - 1]}.`);
    }
  }

  if (parts.length === 0) {
    return 'No data logged yet today. Start tracking to see your care summary here.';
  }

  return parts.join(' ');
}

// ============================================================================
// DEFAULT OPEN SECTIONS
// ============================================================================

export function getDefaultOpenSections(brief: CareBrief): DefaultOpenSections {
  return {
    status: true,
    meds: brief.medications.some(m => m.status === 'pending' || m.status === 'skipped'),
    vitals: brief.interpretations?.vitals != null,
    nutrition: brief.interpretations?.nutrition != null,
    symptoms: false,
    safety: brief.sections.safety,
    attention: true,
  };
}
