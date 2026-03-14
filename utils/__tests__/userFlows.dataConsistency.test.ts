// ============================================================================
// USER FLOW DATA CONSISTENCY TESTS
// Verify that data written by log screens can be read by all consuming screens.
// Tests the actual storage functions (not UI) to confirm data pipeline integrity.
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';

// Storage modules under test
import {
  addMedicationToPlan,
  getMedicationsFromPlan,
  getOrCreateCarePlanConfig,
  resetCarePlanConfig,
} from '../../storage/carePlanConfigRepo';

import {
  createMedication,
  getMedications,
} from '../medicationStorage';

import {
  saveVital,
  getVitals,
  getVitalsByType,
} from '../vitalsStorage';

import {
  saveVitalsLog,
  getVitalsLogs,
  getTodayVitalsLog,
} from '../centralStorage';

import {
  createAppointment,
  getAppointments,
  getUpcomingAppointments,
} from '../appointmentStorage';

import {
  saveMorningWellness,
  getAllMorningWellness,
} from '../wellnessCheckStorage';

const APP_ROOT = path.resolve(__dirname, '../../');

/**
 * Read a source file relative to project root
 */
function readSource(relativePath: string): string {
  const fullPath = path.join(APP_ROOT, relativePath);
  return fs.readFileSync(fullPath, 'utf8');
}

// ============================================================================
// TEST 1: Medication data consistency
// ============================================================================

describe('Medication data consistency', () => {
  const DEFAULT_PATIENT_ID = 'default';

  beforeEach(async () => {
    await resetCarePlanConfig(DEFAULT_PATIENT_ID);
  });

  it('addMedicationToPlan writes data that getMedicationsFromPlan can read', async () => {
    const medData = {
      name: 'Lisinopril',
      dosage: '10mg',
      instructions: 'Take with food',
      timesOfDay: ['morning' as const],
      customTimes: ['08:00'],
      supplyEnabled: true,
      daysSupply: 30,
      refillThresholdDays: 7,
      active: true,
    };

    const created = await addMedicationToPlan(DEFAULT_PATIENT_ID, medData);
    expect(created.id).toBeDefined();
    expect(created.name).toBe('Lisinopril');

    const planMeds = await getMedicationsFromPlan(DEFAULT_PATIENT_ID);
    expect(planMeds.length).toBe(1);
    expect(planMeds[0].name).toBe('Lisinopril');
    expect(planMeds[0].dosage).toBe('10mg');
  });

  it('createMedication writes data that getMedications can read', async () => {
    const medData = {
      name: 'TestMed',
      dosage: '5mg',
      time: '08:00',
      timeSlot: 'morning' as const,
      taken: false,
      active: true,
    };

    const created = await createMedication(medData);
    expect(created.id).toBeDefined();

    const allMeds = await getMedications();
    const found = allMeds.find(m => m.name === 'TestMed');
    expect(found).toBeDefined();
    expect(found!.dosage).toBe('5mg');
  });

  it('DOCUMENTS: carePlanConfigRepo and medicationStorage are SEPARATE data stores', () => {
    // This is a documentation test that verifies the architecture:
    // medication-form.tsx writes to BOTH systems for backward compatibility.
    const medFormSource = readSource('app/medication-form.tsx');

    // Verify dual-write pattern exists in medication-form.tsx
    // When source === 'careplan':
    expect(medFormSource).toContain('addMedicationToPlan');
    expect(medFormSource).toContain('createMedication'); // Also syncs to legacy

    // today.tsx reads from medicationStorage (legacy)
    const todaySource = readSource('app/(tabs)/today.tsx');
    expect(todaySource).toContain("from '../../utils/medicationStorage'");
    expect(todaySource).toContain('getMedications');
  });

  it('DOCUMENTS: medication-form.tsx syncs CarePlan-source meds to legacy storage', () => {
    const source = readSource('app/medication-form.tsx');

    // When isCarePlanSource is true, it saves to both:
    // 1. CarePlanConfig via addMedicationToPlan/updateMedicationInPlan
    // 2. Legacy via createMedication/updateMedication
    // This ensures care-brief.tsx (which reads legacy) stays in sync.
    expect(source).toContain('isCarePlanSource');
    expect(source).toContain('Also sync to legacy storage for backward compatibility');
  });

  it('RISK: If legacy sync fails silently, today.tsx shows stale medication data', () => {
    const source = readSource('app/medication-form.tsx');
    // The try/catch around legacy sync swallows errors:
    // "Try to update legacy, ignore if not found"
    expect(source).toContain('Legacy record may not exist');

    // This is a known risk:
    // If createMedication fails (e.g., duplicate check), the CarePlanConfig
    // has the med but medicationStorage does not. today.tsx will show
    // an incomplete medication list.
  });
});

// ============================================================================
// TEST 2: Vitals data consistency
// ============================================================================

