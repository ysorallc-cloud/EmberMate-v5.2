// ============================================================================
// DATA IMPORT UTILITY
// Import medications, appointments, vitals, symptoms from CSV or JSON
// Eases the population process for users migrating from other systems
// ============================================================================

import { createMedication, Medication } from './medicationStorage';
import { createAppointment, Appointment } from './appointmentStorage';
import { saveVital } from './vitalsStorage';
import { Alert } from 'react-native';
import { getTodayDateString } from '../services/carePlanGenerator';
import { StorageKeys } from './storageKeys';
import { safeGetItem, safeSetItem } from './safeStorage';
import { generateUniqueId } from './idGenerator';

interface ImportResult {
  success: boolean;
  imported: {
    medications: number;
    appointments: number;
    vitals: number;
    symptoms: number;
  };
  errors: string[];
}

const SYMPTOMS_KEY = StorageKeys.EMBERMATE_SYMPTOMS;

// Import from JSON
export async function importFromJSON(jsonString: string): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    imported: { medications: 0, appointments: 0, vitals: 0, symptoms: 0 },
    errors: [],
  };

  try {
    const data = JSON.parse(jsonString);

    // Import medications
    if (data.medications && Array.isArray(data.medications)) {
      for (const med of data.medications) {
        try {
          await createMedication({
            name: med.name || 'Unknown',
            dosage: med.dosage || '',
            time: med.time || '08:00',
            timeSlot: med.timeSlot || 'morning',
            taken: med.taken || false,
            active: med.active !== false,
            notes: med.notes || '',
            daysSupply: med.daysSupply || 30,
          });
          result.imported.medications++;
        } catch (e) {
          result.errors.push(`Medication import failed: ${med.name}`);
        }
      }
    }

    // Import appointments
    if (data.appointments && Array.isArray(data.appointments)) {
      for (const appt of data.appointments) {
        try {
          await createAppointment({
            date: appt.date || getTodayDateString(),
            time: appt.time || '09:00',
            provider: appt.provider || 'Provider',
            specialty: appt.specialty || 'General',
            location: appt.location || '',
            notes: appt.notes || '',
            hasBrief: appt.hasBrief || false,
            completed: appt.completed || false,
            cancelled: appt.cancelled || false,
          });
          result.imported.appointments++;
        } catch (e) {
          result.errors.push(`Appointment import failed: ${appt.provider}`);
        }
      }
    }

    // Import vitals
    if (data.vitals && Array.isArray(data.vitals)) {
      try {
        for (const vital of data.vitals) {
          const timestamp = vital.timestamp || new Date().toISOString();
          const notes = vital.notes;

          // Import each vital type separately using the vitalsStorage utility
          if (vital.bloodPressureSystolic) {
            await saveVital({
              type: 'systolic',
              value: vital.bloodPressureSystolic,
              timestamp,
              unit: 'mmHg',
              notes,
            });
          }

          if (vital.bloodPressureDiastolic) {
            await saveVital({
              type: 'diastolic',
              value: vital.bloodPressureDiastolic,
              timestamp,
              unit: 'mmHg',
              notes,
            });
          }

          if (vital.heartRate) {
            await saveVital({
              type: 'heartRate',
              value: vital.heartRate,
              timestamp,
              unit: 'bpm',
              notes,
            });
          }

          if (vital.oxygenSaturation) {
            await saveVital({
              type: 'oxygen',
              value: vital.oxygenSaturation,
              timestamp,
              unit: '%',
              notes,
            });
          }

          if (vital.glucose) {
            await saveVital({
              type: 'glucose',
              value: vital.glucose,
              timestamp,
              unit: 'mg/dL',
              notes,
            });
          }

          if (vital.temperature) {
            await saveVital({
              type: 'temperature',
              value: vital.temperature,
              timestamp,
              unit: '°F',
              notes,
            });
          }

          if (vital.weight) {
            await saveVital({
              type: 'weight',
              value: vital.weight,
              timestamp,
              unit: 'lbs',
              notes,
            });
          }

          result.imported.vitals++;
        }
      } catch (e) {
        result.errors.push('Vitals import failed');
      }
    }

    // Import symptoms
    if (data.symptoms && Array.isArray(data.symptoms)) {
      try {
        const symptoms = await safeGetItem<any[]>(SYMPTOMS_KEY, []);

        for (const symptom of data.symptoms) {
          symptoms.unshift({
            id: generateUniqueId(),
            timestamp: symptom.timestamp || new Date().toISOString(),
            symptoms: symptom.symptoms || [],
            notes: symptom.notes,
          });
          result.imported.symptoms++;
        }

        await safeSetItem(SYMPTOMS_KEY, symptoms.slice(0, 200));
      } catch (e) {
        result.errors.push('Symptoms import failed');
      }
    }

    result.success = result.errors.length === 0;
    return result;
  } catch (error) {
    result.errors.push('Invalid JSON format');
    return result;
  }
}

