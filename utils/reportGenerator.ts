// ============================================================================
// COMPREHENSIVE REPORT GENERATOR
// Generates nursing-grade reports for Care Brief with all tracked data
// ============================================================================

import { getMedications, getMedicationLogs } from './medicationStorage';
import { getAppointments } from './appointmentStorage';
import { getVitals, VitalReading } from './vitalsStorage';
import { logError } from './devLog';
import { StorageKeys } from './storageKeys';
import { safeGetItem } from './safeStorage';

interface VitalLog {
  id: string;
  timestamp: string;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  oxygenSaturation?: number;
  glucose?: number;
  temperature?: number;
  weight?: number;
  notes?: string;
}

interface SymptomLog {
  id: string;
  timestamp: string;
  symptoms: { name: string; severity: number }[];
  notes?: string;
}

const SYMPTOMS_KEY = StorageKeys.EMBERMATE_SYMPTOMS;

/**
 * Convert VitalReading[] to VitalLog[] format for report generation
 * Groups readings by timestamp (within 1 hour) to create consolidated logs
 */
function convertVitalsToLogs(readings: VitalReading[]): VitalLog[] {
  // Sort by timestamp (most recent first)
  const sorted = [...readings].sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Group readings by timestamp (within 1 hour window)
  const groups = new Map<string, VitalLog>();

  for (const reading of sorted) {
    const timestamp = reading.timestamp;
    const hour = new Date(timestamp).setMinutes(0, 0, 0);
    const key = hour.toString();

    if (!groups.has(key)) {
      groups.set(key, {
        id: reading.id,
        timestamp,
        notes: reading.notes,
      });
    }

    const log = groups.get(key)!;

    // Map reading types to VitalLog properties
    switch (reading.type) {
      case 'systolic':
        log.bloodPressureSystolic = reading.value;
        break;
      case 'diastolic':
        log.bloodPressureDiastolic = reading.value;
        break;
      case 'heartRate':
        log.heartRate = reading.value;
        break;
      case 'oxygen':
        log.oxygenSaturation = reading.value;
        break;
      case 'glucose':
        log.glucose = reading.value;
        break;
      case 'temperature':
        log.temperature = reading.value;
        break;
      case 'weight':
        log.weight = reading.value;
        break;
    }
  }

  return Array.from(groups.values());
}

export interface ComprehensiveReport {
  generatedAt: Date;
  patientName: string;
  
  // 1. Medication Adherence Report
  medicationAdherence: {
    medications: Array<{
      name: string;
      dosage: string;
      time: string;
      adherence7Day: number;
      adherence30Day: number;
      missedDoses: number;
      notes?: string;
    }>;
    overallAdherence: number;
    totalDoses: number;
    takenDoses: number;
    missedDoses: number;
  };
  
  // 2. Vitals Stability Report
  vitalsStability: {
    recentVitals: VitalLog[];
    trends: {
      bloodPressure: { status: string; range: string };
      heartRate: { status: string; range: string };
      oxygenSaturation: { status: string; range: string };
      glucose: { status: string; range: string };
      temperature: { status: string; range: string };
      weight: { status: string; change: string };
    };
    outOfRangeCount: number;
  };
  
  // 3. Symptom Progression
  symptomProgression: {
    recentSymptoms: SymptomLog[];
    commonSymptoms: Array<{ name: string; frequency: number; avgSeverity: number }>;
    severityTrend: string;
  };
  
  // 4. Red Flags & Alerts
  redFlags: Array<{
    type: string;
    message: string;
    severity: 'high' | 'medium' | 'low';
    timestamp: string;
  }>;
  
  // 5. Summary & Clinical Notes
  clinicalSummary: string;
  concerns: string[];
  nextActions: string[];
}

export async function generateComprehensiveReport(): Promise<ComprehensiveReport> {
  const now = new Date();
  
  // Load patient name
  let patientName = 'Patient';
  try {
    const name = await safeGetItem<string | null>(StorageKeys.PATIENT_NAME, null);
    if (name) patientName = name;
  } catch (e) {}
  
  // Load all data sources
  const medications = await getMedications();
  const activeMeds = medications.filter(m => m.active);
  const medLogs = await getMedicationLogs();
  const appointments = await getAppointments();
  
  // Load vitals and convert to VitalLog format
  let vitals: VitalLog[] = [];
  try {
    const vitalReadings = await getVitals();
    vitals = convertVitalsToLogs(vitalReadings);
  } catch (e) {
    logError('reportGenerator.generateComprehensiveReport', e);
  }
  
  // Load symptoms
  let symptoms: SymptomLog[] = [];
  try {
    symptoms = await safeGetItem<SymptomLog[]>(SYMPTOMS_KEY, []);
  } catch (e) {}
  
  // 1. Calculate Medication Adherence
  const medicationAdherence = calculateMedicationAdherence(activeMeds, medLogs);
  
  // 2. Analyze Vitals Stability
  const vitalsStability = analyzeVitalsStability(vitals);
  
  // 3. Analyze Symptom Progression
  const symptomProgression = analyzeSymptomProgression(symptoms);
  
  // 4. Generate Red Flags
  const redFlags = generateRedFlags(medicationAdherence, vitalsStability, symptoms);
  
  // 5. Generate Clinical Summary
  const { clinicalSummary, concerns, nextActions } = generateClinicalSummary(
    medicationAdherence,
    vitalsStability,
    appointments,
    redFlags
  );
  
  return {
    generatedAt: now,
    patientName,
    medicationAdherence,
    vitalsStability,
    symptomProgression,
    redFlags,
    clinicalSummary,
    concerns,
    nextActions,
  };
}