describe('Vitals data consistency', () => {
  it('saveVital writes individual typed readings to vitalsStorage', async () => {
    const now = new Date().toISOString();
    await saveVital({ type: 'systolic', value: 120, unit: 'mmHg', timestamp: now });
    await saveVital({ type: 'diastolic', value: 80, unit: 'mmHg', timestamp: now });

    const vitals = await getVitals();
    expect(vitals.length).toBe(2);
    expect(vitals[0].type).toBe('systolic');
    expect(vitals[1].type).toBe('diastolic');
  });

  it('saveVitalsLog writes aggregated snapshot to centralStorage', async () => {
    const now = new Date().toISOString();
    await saveVitalsLog({
      timestamp: now,
      systolic: 120,
      diastolic: 80,
      glucose: 100,
    });

    const logs = await getVitalsLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].systolic).toBe(120);
    expect(logs[0].diastolic).toBe(80);
    expect(logs[0].glucose).toBe(100);
  });

  it('DOCUMENTS: vitalsStorage and centralStorage have DIFFERENT data shapes', () => {
    // vitalsStorage: Array of VitalReading {id, type, value, unit, timestamp}
    //   - One entry per vital type per measurement event
    //   - e.g., [{type:'systolic', value:120}, {type:'diastolic', value:80}]
    //
    // centralStorage: Array of VitalsLog {id, timestamp, systolic?, diastolic?, ...}
    //   - One entry per measurement event, all values in one object
    //   - e.g., [{systolic:120, diastolic:80, glucose:100}]
    //
    // quick-log.tsx (vitals expand) writes to centralStorage for consumers.
    const quickLogSource = readSource('app/quick-log.tsx');
    expect(quickLogSource).toContain('saveVitalsLog'); // centralStorage
  });

  it('DOCUMENTS: today.tsx reads from centralStorage for legacy stats', () => {
    const todaySource = readSource('app/(tabs)/today.tsx');
    // Today page uses centralStorage's getTodayVitalsLog (aggregated)
    expect(todaySource).toContain('getTodayVitalsLog');
    // NOT vitalsStorage's getVitals (individual readings)
  });

  it('both stores return data after dual write from log-vitals', async () => {
    const now = new Date().toISOString();

    // Simulate what log-vitals.tsx does:
    // 1. Save individual readings to vitalsStorage
    await saveVital({ type: 'systolic', value: 130, unit: 'mmHg', timestamp: now });
    await saveVital({ type: 'diastolic', value: 85, unit: 'mmHg', timestamp: now });

    // 2. Save aggregated snapshot to centralStorage
    await saveVitalsLog({
      timestamp: now,
      systolic: 130,
      diastolic: 85,
    });

    // Verify both stores have data
    const vitals = await getVitals();
    const centralLogs = await getVitalsLogs();

    expect(vitals.length).toBe(2);
    expect(centralLogs.length).toBe(1);

    // Same values accessible from both, but different shapes
    expect(vitals.find(v => v.type === 'systolic')!.value).toBe(130);
    expect(centralLogs[0].systolic).toBe(130);
  });

  it('getVitalsByType filters correctly after multiple writes', async () => {
    const now = new Date().toISOString();
    await saveVital({ type: 'systolic', value: 120, unit: 'mmHg', timestamp: now });
    await saveVital({ type: 'diastolic', value: 80, unit: 'mmHg', timestamp: now });
    await saveVital({ type: 'glucose', value: 100, unit: 'mg/dL', timestamp: now });

    const systolicReadings = await getVitalsByType('systolic');
    expect(systolicReadings.length).toBe(1);
    expect(systolicReadings[0].value).toBe(120);

    const glucoseReadings = await getVitalsByType('glucose');
    expect(glucoseReadings.length).toBe(1);
    expect(glucoseReadings[0].value).toBe(100);
  });
});

// ============================================================================
// TEST 3: Appointment data consistency
// ============================================================================

describe('Appointment data consistency', () => {
  it('appointment-form.tsx writes to appointmentStorage only (single source)', () => {
    const source = readSource('app/appointment-form.tsx');
    expect(source).toContain("from '../utils/appointmentStorage'");
    expect(source).toContain('createAppointment');
    expect(source).toContain('updateAppointment');
    // No dual-write for appointments -- single source of truth
  });

  it('createAppointment writes data that getAppointments can read', async () => {
    const appointment = {
      title: 'Checkup',
      provider: 'Dr. Smith',
      specialty: 'Cardiology',
      date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      time: '10:00',
      location: '123 Medical St',
      notes: 'Bring medication list',
      hasBrief: false,
      completed: false,
      cancelled: false,
      reminderEnabled: true,
    };

    await createAppointment(appointment);

    const allAppts = await getAppointments();
    const found = allAppts.find(a => a.provider === 'Dr. Smith');
    expect(found).toBeDefined();
    expect(found!.specialty).toBe('Cardiology');
    expect(found!.location).toBe('123 Medical St');
  });

  it('getUpcomingAppointments filters out completed and past appointments', async () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString();
    const yesterday = new Date(Date.now() - 86400000).toISOString();

    await createAppointment({
      title: 'Future',
      provider: 'Dr. Future',
      specialty: 'General',
      date: tomorrow,
      time: '10:00',
      location: 'Office',
      hasBrief: false,
      completed: false,
      cancelled: false,
    });

    await createAppointment({
      title: 'Past',
      provider: 'Dr. Past',
      specialty: 'General',
      date: yesterday,
      time: '10:00',
      location: 'Office',
      hasBrief: false,
      completed: false,
      cancelled: false,
    });

    const upcoming = await getUpcomingAppointments();
    const hasOnlyFuture = upcoming.every(a => new Date(a.date) >= new Date());
    expect(hasOnlyFuture).toBe(true);
  });

  it('DOCUMENTS: all appointment consumers read from appointmentStorage', () => {
    // today.tsx reads from appointmentStorage
    const todaySource = readSource('app/(tabs)/today.tsx');
    expect(todaySource).toContain('getUpcomingAppointments');
    expect(todaySource).toContain("from '../../utils/appointmentStorage'");
  });
});

