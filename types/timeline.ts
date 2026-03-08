// ============================================================================
// TIMELINE TYPES
// Type definitions for timeline items on TODAY screen
// ============================================================================

export type TimelineItemStatus = 'done' | 'next' | 'upcoming' | 'available';

export type TimelineItemType =
  | 'medication'
  | 'appointment'
  | 'wellness-morning'
  | 'wellness-evening'
  | 'vitals'
  | 'event';

export interface TimelineItem {
  id: string;
  type: TimelineItemType;
  scheduledTime: Date;          // When it's scheduled
  completedTime?: Date;         // When it was completed (if done)
  title: string;
  subtitle: string;             // Dynamic based on status
  status: TimelineItemStatus;

  // Type-specific data
  instanceId?: string;          // For care plan instance tracking
  medicationName?: string;      // For medication display
  dosage?: string;              // For medication dosage
  time?: string;                // For scheduled time display
  medicationIds?: string[];     // For medication type
  appointmentId?: string;       // For appointment type
  wellnessChecks?: string[];    // For wellness type: ['sleep', 'mood', 'energy']
  vitalTypes?: string[];        // For vitals type: ['bp', 'glucose']
}

// Wellness check data captured
export interface MorningWellnessData {
  sleepQuality: number;      // 1=poor, 5=great
  mood: number;  // 1=struggling, 5=great
  energyLevel: number;
  notes?: string;
  orientation?: string;
  decisionMaking?: string;
  completedAt: Date;
}

export interface EveningWellnessData {
  mood: number;  // 1=struggling, 5=great
  mealsLogged: boolean;
  dayRating: number;
  energyLevel?: number;  // 1=exhausted, 5=energetic (consolidated from daily-checkin)
  symptoms?: string[];   // Symptom chips (consolidated from daily-checkin)
  painLevel?: string;
  alertness?: string;
  bowelMovement?: string;
  bathingStatus?: string;
  mobilityStatus?: string;
  highlights?: string;
  concerns?: string;
  completedAt: Date;
}