function calculateMedicationAdherence(medications: any[], logs: any[]) {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const medDetails = medications.map(med => {
    const logs7Day = logs.filter(log => 
      log.medicationId === med.id && 
      new Date(log.timestamp) >= sevenDaysAgo &&
      log.taken
    );
    
    const logs30Day = logs.filter(log => 
      log.medicationId === med.id && 
      new Date(log.timestamp) >= thirtyDaysAgo &&
      log.taken
    );
    
    return {
      name: med.name,
      dosage: med.dosage,
      time: med.time,
      adherence7Day: Math.min(100, Math.round((logs7Day.length / 7) * 100)),
      adherence30Day: Math.min(100, Math.round((logs30Day.length / 30) * 100)),
      missedDoses: 7 - logs7Day.length,
      notes: med.notes,
    };
  });
  
  const takenCount = medications.filter(m => m.taken).length;
  const totalMeds = medications.length;
  
  return {
    medications: medDetails,
    overallAdherence: totalMeds > 0 ? Math.round((takenCount / totalMeds) * 100) : 0,
    totalDoses: totalMeds,
    takenDoses: takenCount,
    missedDoses: totalMeds - takenCount,
  };
}

function analyzeVitalsStability(vitals: VitalLog[]) {
  const recent = vitals.slice(0, 10);
  const last7Days = vitals.filter(v => {
    const vDate = new Date(v.timestamp);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return vDate >= weekAgo;
  });
  
  // Calculate ranges and trends
  const bpSystolic = last7Days.map(v => v.bloodPressureSystolic).filter((v): v is number => v != null);
  const hr = last7Days.map(v => v.heartRate).filter((v): v is number => v != null);
  const o2 = last7Days.map(v => v.oxygenSaturation).filter((v): v is number => v != null);
  const glucose = last7Days.map(v => v.glucose).filter((v): v is number => v != null);
  const temp = last7Days.map(v => v.temperature).filter((v): v is number => v != null);
  const weights = last7Days.map(v => v.weight).filter((v): v is number => v != null);
  
  let outOfRangeCount = 0;
  if (bpSystolic.some(v => v > 140 || v < 90)) outOfRangeCount++;
  if (hr.some(v => v > 100 || v < 60)) outOfRangeCount++;
  if (o2.some(v => v < 92)) outOfRangeCount++;
  if (glucose.some(v => v > 140 || v < 70)) outOfRangeCount++;
  
  const weightChange = weights.length >= 2 
    ? weights[0] - weights[weights.length - 1] 
    : 0;
  
  return {
    recentVitals: recent,
    trends: {
      bloodPressure: {
        status: bpSystolic.some(v => v > 140) ? 'Elevated' : 'Normal',
        range: bpSystolic.length > 0 
          ? `${Math.min(...bpSystolic)}-${Math.max(...bpSystolic)}` 
          : 'No data',
      },
      heartRate: {
        status: hr.some(v => v > 100 || v < 60) ? 'Out of range' : 'Normal',
        range: hr.length > 0 ? `${Math.min(...hr)}-${Math.max(...hr)} bpm` : 'No data',
      },
      oxygenSaturation: {
        status: o2.some(v => v < 92) ? 'Low' : 'Normal',
        range: o2.length > 0 ? `${Math.min(...o2)}-${Math.max(...o2)}%` : 'No data',
      },
      glucose: {
        status: glucose.some(v => v > 140 || v < 70) ? 'Out of range' : 'Normal',
        range: glucose.length > 0 ? `${Math.min(...glucose)}-${Math.max(...glucose)} mg/dL` : 'No data',
      },
      temperature: {
        status: temp.some(v => v > 99.5 || v < 97) ? 'Abnormal' : 'Normal',
        range: temp.length > 0 ? `${Math.min(...temp)}-${Math.max(...temp)}°F` : 'No data',
      },
      weight: {
        status: Math.abs(weightChange) > 5 ? 'Significant change' : 'Stable',
        change: weightChange !== 0 ? `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} lbs` : 'No change',
      },
    },
    outOfRangeCount,
  };
}