// ============================================================================
// TEST 4: Mood/Wellness data consistency
// ============================================================================

describe('Mood/Wellness data consistency', () => {
  it('log-morning-wellness.tsx writes to wellnessCheckStorage', () => {
    const source = readSource('app/log-morning-wellness.tsx');
    expect(source).toContain('saveMorningWellness');
    expect(source).toContain("from '../utils/wellnessCheckStorage'");
  });

  it('log-morning-wellness.tsx also updates carePlanRepo instances', () => {
    const source = readSource('app/log-morning-wellness.tsx');
    // It syncs with the carePlanRepo for daily instances
    expect(source).toContain("from '../storage/carePlanRepo'");
    expect(source).toContain('logInstanceCompletion');
  });

  it('saveMorningWellness writes data that getAllMorningWellness can read', async () => {
    const today = new Date().toISOString().split('T')[0]; // yyyy-MM-dd

    await saveMorningWellness(today, {
      sleepQuality: 4,
      mood: 'good',
      energy: 4,
    } as any);

    const all = await getAllMorningWellness();
    const todayRecord = all.find(w => w.date === today);
    expect(todayRecord).toBeDefined();
    expect(todayRecord!.sleepQuality).toBe(4);
    expect(todayRecord!.mood).toBe('good');
  });

  it('DOCUMENTS: correlationDetector reads from medicationStorage and dailyTrackingStorage', () => {
    // correlationDetector.ts imports:
    const detectorSource = readSource('utils/correlationDetector.ts');
    expect(detectorSource).toContain("from './medicationStorage'");
    expect(detectorSource).toContain("from './dailyTrackingStorage'");

    // It does NOT read from wellnessCheckStorage directly.
    // This means wellness check data may not feed into correlation analysis
    // unless dailyTrackingStorage aggregates it.
  });

  it('DOCUMENTS: wellness data flows through wellnessCheckStorage, not centralStorage', () => {
    // Morning wellness goes to wellnessCheckStorage
    const logWellnessSource = readSource('app/log-morning-wellness.tsx');
    expect(logWellnessSource).toContain('wellnessCheckStorage');

    // correlationDetector reads from dailyTrackingStorage,
    // NOT from wellnessCheckStorage. This is a potential data gap:
    // if dailyTrackingStorage doesn't aggregate wellness checks,
    // correlations won't include sleep/mood/energy from morning checks.
    const detectorSource = readSource('utils/correlationDetector.ts');
    expect(detectorSource).toContain('dailyTrackingStorage');
  });
});

// ============================================================================
// CROSS-CUTTING: Data source mapping documentation
// ============================================================================

describe('Data source mapping', () => {
  it('DOCUMENTS: complete write/read mapping for key data types', () => {
    // This test documents the data architecture for future reference.
    // If any of these assertions fail, the data flow has changed and
    // downstream consumers may need updating.

    // Medications:
    //   Write: medication-form.tsx -> carePlanConfigRepo + medicationStorage
    //   Read:  today.tsx -> medicationStorage (legacy stats)
    //   Read:  today.tsx -> useCareTasks -> carePlanConfigRepo (new system)
    const medFormSource = readSource('app/medication-form.tsx');
    expect(medFormSource).toContain('carePlanConfigRepo');
    expect(medFormSource).toContain('medicationStorage');

    // Vitals:
    //   Write: quick-log.tsx (expand=vitals) -> centralStorage
    //   Read:  today.tsx -> centralStorage (getTodayVitalsLog)
    //   Read:  trends/reports -> vitalsStorage (getVitals, getVitalsByType)
    const quickLogSource = readSource('app/quick-log.tsx');
    expect(quickLogSource).toContain('centralStorage');

    // Appointments:
    //   Write: appointment-form.tsx -> appointmentStorage
    //   Read:  today.tsx -> appointmentStorage
    //   Single source of truth -- no dual-write
    const apptFormSource = readSource('app/appointment-form.tsx');
    expect(apptFormSource).toContain('appointmentStorage');
  });
});
