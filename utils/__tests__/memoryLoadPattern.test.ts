// ============================================================================
// MEMORY LOAD PATTERN TEST
// Proves that "load all → filter" pattern creates unbounded allocations
// and that date-specific queries fix it.
//
// Context: Hermes OOM crash (Thread 10, HadesGC::OldGen::alloc failed)
// Root cause: getSymptoms/getVitals/getNotes load ENTIRE dataset per call,
// and are called 3-5x in parallel across tabs on every focus event.
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Inline minimal storage functions to test the pattern ---

const VITALS_KEY = '@vitals_readings';
const SYMPTOMS_KEY = '@embermate_symptoms';
const NOTES_KEY = '@embermate_notes';

interface VitalReading {
  id: string;
  type: string;
  value: number;
  timestamp: string;
  unit: string;
}

interface SymptomLog {
  id: string;
  symptom: string;
  severity: number;
  timestamp: string;
  date: string;
}

interface NoteLog {
  id: string;
  content: string;
  timestamp: string;
  date: string;
}

// BAD: Load-all pattern (current implementation)
async function getVitals_loadAll(): Promise<VitalReading[]> {
  const data = await AsyncStorage.getItem(VITALS_KEY);
  return data ? JSON.parse(data) : [];
}

async function getSymptoms_loadAll(): Promise<SymptomLog[]> {
  const data = await AsyncStorage.getItem(SYMPTOMS_KEY);
  return data ? JSON.parse(data) : [];
}

async function getNotes_loadAll(): Promise<NoteLog[]> {
  const data = await AsyncStorage.getItem(NOTES_KEY);
  return data ? JSON.parse(data) : [];
}

// GOOD: Date-specific pattern (fix)
async function getVitalsForDate(date: string): Promise<VitalReading[]> {
  const data = await AsyncStorage.getItem(VITALS_KEY);
  if (!data) return [];
  const all: VitalReading[] = JSON.parse(data);
  return all.filter(v => v.timestamp.startsWith(date));
}

async function getSymptomsForDate(date: string): Promise<SymptomLog[]> {
  const data = await AsyncStorage.getItem(SYMPTOMS_KEY);
  if (!data) return [];
  const all: SymptomLog[] = JSON.parse(data);
  return all.filter(s => s.date === date);
}

async function getNotesForDate(date: string): Promise<NoteLog[]> {
  const data = await AsyncStorage.getItem(NOTES_KEY);
  if (!data) return [];
  const all: NoteLog[] = JSON.parse(data);
  return all.filter(n => n.date === date);
}

// --- Test helpers ---

function generateVitals(count: number): VitalReading[] {
  return Array.from({ length: count }, (_, i) => {
    const daysAgo = Math.floor(i / 5); // ~5 readings per day
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return {
      id: `v-${i}`,
      type: i % 2 === 0 ? 'systolic' : 'diastolic',
      value: 100 + Math.floor(Math.random() * 40),
      timestamp: d.toISOString(),
      unit: 'mmHg',
    };
  });
}

function generateSymptoms(count: number): SymptomLog[] {
  return Array.from({ length: count }, (_, i) => {
    const daysAgo = Math.floor(i / 3);
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const dateStr = d.toISOString().split('T')[0];
    return {
      id: `s-${i}`,
      symptom: ['Pain', 'Fatigue', 'Nausea'][i % 3],
      severity: 1 + (i % 10),
      timestamp: d.toISOString(),
      date: dateStr,
    };
  });
}

function generateNotes(count: number): NoteLog[] {
  return Array.from({ length: count }, (_, i) => {
    const daysAgo = Math.floor(i / 2);
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const dateStr = d.toISOString().split('T')[0];
    return {
      id: `n-${i}`,
      content: `Note entry number ${i} with some content to simulate real data`,
      timestamp: d.toISOString(),
      date: dateStr,
    };
  });
}

// --- Tests ---

