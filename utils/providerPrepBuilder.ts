import { getUpcomingAppointments } from './appointmentStorage';
import { getEventsByDateRange } from '../storage/eventRepo';
import type { CareEvent } from '../types/event';

export interface ProviderPrepQuestion {
  id: string;
  question: string;
  category: string;
}

export interface ProviderPrepData {
  appointment: {
    date: string;
    provider: string;
    specialty: string;
    daysUntil: number;
  };
  questions: ProviderPrepQuestion[];
}

export async function buildProviderPrep(
  standOutInsights: Array<{ category: string; summary: string }> = []
): Promise<ProviderPrepData | null> {
  const appointments = await getUpcomingAppointments();
  if (!appointments || appointments.length === 0) return null;

  const next = appointments[0];
  const apptDate = new Date(next.date);
  const now = new Date();
  const daysUntil = Math.max(0, Math.ceil((apptDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  // Only prep for appointments within the next 7 days
  if (daysUntil > 7) return null;

  const questions: ProviderPrepQuestion[] = [];

  // Generate questions from stand-out insights
  for (const insight of standOutInsights.slice(0, 3)) {
    if (insight.category === 'medication') {
      questions.push({
        id: `med-${questions.length}`,
        question: `I've noticed changes in medication patterns — ${insight.summary}. Should we adjust?`,
        category: 'medication',
      });
    } else if (insight.category === 'sleep') {
      questions.push({
        id: `sleep-${questions.length}`,
        question: `Sleep has been inconsistent recently — ${insight.summary}. Any recommendations?`,
        category: 'sleep',
      });
    } else if (insight.category === 'mood') {
      questions.push({
        id: `mood-${questions.length}`,
        question: `There have been mood changes — ${insight.summary}. Is this something to monitor?`,
        category: 'mood',
      });
    } else {
      questions.push({
        id: `general-${questions.length}`,
        question: `We've observed: ${insight.summary}. Should this affect the care plan?`,
        category: insight.category,
      });
    }
  }

  // Add a default question if none generated
  if (questions.length === 0) {
    questions.push({
      id: 'default-0',
      question: 'Are there any changes to the current care plan we should discuss?',
      category: 'general',
    });
  }

  return {
    appointment: {
      date: next.date,
      provider: next.provider || 'Provider',
      specialty: next.specialty || 'Appointment',
      daysUntil,
    },
    questions,
  };
}

// ============================================================================
// CHANGES SINCE LAST VISIT
// ============================================================================

export interface ChangesSummary {
  periodStart: string;
  periodEnd: string;
  daysInPeriod: number;
  medicationsMissed: number;
  medicationsTaken: number;
  adherenceRate: number | null;     // percentage, null if no med data
  lowHydrationDays: number;
  symptomCounts: { name: string; count: number }[];
  vitalsAlerts: string[];           // plain-language alerts
  newSymptoms: string[];
  totalEvents: number;
}

export async function generateChangesSinceLastVisit(
  lastVisitDate: string,
  patientId: string = 'default'
): Promise<ChangesSummary> {
  const today = new Date().toISOString().split('T')[0];
  const events = await getEventsByDateRange(lastVisitDate, today, patientId);

  const daysInPeriod = Math.max(1, daysBetween(lastVisitDate, today));

  // Medication stats
  const medTaken = events.filter(e => e.type === 'medication_taken').length;
  const medSkipped = events.filter(e => e.type === 'medication_skipped').length;
  const totalMedEvents = medTaken + medSkipped;
  const adherenceRate = totalMedEvents > 0
    ? Math.round((medTaken / totalMedEvents) * 100)
    : null;

  // Hydration — count days with fewer than 4 glasses
  const hydrationByDay = groupEventsByDay(
    events.filter(e => e.type === 'hydration_logged')
  );
  const lowHydrationDays = Object.values(hydrationByDay).filter(dayEvents => {
    const maxGlasses = Math.max(
      ...dayEvents.map(e => (e.value as number) || 0),
      0
    );
    return maxGlasses < 4;
  }).length;

  // Symptoms
  const symptomEvents = events.filter(e => e.type === 'symptom_reported');
  const symptomMap = new Map<string, number>();
  for (const e of symptomEvents) {
    const name = (e.metadata?.symptomName as string) || 'Unknown';
    symptomMap.set(name, (symptomMap.get(name) || 0) + 1);
  }
  const symptomCounts = Array.from(symptomMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Vitals alerts
  const vitalsAlerts: string[] = [];
  const vitalsEvents = events.filter(e => e.type === 'vitals_recorded');
  const highBP = vitalsEvents.filter(
    e => e.metadata?.systolic && (e.metadata.systolic as number) > 140
  );
  if (highBP.length >= 2) {
    vitalsAlerts.push(`Blood pressure above 140 systolic on ${highBP.length} readings`);
  }

  // New symptoms (appeared after last visit, not seen before)
  const newSymptoms = symptomCounts
    .filter(s => s.count <= 3)
    .map(s => s.name);

  return {
    periodStart: lastVisitDate,
    periodEnd: today,
    daysInPeriod,
    medicationsMissed: medSkipped,
    medicationsTaken: medTaken,
    adherenceRate,
    lowHydrationDays,
    symptomCounts,
    vitalsAlerts,
    newSymptoms,
    totalEvents: events.length,
  };
}

// ============================================================================
// SUGGESTED DOCTOR QUESTIONS
// ============================================================================

export interface DoctorQuestion {
  id: string;
  question: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  selected: boolean;  // default selection state
}

export function generateDoctorQuestions(changes: ChangesSummary): DoctorQuestion[] {
  const questions: DoctorQuestion[] = [];

  // Medication adherence
  if (changes.adherenceRate !== null && changes.adherenceRate < 80) {
    questions.push({
      id: 'q-med-adherence',
      question: 'Can we discuss adjusting the medication schedule?',
      reason: `Adherence was ${changes.adherenceRate}% — ${changes.medicationsMissed} doses missed.`,
      priority: 'high',
      selected: true,
    });
  }

  // Recurring symptoms
  for (const symptom of changes.symptomCounts.slice(0, 2)) {
    if (symptom.count >= 3) {
      questions.push({
        id: `q-symptom-${symptom.name}`,
        question: `Should we address recurring ${symptom.name.toLowerCase()}?`,
        reason: `Reported ${symptom.count} times since last visit.`,
        priority: 'high',
        selected: true,
      });
    }
  }

  // Vitals
  for (const alert of changes.vitalsAlerts) {
    questions.push({
      id: `q-vitals-${questions.length}`,
      question: 'Review vital sign trends?',
      reason: alert,
      priority: 'high',
      selected: true,
    });
  }

  // Hydration
  if (changes.lowHydrationDays > changes.daysInPeriod * 0.4) {
    questions.push({
      id: 'q-hydration',
      question: 'Discuss strategies for improving hydration?',
      reason: `Low hydration logged on ${changes.lowHydrationDays} of ${changes.daysInPeriod} days.`,
      priority: 'medium',
      selected: false,
    });
  }

  // New symptoms
  if (changes.newSymptoms.length > 0) {
    questions.push({
      id: 'q-new-symptoms',
      question: `Discuss new symptoms: ${changes.newSymptoms.join(', ')}?`,
      reason: 'These appeared since the last visit.',
      priority: 'medium',
      selected: true,
    });
  }

  // If no questions generated, add a positive note
  if (questions.length === 0) {
    questions.push({
      id: 'q-all-good',
      question: 'Any routine checks to update?',
      reason: 'No specific concerns identified from recent tracking data.',
      priority: 'low',
      selected: false,
    });
  }

  return questions;
}

// ============================================================================
// HELPERS
// ============================================================================

function daysBetween(start: string, end: string): number {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  return Math.floor((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
}

function groupEventsByDay(events: CareEvent[]): Record<string, CareEvent[]> {
  const grouped: Record<string, CareEvent[]> = {};
  for (const event of events) {
    const date = event.timestamp.split('T')[0];
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(event);
  }
  return grouped;
}