function analyzeSymptomProgression(symptoms: SymptomLog[]) {
  const recent = symptoms.slice(0, 10);
  const last7Days = symptoms.filter(s => {
    const sDate = new Date(s.timestamp);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return sDate >= weekAgo;
  });
  
  // Count symptom frequency and average severity
  const symptomMap = new Map<string, { count: number; totalSeverity: number }>();
  
  last7Days.forEach(log => {
    log.symptoms.forEach(symptom => {
      const existing = symptomMap.get(symptom.name) || { count: 0, totalSeverity: 0 };
      symptomMap.set(symptom.name, {
        count: existing.count + 1,
        totalSeverity: existing.totalSeverity + symptom.severity,
      });
    });
  });
  
  const commonSymptoms = Array.from(symptomMap.entries())
    .map(([name, data]) => ({
      name,
      frequency: data.count,
      avgSeverity: Math.round(data.totalSeverity / data.count),
    }))
    .sort((a, b) => b.frequency - a.frequency);
  
  return {
    recentSymptoms: recent,
    commonSymptoms,
    severityTrend: commonSymptoms.some(s => s.avgSeverity >= 7) ? 'High severity' : 'Moderate',
  };
}

function generateRedFlags(
  medAdherence: any,
  vitals: any,
  symptoms: SymptomLog[]
): Array<{ type: string; message: string; severity: 'high' | 'medium' | 'low'; timestamp: string }> {
  const flags: any[] = [];
  const now = new Date().toISOString();
  
  // Medication red flags
  if (medAdherence.missedDoses >= 3) {
    flags.push({
      type: 'Medication',
      message: `${medAdherence.missedDoses} doses missed today`,
      severity: 'high',
      timestamp: now,
    });
  }
  
  // Vitals red flags
  if (vitals.trends.oxygenSaturation.status === 'Low') {
    flags.push({
      type: 'Vitals',
      message: 'O2 saturation below 92%',
      severity: 'high',
      timestamp: now,
    });
  }
  
  if (vitals.trends.weight.status === 'Significant change') {
    flags.push({
      type: 'Vitals',
      message: `Weight change ${vitals.trends.weight.change}`,
      severity: 'medium',
      timestamp: now,
    });
  }
  
  // Symptom red flags
  const recentSymptoms = symptoms.slice(0, 5);
  const severeSymptoms = recentSymptoms.flatMap(log => 
    log.symptoms.filter(s => s.severity >= 8)
  );
  
  if (severeSymptoms.length > 0) {
    flags.push({
      type: 'Symptoms',
      message: `${severeSymptoms.length} severe symptom${severeSymptoms.length !== 1 ? 's' : ''} reported`,
      severity: 'high',
      timestamp: now,
    });
  }
  
  return flags;
}

function generateClinicalSummary(
  medAdherence: any,
  vitals: any,
  appointments: any[],
  redFlags: any[]
) {
  const parts = [];
  const concerns = [];
  const nextActions = [];
  
  // Medication summary
  if (medAdherence.missedDoses === 0) {
    parts.push('Medication adherence complete today');
  } else {
    parts.push(`${medAdherence.missedDoses} dose${medAdherence.missedDoses !== 1 ? 's' : ''} pending`);
    concerns.push(`Medication logging incomplete (${medAdherence.missedDoses} pending)`);
  }
  
  // Vitals summary
  if (vitals.outOfRangeCount > 0) {
    parts.push(`${vitals.outOfRangeCount} vital${vitals.outOfRangeCount !== 1 ? 's' : ''} out of range`);
    concerns.push('Some vitals outside normal ranges');
  }
  
  // Appointments
  const upcomingAppts = appointments.filter(a => {
    const apptDate = new Date(a.date);
    const today = new Date();
    const daysUntil = Math.ceil((apptDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil >= 0 && daysUntil <= 7;
  });
  
  if (upcomingAppts.length > 0) {
    parts.push(`${upcomingAppts.length} appointment${upcomingAppts.length !== 1 ? 's' : ''} within 7 days`);
    nextActions.push(`Prepare for upcoming appointment${upcomingAppts.length !== 1 ? 's' : ''}`);
  }
  
  // Red flags
  if (redFlags.length > 0) {
    concerns.push(`${redFlags.length} red flag${redFlags.length !== 1 ? 's' : ''} require attention`);
  }
  
  if (concerns.length === 0) {
    concerns.push('No immediate concerns');
  }
  
  if (nextActions.length === 0) {
    nextActions.push('Continue current care plan');
  }
  
  return {
    clinicalSummary: parts.join('; ') + '.',
    concerns,
    nextActions,
  };
}