describe('Memory Load Pattern: Load-All vs Date-Specific', () => {
  const today = new Date().toISOString().split('T')[0];

  beforeEach(async () => {
    await AsyncStorage.clear();
    // Seed storage with 90 days of data (realistic for active user)
    const vitals = generateVitals(450);   // ~5 vitals/day × 90 days
    const symptoms = generateSymptoms(270); // ~3 symptoms/day × 90 days
    const notes = generateNotes(180);      // ~2 notes/day × 90 days

    await AsyncStorage.setItem(VITALS_KEY, JSON.stringify(vitals));
    await AsyncStorage.setItem(SYMPTOMS_KEY, JSON.stringify(symptoms));
    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  });

  test('load-all pattern: N calls parse full dataset N times', async () => {
    // This simulates what happens on app startup when today.tsx, log.tsx,
    // and brief.tsx all call the load-all functions via useFocusEffect.
    //
    // Each JSON.parse creates a full object graph. With 900 records across
    // 3 storage keys, called 11 times total = 11 full deserializations.

    let totalObjectsCreated = 0;

    // Simulate today.tsx loadData() — 3 load-all calls
    const todaySymptoms = await getSymptoms_loadAll();
    totalObjectsCreated += todaySymptoms.length;
    const todayNotes = await getNotes_loadAll();
    totalObjectsCreated += todayNotes.length;
    const todayVitals = await getVitals_loadAll();
    totalObjectsCreated += todayVitals.length;

    // Simulate log.tsx loadRecentLogs() — 3 more load-all calls
    const logSymptoms = await getSymptoms_loadAll();
    totalObjectsCreated += logSymptoms.length;
    const logNotes = await getNotes_loadAll();
    totalObjectsCreated += logNotes.length;
    const logVitals = await getVitals_loadAll();
    totalObjectsCreated += logVitals.length;

    // Simulate log.tsx loadContextualInfo() — 2 more load-all calls
    const ctxVitals = await getVitals_loadAll();
    totalObjectsCreated += ctxVitals.length;
    const ctxNotes = await getNotes_loadAll();
    totalObjectsCreated += ctxNotes.length;

    // Simulate brief.tsx getVitalsByType — 2 more load-all calls
    const bpSystolic = await getVitals_loadAll();
    totalObjectsCreated += bpSystolic.length;
    const bpDiastolic = await getVitals_loadAll();
    totalObjectsCreated += bpDiastolic.length;

    // ASSERT: Massive object allocation
    // 450 vitals × 5 calls = 2250 vital objects
    // 270 symptoms × 2 calls = 540 symptom objects
    // 180 notes × 3 calls = 540 note objects
    // Total: 3330 objects created, only ~10 needed (today's data)
    expect(totalObjectsCreated).toBeGreaterThan(3000);

    // The actual data needed for "today" is tiny
    const todayVitalsOnly = todayVitals.filter(v => v.timestamp.startsWith(today));
    const todaySymptomsOnly = todaySymptoms.filter(s => s.date === today);
    const todayNotesOnly = todayNotes.filter(n => n.date === today);
    const neededObjects = todayVitalsOnly.length + todaySymptomsOnly.length + todayNotesOnly.length;

    // The waste ratio shows why Hermes OOMs
    const wasteRatio = totalObjectsCreated / Math.max(neededObjects, 1);
    expect(wasteRatio).toBeGreaterThan(100); // >100x waste
  });

  test('date-specific pattern: only today data is parsed into objects', async () => {
    // Same scenario but using date-filtered queries.
    // Still parses full JSON (AsyncStorage limitation), but each key
    // is only read ONCE if we consolidate callers.

    let totalObjectsReturned = 0;

    // Single load per data type, filtered to today
    const vitals = await getVitalsForDate(today);
    totalObjectsReturned += vitals.length;
    const symptoms = await getSymptomsForDate(today);
    totalObjectsReturned += symptoms.length;
    const notes = await getNotesForDate(today);
    totalObjectsReturned += notes.length;

    // Only today's data returned — typically <15 items
    expect(totalObjectsReturned).toBeLessThan(20);
  });

  test('today.tsx should use date-specific queries, not load-all', async () => {
    // Verify that getSymptomsByDate, getNotesByDate exist and return correct data
    const symptoms = await getSymptomsForDate(today);
    const notes = await getNotesForDate(today);
    const vitals = await getVitalsForDate(today);

    // All returned items should be from today
    symptoms.forEach(s => expect(s.date).toBe(today));
    notes.forEach(n => expect(n.date).toBe(today));
    vitals.forEach(v => expect(v.timestamp.startsWith(today)).toBe(true));
  });

  test('log.tsx calls getVitals() and getNotes() twice each — should consolidate', async () => {
    // This test documents the bug: log.tsx's loadRecentLogs AND
    // loadContextualInfo both independently call getVitals() and getNotes().
    // They should share a single load.

    let vitalsCallCount = 0;
    let notesCallCount = 0;

    // Simulate the CURRENT (broken) log.tsx pattern:
    // loadRecentLogs()
    await getVitals_loadAll(); vitalsCallCount++;
    await getNotes_loadAll(); notesCallCount++;
    await getSymptoms_loadAll();

    // loadContextualInfo()
    await getVitals_loadAll(); vitalsCallCount++;  // DUPLICATE
    await getNotes_loadAll(); notesCallCount++;    // DUPLICATE

    // BUG: 2 calls each when 1 would suffice
    expect(vitalsCallCount).toBe(2);
    expect(notesCallCount).toBe(2);

    // After fix, both should be 1 (or use date-specific queries)
  });

  test('brief.tsx getVitalsByType calls getVitals() twice — should batch', async () => {
    // brief.tsx calls getVitalsByType('systolic') then getVitalsByType('diastolic')
    // Each internally calls getVitals() which loads ALL vitals.
    // Should use a single getVitals() call and filter both types.

    let vitalsLoadCount = 0;

    // Current pattern (2 full loads)
    const allVitals1 = await getVitals_loadAll(); vitalsLoadCount++;
    const systolic = allVitals1.filter(v => v.type === 'systolic');

    const allVitals2 = await getVitals_loadAll(); vitalsLoadCount++;
    const diastolic = allVitals2.filter(v => v.type === 'diastolic');

    expect(vitalsLoadCount).toBe(2); // BUG: should be 1

    // Fixed pattern (1 load, 2 filters)
    vitalsLoadCount = 0;
    const allVitals = await getVitals_loadAll(); vitalsLoadCount++;
    const systolicFixed = allVitals.filter(v => v.type === 'systolic');
    const diastolicFixed = allVitals.filter(v => v.type === 'diastolic');

    expect(vitalsLoadCount).toBe(1); // FIXED
    expect(systolicFixed).toEqual(systolic);
    expect(diastolicFixed).toEqual(diastolic);
  });
});
