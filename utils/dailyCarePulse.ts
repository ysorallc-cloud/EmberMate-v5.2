// ============================================================================
// DAILY CARE PULSE UTILITY
// Generates contextual status messages based on care data
// ============================================================================

import { Medication } from './medicationStorage';
import { Appointment } from './appointmentStorage';
import { 
  parseTimeToMinutes, 
  getCurrentTimeMinutes, 
  formatMinutesToTime,
  isToday,
  isUpcomingToday 
} from './time';

export interface CarePulseData {
  medications: Medication[];
  appointments: Appointment[];
  patientName: string;
}

export interface CarePulseResult {
  message: string;
  status: 'calm' | 'active' | 'attention' | 'complete';
  ctaText: string;
  ctaRoute: string;
}

/**
 * Get the next upcoming medication (not passed, sorted by time)
 * P0.2: Fix - sort by actual time, filter out passed times
 */
export function getNextUpcomingMedication(medications: Medication[]): Medication | null {
  const currentMinutes = getCurrentTimeMinutes();
  
  // Filter: active, not taken, has a time, and time hasn't passed
  const upcoming = medications.filter(m => {
    if (!m.active || m.taken || !m.time) return false;
    const medMinutes = parseTimeToMinutes(m.time);
    if (medMinutes === null) return false;
    return medMinutes > currentMinutes; // Only future times
  });
  
  if (upcoming.length === 0) return null;
  
  // Sort by time (earliest first)
  upcoming.sort((a, b) => {
    const aMinutes = parseTimeToMinutes(a.time) ?? Infinity;
    const bMinutes = parseTimeToMinutes(b.time) ?? Infinity;
    return aMinutes - bMinutes;
  });
  
  return upcoming[0];
}

/**
 * Get medications that were missed (time passed but not taken)
 */
export function getMissedMedications(medications: Medication[]): Medication[] {
  const currentMinutes = getCurrentTimeMinutes();
  
  return medications.filter(m => {
    if (!m.active || m.taken || !m.time) return false;
    const medMinutes = parseTimeToMinutes(m.time);
    if (medMinutes === null) return false;
    return medMinutes <= currentMinutes; // Time has passed
  });
}

/**
 * Generate a contextual care pulse message based on current status
 */
export function generateCarePulse(data: CarePulseData): CarePulseResult {
  const { medications, appointments, patientName } = data;
  
  const activeMeds = medications.filter(m => m.active);
  const takenCount = activeMeds.filter(m => m.taken).length;
  const totalMeds = activeMeds.length;
  const pendingMeds = totalMeds - takenCount;
  
  const now = new Date();
  
  // Get today's appointments that are upcoming (not past)
  const todayUpcomingAppointments = appointments.filter(a => {
    if (!a.date || a.completed || a.cancelled) return false;
    return isUpcomingToday(a.date, a.time);
  });
  
  // All today's appointments (for display even if passed)
  const todayAppointments = appointments.filter(a => {
    if (!a.date || a.completed || a.cancelled) return false;
    return isToday(a.date);
  });
  
  const upcomingAppts = appointments.filter(a => {
    if (!a.date || a.completed || a.cancelled) return false;
    const apptDate = new Date(a.date);
    const daysUntil = Math.ceil((apptDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil >= 0 && daysUntil <= 7;
  });

  // Priority 1: Appointment today (upcoming)
  if (todayUpcomingAppointments.length > 0) {
    const appt = todayUpcomingAppointments[0];
    return {
      message: `${patientName} has an appointment today with ${appt.provider}.`,
      status: 'attention',
      ctaText: 'View Appointment Details →',
      ctaRoute: '/appointments',
    };
  }

  // Priority 2: All medications complete
  if (totalMeds > 0 && takenCount === totalMeds) {
    return {
      message: `All ${totalMeds} medications taken today. Great job caring for ${patientName}!`,
      status: 'complete',
      ctaText: 'View Care Brief →',
      ctaRoute: '/care-report?scope=handoff',
    };
  }

  // Priority 3: Medications pending - use properly sorted next medication
  if (pendingMeds > 0) {
    const nextMed = getNextUpcomingMedication(activeMeds);
    const missedMeds = getMissedMedications(activeMeds);
    
    // If there are missed meds but no upcoming, mention the missed ones
    if (!nextMed && missedMeds.length > 0) {
      return {
        message: `${missedMeds.length} medication${missedMeds.length !== 1 ? 's' : ''} may have been missed today. Check the schedule to log them.`,
        status: 'attention',
        ctaText: 'View Medications →',
        ctaRoute: '/medications',
      };
    }
    
    if (nextMed) {
      const timeMinutes = parseTimeToMinutes(nextMed.time);
      const formattedTime = timeMinutes !== null ? formatMinutesToTime(timeMinutes) : nextMed.time;
      
      return {
        message: `${pendingMeds} medication${pendingMeds !== 1 ? 's' : ''} remaining today. Next: ${nextMed.name} at ${formattedTime}.`,
        status: 'active',
        ctaText: 'View Medications →',
        ctaRoute: '/medications',
      };
    }
  }

  // Priority 4: Upcoming appointment this week
  if (upcomingAppts.length > 0) {
    const nextAppt = upcomingAppts[0];
    const daysUntil = Math.ceil((new Date(nextAppt.date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const dayText = daysUntil === 0 ? 'later today' : daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`;
    
    return {
      message: `${patientName}'s next appointment is ${dayText} with ${nextAppt.provider}.`,
      status: 'calm',
      ctaText: 'View Care Brief →',
      ctaRoute: '/care-report?scope=handoff',
    };
  }

  // Default: Calm day
  return {
    message: `Based on what you've shared so far, today looks similar to recent days.`,
    status: 'calm',
    ctaText: 'View Care Brief →',
    ctaRoute: '/care-report?scope=handoff',
  };
}

/**
 * Get status icon for pulse
 */
export function getPulseIcon(status: CarePulseResult['status']): string {
  switch (status) {
    case 'complete': return '✓';
    case 'attention': return '!';
    case 'active': return '◐';
    default: return '◡';
  }
}