// Import from CSV (medications only for now)
export async function importMedicationsFromCSV(csvString: string): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    imported: { medications: 0, appointments: 0, vitals: 0, symptoms: 0 },
    errors: [],
  };

  try {
    const lines = csvString.trim().split('\n');
    if (lines.length < 2) {
      result.errors.push('CSV file is empty or invalid');
      return result;
    }

    // Parse header
    const header = lines[0].toLowerCase().split(',').map(h => h.trim());
    const nameIdx = header.indexOf('name');
    const dosageIdx = header.indexOf('dosage');
    const timeIdx = header.indexOf('time');
    const notesIdx = header.indexOf('notes');

    if (nameIdx === -1 || dosageIdx === -1) {
      result.errors.push('CSV must have "name" and "dosage" columns');
      return result;
    }

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length < 2) continue;

      try {
        await createMedication({
          name: values[nameIdx] || 'Unknown',
          dosage: values[dosageIdx] || '',
          time: timeIdx !== -1 ? values[timeIdx] : '08:00',
          timeSlot: 'morning',
          taken: false,
          active: true,
          notes: notesIdx !== -1 ? values[notesIdx] : '',
          daysSupply: 30,
        });
        result.imported.medications++;
      } catch (e) {
        result.errors.push(`Row ${i + 1}: Failed to import`);
      }
    }

    result.success = result.imported.medications > 0;
    return result;
  } catch (error) {
    result.errors.push('CSV parsing error');
    return result;
  }
}

// Generate sample JSON template for user reference
export function generateSampleJSON(): string {
  const sample = {
    medications: [
      {
        name: "Lisinopril",
        dosage: "10mg",
        time: "08:00",
        notes: "Take with food",
        active: true,
        taken: false,
        daysSupply: 30
      },
      {
        name: "Metformin",
        dosage: "500mg",
        time: "20:00",
        notes: "Before bed",
        active: true,
        taken: false,
        daysSupply: 30
      }
    ],
    appointments: [
      {
        date: "2025-02-15",
        time: "10:00",
        provider: "Dr. Smith",
        specialty: "Cardiology",
        location: "Medical Center",
        notes: "Follow-up visit",
        completed: false,
        cancelled: false
      }
    ],
    vitals: [
      {
        timestamp: "2025-01-02T08:00:00Z",
        bloodPressureSystolic: 120,
        bloodPressureDiastolic: 80,
        heartRate: 72,
        oxygenSaturation: 98,
        glucose: 100,
        temperature: 98.6,
        weight: 150,
        notes: "Morning reading"
      }
    ],
    symptoms: [
      {
        timestamp: "2025-01-02T14:00:00Z",
        symptoms: [
          { name: "Pain", severity: 3 },
          { name: "Fatigue", severity: 5 }
        ],
        notes: "After lunch"
      }
    ]
  };

  return JSON.stringify(sample, null, 2);
}

// Generate sample CSV template for medications
export function generateSampleCSV(): string {
  return `name,dosage,time,notes
Lisinopril,10mg,08:00,Take with food
Metformin,500mg,20:00,Before bed
Aspirin,81mg,08:00,Low dose`;
}

// Show import instructions
export function showImportInstructions(): void {
  Alert.alert(
    'Import Data',
    `You can import data in two formats:

1. JSON Format (recommended):
   • Supports medications, appointments, vitals, symptoms
   • Copy sample JSON and modify with your data
   • Paste into import field

2. CSV Format (medications only):
   • Simple spreadsheet format
   • Columns: name, dosage, time, notes
   • Export from Excel or Google Sheets

Tap "View Sample" to see examples.`,
    [{ text: 'OK' }]
  );
}
