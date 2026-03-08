// ============================================================================
// VITALS GUIDANCE — Decision support helper
// Generates nurse-line scripts from patient data when vitals exceed thresholds
// ============================================================================

import { getMedications, Medication } from './medicationStorage';
import { getVitalsByType, VitalReading } from './vitalsStorage';
import { VITAL_THRESHOLDS, getVitalStatus, VitalType, loadCustomThresholds } from './vitalThresholds';
import { getTodayVitalsLog } from './centralStorage';
import { format } from 'date-fns';

export interface VitalExceedance {
  type: VitalType;
  value: number;
  unit: string;
  name: string;
  status: 'high' | 'low' | 'critical';
}

export interface NurseScriptInput {
  currentReading: { type: VitalType; value: number };
  recentReadings: VitalReading[];
  medications: Medication[];
  lastDosageChange?: string; // ISO date
}

/**
 * Check today's vitals against thresholds and return any exceedances
 */
export async function checkTodayVitalsExceedances(): Promise<VitalExceedance[]> {
  await loadCustomThresholds();
  const todayVitals = await getTodayVitalsLog();
  if (!todayVitals) return [];

  const exceedances: VitalExceedance[] = [];

  const checks: { key: string; type: VitalType; value: number | undefined }[] = [
    { key: 'systolic', type: 'systolic', value: todayVitals.systolic },
    { key: 'diastolic', type: 'diastolic', value: todayVitals.diastolic },
    { key: 'heartRate', type: 'heartRate', value: todayVitals.heartRate },
    { key: 'temperature', type: 'temperature', value: todayVitals.temperature },
  ];

  for (const check of checks) {
    if (check.value == null) continue;
    const result = getVitalStatus(check.type, check.value);
    if (result.status === 'high' || result.status === 'low' || result.status === 'critical') {
      const threshold = VITAL_THRESHOLDS[check.type];
      exceedances.push({
        type: check.type,
        value: check.value,
        unit: threshold.unit,
        name: threshold.name,
        status: result.status as 'high' | 'low' | 'critical',
      });
    }
  }

  return exceedances;
}

/**
 * Generate a nurse-line script from patient data
 */
export function generateNurseScript(input: NurseScriptInput): string {
  const { currentReading, recentReadings, medications, lastDosageChange } = input;
  const threshold = VITAL_THRESHOLDS[currentReading.type];

  const lines: string[] = [];
  lines.push(`Current ${threshold.name}: ${currentReading.value} ${threshold.unit}`);
  lines.push(`Normal range: ${threshold.low}–${threshold.high} ${threshold.unit}`);

  if (recentReadings.length > 0) {
    const recent = recentReadings.slice(0, 3).map(r =>
      `${r.value} ${r.unit} (${format(new Date(r.timestamp), 'MMM d, h:mm a')})`
    );
    lines.push(`\nRecent readings:\n${recent.map(r => `  - ${r}`).join('\n')}`);
  }

  if (medications.length > 0) {
    const medList = medications.map(m => {
      const parts = [m.name];
      if (m.dosage) parts.push(m.dosage);
      if (m.timeSlot) parts.push(`(${m.timeSlot})`);
      return parts.join(' ');
    });
    lines.push(`\nCurrent medications:\n${medList.map(m => `  - ${m}`).join('\n')}`);
  }

  if (lastDosageChange) {
    lines.push(`\nLast dosage change: ${format(new Date(lastDosageChange), 'MMM d, yyyy')}`);
  }

  return lines.join('\n');
}
